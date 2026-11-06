import type { Comment, HubSnapshot, StoredItem, StoredMeeting } from "./parse.ts";

const PIPELINE = ["Drafted", "In Progress", "Blocked", "Ready", "Done"] as const;
export type Pipeline = (typeof PIPELINE)[number];

export type MoveResult = { ok: true } | { ok: false; reason: "placeholder" | "closed" | "date" };

export type { Comment, HubSnapshot };

export type Clock = { date: string; minutes: number };

export const SAMPLE_CLOCK: Clock = { date: "2026-11-04", minutes: 10 * 60 + 15 };

export type DeskCard = {
  id: string;
  kind: "Reply" | "Task";
  title: string;
  due: string;
  escalated: boolean;
};

export type OwedRow = DeskCard & { state: string; from: string };

export type GapRow = { label: string; minutes: number };

export type Desk = {
  heading: string;
  counts: { owed: number; escalated: number; replies: number; tasks: number; usableMinutes: number };
  cards: DeskCard[];
  gaps: { day: string; rows: GapRow[] }[];
};

export type RecordView = {
  id: string;
  kind: "Reply" | "Task";
  title: string;
  status: string;
  body: string;
  from: string;
  due: string;
  outlook: string;
  action: string;
  comments: Comment[];
  sameSource: { id: string; kind: "Reply" | "Task"; title: string }[];
  moves: Pipeline[];
  returns: string;
  parked: string;
  placeholder: string;
  escalated: boolean;
};

const WORK_START = 8 * 60;
const WORK_END = 17 * 60;
const OWED = new Set<string>(["Drafted", "In Progress", "Blocked", "Ready"]);

function isPipeline(status: string): status is Pipeline {
  return (PIPELINE as readonly string[]).includes(status);
}

