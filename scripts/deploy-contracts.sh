#!/usr/bin/env bash
#
# Build, install, and deploy every Pesalo contract to the configured network.
# Output: contracts/.deployed.json with WASM hashes and contract IDs.
#
# Required env:
#   STELLAR_ACCOUNT     funded source account known to the Stellar CLI
#   SOROBAN_NETWORK     network alias (default: testnet)
#
# Required tools: stellar CLI, jq, rustup (with wasm32 target).

set -euo pipefail

# Force rustup-managed toolchain (which has the wasm32-unknown-unknown std
# libraries). Homebrew's rust ships a rustc without those libraries pre-
# installed and the build silently picks it up if it appears first in PATH.
if [[ -d "$HOME/.cargo/bin" ]]; then
  export PATH="$HOME/.cargo/bin:$PATH"
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACTS_DIR="$ROOT_DIR/contracts"
DEPLOYED_FILE="$CONTRACTS_DIR/.deployed.json"
DEPLOYER_ENV="$CONTRACTS_DIR/.deployer.env"
ASSETS_ENV="$CONTRACTS_DIR/.assets.env"

# Auto-source deployer + test asset envs.
if [[ -f "$DEPLOYER_ENV" ]]; then
  # shellcheck disable=SC1090
  source "$DEPLOYER_ENV"
fi
if [[ -f "$ASSETS_ENV" ]]; then
  # shellcheck disable=SC1090
  source "$ASSETS_ENV"
fi

NETWORK="${SOROBAN_NETWORK:-testnet}"
SOURCE_ACCOUNT="${STELLAR_ACCOUNT:-}"

if [[ -z "$SOURCE_ACCOUNT" ]]; then
  echo "STELLAR_ACCOUNT not set. Run ./scripts/create-deployer-wallet.sh first." >&2
  exit 1
fi

for tool in stellar jq cargo rustup; do
  command -v "$tool" >/dev/null 2>&1 || { echo "missing required tool: $tool" >&2; exit 1; }
done

cd "$CONTRACTS_DIR"
# Soroban requires the wasm32v1-none target (no reference-types extension).
rustup target add wasm32v1-none >/dev/null 2>&1 || true
stellar contract build --profile release

upload_crate() {
  local crate="$1"
  local wasm_name
  wasm_name="$(echo "$crate" | tr '-' '_')"
  local wasm_path="$CONTRACTS_DIR/target/wasm32v1-none/release/${wasm_name}.wasm"
  if [[ ! -f "$wasm_path" ]]; then
    echo "WASM not found for $crate at $wasm_path" >&2
    exit 1
  fi
  local hash
  hash=$(stellar contract upload \
    --wasm "$wasm_path" \
    --source-account "$SOURCE_ACCOUNT" \
    --network "$NETWORK" 2>/dev/null | tail -1)
  echo "[deploy] uploaded $crate → $hash" >&2
  echo "$hash"
}

# Upload each WASM. Idempotent — content-addressed by hash.
ADAPTER_HASH=$(upload_crate "blend-sy-adapter")
SPLITTER_HASH=$(upload_crate "splitter")
MARKET_HASH=$(upload_crate "yield-market")
ROUTER_HASH=$(upload_crate "router")

# Deploy the contract instances we need. Counts:
#   - 3 BlendSY adapters (USDC, EURC, XLM)
#   - 2 Splitters (USDC, EURC)
#   - 2 YieldMarkets (USDC, EURC)
#   - 1 Router
deploy_instance() {
  local label="$1" hash="$2"
  local cid
  cid=$(stellar contract deploy \
    --wasm-hash "$hash" \
    --source-account "$SOURCE_ACCOUNT" \
    --network "$NETWORK" 2>/dev/null | tail -1)
  echo "[deploy] $label → $cid" >&2
  echo "$cid"
}

USDC_SY=$(deploy_instance "usdc-sy" "$ADAPTER_HASH")
EURC_SY=$(deploy_instance "eurc-sy" "$ADAPTER_HASH")
XLM_SY=$(deploy_instance "xlm-sy"  "$ADAPTER_HASH")
USDC_SPLITTER=$(deploy_instance "usdc-splitter" "$SPLITTER_HASH")
EURC_SPLITTER=$(deploy_instance "eurc-splitter" "$SPLITTER_HASH")
USDC_MARKET=$(deploy_instance "usdc-market" "$MARKET_HASH")
EURC_MARKET=$(deploy_instance "eurc-market" "$MARKET_HASH")
ROUTER=$(deploy_instance "router" "$ROUTER_HASH")

# Resolve canonical SAC IDs for the testnet assets we accept.
USDC_ASSET="${USDC_ASSET_CONTRACT_ID:-}"
EURC_ASSET="${EURC_ASSET_CONTRACT_ID:-}"
if [[ -z "$USDC_ASSET" || -z "$EURC_ASSET" ]]; then
  echo "Provide USDC_ASSET_CONTRACT_ID and EURC_ASSET_CONTRACT_ID for the issuing asset SAC IDs." >&2
  exit 1
fi
# Native XLM SAC has a well-known address per network.
XLM_SAC=$(stellar contract id asset --asset native --network "$NETWORK" 2>&1 | tail -1)

cat > "$DEPLOYED_FILE" <<JSON
{
  "network": "$NETWORK",
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "wasmHashes": {
    "blendSyAdapter": "$ADAPTER_HASH",
    "splitter": "$SPLITTER_HASH",
    "yieldMarket": "$MARKET_HASH",
    "router": "$ROUTER_HASH"
  },
  "contracts": {
    "router": "$ROUTER",
    "usdcSy": "$USDC_SY",
    "eurcSy": "$EURC_SY",
    "xlmSy":  "$XLM_SY",
    "usdcSplitter": "$USDC_SPLITTER",
    "eurcSplitter": "$EURC_SPLITTER",
    "usdcMarket": "$USDC_MARKET",
    "eurcMarket": "$EURC_MARKET",
    "usdcAsset": "$USDC_ASSET",
    "eurcAsset": "$EURC_ASSET",
    "xlmAsset":  "$XLM_SAC"
  }
}
JSON

echo "[deploy] wrote $DEPLOYED_FILE"
