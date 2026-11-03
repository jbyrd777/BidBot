import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "BidBot", template: "%s | BidBot" },
  description: "A team of bots that runs your bid cycle. Chat with them like teammates.",
  openGraph: { title: "BidBot", description: "A team of bots that runs your bid cycle." },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
