import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "./App.tsx";
import { FolderSteps } from "./folder-walk.tsx";

describe("folder walkthrough", () => {
  it("shows the remaining steps and offers no way to switch folders", () => {
    const html = renderToStaticMarkup(<FolderSteps guide={{
      asking: true,
      gone: false,
      notice: "Still missing meetings.",
      action: "Select PersonalWorkHub",
      steps: ["Create meetings inside PersonalWorkHub.", "Select PersonalWorkHub."],
    }} onSelect={() => {}} />);

    expect(html).toContain("Still missing meetings.");
    expect(html).toContain("Create meetings inside PersonalWorkHub.");
    expect(html).toContain("Select PersonalWorkHub");
    expect(html).not.toContain("Change folder");
    expect(html).not.toContain("Switch");
  });

  it("renders nothing once PersonalWorkHub is in place", () => {
    const html = renderToStaticMarkup(<FolderSteps guide={{ asking: false, gone: false, notice: "", steps: [], action: "" }} onSelect={() => {}} />);
    expect(html).toBe("");
  });

  it("keeps the folder off the sidebar", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <App><p>Desk</p></App>
      </MemoryRouter>,
    );

    expect(html).toContain("Home");
    expect(html).toContain("Owed");
    expect(html).toContain("Calendar");
    expect(html).not.toContain("Change folder");
    expect(html).not.toContain("Switch folder");
  });
});
