# Pesalo

Pesalo is a mobile savings wallet on Stellar. Users authenticate with device passkeys (Face ID / fingerprint, no seed phrases), hold USDC, EURC, and XLM, and choose between fixed-rate or variable-yield savings products. Under the hood, a yield-tokenization protocol on Soroban (PT/YT splitting + logit-curve AMM, Pendle-style) generates the fixed-rate quotes.

## Repository layout

```
contracts/        Rust / Soroban contracts and the yield-math library
mobile/           Expo React Native app (iOS + Android from one codebase)
backend/          TypeScript API: rate, price, position, activity feeds
landing/          Next.js landing page (pesalo.app) + AASA + assetlinks
scripts/          Deployment + initialization shell scripts
validation/       Python reference math used to cross-validate yield-math
```

## Tech stack

| Layer | Choice |
|---|---|
| Mobile | Expo + React Native + Expo Router + NativeWind |
| Auth | Passkeys via `react-native-passkeys` + `passkey-kit` (kalepail) |
| Stellar SDK | `@stellar/stellar-sdk` |
| Transaction relayer | **OpenZeppelin Stellar Channels** (replaces deprecated Launchtube) |
| Smart contracts | Rust + `soroban-sdk` |
| Backend | Node.js + Express + TypeScript, hosted on Railway |
| Landing | Next.js on Vercel |
| Oracles | Reflector |
| Yield source | Blend (USDC + EURC + XLM lending pools) |

## End-to-end deployment

Once-only per network. The scripts auto-source the deployer env file and write the resulting contract IDs to `contracts/.deployed.json` and `contracts/.deployed.env`.

```bash
# 1. Create (or reuse) a Stellar account for deploying the protocol.
./scripts/create-deployer-wallet.sh

# 2. Set the asset SAC addresses (the USDC/EURC issuing contracts on the target network).
export USDC_ASSET_CONTRACT_ID=...
export EURC_ASSET_CONTRACT_ID=...

# 3. Build, upload, and deploy every contract.
./scripts/deploy-contracts.sh

# 4. Initialize the SY adapters, splitters, markets, and router in dependency order.
./scripts/initialize-protocol.sh

# 5. Seed initial liquidity into each AMM (LP token mint).
./scripts/seed-liquidity.sh
```

## OpenZeppelin Channels (transaction submission)

Launchtube is deprecated. Pesalo submits all Soroban calls through **OpenZeppelin Stellar Channels**: passkey-kit signs the auth entries, the mobile app extracts `(func, auth)` from the signed envelope, and Channels handles fee bumping + submission.

1. Get a testnet API key at <https://channels.openzeppelin.com/testnet/gen>.
2. Configure the mobile build:
   ```bash
   # mobile/.env.local (loaded by EAS Build)
   EXPO_PUBLIC_CHANNELS_BASE_URL=https://channels.openzeppelin.com/testnet
   EXPO_PUBLIC_CHANNELS_API_KEY=<your key>
   ```
3. The backend doesn't submit transactions but uses the same Soroban RPC URL configured at `SOROBAN_RPC_URL` (see `backend/.env.example`).

## Backend hosting (Railway)

`backend/Dockerfile` and `backend/railway.json` are pre-configured. After deploying the contracts:

```bash
cd backend
railway link                                    # one-time
railway variables set --from-file ../contracts/.deployed.env
railway variables set REFLECTOR_CONTRACT_ID=<reflector_oracle>
railway up                                      # builds + deploys
```

Healthchecks run against `/v1/health`. SIGTERM is handled cleanly so Railway redeploys are zero-downtime.

## Local checks

```bash
cd contracts && cargo test --workspace          # 210 tests
cd ../backend && npx tsc --noEmit               # typecheck
cd ../mobile && npx tsc --noEmit                # typecheck
cd ../landing && npx tsc --noEmit               # typecheck
./scripts/test-e2e.sh                           # run all of the above
```

## Security

- Private keys never leave the device's Secure Enclave (iOS) or StrongBox (Android).
- Every contract enforces `caller.require_auth()` on mutating entrypoints; verified by 210 contract tests.
- The backend is read-only — Railway compromise leaks public chain state only.
- `set_paused` switch on every contract for emergency stop.
- Asset transfers validate destination addresses + balance + slippage.
- A professional audit is required before mainnet with real funds.

## License

MIT
