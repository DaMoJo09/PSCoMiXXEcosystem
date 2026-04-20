import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { AiConsentModal } from "@/components/AiConsentModal";
import { authApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

// User-scoped local consent cache. A single global flag would leak consent
// across users on a shared browser (Apple/GDPR compliance hole). We key the
// accepted state to the authenticated user's id, plus a catch-all fallback
// for unauthenticated flows (signup page stays consent-free — AI isn't
// reachable there anyway).
const CACHE_KEY = "pscomixx_ai_consent_by_user_v1";

type ConsentMap = Record<string, true>;

function readCache(): ConsentMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch { return {}; }
}

function writeCache(map: ConsentMap) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(map)); } catch {}
}

function hasCachedConsent(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return readCache()[userId] === true;
}

function setCachedConsent(userId: string) {
  const m = readCache();
  m[userId] = true;
  writeCache(m);
}

// Legacy global key cleanup — remove the pre-user-scoped flag so it can't be
// inherited across sessions.
function clearLegacyKey() {
  try { localStorage.removeItem("pscomixx_ai_consent_accepted_v1"); } catch {}
}

// Module-level singleton bridge so non-React callers (e.g. plain hooks like
// useFxStudio) can trigger the consent modal without pulling the context.
// The provider sets this on mount; callers await it and proceed only when
// it resolves true. Defaults to fail-closed when no provider is mounted.
let ensureConsentBridge: (() => Promise<boolean>) | null = null;
export function ensureAiConsent(): Promise<boolean> {
  if (ensureConsentBridge) return ensureConsentBridge();
  return Promise.resolve(false);
}

interface AiConsentContextValue {
  hasConsent: boolean;
  ensureConsent: () => Promise<boolean>;
  openConsentModal: () => void;
}

const AiConsentContext = createContext<AiConsentContextValue | null>(null);

export function AiConsentProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id ?? null;

  const [hasConsent, setHasConsent] = useState<boolean>(() => hasCachedConsent(userId));
  const [open, setOpen] = useState(false);
  const pendingResolversRef = useRef<Array<(v: boolean) => void>>([]);

  // Re-evaluate consent state on auth/user change. Critical for shared-browser
  // scenarios: logging out and back in as a different user must NOT inherit
  // the previous user's consent.
  useEffect(() => {
    clearLegacyKey();
    // Reset modal + queued resolvers on user switch so a stale open modal
    // from a previous session doesn't accept for the wrong account.
    setOpen(false);
    const queue = pendingResolversRef.current;
    pendingResolversRef.current = [];
    queue.forEach((r) => r(false));

    if (!isAuthenticated || !userId) {
      setHasConsent(false);
      return;
    }

    // Trust the user-scoped cache first for instant UX.
    if (hasCachedConsent(userId)) {
      setHasConsent(true);
    } else {
      setHasConsent(false);
    }

    // Then always server-verify: the cache may be stale, the user may have
    // accepted on another device, or the local entry may have been cleared.
    let cancelled = false;
    authApi.getLegalStatus()
      .then((s) => {
        if (cancelled) return;
        if (s.aiConsentAcceptedAt) {
          setCachedConsent(userId);
          setHasConsent(true);
        } else {
          // Server says not accepted — invalidate any stale cache entry so
          // we don't silently skip the prompt.
          const m = readCache();
          if (m[userId]) { delete m[userId]; writeCache(m); }
          setHasConsent(false);
        }
      })
      .catch(() => { /* Network error: keep current cached state. */ });
    return () => { cancelled = true; };
  }, [userId, isAuthenticated]);

  const resolveAll = useCallback((v: boolean) => {
    const queue = pendingResolversRef.current;
    pendingResolversRef.current = [];
    queue.forEach((r) => r(v));
  }, []);

  const ensureConsent = useCallback((): Promise<boolean> => {
    // Only authenticated users can record consent server-side. If a caller
    // somehow reaches an AI feature while logged out, fail closed.
    if (!isAuthenticated || !userId) return Promise.resolve(false);
    if (hasConsent || hasCachedConsent(userId)) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      pendingResolversRef.current.push(resolve);
      setOpen(true);
    });
  }, [hasConsent, isAuthenticated, userId]);

  // Wire module-level singleton so non-React callers (useFxStudio) can gate.
  useEffect(() => {
    ensureConsentBridge = ensureConsent;
    return () => { if (ensureConsentBridge === ensureConsent) ensureConsentBridge = null; };
  }, [ensureConsent]);

  // Hard teardown: on unmount resolve any lingering promises as false so
  // callers don't hang forever (memory leak). Empty deps → runs on unmount.
  useEffect(() => {
    return () => {
      const queue = pendingResolversRef.current;
      pendingResolversRef.current = [];
      queue.forEach((r) => r(false));
    };
  }, []);

  const handleAccept = useCallback(async () => {
    if (!userId) {
      setOpen(false);
      resolveAll(false);
      return false;
    }
    try {
      await authApi.acceptAiConsent();
      setCachedConsent(userId);
      setHasConsent(true);
      setOpen(false);
      resolveAll(true);
      return true;
    } catch {
      // Leave modal open so the user can retry; don't resolve yet.
      return false;
    }
  }, [resolveAll, userId]);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next && !hasCachedConsent(userId)) resolveAll(false);
  }, [resolveAll, userId]);

  const openConsentModal = useCallback(() => setOpen(true), []);

  return (
    <AiConsentContext.Provider value={{ hasConsent, ensureConsent, openConsentModal }}>
      {children}
      <AiConsentModal open={open} onOpenChange={handleOpenChange} onAccept={handleAccept} />
    </AiConsentContext.Provider>
  );
}

export function useAiConsentContext(): AiConsentContextValue {
  const ctx = useContext(AiConsentContext);
  if (!ctx) {
    return {
      hasConsent: false,
      ensureConsent: async () => false,
      openConsentModal: () => {},
    };
  }
  return ctx;
}
