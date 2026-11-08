import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarRail } from "@/components/arc/blocks/sidebar-rail/sidebar-rail";
import { Appearance } from "./pages.tsx";
import { currentHub, recallChosenFolder, subscribe } from "./workspace.ts";

const routes: Record<string, string> = {
  home: "/",
  actions: "/actions",
  calendar: "/calendar",
  metrics: "/metrics",
  configure: "/configure",
};

export default function App({ children }: { children: ReactNode }) {
  const [, setRevision] = useState(0);
  useLayoutEffect(() => subscribe(() => setRevision((value) => value + 1)), []);
  useEffect(() => { void recallChosenFolder(); }, []);
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const active = path.startsWith("/actions") || path.startsWith("/owed") ? "actions"
    : path.startsWith("/calendar") ? "calendar"
    : path.startsWith("/metrics") ? "metrics"
    : path.startsWith("/configure") ? "configure"
    : "home";
  const hub = currentHub();
  const note = hub.source === "demo" ? "Demo Week" : hub.person() || "Add your name";
  return <SidebarRail active={active} note={note} noteHref={note === "Add your name" ? "/configure" : undefined} onNavigate={(id) => navigate(routes[id] ?? "/")}>
    <div className="topbar-actions"><Appearance /></div>
    {children}
  </SidebarRail>;
}
