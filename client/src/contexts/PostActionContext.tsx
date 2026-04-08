import { createContext, useContext, useState, useCallback, useRef } from "react";
import { WhatsNextPrompt } from "@/components/WhatsNextPrompt";
import { XPCelebration } from "@/components/XPCelebration";
import { LevelUpOverlay } from "@/components/LevelUpOverlay";
import { toast } from "sonner";

const MILESTONE_ACTIONS = new Set([
  "first_login",
  "project_created",
  "publish",
  "first_share",
  "hop_published",
  "hop_series_created",
  "subscription_started",
  "profile_complete",
]);

const XP_ACTION_LABELS: Record<string, string | undefined> = {
  first_login: "Welcome to PSCoMiXX!",
  project_created: "Project created",
  save: "Project saved",
  export: "Export complete",
  publish: "Published!",
  daily_login: "Daily streak",
  ai_generation: "AI generated",
  first_share: "First share",
  hop_created: "HOP created",
  hop_saved: "HOP saved",
  hop_published: "HOP published",
  hop_series_created: "HOP series created",
  subscription_started: "Subscription started",
  profile_complete: "Profile complete",
  export_completed: "Export complete",
  lesson_complete: "Lesson complete",
  assignment_complete: "Assignment complete",
};

interface LevelUpData {
  level: number;
  title: string;
  achievements: { title: string; xpReward: number }[];
  rewards: { title: string }[];
}

interface PostActionContextValue {
  showWhatsNext: () => void;
  showXPCelebration: (xp: number, reason: string) => void;
  fireXpAction: (action: string) => Promise<void>;
}

const PostActionContext = createContext<PostActionContextValue>({
  showWhatsNext: () => {},
  showXPCelebration: () => {},
  fireXpAction: async () => {},
});

export function usePostAction() {
  return useContext(PostActionContext);
}

export function PostActionProvider({ children }: { children: React.ReactNode }) {
  const [whatsNextVisible, setWhatsNextVisible] = useState(false);
  const [celebration, setCelebration] = useState<{ xp: number; reason: string } | null>(null);
  const [levelUp, setLevelUp] = useState<LevelUpData | null>(null);
  const lastWhatsNextRef = useRef(0);

  const showWhatsNext = useCallback(() => {
    const now = Date.now();
    if (now - lastWhatsNextRef.current < 60000) return;
    lastWhatsNextRef.current = now;
    setWhatsNextVisible(true);
  }, []);

  const showXPCelebration = useCallback((xp: number, reason: string) => {
    setCelebration({ xp, reason });
  }, []);

  const fireXpAction = useCallback(async (action: string) => {
    try {
      const res = await fetch("/api/xp/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.xpGained > 0) {
          const label = XP_ACTION_LABELS[action] || action.replace(/_/g, " ");
          toast(
            `+${data.xpGained} XP`,
            {
              description: label,
              duration: 3000,
              icon: "⚡",
            }
          );

          if (MILESTONE_ACTIONS.has(action)) {
            setCelebration({ xp: data.xpGained, reason: label });
          }
        }

        if (data.leveledUp) {
          setLevelUp({
            level: data.level,
            title: data.levelTitle,
            achievements: data.achievementsUnlocked || [],
            rewards: data.rewardsUnlocked || [],
          });
        }
      }
    } catch {
    }
  }, []);

  return (
    <PostActionContext.Provider value={{ showWhatsNext, showXPCelebration, fireXpAction }}>
      {children}
      {whatsNextVisible && (
        <WhatsNextPrompt onDismiss={() => setWhatsNextVisible(false)} />
      )}
      {celebration && (
        <XPCelebration
          xpAmount={celebration.xp}
          reason={celebration.reason}
          onComplete={() => setCelebration(null)}
        />
      )}
      {levelUp && (
        <LevelUpOverlay
          level={levelUp.level}
          title={levelUp.title}
          achievements={levelUp.achievements}
          rewards={levelUp.rewards}
          onDismiss={() => setLevelUp(null)}
        />
      )}
    </PostActionContext.Provider>
  );
}
