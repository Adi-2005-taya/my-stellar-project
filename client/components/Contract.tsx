"use client";

import { useState, useCallback } from "react";
import {
  createPlan,
  addBeneficiary,
  addAsset,
  claimAssets,
  cancelPlan,
  getPlan,
  CONTRACT_ADDRESS,
} from "@/hooks/contract";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Spotlight } from "@/components/ui/spotlight";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Icons ────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

// ── Styled Input ─────────────────────────────────────────────

function Input({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-medium uppercase tracking-wider text-white/30">
        {label}
      </label>
      <div className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-px transition-all focus-within:border-[#7c6cf0]/30 focus-within:shadow-[0_0_20px_rgba(124,108,240,0.08)]">
        <input
          {...props}
          className="w-full rounded-[11px] bg-transparent px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/15 outline-none"
        />
      </div>
    </div>
  );
}

// ── Method Signature ─────────────────────────────────────────

function MethodSignature({
  name,
  params,
  returns,
  color,
}: {
  name: string;
  params: string;
  returns?: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 font-mono text-sm">
      <span style={{ color }} className="font-semibold">fn</span>
      <span className="text-white/70">{name}</span>
      <span className="text-white/20 text-xs">{params}</span>
      {returns && (
        <span className="ml-auto text-white/15 text-[10px]">{returns}</span>
      )}
    </div>
  );
}

// ── Status Config ────────────────────────────────────────────

const PLAN_STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string; variant: "success" | "warning" | "info" }> = {
  Active: { color: "text-[#34d399]", bg: "bg-[#34d399]/10", border: "border-[#34d399]/20", dot: "bg-[#34d399]", variant: "success" },
  Claimed: { color: "text-[#7c6cf0]", bg: "bg-[#7c6cf0]/10", border: "border-[#7c6cf0]/20", dot: "bg-[#7c6cf0]", variant: "info" },
  Cancelled: { color: "text-[#f87171]", bg: "bg-[#f87171]/10", border: "border-[#f87171]/20", dot: "bg-[#f87171]", variant: "warning" },
};

// ── Main Component ───────────────────────────────────────────

type Tab = "create" | "manage" | "claim" | "view";

interface ContractUIProps {
  walletAddress: string | null;
  onConnect: () => void;
  isConnecting: boolean;
}

