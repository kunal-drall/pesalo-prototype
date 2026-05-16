import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { TransactionRow } from "@/components/TransactionRow";
import { fetchActivity } from "@/lib/api/activity";
import { ActivityEvent } from "@/lib/stellar/types";
import { colors, spacing, typography } from "@/lib/utils/theme";
import { useAuthStore } from "@/stores/authStore";

const KIND_LABEL: Record<ActivityEvent["kind"], string> = {
  deposit_fixed: "Fixed deposit",
  deposit_flex: "Flex deposit",
  withdraw_flex: "Flex withdraw",
  send: "Sent",
  receive: "Received",
  claim: "Claimed yield",
  redeem_maturity: "Matured",
};

export default function ActivityScreen() {
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!walletAddress) {
      setLoading(false);
      return;
    }
    fetchActivity(walletAddress)
      .then((payload) => {
        if (!active) return;
        setEvents(payload.events);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Could not load activity");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [walletAddress]);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Activity</Text>
        <Text style={styles.subtitle}>Your recent deposits, sends, and earnings.</Text>
      </View>

      {loading && <ActivityIndicator color={colors.brand.primary} />}
      {error && <Text style={styles.error}>{error}</Text>}

      {!loading && events.length === 0 && !error && (
        <Text style={styles.empty}>Nothing here yet. Make your first deposit to get started.</Text>
      )}

      {events.map((event) => (
        <TransactionRow
          key={event.id}
          title={KIND_LABEL[event.kind] ?? event.kind}
          subtitle={new Date(event.occurredAt).toLocaleString()}
          amount={signOf(event.kind) * event.amount}
          asset={event.asset}
        />
      ))}
    </Screen>
  );
}

function signOf(kind: ActivityEvent["kind"]): -1 | 1 {
  switch (kind) {
    case "send":
    case "deposit_fixed":
    case "deposit_flex":
      return -1;
    default:
      return 1;
  }
}

const styles = StyleSheet.create({
  header: { gap: spacing.gapTight, marginBottom: spacing.gapMd },
  title: { ...typography.headlineLg, color: colors.text.primary },
  subtitle: { ...typography.bodyMd, color: colors.text.secondary },
  empty: { ...typography.bodyMd, color: colors.text.secondary },
  error: { ...typography.bodyMd, color: colors.error },
});
