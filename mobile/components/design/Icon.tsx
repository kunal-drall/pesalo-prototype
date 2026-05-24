import Svg, { Circle, Path, Rect, Ellipse, Line, G } from "react-native-svg";

import { useTheme } from "@/lib/design/theme";

/// Line icons. The set mirrors the design canvas (pesalo-shared.jsx) one
/// glyph at a time so the screens can name icons without translation.
export type IconName =
  | "arrow-up-right"
  | "arrow-down-left"
  | "plus"
  | "plus-circle"
  | "chevron-left"
  | "chevron-right"
  | "close"
  | "chart-line"
  | "home"
  | "sparkles"
  | "send"
  | "wallet"
  | "check"
  | "copy"
  | "star"
  | "flame"
  | "shield"
  | "eye"
  | "menu"
  | "qr"
  | "bell"
  | "compass"
  | "search"
  | "refresh"
  | "external"
  | "lock"
  | "lock-fill"
  | "clock"
  | "face-id"
  | "info";

const SIMPLE_PATHS: Partial<Record<IconName, string>> = {
  "arrow-up-right": "M7 17L17 7M9 7h8v8",
  "arrow-down-left": "M17 7L7 17M15 17H7V9",
  plus: "M12 5v14M5 12h14",
  "chevron-left": "M15 18l-6-6 6-6",
  "chevron-right": "M9 6l6 6-6 6",
  close: "M6 6l12 12M18 6L6 18",
  "chart-line": "M3 17l5-5 4 4 8-8M14 8h7v7",
  home: "M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-7h-6v7H4a1 1 0 01-1-1z",
  sparkles:
    "M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6zM19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z",
  send: "M22 2L11 13M22 2l-7 20-4-9-9-4z",
  wallet: "M3 7a2 2 0 012-2h12a2 2 0 012 2v2h2v8h-2v2a2 2 0 01-2 2H5a2 2 0 01-2-2zM17 13h2",
  check: "M5 12l5 5L20 7",
  copy: "M9 9h10v10H9zM5 15V5h10",
  star: "M12 3l2.6 5.6 6.4.9-4.6 4.4 1.1 6.1L12 17l-5.5 3 1.1-6.1L3 9.5l6.4-.9z",
  flame: "M12 3s5 4 5 9a5 5 0 11-10 0c0-2 1-3 1-3s1 2 3 2c0-3-2-5 1-8z",
  shield: "M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z",
  menu: "M4 7h16M4 12h16M4 17h16",
  qr: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14h1M14 20h1M17 17h4M20 20h1",
  bell: "M6 8a6 6 0 1112 0c0 6 3 7 3 7H3s3-1 3-7zM10 21a2 2 0 004 0",
  refresh: "M21 12a9 9 0 11-3-6.7L21 8M21 3v5h-5",
  external: "M14 3h7v7M21 3L10 14M14 21H5a2 2 0 01-2-2v-9",
};

export type IconProps = {
  name: IconName;
  size?: number;
  stroke?: number;
  color?: string;
  fill?: string;
};

