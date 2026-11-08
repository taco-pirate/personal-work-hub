import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { CalendarPage, ConfigurePage, MeetingPage, OwedPage, RecordPage } from "./pages.tsx";

function recordHtml(path: string, kind: "Reply" | "Task") {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={kind === "Reply" ? "replies/:id" : "tasks/:id"} element={<RecordPage kind={kind} />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Owed page", () => {
  it("opens the owed list, with each row linking to its record and no counts or editors", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <OwedPage />
      </MemoryRouter>,
    );

    expect(html).toContain('href="/replies/deck"');
    expect(html).toContain('href="/tasks/badge"');
    expect(html.indexOf("Reply with notes on the Q4 deck")).toBeLessThan(html.indexOf("Send facilities the badge form"));
    expect(html).toContain("Drafted");
    expect(html).toContain("Thu 5:00pm");
    expect(html).toContain("Priya Shah");
    expect(html).toContain("Escalated");
    for (const absent of [
      "Sent the on-call roster",
      "Last week's status note",
      "Print the lobby poster",
      "Renew the vendor certificate",
      "Usable gaps",
      "This workweek",
      "recommendation slides",
      "<input",
      "<textarea",
      "<select",
      "Search",
      "Filter",
    ]) {
      expect(html).not.toContain(absent);
    }
  });

  it("puts state, Defer, Drop, and Dismiss on an owed record, and offers no move back once it is closed", () => {
    const deck = recordHtml("/replies/deck", "Reply");
    expect(deck).toContain("Confirm you can send notes by Thursday");
    for (const label of ["In Progress", "Blocked", "Ready", "Done", "Defer", "Drop", "Dismiss", "Replace"]) {
      expect(deck).toContain(`>${label}<`);
    }
    expect(deck).toContain('type="date"');

    const vendor = recordHtml("/tasks/vendor", "Task");
    expect(vendor).toContain("Deferred");
    expect(vendor).toContain("Comes back In Progress");
    expect(vendor).toContain("Nov 9");
    expect(vendor).not.toContain(">Ready<");
    expect(vendor).not.toContain(">Defer<");

    const poster = recordHtml("/tasks/poster", "Task");
    expect(poster).toContain("Dropped");
    expect(poster).not.toContain(">Ready<");
    expect(poster).not.toContain(">Drop<");

    const archived = recordHtml("/replies/old", "Reply");
    expect(archived).toContain("Archived");
    expect(archived).not.toContain(">Ready<");

    const done = recordHtml("/replies/roster", "Reply");
    expect(done).toContain(">Done<");
    expect(done).toContain(">Ready<");
    expect(done).not.toContain(">Dismiss<");
  });
});

describe("Owed board", () => {
  it("opens the board at its own address, with lanes, columns, and quiet cards", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/actions/board"]}>
        <OwedPage />
      </MemoryRouter>,
    );

    expect(html).toContain('href="/replies/deck"');
    expect(html).toContain('href="/replies/roster"');
    expect(html.indexOf("Escalated")).toBeLessThan(html.indexOf("No due"));
    expect(html.indexOf("Drafted")).toBeLessThan(html.indexOf(">Done<"));
    expect(html).toContain("Reply with notes on the Q4 deck");
    expect(html).toContain("Thu 5:00pm");
    expect(html).toContain("Sent the on-call roster");
    expect(html).toContain("Board");
    expect(html).toContain("List");
    for (const absent of ["Priya Shah", "Last week's status note", "Print the lobby poster", "Renew the vendor certificate", "Search", "Filter", "Defer", "Drop", "Dismiss", "<input", "<textarea", "<select"]) {
      expect(html).not.toContain(absent);
    }
  });
});

describe("Calendar page", () => {
  it("shows the remaining week and opens a meeting without Defer or Drop", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <CalendarPage />
      </MemoryRouter>,
    );

    expect(html).toContain("Wednesday");
    expect(html).toContain('data-days="3"');
    expect(html).toContain('href="/meetings/w-focus"');
    expect(html).toContain("Focus hold");
    expect(html).toContain("Focus Time");
    expect(html).toContain("Usable");
    expect(html).toContain("Meetings");
    expect(html).toContain("Uncategorized");
    expect(html).not.toContain("Lunch");
    expect(html).not.toContain("Brown bag");

    const meeting = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/meetings/w-focus"]}>
        <Routes>
          <Route path="meetings/:id" element={<MeetingPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(meeting).toContain("Focus hold");
    expect(meeting).toContain("9:00am–10:30am");
    expect(meeting).toContain(">Personal<");
    expect(meeting).not.toContain(">Defer<");
    expect(meeting).not.toContain(">Drop<");
    expect(meeting).not.toContain(">Ready<");
  });
});

describe("Configure page", () => {
  it("wraps each prompt in a step that can open, and keeps the folder choice with that step", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ConfigurePage />
      </MemoryRouter>,
    );

    expect(html.indexOf("Folder")).toBeLessThan(html.indexOf(">Name<"));
    expect(html).toContain("Create the folder");
    expect(html).toContain("Choose the folder");
    expect(html).toContain("Schedule Cowork");
    expect(html).toContain("Leave SETTINGS.md alone");
    expect(html).toContain("Read more");
    expect(html).toContain("Copy prompt");
    expect(html).toContain("Select PersonalWorkHub");
    expect(html).toContain("once that folder is in use");
    expect(html).not.toContain("Generate key");
    expect(html).not.toContain("Create replies, tasks, and meetings inside it.");
  });
});
