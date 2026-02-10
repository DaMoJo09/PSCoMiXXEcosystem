import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
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
  totalMinutes: number;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, dateOfBirth: string) => Promise<void>;
  logout: () => Promise<void>;
  updateXp: (xp: number, level: number, totalMinutes: number) => void;
  isStudent: boolean;
  isCreator: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = setInterval(async () => {
        try {
          const res = await fetch("/api/xp/heartbeat", {
            method: "POST",
            credentials: "include",
          });
          if (res.ok) {
            const data = await res.json();
            setUser(prev => prev ? { ...prev, xp: data.xp, level: data.level, totalMinutes: data.totalMinutes } : null);
          }
        } catch {}
      }, 60000);

      fetch("/api/xp/heartbeat", { method: "POST", credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) setUser(prev => prev ? { ...prev, xp: data.xp, level: data.level, totalMinutes: data.totalMinutes } : null);
        })
        .catch(() => {});

      return () => {
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      };
    }
  }, [user?.id]);

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

  async function signup(email: string, password: string, name: string, dateOfBirth: string) {
    const userData = await authApi.signup({ email, password, name, dateOfBirth });
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
