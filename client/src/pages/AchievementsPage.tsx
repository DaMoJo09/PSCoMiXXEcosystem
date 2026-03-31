import { Layout } from "@/components/layout/Layout";
import { useState, useEffect } from "react";
import { ArrowLeft, Trophy, Lock, Star, Flame, Zap, Target, Users, Package } from "lucide-react";
import { Link } from "wouter";

interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  xpReward: number;
  earned: boolean;
  earnedAt: string | null;
  progressCurrent: number;
  progressTarget: number;
}

const RARITY_COLORS: Record<string, string> = {
  common: "border-zinc-500 text-zinc-400",
  uncommon: "border-green-500 text-green-400",
  rare: "border-blue-500 text-blue-400",
  epic: "border-purple-500 text-purple-400",
  legendary: "border-amber-500 text-amber-400",
};

const CATEGORY_ICONS: Record<string, typeof Trophy> = {
  onboarding: Zap,
  creation: Star,
  streak: Flame,
  membership: Trophy,
  collection: Package,
  community: Users,
};

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/progression/achievements", { credentials: "include" })
      .then(r => r.json())
      .then(data => { setAchievements(data); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, []);

  const categories = ["all", ...new Set(achievements.map(a => a.category))];
  const filtered = filter === "all" ? achievements : achievements.filter(a => a.category === filter);
  const earned = achievements.filter(a => a.earned).length;

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
            <Trophy className="w-5 h-5" />
            <h1 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Achievements</h1>
          </div>
          <span className="ml-auto text-sm text-zinc-400 font-bold" data-testid="text-achievement-count">{earned} / {achievements.length}</span>
        </header>

        <div className="max-w-4xl mx-auto p-6">
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 text-xs font-black uppercase border-2 whitespace-nowrap transition-colors ${
                  filter === cat ? "bg-white text-black border-white" : "border-zinc-600 text-zinc-400 hover:border-white hover:text-white"
                }`}
                data-testid={`filter-${cat}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Target className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map(achievement => {
                const rarityClass = RARITY_COLORS[achievement.rarity] || RARITY_COLORS.common;
                const CategoryIcon = CATEGORY_ICONS[achievement.category] || Target;
                const progressPct = achievement.progressTarget > 0
                  ? Math.round((achievement.progressCurrent / achievement.progressTarget) * 100)
                  : 0;

                return (
                  <div
                    key={achievement.id}
                    className={`border-4 p-4 transition-colors ${
                      achievement.earned
                        ? `${rarityClass.split(" ")[0]} bg-zinc-900`
                        : "border-zinc-800 bg-zinc-950"
                    }`}
                    data-testid={`card-achievement-${achievement.key}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 flex items-center justify-center text-2xl border-2 ${
                        achievement.earned ? rarityClass.split(" ")[0] : "border-zinc-700"
                      } bg-black`}>
                        {achievement.earned ? (
                          <span>{achievement.icon}</span>
                        ) : (
                          <Lock className="w-5 h-5 text-zinc-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-black text-sm uppercase truncate ${achievement.earned ? "text-white" : "text-zinc-400"}`}>{achievement.title}</h3>
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 border ${rarityClass}`}>
                            {achievement.rarity}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">{achievement.description}</p>

                        {!achievement.earned && achievement.progressTarget > 1 && (
                          <div className="mt-2 space-y-1" data-testid={`progress-${achievement.key}`}>
                            <div className="h-2 bg-zinc-800 w-full border border-zinc-700">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  progressPct >= 75 ? "bg-yellow-400" : progressPct >= 50 ? "bg-cyan-400" : "bg-zinc-500"
                                }`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-zinc-500 font-mono">
                              {achievement.progressCurrent} / {achievement.progressTarget}
                              {achievement.progressTarget - achievement.progressCurrent > 0 && (
                                <span className="text-zinc-600 ml-1">
                                  ({achievement.progressTarget - achievement.progressCurrent} more to unlock)
                                </span>
                              )}
                            </p>
                          </div>
                        )}

                        {!achievement.earned && achievement.progressTarget <= 1 && (
                          <div className="mt-2">
                            <p className="text-[10px] text-zinc-600 font-mono uppercase">
                              {achievement.progressCurrent > 0 ? "Ready to unlock" : "Not yet started"}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] text-zinc-600 uppercase flex items-center gap-1">
                            <CategoryIcon className="w-3 h-3" /> {achievement.category}
                          </span>
                          {achievement.xpReward > 0 && (
                            <span className="text-[10px] text-amber-500 font-bold">+{achievement.xpReward} XP</span>
                          )}
                          {achievement.earned && achievement.earnedAt && (
                            <span className="text-[10px] text-zinc-600 ml-auto">
                              {new Date(achievement.earnedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
