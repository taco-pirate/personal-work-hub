import { loadStoredHandle, readDirectory, recallDirectory, saveStoredHandle, writeItemFile, writeMeetingFile, type DirectoryHandle } from "./browser-folder.ts";
import { demoFolder } from "./demo.ts";
import { localClock, openSession, type Guide, type Session } from "./guide.ts";
import { SAMPLE_CLOCK } from "./hub.ts";
import type { HubSnapshot } from "./parse.ts";

const listeners = new Set<() => void>();

let handle: DirectoryHandle | null = null;

const writers = () => {
  const current = handle;
  if (!current) return undefined;
  return {
    save: (item: Parameters<typeof writeItemFile>[1]) => { void writeItemFile(current, item); },
    saveMeeting: (meeting: Parameters<typeof writeMeetingFile>[1]) => { void writeMeetingFile(current, meeting); },
  };
};

let session: Session = openSession({
  demo: demoFolder(),
  now: localClock(),
  demoNow: SAMPLE_CLOCK,
  saved: null,
  read: () => null,
  writers,
});

const publish = () => {
  for (const listener of listeners) listener();
};

export const currentGuide = (): Guide => session.guide;

export const currentHub = () => session.hub;

export const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

const replace = (saved: string | null, snapshot: HubSnapshot | null) => {
  session = openSession({
    demo: demoFolder(),
    now: localClock(),
    demoNow: SAMPLE_CLOCK,
    saved,
    read: () => snapshot,
    writers,
  });
  publish();
};

export const recallChosenFolder = async () => {
  try {
    const recalled = await recallDirectory(loadStoredHandle, readDirectory);
    handle = recalled.handle;
    replace(recalled.gone || recalled.snapshot ? "chosen" : null, recalled.snapshot);
  } catch {
    handle = null;
    replace(null, null);
  }
};

const pickFromWindow = async (): Promise<DirectoryHandle | null> => {
  const picker = (window as Window & { showDirectoryPicker?: (options?: { mode?: "readwrite" }) => Promise<DirectoryHandle> }).showDirectoryPicker;
  if (!picker) return null;
  try {
    return await picker({ mode: "readwrite" });
  } catch {
    return null;
  }
};

export const pickChosenFolder = async (pick: () => Promise<DirectoryHandle | null> = pickFromWindow) => {
  if (!session.guide.asking) return;
  const next = await pick();
  if (!next || !session.guide.asking) return;
  let snapshot: HubSnapshot;
  try {
    snapshot = await readDirectory(next);
  } catch {
    return;
  }
  handle = next;
  const result = session.accept(snapshot);
  if (!result.ok) {
    handle = null;
    return;
  }
  if (!snapshot.ready) handle = null;
  publish();
  if (!snapshot.ready) return;
  try {
    await saveStoredHandle(next);
  } catch {
    // The folder stays open for this visit when storage is unavailable.
  }
};
