import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aurum — Synthetic XAU on Stellar",
  description:
    "Open-source, over-collateralized synthetic gold exposure on Soroban, with live oracle reconciliation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
