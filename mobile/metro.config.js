const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Honour package.json `exports`. @stellar/stellar-sdk v14/v15 publish their
// real ESM subpaths via the exports map (e.g. `./minimal`, `./minimal/rpc`,
// `./minimal/contract` — all the things passkey-kit destructures). We DON'T
// add the `browser` condition because the prebuilt browser bundle is a UMD
// that loses named exports.
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ["require", "react-native", "default"];

// External SSDs formatted as exFAT/FAT regenerate AppleDouble sidecars
// (`._foo.tsx`) on every macOS write. Block them or Metro tries to
// bundle them as real source — they're binary metadata and explode.
config.resolver.blockList = [/(^|\/)\._.*/];

// Node-core polyfills.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  url: require.resolve("url"),
  events: require.resolve("events"),
  http: require.resolve("stream-http"),
  https: require.resolve("https-browserify"),
  crypto: require.resolve("crypto-browserify"),
  stream: require.resolve("stream-browserify"),
  buffer: require.resolve("buffer"),
  process: require.resolve("process"),
  assert: require.resolve("assert"),
  zlib: require.resolve("browserify-zlib"),
  os: require.resolve("os-browserify/browser"),
  path: require.resolve("path-browserify"),
};

// Module-level redirects:
// (1) `@openzeppelin/relayer-plugin-channels` re-exports both ./client
//     (used by mobile) and ./plugin (server-side relayer code that
//     pulls in the full Stellar SDK and crashes at module-load in RN).
//     Redirect to a stub that only re-exports ./client.
// (2) Stellar SDK v14.x's `bindings/config.js` does
//     `require("../../package.json")` with a path that's wrong post-build
//     (fixed in v15, but passkey-kit pins v14.x). Provide a tiny stub
//     with the version field — that require is CLI-only and never hits
//     at runtime.
const ozRelayerStub = path.resolve(__dirname, "metro-stubs/oz-relayer-plugin-channels.js");
const stellarPackageStub = path.resolve(__dirname, "metro-stubs/stellar-sdk-package.json.js");
const previousResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "@openzeppelin/relayer-plugin-channels") {
    return { type: "sourceFile", filePath: ozRelayerStub };
  }
  if (
    moduleName === "../../package.json" &&
    context.originModulePath &&
    /stellar-sdk[^/]*\/lib\/[^/]+\/bindings\/config\.js$/.test(context.originModulePath)
  ) {
    return { type: "sourceFile", filePath: stellarPackageStub };
  }
  if (previousResolveRequest) {
    return previousResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