function placeholderOf(body: string): string {
  return body.match(/\[([^\][]+)\]/)?.[1] ?? "";
}
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function weekdayIndex(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

function heading(date: string): string {
  const day = Number(date.slice(8, 10));
  const month = MONTHS[Number(date.slice(5, 7)) - 1];
  return `${WEEKDAYS[weekdayIndex(date)]}, ${month} ${day}`;
}

function clockLabel(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour >= 12 ? "pm" : "am";
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")}${suffix}`;
}

function dayLabel(date: string): string {
  if (!date) return "";
  const day = Number(date.slice(8, 10));
  const month = MONTHS[Number(date.slice(5, 7)) - 1];
  return `${SHORT[weekdayIndex(date)]}, ${month} ${day}`;
}

function dueLabel(due: string, now: Clock): string {
  if (!due) return "No due date";
  const date = due.slice(0, 10);
  const time = due.includes("T") ? clockMinutes(due.slice(11, 16)) : WORK_END;
  const when = date === now.date ? "Today" : SHORT[weekdayIndex(date)];
  return `${when} ${clockLabel(time)}`;
}

function clockMinutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

type Rank = "accepted" | "tentative";

function rank(meeting: StoredMeeting): Rank | "out" {
  if (meeting.response === "declined" || meeting.response === "canceled") return "out";
  if (meeting.organizer || meeting.response === "accepted" || meeting.response === "organizer") return "accepted";
  return "tentative";
}

function blocksTime(meeting: StoredMeeting): boolean {
  if (meeting.allDay) return rank(meeting) === "accepted" && (meeting.showAs === "busy" || meeting.showAs === "oof");
  if (rank(meeting) === "out") return false;
  return meeting.category !== "Personal" && meeting.category !== "Focus Time" && meeting.showAs !== "free" && meeting.showAs !== "workingElsewhere";
}

function isFocus(meeting: StoredMeeting): boolean {
  return rank(meeting) !== "out" && !meeting.allDay && meeting.category === "Focus Time";
}

function remainingDays(now: Clock): string[] {
  const day = weekdayIndex(now.date);
  if (day === 0 || day === 6) return [];
  const start = new Date(`${now.date}T12:00:00Z`);
  const days: string[] = [];
  for (let offset = 0; offset <= 5 - day; offset += 1) {
    const next = new Date(start);
    next.setUTCDate(start.getUTCDate() + offset);
    days.push(next.toISOString().slice(0, 10));
  }
  return days;
}

function dayParts(date: string, meetings: StoredMeeting[], now: Clock): { kind: "gap" | "focus"; start: number; end: number }[] {
  const start = date === now.date ? Math.max(now.minutes, WORK_START) : WORK_START;
  const marks: ("empty" | "focus" | "consume")[] = Array.from({ length: WORK_END - start }, () => "empty");
  const held: boolean[] = Array.from({ length: marks.length }, () => false);
  const paint = (meeting: StoredMeeting, kind: "focus" | "consume", respectHeld: boolean) => {
    const from = meeting.allDay ? WORK_START : meeting.start;
    const to = meeting.allDay ? WORK_END : meeting.end;
    for (let minute = Math.max(from, start); minute < Math.min(to, WORK_END); minute += 1) {
      const index = minute - start;
      if (respectHeld && held[index]) continue;
      if (kind === "consume" || marks[index] === "empty") marks[index] = kind;
    }
  };
  const paintRank = (wanted: Rank, respectHeld: boolean) => {
    for (const meeting of meetings) {
      if (meeting.day === date && rank(meeting) === wanted && isFocus(meeting)) paint(meeting, "focus", respectHeld);
    }
    for (const meeting of meetings) {
      if (meeting.day === date && rank(meeting) === wanted && blocksTime(meeting)) paint(meeting, "consume", respectHeld);
    }
  };
  paintRank("accepted", false);
  for (const meeting of meetings) {
    if (meeting.day !== date || rank(meeting) !== "accepted") continue;
    const from = meeting.allDay ? WORK_START : meeting.start;
    const to = meeting.allDay ? WORK_END : meeting.end;
    for (let minute = Math.max(from, start); minute < Math.min(to, WORK_END); minute += 1) held[minute - start] = true;
  }
  paintRank("tentative", true);
  const parts: { kind: "gap" | "focus"; start: number; end: number }[] = [];
  let cursor = 0;
  while (cursor < marks.length) {
    const kind = marks[cursor];
    let end = cursor + 1;
    while (end < marks.length && marks[end] === kind) end += 1;
    const length = end - cursor;
    if (kind === "focus" || (kind === "empty" && length >= 15)) {
      parts.push({ kind: kind === "focus" ? "focus" : "gap", start: start + cursor, end: start + end });
    }
    cursor = end;
  }
  return parts;
}

function weekStart(date: string): string {
  const day = weekdayIndex(date);
  const fromMonday = day === 0 ? 6 : day - 1;
  const start = new Date(`${date}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - fromMonday);
  return start.toISOString().slice(0, 10);
}

function settle(item: StoredItem, now: Clock): boolean {
  let changed = false;
  if (item.status === "Deferred" && item.returns && item.returns <= now.date && isPipeline(item.parked)) {
    item.status = item.parked;
    item.parked = "";
    item.returns = "";
    changed = true;
  }
  if (item.status === "Done" && item.finished && weekStart(item.finished) < weekStart(now.date)) {
    item.status = "Archived";
    changed = true;
  }
  return changed;
}

function owed(items: StoredItem[]): StoredItem[] {
  return items.filter((item) => OWED.has(item.status)).sort((a, b) => {
    if (a.escalated !== b.escalated) return a.escalated ? -1 : 1;
    if (Boolean(a.due) !== Boolean(b.due)) return a.due ? -1 : 1;
    if (a.due && b.due && a.due !== b.due) return a.due < b.due ? -1 : 1;
    return a.created - b.created;
  });
}

export function openHub(input: { demo: HubSnapshot; chosen: HubSnapshot | null; now: Clock; save?: (item: StoredItem) => void }) {
  const chosen = input.chosen?.ready ? input.chosen : null;
  const snapshot = chosen ?? input.demo;
  const source = chosen ? "folder" : "demo";
  const items = snapshot.items;
  for (const item of items) {
    if (settle(item, input.now)) input.save?.(item);
  }
  return {
    source,
    desk(): Desk {
      const list = owed(items);
      const days = remainingDays(input.now);
      const gaps = days.map((date) => ({
        day: WEEKDAYS[weekdayIndex(date)],
        rows: dayParts(date, snapshot.meetings, input.now).map((part) => ({
          label: `${part.kind === "focus" ? "Focus" : "Usable"} ${clockLabel(part.start)}–${clockLabel(part.end)}`,
          minutes: part.end - part.start,
        })),
      }));
      const usableMinutes = gaps.reduce((total, day) => total + day.rows.reduce((sum, row) => sum + row.minutes, 0), 0);
      return {
        heading: heading(input.now.date),
        counts: {
          owed: list.length,
          escalated: list.filter((item) => item.escalated).length,
          replies: list.filter((item) => item.kind === "Reply").length,
          tasks: list.filter((item) => item.kind === "Task").length,
          usableMinutes,
        },
        cards: list.map((item) => ({
          id: item.id,
          kind: item.kind,
          title: item.title,
          due: dueLabel(item.due, input.now),
          escalated: item.escalated,
        })),
        gaps,
      };
    },
    list(): OwedRow[] {
      return owed(items).map((item) => ({
        id: item.id,
        kind: item.kind,
        title: item.title,
        state: item.status,
        due: dueLabel(item.due, input.now),
        from: item.from,
        escalated: item.escalated,
      }));
    },
    move(kind: "Reply" | "Task", id: string, state: Pipeline): MoveResult {
      const item = items.find((candidate) => candidate.kind === kind && candidate.id === id);
      if (!item || !isPipeline(item.status)) return { ok: false, reason: "closed" };
      if (item.kind === "Reply" && placeholderOf(item.body) && (state === "Ready" || state === "Done")) {
        return { ok: false, reason: "placeholder" };
      }
      item.status = state;
      item.finished = state === "Done" ? input.now.date : "";
      item.parked = "";
      item.returns = "";
      input.save?.(item);
      return { ok: true };
    },
    defer(kind: "Reply" | "Task", id: string, returns: string): MoveResult {
      const item = items.find((candidate) => candidate.kind === kind && candidate.id === id);
      if (!item || !isPipeline(item.status)) return { ok: false, reason: "closed" };
      if (!/^\d{4}-\d{2}-\d{2}$/.test(returns)) return { ok: false, reason: "date" };
      item.parked = item.status;
      item.status = "Deferred";
      item.returns = returns;
      input.save?.(item);
      return { ok: true };
    },
    drop(kind: "Reply" | "Task", id: string): MoveResult {
      const item = items.find((candidate) => candidate.kind === kind && candidate.id === id);
      if (!item || !isPipeline(item.status)) return { ok: false, reason: "closed" };
      item.status = "Dropped";
      item.parked = "";
      item.returns = "";
      input.save?.(item);
      return { ok: true };
    },
    dismiss(kind: "Reply" | "Task", id: string): MoveResult {
      const item = items.find((candidate) => candidate.kind === kind && candidate.id === id);
      if (!item) return { ok: false, reason: "closed" };
      item.escalated = false;
      input.save?.(item);
      return { ok: true };
    },
    replace(kind: "Reply" | "Task", id: string, fact: string): MoveResult {
      const item = items.find((candidate) => candidate.kind === kind && candidate.id === id);
      if (!item || !isPipeline(item.status)) return { ok: false, reason: "closed" };
      if (!fact.trim() || !placeholderOf(item.body)) return { ok: false, reason: "placeholder" };
      item.body = item.body.replace(/\[[^\][]+\]/, fact);
      input.save?.(item);
      return { ok: true };
    },
    record(kind: "Reply" | "Task", id: string): RecordView | null {
      const item = items.find((candidate) => candidate.kind === kind && candidate.id === id);
      if (!item) return null;
      const sameSource = items
        .filter((other) => other.source === item.source && other.id !== item.id)
        .map((other) => ({ id: other.id, kind: other.kind, title: other.title }));
      return {
        id: item.id,
        kind: item.kind,
        title: item.title,
        status: item.status,
        body: item.body,
        from: item.from,
        due: dueLabel(item.due, input.now),
        outlook: item.outlook,
        action: item.action,
        comments: item.comments,
        sameSource,
        moves: isPipeline(item.status) ? [...PIPELINE] : [],
        returns: item.status === "Deferred" ? dayLabel(item.returns) : "",
        parked: item.status === "Deferred" ? item.parked : "",
        placeholder: item.kind === "Reply" ? placeholderOf(item.body) : "",
        escalated: item.escalated,
      };
    },
  };
}
