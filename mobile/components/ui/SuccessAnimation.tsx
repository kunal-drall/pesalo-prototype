import { StyleSheet, Text, View } from "react-native";

import { colors, typography } from "@/lib/utils/theme";

type SuccessAnimationProps = {
  label?: string;
};

export function SuccessAnimation({ label = "Done" }: SuccessAnimationProps) {
  return (
    <View style={styles.wrapper} accessibilityRole="image" accessibilityLabel={label}>
      <View style={styles.circle}>
        <Text style={styles.check}>✓</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    gap: 12
  },
  circle: {
    alignItems: "center",
    backgroundColor: colors.brand.primaryMuted,
    borderColor: colors.brand.primary,
    borderRadius: 40,
    borderWidth: 1,
    height: 80,
    justifyContent: "center",
    width: 80
  },
  check: {
    color: colors.brand.primaryLight,
    fontSize: 44,
    fontWeight: "700",
    lineHeight: 50
  },
  label: {
    ...typography.headlineMd,
    color: colors.text.primary
  }
});
