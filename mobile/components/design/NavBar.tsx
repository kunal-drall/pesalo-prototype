import { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/lib/design/theme";

import { Icon } from "./Icon";

/// Top nav bar with optional back / close + centred title + small badge.
/// Matches the design canvas — the back/close buttons live on rounded
/// surfaces so they read as tappable on either theme.
export function NavBar({
  title,
  onBack,
  onClose,
  right,
  badge,
}: {
  title: string;
  onBack?: () => void;
  onClose?: () => void;
  right?: ReactNode;
  badge?: string;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        height: 52,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative",
      }}
    >
      <View style={{ width: 36 }}>
        {onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={onBack}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: t.bg1,
              borderWidth: t.name === "light" ? 1 : 0,
              borderColor: t.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="chevron-left" size={18} stroke={2} color={t.fg} />
          </Pressable>
        )}
      </View>

      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          alignItems: "center",
          justifyContent: "center",
          height: 52,
          flexDirection: "row",
          gap: 6,
        }}
        pointerEvents="none"
      >
        <Text
          style={{
            fontFamily: t.sans,
            fontSize: 17,
            fontWeight: "600",
            color: t.fg,
            letterSpacing: -0.3,
          }}
        >
          {title}
        </Text>
        {badge && (
          <View
            style={{
              backgroundColor: t.bg2,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 8,
              marginLeft: 4,
            }}
          >
            <Text
              style={{
                fontFamily: t.sans,
                fontSize: 11,
                fontWeight: "700",
                color: t.fg2,
                letterSpacing: 0.4,
              }}
            >
              {badge}
            </Text>
          </View>
        )}
      </View>

      <View style={{ width: 36, flexDirection: "row", justifyContent: "flex-end" }}>
        {onClose && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: t.bg1,
              borderWidth: t.name === "light" ? 1 : 0,
              borderColor: t.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="close" size={16} stroke={2} color={t.fg} />
          </Pressable>
        )}
        {right}
      </View>
    </View>
  );
}
