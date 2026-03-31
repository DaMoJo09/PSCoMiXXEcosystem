import { useEffect, useState } from "react";
import { Trophy, Star, Gift, X } from "lucide-react";

interface LevelUpOverlayProps {
  level: number;
  title: string;
  achievements: { title: string; xpReward: number }[];
  rewards: { title: string }[];
  onDismiss: () => void;
}

export function LevelUpOverlay({ level, title, achievements, rewards, onDismiss }: LevelUpOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      data-testid="overlay-level-up"
    >
      <div className={`text-center space-y-6 transition-all duration-700 ${visible ? "scale-100 translate-y-0" : "scale-90 translate-y-8"}`}>
        <div className="w-24 h-24 border-4 border-white mx-auto flex items-center justify-center shadow-[0_0_60px_rgba(255,255,255,0.4)]">
          <Trophy className="w-12 h-12 text-yellow-400" />
        </div>

        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-[0.3em] font-mono mb-2">LEVEL UP</p>
          <h2
            className="text-5xl font-black text-white uppercase tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            data-testid="text-new-level"
          >
            Level {level}
          </h2>
          <p className="text-lg text-zinc-400 font-bold uppercase mt-1" data-testid="text-new-title">{title}</p>
        </div>

        {(achievements.length > 0 || rewards.length > 0) && (
          <div className="space-y-3 max-w-sm mx-auto">
            {achievements.map((a, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2 border border-white/20 bg-white/5">
                <Star className="w-4 h-4 text-yellow-400 shrink-0" />
                <span className="text-sm text-white font-bold flex-1 text-left">{a.title}</span>
                <span className="text-xs text-yellow-400 font-mono">+{a.xpReward} XP</span>
              </div>
            ))}
            {rewards.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2 border border-green-500/30 bg-green-500/5">
                <Gift className="w-4 h-4 text-green-400 shrink-0" />
                <span className="text-sm text-green-400 font-bold flex-1 text-left">{r.title}</span>
                <span className="text-xs text-green-500 font-mono">UNLOCKED</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onDismiss}
          className="px-8 py-3 bg-white text-black font-black text-sm uppercase tracking-wider hover:bg-zinc-200 transition-colors"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          data-testid="button-level-up-continue"
        >
          Continue
        </button>
      </div>

      <button
        onClick={onDismiss}
        className="absolute top-6 right-6 text-white/30 hover:text-white transition-colors"
        data-testid="button-level-up-close"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
