import type { ReactNode } from "react";
import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";
import { Redirect } from "@docusaurus/router";

import styles from "./index.module.css";

/// Pesalo docs landing. We immediately redirect into the Features
/// section because there's no separate "marketing" surface — the
/// landing site at pesalo.fun is the marketing entry point, and this
/// /docs/ subpath is a reference manual.
export default function Home(): ReactNode {
  if (typeof window !== "undefined") {
    return <Redirect to="/features/overview" />;
  }
  return (
    <Layout
      title="Pesalo Docs"
      description="Reference docs for the Pesalo Stellar savings wallet"
    >
      <header className={styles.heroBanner}>
        <div className="container">
          <Heading as="h1">Pesalo Docs</Heading>
          <p>Features &amp; developer reference for the Pesalo wallet.</p>
          <div className={styles.buttons}>
            <Link className="button button--primary button--lg" to="/features/overview">
              Read the docs →
            </Link>
          </div>
        </div>
      </header>
    </Layout>
  );
}
