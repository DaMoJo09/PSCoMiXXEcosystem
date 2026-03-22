import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Zap, Target, Gift, Bell, ArrowRight } from "lucide-react";

interface ProgressionSummary {
  xp: number;
  level: number;
  levelTitle: string;
  xpInCurrentLevel: number;
  xpForNextLevel: number;
  xpProgress: number;
  achievementsEarned: number;
  achievementsTotal: number;
  rewardsUnlocked: number;
  rewardsClaimable: number;
  unreadNotifications: number;
  totalMinutes: number;
  accountType: string;
}

export function XPWidget() {
  const [data, setData] = useState<ProgressionSummary | null>(null);

  useEffect(() => {
    fetch("/api/progression/summary", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return null;

  const progressPct = Math.round(data.xpProgress * 100);

  return (
    <div className="border-4 border-white bg-black p-5 space-y-4" data-testid="widget-xp-progress">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border-2 border-white flex items-center justify-center bg-zinc-900">
            <span className="font-black text-lg" data-testid="text-level">{data.level}</span>
          </div>
          <div>
            <h3 className="font-black text-sm uppercase tracking-wider" data-testid="text-level-title">{data.levelTitle}</h3>
            <p className="text-xs text-zinc-500 font-mono">{data.xp.toLocaleString()} XP</p>
          </div>
        </div>
        <Zap className="w-5 h-5 text-yellow-400" />
      </div>

      <div>
        <div className="flex justify-between text-[10px] text-zinc-500 uppercase mb-1 font-bold">
          <span>Level {data.level}</span>
          <span>{data.level < 30 ? `Level ${data.level + 1}` : "MAX"}</span>
        </div>
        <div className="h-3 bg-zinc-900 border border-zinc-700 w-full" data-testid="bar-xp-progress">
          <div
            className="h-full bg-white transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-[10px] text-zinc-600 mt-1 font-mono">
          {data.xpInCurrentLevel.toLocaleString()} / {data.xpForNextLevel.toLocaleString()} XP to next level
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Link href="/achievements">
          <div className="border-2 border-zinc-800 p-2.5 hover:border-white transition-colors cursor-pointer text-center" data-testid="link-achievements-stat">
            <Target className="w-4 h-4 mx-auto mb-1" />
            <p className="text-sm font-black">{data.achievementsEarned}/{data.achievementsTotal}</p>
            <p className="text-[9px] text-zinc-500 uppercase font-bold">Achievements</p>
          </div>
        </Link>
        <Link href="/rewards">
          <div className="border-2 border-zinc-800 p-2.5 hover:border-white transition-colors cursor-pointer text-center" data-testid="link-rewards-stat">
            <Gift className="w-4 h-4 mx-auto mb-1" />
            <p className="text-sm font-black">{data.rewardsUnlocked}</p>
            <p className="text-[9px] text-zinc-500 uppercase font-bold">Rewards</p>
            {data.rewardsClaimable > 0 && (
              <span className="inline-block mt-1 px-1.5 py-0.5 bg-green-500 text-black text-[9px] font-black">{data.rewardsClaimable} new</span>
            )}
          </div>
        </Link>
        <div className="border-2 border-zinc-800 p-2.5 text-center" data-testid="stat-time-spent">
          <Bell className="w-4 h-4 mx-auto mb-1" />
          <p className="text-sm font-black">{Math.floor(data.totalMinutes / 60)}h</p>
          <p className="text-[9px] text-zinc-500 uppercase font-bold">Time Spent</p>
        </div>
      </div>
    </div>
  );
}
