import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { paintTheme } from "./theme.ts";
import App from "./App.tsx";
import { CalendarPage, DeskPage, MeetingPage, OwedPage, RecordPage } from "./pages.tsx";
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
          <Route path="owed" element={<OwedPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="meetings/:id" element={<MeetingPage />} />
          <Route path="replies/:id" element={<RecordPage kind="Reply" />} />
          <Route path="tasks/:id" element={<RecordPage kind="Task" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
