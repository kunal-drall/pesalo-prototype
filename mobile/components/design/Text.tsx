import { Text, TextProps } from "react-native";

import { useTheme } from "@/lib/design/theme";

/// Tabular-numerals text for monetary amounts. The design uses
/// fontVariant: ["tabular-nums"] for every dollar/asset value so columns
/// align by digit width regardless of glyph metrics.
export function Money({
  children,
  size = 17,
  weight = "500",
  color,
  style,
  ...rest
}: TextProps & {
  size?: number;
  weight?: "400" | "500" | "600" | "700";
  color?: string;
}) {
  const t = useTheme();
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: t.sans,
          fontSize: size,
          fontWeight: weight,
          color: color ?? t.fg,
          letterSpacing: -0.3,
          fontVariant: ["tabular-nums"],
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/// Small uppercased caption — used as section headers.
export function Caption({
  children,
  color,
  style,
  ...rest
}: TextProps & { color?: string }) {
  const t = useTheme();
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: t.sans,
          fontSize: 12,
          fontWeight: "600",
          letterSpacing: 1.4,
          textTransform: "uppercase",
          color: color ?? t.fg3,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
