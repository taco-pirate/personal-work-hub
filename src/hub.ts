export type Clock = { date: string; minutes: number };

export const SAMPLE_CLOCK: Clock = { date: "2026-11-04", minutes: 10 * 60 + 15 };

export type LoadedFolder = {
  name: string;
  directories: string[];
  files: { directory: string; id: string; text: string }[];
};

export type DeskCard = {
  id: string;
  kind: "Reply" | "Task";
  title: string;
  due: string;
  escalated: boolean;
};

export type GapRow = { label: string; minutes: number };

export type Desk = {
  heading: string;
  counts: { owed: number; escalated: number; replies: number; tasks: number; usableMinutes: number };
  cards: DeskCard[];
  gaps: { day: string; rows: GapRow[] }[];
};

const WORK_START = 8 * 60;
const WORK_END = 17 * 60;
const OWED = new Set(["Drafted", "In Progress", "Blocked", "Ready"]);
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function passes(folder: LoadedFolder): boolean {
  return folder.name === "PersonalWorkHub" && ["replies", "tasks", "meetings"].every((dir) => folder.directories.includes(dir));
}

export type Comment = { who: string; when: string; text: string; outlook: string };

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
};

type Item = RecordView & { escalated: boolean; created: number; source: string };

type Meeting = {
  day: string;
  start: number;
  end: number;
  category: string;
  response: string;
  showAs: string;
  allDay: boolean;
};

function fieldsOf(text: string): Record<string, string> {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  const fields: Record<string, string> = {};
  if (!match) return fields;
  for (const line of match[1].split("\n")) {
    const index = line.indexOf(":");
    if (index === -1) continue;
    fields[line.slice(0, index).trim()] = line.slice(index + 1).trim();
  }
  return fields;
}

function clockMinutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function proseAndComments(text: string): { body: string; comments: Comment[] } {
  const match = text.match(/^---\n[\s\S]*?\n---\n?/);
  const rest = (match ? text.slice(match[0].length) : text).replace(/\s+$/, "");
  const [prose, commentBlock] = rest.split(/\n## Comments\n/);
  const comments: Comment[] = [];
  if (commentBlock) {
    for (const chunk of commentBlock.split(/\n(?=- )/)) {
      const lines = chunk.replace(/^- /, "").split("\n");
      const field = (name: string) => {
        const line = lines.find((item) => item.trim().startsWith(`${name}:`));
        return line ? line.trim().slice(name.length + 1).trim() : "";
      };
      if (!field("who")) continue;
      comments.push({ who: field("who"), when: field("when"), outlook: field("outlook"), text: field("text") });
    }
  }
  return { body: (prose ?? "").trim(), comments };
}

function itemsIn(folder: LoadedFolder): Item[] {
  return folder.files.flatMap((file) => {
    if (file.directory !== "replies" && file.directory !== "tasks") return [];
    const fields = fieldsOf(file.text);
    const prose = proseAndComments(file.text);
    const item: Item = {
      id: file.id,
      kind: fields.kind === "Task" ? "Task" : "Reply",
      title: fields.title ?? "",
      status: fields.status ?? "",
      due: fields.due ?? "",
      escalated: fields.escalated === "true",
      created: Number(fields.created ?? 0),
      source: fields.source ?? "",
      from: fields.from ?? "",
      outlook: fields.outlook ?? "",
      action: fields.action ?? "",
      body: prose.body,
      comments: prose.comments,
      sameSource: [],
    };
    return [item];
  });
}

function meetingsIn(folder: LoadedFolder): Meeting[] {
  return folder.files.flatMap((file) => {
    if (file.directory !== "meetings") return [];
    const fields = fieldsOf(file.text);
    return [{
      day: fields.day ?? "",
      start: fields.start ? clockMinutes(fields.start) : 0,
      end: fields.end ? clockMinutes(fields.end) : 0,
      category: fields.category ?? "",
      response: fields.response ?? "",
      showAs: fields.showAs ?? "",
      allDay: fields.allDay === "true",
    }];
  });
}

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

function dueLabel(due: string, now: Clock): string {
  if (!due) return "No due date";
  const date = due.slice(0, 10);
  const time = due.includes("T") ? clockMinutes(due.slice(11, 16)) : WORK_END;
  const when = date === now.date ? "Today" : SHORT[weekdayIndex(date)];
  return `${when} ${clockLabel(time)}`;
}

function alive(meeting: Meeting): boolean {
  return meeting.response !== "declined" && meeting.response !== "canceled";
}

function consumes(meeting: Meeting): boolean {
  if (!alive(meeting)) return false;
  if (meeting.allDay) return meeting.response === "accepted" && (meeting.showAs === "busy" || meeting.showAs === "oof");
  return meeting.category !== "Personal" && meeting.category !== "Focus Time" && meeting.showAs !== "free" && meeting.showAs !== "workingElsewhere";
}

function isFocus(meeting: Meeting): boolean {
  return alive(meeting) && !meeting.allDay && meeting.category === "Focus Time";
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

function dayParts(date: string, meetings: Meeting[], now: Clock): { kind: "gap" | "focus"; start: number; end: number }[] {
  const start = date === now.date ? Math.max(now.minutes, WORK_START) : WORK_START;
  const marks: ("empty" | "focus" | "consume")[] = Array.from({ length: WORK_END - start }, () => "empty");
  const paint = (from: number, to: number, kind: "focus" | "consume") => {
    for (let minute = Math.max(from, start); minute < Math.min(to, WORK_END); minute += 1) {
      const index = minute - start;
      if (kind === "consume" || marks[index] === "empty") marks[index] = kind;
    }
  };
  for (const meeting of meetings) {
    if (meeting.day === date && isFocus(meeting)) paint(meeting.start, meeting.end, "focus");
  }
  for (const meeting of meetings) {
    if (meeting.day !== date || !consumes(meeting)) continue;
    paint(meeting.allDay ? WORK_START : meeting.start, meeting.allDay ? WORK_END : meeting.end, "consume");
  }
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

function owed(items: Item[]): Item[] {
  return items.filter((item) => OWED.has(item.status)).sort((a, b) => {
    if (a.escalated !== b.escalated) return a.escalated ? -1 : 1;
    if (Boolean(a.due) !== Boolean(b.due)) return a.due ? -1 : 1;
    if (a.due && b.due && a.due !== b.due) return a.due < b.due ? -1 : 1;
    return a.created - b.created;
  });
}

export function openHub(input: { demo: LoadedFolder; chosen: LoadedFolder | null; now: Clock }) {
  const folder = input.chosen && passes(input.chosen) ? input.chosen : input.demo;
  const source = input.chosen && passes(input.chosen) ? "folder" : "demo";
  const items = itemsIn(folder);
  const meetings = meetingsIn(folder);
  return {
    source,
    desk(): Desk {
      const list = owed(items);
      const days = remainingDays(input.now);
      const gaps = days.map((date) => ({
        day: WEEKDAYS[weekdayIndex(date)],
        rows: dayParts(date, meetings, input.now).map((part) => ({
          label: `${part.kind === "focus" ? "Focus" : "Open"} ${clockLabel(part.start)}–${clockLabel(part.end)}`,
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
      };
    },
  };
}
