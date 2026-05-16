import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { ReactNode, useRef } from "react";
import {
  Animated,
  GestureResponderEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle
} from "react-native";

import { colors, spacing, typography } from "@/lib/utils/theme";

type ButtonVariant = "primary" | "secondary" | "tertiary" | "accent" | "destructive";

type ButtonProps = {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  icon,
  style
}: ButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      damping: 16,
      stiffness: 220
    }).start();
  };

  const pressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      damping: 16,
      stiffness: 220
    }).start();
  };

  const content = (
    <View style={styles.content}>
      {icon}
      <Text style={[styles.text, textStyles[variant], disabled && styles.disabledText]}>
        {title}
      </Text>
    </View>
  );

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
      >
        {variant === "primary" || variant === "accent" ? (
          <LinearGradient
            colors={
              variant === "accent"
                ? [colors.accent.goldLight, colors.accent.gold]
                : colors.brand.gradient
            }
            style={[styles.base, disabled && styles.disabled]}
          >
            {content}
          </LinearGradient>
        ) : (
          <View style={[styles.base, styles[variant], disabled && styles.disabled]}>
            {content}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const textStyles = StyleSheet.create({
  primary: {
    color: colors.text.inverse
  },
  secondary: {
    color: colors.text.primary
  },
  tertiary: {
    color: colors.brand.primary
  },
  accent: {
    color: colors.text.inverse
  },
  destructive: {
    color: colors.error
  }
});

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: spacing.radiusLg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 14
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center"
  },
  text: {
    ...typography.headlineMd,
    textAlign: "center"
  },
  secondary: {
    backgroundColor: "transparent",
    borderColor: colors.border.medium,
    borderWidth: 1
  },
  tertiary: {
    backgroundColor: "transparent",
    minHeight: 44,
    paddingHorizontal: 12
  },
  destructive: {
    backgroundColor: "#EF444410",
    minHeight: 44
  },
  disabled: {
    opacity: 0.45
  },
  disabledText: {
    color: colors.text.tertiary
  }
});
