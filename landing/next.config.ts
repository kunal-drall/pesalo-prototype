import type { NextConfig } from "next";

/// pesalo.fun/docs/* proxies to the standalone Docusaurus deploy. We
/// use Next.js rewrites (not Vercel JSON rewrites) so the URL bar keeps
/// reading `pesalo.fun/docs/...` — a JSON rewrite would 308-redirect
/// off-domain and break that.
///
/// Docusaurus is configured with baseUrl `/docs/` and the docs project's
/// vercel.json mounts the build output under `/docs/` on disk too. So
/// the path on both sides of the rewrite is identical:
///   pesalo.fun/docs/features/overview → DOCS_ORIGIN/docs/features/overview.
const DOCS_ORIGIN = process.env.PESALO_DOCS_ORIGIN ?? "https://pesalo-docs.vercel.app";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return [
      { source: "/docs", destination: `${DOCS_ORIGIN}/docs` },
      { source: "/docs/:path*", destination: `${DOCS_ORIGIN}/docs/:path*` },
    ];
  },
};

export default nextConfig;
