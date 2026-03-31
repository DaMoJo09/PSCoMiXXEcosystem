import { useState, useEffect } from "react";
import { Trophy, Zap, Star } from "lucide-react";

interface XPCelebrationProps {
  xpAmount: number;
  reason: string;
  onComplete: () => void;
}

export function XPCelebration({ xpAmount, reason, onComplete }: XPCelebrationProps) {
  const [phase, setPhase] = useState<"enter" | "show" | "exit">("enter");

  useEffect(() => {
    const enterTimer = setTimeout(() => setPhase("show"), 100);
    const exitTimer = setTimeout(() => setPhase("exit"), 2500);
    const completeTimer = setTimeout(onComplete, 3200);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center pointer-events-none transition-opacity duration-500 ${
        phase === "enter" ? "opacity-0" : phase === "exit" ? "opacity-0" : "opacity-100"
      }`}
      data-testid="xp-celebration-overlay"
    >
      <div className="absolute inset-0 bg-black/60" />

      <div
        className={`relative flex flex-col items-center gap-4 transition-all duration-700 ${
          phase === "show" ? "scale-100 translate-y-0" : "scale-75 translate-y-8"
        }`}
      >
        <div className="w-24 h-24 border-4 border-white flex items-center justify-center bg-black shadow-[0_0_60px_rgba(255,255,255,0.4)]">
          <Trophy className="w-12 h-12 text-yellow-400" />
        </div>

        <div className="flex items-center gap-2 px-6 py-3 bg-black border-2 border-white">
          <Zap className="w-6 h-6 text-yellow-400" />
          <span
            className="text-3xl font-black text-white"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            data-testid="text-celebration-xp"
          >
            +{xpAmount} XP
          </span>
        </div>

        <p
          className="text-sm text-zinc-400 font-mono uppercase tracking-wider"
          data-testid="text-celebration-reason"
        >
          {reason}
        </p>

        <div className="flex gap-1 mt-2">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className="w-3 h-3 text-yellow-400"
              style={{
                animationDelay: `${i * 0.1}s`,
                animation: phase === "show" ? `sparkle 0.6s ease-in-out ${i * 0.1}s both` : "none",
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes sparkle {
          0% { opacity: 0; transform: scale(0) rotate(0deg); }
          50% { opacity: 1; transform: scale(1.5) rotate(180deg); }
          100% { opacity: 1; transform: scale(1) rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export function useXPCelebration() {
  const [celebration, setCelebration] = useState<{ xp: number; reason: string } | null>(null);

  const showCelebration = (xp: number, reason: string) => {
    setCelebration({ xp, reason });
  };

  const clearCelebration = () => {
    setCelebration(null);
  };

  return { celebration, showCelebration, clearCelebration };
}
