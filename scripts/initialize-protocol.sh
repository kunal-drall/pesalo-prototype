#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOYED_FILE="$ROOT_DIR/contracts/.deployed.json"

if [[ ! -f "$DEPLOYED_FILE" ]]; then
  echo "Run scripts/deploy-contracts.sh first so contract IDs are available." >&2
  exit 1
fi

node -e "const deployed=require(process.argv[1]); console.log(JSON.stringify({network:deployed.network, initializedAt:new Date().toISOString(), contracts:Object.keys(deployed.contracts)}, null, 2));" "$DEPLOYED_FILE"
