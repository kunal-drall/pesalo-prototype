import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

// Pesalo docs site. Two side-by-side doc trees (Features / Developer)
// reached through the pill nav at the top. The classic preset's bundled
// `docs` plugin handles Features; we mount a second instance for the
// Developer tree.

const config: Config = {
  title: "Pesalo Docs",
  tagline: "A passkey-first Stellar savings wallet — Features & Developer reference",
  favicon: "img/favicon.ico",

  future: {
    v4: true,
  },

  url: "https://pesalo.fun",
  baseUrl: "/docs/",
  trailingSlash: false,

  organizationName: "kunal-drall",
  projectName: "pesalo-prototype",

  onBrokenLinks: "warn",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          id: "features",
          path: "docs/features",
          routeBasePath: "features",
          sidebarPath: "./sidebars-features.ts",
          editUrl: "https://github.com/kunal-drall/pesalo-prototype/tree/master/docs/",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      "@docusaurus/plugin-content-docs",
      {
        id: "developer",
        path: "docs/developer",
        routeBasePath: "developer",
        sidebarPath: "./sidebars-developer.ts",
        editUrl: "https://github.com/kunal-drall/pesalo-prototype/tree/master/docs/",
      },
    ],
  ],

  themeConfig: {
    image: "img/pesalo-social.png",
    colorMode: {
      defaultMode: "dark",
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "Pesalo",
      logo: {
        alt: "Pesalo",
        src: "img/sprout.svg",
        srcDark: "img/sprout.svg",
      },
      items: [
        {
          type: "docSidebar",
          docsPluginId: "features",
          sidebarId: "features",
          position: "left",
          label: "Features",
          className: "navbar__item--pill",
        },
        {
          type: "docSidebar",
          docsPluginId: "developer",
          sidebarId: "developer",
          position: "left",
          label: "Developer",
          className: "navbar__item--pill",
        },
        {
          href: "https://pesalo.fun",
          label: "Get the app",
          position: "right",
        },
        {
          href: "https://github.com/kunal-drall/pesalo-prototype",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Pesalo",
          items: [
            { label: "Landing", href: "https://pesalo.fun" },
            { label: "Get the app", href: "https://pesalo.fun" },
            { label: "Privacy", href: "https://pesalo.fun/privacy" },
          ],
        },
        {
          title: "Docs",
          items: [
            { label: "Features", to: "/features/overview" },
            { label: "Developer", to: "/developer/architecture" },
          ],
        },
        {
          title: "Project",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/kunal-drall/pesalo-prototype",
            },
            {
              label: "Contact",
              href: "mailto:query@29projectslab.com",
            },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} Pesalo · Built on Stellar`,
    },
    prism: {
      theme: prismThemes.oneLight,
      darkTheme: prismThemes.oneDark,
      additionalLanguages: ["bash", "rust", "toml", "json", "tsx"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
