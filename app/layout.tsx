import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexus Learning — Understand deeply. Build confidently.",
  description:
    "Explore a clearer path from curiosity to capability. A preview of Nexus Learning: purposeful practice, guided learning, and hands-on projects.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
