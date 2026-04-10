import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Zap, Target, Gift, Flame, ArrowRight, Clock, HelpCircle } from "lucide-react";

interface NextUnlock {
  title: string;
  description: string;
  type: string;
  level?: number;
}

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
  currentStreak: number;
  nextUnlock: NextUnlock | null;
}

interface XpHistoryEntry {
  id: string;
  amount: number;
  action: string;
  description: string;
  createdAt: string;
}

const xpGuide = [
  { action: "Daily login", xp: "+25", color: "text-cyan-400" },
  { action: "Create project", xp: "+50", color: "text-green-400" },
  { action: "Save work", xp: "+10", color: "text-zinc-400" },
  { action: "Export", xp: "+25", color: "text-amber-400" },
  { action: "Publish", xp: "+100", color: "text-cyan-400" },
  { action: "AI generation", xp: "+15", color: "text-violet-400" },
];

export function XPWidget() {
  const [data, setData] = useState<ProgressionSummary | null>(null);
  const [history, setHistory] = useState<XpHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    fetch("/api/progression/summary", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (showHistory && history.length === 0) {
      fetch("/api/progression/xp-history", { credentials: "include" })
        .then(r => r.ok ? r.json() : [])
        .then(setHistory)
        .catch(() => {});
    }
  }, [showHistory, history.length]);

  if (!data) return null;

  const progressPct = Math.round(data.xpProgress * 100);
  const nearLevelUp = progressPct >= 90;
  const xpNeeded = data.xpForNextLevel - data.xpInCurrentLevel;

  return (
    <div className="border-4 border-white bg-black p-5 space-y-4 rounded-2xl" data-testid="widget-xp-progress">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 border-2 border-white flex items-center justify-center bg-zinc-900 rounded-xl ${nearLevelUp ? "animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.5)]" : ""}`}>
            <span className="font-black text-lg" data-testid="text-level">{data.level}</span>
          </div>
          <div>
            <h3 className="font-black text-sm uppercase tracking-wider" data-testid="text-level-title">{data.levelTitle}</h3>
            <p className="text-xs text-zinc-500 font-mono">{data.xp.toLocaleString()} XP total</p>
          </div>
        </div>
        <Zap className={`w-5 h-5 text-yellow-400 ${nearLevelUp ? "animate-pulse" : ""}`} />
      </div>

      <div>
        <div className="flex justify-between text-[10px] text-zinc-500 uppercase mb-1 font-bold">
          <span>Level {data.level}</span>
          <span>{data.level < 30 ? `Level ${data.level + 1}` : "MAX"}</span>
        </div>
        <div className={`h-3 bg-zinc-900 border w-full rounded-full ${nearLevelUp ? "border-white/50 shadow-[0_0_10px_rgba(255,255,255,0.2)]" : "border-zinc-700"}`} data-testid="bar-xp-progress">
          <div
            className={`h-full transition-all duration-500 rounded-full ${nearLevelUp ? "bg-yellow-400" : "bg-white"}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <p className="text-[10px] text-zinc-600 font-mono">
            {data.xpInCurrentLevel.toLocaleString()} / {data.xpForNextLevel.toLocaleString()} XP
          </p>
          {nearLevelUp ? (
            <p className="text-[10px] text-yellow-400 font-mono font-bold animate-pulse">
              {xpNeeded.toLocaleString()} XP to level up!
            </p>
          ) : (
            <p className="text-[10px] text-zinc-600 font-mono">
              {xpNeeded.toLocaleString()} XP to go
            </p>
          )}
        </div>
      </div>

      {data.nextUnlock && (
        <div className="border-2 border-zinc-800 p-3 bg-zinc-950 rounded-xl" data-testid="next-unlock-preview">
          <div className="flex items-center gap-2 mb-1">
            <ArrowRight className="w-3 h-3 text-cyan-400" />
            <span className="text-[10px] text-cyan-400 uppercase font-black tracking-wider">Next Unlock</span>
          </div>
          <p className="text-xs font-bold text-white">{data.nextUnlock.title}</p>
          {data.nextUnlock.level && (
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
              Level {data.nextUnlock.level} required
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {data.currentStreak > 0 ? (
          <div className="border-2 border-orange-500/30 p-2.5 text-center bg-orange-500/5 rounded-xl" data-testid="stat-streak">
            <Flame className={`w-4 h-4 mx-auto mb-1 text-orange-400 ${data.currentStreak >= 3 ? "animate-pulse" : ""}`} />
            <p className="text-sm font-black text-orange-400">{data.currentStreak}</p>
            <p className="text-[9px] text-zinc-500 uppercase font-bold">Day Streak</p>
          </div>
        ) : (
          <div className="border-2 border-zinc-800 p-2.5 text-center rounded-xl" data-testid="stat-streak">
            <Flame className="w-4 h-4 mx-auto mb-1 text-zinc-600" />
            <p className="text-sm font-black text-zinc-600">0</p>
            <p className="text-[9px] text-zinc-500 uppercase font-bold">Day Streak</p>
          </div>
        )}
        <Link href="/achievements">
          <div className="border-2 border-zinc-800 p-2.5 hover:border-white transition-colors cursor-pointer text-center rounded-xl" data-testid="link-achievements-stat">
            <Target className="w-4 h-4 mx-auto mb-1" />
            <p className="text-sm font-black">{data.achievementsEarned}/{data.achievementsTotal}</p>
            <p className="text-[9px] text-zinc-500 uppercase font-bold">Achievements</p>
          </div>
        </Link>
        <Link href="/rewards">
          <div className="border-2 border-zinc-800 p-2.5 hover:border-white transition-colors cursor-pointer text-center rounded-xl" data-testid="link-rewards-stat">
            <Gift className="w-4 h-4 mx-auto mb-1" />
            <p className="text-sm font-black">{data.rewardsUnlocked}</p>
            <p className="text-[9px] text-zinc-500 uppercase font-bold">Rewards</p>
            {data.rewardsClaimable > 0 && (
              <span className="inline-block mt-1 px-1.5 py-0.5 bg-green-500 text-black text-[9px] font-black rounded-md">{data.rewardsClaimable} new</span>
            )}
          </div>
        </Link>
      </div>

      <button
        onClick={() => setShowGuide(!showGuide)}
        className="w-full flex items-center justify-between px-3 py-2 border-2 border-yellow-500/30 hover:border-yellow-500/60 transition-colors text-left bg-yellow-500/5 rounded-xl"
        data-testid="button-toggle-xp-guide"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-[10px] text-yellow-400 uppercase font-bold">How to earn XP</span>
        </div>
        <ArrowRight className={`w-3 h-3 text-yellow-400/60 transition-transform ${showGuide ? "rotate-90" : ""}`} />
      </button>

      {showGuide && (
        <div className="border border-yellow-500/20 bg-yellow-500/5 p-3 space-y-2 rounded-xl" data-testid="xp-guide-panel">
          <p className="text-[10px] text-zinc-400 font-mono mb-2">
            Every action earns XP. Level up to unlock tools, effects, and certifications.
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {xpGuide.map((item) => (
              <div key={item.action} className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 font-mono">{item.action}</span>
                <span className={`text-[10px] font-bold font-mono ${item.color}`}>{item.xp}</span>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-zinc-600 font-mono mt-2 border-t border-zinc-800 pt-2">
            Tip: Publish your work to earn the most XP and get seen by the community.
          </p>
        </div>
      )}

      <button
        onClick={() => setShowHistory(!showHistory)}
        className="w-full flex items-center justify-between px-3 py-2 border-2 border-zinc-800 hover:border-zinc-600 transition-colors text-left rounded-xl"
        data-testid="button-toggle-xp-history"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-[10px] text-zinc-400 uppercase font-bold">XP History</span>
        </div>
        <ArrowRight className={`w-3 h-3 text-zinc-600 transition-transform ${showHistory ? "rotate-90" : ""}`} />
      </button>

      {showHistory && (
        <div className="space-y-1 max-h-48 overflow-y-auto" data-testid="xp-history-feed">
          {history.length === 0 ? (
            <p className="text-[10px] text-zinc-600 font-mono text-center py-4">No XP history yet. Create something to start earning!</p>
          ) : (
            history.map(entry => (
              <div key={entry.id} className="flex items-center justify-between px-2 py-1.5 border border-zinc-900 hover:border-zinc-700 transition-colors rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-zinc-300 font-bold truncate">{entry.description}</p>
                  <p className="text-[9px] text-zinc-600 font-mono">
                    {new Date(entry.createdAt).toLocaleDateString()} {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className="text-xs font-black text-yellow-400 ml-2 whitespace-nowrap">+{entry.amount}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
