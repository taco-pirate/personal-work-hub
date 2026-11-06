import { useLayoutEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarRail } from "@/components/arc/blocks/sidebar-rail/sidebar-rail";
import { FolderWalkthrough } from "./folder-walk.tsx";
import { Appearance } from "./pages.tsx";
import { currentHub, subscribe } from "./workspace.ts";

const routes: Record<string, string> = { home: "/", owed: "/owed", calendar: "/calendar" };

export default function App({ children }: { children: ReactNode }) {
  const [, setRevision] = useState(0);
  useLayoutEffect(() => subscribe(() => setRevision((value) => value + 1)), []);
  const location = useLocation();
  const navigate = useNavigate();
  const active = location.pathname.startsWith("/owed") ? "owed" : location.pathname.startsWith("/calendar") ? "calendar" : "home";
  const note = currentHub().source === "demo" ? "Sample week" : "PersonalWorkHub";
  return <SidebarRail active={active} note={note} onNavigate={(id) => navigate(routes[id] ?? "/")}>
    <div className="topbar-actions"><Appearance /></div>
    <FolderWalkthrough />
    {children}
  </SidebarRail>;
}
