import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  TransactionBuilder,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";

import { config } from "../config";

const STUB_ACCOUNT = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

const server = new rpc.Server(config.sorobanRpcUrl, { allowHttp: false });

/// Read-only Soroban invocation. Builds a transaction the SDK can serialize,
/// asks the RPC node to simulate it, and decodes the return value to a native
/// JS type.
export async function readContract<T>(
  contractId: string,
  method: string,
  args: xdr.ScVal[] = [],
): Promise<T> {
  const contract = new Contract(contractId);
  const account = new Account(STUB_ACCOUNT, "0");
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Soroban simulation failed for ${method}: ${sim.error}`);
  }
  if (!sim.result?.retval) {
    throw new Error(`Soroban call ${method} returned no value`);
  }
  return scValToNative(sim.result.retval) as T;
}

export function addr(value: string): xdr.ScVal {
  return Address.fromString(value).toScVal();
}

export { server as sorobanServer };
