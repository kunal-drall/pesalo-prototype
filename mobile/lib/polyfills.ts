/// Bootstraps Node-core globals that the Stellar SDK + passkey-kit assume
/// exist. Must be imported *before* any code that touches @stellar/stellar-sdk.

import "react-native-get-random-values";
import "react-native-url-polyfill/auto";

import { Buffer } from "buffer";
import process from "process";

// Install on every global the JS runtime might check. RN's Hermes engine
// uses `globalThis`; some bundles look for `global` (Node) or `window`.
const targets: Record<string, unknown>[] = [globalThis as unknown as Record<string, unknown>];
const maybeGlobal = (globalThis as { global?: unknown }).global;
if (maybeGlobal && maybeGlobal !== globalThis) {
  targets.push(maybeGlobal as Record<string, unknown>);
}

for (const t of targets) {
  if (!t.Buffer) t.Buffer = Buffer;
  if (!t.process) t.process = process;
}

// Some libraries check `process.env.NODE_ENV` at module-load. Make sure
// it's set so they don't NPE on `process.env.NODE_ENV.toLowerCase()`.
if (!process.env.NODE_ENV) {
  // @ts-expect-error NodeJS.ProcessEnv is typed read-only-ish
  process.env.NODE_ENV = __DEV__ ? "development" : "production";
}
