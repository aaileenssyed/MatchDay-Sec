import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MatchdaySec | Operation Kickoff",
  description:
    "A standalone terminal-style SOC/NOC learning mission where you help keep matchday services online using simulated alerts, logs, and response decisions.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
