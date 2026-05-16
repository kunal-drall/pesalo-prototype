import { PropsWithChildren } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { colors, spacing } from "@/lib/utils/theme";

type CardProps = PropsWithChildren<{
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function Card({ children, elevated = false, style }: CardProps) {
  return <View style={[styles.card, elevated && styles.elevated, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.secondary,
    borderColor: colors.border.subtle,
    borderRadius: spacing.radiusXl,
    borderWidth: 1,
    padding: spacing.cardPadding
  },
  elevated: {
    backgroundColor: colors.bg.tertiary
  }
});
