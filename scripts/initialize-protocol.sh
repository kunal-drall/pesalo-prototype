#!/usr/bin/env bash
#
# After scripts/deploy-contracts.sh succeeds, call initialize() on every
# Pesalo contract so they reference each other correctly. Idempotent: an
# already-initialized contract surfaces a clear error and the script exits.
#
# Required env:
#   STELLAR_ACCOUNT      funded source account
#   SOROBAN_NETWORK      network alias (default: testnet)
#   PROTOCOL_ADMIN       address that will hold admin powers (default: STELLAR_ACCOUNT)
#   MATURITY_UNIX        epoch seconds for the next maturity (default: 90 days from now)

set -euo pipefail

# Use rustup-managed toolchain consistently with deploy-contracts.sh.
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
ADMIN_ADDRESS="${PROTOCOL_ADMIN:-${DEPLOYER_ADDRESS:-}}"

if [[ -z "$SOURCE_ACCOUNT" ]]; then
  echo "STELLAR_ACCOUNT not set. Run ./scripts/create-deployer-wallet.sh first." >&2; exit 1
fi
if [[ -z "$ADMIN_ADDRESS" ]]; then
  echo "PROTOCOL_ADMIN (or DEPLOYER_ADDRESS) not set." >&2; exit 1
fi
if [[ ! -f "$DEPLOYED_FILE" ]]; then
  echo "Run scripts/deploy-contracts.sh first." >&2; exit 1
fi

for tool in stellar jq python3; do
  command -v "$tool" >/dev/null 2>&1 || { echo "missing required tool: $tool" >&2; exit 1; }
done

MATURITY="${MATURITY_UNIX:-$(python3 -c 'import time; print(int(time.time()) + 90*86400)')}"

# Read contract IDs.
ROUTER=$(jq -r '.contracts.router' "$DEPLOYED_FILE")
USDC_SY=$(jq -r '.contracts.usdcSy' "$DEPLOYED_FILE")
EURC_SY=$(jq -r '.contracts.eurcSy' "$DEPLOYED_FILE")
XLM_SY=$(jq -r '.contracts.xlmSy' "$DEPLOYED_FILE")
USDC_SPL=$(jq -r '.contracts.usdcSplitter' "$DEPLOYED_FILE")
EURC_SPL=$(jq -r '.contracts.eurcSplitter' "$DEPLOYED_FILE")
USDC_MKT=$(jq -r '.contracts.usdcMarket' "$DEPLOYED_FILE")
EURC_MKT=$(jq -r '.contracts.eurcMarket' "$DEPLOYED_FILE")
USDC_ASSET=$(jq -r '.contracts.usdcAsset' "$DEPLOYED_FILE")
EURC_ASSET=$(jq -r '.contracts.eurcAsset' "$DEPLOYED_FILE")
XLM_ASSET=$(jq -r '.contracts.xlmAsset' "$DEPLOYED_FILE")

invoke() {
  # Tolerate AlreadyInitialized (#1) and the typical "minter already set"
  # noise so the script is safe to re-run after a transient failure.
  local id="$1"
  shift
  local output
  if output=$(stellar contract invoke \
    --id "$id" \
    --source-account "$SOURCE_ACCOUNT" \
    --network "$NETWORK" \
    -- "$@" 2>&1); then
    return 0
  fi
  if echo "$output" | grep -qE "AlreadyInitialized|Error\(Contract, #1\)"; then
    echo "[init] (skip — already initialized: $id $*)" >&2
    return 0
  fi
  echo "$output" >&2
  return 1
}

# 1. Initialize SY adapters.
echo "[init] BlendSY adapters"
invoke "$USDC_SY" initialize \
  --admin "$ADMIN_ADDRESS" \
  --underlying "$USDC_ASSET" \
  --decimals 7 \
  --name "Pesalo SY-bUSDC" --symbol "SYbUSDC"
invoke "$EURC_SY" initialize \
  --admin "$ADMIN_ADDRESS" \
  --underlying "$EURC_ASSET" \
  --decimals 7 \
  --name "Pesalo SY-bEURC" --symbol "SYbEURC"
