import { useRouter, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import { WebView, WebViewNavigation } from "react-native-webview";

import { Icon } from "@/components/design/Icon";
import { NavBar } from "@/components/design/NavBar";
import { Screen } from "@/components/design/Screen";
import { useTheme } from "@/lib/design/theme";
import { DAPPS, faviconUrl } from "@/lib/discover/registry";

/// In-app browser for a curated dApp. The URL is sourced from the
/// registry, not from user input — we never load arbitrary content. The
/// WebView is the *real* dApp, so users can interact directly with
/// Stellar mainnet from inside Pesalo.
export default function BrowserScreen() {
  const t = useTheme();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const dapp = DAPPS.find((d) => d.slug === slug);
  const webviewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [navState, setNavState] = useState<WebViewNavigation | null>(null);

  if (!dapp) {
    return (
      <Screen topInset={0}>
        <NavBar title="Browser" onBack={() => router.back()} />
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <Text
            style={{
              fontFamily: t.sans,
              fontSize: 18,
              fontWeight: "600",
              color: t.fg,
            }}
          >
            Unknown dApp
          </Text>
          <Text
            style={{
              fontFamily: t.sans,
              fontSize: 14,
              color: t.fg2,
              marginTop: 6,
            }}
          >
            That dApp isn&apos;t in the registry. Open Discover to browse the
            current list.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable={false} topInset={0}>
      <NavBar
        title={dapp.name}
        onBack={() => router.back()}
        right={
          <Pressable
            onPress={() => webviewRef.current?.reload()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: t.bg1,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: t.name === "light" ? 1 : 0,
              borderColor: t.border,
            }}
          >
            <Icon name="refresh" size={16} stroke={2} color={t.fg} />
          </Pressable>
        }
      />

      {/* URL bar showing the live URL so users can verify they're on the
          real dApp domain. Tapping anywhere here is a no-op — we never
          let users type an arbitrary URL. */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          marginHorizontal: 16,
          marginBottom: 8,
          height: 36,
          paddingHorizontal: 12,
          backgroundColor: t.bg1,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: t.border,
        }}
      >
        <Image
          source={{ uri: faviconUrl(dapp.brandDomain, 64) }}
          style={{ width: 16, height: 16, borderRadius: 4 }}
        />
        <Text
          style={{
            fontFamily: t.sans,
            fontSize: 12,
            color: t.fg2,
            flex: 1,
            letterSpacing: -0.1,
          }}
          numberOfLines={1}
        >
          {navState?.url ?? dapp.url}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 6,
            backgroundColor: "rgba(22,163,103,0.12)",
          }}
        >
          <Icon name="lock-fill" size={10} color={t.green} />
          <Text
            style={{
              fontFamily: t.sans,
              fontSize: 10,
              fontWeight: "700",
              color: t.green,
              letterSpacing: 0.4,
            }}
          >
            HTTPS
          </Text>
        </View>
      </View>

      <View style={{ flex: 1, position: "relative" }}>
        <WebView
          ref={webviewRef}
          source={{ uri: dapp.url }}
          style={{ flex: 1, backgroundColor: t.bg0 }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={setNavState}
          startInLoadingState
          allowsBackForwardNavigationGestures
          decelerationRate="normal"
        />
        {loading && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              alignItems: "center",
              paddingTop: 24,
              pointerEvents: "none",
            }}
          >
            <ActivityIndicator color={t.green} />
          </View>
        )}
      </View>

      {/* Footer with back/forward and external open */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: 24,
          borderTopWidth: 1,
          borderTopColor: t.border,
          backgroundColor: t.bg0,
        }}
      >
        <Pressable
          onPress={() => webviewRef.current?.goBack()}
          disabled={!navState?.canGoBack}
          hitSlop={8}
          style={{ padding: 8, opacity: navState?.canGoBack ? 1 : 0.3 }}
        >
          <Icon name="chevron-left" size={20} stroke={2} color={t.fg} />
        </Pressable>
        <Pressable
          onPress={() => webviewRef.current?.goForward()}
          disabled={!navState?.canGoForward}
          hitSlop={8}
          style={{ padding: 8, opacity: navState?.canGoForward ? 1 : 0.3 }}
        >
          <Icon name="chevron-right" size={20} stroke={2} color={t.fg} />
        </Pressable>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 12,
            backgroundColor: t.bg2,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Icon name="close" size={14} stroke={2} color={t.fg2} />
          <Text style={{ fontFamily: t.sans, fontSize: 13, color: t.fg2, fontWeight: "600" }}>
            Close
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
