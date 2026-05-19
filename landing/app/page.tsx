import { EarlyAccessForm } from "./components/early-access-form";

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
        <a className="nav-link" href="mailto:query@29projectslab.com">
          query@29projectslab.com
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
        <div className="phone-wrap" aria-label="Pesalo app preview">
          <picture>
            <source
              srcSet="/screenshot-dark.png"
              media="(prefers-color-scheme: dark)"
            />
            <img
              src="/screenshot-light.png"
              alt="Pesalo mobile app showing auto-earning USDC, EURC, and XLM balances with a Boost USDC at 12.5% offer."
              className="phone-screenshot"
              width={924}
              height={2000}
              decoding="async"
              loading="eager"
            />
          </picture>
        </div>
      </section>
    </main>
  );
}
