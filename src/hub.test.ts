import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadFolder, saveItem } from "./folder.ts";
import { openHub } from "./hub.ts";

const NOW = { date: "2026-11-04", minutes: 10 * 60 + 15 };
const demo = () => loadFolder("DEMO-PersonalWorkHub");

describe("sample Desk", () => {
  it("shows the demo week's owed work, counts, and usable gaps", () => {
    const desk = openHub({ demo: demo(), chosen: null, now: NOW }).desk();

    expect(desk.heading).toBe("Wednesday, Nov 4");
    expect(desk.counts).toEqual({
      owed: 7,
      escalated: 1,
      replies: 3,
      tasks: 4,
      usableMinutes: 750,
    });
    expect(desk.cards.map((card) => card.title)).toEqual([
      "Reply with notes on the Q4 deck",
      "Confirm Thursday's 1:1 still works",
      "Get a badge reader for the lab",
      "Share the Q3 readout",
      "Complete security training",
      "Attach the Q3 charts",
      "Send facilities the badge form",
    ]);
    expect(desk.cards[0]).toEqual({
      id: "deck",
      kind: "Reply",
      title: "Reply with notes on the Q4 deck",
      due: "Thu 5:00pm",
      escalated: true,
    });
    expect(desk.cards.map((card) => card.due)).toEqual([
      "Thu 5:00pm",
      "Today 5:00pm",
      "Thu 5:00pm",
      "Fri 5:00pm",
      "Fri 5:00pm",
      "Fri 5:00pm",
      "No due date",
    ]);
    expect(desk.gaps).toEqual([
      {
        day: "Wednesday",
        rows: [
          { label: "Focus 10:15am–10:30am", minutes: 15 },
          { label: "Usable 10:30am–11:00am", minutes: 30 },
          { label: "Usable 12:00pm–2:30pm", minutes: 150 },
          { label: "Usable 3:30pm–4:00pm", minutes: 30 },
        ],
      },
      {
        day: "Thursday",
        rows: [
          { label: "Usable 9:00am–10:30am", minutes: 90 },
          { label: "Usable 12:00pm–1:00pm", minutes: 60 },
          { label: "Focus 1:00pm–2:00pm", minutes: 60 },
          { label: "Usable 2:15pm–3:00pm", minutes: 45 },
          { label: "Usable 4:30pm–5:00pm", minutes: 30 },
        ],
      },
      {
        day: "Friday",
        rows: [
          { label: "Usable 8:00am–9:00am", minutes: 60 },
          { label: "Usable 12:00pm–3:00pm", minutes: 180 },
        ],
      },
    ]);
  });

  it("opens a record with its body, source, comments, and the other item from the same source", () => {
    const hub = openHub({ demo: demo(), chosen: null, now: NOW });
    const deck = hub.record("Reply", "deck");
    const notes = hub.record("Reply", "notes");

    expect(deck).toMatchObject({
      title: "Reply with notes on the Q4 deck",
      status: "Drafted",
      from: "Priya Shah",
      due: "Thu 5:00pm",
      outlook: "https://outlook.office365.com/owa/?ItemID=deck",
      action: "",
      body: "Priya, I can send notes on the deck by [Confirm you can send notes by Thursday]. I'll focus on the recommendation slides.",
      comments: [{ who: "Alex Chen", when: "Wed 8:12am", text: "Need the notes today. This is blocking the Thursday review.", outlook: "https://outlook.office365.com/owa/?ItemID=deck-chase" }],
      sameSource: [],
    });
    expect(notes?.sameSource).toEqual([{ id: "slides", kind: "Task", title: "Attach the Q3 charts" }]);
  });

  it("shows an empty Desk when the chosen PersonalWorkHub has the three folders and no items", () => {
    const hub = openHub({ demo: demo(), chosen: tempFolder("PersonalWorkHub"), now: NOW });
    expect(hub.source).toBe("folder");
    expect(hub.desk().cards).toEqual([]);
    expect(hub.desk().counts.owed).toBe(0);
  });

  it("keeps the demo week when the chosen folder fails the check", () => {
    const wrongName = tempFolder("Notes", { "tasks/other.md": task("A real message from someone@company.com") });
    const missing = tempFolder("PersonalWorkHub", {}, ["replies", "tasks"]);
    const namedDemo = tempFolder("DEMO-PersonalWorkHub", { "tasks/other.md": task("Not the sample") });

    for (const chosen of [wrongName, missing, namedDemo]) {
      const desk = openHub({ demo: demo(), chosen, now: NOW }).desk();
      expect(desk.cards[0]?.title).toBe("Reply with notes on the Q4 deck");
    }
  });

  it("counts overlapping meetings once, leaves Personal off, and drops gaps under 15 minutes", () => {
    const friday = { date: "2026-11-06", minutes: 8 * 60 };
    const overlap = openHub({
      demo: week([meeting("10:00", "11:00", "First"), meeting("10:30", "11:30", "Second")]),
      chosen: null,
      now: friday,
    }).desk();
    expect(overlap.counts.usableMinutes).toBe(450);

    const personal = openHub({
      demo: week([meeting("12:00", "13:00", "Lunch", { category: "Personal" })]),
      chosen: null,
      now: friday,
    }).desk();
    expect(personal.counts.usableMinutes).toBe(540);
    expect(personal.gaps.flatMap((day) => day.rows).some((row) => row.label.includes("Lunch"))).toBe(false);

    const sliver = openHub({
      demo: week([meeting("09:00", "10:00", "A"), meeting("10:10", "11:00", "B")]),
      chosen: null,
      now: friday,
    }).desk();
    expect(sliver.counts.usableMinutes).toBe(420);
    expect(sliver.gaps.flatMap((day) => day.rows).some((row) => row.minutes < 15)).toBe(false);
  });

  it("lets the accepted meeting decide the minutes, and counts an unanswered invite as tentative", () => {
    const friday = { date: "2026-11-06", minutes: 8 * 60 };
    const focusWins = openHub({
      demo: week([
        meeting("10:00", "11:00", "Deep work", { category: "Focus Time" }),
        meeting("10:00", "11:00", "Maybe review", { response: "tentative" }),
      ]),
      chosen: null,
      now: friday,
    }).desk();
    expect(focusWins.counts.usableMinutes).toBe(540);

    const personalWins = openHub({
      demo: week([
        meeting("12:00", "13:00", "Lunch", { category: "Personal" }),
        meeting("12:00", "13:00", "Maybe review", { response: "tentative" }),
      ]),
      chosen: null,
      now: friday,
    }).desk();
    expect(personalWins.counts.usableMinutes).toBe(540);

    const unanswered = openHub({
      demo: week([meeting("09:00", "12:00", "Invite", { response: "" })]),
      chosen: null,
      now: friday,
    }).desk();
    expect(unanswered.counts.usableMinutes).toBe(360);

    const organized = openHub({
      demo: week([meeting("09:00", "12:00", "Mine", { response: "", organizer: "true" })]),
      chosen: null,
      now: friday,
    }).desk();
    expect(organized.counts.usableMinutes).toBe(360);

    const tentativeDay = openHub({
      demo: week([meeting("00:00", "00:00", "Maybe away", { allDay: "true", response: "tentative", showAs: "busy" })]),
      chosen: null,
      now: friday,
    }).desk();
    expect(tentativeDay.counts.usableMinutes).toBe(540);
  });

  it("lets an accepted busy all-day event consume the workday and leaves declined and working-elsewhere time usable", () => {
    const friday = { date: "2026-11-06", minutes: 8 * 60 };
    const busy = openHub({
      demo: week([meeting("00:00", "00:00", "Away", { allDay: "true", showAs: "busy" })]),
      chosen: null,
      now: friday,
    }).desk();
    expect(busy.counts.usableMinutes).toBe(0);

    const elsewhere = openHub({
      demo: week([meeting("00:00", "00:00", "Elsewhere", { allDay: "true", showAs: "workingElsewhere" })]),
      chosen: null,
      now: friday,
    }).desk();
    expect(elsewhere.counts.usableMinutes).toBe(540);

    const declined = openHub({
      demo: week([meeting("09:00", "12:00", "Brown bag", { response: "declined" })]),
      chosen: null,
      now: friday,
    }).desk();
    expect(declined.counts.usableMinutes).toBe(540);
  });

  it("lists owed items with kind, title, state, Due, sender, and Escalated, and leaves finished items off", () => {
    const rows = openHub({ demo: demo(), chosen: null, now: NOW }).list();

    expect(rows.map((row) => row.title)).toEqual([
      "Reply with notes on the Q4 deck",
      "Confirm Thursday's 1:1 still works",
      "Get a badge reader for the lab",
      "Share the Q3 readout",
      "Complete security training",
      "Attach the Q3 charts",
      "Send facilities the badge form",
    ]);
    expect(rows[0]).toEqual({
      id: "deck",
      kind: "Reply",
      title: "Reply with notes on the Q4 deck",
      state: "Drafted",
      due: "Thu 5:00pm",
      from: "Priya Shah",
      escalated: true,
    });
    expect(rows.map((row) => row.state)).toEqual([
      "Drafted",
      "Ready",
      "Blocked",
      "In Progress",
      "In Progress",
      "Drafted",
      "Drafted",
    ]);
    expect(rows.map((row) => row.from)).toEqual([
      "Priya Shah",
      "Sam Ortiz",
      "Facilities",
      "Jordan Lee",
      "Learning portal",
      "Jordan Lee",
      "Facilities",
    ]);
    expect(rows.map((row) => row.title)).not.toEqual(expect.arrayContaining([
      "Sent the on-call roster",
      "Last week's status note",
      "Print the lobby poster",
      "Renew the vendor certificate",
    ]));
  });

  it("contains no real mail in the demo files", () => {
    const root = "DEMO-PersonalWorkHub";
    const texts = ["replies", "tasks", "meetings"].flatMap((directory) =>
      readdirSync(join(root, directory)).map((file) => readFileSync(join(root, directory, file), "utf8")),
    ).join("\n");
    expect(texts).not.toMatch(/\w@\w/);
  });
});

