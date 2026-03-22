import { Layout } from "@/components/layout/Layout";
import { useState, useEffect } from "react";
import { ArrowLeft, Gift, Lock, Check, Package, Sparkles, Star, Zap } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { apiRequest } from "@/lib/queryClient";

interface Reward {
  id: string;
  key: string;
  title: string;
  description: string;
  rewardType: string;
  unlockType: string;
  unlocked: boolean;
  status: string;
  unlockedAt: string | null;
  claimedAt: string | null;
  progress: number;
  requirement: string;
}

interface ContentPack {
  id: string;
  key: string;
  title: string;
  description: string;
  packType: string;
  owned: boolean;
}

const REWARD_TYPE_ICONS: Record<string, typeof Gift> = {
  content_pack: Package,
  ai_credits: Sparkles,
  badge: Star,
  title: Zap,
};

export default function RewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [packs, setPacks] = useState<ContentPack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<"rewards" | "packs">("rewards");
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/progression/rewards", { credentials: "include" }).then(r => r.json()),
      fetch("/api/progression/content-packs", { credentials: "include" }).then(r => r.json()),
    ]).then(([r, p]) => {
      setRewards(r);
      setPacks(p);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  const handleClaim = async (rewardId: string) => {
    setClaiming(rewardId);
    try {
      await apiRequest("POST", `/api/progression/rewards/${rewardId}/claim`, {});
      setRewards(prev => prev.map(r => r.id === rewardId ? { ...r, status: "claimed", claimedAt: new Date().toISOString() } : r));
      toast.success("Reward claimed!");
    } catch (error: any) {
      toast.error(error.message || "Failed to claim reward");
    } finally {
      setClaiming(null);
    }
  };

  const claimable = rewards.filter(r => r.status === "unlocked").length;

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white">
        <header className="h-14 border-b-4 border-white flex items-center gap-4 px-6 bg-black sticky top-0 z-20">
          <Link href="/">
            <button className="p-2 hover:bg-white hover:text-black border-2 border-white transition-colors" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            <h1 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Rewards</h1>
          </div>
          {claimable > 0 && (
            <span className="ml-auto px-2 py-1 bg-green-500 text-black text-xs font-black" data-testid="text-claimable-count">
              {claimable} to claim
            </span>
          )}
        </header>

        <div className="max-w-4xl mx-auto p-6">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setTab("rewards")}
              className={`px-4 py-2 text-xs font-black uppercase border-2 transition-colors ${
                tab === "rewards" ? "bg-white text-black border-white" : "border-zinc-600 text-zinc-400 hover:border-white"
              }`}
              data-testid="tab-rewards"
            >
              Rewards
            </button>
            <button
              onClick={() => setTab("packs")}
              className={`px-4 py-2 text-xs font-black uppercase border-2 transition-colors ${
                tab === "packs" ? "bg-white text-black border-white" : "border-zinc-600 text-zinc-400 hover:border-white"
              }`}
              data-testid="tab-packs"
            >
              Content Packs
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Sparkles className="w-8 h-8 animate-spin" />
            </div>
          ) : tab === "rewards" ? (
            <div className="space-y-4">
              {rewards.map(reward => {
                const TypeIcon = REWARD_TYPE_ICONS[reward.rewardType] || Gift;
                const isClaimed = reward.status === "claimed";
                const isUnlocked = reward.status === "unlocked";

                return (
                  <div
                    key={reward.id}
                    className={`border-4 p-4 ${
                      isClaimed ? "border-zinc-700 bg-zinc-950 opacity-70"
                      : isUnlocked ? "border-green-500 bg-zinc-900"
                      : "border-zinc-800 bg-zinc-950"
                    }`}
                    data-testid={`card-reward-${reward.key}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 flex items-center justify-center border-2 ${
                        isUnlocked ? "border-green-500 bg-green-500/10" : isClaimed ? "border-zinc-600 bg-zinc-800" : "border-zinc-700 bg-black"
                      }`}>
                        {isClaimed ? <Check className="w-5 h-5 text-zinc-500" /> : isUnlocked ? <TypeIcon className="w-5 h-5 text-green-400" /> : <Lock className="w-5 h-5 text-zinc-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-sm uppercase">{reward.title}</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">{reward.description}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10px] text-zinc-600 uppercase">{reward.rewardType.replace('_', ' ')}</span>
                          <span className="text-[10px] text-zinc-500">{reward.requirement}</span>
                        </div>
                        {!isUnlocked && !isClaimed && (
                          <div className="mt-2 h-1.5 bg-zinc-800 w-full">
                            <div className="h-full bg-zinc-600 transition-all" style={{ width: `${Math.round(reward.progress * 100)}%` }} />
                          </div>
                        )}
                      </div>
                      {isUnlocked && (
                        <button
                          onClick={() => handleClaim(reward.id)}
                          disabled={claiming === reward.id}
                          className="px-4 py-2 bg-green-500 text-black font-black uppercase text-xs hover:bg-green-400 disabled:opacity-50"
                          data-testid={`button-claim-${reward.key}`}
                        >
                          {claiming === reward.id ? "..." : "Claim"}
                        </button>
                      )}
                      {isClaimed && (
                        <span className="text-xs text-zinc-600 font-bold uppercase">Claimed</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {rewards.length === 0 && (
                <div className="text-center py-12 text-zinc-600">
                  <Gift className="w-12 h-12 mx-auto mb-3" />
                  <p className="text-sm">No rewards available yet. Keep creating to unlock them!</p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {packs.map(pack => (
                <div
                  key={pack.id}
                  className={`border-4 p-4 ${pack.owned ? "border-green-500 bg-zinc-900" : "border-zinc-800 bg-zinc-950 opacity-60"}`}
                  data-testid={`card-pack-${pack.key}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 flex items-center justify-center border-2 ${
                      pack.owned ? "border-green-500 bg-green-500/10" : "border-zinc-700 bg-black"
                    }`}>
                      {pack.owned ? <Package className="w-5 h-5 text-green-400" /> : <Lock className="w-5 h-5 text-zinc-600" />}
                    </div>
                    <div>
                      <h3 className="font-black text-sm uppercase">{pack.title}</h3>
                      <p className="text-xs text-zinc-500">{pack.description}</p>
                      <span className="text-[10px] text-zinc-600 uppercase">{pack.packType}</span>
                    </div>
                    {pack.owned && <Check className="w-5 h-5 text-green-400 ml-auto" />}
                  </div>
                </div>
              ))}
              {packs.length === 0 && (
                <div className="col-span-2 text-center py-12 text-zinc-600">
                  <Package className="w-12 h-12 mx-auto mb-3" />
                  <p className="text-sm">No content packs available yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
