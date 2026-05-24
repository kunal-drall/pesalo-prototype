import { useEffect, useRef } from "react";
import { Animated, Easing, Modal, StyleSheet, Text, View } from "react-native";

import { colors, typography } from "@/lib/utils/theme";

type SuccessAnimationProps = {
  visible?: boolean;
  label?: string;
};

export function SuccessAnimation({ visible = false, label = "Done" }: SuccessAnimationProps) {
  const scale = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.4);
      Animated.timing(scale, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.back(1.6)),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, scale]);

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.scrim} accessibilityRole="image" accessibilityLabel={label}>
        <Animated.View style={[styles.circle, { transform: [{ scale }] }]}>
          <Text style={styles.check}>✓</Text>
        </Animated.View>
        <Text style={styles.label}>{label}</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    alignItems: "center",
    backgroundColor: "rgba(8, 11, 17, 0.85)",
    flex: 1,
    gap: 16,
    justifyContent: "center",
  },
  circle: {
    alignItems: "center",
    backgroundColor: colors.brand.primaryMuted,
    borderColor: colors.brand.primary,
    borderRadius: 40,
    borderWidth: 1,
    height: 80,
    justifyContent: "center",
    width: 80,
  },
  check: {
    color: colors.brand.primaryLight,
    fontSize: 44,
    fontWeight: "700",
    lineHeight: 50,
  },
  label: { ...typography.headlineMd, color: colors.text.primary },
});