describe("record moves", () => {
  it("moves a Reply from Drafted straight to Ready and writes that state", () => {
    const folder = writeHub({ "replies/note.md": item("Reply", "Send the note", "Drafted") });
    const hub = openWritable(folder, NOW);

    expect(hub.move("Reply", "note", "Ready")).toEqual({ ok: true });
    expect(hub.record("Reply", "note")?.status).toBe("Ready");
    expect(hub.desk().cards.map((card) => card.title)).toEqual(["Send the note"]);
    expect(hub.list().map((row) => row.state)).toEqual(["Ready"]);
    expect(readFileSync(join(folder, "replies", "note.md"), "utf8")).toContain("status: Ready");
  });

  it("refuses Ready and Done while a Reply still has a placeholder, then allows them once the fact is replaced", () => {
    const body = "I will send it by [the day].\n\n## Comments\n- who: Ada\n  when: Wed 9:00am\n  outlook: https://outlook.office365.com/owa/?ItemID=chase\n  text: Need the day.\n";
    const folder = writeHub({ "replies/note.md": item("Reply", "Send the note", "Drafted", {}, body) });
    const hub = openWritable(folder, NOW);
    const file = () => readFileSync(join(folder, "replies", "note.md"), "utf8");

    expect(hub.move("Reply", "note", "In Progress")).toEqual({ ok: true });
    expect(hub.move("Reply", "note", "Ready")).toEqual({ ok: false, reason: "placeholder" });
    expect(hub.move("Reply", "note", "Done")).toEqual({ ok: false, reason: "placeholder" });
    expect(hub.record("Reply", "note")?.status).toBe("In Progress");
    expect(file()).toContain("status: In Progress");
    expect(file()).toContain("[the day]");

    expect(hub.replace("Reply", "note", "Thursday")).toEqual({ ok: true });
    expect(hub.record("Reply", "note")?.body).toBe("I will send it by Thursday.");
    expect(hub.move("Reply", "note", "Done")).toEqual({ ok: true });
    expect(hub.desk().cards).toEqual([]);
    expect(file()).toContain("status: Done");
    expect(file()).toContain("finished: 2026-11-04");
    expect(file()).toContain("I will send it by Thursday.");
    expect(file()).not.toContain("[the day]");
    expect(file()).toContain("https://outlook.office365.com/owa/?ItemID=chase");
  });

  it("writes a replacement fact as the user typed it", () => {
    const folder = writeHub({ "replies/note.md": item("Reply", "Send the note", "Drafted", {}, "I will send it by [the day].") });
    const hub = openWritable(folder, NOW);

    expect(hub.replace("Reply", "note", "$&")).toEqual({ ok: true });
    expect(hub.record("Reply", "note")?.body).toBe("I will send it by $&.");
    expect(readFileSync(join(folder, "replies", "note.md"), "utf8")).toContain("I will send it by $&.");
  });

  it("defers an item off the Desk until the return date, then a read brings it back in the state it left", () => {
    const folder = writeHub({ "replies/note.md": item("Reply", "Send the note", "Blocked") });
    const hub = openWritable(folder, NOW);
    const file = () => readFileSync(join(folder, "replies", "note.md"), "utf8");

    expect(hub.defer("Reply", "note", "2026-11-10")).toEqual({ ok: true });
    expect(hub.desk().cards).toEqual([]);
    expect(hub.list()).toEqual([]);
    expect(hub.move("Reply", "note", "Ready")).toEqual({ ok: false, reason: "closed" });
    expect(hub.record("Reply", "note")).toMatchObject({ status: "Deferred", parked: "Blocked", returns: "Tue, Nov 10", moves: [] });
    expect(file()).toContain("status: Deferred");
    expect(file()).toContain("parked: Blocked");
    expect(file()).toContain("returns: 2026-11-10");

    const early = openWritable(folder, { date: "2026-11-09", minutes: 8 * 60 });
    expect(early.list()).toEqual([]);
    expect(early.record("Reply", "note")?.status).toBe("Deferred");

    const back = openWritable(folder, { date: "2026-11-10", minutes: 8 * 60 });
    expect(back.record("Reply", "note")?.status).toBe("Blocked");
    expect(back.list().map((row) => row.state)).toEqual(["Blocked"]);
    expect(back.desk().cards.map((card) => card.title)).toEqual(["Send the note"]);
    expect(file()).toContain("status: Blocked");
    expect(file()).toContain("returns: \n");
    expect(file()).toContain("parked: \n");
  });

  it("drops an item off the Desk, leaves the file, and offers no way back", () => {
    const folder = writeHub({ "tasks/badge.md": item("Task", "Send the form", "Ready") });
    const hub = openWritable(folder, NOW);
    const file = () => readFileSync(join(folder, "tasks", "badge.md"), "utf8");

    expect(hub.drop("Task", "badge")).toEqual({ ok: true });
    expect(hub.desk().cards).toEqual([]);
    expect(hub.list()).toEqual([]);
    expect(hub.record("Task", "badge")).toMatchObject({ status: "Dropped", moves: [] });
    expect(hub.move("Task", "badge", "Drafted")).toEqual({ ok: false, reason: "closed" });
    expect(hub.defer("Task", "badge", "2026-11-12")).toEqual({ ok: false, reason: "closed" });
    expect(file()).toContain("status: Dropped");
    expect(file()).not.toContain("status: Done");
  });

  it("clears Escalated and leaves the state as it was", () => {
    const folder = writeHub({ "replies/note.md": item("Reply", "Send the note", "In Progress", { escalated: "true" }) });
    const hub = openWritable(folder, NOW);
    const file = () => readFileSync(join(folder, "replies", "note.md"), "utf8");

    expect(hub.dismiss("Reply", "note")).toEqual({ ok: true });
    expect(hub.record("Reply", "note")?.status).toBe("In Progress");
    expect(hub.desk().cards[0]?.escalated).toBe(false);
    expect(hub.list()[0]?.escalated).toBe(false);
    expect(file()).toContain("status: In Progress");
    expect(file()).toContain("escalated: false");
  });

  it("lets a Done item change state until a later workweek's read archives it", () => {
    const folder = writeHub({ "tasks/badge.md": item("Task", "Send the form", "In Progress") });
    const hub = openWritable(folder, NOW);
    const file = () => readFileSync(join(folder, "tasks", "badge.md"), "utf8");

    expect(hub.move("Task", "badge", "Done")).toEqual({ ok: true });
    expect(hub.desk().cards).toEqual([]);
    expect(hub.record("Task", "badge")?.moves).toEqual(["Drafted", "In Progress", "Blocked", "Ready", "Done"]);
    expect(hub.move("Task", "badge", "Blocked")).toEqual({ ok: true });
    expect(hub.list().map((row) => row.state)).toEqual(["Blocked"]);
    expect(file()).toContain("status: Blocked");
    expect(file()).toContain("finished: \n");

    expect(hub.move("Task", "badge", "Done")).toEqual({ ok: true });
    const friday = openWritable(folder, { date: "2026-11-06", minutes: 9 * 60 });
    expect(friday.record("Task", "badge")?.status).toBe("Done");
    expect(friday.move("Task", "badge", "Ready").ok).toBe(true);
    expect(friday.move("Task", "badge", "Done").ok).toBe(true);

    const sunday = openWritable(folder, { date: "2026-11-08", minutes: 12 * 60 });
    expect(sunday.record("Task", "badge")?.status).toBe("Done");

    const nextWeek = openWritable(folder, { date: "2026-11-09", minutes: 9 * 60 });
    expect(nextWeek.record("Task", "badge")).toMatchObject({ status: "Archived", moves: [] });
    expect(nextWeek.move("Task", "badge", "Drafted")).toEqual({ ok: false, reason: "closed" });
    expect(nextWeek.drop("Task", "badge")).toEqual({ ok: false, reason: "closed" });
    expect(nextWeek.desk().cards).toEqual([]);
    expect(file()).toContain("status: Archived");
  });

  it("opens a Done, Deferred, Dropped, or Archived address and shows that state", () => {
    const hub = openHub({ demo: demo(), chosen: null, now: NOW });

    expect(hub.record("Reply", "roster")).toMatchObject({
      status: "Done",
      moves: ["Drafted", "In Progress", "Blocked", "Ready", "Done"],
    });
    expect(hub.record("Task", "vendor")).toMatchObject({ status: "Deferred", parked: "In Progress", returns: "Mon, Nov 9", moves: [] });
    expect(hub.record("Task", "poster")).toMatchObject({ status: "Dropped", moves: [] });
    expect(hub.record("Reply", "old")).toMatchObject({ status: "Archived", moves: [] });
  });
});

