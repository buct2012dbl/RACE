import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { NetworkProvider } from "@/contexts/NetworkContext";

export const metadata: Metadata = {
  title: "RACE Protocol — RWA-Powered Autonomous Commerce",
  description: "AI agents transforming Real World Assets into productive DeFi capital.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <NetworkProvider>{children}</NetworkProvider>
        </Providers>
      </body>
    </html>
  );
}
