# Pesalo Mobile — Handoff for the next coding agent

Pesalo is a passkey-first Stellar savings wallet built with Expo Router + React Native + Zustand + the Soroban SDK. This document captures the current state of the app, what works end-to-end, and the punch list of what's left so a fresh contributor (human or agent) can pick up without context loss.

> **Full web docs**: this file is the canonical README; for a navigable version with cross-links + code samples see [pesalo.fun/docs](https://pesalo.fun/docs) (Docusaurus, built from `docs/`).

---

## Stack snapshot

- **Runtime**: Expo SDK 53 with `expo-router` typed routes, `expo-dev-client` for native debug builds.
- **State**: Zustand stores (`stores/walletStore.ts`, `stores/authStore.ts`).
- **Stellar**: `@stellar/stellar-sdk` (v15) with the minimal subpath used by passkey-kit, `@stellar/stellar-base` underneath. Soroban contract calls go through `lib/stellar/contracts.ts`; classic Stellar payments and DEX swaps go through `lib/stellar/payments.ts`.
- **Identity**:
  - Production path: `passkey-kit` smart-wallet (Secp256r1 WebAuthn signers, deployed via the kalepail wasm in `EXPO_PUBLIC_PASSKEY_WALLET_HASH`).
  - Dev path: a Stellar Ed25519 keypair in `expo-secure-store` (used when WebAuthn isn't available, e.g. iOS Simulator).
- **Relayer**: OpenZeppelin Stellar Channels for sponsored Soroban submissions (testnet API key in `EXPO_PUBLIC_CHANNELS_API_KEY`).
- **Backend** (separate repo `backend/`): Express on Railway at `https://pesalo-api-production.up.railway.app/v1` exposing `/rates`, `/prices`, `/positions/:addr`, `/activity/:addr`, `/markets`, and a Postgres-backed `/early-access` form.
- **Contracts** (separate repo `contracts/`): Soroban auto-earn protocol (Router, SY adapters, Splitter, Yield-Market with logit-curve AMM, Yield-Math). Live testnet contract IDs are in `mobile/.env.local` and in EAS Build env vars.

---

## What works today (May 2026)

### Boot + auth
- `index.js` is the Metro entry. It installs Node-core polyfills (`crypto.getRandomValues`, `Buffer`, `process`, `URL`) **before** `expo-router/entry` scans routes, so the file-system route scan doesn't crash when route files synchronously import Stellar SDK code.
- Root layout (`app/_layout.tsx`) enforces an auth gate. On every render it:
  1. Calls `authStore.checkAuth()` which reads the secure store
  2. Renders an empty container until that check resolves (no flash of wrong surface)
  3. Redirects to `/(auth)/welcome` if no wallet, `/(tabs)` if one exists
- `Welcome` (`app/(auth)/welcome.tsx`) reads `/v1/rates` and surfaces live Auto-Earn + Boost APYs on the hero cards.
- `Create` (`app/(auth)/create.tsx`) calls `authStore.createAccount()`. The flow:
  1. Tries `PasskeyKit.createWallet()` → fails silently on Simulator / dev hardware
  2. Falls back to `Keypair.random()`, stores secret in `expo-secure-store`
  3. POSTs the new G-address to `https://friendbot.stellar.org` → 10,000 testnet XLM
  4. Refreshes balances from Horizon
  5. Auth gate redirects to `/(tabs)`

### Home tab (`app/(tabs)/index.tsx`)
- Real balance for XLM (and USDC/EURC once trustlines exist) loaded via `Horizon.Server.loadAccount`.
- Weighted-average APY pill ("Earning X% APY") derived from the user's per-asset USD-weighted holdings × the `/v1/rates` auto-earn APY for that asset.
- "Today's earnings" computed as `totalUsd × weightedApy / 100 / 365` — same daily slice the protocol uses.
- "Boost available" CTA selects the top fixed-rate market the user already holds; tapping routes to `/savings/fixed-rates`.
- Boosted positions list pulls fixed-term positions from `/v1/positions/:addr`. Each one shows a ring-shaped progress bar based on `(termDays - daysRemaining) / termDays`.
- **Send / Receive / Swap** pill row below the balance.
- Top-left avatar (address initials) → `/settings`.
- Top-right bell → `/(tabs)/activity`.

### Send (`app/send/confirm.tsx`)
- Asset segment (XLM / USDC / EURC), numpad amount, address paste.
- Validates against `^[GC][A-Z2-7]{55}$` for Stellar G- / C- addresses.
- Builds an `Operation.payment` and submits via Horizon (classic mode in `useTransaction`). Signed with the on-device key (passkey if available, dev keypair otherwise).
- Auto-clears + replaces back to Home on success.

### Receive (`app/send/receive.tsx`)
- QR code (`react-native-svg`-backed component in `components/QRCode.tsx`) of the user's address.
- Copy-to-clipboard with haptic feedback.
- "Get testnet XLM (Friendbot)" button — refills the account on demand.

### Swap (`app/swap.tsx`)
- Live DEX rate lookup against `Horizon.strictSendPaths()`.
- 1% slippage floor on `destMin`.
- Auto-runs `change_trust` first when destination asset isn't yet trusted.
- Two-panel UI (You pay / You receive) with flip button between them.
- 25% / 50% / MAX shortcuts.

### Boost (`app/(tabs)/boost.tsx`)
- Lists every open fixed-rate market from `/v1/rates`.
- Worked example sized to the user's actual balance.
- Tap a rate → `/savings/deposit-fixed?asset=USDC&market=...&apy=12.5` which is the Confirm Boost screen.

### Boost Confirm (`app/savings/deposit-fixed.tsx`)
- Rate upgrade viz (From auto-earn → To fixed).
- Calls `buildBoost` (Soroban Router contract → smart wallet auth → Channels relayer).
- **Smart-wallet only** — dev keypair accounts can't sign Soroban auth for our Router yet.

### Boost Position (`app/savings/position/[id].tsx`)
- Gold ring progress indicator (`react-native-svg`).
- Stat grid (Earned / Expected / Matures / APY).
- Unboost early CTA (routes to maturity flow).

### Discover (`app/(tabs)/discover.tsx`)
- Curated list of 10 real Stellar dApps (Blend, Aquarius, Soroswap, Phoenix, StellarTerm, DeFindex, FxDAO, Allbridge, LOBSTR, Stellar Expert) — see `lib/discover/registry.ts`.
- Each icon is the dApp's actual favicon resolved via Google's S2 favicon service from the brand domain (never a synthetic glyph).
- Search + category chips.

### Browser (`app/discover/browser.tsx`)
- `react-native-webview` pointed at the dApp's real URL.
- HTTPS lock chip + back/forward/reload/close controls.

### Activity (`app/(tabs)/activity.tsx`)
- Reads `/accounts/:id/operations` directly from Horizon (no backend dependency) — see `lib/stellar/horizonActivity.ts`.
- Maps `create_account` (Friendbot funding), `payment`, and `path_payment_strict_*` records into our ActivityEvent shape.
- Groups by time bucket (Today / Yesterday / This week / Earlier).
- Filter chips by asset (All / USDC / EURC / XLM).
- **Caveat**: Soroban contract events (boost / auto-deposit) come through as `invoke_host_function` records that this parser ignores today. Adding them is a Priority 1 follow-up.

### Send / Receive / Swap (`app/send/*` + `app/swap.tsx`)
- All three use classic Stellar payments — no Soroban, no Channels relayer. `Operation.payment`, `Operation.changeTrust`, `Operation.pathPaymentStrictSend` built in `lib/stellar/payments.ts`, signed in-module with the dev keypair, and submitted via plain `fetch` to Horizon.
- The submit step base64-encodes the envelope manually via `bytesToBase64()` because `Transaction.toXDR()` doesn't return a real base64 string in our RN bundle — see [Mobile / Quirks #1 + #2 in the docs](https://pesalo.fun/docs/developer/mobile/quirks).
- Swap auto-runs `change_trust` first when the destination asset isn't yet trusted.
- Horizon errors are translated into plain-English copy via `describeHorizonError()`.

### Settings (`app/settings/index.tsx`)
- Address card + copy + Friendbot refill.
- Links to Security and About.
- Sign-out wipes both passkey credential + dev keypair from secure store and routes back to `/(auth)/welcome`.

### Landing site (`landing/`)
- Next.js app on Vercel at `pesalo.fun`.
- Light/dark theme toggle persisting via `data-theme` attribute + `localStorage`.
- `pesalo-icon.png` brand mark + favicon.
- Real mobile screenshots (`screenshot-light.png`, `screenshot-dark.png`).
- Email form (`/early-access`) writes to Railway Postgres.

---

## What's left to build

### Priority 1 — finish the mobile MVP

1. **Real passkey wallet creation on device**. The current Simulator fallback creates a Stellar G-address, which can't call our Router contract (Boost / Auto-Earn deposits are silently no-op for these accounts). Need:
   - Apple Developer Program enrolment for the team.
   - `webcredentials:pesalo.fun` associated domain JSON hosted on `pesalo.fun/.well-known/apple-app-site-association`.
   - Equivalent `assetlinks.json` for Android.
   - Real-device testing via `eas build -p ios --profile development` then install via Orbit.
   - Once passkey lands, drop the dev-keypair fallback for production builds (`app.config.ts` should disable it when `process.env.EXPO_PUBLIC_RELEASE_CHANNEL === "production"`).

2. **Boost / Unboost on dev keypair**. Current Send/Swap use classic Stellar payments which dev keypairs can sign. Boost still goes through the Router smart contract which expects passkey auth. Either:
   - Build a "Stellar Account Boost" variant of the Router that accepts plain Ed25519 auth, OR
   - Decide that boost is passkey-only and explicitly disable the CTA for dev accounts (currently it lights up but the call would fail).

3. **Backend offline**. `pesalo-api-production.up.railway.app` no longer resolves DNS. The mobile app has been re-pointed for Activity (now Horizon-direct), but `/v1/rates`, `/v1/prices`, `/v1/positions/:addr` still call the backend — so Auto-Earn APYs show 0%, USD totals on Home stay at $0 even with non-zero XLM balance, and the Boost tab shows the empty state. Options: re-deploy the Railway project (env vars in `backend/.env.example`), move to another Node host, or remove the backend entirely and read everything from Horizon / a public price oracle.

4. **Real USD prices for XLM / EURC**. The `/v1/prices` endpoint returns a single shape (`{USDC_USD, EURC_USD, XLM_USD}`). Confirm the backend is actually reading from a live oracle (e.g. CoinGecko, Reflector). The mobile UI silently zeroes the balance when prices are missing.

5. **EURC has near-zero testnet DEX liquidity**. Circle's testnet EURC issuer (`GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO`) has essentially no order book depth, so `findStrictSendPath(... destAsset: EURC)` returns empty. The Swap screen handles this gracefully ("No swap route available") but it means users can't actually trade into EURC on testnet. Either seed our own bilateral USDC/EURC offers from a side account, or pick a different testnet EURC issuer with active liquidity. Mainnet EURC is fine.

6. **Activity for Soroban events**. `lib/stellar/horizonActivity.ts` currently maps `payment`, `create_account`, and `path_payment_strict_*` records. Soroban contract events (boost, auto-deposit, unboost) come through as `invoke_host_function` records that the parser ignores. Add a branch to decode them into our ActivityEvent shape.

7. **Maturity flow**. `app/savings/maturity/[id].tsx` exists but needs to be wired to the Router's `redeem_boost` method when the position has fully matured. There's also an "Unboost early" CTA from the position detail screen that needs to call `unboost`.

8. **Error UX polish**. We currently throw raw errors into the LoadingOverlay and into red inline text. Replace with a friendly toast/snackbar and a retry button. Some errors (insufficient funds, no trustline, expired session) deserve dedicated copy.

### Priority 2 — production hardening

7. **Move secrets off the client**. `EXPO_PUBLIC_CHANNELS_API_KEY` is bundled into every dev build. For prod this needs to proxy through the backend so the API key never ships to user devices.

8. **Sentry / observability**. `lib/observability/sentry.ts` already initialises Sentry; the DSN is empty (`EXPO_PUBLIC_SENTRY_DSN=`). Provision a project and wire it.

9. **Versioning / OTA updates**. `eas.json` references `channel: "development" | "preview" | "production"` but `expo-updates` isn't installed yet. EAS warned about this on the last build. Install it + run `eas update:configure` so we can ship JS-only patches without a full rebuild.

10. **Mainnet readiness**. The OZ Channels integration uses the testnet relayer. Switch to the mainnet Channels endpoint + production API key when ready. Same for `STELLAR_TESTNET_PASSPHRASE` → `Networks.PUBLIC`.

---

## Assets required (logos, icons, images, avatars)

Currently the app uses:
- **App icon**: not set — `app.json` only specifies `android.adaptiveIcon.backgroundColor`. Needs a proper 1024×1024 PNG at `assets/icon.png`, 1024×1024 adaptive icon foreground at `assets/adaptive-icon.png`.
- **Splash screen**: not set. Needs `assets/splash.png` (1284×2778 recommended) on a dark `#080B11` background with the Sprout mark centred.
- **Brand mark**: a vector "Sprout" is drawn in code (`components/design/Icon.tsx → Sprout`). Acceptable for in-app, but for the store / share cards we need a polished PNG export.
- **Asset (token) icons**: USDC / EURC / XLM are drawn in code (`components/design/Icon.tsx → AssetIcon`). Acceptable, but Stellar Asset Directory has official 256×256 PNGs we should swap in for higher fidelity:
  - USDC: https://www.centre.io/usdc-icon.png (use Circle's brand)
  - EURC: https://www.circle.com/hubfs/Circle%20Brand%20Hub/Logos/EURC/EURC.png
  - XLM: https://stellar.org/images/stellar-rocket-pad/lumen-token.png
- **dApp icons**: currently resolved live via `https://www.google.com/s2/favicons?domain=…&sz=128`. Works, but the resolution is low. If the team wants high-fidelity tiles, fetch each dApp's official press-kit icon and cache locally under `assets/dapps/<slug>.png`. The 10 dApps in `lib/discover/registry.ts` are: blend, aquarius, soroswap, phoenix, stellarterm, defindex, fxdao, allbridge, lobstr, stellar-expert.
- **User avatars**: there is no user avatar — the avatar slot on Home shows the first two chars of the wallet address ("GB", "CC", …). If we want gradient identicons, drop in [`@dicebear/avatars`](https://www.dicebear.com/) or generate a 36×36 SVG from a hash of the address.
- **Confetti**: hand-drawn via `Animated.View` dots (`app/savings/maturity/success.tsx`). Fine.
- **Empty states**: Discover empty state has only a text line. Activity empty state likewise. Consider adding small illustrations.
- **Landing site visuals**: handled in the landing repo. The screenshots there (`screenshot-light.png` + `screenshot-dark.png`) are real captures of the iOS Simulator build at the time of the last rebrand.
- **Marketing kit** (`/tmp/pesalo-design/pesalo/project/Pesalo Marketing Kit.html`): design source for press / social / app-store copy. Not wired anywhere yet.

---

## Environment + ops

- `mobile/.env.local` is the local-only env file (gitignored). Pushed to EAS via `eas env:push development` so cloud builds get the same values.
- Test wallet creation + Friendbot from a fresh Simulator boot to validate the dev flow.
- For a real-device test of the passkey flow, install the dev build via `eas build:run -p ios --latest` (Mac) or `adb install` (Android).
- Metro dev server: `cd mobile && npx expo start --dev-client`. Already-installed dev apps connect via QR.

---

## Things to remember about this codebase

- **External SSD quirks**: this repo lives on an exFAT external drive that regenerates `._*` AppleDouble sidecars on every macOS write. Metro `blockList` ignores them and tsconfig excludes them; if you see route-not-found or "missing default export" warnings for `._foo.tsx`, run `dot_clean -m .` from the repo root.
- **OZ Channels client/plugin split**: `@openzeppelin/relayer-plugin-channels` is shimmed to expose only its `./client` subpath (`metro-stubs/oz-relayer-plugin-channels.js`). The `./plugin` half pulls in heavy Node-only deps and trips a deep `.slice()` failure during module-load on RN.
- **Stellar SDK package.json bug**: stellar-sdk v14.x's `lib/*/bindings/config.js` does `require("../../package.json")` with a path that's wrong post-build. We intercept with `metro-stubs/stellar-sdk-package.json.js`. v15 fixed this but passkey-kit pins v14, so we can't dedupe.
- **SDK variant alignment**: lib/stellar/payments.ts uses `@stellar/stellar-sdk` (full); lib/passkey/index.ts now imports `TransactionBuilder` from the **same** `@stellar/stellar-sdk` (not `/minimal`). Mixing the two surfaces `XDR Read Error: unknown EnvelopeType`.
- **Polyfill ordering**: anything that touches Stellar SDK at module-load must be reachable from `index.js` only AFTER its `require("expo-router/entry")` line. New code at the top of route files that does crypto / Buffer / URL ops at import time will crash on cold boot.
- **Buffer polyfill is broken for base64**: `Transaction.toXDR()` in our RN bundle returns a string whose contents are `"0,0,0,2,..."` (the Uint8Array's `Array.prototype.toString` output), NOT base64 — because the npm `buffer` polyfill doesn't apply the Buffer prototype to its returned bytes. **Use `bytesToBase64()` from `lib/stellar/payments.ts` instead** (it calls Hermes' native `btoa`). This is the single most painful bug in the project's history; debugging it took ~10 build cycles.
- **Docusaurus docs site**: lives in `docs/`, deploys to `pesalo.fun/docs` via a Next.js rewrite in `landing/next.config.ts`. To preview locally: `cd docs && npm install && npm start`. Build: `npm run build`.
