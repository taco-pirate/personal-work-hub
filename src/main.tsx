import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { paintTheme } from "./theme.ts";
import App from "./App.tsx";
import { CalendarPage, ConfigurePage, DeskPage, MeetingPage, MetricsPage, OwedPage, RecordPage } from "./pages.tsx";
import "@fontsource-variable/geist";
import "@fontsource-variable/inter";
import "@/components/arc/foundation.css";
import "./index.css";

paintTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App><Outlet /></App>}>
          <Route index element={<DeskPage />} />
          <Route path="actions" element={<OwedPage />} />
          <Route path="actions/board" element={<OwedPage />} />
          <Route path="owed" element={<Navigate to="/actions" replace />} />
          <Route path="owed/board" element={<Navigate to="/actions/board" replace />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="metrics" element={<MetricsPage />} />
          <Route path="configure" element={<ConfigurePage />} />
          <Route path="meetings/:id" element={<MeetingPage />} />
          <Route path="replies/:id" element={<RecordPage kind="Reply" />} />
          <Route path="tasks/:id" element={<RecordPage kind="Task" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
