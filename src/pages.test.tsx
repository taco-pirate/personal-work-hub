import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { OwedPage } from "./pages.tsx";

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
});
