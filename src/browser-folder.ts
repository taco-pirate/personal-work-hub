import { renderItem, renderMeeting, snapshotFromFiles, type FolderFile, type HubSnapshot, type StoredItem, type StoredMeeting } from "./parse.ts";

export type DirectoryEntry = {
  kind: "file" | "directory";
  name: string;
  getFile?: () => Promise<{ text: () => Promise<string> }>;
  values?: () => AsyncIterable<DirectoryEntry>;
};

export type DirectoryHandle = {
  name: string;
  values: () => AsyncIterable<DirectoryEntry>;
  getDirectoryHandle?: (name: string) => Promise<DirectoryHandle>;
  getFileHandle?: (name: string) => Promise<{ createWritable: () => Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void> }> }>;
  requestPermission?: (options: { mode: "readwrite" }) => Promise<"granted" | "denied" | "prompt">;
};

const DB_NAME = "personal-work-hub";
const STORE = "folder";
const KEY = "chosen";

export async function readDirectory(handle: DirectoryHandle): Promise<HubSnapshot> {
  const directories: string[] = [];
  const files: FolderFile[] = [];
  for await (const entry of handle.values()) {
    if (entry.kind !== "directory" || !entry.values) continue;
    directories.push(entry.name);
    for await (const file of entry.values()) {
      if (file.kind !== "file" || !file.name.endsWith(".md") || !file.getFile) continue;
      files.push({ directory: entry.name, id: file.name.slice(0, -3), text: await (await file.getFile()).text() });
    }
  }
  return snapshotFromFiles(handle.name, directories, files);
}

export async function writeItemFile(handle: DirectoryHandle, item: StoredItem) {
  await writeText(handle, item.kind === "Reply" ? "replies" : "tasks", item.id, renderItem(item));
}

export async function writeMeetingFile(handle: DirectoryHandle, meeting: StoredMeeting) {
  await writeText(handle, "meetings", meeting.id, renderMeeting(meeting));
}

async function writeText(handle: DirectoryHandle, directory: string, id: string, text: string) {
  if (!handle.getDirectoryHandle) return;
  const dir = await handle.getDirectoryHandle(directory);
  if (!dir.getFileHandle) return;
  const file = await dir.getFileHandle(`${id}.md`);
  const writable = await file.createWritable();
  await writable.write(text);
  await writable.close();
}

export async function recallDirectory(
  load: () => Promise<DirectoryHandle | null>,
  read: (handle: DirectoryHandle) => Promise<HubSnapshot>,
): Promise<{ snapshot: HubSnapshot | null; gone: boolean; handle: DirectoryHandle | null }> {
  const stored = await load();
  if (!stored) return { snapshot: null, gone: false, handle: null };
  try {
    const permission = await stored.requestPermission?.({ mode: "readwrite" });
    if (permission && permission !== "granted") return { snapshot: null, gone: true, handle: null };
    return { snapshot: await read(stored), gone: false, handle: stored };
  } catch {
    return { snapshot: null, gone: true, handle: null };
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveStoredHandle(handle: DirectoryHandle) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(handle, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadStoredHandle(): Promise<DirectoryHandle | null> {
  const db = await openDb();
  const stored = await new Promise<DirectoryHandle | null>((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(KEY);
    request.onsuccess = () => resolve((request.result as DirectoryHandle | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return stored;
}
