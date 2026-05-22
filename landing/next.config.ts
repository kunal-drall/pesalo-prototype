import type { NextConfig } from "next";

/// pesalo.fun/docs/* proxies to the standalone Docusaurus deploy. We use
/// Next.js rewrites (not Vercel JSON rewrites) so the URL bar keeps
/// reading `pesalo.fun/docs/...` — a JSON rewrite would 308-redirect
/// off-domain and break that.
///
/// Docusaurus is configured with baseUrl `/docs/` so its internal links
/// embed `/docs/...` paths. The build output ships those files at the
/// root of the static deploy, so we strip the `/docs/` prefix on the
/// way out: pesalo.fun/docs/features/overview → DOCS_ORIGIN/features/overview.
const DOCS_ORIGIN = process.env.PESALO_DOCS_ORIGIN ?? "https://pesalo-docs.vercel.app";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return [
      { source: "/docs", destination: `${DOCS_ORIGIN}/` },
      { source: "/docs/:path*", destination: `${DOCS_ORIGIN}/:path*` },
    ];
  },
};

export default nextConfig;
