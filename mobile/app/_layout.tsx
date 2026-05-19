import "../global.css";

import { Stack } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "react-native";

import { initSentry, setUserContext } from "@/lib/observability/sentry";
import { colors } from "@/lib/utils/theme";
import { useAuthStore } from "@/stores/authStore";

// Boot Sentry as early as possible so we catch errors during the first render.
initSentry();

export default function RootLayout() {
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const walletAddress = useAuthStore((s) => s.walletAddress);

  useEffect(() => {
    checkAuth().catch(() => {});
  }, [checkAuth]);

  useEffect(() => {
    setUserContext(walletAddress);
  }, [walletAddress]);

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
