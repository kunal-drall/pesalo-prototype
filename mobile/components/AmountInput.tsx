import * as Haptics from "expo-haptics";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { colors, spacing, typography } from "@/lib/utils/theme";

type AmountInputProps = {
  asset: string;
  value: string;
  onChange: (value: string) => void;
  onMax?: () => void;
};

export function AmountInput({ asset, value, onChange, onMax }: AmountInputProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Amount</Text>
      <View style={styles.inputRow}>
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={(next) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChange(next);
          }}
          placeholder="0.00"
          placeholderTextColor={colors.text.tertiary}
          selectionColor={colors.brand.primary}
          style={styles.input}
          value={value}
        />
        <Text style={styles.asset}>{asset}</Text>
        <TouchableOpacity onPress={onMax} style={styles.maxButton}>
          <Text style={styles.maxText}>MAX</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8
  },
  label: {
    ...typography.caption,
    color: colors.text.tertiary
  },
  inputRow: {
    alignItems: "center",
    backgroundColor: colors.bg.tertiary,
    borderColor: colors.border.subtle,
    borderRadius: spacing.radiusLg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  input: {
    ...typography.displayMd,
    color: colors.text.primary,
    flex: 1,
    fontVariant: ["tabular-nums"],
    minHeight: 48
  },
  asset: {
    ...typography.headlineMd,
    color: colors.text.secondary
  },
  maxButton: {
    backgroundColor: colors.brand.primaryMuted,
    borderRadius: spacing.radiusFull,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  maxText: {
    ...typography.caption,
    color: colors.brand.primaryLight
  }
});
