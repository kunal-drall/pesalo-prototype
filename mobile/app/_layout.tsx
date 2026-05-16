import "../global.css";

import { Stack } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "react-native";

import { colors } from "@/lib/utils/theme";
import { useAuthStore } from "@/stores/authStore";

export default function RootLayout() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth().catch(() => {});
  }, [checkAuth]);

  return (
    <>
      <StatusBar barStyle="light-content" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.bg.primary },
          headerShown: false,
        }}
      />
    </>
  );
}