export default function ContractUI({ walletAddress, onConnect, isConnecting }: ContractUIProps) {
  const [activeTab, setActiveTab] = useState<Tab>("create");
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  // Create plan state
  const [planId, setPlanId] = useState("");
  const [unlockDays, setUnlockDays] = useState("30");
  const [isCreating, setIsCreating] = useState(false);

  // Add beneficiary state
  const [beneficiaryPlanId, setBeneficiaryPlanId] = useState("");
  const [beneficiaryAddress, setBeneficiaryAddress] = useState("");
  const [isAddingBeneficiary, setIsAddingBeneficiary] = useState(false);

  // Add asset state
  const [assetPlanId, setAssetPlanId] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [assetAmount, setAssetAmount] = useState("");
  const [isAddingAsset, setIsAddingAsset] = useState(false);

  // Claim state
  const [claimPlanId, setClaimPlanId] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);

  // View state
  const [viewPlanId, setViewPlanId] = useState("");
  const [isViewing, setIsViewing] = useState(false);
  const [planData, setPlanData] = useState<Record<string, unknown> | null>(null);

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const handleCreatePlan = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!planId.trim() || !unlockDays.trim()) return setError("Fill in all fields");
    const unlockTime = Math.floor(Date.now() / 1000) + parseInt(unlockDays) * 86400;
    setError(null);
    setIsCreating(true);
    setTxStatus("Awaiting signature...");
    try {
      await createPlan(walletAddress, planId.trim(), unlockTime);
      setTxStatus("Plan created on-chain!");
      setPlanId("");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsCreating(false);
    }
  }, [walletAddress, planId, unlockDays]);

  const handleAddBeneficiary = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!beneficiaryPlanId.trim() || !beneficiaryAddress.trim()) return setError("Fill in all fields");
    setError(null);
    setIsAddingBeneficiary(true);
    setTxStatus("Awaiting signature...");
    try {
      await addBeneficiary(walletAddress, beneficiaryPlanId.trim(), beneficiaryAddress.trim());
      setTxStatus("Beneficiary added!");
      setBeneficiaryPlanId("");
      setBeneficiaryAddress("");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsAddingBeneficiary(false);
    }
  }, [walletAddress, beneficiaryPlanId, beneficiaryAddress]);

  const handleAddAsset = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!assetPlanId.trim() || !tokenAddress.trim() || !assetAmount.trim()) return setError("Fill in all fields");
    setError(null);
    setIsAddingAsset(true);
    setTxStatus("Awaiting signature...");
    try {
      await addAsset(walletAddress, assetPlanId.trim(), tokenAddress.trim(), BigInt(assetAmount));
      setTxStatus("Asset added to plan!");
      setAssetPlanId("");
      setTokenAddress("");
      setAssetAmount("");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsAddingAsset(false);
    }
  }, [walletAddress, assetPlanId, tokenAddress, assetAmount]);

  const handleClaim = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!claimPlanId.trim()) return setError("Enter a plan ID");
    setError(null);
    setIsClaiming(true);
    setTxStatus("Awaiting signature...");
    try {
      await claimAssets(walletAddress, claimPlanId.trim());
      setTxStatus("Assets claimed successfully!");
      setClaimPlanId("");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsClaiming(false);
    }
  }, [walletAddress, claimPlanId]);

  const handleViewPlan = useCallback(async () => {
    if (!viewPlanId.trim()) return setError("Enter a plan ID");
    setError(null);
    setIsViewing(true);
    setPlanData(null);
    try {
      const result = await getPlan(viewPlanId.trim(), walletAddress || undefined);
      if (result && typeof result === "object") {
        setPlanData(result as Record<string, unknown>);
      } else {
        setError("Plan not found");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setIsViewing(false);
    }
  }, [viewPlanId, walletAddress]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "create", label: "Create", icon: <PlusIcon />, color: "#7c6cf0" },
    { key: "manage", label: "Manage", icon: <UserIcon />, color: "#4fc3f7" },
    { key: "claim", label: "Claim", icon: <GiftIcon />, color: "#34d399" },
    { key: "view", label: "View", icon: <SearchIcon />, color: "#fbbf24" },
  ];

  return (
    <div className="w-full max-w-2xl animate-fade-in-up-delayed">
      {/* Toasts */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#f87171]/15 bg-[#f87171]/[0.05] px-4 py-3 backdrop-blur-sm animate-slide-down">
          <span className="mt-0.5 text-[#f87171]"><AlertIcon /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#f87171]/90">Error</p>
            <p className="text-xs text-[#f87171]/50 mt-0.5 break-all">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="shrink-0 text-[#f87171]/30 hover:text-[#f87171]/70 text-lg leading-none">&times;</button>
        </div>
      )}

      {txStatus && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#34d399]/15 bg-[#34d399]/[0.05] px-4 py-3 backdrop-blur-sm shadow-[0_0_30px_rgba(52,211,153,0.05)] animate-slide-down">
          <span className="text-[#34d399]">
            {txStatus.includes("on-chain") || txStatus.includes("success") || txStatus.includes("added") || txStatus.includes("created") ? <CheckIcon /> : <SpinnerIcon />}
          </span>
          <span className="text-sm text-[#34d399]/90">{txStatus}</span>
        </div>
      )}

      {/* Main Card */}
      <Spotlight className="rounded-2xl">
        <AnimatedCard className="p-0" containerClassName="rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#7c6cf0]/20 to-[#4fc3f7]/20 border border-white/[0.06]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#7c6cf0]">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/90">InheritVault</h3>
                <p className="text-[10px] text-white/25 font-mono mt-0.5">{truncate(CONTRACT_ADDRESS)}</p>
              </div>
            </div>
            <Badge variant="info" className="text-[10px]">Soroban</Badge>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/[0.06] px-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setError(null); setPlanData(null); }}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all",
                  activeTab === t.key ? "text-white/90" : "text-white/35 hover:text-white/55"
                )}
              >
                <span style={activeTab === t.key ? { color: t.color } : undefined}>{t.icon}</span>
                {t.label}
                {activeTab === t.key && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full transition-all"
                    style={{ background: `linear-gradient(to right, ${t.color}, ${t.color}66)` }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Create */}
            {activeTab === "create" && (
              <div className="space-y-5">
                <MethodSignature name="create_plan" params="(owner: Address, plan_id: String, unlock_time: u64)" color="#7c6cf0" />
                <Input label="Plan ID" value={planId} onChange={(e) => setPlanId(e.target.value)} placeholder="e.g. my-inheritance-plan" />
                <Input label="Unlock Days" type="number" value={unlockDays} onChange={(e) => setUnlockDays(e.target.value)} placeholder="e.g. 30" />
                {walletAddress ? (
                  <ShimmerButton onClick={handleCreatePlan} disabled={isCreating} shimmerColor="#7c6cf0" className="w-full">
                    {isCreating ? <><SpinnerIcon /> Creating...</> : <><PlusIcon /> Create Plan</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#7c6cf0]/20 bg-[#7c6cf0]/[0.03] py-4 text-sm text-[#7c6cf0]/60 hover:border-[#7c6cf0]/30 hover:text-[#7c6cf0]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to create plan
                  </button>
                )}
              </div>
            )}

            {/* Manage */}
            {activeTab === "manage" && (
              <div className="space-y-6">
                <div className="space-y-5">
                  <MethodSignature name="add_beneficiary" params="(owner: Address, plan_id: String, beneficiary: Address)" color="#4fc3f7" />
                  <Input label="Plan ID" value={beneficiaryPlanId} onChange={(e) => setBeneficiaryPlanId(e.target.value)} placeholder="e.g. my-inheritance-plan" />
                  <Input label="Beneficiary Address" value={beneficiaryAddress} onChange={(e) => setBeneficiaryAddress(e.target.value)} placeholder="G..." />
                  {walletAddress ? (
                    <ShimmerButton onClick={handleAddBeneficiary} disabled={isAddingBeneficiary} shimmerColor="#4fc3f7" className="w-full">
                      {isAddingBeneficiary ? <><SpinnerIcon /> Adding...</> : <><UserIcon /> Add Beneficiary</>}
                    </ShimmerButton>
                  ) : (
                    <button
                      onClick={onConnect}
                      disabled={isConnecting}
                      className="w-full rounded-xl border border-dashed border-[#4fc3f7]/20 bg-[#4fc3f7]/[0.03] py-4 text-sm text-[#4fc3f7]/60 hover:border-[#4fc3f7]/30 hover:text-[#4fc3f7]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                    >
                      Connect wallet to add beneficiaries
                    </button>
                  )}
                </div>

                <div className="border-t border-white/[0.06] pt-6 space-y-5">
                  <MethodSignature name="add_asset" params="(owner: Address, plan_id: String, token: Address, amount: i128)" color="#34d399" />
                  <Input label="Plan ID" value={assetPlanId} onChange={(e) => setAssetPlanId(e.target.value)} placeholder="e.g. my-inheritance-plan" />
                  <Input label="Token Address" value={tokenAddress} onChange={(e) => setTokenAddress(e.target.value)} placeholder="G... (or native for XLM)" />
                  <Input label="Amount" type="number" value={assetAmount} onChange={(e) => setAssetAmount(e.target.value)} placeholder="e.g. 1000" />
                  {walletAddress ? (
                    <ShimmerButton onClick={handleAddAsset} disabled={isAddingAsset} shimmerColor="#34d399" className="w-full">
                      {isAddingAsset ? <><SpinnerIcon /> Adding...</> : <><GiftIcon /> Add Asset</>}
                    </ShimmerButton>
                  ) : (
                    <button
                      onClick={onConnect}
                      disabled={isConnecting}
                      className="w-full rounded-xl border border-dashed border-[#34d399]/20 bg-[#34d399]/[0.03] py-4 text-sm text-[#34d399]/60 hover:border-[#34d399]/30 hover:text-[#34d399]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                    >
                      Connect wallet to add assets
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Claim */}
            {activeTab === "claim" && (
              <div className="space-y-5">
                <MethodSignature name="claim" params="(caller: Address, plan_id: String)" returns="-> Vec<Asset>" color="#34d399" />
                <Input label="Plan ID" value={claimPlanId} onChange={(e) => setClaimPlanId(e.target.value)} placeholder="e.g. my-inheritance-plan" />
                {walletAddress ? (
                  <ShimmerButton onClick={handleClaim} disabled={isClaiming} shimmerColor="#34d399" className="w-full">
                    {isClaiming ? <><SpinnerIcon /> Claiming...</> : <><GiftIcon /> Claim Assets</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#34d399]/20 bg-[#34d399]/[0.03] py-4 text-sm text-[#34d399]/60 hover:border-[#34d399]/30 hover:text-[#34d399]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to claim assets
                  </button>
                )}
                <p className="text-xs text-white/30">
                  Only beneficiaries can claim after the unlock time has passed.
                </p>
              </div>
            )}

            {/* View */}
            {activeTab === "view" && (
              <div className="space-y-5">
                <MethodSignature name="get_plan" params="(plan_id: String)" returns="-> Plan" color="#fbbf24" />
                <Input label="Plan ID" value={viewPlanId} onChange={(e) => setViewPlanId(e.target.value)} placeholder="e.g. my-inheritance-plan" />
                <ShimmerButton onClick={handleViewPlan} disabled={isViewing} shimmerColor="#fbbf24" className="w-full">
                  {isViewing ? <><SpinnerIcon /> Querying...</> : <><SearchIcon /> View Plan</>}
                </ShimmerButton>

                {planData && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden animate-fade-in-up">
                    <div className="border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-white/25">Plan Details</span>
                      {(() => {
                        const status = planData.is_claimed ? "Claimed" : planData.is_active ? "Active" : "Cancelled";
                        const cfg = PLAN_STATUS_CONFIG[status];
                        return cfg ? (
                          <Badge variant={cfg.variant}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                            {status}
                          </Badge>
                        ) : (
                          <Badge>{status}</Badge>
                        );
                      })()}
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/35">Owner</span>
                        <span className="font-mono text-sm text-white/80">{String(planData.owner || "").slice(0, 8)}...</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/35">Unlock Time</span>
                        <span className="font-mono text-sm text-white/80">
                          {planData.unlock_time ? new Date(Number(planData.unlock_time) * 1000).toLocaleDateString() : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/35">Beneficiaries</span>
                        <span className="font-mono text-sm text-white/80">
                          {Array.isArray(planData.beneficiaries) ? planData.beneficiaries.length : 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/35">Assets</span>
                        <span className="font-mono text-sm text-white/80">
                          {Array.isArray(planData.assets) ? planData.assets.length : 0}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.04] px-6 py-3 flex items-center justify-between">
            <p className="text-[10px] text-white/15">InheritVault &middot; Digital Asset Inheritance</p>
            <div className="flex items-center gap-2">
              {["Create", "Manage", "Claim"].map((s, i) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span className={cn("h-1 w-1 rounded-full", 
                    i === 0 ? "bg-[#7c6cf0]/50" : i === 1 ? "bg-[#4fc3f7]/50" : "bg-[#34d399]/50"
                  )} />
                  <span className="font-mono text-[9px] text-white/15">{s}</span>
                  {i < 2 && <span className="text-white/10 text-[8px]">&rarr;</span>}
                </span>
              ))}
            </div>
          </div>
        </AnimatedCard>
      </Spotlight>
    </div>
  );
}
