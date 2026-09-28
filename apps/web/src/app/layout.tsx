import type { Metadata } from "next";
import { Archivo_Black, IBM_Plex_Sans } from "next/font/google";
import { BoosterLiveProvider } from "@/components/booster-live-provider";
import "./globals.css";

const display = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display-loaded",
});

const body = IBM_Plex_Sans({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-body-loaded",
});

export const metadata: Metadata = {
  title: {
    default: "HardStuck · Matched Pool Boosting",
    template: "%s · HardStuck",
  },
  description:
    "Matched-pool boosting, specialty farms, and escrowed accounts across League, Valorant, Overwatch, Marvel Rivals, and Apex. Verified contractors, ledger escrow, risk disclosed.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${display.variable} ${body.variable} antialiased`}
        style={
          {
            "--font-display": "var(--font-display-loaded), Archivo Black, sans-serif",
            "--font-body": "var(--font-body-loaded), IBM Plex Sans, sans-serif",
          } as React.CSSProperties
        }
      >
        <BoosterLiveProvider>{children}</BoosterLiveProvider>
      </body>
    </html>
  );
}
