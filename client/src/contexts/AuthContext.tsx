import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { authApi } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  accountType: string;
  xp: number;
  level: number;
  levelTitle: string;
  totalMinutes: number;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, dateOfBirth: string, parentalConsent?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updateXp: (xp: number, level: number, totalMinutes: number) => void;
  isStudent: boolean;
  isCreator: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const IDLE_TIMEOUT_MS = 90_000;
const HEARTBEAT_INTERVAL_MS = 60_000;
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "pointerdown"] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const hadActivitySinceLastBeat = useRef<boolean>(true);

  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    hadActivitySinceLastBeat.current = true;
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, markActivity, { passive: true, capture: true });
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        markActivity();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const sendHeartbeat = async () => {
      const now = Date.now();
      const idleMs = now - lastActivityRef.current;
      const isActive = idleMs < IDLE_TIMEOUT_MS && hadActivitySinceLastBeat.current;

      hadActivitySinceLastBeat.current = false;

      try {
        const res = await fetch("/api/xp/heartbeat", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: isActive, idleSeconds: Math.floor(idleMs / 1000) }),
        });
        if (res.ok) {
          const data = await res.json();
          setUser(prev => prev ? {
            ...prev,
            xp: data.xp,
            level: data.level,
            levelTitle: data.levelTitle || prev.levelTitle,
            totalMinutes: data.totalMinutes,
          } : null);
        }
      } catch {}
    };

    sendHeartbeat();

    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, markActivity, true);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user?.id, markActivity]);

  async function checkAuth() {
    try {
      const userData = await authApi.me();
      setUser(userData);
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const userData = await authApi.login(email, password);
    setUser(userData);
    queryClient.invalidateQueries();
  }

  async function adminLogin(email: string, password: string) {
    const userData = await authApi.adminLogin(email, password);
    setUser(userData);
    queryClient.invalidateQueries();
  }

  async function signup(email: string, password: string, name: string, dateOfBirth: string, parentalConsent?: boolean) {
    const userData = await authApi.signup({ email, password, name, dateOfBirth, parentalConsent });
    setUser(userData);
    queryClient.invalidateQueries();
  }

  async function logout() {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    await authApi.logout();
    setUser(null);
    queryClient.clear();
  }

  function updateXp(xp: number, level: number, totalMinutes: number) {
    setUser(prev => prev ? { ...prev, xp, level, totalMinutes } : null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        adminLogin,
        signup,
        logout,
        updateXp,
        isStudent: user?.accountType === "student",
        isCreator: user?.accountType === "creator" || user?.role === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
