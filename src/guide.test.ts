import { existsSync, mkdirSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadFolder } from "./folder.ts";
import { openSession, type FolderRead } from "./guide.ts";

const NOW = { date: "2026-11-04", minutes: 10 * 60 + 15 };
const demo = () => loadFolder("DEMO-PersonalWorkHub");

const tempRoot = () => mkdtempSync(join(tmpdir(), "hub-guide-"));

const writeHub = (name = "PersonalWorkHub", directories = ["replies", "tasks", "meetings"]) => {
  const root = tempRoot();
  const folder = join(root, name);
  mkdirSync(folder);
  for (const directory of directories) mkdirSync(join(folder, directory));
  return folder;
};

const reading = (seen: string[]): FolderRead => (path) => {
  seen.push(path);
  if (!existsSync(path)) return null;
  return loadFolder(path);
};

describe("choosing the folder", () => {
  it("walks through the three steps and keeps the demo week until a folder is chosen", () => {
    const seen: string[] = [];
    const session = openSession({ demo: demo(), now: NOW, demoNow: NOW, saved: null, read: reading(seen) });

    expect(seen).toEqual([]);
    expect(session.guide).toEqual({
      asking: true,
      gone: false,
      notice: "",
      action: "Select PersonalWorkHub",
      steps: [
        "Create PersonalWorkHub at the root of your OneDrive.",
        "Create replies, tasks, and meetings inside it.",
        "Select PersonalWorkHub.",
      ],
    });
    expect(session.hub.source).toBe("demo");
    expect(session.hub.desk().cards[0].title).toBe("Reply with notes on the Q4 deck");
  });

  it("skips the steps when the chosen folder already holds replies, tasks, and meetings", () => {
    const folder = writeHub();
    const seen: string[] = [];
    const session = openSession({ demo: demo(), now: NOW, demoNow: NOW, saved: null, read: reading(seen) });

    expect(session.choose(folder)).toEqual({ ok: true });
    expect(seen).toEqual([folder]);
    expect(session.guide).toEqual({ asking: false, gone: false, notice: "", steps: [], action: "" });
    expect(session.hub.source).toBe("folder");
    expect(session.hub.desk().cards).toEqual([]);
    expect(session.choose(writeHub("Notes", []))).toEqual({ ok: false, reason: "in place" });
    expect(session.hub.source).toBe("folder");
  });

  it("names the missing folders and keeps the demo week", () => {
    const folder = writeHub("PersonalWorkHub", ["replies"]);
    const session = openSession({ demo: demo(), now: NOW, demoNow: NOW, saved: null, read: reading([]) });

    session.choose(folder);

    expect(session.guide.asking).toBe(true);
    expect(session.guide.notice).toBe("Still missing tasks and meetings.");
    expect(session.guide.steps).toEqual(["Create tasks and meetings inside PersonalWorkHub.", "Select PersonalWorkHub."]);
    expect(readdirSync(folder).sort()).toEqual(["replies"]);
    expect(session.hub.source).toBe("demo");
  });

  it("asks for the folder named PersonalWorkHub when another folder is selected", () => {
    const folder = writeHub("Notes");
    const session = openSession({ demo: demo(), now: NOW, demoNow: NOW, saved: null, read: reading([]) });

    session.choose(folder);

    expect(session.guide.notice).toBe("Choose the folder named PersonalWorkHub.");
    expect(session.guide.steps[0]).toBe("Create PersonalWorkHub at the root of your OneDrive.");
    expect(session.hub.source).toBe("demo");
  });

  it("does not create PersonalWorkHub, replies, tasks, or meetings", () => {
    const root = tempRoot();
    const target = join(root, "PersonalWorkHub");
    const session = openSession({ demo: demo(), now: NOW, demoNow: NOW, saved: null, read: reading([]) });

    session.choose(target);

    expect(existsSync(target)).toBe(false);
    expect(readdirSync(root)).toEqual([]);
    expect(session.guide.asking).toBe(true);
    expect(session.hub.source).toBe("demo");
  });

  it("asks again from the demo week when the saved folder is gone", () => {
    const saved = join(tempRoot(), "PersonalWorkHub");
    const seen: string[] = [];
    const session = openSession({ demo: demo(), now: NOW, demoNow: NOW, saved, read: reading(seen) });

    expect(seen).toEqual([saved]);
    expect(session.guide.gone).toBe(true);
    expect(session.guide.notice).toBe("The saved folder is gone.");
    expect(session.guide.steps).toEqual([
      "Create PersonalWorkHub at the root of your OneDrive.",
      "Create replies, tasks, and meetings inside it.",
      "Select PersonalWorkHub.",
    ]);
    expect(session.hub.source).toBe("demo");
    expect(session.hub.desk().heading).toBe("Wednesday, Nov 4");
  });

  it("opens a saved folder that still passes the check and skips the steps", () => {
    const folder = writeHub();
    const session = openSession({ demo: demo(), now: { date: "2026-11-06", minutes: 9 * 60 }, demoNow: NOW, saved: folder, read: reading([]) });

    expect(session.guide.asking).toBe(false);
    expect(session.hub.source).toBe("folder");
    expect(session.hub.desk().heading).toBe("Friday, Nov 6");
  });

  it("keeps a folder that passed the check in place", () => {
    const session = openSession({ demo: demo(), now: NOW, demoNow: NOW, saved: null, read: reading([]) });
    const incomplete = loadFolder(writeHub("PersonalWorkHub", ["tasks"]));

    session.accept(incomplete);

    expect(session.guide.notice).toBe("Still missing replies and meetings.");
    expect(session.hub.source).toBe("demo");
    expect(session.accept(loadFolder(writeHub()))).toEqual({ ok: true });
    expect(session.guide.steps).toEqual([]);
    expect(session.accept(loadFolder(writeHub("Notes")))).toEqual({ ok: false, reason: "in place" });
    expect(session.hub.source).toBe("folder");
  });

  it("asks for permission again without calling the saved folder gone", () => {
    const session = openSession({
      demo: demo(),
      now: NOW,
      demoNow: NOW,
      saved: "chosen",
      blocked: true,
      read: () => {
        throw new Error("read");
      },
    });

    expect(session.guide.gone).toBe(false);
    expect(session.guide.notice).toBe("Allow PersonalWorkHub.");
    expect(session.guide.action).toBe("Allow PersonalWorkHub");
    expect(session.hub.source).toBe("demo");
  });

  it("does not search for OneDrive when the sample is gone", () => {
    let called = false;
    const session = openSession({
      demo: { ready: false, name: "DEMO-PersonalWorkHub", person: "", directories: [], items: [], meetings: [] },
      now: NOW,
      demoNow: NOW,
      saved: null,
      read: () => {
        called = true;
        return null;
      },
    });

    expect(called).toBe(false);
    expect(session.hub.desk().cards).toEqual([]);
    expect(session.guide.asking).toBe(true);
  });
});
