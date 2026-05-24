import type { NextConfig } from "next";

/// pesalo.fun/docs/* proxies to the standalone Docusaurus deploy at
/// docs.pesalo.fun. The Docusaurus site is configured with baseUrl `/`
/// (so docs.pesalo.fun/features/auto-earn works directly), so we strip
/// the `/docs/` prefix on the way out:
///   pesalo.fun/docs/features/auto-earn → docs.pesalo.fun/features/auto-earn.
const DOCS_ORIGIN = process.env.PESALO_DOCS_ORIGIN ?? "https://docs.pesalo.fun";

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
