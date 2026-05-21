import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { PrimaryButton } from "@/components/design/Buttons";
import { Icon } from "@/components/design/Icon";
import { AssetIcon } from "@/components/design/Icon";
import { NavBar } from "@/components/design/NavBar";
import { Screen } from "@/components/design/Screen";
import { Caption, Money } from "@/components/design/Text";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { useTransaction } from "@/hooks/useTransaction";
import { useTheme } from "@/lib/design/theme";
import {
  buildAddTrustline,
  buildSwap,
  findStrictSendPath,
  hasTrustline,
  type PaymentPath,
} from "@/lib/stellar/payments";
import { SUPPORTED_ASSETS, SupportedAsset } from "@/lib/utils/constants";
import { useAuthStore } from "@/stores/authStore";
import { useWalletStore } from "@/stores/walletStore";

/// Swap — XLM ↔ USDC ↔ EURC via Horizon's strict-send path-payment. The
/// rate shown comes from the live testnet DEX order book (not a hard-
/// coded oracle). Adds a USDC/EURC trustline automatically when the
/// destination asset isn't yet trusted on the user's account.
export default function SwapScreen() {
  const t = useTheme();
  const router = useRouter();
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const balances = useWalletStore((s) => s.balances) ?? [];
  const tx = useTransaction();

  const [sendAsset, setSendAsset] = useState<SupportedAsset>("XLM");
  const [destAsset, setDestAsset] = useState<SupportedAsset>("USDC");
  const [sendAmount, setSendAmount] = useState("");
  const [path, setPath] = useState<PaymentPath | null>(null);
  const [pathLoading, setPathLoading] = useState(false);
  const [pathError, setPathError] = useState<string | null>(null);
  const [trustlineMissing, setTrustlineMissing] = useState(false);

  const userBalance = balances.find((b) => b.asset === sendAsset)?.amount ?? 0;
  const parsed = Number(sendAmount) || 0;
  const insufficient = parsed > userBalance;

  // Debounce path lookups so we don't slam Horizon for every keystroke.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (parsed <= 0 || sendAsset === destAsset || !walletAddress) {
      setPath(null);
      setPathError(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setPathLoading(true);
      setPathError(null);
      const result = await findStrictSendPath({
        sourceAccount: walletAddress,
        sendAsset,
        sendAmount,
        destAsset,
      });
      setPathLoading(false);
      if (result) {
        setPath(result);
      } else {
        setPath(null);
        setPathError("No swap route available right now.");
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [parsed, sendAsset, destAsset, sendAmount, walletAddress]);

  // Detect missing trustline so we can run a change_trust before the swap.
  useEffect(() => {
    if (!walletAddress || destAsset === "XLM") {
      setTrustlineMissing(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const trusted = await hasTrustline(walletAddress, destAsset);
      if (!cancelled) setTrustlineMissing(!trusted);
    })();
    return () => {
      cancelled = true;
    };
  }, [walletAddress, destAsset]);

  const swapPair = useMemo(() => {
    const candidates = SUPPORTED_ASSETS.filter((a) => a !== sendAsset);
    if (!candidates.includes(destAsset)) {
      return candidates[0];
    }
    return destAsset;
  }, [sendAsset, destAsset]);

  // Keep dest in sync when the user flips the send asset.
  useEffect(() => {
    if (swapPair !== destAsset) setDestAsset(swapPair);
  }, [swapPair, destAsset]);

  const flip = useCallback(() => {
    setSendAsset(destAsset);
    setDestAsset(sendAsset);
    setSendAmount("");
    Haptics.selectionAsync();
  }, [sendAsset, destAsset]);

  useEffect(() => {
    if (tx.status === "success") {
      const id = setTimeout(() => router.replace("/(tabs)"), 1500);
      return () => clearTimeout(id);
    }
  }, [tx.status, router]);

  // Apply a 1% slippage floor so the order doesn't fail under churn.
  const minDest = useMemo(() => {
    if (!path) return "0";
    const dest = Number(path.destAmount);
    if (!Number.isFinite(dest) || dest <= 0) return "0";
    return (dest * 0.99).toFixed(7);
  }, [path]);

  async function onSwap() {
    if (!walletAddress || !path || parsed <= 0 || insufficient) return;

    // Add the trustline first if we're swapping into an asset the
    // account doesn't trust yet. Two signed txs, but we surface them as
    // one user gesture.
    if (trustlineMissing && destAsset !== "XLM") {
      const result = await tx.run(
        () => buildAddTrustline(walletAddress, destAsset),
        { mode: "classic" },
      );
      if (!result.hash) return;
      setTrustlineMissing(false);
    }

    await tx.run(
      () =>
        buildSwap({
          source: walletAddress,
          sendAsset,
          sendAmount,
          destAsset,
          minDestAmount: minDest,
          path: path.path,
        }),
      { mode: "classic" },
    );
  }

  const submitting =
    tx.status === "building" ||
    tx.status === "signing" ||
    tx.status === "submitting" ||
    tx.status === "confirming";

  return (
    <Screen scrollable={false} topInset={0}>
      <NavBar title="Swap" onClose={() => router.back()} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 12 }}>
          {/* You pay */}
          <SwapPanel
            label="You pay"
            asset={sendAsset}
            onAssetChange={setSendAsset}
            value={sendAmount}
            onValueChange={setSendAmount}
            balance={userBalance}
            otherAsset={destAsset}
            editable
          />

          {/* Flip button */}
          <View style={{ alignItems: "center", marginVertical: -10, zIndex: 1 }}>
            <Pressable
              onPress={flip}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: t.bg2,
                borderWidth: 4,
                borderColor: t.bg0,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Icon name="refresh" size={16} stroke={2} color={t.fg} />
            </Pressable>
          </View>

          {/* You receive */}
          <SwapPanel
            label="You receive"
            asset={destAsset}
            onAssetChange={setDestAsset}
            value={path ? path.destAmount : ""}
            onValueChange={() => {}}
            balance={balances.find((b) => b.asset === destAsset)?.amount ?? 0}
            otherAsset={sendAsset}
            editable={false}
            placeholder={pathLoading ? "…" : "0.00"}
          />

          <View style={{ height: 16 }} />

          <Rate
            sendAsset={sendAsset}
            destAsset={destAsset}
            path={path}
            loading={pathLoading}
          />

          {trustlineMissing && destAsset !== "XLM" && (
            <View
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 12,
                backgroundColor: t.bg1,
                borderWidth: 1,
                borderColor: t.border,
                flexDirection: "row",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <Icon name="info" size={14} stroke={1.7} color={t.fg2} />
              <Text style={{ fontFamily: t.sans, fontSize: 12, color: t.fg2, flex: 1, lineHeight: 18 }}>
                Your account needs a {destAsset} trustline first. We&apos;ll
                add it in the same swap action.
              </Text>
            </View>
          )}

          {(pathError || insufficient || tx.error) && (
            <Text
              style={{
                fontFamily: t.sans,
                fontSize: 12,
                color: t.error,
                marginTop: 14,
                textAlign: "center",
              }}
            >
              {tx.error ??
                (insufficient
                  ? `Not enough ${sendAsset} — you have ${userBalance.toFixed(2)}.`
                  : pathError)}
            </Text>
          )}

          <View style={{ flex: 1 }} />

          <PrimaryButton
            onPress={onSwap}
            disabled={
              !walletAddress ||
              !path ||
              parsed <= 0 ||
              insufficient ||
              sendAsset === destAsset ||
              submitting
            }
            icon="refresh"
          >
            {submitting ? "Swapping…" : `Swap ${sendAsset} for ${destAsset}`}
          </PrimaryButton>
          <Text
            style={{
              fontFamily: t.sans,
              fontSize: 11,
              color: t.fg3,
              marginTop: 10,
              textAlign: "center",
            }}
          >
            Live rate from the Stellar testnet DEX · 1% slippage
          </Text>
        </View>
      </KeyboardAvoidingView>
      <LoadingOverlay visible={submitting} message={messageFor(tx.status)} />
    </Screen>
  );
}

