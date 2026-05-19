#!/usr/bin/env bash
#
# Seed initial liquidity into each fixed-rate market. Run AFTER the protocol is
# initialized. Requires:
#   STELLAR_ACCOUNT      funded LP source account (must hold underlying USDC/EURC)
#   PESALO_USDC_SEED     underlying USDC to seed (default: 1000)
#   PESALO_EURC_SEED     underlying EURC to seed (default: 1000)

set -euo pipefail

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
  local label="$1" sy="$2" splitter="$3" market="$4" amount_raw="$5"

  echo "[seed] $label: $amount_raw stroops"
  echo "  → SY.deposit"
  invoke "$sy" deposit --from "$ADMIN" --amount "$amount_raw"
  local sy_minted="$amount_raw"
  echo "  → Splitter.mint $sy_minted"
  invoke "$splitter" mint --caller "$ADMIN" --sy_amount "$sy_minted"
  # add_liquidity expects sy_in + pt_in in *asset units* of the splitter token
  # ledger, which 1:1 mirrors what mint produced at py_index=1.0.
  echo "  → Market.add_liquidity sy=$sy_minted pt=$sy_minted"
  invoke "$market" add_liquidity \
    --caller "$ADMIN" --sy_in "$sy_minted" --pt_in "$sy_minted"
}

seed_market "USDC" "$USDC_SY" "$USDC_SPL" "$USDC_MKT" "$USDC_RAW"
seed_market "EURC" "$EURC_SY" "$EURC_SPL" "$EURC_MKT" "$EURC_RAW"

echo "[seed] complete"
