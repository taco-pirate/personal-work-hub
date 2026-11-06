import { openHub, type Clock } from "./hub.ts";
import type { HubSnapshot, StoredItem, StoredMeeting } from "./parse.ts";

export type FolderRead = (path: string) => HubSnapshot | null;

export type Guide = {
  asking: boolean;
  gone: boolean;
  notice: string;
  steps: string[];
};

const REQUIRED = ["replies", "tasks", "meetings"] as const;

const SETUP = [
  "Create PersonalWorkHub at the root of your OneDrive.",
  "Create replies, tasks, and meetings inside it.",
  "Select PersonalWorkHub.",
] as const;

const list = (names: readonly string[]) => {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
};

export const guideFor = (choice: HubSnapshot | null, savedGone: boolean): Guide => {
  if (choice?.ready) return { asking: false, gone: false, notice: "", steps: [] };
  if (!choice) {
    return {
      asking: true,
      gone: savedGone,
      notice: savedGone ? "The saved folder is gone." : "",
      steps: [...SETUP],
    };
  }
  if (choice.name !== "PersonalWorkHub") {
    return {
      asking: true,
      gone: false,
      notice: "Choose the folder named PersonalWorkHub.",
      steps: [...SETUP],
    };
  }
  const missing = REQUIRED.filter((dir) => !choice.directories.includes(dir));
  return {
    asking: true,
    gone: false,
    notice: `Still missing ${list(missing)}.`,
    steps: [`Create ${list(missing)} inside PersonalWorkHub.`, "Select PersonalWorkHub."],
  };
};

export type FolderWriters = {
  save?: (item: StoredItem) => void;
  saveMeeting?: (meeting: StoredMeeting) => void;
};

export type Session = {
  readonly guide: Guide;
  readonly hub: ReturnType<typeof openHub>;
  choose: (path: string) => { ok: true } | { ok: false; reason: "in place" };
  accept: (snapshot: HubSnapshot) => { ok: true } | { ok: false; reason: "in place" };
};

export const localClock = (date = new Date()): Clock => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return { date: `${date.getFullYear()}-${month}-${day}`, minutes: date.getHours() * 60 + date.getMinutes() };
};

export const openSession = (input: {
  demo: HubSnapshot;
  now: Clock;
  demoNow: Clock;
  saved: string | null;
  read: FolderRead;
  writers?: () => FolderWriters | undefined;
}): Session => {
  let choice: HubSnapshot | null = null;
  let savedGone = false;
  if (input.saved) {
    choice = input.read(input.saved);
    savedGone = choice === null;
  }

  const hubFor = (snapshot: HubSnapshot | null) => {
    const writers = snapshot?.ready ? input.writers?.() : undefined;
    return openHub({
      demo: input.demo,
      chosen: snapshot?.ready ? snapshot : null,
      now: snapshot?.ready ? input.now : input.demoNow,
      save: writers?.save,
      saveMeeting: writers?.saveMeeting,
    });
  };

  const apply = (snapshot: HubSnapshot | null) => {
    choice = snapshot;
    guide = guideFor(snapshot, false);
    hub = hubFor(snapshot);
  };

  let guide = guideFor(choice, savedGone);
  let hub = hubFor(choice);

  return {
    get guide() {
      return guide;
    },
    get hub() {
      return hub;
    },
    choose(nextPath) {
      if (!guide.asking) return { ok: false, reason: "in place" };
      apply(input.read(nextPath));
      return { ok: true };
    },
    accept(snapshot) {
      if (!guide.asking) return { ok: false, reason: "in place" };
      apply(snapshot);
      return { ok: true };
    },
  };
};
