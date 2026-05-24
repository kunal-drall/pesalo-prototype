import { EarlyAccessForm } from "./components/early-access-form";
import { ThemeToggle } from "./components/theme-toggle";

export default function Home() {
  return (
    <main className="page">
      <nav className="nav" aria-label="Main navigation">
        <a className="brand" href="/">
          <img
            src="/pesalo-icon.png"
            alt=""
            className="brand-mark"
            width={36}
            height={36}
            decoding="async"
          />
          <span>Pesalo</span>
        </a>
        <div className="nav-right">
          <a className="nav-link" href="mailto:query@29projectslab.com">
            query@29projectslab.com
          </a>
          <ThemeToggle />
        </div>
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
          {/*
            Both screenshots ship; CSS toggles visibility based on the
            data-theme attribute on <html> so the theme button can swap
            them without a reload. <picture>'s source media only honours
            the OS preference, which a manual toggle can't override.
          */}
          <img
            src="/screenshot-light.png"
            alt="Pesalo mobile app showing auto-earning USDC, EURC, and XLM balances with a Boost USDC at 12.5% offer."
            className="phone-screenshot phone-screenshot--light"
            width={924}
            height={2000}
            decoding="async"
            loading="eager"
          />
          <img
            src="/screenshot-dark.png"
            alt=""
            aria-hidden="true"
            className="phone-screenshot phone-screenshot--dark"
            width={924}
            height={2000}
            decoding="async"
            loading="eager"
          />
        </div>
      </section>
    </main>
  );
}
