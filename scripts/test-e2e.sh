#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

(cd "$ROOT_DIR/contracts" && cargo test --all)
(cd "$ROOT_DIR/backend" && npm test)
(cd "$ROOT_DIR/mobile" && npm run typecheck)
(cd "$ROOT_DIR/landing" && npm run typecheck)
