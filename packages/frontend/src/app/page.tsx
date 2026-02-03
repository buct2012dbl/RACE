"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { AgentDashboard } from "@/components/AgentDashboard";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <nav className="border-b border-white/10 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg" />
            <h1 className="text-2xl font-bold text-white">RACE Protocol</h1>
          </div>
          <ConnectButton />
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-white mb-2">
            RWA-Powered Autonomous Commerce Engine
          </h2>
          <p className="text-gray-400 text-lg">
            AI agents transforming Real World Assets into productive DeFi capital
          </p>
        </div>

        <AgentDashboard />
      </div>
    </main>
  );
}
