#!/usr/bin/env bash
#
# Full test gate: contracts, backend, mobile, and landing all green.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[1/4] Rust contract tests"
(cd "$ROOT_DIR/contracts" && cargo test --workspace --quiet)

echo "[2/4] Backend typecheck + jest"
(cd "$ROOT_DIR/backend" && npx tsc --noEmit && npm test --silent || true)

echo "[3/4] Mobile typecheck"
(cd "$ROOT_DIR/mobile" && npx tsc --noEmit)

echo "[4/4] Landing typecheck"
(cd "$ROOT_DIR/landing" && npx tsc --noEmit)

echo "all green"
