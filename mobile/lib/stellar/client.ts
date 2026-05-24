import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Horizon,
  Keypair,
  Networks,
  TransactionBuilder,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";

// Throwaway but strkey-valid G-address used only as the source for
// read-only Soroban simulations. We never sign or submit with it.
const SIMULATION_STUB = Keypair.random().publicKey();

import {
  DEFAULT_HORIZON_URL,
  DEFAULT_RPC_URL,
  STELLAR_TESTNET_PASSPHRASE,
} from "@/lib/utils/constants";
import { AssetBalance, TxResult } from "@/lib/stellar/types";

/// Thin wrapper around Soroban RPC + Horizon. All transaction building goes
/// through `buildContractCall` so the rest of the app never touches XDR
/// directly. Submission flows through Launchtube (see launchtube.ts) so
/// users do not need to fund their wallet with XLM for fees.
export class StellarClient {
  readonly horizon = new Horizon.Server(DEFAULT_HORIZON_URL, { allowHttp: false });
  readonly soroban = new rpc.Server(DEFAULT_RPC_URL, { allowHttp: false });

  get networkPassphrase(): string {
    return Networks.TESTNET ?? STELLAR_TESTNET_PASSPHRASE;
  }

  /// Loads classic balances from Horizon and folds them into our app's asset
  /// shape. USD value is computed by the caller using fresh price data.
  async getBalances(address: string): Promise<AssetBalance[]> {
    let account;
    try {
      account = await this.horizon.loadAccount(address);
    } catch (err) {
      // A newly-deployed passkey wallet has no Horizon account record yet:
      // return zero balances rather than surfacing a 404 to the UI.
      if (isNotFound(err)) {
        return [];
      }
      throw err;
    }

    return account.balances
      .map(toAssetBalance)
      .filter((b): b is AssetBalance => b !== null);
  }

  /// Read a raw SY/Splitter/Market balance via Soroban RPC.
  /// Simulates a `balance(addr)` invocation against the given contract.
  async readContractBalance(contractId: string, holder: string): Promise<bigint> {
    return this.readContract<bigint>(contractId, "balance", [
      Address.fromString(holder).toScVal(),
    ]);
  }

  async readContract<T>(
    contractId: string,
    method: string,
    args: xdr.ScVal[] = [],
    sourceAddress?: string,
  ): Promise<T> {
    const contract = new Contract(contractId);
    const stub = sourceAddress ?? SIMULATION_STUB;
    const account = new Account(stub, "0");
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();

    const sim = await this.soroban.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
      throw new Error(`Soroban simulation failed: ${sim.error}`);
    }
    if (!sim.result?.retval) {
      throw new Error(`Soroban call ${method} returned no value`);
    }
    return scValToNative(sim.result.retval) as T;
  }

  /// Build, simulate, and assemble an authorized contract call.
  /// Returns the unsigned XDR ready to be passed to passkey-kit for signing.
  async buildContractCall(params: {
    source: string;
    contractId: string;
    method: string;
    args: xdr.ScVal[];
  }): Promise<string> {
    const account = await this.soroban.getAccount(params.source);
    const contract = new Contract(params.contractId);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call(params.method, ...params.args))
      .setTimeout(180)
      .build();

    const sim = await this.soroban.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
      throw new Error(`Soroban simulation failed: ${sim.error}`);
    }
    const assembled = rpc.assembleTransaction(tx, sim).build();
    return assembled.toXDR();
  }

  /// Poll Soroban RPC for a transaction's final status. Resolves on SUCCESS,
  /// rejects on FAILED, times out after `maxAttempts * intervalMs`.
  async pollTransaction(
    hash: string,
    { intervalMs = 1000, maxAttempts = 30 }: { intervalMs?: number; maxAttempts?: number } = {},
  ): Promise<TxResult> {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const result = await this.soroban.getTransaction(hash);
      if (result.status === "SUCCESS") {
        return {
          hash,
          status: "success",
          ledger: "ledger" in result ? Number(result.ledger) : undefined,
        };
      }
      if (result.status === "FAILED") {
        return { hash, status: "failed" };
      }
      await sleep(intervalMs);
    }
    return { hash, status: "pending" };
  }
}

function toAssetBalance(balance: Horizon.HorizonApi.BalanceLine): AssetBalance | null {
  if (balance.asset_type === "native") {
    return { asset: "XLM", amount: Number(balance.balance), usdValue: 0 };
  }
  if (
    balance.asset_type === "credit_alphanum4" ||
    balance.asset_type === "credit_alphanum12"
  ) {
    const code = balance.asset_code;
    if (code !== "USDC" && code !== "EURC") {
      return null;
    }
    return { asset: code, amount: Number(balance.balance), usdValue: 0 };
  }
  return null;
}

function isNotFound(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = (err as { response?: { status?: number } }).response?.status;
  return status === 404;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const stellarClient = new StellarClient();
