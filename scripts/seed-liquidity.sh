#!/usr/bin/env bash
set -euo pipefail

USDC_SEED="${PESALO_USDC_SEED:-10000}"
EURC_SEED="${PESALO_EURC_SEED:-10000}"

echo "asset=USDC seed_amount=$USDC_SEED"
echo "asset=EURC seed_amount=$EURC_SEED"
