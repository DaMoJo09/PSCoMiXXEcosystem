import { ReactNode, useState } from "react";
import { useSubscription } from "@/hooks/use-subscription";
import { UpgradeModal } from "./UpgradeModal";
import { Lock } from "lucide-react";

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
        className="cursor-pointer opacity-60 hover:opacity-80 transition-opacity relative"
        title={`Upgrade to unlock ${featureName}`}
      >
        {children}
        {showLockIcon && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Lock className="w-6 h-6 text-white" />
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
      >
        {children}
        {!hasAccess && (
          <Lock className="w-3 h-3 ml-1 inline-block" />
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
