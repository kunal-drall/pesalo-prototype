import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "react-native";

import { colors } from "@/lib/utils/theme";

export default function RootLayout() {
  return (
    <>
      <StatusBar barStyle="light-content" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.bg.primary },
          headerShown: false
        }}
      />
    </>
  );
}
