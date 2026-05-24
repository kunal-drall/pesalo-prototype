import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pesalo — Save Smarter",
  description: "A passkey-first savings wallet for USDC, EURC, and XLM.",
  icons: {
    icon: [
      { url: "/pesalo-icon.png", type: "image/png" },
      { url: "/pesalo-icon.png", sizes: "192x192", type: "image/png" },
      { url: "/pesalo-icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/pesalo-icon.png", sizes: "180x180" }],
    shortcut: "/pesalo-icon.png",
  },
};

/// Inline boot script — runs before React hydrates so the initial paint
/// already has the correct theme. Reads the user's saved preference from
/// localStorage if present, otherwise falls through to prefers-color-scheme.
const themeBootScript = `
(function() {
  try {
    var saved = localStorage.getItem('pesalo-theme');
    if (saved === 'light' || saved === 'dark') {
      document.documentElement.setAttribute('data-theme', saved);
    } else {
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
