import { ReactNode } from "react";
import {
  Pressable,
  StyleProp,
  Text,
  View,
  ViewStyle,
} from "react-native";

import { useTheme } from "@/lib/design/theme";

import { Icon, IconName } from "./Icon";

/// Pesalo's hero green button — used for the primary CTA on every screen.
/// Disabled state collapses the gradient + shadow so it reads "muted" without
/// looking broken.
export function PrimaryButton({
  children,
  onPress,
  icon,
  disabled,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        {
          height: 52,
          width: "100%",
          borderRadius: 16,
          backgroundColor: disabled ? t.bg2 : t.green,
          // Soroban-green gradient via two stops — RN doesn't ship gradients
          // out of the box, but a flat green + inset shadow matches the
          // design's optical weight on devices.
          shadowColor: disabled ? "transparent" : t.green,
          shadowOpacity: disabled ? 0 : 0.32,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: disabled ? 0 : 6,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: pressed && !disabled ? 0.9 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={18} stroke={2} color={disabled ? t.fg3 : "#fff"} />}
      <Text
        style={{
          fontFamily: t.sans,
          color: disabled ? t.fg3 : "#fff",
          fontSize: 16,
          fontWeight: "600",
          letterSpacing: -0.2,
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
}

/// Ghost / outline button — quieter than the primary, often used for
/// "I already have an account" style alternatives.
export function GhostButton({
  children,
  onPress,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          height: 44,
          paddingHorizontal: 18,
          borderRadius: 22,
          backgroundColor: "transparent",
          borderWidth: 1,
          borderColor: t.bg3,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: t.sans,
          color: t.fg,
          fontSize: 14,
          fontWeight: "500",
          letterSpacing: -0.1,
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
}

/// Pair of equal-width pills under the balance hero on Home. The design
/// uses a subtle background + border combo that picks up the surface
/// layer so they sit comfortably on bg0.
export function PillAction({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        height: 44,
        borderRadius: 22,
        backgroundColor: t.bg2,
        borderWidth: 1,
        borderColor: t.border,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Icon name={icon} size={17} stroke={1.8} color={t.fg} />
      <Text
        style={{
          fontFamily: t.sans,
          fontSize: 15,
          fontWeight: "500",
          color: t.fg,
          letterSpacing: -0.2,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/// Pill-shaped button used in filter chip rows (Activity filters, Boost
/// term tabs). Renders an "active" state with the brand green.
export function Chip({
  label,
  active,
  onPress,
  style,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          height: 32,
          paddingHorizontal: 14,
          borderRadius: 16,
          backgroundColor: active ? t.green : t.bg1,
          borderWidth: active ? 0 : 1,
          borderColor: t.border,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.85 : 1,
          flexShrink: 0,
        },
        style,
      ]}
    >
      <View>
        <Text
          style={{
            fontFamily: t.sans,
            fontSize: 13,
            fontWeight: "600",
            color: active ? "#fff" : t.fg2,
            letterSpacing: -0.1,
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