function writeHub(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "hub-"));
  const folder = join(root, "PersonalWorkHub");
  for (const directory of ["replies", "tasks", "meetings"]) mkdirSync(join(folder, directory), { recursive: true });
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(folder, path, ".."), { recursive: true });
    writeFileSync(join(folder, path), text);
  }
  return folder;
}

function item(kind: "Reply" | "Task", title: string, status: string, extra: Record<string, string> = {}, body = "The draft."): string {
  const fields: Record<string, string> = {
    kind,
    title,
    status,
    due: "",
    escalated: "false",
    created: "1",
    finished: "",
    returns: "",
    parked: "",
    source: "src",
    from: "Ada",
    outlook: "https://outlook.office365.com/owa/?ItemID=note",
    action: "",
    ...extra,
  };
  return `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join("\n")}\n---\n${body}\n`;
}

function openWritable(folder: string, now: { date: string; minutes: number }) {
  return openHub({
    demo: demo(),
    chosen: loadFolder(folder),
    now,
    save: (stored) => saveItem(folder, stored),
  });
}

function meeting(start: string, end: string, title: string, extra: Record<string, string> = {}): string {
  const fields = {
    kind: "Meeting",
    title,
    day: "2026-11-06",
    start,
    end,
    category: "Operating Review",
    response: "accepted",
    showAs: "busy",
    ...extra,
  };
  return `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join("\n")}\n---\n`;
}

