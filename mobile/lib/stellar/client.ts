import { Horizon, Networks, rpc } from "@stellar/stellar-sdk";

import { DEFAULT_RPC_URL, STELLAR_TESTNET_PASSPHRASE } from "@/lib/utils/constants";
import { AssetBalance, TxResult } from "@/lib/stellar/types";

export class StellarClient {
  private readonly horizon = new Horizon.Server("https://horizon-testnet.stellar.org");
  private readonly soroban = new rpc.Server(DEFAULT_RPC_URL);

  async getBalances(address: string): Promise<AssetBalance[]> {
    const account = await this.horizon.loadAccount(address);

    return account.balances.map((balance) => ({
      asset:
        balance.asset_type === "native"
          ? "XLM"
          : normalizeAssetCode("asset_code" in balance ? balance.asset_code : undefined),
      amount: Number(balance.balance),
      usdValue: Number(balance.balance),
      change24h: 0
    }));
  }

  async buildContractCall(): Promise<string> {
    return Promise.resolve("");
  }

  async submitViaLaunchtube(signedXdr: string): Promise<TxResult> {
    return {
      hash: signedXdr.slice(0, 64) || "pending",
      status: "pending"
    };
  }

  async pollTransaction(hash: string): Promise<TxResult> {
    const transaction = await this.soroban.getTransaction(hash);
    const status = transaction.status === "SUCCESS" ? "success" : "pending";

    return {
      hash,
      status,
      ledger: "latestLedger" in transaction ? transaction.latestLedger : undefined
    };
  }

  get networkPassphrase() {
    return Networks.TESTNET ?? STELLAR_TESTNET_PASSPHRASE;
  }
}

function normalizeAssetCode(assetCode: string | undefined): AssetBalance["asset"] {
  if (assetCode === "USDC" || assetCode === "EURC") {
    return assetCode;
  }

  return "XLM";
}