function SwapPanel({
  label,
  asset,
  onAssetChange,
  value,
  onValueChange,
  balance,
  otherAsset,
  editable,
  placeholder = "0.00",
}: {
  label: string;
  asset: SupportedAsset;
  onAssetChange: (asset: SupportedAsset) => void;
  value: string;
  onValueChange: (v: string) => void;
  balance: number;
  otherAsset: SupportedAsset;
  editable: boolean;
  placeholder?: string;
}) {
  const t = useTheme();
  const choices = SUPPORTED_ASSETS.filter((a) => a !== otherAsset);
  return (
    <View
      style={{
        backgroundColor: t.bg1,
        borderWidth: 1,
        borderColor: t.border,
        borderRadius: 16,
        padding: 16,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Caption>{label}</Caption>
        <Text style={{ fontFamily: t.sans, fontSize: 11, color: t.fg3 }}>
          Balance: {balance.toFixed(2)} {asset}
        </Text>
      </View>
      <View style={{ height: 10 }} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <TextInput
          value={value}
          onChangeText={(v) => onValueChange(v.replace(/[^0-9.]/g, ""))}
          placeholder={placeholder}
          placeholderTextColor={t.fg3}
          editable={editable}
          keyboardType="decimal-pad"
          style={{
            flex: 1,
            fontFamily: t.sans,
            fontSize: 28,
            fontWeight: "700",
            color: editable ? t.fg : t.fg2,
            letterSpacing: -0.8,
            padding: 0,
          }}
        />
        <AssetPicker asset={asset} choices={choices} onChange={onAssetChange} />
      </View>
      {editable && balance > 0 && (
        <View style={{ flexDirection: "row", gap: 6, marginTop: 10 }}>
          <Chip label="25%" onPress={() => onValueChange((balance * 0.25).toFixed(2))} />
          <Chip label="50%" onPress={() => onValueChange((balance * 0.5).toFixed(2))} />
          <Chip label="MAX" onPress={() => onValueChange(balance.toFixed(2))} />
        </View>
      )}
    </View>
  );
}

function AssetPicker({
  asset,
  choices,
  onChange,
}: {
  asset: SupportedAsset;
  choices: readonly SupportedAsset[];
  onChange: (a: SupportedAsset) => void;
}) {
  const t = useTheme();
  // Tap cycles through the available choices; we keep the picker as a
  // single tappable pill to avoid the complexity of a modal sheet.
  const next = () => {
    const idx = choices.indexOf(asset);
    const nextAsset = choices[(idx + 1) % choices.length] ?? choices[0];
    if (nextAsset) onChange(nextAsset);
  };
  return (
    <Pressable
      onPress={next}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
        backgroundColor: t.bg2,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <AssetIcon symbol={asset} size={22} />
      <Text style={{ fontFamily: t.sans, fontSize: 14, fontWeight: "600", color: t.fg }}>
        {asset}
      </Text>
      <Icon name="chevron-right" size={12} stroke={2} color={t.fg3} />
    </Pressable>
  );
}

function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: t.bg2,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ fontFamily: t.sans, fontSize: 11, fontWeight: "600", color: t.fg2 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function Rate({
  sendAsset,
  destAsset,
  path,
  loading,
}: {
  sendAsset: SupportedAsset;
  destAsset: SupportedAsset;
  path: PaymentPath | null;
  loading: boolean;
}) {
  const t = useTheme();
  if (loading) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <ActivityIndicator color={t.fg3} />
        <Text style={{ fontFamily: t.sans, fontSize: 12, color: t.fg3 }}>
          Finding best price…
        </Text>
      </View>
    );
  }
  if (!path) return null;
  const send = Number(path.sourceAmount);
  const dest = Number(path.destAmount);
  if (!Number.isFinite(send) || !Number.isFinite(dest) || send <= 0) return null;
  const rate = dest / send;
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ fontFamily: t.sans, fontSize: 12, color: t.fg3 }}>Rate</Text>
      <Money size={12} weight="500" color={t.fg2}>
        {`1 ${sendAsset} ≈ ${rate.toFixed(4)} ${destAsset}`}
      </Money>
    </View>
  );
}

function messageFor(status: string) {
  switch (status) {
    case "building":
      return "Building swap…";
    case "signing":
      return "Signing on device";
    case "submitting":
      return "Submitting to Stellar…";
    case "confirming":
      return "Confirming on chain…";
    default:
      return "";
  }
}
