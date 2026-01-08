import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { tierEntitlements, TierName } from "@shared/schema";

interface Subscription {
  tier: TierName;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export function useSubscription() {
  const { user, isAuthenticated } = useAuth();
  
  const { data: subscription, isLoading } = useQuery<Subscription | null>({
    queryKey: ["/api/stripe/subscription"],
    enabled: isAuthenticated,
  });

  const isAdmin = user?.role === "admin";
  const tier: TierName = subscription?.tier as TierName || "free";
  const entitlements = tierEntitlements[tier] || tierEntitlements.free;

  const canAccess = (feature: keyof typeof tierEntitlements.free): boolean => {
    if (isAdmin) return true;
    const value = entitlements[feature];
    if (typeof value === "boolean") return value;
    return true;
  };

  const hasFeature = (feature: "export" | "commercial" | "ai" | "batch"): boolean => {
    if (isAdmin) return true;
    const value = entitlements[feature];
    return value === true || (typeof value === "string" && value !== "");
  };

  const getMaxProjects = (): number => {
    if (isAdmin) return -1;
    return entitlements.maxProjects;
  };

  const getMaxStorage = (): number => {
    if (isAdmin) return -1;
    return entitlements.maxStorage;
  };

  const isPro = (): boolean => {
    if (isAdmin) return true;
    return tier !== "free";
  };

  const getTierName = (): string => {
    if (isAdmin) return "Admin";
    const names: Record<TierName, string> = {
      free: "Free",
      creator: "Creator Pro",
      pro: "Pro",
      studio: "Studio Pro",
      lifetime: "Lifetime",
    };
    return names[tier] || "Free";
  };

  return {
    subscription,
    tier,
    entitlements,
    isLoading,
    isAdmin,
    canAccess,
    hasFeature,
    getMaxProjects,
    getMaxStorage,
    isPro,
    getTierName,
  };
}
