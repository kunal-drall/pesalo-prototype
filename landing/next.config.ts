import type { NextConfig } from "next";

/// pesalo.fun/docs/* proxies to the standalone Docusaurus deploy at
/// pesalo-docs.vercel.app. We use Next.js rewrites (not Vercel JSON
/// rewrites) so the docs URL bar still reads `pesalo.fun/docs/...` —
/// Vercel rewrites would 308-redirect to the docs origin and break that.
const DOCS_ORIGIN = process.env.PESALO_DOCS_ORIGIN ?? "https://pesalo-docs.vercel.app";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return [
      // /docs (no trailing path) → docs landing
      { source: "/docs", destination: `${DOCS_ORIGIN}/docs` },
      // /docs/* → docs deploy
      { source: "/docs/:path*", destination: `${DOCS_ORIGIN}/docs/:path*` },
    ];
  },
};

export default nextConfig;
