import { createContext, useContext, useState, useCallback } from "react";
import { WhatsNextPrompt } from "@/components/WhatsNextPrompt";
import { XPCelebration } from "@/components/XPCelebration";

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
  publish: "Published!",
  first_share: "First share",
  hop_published: "HOP published",
  hop_series_created: "HOP series created",
  subscription_started: "Subscription started",
  profile_complete: "Profile complete",
};

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

  const showWhatsNext = useCallback(() => {
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
        if (data.xpGained > 0 && MILESTONE_ACTIONS.has(action)) {
          const label = XP_ACTION_LABELS[action] || action.replace(/_/g, " ");
          setCelebration({ xp: data.xpGained, reason: label });
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
    </PostActionContext.Provider>
  );
}
