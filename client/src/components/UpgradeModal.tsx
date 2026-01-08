import { useState } from "react";
import { Crown, Zap, Star, Rocket, X } from "lucide-react";
import { Link } from "wouter";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
  requiredTier?: "creator" | "pro" | "studio";
}

export function UpgradeModal({ isOpen, onClose, feature, requiredTier = "creator" }: UpgradeModalProps) {
  if (!isOpen) return null;

  const tierInfo = {
    creator: { name: "Creator Pro", price: "$19.99/month", icon: Star },
    pro: { name: "Pro", price: "$29.99/month", icon: Star },
    studio: { name: "Studio Pro", price: "$49.99/month", icon: Rocket },
  };

  const info = tierInfo[requiredTier] || tierInfo.creator;
  const Icon = info.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" data-testid="modal-upgrade">
      <div className="relative w-full max-w-md mx-4 bg-black border-4 border-white p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-white hover:text-black border-2 border-white transition-colors"
          data-testid="button-close-upgrade"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-white flex items-center justify-center">
            <Crown className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Upgrade Required
          </h2>
        </div>

        <div className="space-y-4 mb-6">
          <p className="text-center text-zinc-300">
            <span className="font-bold text-white">{feature}</span> is a premium feature available on {info.name} and above.
          </p>

          <div className="p-4 border-2 border-white bg-zinc-900">
            <div className="flex items-center gap-3 mb-2">
              <Icon className="w-5 h-5" />
              <span className="font-black uppercase">{info.name}</span>
            </div>
            <p className="text-sm text-zinc-400">Starting at {info.price}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border-2 border-white font-black uppercase text-sm hover:bg-zinc-800 transition-colors"
            data-testid="button-cancel-upgrade"
          >
            Maybe Later
          </button>
          <Link href="/pricing" className="flex-1">
            <button
              className="w-full py-3 bg-white text-black border-2 border-white font-black uppercase text-sm hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
              data-testid="button-view-pricing"
            >
              <Zap className="w-4 h-4" />
              View Plans
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function useUpgradeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [feature, setFeature] = useState("");
  const [requiredTier, setRequiredTier] = useState<"creator" | "pro" | "studio">("creator");

  const showUpgradeModal = (featureName: string, tier: "creator" | "pro" | "studio" = "creator") => {
    setFeature(featureName);
    setRequiredTier(tier);
    setIsOpen(true);
  };

  const closeUpgradeModal = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    feature,
    requiredTier,
    showUpgradeModal,
    closeUpgradeModal,
  };
}
