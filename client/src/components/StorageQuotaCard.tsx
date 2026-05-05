import { useEffect, useState } from "react";
import { HardDrive, AlertTriangle, Crown } from "lucide-react";
import { Link } from "wouter";

interface QuotaInfo {
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
  percentUsed: number;
  tier: string;
  unlimited: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function StorageQuotaCard({ compact = false }: { compact?: boolean }) {
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/files/quota", { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setQuota(data);
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Failed to load storage info");
          setLoading(false);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="p-4 border-2 border-zinc-700 bg-zinc-900 animate-pulse" data-testid="card-storage-quota-loading">
        <div className="h-5 w-32 bg-zinc-800 mb-3" />
        <div className="h-2 w-full bg-zinc-800" />
      </div>
    );
  }

  if (error || !quota) {
    return (
      <div className="p-4 border-2 border-zinc-700 bg-zinc-900 text-sm text-zinc-400" data-testid="card-storage-quota-error">
        Storage info unavailable
      </div>
    );
  }

  const isWarning = !quota.unlimited && quota.percentUsed >= 80;
  const isCritical = !quota.unlimited && quota.percentUsed >= 95;
  const barColor = isCritical ? "bg-red-500" : isWarning ? "bg-amber-400" : "bg-white";
  const tierLabel = quota.tier.charAt(0).toUpperCase() + quota.tier.slice(1);

  if (compact) {
    return (
      <div className="p-3 border-2 border-white bg-zinc-900" data-testid="card-storage-quota-compact">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs uppercase font-black">
            <HardDrive className="w-3.5 h-3.5" />
            <span>Cloud Storage</span>
          </div>
          <span className="text-xs text-zinc-400" data-testid="text-quota-tier">{tierLabel}</span>
        </div>
        <div className="h-1.5 bg-zinc-800 overflow-hidden mb-1">
          <div
            className={`h-full ${barColor} transition-all`}
            style={{ width: quota.unlimited ? "10%" : `${quota.percentUsed}%` }}
            data-testid="bar-quota-fill"
          />
        </div>
        <div className="text-[10px] text-zinc-400" data-testid="text-quota-summary">
          {formatBytes(quota.usedBytes)} {quota.unlimited ? "used (unlimited)" : `of ${formatBytes(quota.limitBytes)}`}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 border-4 border-white bg-zinc-900 space-y-4" data-testid="card-storage-quota">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HardDrive className="w-6 h-6" />
          <div>
            <h3 className="font-black text-lg uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Cloud Storage</h3>
            <p className="text-xs text-zinc-400">
              Files persist across all sessions and devices.
            </p>
          </div>
        </div>
        <div className="px-3 py-1.5 bg-white text-black font-black uppercase text-xs border-2 border-white" data-testid="badge-tier">
          {tierLabel} Plan
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="font-bold" data-testid="text-used-bytes">{formatBytes(quota.usedBytes)} used</span>
          <span className="text-zinc-400" data-testid="text-limit-bytes">
            {quota.unlimited ? "Unlimited" : `of ${formatBytes(quota.limitBytes)}`}
          </span>
        </div>
        <div className="h-3 bg-zinc-800 border border-zinc-700 overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all`}
            style={{ width: quota.unlimited ? "5%" : `${quota.percentUsed}%` }}
            data-testid="bar-quota-fill-full"
          />
        </div>
        <div className="mt-1 text-xs text-zinc-500" data-testid="text-percent-used">
          {quota.unlimited ? "No limit" : `${quota.percentUsed}% used · ${formatBytes(quota.remainingBytes)} remaining`}
        </div>
      </div>

      {isWarning && !quota.unlimited && (
        <div className={`p-3 border-2 ${isCritical ? "border-red-500 bg-red-500/10" : "border-amber-400 bg-amber-400/10"} flex items-start gap-2`} data-testid="warning-quota">
          <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isCritical ? "text-red-400" : "text-amber-300"}`} />
          <div className="text-sm">
            <p className="font-bold">
              {isCritical ? "Storage almost full" : "Approaching storage limit"}
            </p>
            <p className="text-zinc-300 text-xs mt-1">
              Upgrade your plan or delete files to free up space. New uploads will be blocked once you hit 100%.
            </p>
          </div>
        </div>
      )}

      {quota.tier === "free" && (
        <Link href="/pricing">
          <button className="w-full px-4 py-3 bg-white text-black font-black text-sm border-2 border-white hover:bg-zinc-200 flex items-center justify-center gap-2" data-testid="button-upgrade-storage">
            <Crown className="w-4 h-4" />
            Upgrade for more storage
          </button>
        </Link>
      )}
    </div>
  );
}
