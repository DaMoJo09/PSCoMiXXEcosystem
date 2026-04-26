import { useState } from "react";
import { Crown, Zap, Star, Rocket, X, Sparkles, Film, Package, Shield, Check } from "lucide-react";
import { Link } from "wouter";
import { shouldBlockDirectPayments } from "@/lib/platform";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
  requiredTier?: "creator" | "pro" | "studio";
  usageInfo?: { used: number; limit: number } | null;
}

const FEATURE_DETAILS: Record<string, { headline: string; description: string; benefits: string[]; tier: "creator" | "pro" | "studio" }> = {
  "AI Generation": {
    headline: "You've hit your AI generation limit",
    description: "Upgrade to keep creating with AI-powered tools.",
    benefits: ["50 AI generations/day on Creator", "200/day on Pro", "Unlimited on Studio"],
    tier: "creator",
  },
  "Export": {
    headline: "You've used all your exports this month",
    description: "Upgrade to export more and remove watermarks.",
    benefits: ["30 exports/month on Creator", "Unlimited on Pro", "No watermark on Pro+"],
    tier: "creator",
  },
  "Project Limit": {
    headline: "You've reached your project limit",
    description: "Upgrade to create more projects and unlock full creative potential.",
    benefits: ["20 projects on Creator", "100 projects on Pro", "Unlimited on Studio"],
    tier: "creator",
  },
  "Motion Export": {
    headline: "Motion Export is a Pro feature",
    description: "Export animated comics and motion graphics as video files with full timeline control.",
    benefits: ["Video & GIF export", "Full timeline audio sync", "Up to 4K resolution", "Keyframe animation export"],
    tier: "pro",
  },
  "Batch Export": {
    headline: "Batch Export is a Pro feature",
    description: "Export all pages at once in multiple formats with a single click.",
    benefits: ["Export all pages simultaneously", "Multiple format options", "Print-ready 300 DPI output", "Automated file naming"],
    tier: "pro",
  },
  "Commercial License": {
    headline: "Commercial License requires Pro",
    description: "Sell your creations, use them commercially, and retain full rights.",
    benefits: ["Full commercial usage rights", "Marketplace selling enabled", "Print-on-demand access", "No attribution required"],
    tier: "pro",
  },
};

