CREATE TABLE IF NOT EXISTS rates (
  id BIGSERIAL PRIMARY KEY,
  asset TEXT NOT NULL,
  market_address TEXT NOT NULL,
  maturity TIMESTAMPTZ NOT NULL,
  fixed_apy_bps INTEGER NOT NULL,
  flex_apy_bps INTEGER,
  source TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rates_asset_observed_at_idx
  ON rates (asset, observed_at DESC);

CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  contract_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  ledger BIGINT NOT NULL,
  tx_hash TEXT NOT NULL,
  payload JSONB NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS events_tx_hash_type_idx
  ON events (tx_hash, event_type);

CREATE INDEX IF NOT EXISTS events_contract_ledger_idx
  ON events (contract_id, ledger DESC);

CREATE TABLE IF NOT EXISTS prices (
  id BIGSERIAL PRIMARY KEY,
  pair TEXT NOT NULL,
  price_wad NUMERIC(38, 0) NOT NULL,
  source TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS prices_pair_observed_at_idx
  ON prices (pair, observed_at DESC);

CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY,
  wallet_address TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feedback_wallet_created_at_idx
  ON feedback (wallet_address, created_at DESC);
