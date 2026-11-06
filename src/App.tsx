import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarRail } from "@/components/arc/blocks/sidebar-rail/sidebar-rail";
import { Appearance } from "./pages.tsx";

const routes: Record<string, string> = { home: "/", owed: "/owed", calendar: "/calendar" };

export default function App({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const active = location.pathname.startsWith("/owed") ? "owed" : location.pathname.startsWith("/calendar") ? "calendar" : "home";
  return <SidebarRail active={active} onNavigate={(id) => navigate(routes[id] ?? "/")}>
    <div className="topbar-actions"><Appearance /></div>
    {children}
  </SidebarRail>;
}
