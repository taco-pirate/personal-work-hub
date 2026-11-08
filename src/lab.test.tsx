import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "./App.tsx";
import { LabPage } from "./lab.tsx";

describe("Theme lab", () => {
  it("lists the accents and the components to compare", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <LabPage />
      </MemoryRouter>,
    );

    expect(html).toContain("Theme");
    expect(html).toContain("Switch theme");
    for (const accent of ["Neutral", "Violet", "Blue", "Green", "Amber", "Orange", "Coral", "Rose"]) {
      expect(html).toContain(accent);
    }
    expect(html).toContain("Primary");
    expect(html).toContain("Desk reminders");
    expect(html).toContain("Read more");
  });

  it("puts Theme in the sidebar and a theme switch in the top bar", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/theme"]}>
        <App><p>Desk</p></App>
      </MemoryRouter>,
    );

    expect(html).toContain("Theme");
    expect(html).toContain("Switch to dark mode");
    expect(html).not.toContain("Switch folder");
  });
});
