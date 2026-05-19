#!/usr/bin/env bash
#
# Seed initial liquidity into each fixed-rate market. Run AFTER the protocol is
# initialized. Requires:
#   STELLAR_ACCOUNT      funded LP source account (must hold underlying USDC/EURC)
#   PESALO_USDC_SEED     underlying USDC to seed (default: 1000)
#   PESALO_EURC_SEED     underlying EURC to seed (default: 1000)

set -euo pipefail

if [[ -d "$HOME/.cargo/bin" ]]; then
  export PATH="$HOME/.cargo/bin:$PATH"
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOYED_FILE="$ROOT_DIR/contracts/.deployed.json"
DEPLOYER_ENV="$ROOT_DIR/contracts/.deployer.env"

if [[ -f "$DEPLOYER_ENV" ]]; then
  # shellcheck disable=SC1090
  source "$DEPLOYER_ENV"
fi

NETWORK="${SOROBAN_NETWORK:-testnet}"
SOURCE_ACCOUNT="${STELLAR_ACCOUNT:-}"

USDC_SEED="${PESALO_USDC_SEED:-1000}"
EURC_SEED="${PESALO_EURC_SEED:-1000}"

if [[ -z "$SOURCE_ACCOUNT" ]]; then
  echo "STELLAR_ACCOUNT must be set." >&2; exit 1
fi
if [[ ! -f "$DEPLOYED_FILE" ]]; then
  echo "Run scripts/deploy-contracts.sh + initialize-protocol.sh first." >&2; exit 1
fi

USDC_SY=$(jq -r '.contracts.usdcSy' "$DEPLOYED_FILE")
EURC_SY=$(jq -r '.contracts.eurcSy' "$DEPLOYED_FILE")
USDC_SPL=$(jq -r '.contracts.usdcSplitter' "$DEPLOYED_FILE")
EURC_SPL=$(jq -r '.contracts.eurcSplitter' "$DEPLOYED_FILE")
USDC_MKT=$(jq -r '.contracts.usdcMarket' "$DEPLOYED_FILE")
EURC_MKT=$(jq -r '.contracts.eurcMarket' "$DEPLOYED_FILE")

invoke() {
  stellar contract invoke \
    --id "$1" \
    --source-account "$SOURCE_ACCOUNT" \
    --network "$NETWORK" \
    -- "${@:2}"
}

# Convert human → 7-decimal stroops.
to_raw() {
  awk -v amt="$1" 'BEGIN { printf "%d", amt * 10000000 }'
}

USDC_RAW=$(to_raw "$USDC_SEED")
EURC_RAW=$(to_raw "$EURC_SEED")

ADMIN="$SOURCE_ACCOUNT"

seed_market() {
  local label="$1" sy="$2" splitter="$3" market="$4" half_raw="$5"

  # We deposit 2X underlying so we end up with X SY + X PT after splitting:
  #   2X USDC → 2X SY (via adapter)
  #   X SY → X PT + X YT (split)
  #   leftover: X SY + X PT  → seeds market 50/50
  local total_raw
  total_raw=$(awk -v a="$half_raw" 'BEGIN { printf "%d", a * 2 }')

  echo "[seed] $label: depositing $total_raw underlying"
  invoke "$sy" deposit --from "$ADMIN" --amount "$total_raw"

  echo "[seed] $label: splitting half ($half_raw SY) into PT+YT"
  invoke "$splitter" mint --caller "$ADMIN" --sy_amount "$half_raw"

  echo "[seed] $label: add_liquidity sy=$half_raw pt=$half_raw"
  invoke "$market" add_liquidity \
    --caller "$ADMIN" --sy_in "$half_raw" --pt_in "$half_raw"
}

seed_market "USDC" "$USDC_SY" "$USDC_SPL" "$USDC_MKT" "$USDC_RAW"
seed_market "EURC" "$EURC_SY" "$EURC_SPL" "$EURC_MKT" "$EURC_RAW"

echo "[seed] complete"
