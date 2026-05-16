# Pesalo

Pesalo is a mobile savings wallet for Stellar assets. Users authenticate with passkeys, hold USDC, EURC, and XLM, and choose fixed or flexible savings products powered by Soroban contracts.

This repository contains the full MVP workspace:

- `contracts/`: Rust/Soroban contracts and protocol math.
- `mobile/`: Expo React Native app.
- `backend/`: TypeScript API, polling jobs, and PostgreSQL schema.
- `landing/`: Next.js landing site, including passkey association files.
- `scripts/`: deployment and protocol initialization scripts.
- `validation/`: Python reference models for math and AMM validation.

## Step 1 Scaffold

The initial scaffold is intentionally compileable and runnable. Later build steps fill in contract logic, wallet integration, protocol deployment, mobile flows, and backend indexing without replacing the project structure.

## Local Checks

```bash
cd contracts && cargo check
cd ../mobile && npm run typecheck
cd ../backend && npm test
cd ../landing && npm run dev
```

## License

MIT
