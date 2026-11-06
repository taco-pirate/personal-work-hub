import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { OwedPage, RecordPage } from "./pages.tsx";

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
