import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  developer: [
    "architecture",
    {
      type: "category",
      label: "Contracts (Soroban)",
      collapsed: false,
      items: [
        "contracts/overview",
        "contracts/auto-earn",
        "contracts/boost",
        "contracts/yield-math",
      ],
    },
    {
      type: "category",
      label: "Mobile",
      collapsed: false,
      items: [
        "mobile/setup",
        "mobile/auth-flow",
        "mobile/classic-stellar",
        "mobile/soroban-relayer",
        "mobile/quirks",
      ],
    },
    {
      type: "category",
      label: "Backend",
      collapsed: false,
      items: ["backend/api", "backend/deployment"],
    },
    "handoff",
  ],
};

export default sidebars;
