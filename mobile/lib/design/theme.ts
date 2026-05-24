import { useColorScheme } from "react-native";

/// Pesalo design tokens — ported 1:1 from the design canvas
/// (pesalo-shared.jsx). Two themes that share the same token shape; every
/// screen reads colours from the active theme so we can switch dark/light
/// at runtime without component-level conditionals.

const SANS_FALLBACK =
  '-apple-system, "SF Pro Text", "SF Pro Display", "Inter", system-ui, sans-serif';
const MONO_FALLBACK = '"SF Mono", ui-monospace, Menlo, monospace';

export type ThemeName = "dark" | "light";

export type Theme = {
  name: ThemeName;
  // backgrounds, fg layers
  bg0: string;
  bg1: string;
  bg2: string;
  bg3: string;
  fg: string;
  fg2: string;
  fg3: string;
  // brand
  green: string;
  greenDark: string;
  gold: string;
  goldSoft: string;
  goldGlow: string;
  // semantic
  success: string;
  error: string;
  warn: string;
  // structure
  border: string;
  overlay: string;
  // typography
  sans: string;
  mono: string;
};

export const DARK: Theme = {
  name: "dark",
  bg0: "#080B11",
  bg1: "#0E1219",
  bg2: "#151B24",
  bg3: "#1C232E",
  fg: "#F2F4F7",
  fg2: "#94A3B8",
  fg3: "#64748B",
  green: "#16A367",
  greenDark: "#0D7A4A",
  gold: "#F5B731",
  goldSoft: "rgba(245,183,49,0.12)",
  goldGlow: "rgba(245,183,49,0.10)",
  success: "#22C55E",
  error: "#EF4444",
  warn: "#F59E0B",
  border: "#1E293B",
  overlay: "rgba(0,0,0,0.55)",
  sans: SANS_FALLBACK,
  mono: MONO_FALLBACK,
};

export const LIGHT: Theme = {
  name: "light",
  bg0: "#F7F8FA",
  bg1: "#FFFFFF",
  bg2: "#F1F4F8",
  bg3: "#E2E8F0",
  fg: "#0F172A",
  fg2: "#475569",
  fg3: "#94A3B8",
  green: "#15915C",
  greenDark: "#0F6E45",
  gold: "#B8830D",
  goldSoft: "rgba(184,131,13,0.12)",
  goldGlow: "rgba(184,131,13,0.08)",
  success: "#15803D",
  error: "#DC2626",
  warn: "#B45309",
  border: "#E5E9EF",
  overlay: "rgba(15,23,42,0.40)",
  sans: SANS_FALLBACK,
  mono: MONO_FALLBACK,
};

/// Mobile-side theme resolver. For now the choice tracks the OS color
/// scheme; a future settings toggle (mirroring the landing page) will
/// override this via a Zustand store.
export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === "light" ? LIGHT : DARK;
}
