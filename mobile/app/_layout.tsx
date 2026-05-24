// Node-core polyfills are installed by index.js (the app entry) before
// expo-router scans routes.
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { StatusBar, View } from "react-native";

import { initSentry, setUserContext } from "@/lib/observability/sentry";
import { colors } from "@/lib/utils/theme";
import { useAuthStore } from "@/stores/authStore";

// Boot Sentry as early as possible so we catch errors during the first render.
initSentry();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const [bootChecked, setBootChecked] = useState(false);

  // Boot-time wallet check. Must finish before we make routing decisions —
  // otherwise we'd briefly flash Welcome to authenticated users (or vice
  // versa) on every cold start.
  useEffect(() => {
    checkAuth()
      .catch(() => {})
      .finally(() => setBootChecked(true));
  }, [checkAuth]);

  useEffect(() => {
    setUserContext(walletAddress);
  }, [walletAddress]);

  // Auth gate. Once we know whether a wallet exists, force the user into
  // the right surface:
  //   no wallet  -> /(auth)/welcome
  //   has wallet -> /(tabs)
  // We only redirect when the user is on the *wrong* side of the gate so
  // they can still navigate freely within their surface.
  useEffect(() => {
    if (!bootChecked) return;
    const inAuth = segments[0] === "(auth)";
    if (!walletAddress && !inAuth) {
      router.replace("/(auth)/welcome");
    } else if (walletAddress && inAuth) {
      router.replace("/(tabs)");
    }
  }, [bootChecked, walletAddress, segments, router]);

  // Render nothing until the boot check finishes so we never paint the
  // wrong surface for a frame.
  if (!bootChecked) {
    return <View style={{ flex: 1, backgroundColor: colors.bg.primary }} />;
  }

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
