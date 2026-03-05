"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { Shield, Zap, TrendingUp, AlertTriangle, Clock, DollarSign } from "lucide-react";
import { useNetwork } from '@/contexts/NetworkContext';

// Extended ABI for automation functions
const AI_AGENT_AUTOMATION_ABI = [
  {
    inputs: [
      { name: "controllerAddress", type: "address" },
      { name: "maxBorrow", type: "uint256" },
      { name: "cooldown", type: "uint256" },
      { name: "strategyType", type: "uint8" }
    ],
    name: "enableAutomation",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "disableAutomation",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "maxBorrow", type: "uint256" },
      { name: "cooldown", type: "uint256" },
      { name: "strategyType", type: "uint8" }
    ],
    name: "updateAutomation",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getUserPreferences",
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "autoDecisionsEnabled", type: "bool" },
          { name: "decisionController", type: "address" },
          { name: "maxBorrowPerDecision", type: "uint256" },
          { name: "cooldownPeriod", type: "uint256" },
          { name: "lastDecisionTime", type: "uint256" },
          { name: "strategy", type: "uint8" }
        ]
      }
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "isAutomationEnabled",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "canMakeAutomatedDecision",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const STRATEGIES = [
  {
    value: 0,
    name: "Conservative",
    icon: Shield,
    description: "Low risk, stable returns",
    risk: "Low (1–3)",
    targetROI: "5–8% APY",
    maxLeverage: "1.5×",
  },
  {
    value: 1,
    name: "Balanced",
    icon: TrendingUp,
    description: "Moderate risk, balanced returns",
    risk: "Medium (4–6)",
    targetROI: "10–15% APY",
    maxLeverage: "2.0×",
  },
  {
    value: 2,
    name: "Aggressive",
    icon: Zap,
    description: "High risk, maximum returns",
    risk: "High (7–10)",
    targetROI: "20%+ APY",
    maxLeverage: "3.0×",
  },
];

