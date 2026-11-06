import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadFolder } from "./folder.ts";
import { openHub, type LoadedFolder } from "./hub.ts";

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
          { label: "Open 10:30am–11:00am", minutes: 30 },
          { label: "Open 12:00pm–2:30pm", minutes: 150 },
          { label: "Open 3:30pm–4:00pm", minutes: 30 },
        ],
      },
      {
        day: "Thursday",
        rows: [
          { label: "Open 9:00am–10:30am", minutes: 90 },
          { label: "Open 12:00pm–1:00pm", minutes: 60 },
          { label: "Focus 1:00pm–2:00pm", minutes: 60 },
          { label: "Open 2:15pm–3:00pm", minutes: 45 },
          { label: "Open 4:30pm–5:00pm", minutes: 30 },
        ],
      },
      {
        day: "Friday",
        rows: [
          { label: "Open 8:00am–9:00am", minutes: 60 },
          { label: "Open 12:00pm–3:00pm", minutes: 180 },
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

  it("contains no real mail in the demo files", () => {
    const texts = demo().files.map((file) => file.text).join("\n");
    expect(texts).not.toMatch(/\w@\w/);
  });
});

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

function week(meetings: string[]): LoadedFolder {
  return {
    name: "DEMO-PersonalWorkHub",
    directories: ["replies", "tasks", "meetings"],
    files: meetings.map((text, index) => ({ directory: "meetings", id: `m${index}`, text })),
  };
}

function task(title: string): string {
  return `---\nkind: Task\ntitle: ${title}\nstatus: Drafted\ndue: \nescalated: false\ncreated: 1\nsource: x\nfrom: Someone\noutlook: https://outlook.office365.com/owa/?ItemID=x\naction: \n---\nBody\n`;
}

function tempFolder(name: string, files: Record<string, string> = {}, directories = ["replies", "tasks", "meetings"]): LoadedFolder {
  const root = mkdtempSync(join(tmpdir(), "hub-"));
  const folder = join(root, name);
  for (const directory of directories) mkdirSync(join(folder, directory), { recursive: true });
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(folder, path, ".."), { recursive: true });
    writeFileSync(join(folder, path), text);
  }
  return loadFolder(folder);
}
