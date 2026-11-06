import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderItem, renderMeeting, snapshotFromFiles, type FolderFile, type HubSnapshot, type StoredItem, type StoredMeeting } from "./parse.ts";

export function loadFolder(path: string): HubSnapshot {
  const name = path.split("/").filter(Boolean).at(-1) ?? path;
  const directories: string[] = [];
  const files: FolderFile[] = [];
  let entries: string[] = [];
  try {
    entries = readdirSync(path);
  } catch {
    return snapshotFromFiles(name, directories, files);
  }
  for (const entry of entries) {
    const full = join(path, entry);
    if (!statSync(full).isDirectory()) continue;
    directories.push(entry);
    for (const file of readdirSync(full)) {
      if (!file.endsWith(".md")) continue;
      files.push({ directory: entry, id: file.slice(0, -3), text: readFileSync(join(full, file), "utf8") });
    }
  }
  return snapshotFromFiles(name, directories, files);
}

export function saveItem(folder: string, item: StoredItem) {
  const directory = item.kind === "Task" ? "tasks" : "replies";
  writeFileSync(join(folder, directory, `${item.id}.md`), renderItem(item));
}

export function saveMeeting(folder: string, meeting: StoredMeeting) {
  writeFileSync(join(folder, "meetings", `${meeting.id}.md`), renderMeeting(meeting));
}
