/// Curated registry of real Stellar dApps. Each entry must point to a
/// reachable production URL on the public Stellar network. The icon URL
/// is resolved at render time via the dApp's own favicon — no synthetic
/// glyphs, no placeholder marks. If a dApp removes their favicon, we'd
/// rather drop the entry than draw something we made up.

export type DAppCategory =
  | "lending"
  | "dex"
  | "defi"
  | "bridge"
  | "payments"
  | "tools"
  | "wallet";

export type DApp = {
  slug: string;
  name: string;
  category: DAppCategory;
  /// One-line marketing description sourced from the project itself.
  desc: string;
  /// Production URL — the entry point a user would actually visit.
  url: string;
  /// Brand domain used to derive the favicon. Usually the apex domain,
  /// which is where favicons are most stable.
  brandDomain: string;
  /// Manual ordering hint for the "trending" rail on Discover.
  trending?: boolean;
};

export const DAPPS: DApp[] = [
  // ─── Lending / yield ───────────────────────────────────────────
  {
    slug: "blend",
    name: "Blend",
    category: "lending",
    desc: "Lending & borrowing protocol on Stellar. Earn yield by supplying.",
    url: "https://mainnet.blend.capital",
    brandDomain: "blend.capital",
    trending: true,
  },
  // ─── DEX / AMM ─────────────────────────────────────────────────
  {
    slug: "aquarius",
    name: "Aquarius",
    category: "dex",
    desc: "DEX & liquidity hub. Trade, provide liquidity, earn AQUA.",
    url: "https://aqua.network",
    brandDomain: "aqua.network",
    trending: true,
  },
  {
    slug: "soroswap",
    name: "Soroswap",
    category: "dex",
    desc: "AMM and DEX aggregator on Soroban. Smart-routed swaps.",
    url: "https://app.soroswap.finance",
    brandDomain: "soroswap.finance",
    trending: true,
  },
  {
    slug: "phoenix",
    name: "Phoenix",
    category: "dex",
    desc: "DeFi hub on Soroban — trade, LP, and earn.",
    url: "https://app.phoenix-hub.io",
    brandDomain: "phoenix-hub.io",
  },
  {
    slug: "stellarterm",
    name: "StellarTerm",
    category: "dex",
    desc: "Open-source trading client for the Stellar DEX.",
    url: "https://stellarterm.com",
    brandDomain: "stellarterm.com",
  },
  // ─── DeFi / vaults / CDP ───────────────────────────────────────
  {
    slug: "defindex",
    name: "DeFindex",
    category: "defi",
    desc: "Yield vault aggregator. Automated DeFi strategies.",
    url: "https://defindex.io",
    brandDomain: "defindex.io",
  },
  {
    slug: "fxdao",
    name: "FxDAO",
    category: "defi",
    desc: "Mint stablecoins backed by XLM. Borrow against your crypto.",
    url: "https://app.fxdao.io",
    brandDomain: "fxdao.io",
  },
  // ─── Bridge ────────────────────────────────────────────────────
  {
    slug: "allbridge",
    name: "Allbridge Core",
    category: "bridge",
    desc: "Cross-chain bridge between Stellar and other networks.",
    url: "https://core.allbridge.io",
    brandDomain: "allbridge.io",
  },
  // ─── Wallets / payments ────────────────────────────────────────
  {
    slug: "lobstr",
    name: "LOBSTR",
    category: "wallet",
    desc: "Mobile-first wallet for Stellar — popular DEX entry point.",
    url: "https://lobstr.co",
    brandDomain: "lobstr.co",
  },
  // ─── Tools / explorer ──────────────────────────────────────────
  {
    slug: "stellar-expert",
    name: "Stellar Expert",
    category: "tools",
    desc: "Block explorer and analytics for the Stellar network.",
    url: "https://stellar.expert/explorer/public",
    brandDomain: "stellar.expert",
  },
];

export type DiscoverCategory = {
  slug: "all" | DAppCategory;
  label: string;
};

export const CATEGORIES: DiscoverCategory[] = [
  { slug: "all", label: "All" },
  { slug: "defi", label: "DeFi" },
  { slug: "dex", label: "DEX" },
  { slug: "lending", label: "Lending" },
  { slug: "wallet", label: "Wallet" },
  { slug: "bridge", label: "Bridge" },
  { slug: "tools", label: "Tools" },
];

/// Returns the URL of the dApp's own favicon, sourced via Google's S2
/// favicon service. We never synthesise an icon — if Google can't reach
/// the dApp's domain the Image element falls back to its placeholder.
export function faviconUrl(domain: string, size = 128): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}
