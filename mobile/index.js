// Pesalo entry. Runs Node-core polyfills before Expo Router scans the
// file system, so when route components synchronously import stellar-sdk
// (e.g. lib/stellar/client.ts calling `Keypair.random()` at module
// load), the required globals (`crypto.getRandomValues`, `Buffer`,
// `process`, `URL`) already exist.

import "react-native-get-random-values";
import "react-native-url-polyfill/auto";

import { Buffer } from "buffer";
import process from "process";

if (typeof global.Buffer === "undefined") global.Buffer = Buffer;
if (typeof global.process === "undefined") global.process = process;
if (!global.process.env) global.process.env = {};
if (!global.process.env.NODE_ENV) {
  global.process.env.NODE_ENV = typeof __DEV__ !== "undefined" && __DEV__ ? "development" : "production";
}

require("expo-router/entry");
