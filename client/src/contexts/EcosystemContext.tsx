import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { CreatorXp, Badge, UserBadge, Team, School, CreatorHub } from "@shared/schema";

export type CreatorTier = "learner" | "creator" | "mentor" | "professional" | "founder" | "community_builder";

export interface CreatorProgression {
  xp: CreatorXp | null;
  badges: (UserBadge & { badge: Badge })[];
  teams: Team[];
  schools: School[];
  hubs: CreatorHub[];
  nextTierXp: number;
  progressToNextTier: number;
}

interface EcosystemContextType {
  progression: CreatorProgression | null;
  isLoading: boolean;
  currentTier: CreatorTier;
  totalXp: number;
  level: number;
  earnXp: (amount: number, action: string, description?: string, referenceId?: string, referenceType?: string) => Promise<void>;
  refreshProgression: () => void;
  tierThresholds: Record<CreatorTier, number>;
  getTierDisplayName: (tier: CreatorTier) => string;
  getTierColor: (tier: CreatorTier) => string;
}

const tierThresholds: Record<CreatorTier, number> = {
  learner: 0,
  creator: 500,
  mentor: 2000,
  professional: 5000,
  founder: 15000,
  community_builder: 50000,
};

const tierDisplayNames: Record<CreatorTier, string> = {
  learner: "Learner",
  creator: "Creator",
  mentor: "Mentor",
  professional: "Professional",
  founder: "Founder",
  community_builder: "Community Builder",
};

const tierColors: Record<CreatorTier, string> = {
  learner: "#a1a1aa",
  creator: "#22c55e",
  mentor: "#3b82f6",
  professional: "#a855f7",
  founder: "#f59e0b",
  community_builder: "#ef4444",
};

const EcosystemContext = createContext<EcosystemContextType | null>(null);

export function EcosystemProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: progression, isLoading, refetch } = useQuery({
    queryKey: ["ecosystem", "progression", user?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/ecosystem/progression");
      return res.json();
    },
    enabled: isAuthenticated && !!user,
  });

  const earnXpMutation = useMutation({
    mutationFn: async (data: { 
      amount: number; 
      action: string; 
      description?: string; 
      referenceId?: string; 
      referenceType?: string 
    }) => {
      const res = await apiRequest("POST", "/api/ecosystem/xp", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ecosystem", "progression"] });
    },
  });

  const currentTier: CreatorTier = progression?.xp?.currentTier || "learner";
  const totalXp = progression?.xp?.totalXp || 0;
  const level = progression?.xp?.level || 1;

  const getNextTierXp = () => {
    const tiers = Object.keys(tierThresholds) as CreatorTier[];
    const currentIndex = tiers.indexOf(currentTier);
    if (currentIndex < tiers.length - 1) {
      return tierThresholds[tiers[currentIndex + 1]];
    }
    return tierThresholds.community_builder;
  };

  const getProgressToNextTier = () => {
    const nextXp = getNextTierXp();
    const currentThreshold = tierThresholds[currentTier];
    const xpInCurrentTier = totalXp - currentThreshold;
    const xpNeededForNext = nextXp - currentThreshold;
    return Math.min(100, Math.round((xpInCurrentTier / xpNeededForNext) * 100));
  };

  const earnXp = async (
    amount: number, 
    action: string, 
    description?: string, 
    referenceId?: string, 
    referenceType?: string
  ) => {
    await earnXpMutation.mutateAsync({ amount, action, description, referenceId, referenceType });
  };

  const getTierDisplayName = (tier: CreatorTier) => tierDisplayNames[tier];
  const getTierColor = (tier: CreatorTier) => tierColors[tier];

  return (
    <EcosystemContext.Provider
      value={{
        progression: progression ? {
          ...progression,
          nextTierXp: getNextTierXp(),
          progressToNextTier: getProgressToNextTier(),
        } : null,
        isLoading,
        currentTier,
        totalXp,
        level,
        earnXp,
        refreshProgression: refetch,
        tierThresholds,
        getTierDisplayName,
        getTierColor,
      }}
    >
      {children}
    </EcosystemContext.Provider>
  );
}

export function useEcosystem() {
  const context = useContext(EcosystemContext);
  if (!context) {
    throw new Error("useEcosystem must be used within EcosystemProvider");
  }
  return context;
}
