"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { AgentDashboard } from "@/components/AgentDashboard";

const TICKER_ITEMS = [
  "AI agents transforming Real World Assets into productive DeFi capital",
  "RACE Protocol — autonomous commerce engine operating 24/7",
  "Deposit RWA collateral to activate your AI agent today",
  "Risk-managed positions with stop-loss and take-profit automation",
  "Multi-user on-chain agent infrastructure — enterprise grade",
];

export default function Home() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="min-h-screen bg-[#F9F9F7]">

      {/* Breaking news ticker */}
      <div className="bg-[#111111] overflow-hidden border-b-2 border-[#111111]">
        <div className="flex items-center">
          <span className="shrink-0 bg-[#CC0000] text-[#F9F9F7] font-mono text-xs uppercase tracking-widest px-4 py-2 border-r border-[#CC0000]/60">
            Breaking
          </span>
          <div className="overflow-hidden flex-1 py-2 px-4">
            <div className="ticker-track">
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                <span key={i} className="font-mono text-xs text-[#F9F9F7] pr-16 whitespace-nowrap">
                  {i > 0 && <span className="text-[#CC0000] mr-16">&#x2727;</span>}
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Masthead */}
      <header className="border-b-4 border-[#111111] newsprint-texture">
        <div className="max-w-screen-xl mx-auto px-4">

          {/* Edition metadata */}
          <div className="flex items-center justify-between py-2 border-b border-[#111111]">
            <span className="font-mono text-xs uppercase tracking-widest text-neutral-500">
              Vol. 1, No. 1
            </span>
            <span className="font-mono text-xs uppercase tracking-widest text-neutral-500 hidden sm:block">
              {today}
            </span>
            <span className="font-mono text-xs uppercase tracking-widest text-neutral-500">
              DeFi Capital Edition
            </span>
          </div>

          {/* Masthead logo */}
          <div className="py-6 text-center border-b border-[#111111]">
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-8xl font-black tracking-tighter leading-[0.9] text-[#111111] uppercase">
              RACE Protocol
            </h1>
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-neutral-500 mt-3">
              RWA&#x2011;Powered Autonomous Commerce Engine
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex items-center justify-between py-3">
            <div className="flex items-center gap-6">
              {["Dashboard", "Positions", "Analytics", "Automation"].map((link) => (
                <a
                  key={link}
                  href="#"
                  className="font-sans text-xs uppercase tracking-widest font-semibold text-[#111111] hover:text-[#CC0000] transition-colors duration-200"
                >
                  {link}
                </a>
              ))}
            </div>
            <ConnectButton />
          </nav>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-screen-xl mx-auto px-4 py-8">

        {/* Section header */}
        <div className="border-b-4 border-[#111111] mb-0 pb-3 flex items-end justify-between">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-[#CC0000]">
              &#x25A0;&nbsp;Live Dashboard
            </span>
            <h2 className="font-serif text-3xl lg:text-5xl font-black text-[#111111] mt-1 leading-tight">
              AI Agent Command Center
            </h2>
          </div>
          <p className="font-body text-sm text-neutral-500 max-w-xs text-right leading-relaxed hidden lg:block">
            Autonomous investment decisions, real-time risk management,
            and RWA collateral tracking&nbsp;—&nbsp;all on&#x2011;chain.
          </p>
        </div>

        <AgentDashboard />
      </div>

      {/* Footer */}
      <footer className="border-t-4 border-[#111111] mt-16 bg-[#111111] text-[#F9F9F7]">
        <div className="max-w-screen-xl mx-auto px-4 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 border-l border-[#404040]">
            <div className="border-r border-[#404040] px-6 pb-6 md:pb-0">
              <p className="font-serif text-xl font-bold text-[#F9F9F7] mb-3">RACE Protocol</p>
              <p className="font-body text-xs text-neutral-400 leading-relaxed">
                AI&#x2011;driven autonomous commerce for the next generation of DeFi capital markets.
              </p>
            </div>
            <div className="border-r border-[#404040] px-6 pb-6 md:pb-0">
              <p className="font-mono text-xs uppercase tracking-widest text-neutral-400 mb-3">Protocol</p>
              {["RWA Vault", "AI Agent", "Risk Manager", "Strategies"].map((l) => (
                <p key={l} className="font-sans text-xs text-neutral-400 hover:text-[#F9F9F7] cursor-pointer mb-1.5 transition-colors">{l}</p>
              ))}
            </div>
            <div className="border-r border-[#404040] px-6 pb-6 md:pb-0">
              <p className="font-mono text-xs uppercase tracking-widest text-neutral-400 mb-3">Resources</p>
              {["Documentation", "Whitepaper", "GitHub", "Audit Reports"].map((l) => (
                <p key={l} className="font-sans text-xs text-neutral-400 hover:text-[#F9F9F7] cursor-pointer mb-1.5 transition-colors">{l}</p>
              ))}
            </div>
            <div className="px-6">
              <p className="font-mono text-xs uppercase tracking-widest text-neutral-400 mb-3">Network</p>
              <p className="font-mono text-xs text-neutral-400">Testnet Active</p>
              <p className="font-mono text-xs text-[#CC0000] mt-1.5">&#x25CF;&nbsp;Live</p>
            </div>
          </div>

          <div className="border-t border-[#404040] mt-8 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="font-mono text-xs text-neutral-500">
              &copy; 2026 RACE Protocol &mdash; Edition: Vol 1.0 &nbsp;|&nbsp; Hackathon Build
            </p>
            <p className="font-mono text-xs text-neutral-500">
              Not financial advice. Use at your own risk.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
