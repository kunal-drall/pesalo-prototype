import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  features: [
    "overview",
    {
      type: "category",
      label: "Money basics",
      collapsed: false,
      items: ["auto-earn", "boost", "send-receive", "swap"],
    },
    {
      type: "category",
      label: "Explore",
      collapsed: false,
      items: ["discover", "activity", "settings"],
    },
    "limitations",
  ],
};

export default sidebars;
