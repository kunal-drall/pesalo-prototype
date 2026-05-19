import { EarlyAccessForm } from "./components/early-access-form";

const assets = [
  { name: "USD Coin", symbol: "USDC", amount: "500.00 USDC", usd: "$500.00" },
  { name: "Euro Coin", symbol: "EURC", amount: "250.00 EURC", usd: "$270.00" },
  { name: "Stellar", symbol: "XLM", amount: "1,000.00 XLM", usd: "$112.50" },
];

export default function Home() {
  return (
    <main className="page">
      <nav className="nav" aria-label="Main navigation">
        <a className="brand" href="/">
          <span className="mark" aria-hidden="true">
            <span className="leaf" />
          </span>
          Pesalo
        </a>
        <a className="nav-link" href="mailto:priya@29projectslab.com">
          priya@29projectslab.com
        </a>
      </nav>
      <section className="hero">
        <div className="hero-copy">
          <h1>Pesalo</h1>
          <p className="subtitle">
            A passkey-first savings wallet for USDC, EURC, and XLM. Deposit, earn,
            send, and receive without seed phrases.
          </p>
          <EarlyAccessForm />
          <div className="actions secondary-actions">
            <a className="secondary" href="/privacy">
              Privacy
            </a>
          </div>
        </div>
        <div className="phone" aria-label="Pesalo app preview">
          <div className="screen">
            <div className="screen-label">Total Balance</div>
            <div className="balance">$882.50</div>
            <div className="gain">+$2.34 today</div>
            <div className="pills">
              <div className="pill">+ Deposit</div>
              <div className="pill">↗ Send</div>
            </div>
            {assets.map((asset) => (
              <div className="asset-row" key={asset.symbol}>
                <div className="asset-dot">{asset.symbol[0]}</div>
                <div className="asset-copy">
                  <div className="asset-name">{asset.name}</div>
                  <div className="asset-symbol">{asset.symbol}</div>
                </div>
                <div className="asset-amounts">
                  <div className="asset-amount">{asset.amount}</div>
                  <div className="asset-usd">{asset.usd}</div>
                </div>
              </div>
            ))}
            <div className="savings-card">
              <div className="savings-title">Fixed Savings</div>
              <div className="savings-money">$500.00</div>
              <div className="savings-rate">Earn $17.50 at 7.2% APY</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
