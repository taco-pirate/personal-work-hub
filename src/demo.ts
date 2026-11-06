import { snapshotFromFiles, type FolderFile, type HubSnapshot } from "./parse.ts";

const modules = import.meta.glob("../DEMO-PersonalWorkHub/**/*.md", { query: "?raw", eager: true, import: "default" });

export function demoFolder(): HubSnapshot {
  const files: FolderFile[] = Object.entries(modules).map(([path, text]) => {
    const match = path.match(/DEMO-PersonalWorkHub\/([^/]+)\/([^/]+)\.md$/);
    return { directory: match?.[1] ?? "", id: match?.[2] ?? "", text: String(text) };
  });
  return snapshotFromFiles("DEMO-PersonalWorkHub", ["replies", "tasks", "meetings"], files);
}
