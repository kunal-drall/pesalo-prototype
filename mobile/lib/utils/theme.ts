import type { TextStyle } from "react-native";

const tabularNums: TextStyle["fontVariant"] = ["tabular-nums"];

export const colors = {
  bg: {
    primary: "#080B11",
    secondary: "#0E1219",
    tertiary: "#151B24",
    elevated: "#1C232E"
  },
  brand: {
    primary: "#16A367",
    primaryMuted: "#16A36720",
    primaryLight: "#1ECC7F",
    gradient: ["#16A367", "#0D7A4A"] as const
  },
  accent: {
    gold: "#F5B731",
    goldMuted: "#F5B73115",
    goldLight: "#FFD166"
  },
  text: {
    primary: "#F2F4F7",
    secondary: "#94A3B8",
    tertiary: "#64748B",
    inverse: "#080B11"
  },
  success: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
  border: {
    subtle: "#1E293B",
    medium: "#334155",
    focus: "#16A367"
  }
};

export const typography = {
  displayLg: {
    fontSize: 40,
    fontWeight: "700" as const,
    letterSpacing: -1.5,
    lineHeight: 48
  },
  displayMd: {
    fontSize: 28,
    fontWeight: "700" as const,
    letterSpacing: -0.8,
    lineHeight: 34
  },
  headlineLg: {
    fontSize: 20,
    fontWeight: "600" as const,
    letterSpacing: -0.3,
    lineHeight: 28
  },
  headlineMd: {
    fontSize: 17,
    fontWeight: "600" as const,
    lineHeight: 24
  },
  bodyLg: {
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 24
  },
  bodyMd: {
    fontSize: 14,
    fontWeight: "400" as const,
    lineHeight: 20
  },
  caption: {
    fontSize: 12,
    fontWeight: "500" as const,
    letterSpacing: 0.2,
    lineHeight: 16,
    textTransform: "uppercase" as const
  },
  money: {
    fontSize: 17,
    fontWeight: "500" as const,
    fontVariant: tabularNums,
    letterSpacing: -0.2
  },
  moneyLg: {
    fontSize: 24,
    fontWeight: "600" as const,
    fontVariant: tabularNums,
    letterSpacing: -0.5
  }
};

export const spacing = {
  screenPadding: 20,
  screenPaddingTight: 16,
  screenPaddingLoose: 24,
  cardPadding: 16,
  cardPaddingLg: 20,
  gapTight: 8,
  gapMd: 12,
  gapLg: 16,
  gapXl: 24,
  gapSection: 32,
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  radiusXl: 20,
  radiusFull: 9999
};
