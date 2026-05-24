import { ReactElement, ReactNode } from "react";
import {
  RefreshControlProps,
  SafeAreaView,
  ScrollView,
  StatusBar,
  View,
  ViewStyle,
} from "react-native";

import { useTheme } from "@/lib/design/theme";

/// Themed screen shell — gives every screen a consistent background and
/// a SafeAreaView so iOS notches / Android status bars don't eat content.
export function Screen({
  children,
  scrollable = true,
  contentStyle,
  refreshControl,
  topInset = 8,
}: {
  children: ReactNode;
  scrollable?: boolean;
  contentStyle?: ViewStyle;
  refreshControl?: ReactElement<RefreshControlProps>;
  topInset?: number;
}) {
  const t = useTheme();

  if (scrollable) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg0 }}>
        <StatusBar
          barStyle={t.name === "dark" ? "light-content" : "dark-content"}
          backgroundColor={t.bg0}
        />
        <ScrollView
          contentContainerStyle={[{ paddingTop: topInset, paddingBottom: 120 }, contentStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg0 }}>
      <StatusBar
        barStyle={t.name === "dark" ? "light-content" : "dark-content"}
        backgroundColor={t.bg0}
      />
      <View style={[{ flex: 1, paddingTop: topInset }, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}
