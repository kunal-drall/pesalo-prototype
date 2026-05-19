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

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACTS_DIR="$ROOT_DIR/contracts"
DEPLOYED_FILE="$CONTRACTS_DIR/.deployed.json"
DEPLOYER_ENV="$CONTRACTS_DIR/.deployer.env"

# Auto-source deployer env produced by create-deployer-wallet.sh.
if [[ -f "$DEPLOYER_ENV" ]]; then
  # shellcheck disable=SC1090
  source "$DEPLOYER_ENV"
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
rustup target add wasm32-unknown-unknown >/dev/null
cargo build --release --target wasm32-unknown-unknown

declare -a CRATES=(blend-sy-adapter splitter yield-market router)
declare -A WASM_HASH
declare -A CONTRACT_ID

# Install (upload) every WASM first so they can be redeployed without
# re-uploading. The hash is content-addressed so re-running is idempotent.
for crate in "${CRATES[@]}"; do
  wasm_name="$(echo "$crate" | tr '-' '_')"
  wasm_path="$CONTRACTS_DIR/target/wasm32-unknown-unknown/release/${wasm_name}.wasm"
  if [[ ! -f "$wasm_path" ]]; then
    echo "WASM not found for $crate at $wasm_path" >&2
    exit 1
  fi
  hash=$(stellar contract upload \
    --wasm "$wasm_path" \
    --source-account "$SOURCE_ACCOUNT" \
    --network "$NETWORK")
  WASM_HASH[$crate]="$hash"
  echo "[deploy] uploaded $crate → $hash"
done

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
    --network "$NETWORK")
  echo "[deploy] $label → $cid"
  echo "$cid"
}

USDC_SY=$(deploy_instance "usdc-sy" "${WASM_HASH[blend-sy-adapter]}")
EURC_SY=$(deploy_instance "eurc-sy" "${WASM_HASH[blend-sy-adapter]}")
XLM_SY=$(deploy_instance "xlm-sy"  "${WASM_HASH[blend-sy-adapter]}")
USDC_SPLITTER=$(deploy_instance "usdc-splitter" "${WASM_HASH[splitter]}")
EURC_SPLITTER=$(deploy_instance "eurc-splitter" "${WASM_HASH[splitter]}")
USDC_MARKET=$(deploy_instance "usdc-market" "${WASM_HASH[yield-market]}")
EURC_MARKET=$(deploy_instance "eurc-market" "${WASM_HASH[yield-market]}")
ROUTER=$(deploy_instance "router" "${WASM_HASH[router]}")

# Resolve canonical SAC IDs for the testnet assets we accept.
USDC_ASSET="${USDC_ASSET_CONTRACT_ID:-}"
EURC_ASSET="${EURC_ASSET_CONTRACT_ID:-}"
if [[ -z "$USDC_ASSET" || -z "$EURC_ASSET" ]]; then
  echo "Provide USDC_ASSET_CONTRACT_ID and EURC_ASSET_CONTRACT_ID for the issuing asset SAC IDs." >&2
  exit 1
fi
# Native XLM SAC has a well-known address per network.
XLM_SAC=$(stellar contract id asset --asset native --network "$NETWORK")

cat > "$DEPLOYED_FILE" <<JSON
{
  "network": "$NETWORK",
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "wasmHashes": {
    "blendSyAdapter": "${WASM_HASH[blend-sy-adapter]}",
    "splitter": "${WASM_HASH[splitter]}",
    "yieldMarket": "${WASM_HASH[yield-market]}",
    "router": "${WASM_HASH[router]}"
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
