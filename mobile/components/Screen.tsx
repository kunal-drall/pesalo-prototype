import { PropsWithChildren } from "react";
import { SafeAreaView, ScrollView, StyleSheet, ViewStyle } from "react-native";

import { colors, spacing } from "@/lib/utils/theme";

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  contentStyle?: ViewStyle;
}>;

export function Screen({ children, scroll = false, contentStyle }: ScreenProps) {
  if (scroll) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={[styles.content, styles.scrollContent, contentStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return <SafeAreaView style={[styles.safe, styles.content, contentStyle]}>{children}</SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.bg.primary,
    flex: 1
  },
  content: {
    gap: spacing.gapLg,
    padding: spacing.screenPadding
  },
  scrollContent: {
    paddingBottom: 120
  }
});
