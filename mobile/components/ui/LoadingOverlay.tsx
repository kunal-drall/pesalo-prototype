import { ActivityIndicator, Modal, StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "@/lib/utils/theme";

type LoadingOverlayProps = {
  visible: boolean;
  message: string;
};

export function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ActivityIndicator color={colors.brand.primary} />
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "#080B11CC",
    flex: 1,
    justifyContent: "center",
    padding: spacing.screenPadding
  },
  sheet: {
    alignItems: "center",
    backgroundColor: colors.bg.secondary,
    borderColor: colors.border.subtle,
    borderRadius: spacing.radiusXl,
    borderWidth: 1,
    gap: spacing.gapMd,
    padding: spacing.cardPaddingLg,
    width: "100%"
  },
  message: {
    ...typography.bodyLg,
    color: colors.text.primary,
    textAlign: "center"
  }
});