function week(meetings: string[]) {
  return loadFolder(writeWeek(meetings));
}

function writeWeek(meetings: string[]): string {
  const root = mkdtempSync(join(tmpdir(), "hub-"));
  const folder = join(root, "DEMO-PersonalWorkHub");
  mkdirSync(join(folder, "meetings"), { recursive: true });
  mkdirSync(join(folder, "replies"), { recursive: true });
  mkdirSync(join(folder, "tasks"), { recursive: true });
  meetings.forEach((text, index) => writeFileSync(join(folder, "meetings", `m${index}.md`), text));
  return folder;
}

function task(title: string): string {
  return `---\nkind: Task\ntitle: ${title}\nstatus: Drafted\ndue: \nescalated: false\ncreated: 1\nsource: x\nfrom: Someone\noutlook: https://outlook.office365.com/owa/?ItemID=x\naction: \n---\nBody\n`;
}

function tempFolder(name: string, files: Record<string, string> = {}, directories = ["replies", "tasks", "meetings"]) {
  const root = mkdtempSync(join(tmpdir(), "hub-"));
  const folder = join(root, name);
  for (const directory of directories) mkdirSync(join(folder, directory), { recursive: true });
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(folder, path, ".."), { recursive: true });
    writeFileSync(join(folder, path), text);
  }
  return loadFolder(folder);
}
