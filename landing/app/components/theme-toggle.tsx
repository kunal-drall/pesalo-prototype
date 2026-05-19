"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

/// Reads the current theme attribute set by the inline boot script in
/// layout.tsx and lets the user toggle between light and dark. The chosen
/// preference is persisted to localStorage and applied by writing
/// data-theme on the <html> element so every CSS variable + the
/// screenshot swap pick it up.
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  // Sync from the DOM on first render — the inline boot script in
  // layout.tsx has already chosen the initial theme.
  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "light" ? "light" : "dark");
  }, []);

  const apply = (next: Theme) => {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("pesalo-theme", next);
    } catch {
      /* ignore */
    }
    setTheme(next);
  };

  // While we don't know the theme yet, render a placeholder of the same
  // size so the nav doesn't shift when state arrives.
  if (theme === null) {
    return <button className="theme-toggle" aria-hidden type="button" tabIndex={-1} />;
  }

  const next: Theme = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => apply(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      <span aria-hidden className="theme-toggle-icon">
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </span>
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.93 4.93l1.41 1.41" />
      <path d="M17.66 17.66l1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M4.93 19.07l1.41-1.41" />
      <path d="M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
