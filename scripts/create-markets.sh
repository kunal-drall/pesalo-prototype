#!/usr/bin/env bash
set -euo pipefail

ASSETS="${PESALO_MARKET_ASSETS:-USDC,EURC}"
MATURITY_DAYS="${PESALO_MARKET_DAYS:-90}"

IFS="," read -ra asset_list <<< "$ASSETS"
for asset in "${asset_list[@]}"; do
  echo "market=$asset term_days=$MATURITY_DAYS"
done
