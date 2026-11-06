import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { LoadedFolder } from "./hub.ts";

export function loadFolder(path: string): LoadedFolder {
  const name = path.split("/").filter(Boolean).at(-1) ?? path;
  const directories: string[] = [];
  const files: LoadedFolder["files"] = [];
  let entries: string[] = [];
  try {
    entries = readdirSync(path);
  } catch {
    return { name, directories, files };
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
  return { name, directories, files };
}
