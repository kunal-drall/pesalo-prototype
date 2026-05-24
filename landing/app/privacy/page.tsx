export default function PrivacyPage() {
  return (
    <main className="page">
      <nav className="nav" aria-label="Main navigation">
        <a className="brand" href="/">
          <span className="mark" aria-hidden="true">
            <span className="leaf" />
          </span>
          Pesalo
        </a>
      </nav>
      <section className="hero" style={{ gridTemplateColumns: "1fr", minHeight: "auto" }}>
        <div className="hero-copy">
          <h1 style={{ fontSize: "clamp(44px, 8vw, 80px)" }}>Privacy</h1>
          <p className="subtitle">
            Pesalo stores only the account data needed to operate the app, support passkey login, and show savings activity. We do not sell personal data.
          </p>
        </div>
      </section>
    </main>
  );
}
