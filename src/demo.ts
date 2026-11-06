import type { LoadedFolder } from "./hub.ts";

const modules = import.meta.glob("../DEMO-PersonalWorkHub/**/*.md", { query: "?raw", eager: true, import: "default" });

export function demoFolder(): LoadedFolder {
  const files = Object.entries(modules).map(([path, text]) => {
    const match = path.match(/DEMO-PersonalWorkHub\/([^/]+)\/([^/]+)\.md$/);
    return { directory: match?.[1] ?? "", id: match?.[2] ?? "", text: String(text) };
  });
  return { name: "DEMO-PersonalWorkHub", directories: ["replies", "tasks", "meetings"], files };
}
