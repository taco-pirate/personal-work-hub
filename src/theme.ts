const KEY = "hub-theme";

function systemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Paint the current theme. A stored choice sticks. With none stored, follow the system and keep following it. */
export function paintTheme() {
  const stored = localStorage.getItem(KEY);
  const apply = (theme: "light" | "dark") => { document.documentElement.dataset.theme = theme; };
  if (stored === "light" || stored === "dark") {
    apply(stored);
    return;
  }
  apply(systemTheme());
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (!localStorage.getItem(KEY)) apply(systemTheme());
  });
}

export function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem(KEY, next);
}
