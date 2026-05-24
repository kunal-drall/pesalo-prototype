import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";

import { Chip } from "@/components/design/Buttons";
import { Icon } from "@/components/design/Icon";
import { Screen } from "@/components/design/Screen";
import { Caption } from "@/components/design/Text";
import { useTheme } from "@/lib/design/theme";
import {
  CATEGORIES,
  DApp,
  DAPPS,
  DiscoverCategory,
  faviconUrl,
} from "@/lib/discover/registry";

/// Discover — search + categories over a curated list of real Stellar
/// dApps. Every icon is the dApp's actual favicon (resolved at runtime);
/// we don't synthesise glyphs, and if an entry's favicon ever fails it
/// shows nothing rather than a placeholder.
export default function DiscoverScreen() {
  const t = useTheme();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<DiscoverCategory["slug"]>("all");

  const trending = useMemo(() => DAPPS.filter((d) => d.trending), []);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DAPPS.filter((d) => {
      if (cat !== "all" && d.category !== cat) return false;
      if (q) {
        return (
          d.name.toLowerCase().includes(q) || d.desc.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [cat, search]);

  const openDApp = (d: DApp) => {
    router.push({ pathname: "/discover/browser", params: { slug: d.slug } });
  };

  return (
    <Screen topInset={0}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <Text
          style={{
            fontFamily: t.sans,
            fontSize: 28,
            fontWeight: "700",
            color: t.fg,
            letterSpacing: -0.8,
          }}
        >
          Discover
        </Text>
        <View style={{ height: 4 }} />
        <Text
          style={{
            fontFamily: t.sans,
            fontSize: 14,
            color: t.fg2,
            letterSpacing: -0.1,
          }}
        >
          Stellar&apos;s ecosystem — your wallet, every dApp.
        </Text>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: t.bg1,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            paddingHorizontal: 14,
            height: 44,
          }}
        >
          <Icon name="search" size={16} stroke={1.8} color={t.fg3} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search dApps…"
            placeholderTextColor={t.fg3}
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              flex: 1,
              fontFamily: t.sans,
              color: t.fg,
              fontSize: 14,
              letterSpacing: -0.2,
            }}
          />
        </View>
      </View>

      {search.length === 0 && trending.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "baseline",
              paddingHorizontal: 20,
              paddingBottom: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Icon name="flame" size={14} stroke={2} color={t.gold} />
              <Text
                style={{
                  fontFamily: t.sans,
                  fontSize: 15,
                  fontWeight: "700",
                  color: t.fg,
                  letterSpacing: -0.2,
                }}
              >
                Trending
              </Text>
            </View>
            <Text style={{ fontFamily: t.sans, fontSize: 12, color: t.fg3 }}>
              {trending.length} hot
            </Text>
          </View>
          <View
            style={{
              paddingHorizontal: 20,
              flexDirection: "row",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            {trending.map((d) => (
              <TrendingCard key={d.slug} dapp={d} onPress={() => openDApp(d)} />
            ))}
          </View>
        </View>
      )}

      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 20,
          flexDirection: "row",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        {CATEGORIES.map((c) => (
          <Chip
            key={c.slug}
            label={c.label}
            active={c.slug === cat}
            onPress={() => setCat(c.slug)}
          />
        ))}
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <Text
            style={{
              fontFamily: t.sans,
              fontSize: 15,
              fontWeight: "700",
              color: t.fg,
              letterSpacing: -0.2,
            }}
          >
            All dApps
          </Text>
          <Text style={{ fontFamily: t.sans, fontSize: 12, color: t.fg3 }}>
            {filtered.length} apps
          </Text>
        </View>

        {filtered.length === 0 ? (
          <Text
            style={{
              fontFamily: t.sans,
              paddingVertical: 40,
              textAlign: "center",
              color: t.fg3,
              fontSize: 14,
            }}
          >
            No dApps match that search.
          </Text>
        ) : (
          filtered.map((d, i) => (
            <DAppRow
              key={d.slug}
              dapp={d}
              onPress={() => openDApp(d)}
              isLast={i === filtered.length - 1}
            />
          ))
        )}
      </View>

      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 24,
          flexDirection: "row",
          gap: 8,
          alignItems: "flex-start",
        }}
      >
        <Icon name="shield" size={14} stroke={1.7} color={t.fg3} />
        <Text
          style={{
            fontFamily: t.sans,
            fontSize: 12,
            color: t.fg3,
            lineHeight: 18,
            letterSpacing: -0.05,
            flex: 1,
          }}
        >
          Pesalo signs each transaction with Face ID. Your keys never leave
          your device.
        </Text>
      </View>
    </Screen>
  );
}

function TrendingCard({ dapp, onPress }: { dapp: DApp; onPress: () => void }) {
  const t = useTheme();
  void Caption;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 240,
        height: 168,
        borderRadius: 20,
        backgroundColor: t.bg1,
        borderWidth: 1,
        borderColor: t.border,
        padding: 18,
        opacity: pressed ? 0.92 : 1,
        overflow: "hidden",
        justifyContent: "space-between",
      })}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          backgroundColor: t.bg2,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <Image
          source={{ uri: faviconUrl(dapp.brandDomain, 128) }}
          style={{ width: 32, height: 32 }}
        />
      </View>
      <View>
        <Text
          style={{
            fontFamily: t.sans,
            fontSize: 18,
            fontWeight: "700",
            color: t.fg,
            letterSpacing: -0.4,
            marginBottom: 4,
          }}
        >
          {dapp.name}
        </Text>
        <Text
          style={{
            fontFamily: t.sans,
            fontSize: 12,
            color: t.fg3,
            textTransform: "capitalize",
            letterSpacing: 0.3,
            fontWeight: "600",
          }}
        >
          {dapp.category}
        </Text>
      </View>
    </Pressable>
  );
}

function DAppRow({
  dapp,
  onPress,
  isLast,
}: {
  dapp: DApp;
  onPress: () => void;
  isLast: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: t.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          backgroundColor: t.bg2,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <Image
          source={{ uri: faviconUrl(dapp.brandDomain, 128) }}
          style={{ width: 32, height: 32 }}
        />
      </View>
      <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
        <Text
          style={{
            fontFamily: t.sans,
            fontSize: 15,
            fontWeight: "600",
            color: t.fg,
            letterSpacing: -0.2,
          }}
        >
          {dapp.name}
        </Text>
        <Text
          style={{
            fontFamily: t.sans,
            fontSize: 12,
            color: t.fg3,
            textTransform: "capitalize",
          }}
        >
          {dapp.category}
        </Text>
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          height: 32,
          paddingHorizontal: 14,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: t.bg3,
        }}
      >
        <Text
          style={{
            fontFamily: t.sans,
            fontSize: 12,
            fontWeight: "600",
            color: t.fg2,
            letterSpacing: -0.1,
          }}
        >
          Open
        </Text>
        <Icon name="external" size={11} stroke={2} color={t.fg2} />
      </View>
    </Pressable>
  );
}