/// Single-glyph icon, drawn at 24x24 viewbox to match the design canvas.
export function Icon({
  name,
  size = 20,
  stroke = 1.7,
  color,
  fill = "none",
}: IconProps) {
  const t = useTheme();
  const tint = color ?? t.fg;
  const commonProps = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
  } as const;

  if (name === "plus-circle") {
    return (
      <Svg {...commonProps}>
        <Circle cx="12" cy="12" r="9" stroke={tint} strokeWidth={stroke} fill={fill} />
        <Path d="M12 8v8M8 12h8" stroke={tint} strokeWidth={stroke} strokeLinecap="round" />
      </Svg>
    );
  }

  if (name === "lock" || name === "lock-fill") {
    const filled = name === "lock-fill";
    return (
      <Svg {...commonProps}>
        <Rect
          x="5"
          y="11"
          width="14"
          height="9"
          rx="2"
          fill={filled ? tint : fill}
          stroke={tint}
          strokeWidth={stroke}
        />
        <Path
          d="M8 11V8a4 4 0 018 0v3"
          stroke={tint}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (name === "clock") {
    return (
      <Svg {...commonProps}>
        <Circle cx="12" cy="12" r="9" stroke={tint} strokeWidth={stroke} fill={fill} />
        <Path
          d="M12 7v5l3 2"
          stroke={tint}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    );
  }

  if (name === "face-id") {
    return (
      <Svg {...commonProps}>
        <Path
          d="M4 8V6a2 2 0 012-2h2M20 8V6a2 2 0 00-2-2h-2M4 16v2a2 2 0 002 2h2M20 16v2a2 2 0 01-2 2h-2"
          stroke={tint}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M9 10v1M15 10v1M12 10v4h-1M9 16s1 1 3 1 3-1 3-1"
          stroke={tint}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (name === "info") {
    return (
      <Svg {...commonProps}>
        <Circle cx="12" cy="12" r="9" stroke={tint} strokeWidth={stroke} fill={fill} />
        <Path
          d="M12 11v5M12 8h.01"
          stroke={tint}
          strokeWidth={stroke}
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  if (name === "compass") {
    return (
      <Svg {...commonProps}>
        <Circle cx="12" cy="12" r="9" stroke={tint} strokeWidth={stroke} fill={fill} />
        <Path
          d="M16 8L13.5 13L8 16L10.5 11Z"
          fill={tint}
          stroke={tint}
          strokeWidth={stroke * 0.6}
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (name === "search") {
    return (
      <Svg {...commonProps}>
        <Circle cx="11" cy="11" r="7" stroke={tint} strokeWidth={stroke} fill={fill} />
        <Path d="M21 21l-5-5" stroke={tint} strokeWidth={stroke} strokeLinecap="round" />
      </Svg>
    );
  }

  const path = SIMPLE_PATHS[name];
  if (!path) return null;
  return (
    <Svg {...commonProps}>
      <Path
        d={path}
        stroke={tint}
        strokeWidth={stroke}
        fill={fill}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/// Pesalo sprout mark — used on the Welcome screen.
export function Sprout({ size = 64, color }: { size?: number; color?: string }) {
  const t = useTheme();
  const c = color ?? t.green;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path d="M32 56 V32" stroke={c} strokeWidth={3} strokeLinecap="round" />
      <Path
        d="M32 36 C32 28 38 22 48 22 C48 30 42 36 32 36 Z"
        fill={c}
      />
      <Path
        d="M32 42 C32 36 27 32 19 32 C19 38 24 42 32 42 Z"
        fill={c}
        opacity={0.55}
      />
    </Svg>
  );
}

/// USDC/EURC/XLM coin icons. Hand-drawn marks so they don't depend on an
/// external CDN — the visuals match the design's prototype.
export function AssetIcon({
  symbol,
  size = 36,
}: {
  symbol: "USDC" | "EURC" | "XLM";
  size?: number;
}) {
  if (symbol === "USDC" || symbol === "EURC") {
    const bg = symbol === "USDC" ? "#2775CA" : "#345DD7";
    const glyph = symbol === "USDC" ? "$" : "€";
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx={50} cy={50} r={50} fill={bg} />
        <Circle
          cx={50}
          cy={50}
          r={33}
          stroke="#fff"
          strokeWidth={5}
          fill="none"
        />
        <Rect x={45} y={11} width={10} height={9} fill={bg} />
        <Rect x={45} y={80} width={10} height={9} fill={bg} />
        <SvgGlyph glyph={glyph} symbol={symbol} />
      </Svg>
    );
  }
  // XLM — Stellar mark
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={50} fill="#0B0B0E" />
      <G fill="none" stroke="#fff" strokeWidth={4.5} strokeLinecap="round">
        <Path d="M 58 17 A 34 34 0 0 1 83 42" />
        <Path d="M 42 83 A 34 34 0 0 1 17 58" />
      </G>
      <G fill="#fff">
        <Path d="M 14 48 L 86 32 L 86 39 L 14 55 Z" />
        <Path d="M 14 61 L 86 45 L 86 52 L 14 68 Z" />
      </G>
    </Svg>
  );
}

/// React-Native-Svg doesn't ship a `<Text>` we can centre as easily as SVG
/// web text, so we render the currency glyph via a foreignObject-shaped
/// stack: a Circle backdrop + overlaid View<Text> would shift on different
/// densities. Easiest reliable approach: draw the glyph as a path-shaped
/// SVG <Text>. react-native-svg supports it via SvgText.
function SvgGlyph({ glyph, symbol }: { glyph: string; symbol: "USDC" | "EURC" }) {
  // We import lazily to keep this file self-contained in the export list.
  const { Text: SvgText } = require("react-native-svg") as typeof import("react-native-svg");
  return (
    <SvgText
      x="50"
      y="64"
      textAnchor="middle"
      fill="#fff"
      fontSize={symbol === "USDC" ? 48 : 44}
      fontWeight="700"
    >
      {glyph}
    </SvgText>
  );
}

// Re-export less-noisy types for callers.
void Ellipse;
void Line;
