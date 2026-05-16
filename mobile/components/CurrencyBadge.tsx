import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "@/lib/utils/theme";

type CurrencyBadgeProps = {
  asset: string;
};

export function CurrencyBadge({ asset }: CurrencyBadgeProps) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{asset}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.bg.elevated,
    borderColor: colors.border.subtle,
    borderRadius: spacing.radiusFull,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  text: {
    ...typography.caption,
    color: colors.text.secondary
  }
});