export function UpgradeModal({ isOpen, onClose, feature, requiredTier = "creator", usageInfo }: UpgradeModalProps) {
  if (!isOpen) return null;

  // App Store compliance: in the native iOS/Android shell we can't show
  // prices or link out to web checkout for digital goods. Render a quieter
  // version that explains the limit without the upgrade CTA.
  const blockPayments = shouldBlockDirectPayments();

  const tierInfo = {
    creator: { name: "Creator", price: "$9.99/month", icon: Star },
    pro: { name: "Pro", price: "$19.99/month", icon: Rocket },
    studio: { name: "Studio", price: "$39.99/month", icon: Crown },
  };

  const details = FEATURE_DETAILS[feature];
  const effectiveTier = requiredTier || details?.tier || "creator";
  const info = tierInfo[effectiveTier] || tierInfo.creator;
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
          <h2 className="text-xl font-black uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {details?.headline || "Upgrade Required"}
          </h2>
        </div>

        <div className="space-y-4 mb-6">
          {usageInfo && usageInfo.limit > 0 && (
            <div className="p-3 border-2 border-red-500/50 bg-red-500/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-red-400 uppercase">Usage</span>
                <span className="text-sm font-black text-white">{usageInfo.used}/{usageInfo.limit}</span>
              </div>
              <div className="w-full h-2 bg-zinc-800">
                <div className="h-full bg-red-500" style={{ width: "100%" }} />
              </div>
            </div>
          )}

          <p className="text-center text-zinc-300 text-sm">
            {details?.description || (
              <><span className="font-bold text-white">{feature}</span> is available on a higher plan.</>
            )}
          </p>

          {!blockPayments && (
            <div className="p-4 border-2 border-white bg-zinc-900">
              <div className="flex items-center gap-3 mb-3">
                <Icon className="w-5 h-5" />
                <span className="font-black uppercase">{info.name}</span>
                <span className="ml-auto text-sm text-zinc-400">{info.price}</span>
              </div>
              {details?.benefits && (
                <ul className="space-y-1.5">
                  {details.benefits.map((b, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-zinc-300">
                      <Check className="w-3 h-3 text-green-400 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {blockPayments ? (
          <button
            onClick={onClose}
            className="w-full py-3 bg-white text-black border-2 border-white font-black uppercase text-sm hover:bg-zinc-200 transition-colors"
            data-testid="button-close-upgrade-native"
          >
            Got It
          </button>
        ) : (
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
                onClick={onClose}
                className="w-full py-3 bg-white text-black border-2 border-white font-black uppercase text-sm hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                data-testid="button-view-pricing"
              >
                <Zap className="w-4 h-4" />
                View Plans
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export function useUpgradeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [feature, setFeature] = useState("");
  const [requiredTier, setRequiredTier] = useState<"creator" | "pro" | "studio">("creator");
  const [usageInfo, setUsageInfo] = useState<{ used: number; limit: number } | null>(null);

  const showUpgradeModal = (featureName: string, tier: "creator" | "pro" | "studio" = "creator", usage?: { used: number; limit: number }) => {
    setFeature(featureName);
    setRequiredTier(tier);
    setUsageInfo(usage || null);
    setIsOpen(true);
  };

  const closeUpgradeModal = () => {
    setIsOpen(false);
    setUsageInfo(null);
  };

  return {
    isOpen,
    feature,
    requiredTier,
    usageInfo,
    showUpgradeModal,
    closeUpgradeModal,
  };
}

interface ProFeatureDiscoveryProps {
  isOpen: boolean;
  onClose: () => void;
  featureKey: "motion_export" | "batch_export" | "commercial_license";
}

const DISCOVERY_FEATURES: Record<string, { title: string; description: string; icon: typeof Film; benefits: string[]; tier: "creator" | "pro" | "studio" }> = {
  motion_export: {
    title: "Motion Export",
    description: "Turn your comics into animated videos with timeline control, audio sync, and keyframe animations.",
    icon: Film,
    benefits: ["Export as MP4 or GIF", "Timeline-based animation", "Audio track support", "Keyframe interpolation"],
    tier: "pro",
  },
  batch_export: {
    title: "Batch Operations",
    description: "Export all pages at once, apply effects in bulk, and streamline your production workflow.",
    icon: Package,
    benefits: ["Export all pages simultaneously", "Bulk apply filters & effects", "Multi-format output", "Automated naming"],
    tier: "pro",
  },
  commercial_license: {
    title: "Commercial License",
    description: "Sell your creations, use them in commercial projects, and retain full ownership rights.",
    icon: Shield,
    benefits: ["Full commercial usage rights", "Sell on marketplace", "Print-on-demand ready", "No attribution needed"],
    tier: "pro",
  },
};

export function ProFeatureDiscovery({ isOpen, onClose, featureKey }: ProFeatureDiscoveryProps) {
  if (!isOpen) return null;

  const feat = DISCOVERY_FEATURES[featureKey];
  if (!feat) return null;

  // App Store compliance: same payment-link/price suppression as UpgradeModal.
  const blockPayments = shouldBlockDirectPayments();

  const FeatureIcon = feat.icon;
  const tierInfo = {
    creator: { name: "Creator", price: "$9.99/mo" },
    pro: { name: "Pro", price: "$19.99/mo" },
    studio: { name: "Studio", price: "$39.99/mo" },
  };
  const tier = tierInfo[feat.tier];

  const handleDismiss = () => {
    try {
      const seen = JSON.parse(localStorage.getItem("pscomixx_seen_features") || "[]");
      if (!seen.includes(featureKey)) {
        seen.push(featureKey);
        localStorage.setItem("pscomixx_seen_features", JSON.stringify(seen));
      }
    } catch {}
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" data-testid="modal-pro-discovery">
      <div className="relative w-full max-w-md mx-4 bg-black border-4 border-cyan-500 p-6">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 hover:bg-white hover:text-black border-2 border-white transition-colors"
          data-testid="button-close-discovery"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 border-4 border-cyan-500 flex items-center justify-center bg-cyan-500/10">
            <FeatureIcon className="w-7 h-7 text-cyan-400" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-1">Pro Feature</div>
            <h2 className="text-xl font-black uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {feat.title}
            </h2>
          </div>
        </div>

        <p className="text-zinc-300 text-sm mb-5">
          {feat.description}
        </p>

        <div className="p-4 border-2 border-zinc-700 bg-zinc-900 mb-6">
          <div className="text-[10px] font-bold text-zinc-500 uppercase mb-3">What you get</div>
          <ul className="space-y-2">
            {feat.benefits.map((b, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-white">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                {b}
              </li>
            ))}
          </ul>
        </div>

        {blockPayments ? (
          <button
            onClick={handleDismiss}
            className="w-full py-3 bg-cyan-500 text-black border-2 border-cyan-500 font-black uppercase text-sm hover:bg-cyan-400 transition-colors"
            data-testid="button-dismiss-discovery-native"
          >
            Got It
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={handleDismiss}
              className="flex-1 py-3 border-2 border-white font-black uppercase text-sm hover:bg-zinc-800 transition-colors"
              data-testid="button-dismiss-discovery"
            >
              Got It
            </button>
            <Link href="/pricing" className="flex-1">
              <button
                onClick={handleDismiss}
                className="w-full py-3 bg-cyan-500 text-black border-2 border-cyan-500 font-black uppercase text-sm hover:bg-cyan-400 transition-colors flex items-center justify-center gap-2"
                data-testid="button-discovery-upgrade"
              >
                <Zap className="w-4 h-4" />
                {tier.name} {tier.price}
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export function useProFeatureDiscovery() {
  const [isOpen, setIsOpen] = useState(false);
  const [featureKey, setFeatureKey] = useState<"motion_export" | "batch_export" | "commercial_license">("motion_export");

  const showDiscovery = (key: "motion_export" | "batch_export" | "commercial_license") => {
    try {
      const seen = JSON.parse(localStorage.getItem("pscomixx_seen_features") || "[]");
      if (seen.includes(key)) return false;
    } catch {}
    setFeatureKey(key);
    setIsOpen(true);
    return true;
  };

  return {
    isOpen,
    featureKey,
    showDiscovery,
    closeDiscovery: () => setIsOpen(false),
  };
}
