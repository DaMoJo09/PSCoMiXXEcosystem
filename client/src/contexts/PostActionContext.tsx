import { createContext, useContext, useState, useCallback } from "react";
import { WhatsNextPrompt } from "@/components/WhatsNextPrompt";
import { XPCelebration } from "@/components/XPCelebration";

interface PostActionContextValue {
  showWhatsNext: () => void;
  showXPCelebration: (xp: number, reason: string) => void;
}

const PostActionContext = createContext<PostActionContextValue>({
  showWhatsNext: () => {},
  showXPCelebration: () => {},
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

  return (
    <PostActionContext.Provider value={{ showWhatsNext, showXPCelebration }}>
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
