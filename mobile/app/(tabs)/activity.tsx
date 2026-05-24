import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from "react-native";

import { Chip } from "@/components/design/Buttons";
import { Icon, IconName } from "@/components/design/Icon";
import { Screen } from "@/components/design/Screen";
import { Caption, Money } from "@/components/design/Text";
import { useActivity } from "@/hooks/useActivity";
import { useTheme } from "@/lib/design/theme";
import { ActivityEvent } from "@/lib/stellar/types";
import { SupportedAsset } from "@/lib/utils/constants";
import { useAuthStore } from "@/stores/authStore";

type Filter = "All" | SupportedAsset;

/// Activity — grouped by relative time bucket (Today / Yesterday / This
/// week / Earlier) with a filter chip row. Every transaction is real,
/// pulled from `/v1/activity/:address`; nothing is mocked.
export default function ActivityScreen() {
  const t = useTheme();
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const { events, loading, error, refresh } = useActivity(walletAddress);
  const [filter, setFilter] = useState<Filter>("All");

  const grouped = useMemo(() => {
    const filtered = filter === "All" ? events : events.filter((e) => e.asset === filter);
    const buckets: { label: string; items: ActivityEvent[] }[] = [
      { label: "Today", items: [] },
      { label: "Yesterday", items: [] },
      { label: "This week", items: [] },
      { label: "Earlier", items: [] },
    ];
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = startOfDay - 86_400_000;
    const weekStart = startOfDay - 6 * 86_400_000;
    for (const e of filtered) {
      const ts = new Date(e.occurredAt).getTime();
      if (ts >= startOfDay) buckets[0].items.push(e);
      else if (ts >= yesterdayStart) buckets[1].items.push(e);
      else if (ts >= weekStart) buckets[2].items.push(e);
      else buckets[3].items.push(e);
    }
    return buckets.filter((b) => b.items.length > 0);
  }, [events, filter]);

  return (
    <Screen
      topInset={0}
      refreshControl={
        <RefreshControl
          tintColor={t.green}
          refreshing={loading}
          onRefresh={refresh}
        />
      }
    >
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
          Activity
        </Text>
      </View>

      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 16,
          flexDirection: "row",
          gap: 8,
        }}
      >
        {(["All", "USDC", "EURC", "XLM"] as Filter[]).map((f) => (
          <Chip
            key={f}
            label={f}
            active={f === filter}
            onPress={() => setFilter(f)}
          />
        ))}
      </View>

      {error && (
        <Text
          style={{
            fontFamily: t.sans,
            paddingHorizontal: 20,
            paddingTop: 16,
            color: t.error,
            fontSize: 13,
          }}
        >
          {error}
        </Text>
      )}

      {!loading && events.length === 0 && !error && (
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 32,
          }}
        >
          <Text style={{ fontFamily: t.sans, color: t.fg2, fontSize: 14, lineHeight: 21 }}>
            Nothing here yet. Make your first deposit and earnings will start
            flowing in.
          </Text>
        </View>
      )}

      {loading && events.length === 0 && (
        <View style={{ paddingTop: 40, alignItems: "center" }}>
          <ActivityIndicator color={t.green} />
        </View>
      )}

      <View style={{ height: 16 }} />

      {grouped.map((bucket) => (
        <View key={bucket.label}>
          <Caption style={{ paddingHorizontal: 20, paddingBottom: 6, paddingTop: 8 }}>
            {bucket.label}
          </Caption>
          {bucket.items.map((e, idx) => (
            <TxnRow
              key={e.id}
              event={e}
              isLast={idx === bucket.items.length - 1}
            />
          ))}
        </View>
      ))}
    </Screen>
  );
}

function TxnRow({ event, isLast }: { event: ActivityEvent; isLast: boolean }) {
  const t = useTheme();
  const cfg = configFor(event.kind, t);
  const occurred = new Date(event.occurredAt);
  const time = occurred.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const sign = signOf(event.kind);
  const amountText = formatAmount(sign * event.amount, event.asset, sign);
  const amountColor =
    sign > 0 ? t.success : sign < 0 ? t.fg : t.fg2;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingHorizontal: 20,
        paddingVertical: 14,
        minHeight: 72,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: t.border,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: cfg.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={cfg.icon} size={18} stroke={2} color={cfg.color} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            fontFamily: t.sans,
            fontSize: 15,
            fontWeight: "600",
            color: t.fg,
            letterSpacing: -0.2,
          }}
        >
          {titleFor(event)}
        </Text>
        <Text
          style={{
            fontFamily: t.sans,
            fontSize: 13,
            color: t.fg3,
            letterSpacing: -0.1,
          }}
        >
          {event.asset} · {time}
        </Text>
      </View>
      <Money size={15} weight="500" color={amountColor}>
        {amountText}
      </Money>
    </View>
  );
}

function configFor(
  kind: ActivityEvent["kind"],
  t: ReturnType<typeof useTheme>,
): { bg: string; color: string; icon: IconName } {
  switch (kind) {
    case "deposit_fixed":
      return { bg: "rgba(245,183,49,0.16)", color: t.gold, icon: "flame" };
    case "deposit_flex":
      return { bg: "rgba(22,163,103,0.16)", color: t.green, icon: "sparkles" };
    case "withdraw_flex":
      return { bg: "rgba(148,163,184,0.16)", color: t.fg2, icon: "arrow-up-right" };
    case "send":
      return { bg: "rgba(239,68,68,0.16)", color: t.error, icon: "arrow-up-right" };
    case "receive":
      return { bg: "rgba(34,197,94,0.16)", color: t.success, icon: "arrow-down-left" };
    case "claim":
      return { bg: "rgba(245,183,49,0.16)", color: t.gold, icon: "sparkles" };
    case "redeem_maturity":
      return { bg: "rgba(148,163,184,0.16)", color: t.fg2, icon: "chart-line" };
  }
}

function titleFor(event: ActivityEvent): string {
  switch (event.kind) {
    case "deposit_fixed":
      return "Boosted";
    case "deposit_flex":
      return "Auto-deposit";
    case "withdraw_flex":
      return "Auto-withdraw";
    case "send":
      return event.counterparty
        ? `Sent to ${shortAddr(event.counterparty)}`
        : "Sent";
    case "receive":
      return "Received · auto-earning";
    case "claim":
      return "Earnings credited";
    case "redeem_maturity":
      return "Matured · back to auto-earn";
  }
}

function signOf(kind: ActivityEvent["kind"]): -1 | 0 | 1 {
  switch (kind) {
    case "send":
      return -1;
    case "receive":
    case "claim":
    case "redeem_maturity":
      return 1;
    case "deposit_fixed":
    case "deposit_flex":
    case "withdraw_flex":
      return 0;
  }
}

function shortAddr(addr: string): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function formatAmount(amount: number, asset: SupportedAsset, sign: -1 | 0 | 1) {
  const abs = Math.abs(amount);
  const digits = asset === "XLM" ? 2 : 2;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(abs);
  const prefix = sign > 0 ? "+" : sign < 0 ? "−" : "";
  return `${prefix}${formatted} ${asset}`;
}