invoke "$XLM_SY" initialize \
  --admin "$ADMIN_ADDRESS" \
  --underlying "$XLM_ASSET" \
  --decimals 7 \
  --name "Pesalo SY-bXLM" --symbol "SYbXLM"

# 2. Initialize splitters.
echo "[init] splitters"
invoke "$USDC_SPL" initialize \
  --admin "$ADMIN_ADDRESS" \
  --sy_token "$USDC_SY" \
  --maturity "$MATURITY" \
  --decimals 7 \
  --pt_name "Pesalo PT-bUSDC" --pt_symbol "PT-bUSDC" \
  --yt_name "Pesalo YT-bUSDC" --yt_symbol "YT-bUSDC"
invoke "$EURC_SPL" initialize \
  --admin "$ADMIN_ADDRESS" \
  --sy_token "$EURC_SY" \
  --maturity "$MATURITY" \
  --decimals 7 \
  --pt_name "Pesalo PT-bEURC" --pt_symbol "PT-bEURC" \
  --yt_name "Pesalo YT-bEURC" --yt_symbol "YT-bEURC"

# 3. Initialize markets.
SCALAR_ROOT_USDC="80000000000000000000"      # 80 * WAD
SCALAR_ROOT_EURC="150000000000000000000"     # 150 * WAD
FEE_ROOT="1000000000000000"                  # 0.001 * WAD = 10 bps
ANCHOR_USDC="1025000000000000000"            # 1.025 * WAD
ANCHOR_EURC="1015000000000000000"            # 1.015 * WAD

echo "[init] yield markets"
invoke "$USDC_MKT" initialize \
  --admin "$ADMIN_ADDRESS" \
  --sy_token "$USDC_SY" \
  --splitter "$USDC_SPL" \
  --maturity "$MATURITY" \
  --scalar_root "$SCALAR_ROOT_USDC" \
  --fee_rate_root "$FEE_ROOT" \
  --anchor_init "$ANCHOR_USDC"
invoke "$EURC_MKT" initialize \
  --admin "$ADMIN_ADDRESS" \
  --sy_token "$EURC_SY" \
  --splitter "$EURC_SPL" \
  --maturity "$MATURITY" \
  --scalar_root "$SCALAR_ROOT_EURC" \
  --fee_rate_root "$FEE_ROOT" \
  --anchor_init "$ANCHOR_EURC"

# 4. Authorize markets + router as splitter minters.
echo "[init] grant minter to markets + router"
invoke "$USDC_SPL" set_minter --minter "$USDC_MKT" --enabled true
invoke "$EURC_SPL" set_minter --minter "$EURC_MKT" --enabled true
invoke "$USDC_SPL" set_minter --minter "$ROUTER" --enabled true
invoke "$EURC_SPL" set_minter --minter "$ROUTER" --enabled true

# 5. Initialize router.
echo "[init] router"
invoke "$ROUTER" initialize --admin "$ADMIN_ADDRESS"

echo "[init] complete — write env file for downstream consumers"

ENV_FILE="$ROOT_DIR/contracts/.deployed.env"
{
  echo "# Generated by scripts/initialize-protocol.sh"
  echo "ROUTER_CONTRACT_ID=$ROUTER"
  echo "USDC_MARKET_CONTRACT_ID=$USDC_MKT"
  echo "EURC_MARKET_CONTRACT_ID=$EURC_MKT"
  echo "USDC_SPLITTER_CONTRACT_ID=$USDC_SPL"
  echo "EURC_SPLITTER_CONTRACT_ID=$EURC_SPL"
  echo "USDC_SY_CONTRACT_ID=$USDC_SY"
  echo "EURC_SY_CONTRACT_ID=$EURC_SY"
  echo "XLM_SY_CONTRACT_ID=$XLM_SY"
  echo "USDC_ASSET_CONTRACT_ID=$USDC_ASSET"
  echo "EURC_ASSET_CONTRACT_ID=$EURC_ASSET"
  echo "XLM_ASSET_CONTRACT_ID=$XLM_ASSET"
  echo "MATURITY_UNIX=$MATURITY"
  echo "SOROBAN_RPC_URL=https://soroban-testnet.stellar.org"
  echo "HORIZON_URL=https://horizon-testnet.stellar.org"
} > "$ENV_FILE"

echo "[init] wrote $ENV_FILE"