export function AutomationSettings() {
  const { address, isConnected } = useAccount();
  const { contracts } = useNetwork();

  const [isEnabled, setIsEnabled] = useState(false);
  const [maxBorrow, setMaxBorrow] = useState("100");
  const [strategy, setStrategy] = useState(1);
  const [cooldown, setCooldown] = useState("300");
  const [showSettings, setShowSettings] = useState(false);

  const { data: preferencesData, refetch: refetchPreferences } = useReadContract({
    address: contracts.AIAgent,
    abi: AI_AGENT_AUTOMATION_ABI,
    functionName: "getUserPreferences",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address && isConnected }
  });

  const { data: canRunNow } = useReadContract({
    address: contracts.AIAgent,
    abi: AI_AGENT_AUTOMATION_ABI,
    functionName: "canMakeAutomatedDecision",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address && isConnected, refetchInterval: 10000 }
  });

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (preferencesData) {
      const prefs = preferencesData as any;
      setIsEnabled(prefs.autoDecisionsEnabled);
      if (prefs.maxBorrowPerDecision != null) setMaxBorrow(formatEther(prefs.maxBorrowPerDecision));
      if (prefs.cooldownPeriod != null) setCooldown(prefs.cooldownPeriod.toString());
      setStrategy(Number(prefs.strategy));
    }
  }, [preferencesData]);

  useEffect(() => {
    if (isSuccess) setTimeout(() => refetchPreferences(), 2000);
  }, [isSuccess, refetchPreferences]);

  const handleEnableAutomation = async () => {
    if (!contracts.Controller) return;
    try {
      writeContract({
        address: contracts.AIAgent,
        abi: AI_AGENT_AUTOMATION_ABI,
        functionName: "enableAutomation",
        args: [contracts.Controller, parseEther(maxBorrow), BigInt(cooldown), strategy],
      });
    } catch (error) { console.error(error); }
  };

  const handleDisableAutomation = async () => {
    try {
      writeContract({ address: contracts.AIAgent, abi: AI_AGENT_AUTOMATION_ABI, functionName: "disableAutomation" });
    } catch (error) { console.error(error); }
  };

  const handleUpdateAutomation = async () => {
    try {
      writeContract({
        address: contracts.AIAgent,
        abi: AI_AGENT_AUTOMATION_ABI,
        functionName: "updateAutomation",
        args: [parseEther(maxBorrow), BigInt(cooldown), strategy],
      });
    } catch (error) { console.error(error); }
  };

  if (!isConnected) return null;

  const selectedStrategy = STRATEGIES[strategy];
  const nextDecisionTime = preferencesData
    ? (Number((preferencesData as any).lastDecisionTime) + Number((preferencesData as any).cooldownPeriod)) * 1000
    : 0;
  const timeUntilNext = nextDecisionTime > Date.now()
    ? Math.ceil((nextDecisionTime - Date.now()) / 1000)
    : 0;

  return (
    <div className="border-t border-[#111111]">
      {/* Section header */}
      <div className="border-b border-[#111111] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="border border-[#111111] w-8 h-8 flex items-center justify-center">
            <Zap className="w-4 h-4 text-[#111111]" strokeWidth={1.5} />
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">AI Automation</p>
            <p className="font-serif text-lg font-bold text-[#111111]">Autonomous Trading</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`font-mono text-xs uppercase tracking-widest px-3 py-1 border ${
            isEnabled
              ? "border-[#111111] bg-[#111111] text-[#F9F9F7]"
              : "border-neutral-400 text-neutral-500"
          }`}>
            {isEnabled ? "● Active" : "○ Inactive"}
          </span>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="font-mono text-xs uppercase tracking-widest text-[#111111] hover:text-[#CC0000] transition-colors"
          >
            {showSettings ? "Collapse" : "Configure"}
          </button>
        </div>
      </div>

      {/* Status overview — shown when enabled and settings are collapsed */}
      {isEnabled && !showSettings && (
        <div className="border-b border-[#111111]">
          {/* Active strategy row */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E0]">
            <div className="flex items-center gap-3">
              {React.createElement(selectedStrategy.icon, {
                className: "w-5 h-5 text-[#111111]",
                strokeWidth: 1.5,
              })}
              <span className="font-sans text-sm font-semibold text-[#111111]">{selectedStrategy.name} Strategy</span>
            </div>
            <span className="font-mono text-xs text-neutral-500">{selectedStrategy.targetROI}</span>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 border-b border-[#E5E5E0]">
            <div className="p-4 border-r border-[#E5E5E0]">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-neutral-500" strokeWidth={1.5} />
                <span className="font-mono text-xs uppercase tracking-widest text-neutral-500">Max Borrow</span>
              </div>
              <p className="font-mono text-sm font-bold text-[#111111]">{maxBorrow} USDC</p>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3.5 h-3.5 text-neutral-500" strokeWidth={1.5} />
                <span className="font-mono text-xs uppercase tracking-widest text-neutral-500">Cooldown</span>
              </div>
              <p className="font-mono text-sm font-bold text-[#111111]">{Math.floor(Number(cooldown) / 60)} min</p>
            </div>
          </div>

          {/* Timer status */}
          {timeUntilNext > 0 ? (
            <div className="px-6 py-3 border-l-4 border-[#CC0000]">
              <p className="font-mono text-xs text-[#CC0000]">
                Next decision in {Math.floor(timeUntilNext / 60)}m {timeUntilNext % 60}s
              </p>
            </div>
          ) : canRunNow ? (
            <div className="px-6 py-3 border-l-4 border-[#111111]">
              <p className="font-mono text-xs text-[#111111]">Ready for next automated decision</p>
            </div>
          ) : null}
        </div>
      )}

      {/* Configuration panel */}
      {showSettings && (
        <div className="p-6 space-y-6">

          {/* Strategy selection */}
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-3">
              Investment Strategy
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 border border-[#111111] border-r-0">
              {STRATEGIES.map((strat) => (
                <button
                  key={strat.value}
                  onClick={() => setStrategy(strat.value)}
                  className={`p-4 border-r border-[#111111] text-left transition-all duration-200 ${
                    strategy === strat.value
                      ? "bg-[#111111] text-[#F9F9F7]"
                      : "bg-transparent text-[#111111] hover:bg-[#F5F5F5]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {React.createElement(strat.icon, {
                      className: "w-4 h-4",
                      strokeWidth: 1.5,
                    })}
                    <span className="font-sans text-sm font-semibold">{strat.name}</span>
                  </div>
                  <p className={`font-body text-xs mb-2 ${strategy === strat.value ? "text-neutral-400" : "text-neutral-500"}`}>
                    {strat.description}
                  </p>
                  <div className={`font-mono text-xs space-y-0.5 ${strategy === strat.value ? "text-neutral-400" : "text-neutral-500"}`}>
                    <p>Risk: {strat.risk}</p>
                    <p>Target: {strat.targetROI}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Max borrow */}
          <div>
            <label className="block font-mono text-xs uppercase tracking-widest text-neutral-500 mb-2">
              Maximum Borrow Per Decision
            </label>
            <input
              type="number"
              value={maxBorrow}
              onChange={(e) => setMaxBorrow(e.target.value)}
              placeholder="100"
              className="w-full border-b-2 border-[#111111] bg-transparent px-0 py-2 font-mono text-sm text-[#111111] placeholder-neutral-400 focus:outline-none focus:bg-[#F0F0F0] transition-colors"
              style={{ borderRadius: 0 }}
            />
            <p className="font-mono text-xs text-neutral-500 mt-1.5">
              AI cannot borrow more than this amount in a single decision.
            </p>
          </div>

          {/* Cooldown period */}
          <div>
            <label className="block font-mono text-xs uppercase tracking-widest text-neutral-500 mb-2">
              Cooldown Period
            </label>
            <div className="flex gap-2 mb-2">
              {[60, 300, 600, 1800].map((seconds) => (
                <button
                  key={seconds}
                  onClick={() => setCooldown(seconds.toString())}
                  className={`px-3 py-1.5 border border-[#111111] font-mono text-xs transition-all duration-200 ${
                    cooldown === seconds.toString()
                      ? "bg-[#111111] text-[#F9F9F7]"
                      : "bg-transparent text-[#111111] hover:bg-[#F5F5F5]"
                  }`}
                >
                  {seconds < 60 ? `${seconds}s` : `${seconds / 60}m`}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={cooldown}
              onChange={(e) => setCooldown(e.target.value)}
              placeholder="300"
              className="w-full border-b-2 border-[#111111] bg-transparent px-0 py-2 font-mono text-sm text-[#111111] placeholder-neutral-400 focus:outline-none focus:bg-[#F0F0F0] transition-colors"
              style={{ borderRadius: 0 }}
            />
            <p className="font-mono text-xs text-neutral-500 mt-1.5">
              Minimum seconds between automated decisions (min: 60).
            </p>
          </div>

          {/* Risk warning */}
          <div className="border-l-4 border-[#CC0000] pl-4 py-2 bg-[#FFF5F5]">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-[#CC0000] shrink-0 mt-0.5" strokeWidth={1.5} />
              <div>
                <p className="font-sans text-xs font-semibold text-[#CC0000] mb-1 uppercase tracking-wider">
                  Risk Disclosure
                </p>
                <ul className="font-body text-xs text-neutral-600 space-y-0.5">
                  <li>• AI makes autonomous investment decisions within your limits</li>
                  <li>• Past performance does not guarantee future results</li>
                  <li>• You are responsible for all automated decisions</li>
                  <li>• You can disable automation at any time</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Error states */}
          {!contracts.Controller && (
            <div className="border-l-4 border-[#CC0000] pl-4 py-2">
              <p className="font-mono text-xs text-[#CC0000]">
                Controller address not configured. Set NEXT_PUBLIC_CONTROLLER_ADDRESS and restart.
              </p>
            </div>
          )}
          {writeError && (
            <div className="border-l-4 border-[#CC0000] pl-4 py-2">
              <p className="font-mono text-xs text-[#CC0000]">Error: {writeError.message}</p>
            </div>
          )}

          {/* Transaction status */}
          {(isPending || isConfirming) && (
            <div className="border-l-4 border-[#111111] pl-4 py-2">
              <p className="font-mono text-xs text-[#111111]">
                {isPending ? "Waiting for wallet confirmation..." : "Confirming transaction..."}
              </p>
            </div>
          )}
          {isSuccess && (
            <div className="border-l-4 border-[#111111] pl-4 py-2">
              <p className="font-mono text-xs text-[#111111]">Settings updated successfully.</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            {!isEnabled ? (
              <button
                onClick={handleEnableAutomation}
                disabled={isPending || isConfirming || !contracts.Controller}
                className="flex-1 px-6 py-3 bg-[#111111] text-[#F9F9F7] border border-[#111111] font-mono text-xs uppercase tracking-widest hover:bg-white hover:text-[#111111] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
              >
                {isPending || isConfirming ? "Processing..." : "Enable Automation"}
              </button>
            ) : (
              <>
                <button
                  onClick={handleUpdateAutomation}
                  disabled={isPending || isConfirming}
                  className="flex-1 px-6 py-3 bg-[#111111] text-[#F9F9F7] border border-[#111111] font-mono text-xs uppercase tracking-widest hover:bg-white hover:text-[#111111] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {isPending || isConfirming ? "Processing..." : "Update Settings"}
                </button>
                <button
                  onClick={handleDisableAutomation}
                  disabled={isPending || isConfirming}
                  className="px-6 py-3 border border-[#CC0000] text-[#CC0000] font-mono text-xs uppercase tracking-widest hover:bg-[#CC0000] hover:text-[#F9F9F7] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
                >
                  Disable
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
