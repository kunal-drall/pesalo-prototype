#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACTS_DIR="$ROOT_DIR/contracts"
DEPLOYED_FILE="$CONTRACTS_DIR/.deployed.json"
NETWORK="${SOROBAN_NETWORK:-testnet}"
SOURCE_ACCOUNT="${STELLAR_ACCOUNT:-}"

if [[ -z "$SOURCE_ACCOUNT" ]]; then
  echo "STELLAR_ACCOUNT must name the funded Stellar CLI account used for deployments." >&2
  exit 1
fi

if ! command -v stellar >/dev/null 2>&1; then
  echo "The Stellar CLI is required. Install it before deploying contracts." >&2
  exit 1
fi

cd "$CONTRACTS_DIR"
rustup target add wasm32-unknown-unknown >/dev/null
cargo build --release --target wasm32-unknown-unknown

contracts=(
  "blend-sy-adapter:blend_sy_adapter"
  "splitter:splitter"
  "yield-market:yield_market"
  "router:router"
)

printf '{\n  "network": "%s",\n  "contracts": {\n' "$NETWORK" > "$DEPLOYED_FILE"

for index in "${!contracts[@]}"; do
  IFS=":" read -r crate wasm <<< "${contracts[$index]}"
  wasm_path="$CONTRACTS_DIR/target/wasm32-unknown-unknown/release/${wasm}.wasm"
  contract_id="$(stellar contract deploy \
    --wasm "$wasm_path" \
    --source-account "$SOURCE_ACCOUNT" \
    --network "$NETWORK")"

  comma=","
  if [[ "$index" -eq "$((${#contracts[@]} - 1))" ]]; then
    comma=""
  fi
  printf '    "%s": "%s"%s\n' "$crate" "$contract_id" "$comma" >> "$DEPLOYED_FILE"
done

printf '  }\n}\n' >> "$DEPLOYED_FILE"
echo "Deployment addresses written to $DEPLOYED_FILE"
