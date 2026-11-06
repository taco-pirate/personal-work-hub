import { describe, expect, it } from "vitest";
import { readDirectory, recallDirectory, writeItemFile, writeMeetingFile, type DirectoryEntry, type DirectoryHandle } from "./browser-folder.ts";
import type { StoredItem, StoredMeeting } from "./parse.ts";

const file = (name: string, text: string): DirectoryEntry => ({
  kind: "file",
  name,
  getFile: async () => ({ text: async () => text }),
});

const directory = (name: string, entries: DirectoryEntry[]): DirectoryHandle => ({
  name,
  values: async function* () {
    for (const entry of entries) yield entry;
  },
});

const nested = (name: string, entries: DirectoryEntry[]): DirectoryEntry => ({
  kind: "directory",
  name,
  values: directory(name, entries).values,
});

const item = (): StoredItem => ({
  id: "deck",
  kind: "Reply",
  title: "Reply with notes",
  status: "Drafted",
  due: "",
  escalated: false,
  created: 1,
  finished: "",
  returns: "",
  parked: "",
  source: "",
  from: "",
  outlook: "",
  action: "",
  body: "Notes",
  comments: [],
});

describe("the selected folder", () => {
  it("reads the folder the user selected and names what is missing", async () => {
    const handle = directory("PersonalWorkHub", [
      nested("replies", [file("deck.md", "---\nkind: Reply\ntitle: Reply with notes\nstatus: Drafted\n---\nNotes\n")]),
      nested("tasks", []),
    ]);

    const snapshot = await readDirectory(handle);

    expect(snapshot.ready).toBe(false);
    expect(snapshot.directories).toEqual(["replies", "tasks"]);
    expect(snapshot.items.map((entry) => entry.title)).toEqual(["Reply with notes"]);
  });

  it("does not create directories while writing a record that is already there", async () => {
    const calls: { directory: string; file: string }[] = [];
    const handle = directory("PersonalWorkHub", []);
    handle.getDirectoryHandle = async (name) => {
      const child = directory(name, []);
      child.getFileHandle = async (filename) => {
        calls.push({ directory: name, file: filename });
        return { createWritable: async () => ({ write: async () => {}, close: async () => {} }) };
      };
      return child;
    };

    await writeItemFile(handle, item());
    await writeMeetingFile(handle, { id: "w-focus", title: "Focus hold", day: "Wednesday", start: 540, end: 630, category: "Focus Time", response: "accepted", showAs: "busy", allDay: false, organizer: false, outlook: "" } satisfies StoredMeeting);

    expect(calls).toEqual([
      { directory: "replies", file: "deck.md" },
      { directory: "meetings", file: "w-focus.md" },
    ]);
  });

  it("does not read anything when nothing has been saved", async () => {
    let called = false;
    const result = await recallDirectory(async () => null, async () => {
      called = true;
      throw new Error("searched");
    });

    expect(called).toBe(false);
    expect(result).toEqual({ snapshot: null, gone: false, handle: null });
  });

  it("asks again when the saved folder can no longer be read", async () => {
    const stored = directory("PersonalWorkHub", []);
    const result = await recallDirectory(async () => stored, async () => {
      throw new Error("missing");
    });

    expect(result.gone).toBe(true);
    expect(result.handle).toBeNull();
  });

  it("does not call Microsoft Graph", async () => {
    const urls: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (input: string | URL | Request) => {
      urls.push(String(input));
      throw new Error("no network");
    }) as typeof fetch;
    try {
      await readDirectory(directory("Notes", []));
      await recallDirectory(async () => null, readDirectory);
    } finally {
      globalThis.fetch = original;
    }
    expect(urls).toEqual([]);
  });
});
