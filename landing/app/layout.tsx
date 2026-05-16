import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pesalo — Save Smarter",
  description: "A passkey-first savings wallet for USDC, EURC, and XLM."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
