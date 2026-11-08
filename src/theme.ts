import { useLayoutEffect, useState } from "react";
import { flushSync } from "react-dom";

const THEME_KEY = "hub-theme";
const ACCENT_KEY = "hub-accent";

export const ACCENTS = ["neutral", "violet", "blue", "green", "amber", "orange", "coral", "rose"] as const;
export type Accent = (typeof ACCENTS)[number];
export type ThemeName = "light" | "dark";
export type ThemeMove = "reveal" | "eclipse" | "split" | "rise";

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function isAccent(value: string | null): value is Accent {
  return ACCENTS.some((accent) => accent === value);
}

function systemTheme(): ThemeName {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function readTheme(): ThemeName {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function readAccent(): Accent {
  if (typeof document === "undefined") return "neutral";
  const value = document.documentElement.dataset.accent ?? null;
  return isAccent(value) ? value : "neutral";
}

/** Paint the current theme and accent. A stored choice sticks. With none stored, follow the system and keep following it. */
export function paintTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") document.documentElement.dataset.theme = stored;
  else {
    document.documentElement.dataset.theme = systemTheme();
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (!localStorage.getItem(THEME_KEY)) {
        document.documentElement.dataset.theme = systemTheme();
        emit();
      }
    });
  }
  const accent = localStorage.getItem(ACCENT_KEY);
  if (isAccent(accent)) document.documentElement.dataset.accent = accent;
}

function transition(run: () => void) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce && typeof document.startViewTransition === "function") {
    document.startViewTransition(() => { flushSync(run); });
    return;
  }
  run();
}

export function applyTheme(next: ThemeName, origin?: HTMLElement, move: ThemeMove = "reveal") {
  document.documentElement.dataset.themeMove = move;
  if (origin) {
    const box = origin.getBoundingClientRect();
    document.documentElement.style.setProperty("--x", `${box.left + box.width / 2}px`);
    document.documentElement.style.setProperty("--y", `${box.top + box.height / 2}px`);
  }
  transition(() => {
    document.documentElement.dataset.theme = next;
    localStorage.setItem(THEME_KEY, next);
    emit();
  });
}

export function applyAccent(next: Accent) {
  transition(() => {
    document.documentElement.dataset.accent = next;
    localStorage.setItem(ACCENT_KEY, next);
    emit();
  });
}

export function useTheme() {
  const [, bump] = useState(0);
  useLayoutEffect(() => {
    const listener = () => bump((value) => value + 1);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);
  return { theme: readTheme(), accent: readAccent(), setTheme: applyTheme, setAccent: applyAccent };
}
