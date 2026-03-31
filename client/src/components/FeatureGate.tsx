import { ReactNode, useState } from "react";
import { useSubscription } from "@/hooks/use-subscription";
import { UpgradeModal } from "./UpgradeModal";
import { Lock, Crown } from "lucide-react";

interface FeatureGateProps {
  feature: "ai" | "export" | "commercial" | "batch";
  featureName: string;
  requiredTier?: "creator" | "pro" | "studio";
  children: ReactNode;
  fallback?: ReactNode;
  showLockIcon?: boolean;
}

export function FeatureGate({ 
  feature, 
  featureName, 
  requiredTier = "creator", 
  children, 
  fallback,
  showLockIcon = true 
}: FeatureGateProps) {
  const { hasFeature, isAdmin, isLoading } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (isLoading) {
    return <>{children}</>;
  }

  const hasAccess = hasFeature(feature);

  if (hasAccess || isAdmin) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <>
      <div 
        onClick={() => setShowUpgrade(true)}
        className="cursor-pointer opacity-60 hover:opacity-80 transition-opacity relative group"
        title={`Upgrade to unlock ${featureName}`}
        data-testid={`gate-${feature}`}
      >
        {children}
        {showLockIcon && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
            <Lock className="w-5 h-5 text-white mb-1" />
            <span className="text-[10px] font-bold text-white uppercase tracking-wider">Unlock {featureName}</span>
            <span className="text-[9px] text-cyan-400 font-mono mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Click to upgrade</span>
          </div>
        )}
      </div>
      <UpgradeModal 
        isOpen={showUpgrade} 
        onClose={() => setShowUpgrade(false)} 
        feature={featureName}
        requiredTier={requiredTier}
      />
    </>
  );
}

interface GatedButtonProps {
  feature: "ai" | "export" | "commercial" | "batch";
  featureName: string;
  requiredTier?: "creator" | "pro" | "studio";
  onClick: () => void;
  className?: string;
  children: ReactNode;
  disabled?: boolean;
}

export function GatedButton({
  feature,
  featureName,
  requiredTier = "creator",
  onClick,
  className = "",
  children,
  disabled = false,
}: GatedButtonProps) {
  const { hasFeature, isAdmin } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const hasAccess = hasFeature(feature) || isAdmin;

  const handleClick = () => {
    if (hasAccess) {
      onClick();
    } else {
      setShowUpgrade(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`${className} ${!hasAccess ? "relative" : ""}`}
        disabled={disabled}
        data-testid={`gated-${feature}`}
      >
        {children}
        {!hasAccess && (
          <span className="inline-flex items-center gap-1 ml-1">
            <Crown className="w-3 h-3 text-amber-500" />
          </span>
        )}
      </button>
      <UpgradeModal 
        isOpen={showUpgrade} 
        onClose={() => setShowUpgrade(false)} 
        feature={featureName}
        requiredTier={requiredTier}
      />
    </>
  );
}
