import {
  Address,
  BASE_FEE,
  Contract,
  Horizon,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  xdr,
} from "@stellar/stellar-sdk";

import { submitSorobanCall } from "@/lib/stellar/channels";
import { stellarClient } from "@/lib/stellar/client";
import {
  ASSET_DECIMALS,
  CONTRACTS,
  DEFAULT_HORIZON_URL,
  SUPPORTED_ASSETS,
  SupportedAsset,
  getAssetContracts,
} from "@/lib/utils/constants";
import { signAuthEntryWithSession } from "@/lib/passkey/session";

const MIN_HUMAN_AMOUNT_BY_ASSET: Record<SupportedAsset, number> = {
  // Skip below this threshold to avoid burning fees on dust. Tunable.
  USDC: 0.01,
  EURC: 0.01,
  XLM: 0.1,
};

export type AutoEarnEvent =
  | { kind: "skipped"; reason: string }
  | { kind: "deposited"; asset: SupportedAsset; amount: number; hash: string }
  | { kind: "error"; asset?: SupportedAsset; error: Error };

export type AutoEarnSubscriber = (event: AutoEarnEvent) => void;

type WatcherHandle = {
  stop: () => void;
};

/// Subscribe to incoming asset transfers on `walletAddress` and silently
/// route them through Router.auto_deposit using the registered session key.
///
/// Returns a handle whose `.stop()` cleans up the underlying Horizon stream
/// (or polling timer if streaming isn't available).
export function watchIncomingDeposits(opts: {
  walletAddress: string;
  onEvent: AutoEarnSubscriber;
  /// When falsy, falls back to a 15-second polling cursor instead of SSE.
  /// Useful for environments where EventSource doesn't work (older RN).
  enableStream?: boolean;
}): WatcherHandle {
  if (!CONTRACTS.router) {
    opts.onEvent({ kind: "skipped", reason: "router-not-configured" });
    return { stop: () => {} };
  }

  const horizon = new Horizon.Server(DEFAULT_HORIZON_URL, { allowHttp: false });
  let stopped = false;
  let pollerHandle: ReturnType<typeof setInterval> | null = null;
  let streamClose: (() => void) | null = null;
  let cursor: string | undefined;

  const handle = async (op: Horizon.ServerApi.PaymentOperationRecord) => {
    if (stopped) return;
    if (op.type !== "payment") return;
    if (op.to !== opts.walletAddress) return;
    // Skip our own outbound payments.
    if (op.from === opts.walletAddress) return;

    const asset = classifyAsset(op);
    if (!asset) {
      opts.onEvent({ kind: "skipped", reason: `unsupported-asset:${op.asset_code ?? "native"}` });
      return;
    }
    const amount = Number(op.amount);
    if (!Number.isFinite(amount) || amount < MIN_HUMAN_AMOUNT_BY_ASSET[asset]) {
      opts.onEvent({ kind: "skipped", reason: `dust:${asset}:${op.amount}` });
      return;
    }

    try {
      const hash = await depositSilently({
        walletAddress: opts.walletAddress,
        asset,
        humanAmount: amount,
      });
      opts.onEvent({ kind: "deposited", asset, amount, hash });
    } catch (err) {
      opts.onEvent({
        kind: "error",
        asset,
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  };

  if (opts.enableStream !== false) {
    streamClose = horizon
      .payments()
      .forAccount(opts.walletAddress)
      .cursor("now")
      .stream({
        onmessage: (record) => {
          void handle(record as Horizon.ServerApi.PaymentOperationRecord);
        },
        onerror: (err) => {
          opts.onEvent({
            kind: "error",
            error: err instanceof Error ? err : new Error("Horizon stream error"),
          });
        },
      });
  } else {
    const tick = async () => {
      if (stopped) return;
      try {
        const page = await horizon
          .payments()
          .forAccount(opts.walletAddress)
          .cursor(cursor ?? "now")
          .order("asc")
          .limit(50)
          .call();
        for (const record of page.records) {
          await handle(record as Horizon.ServerApi.PaymentOperationRecord);
          cursor = record.paging_token;
        }
      } catch (err) {
        opts.onEvent({
          kind: "error",
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }
    };
    pollerHandle = setInterval(() => void tick(), 15_000);
    void tick();
  }

  return {
    stop: () => {
      stopped = true;
      if (pollerHandle) clearInterval(pollerHandle);
      if (streamClose) streamClose();
    },
  };
}

/// Build, sign with the session key, and submit an auto_deposit call.
/// Returns the Stellar transaction hash. Never prompts the user.
async function depositSilently(args: {
  walletAddress: string;
  asset: SupportedAsset;
  humanAmount: number;
}): Promise<string> {
  const c = getAssetContracts(args.asset);
  if (!c.sy || !c.underlying) {
    throw new Error(`${args.asset} adapter not configured`);
  }

  // Reuse the shared Soroban RPC client. The user's smart wallet is the
  // transaction source (every Soroban tx needs an account); Channels covers
  // the actual fee via its managed channel-account pool.
  const sorobanServer = stellarClient.soroban;
  const account = await sorobanServer.getAccount(args.walletAddress);
  const contract = new Contract(CONTRACTS.router);
  const raw = toRawAmount(args.asset, args.humanAmount);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: stellarClient.networkPassphrase,
  })
    .addOperation(
      contract.call(
        "auto_deposit",
        Address.fromString(args.walletAddress).toScVal(),
        Address.fromString(c.underlying).toScVal(),
        nativeToScVal(raw, { type: "i128" }),
        Address.fromString(c.sy).toScVal(),
      ),
    )
    .setTimeout(30)
    .build();

  const sim = await sorobanServer.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`auto_deposit simulation failed: ${sim.error}`);
  }
  const assembled = rpc.assembleTransaction(tx, sim).build();
  const op = assembled.operations[0];
  if (op.type !== "invokeHostFunction") {
    throw new Error(`Expected invokeHostFunction op, got ${op.type}`);
  }

  // Sign every required auth entry with the session key. The smart wallet's
  // __check_auth verifies these against its registered signers — the session
  // key was added with a scope limited to Router.auto_deposit / auto_withdraw,
  // so anything else gets rejected at the wallet layer.
  const validUntil = sim.latestLedger + 100;
  const signedAuth = await Promise.all(
    (op.auth ?? []).map(async (entry) => {
      if (entry.credentials().switch().name === "sorobanCredentialsSourceAccount") {
        // Source-account auth doesn't need a signature.
        return entry;
      }
      return signAuthEntryWithSession(entry, validUntil, stellarClient.networkPassphrase);
    }),
  );

  const funcXdr = op.func.toXDR("base64");
  const authXdrs = signedAuth.map((e) => e.toXDR("base64"));
  const receipt = await submitSorobanCall({ func: funcXdr, auth: authXdrs });
  if (!receipt.hash) {
    throw new Error(`Channels returned no hash (status=${receipt.status ?? "?"})`);
  }
  return receipt.hash;
}

function classifyAsset(
  op: Horizon.ServerApi.PaymentOperationRecord,
): SupportedAsset | null {
  if (op.asset_type === "native") return "XLM";
  if (op.asset_type === "credit_alphanum4" || op.asset_type === "credit_alphanum12") {
    if (op.asset_code === "USDC" || op.asset_code === "EURC") return op.asset_code;
  }
  return null;
}

function toRawAmount(asset: SupportedAsset, human: number): bigint {
  // Re-implement the conversion locally so we don't pull in the contract
  // builders (this module is self-contained).
  const decimals = ASSET_DECIMALS[asset];
  const fixed = human.toFixed(decimals);
  const [int, frac = ""] = fixed.split(".");
  const padded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(int || "0") * 10n ** BigInt(decimals) + BigInt(padded || "0");
}

// Hidden compile-time guard: keeps the SUPPORTED_ASSETS import used so the
// constants module gets pulled in (we rely on its env-var side effects too).
void SUPPORTED_ASSETS;
