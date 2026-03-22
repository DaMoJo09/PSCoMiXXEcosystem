import { Layout } from "@/components/layout/Layout";
import { useState, useEffect } from "react";
import { 
  Crown, Check, ArrowLeft, Zap, Star, Rocket, Sparkles, ExternalLink, Shield, Trophy
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";

interface Price {
  id: string;
  unit_amount: number;
  currency: string;
  recurring: { interval: string } | null;
  active: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string;
  active: boolean;
  metadata: Record<string, string>;
  prices: Price[];
}

interface Subscription {
  tier: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

const TIERS = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    interval: "forever",
    icon: Zap,
    badge: null,
    features: [
      "Basic comic creation tools",
      "3 projects",
      "3 AI generations / day",
      "2 exports / month",
      "Community access",
      "XP progression + achievements",
    ],
  },
  {
    key: "creator",
    name: "Creator",
    price: "$9.99",
    interval: "month",
    icon: Star,
    badge: null,
    features: [
      "Everything in Free",
      "20 projects",
      "50 AI generations / day",
      "30 exports / month",
      "1 GB storage",
      "Export with watermark removal",
      "Starter asset packs",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: "$19.99",
    interval: "month",
    icon: Rocket,
    badge: "Best Value",
    features: [
      "Everything in Creator",
      "100 projects",
      "200 AI generations / day",
      "Unlimited exports",
      "5 GB storage",
      "No watermark",
      "Motion comic + animation export",
      "Commercial license",
      "Priority rendering",
      "Expanded asset library",
    ],
  },
  {
    key: "studio",
    name: "Studio",
    price: "$39.99",
    interval: "month",
    icon: Crown,
    badge: null,
    features: [
      "Everything in Pro",
      "Unlimited projects",
      "Unlimited AI generations",
      "20 GB storage",
      "Collaboration tools (coming soon)",
      "Early access features",
      "API / plugin access",
      "Advanced workflow tools",
    ],
  },
];

export default function PricingPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [productsRes, subRes] = await Promise.all([
        fetch("/api/stripe/products").then(r => r.json()),
        fetch("/api/stripe/subscription", { credentials: "include" }).then(r => r.ok ? r.json() : null),
      ]);
      setProducts(productsRes.data || []);
      setSubscription(subRes);
    } catch (error) {
      console.error("Failed to load pricing data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckout = async (priceId: string) => {
    setCheckoutLoading(priceId);
    try {
      const response = await apiRequest("POST", "/api/stripe/checkout", { priceId });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to start checkout");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      const response = await apiRequest("POST", "/api/stripe/portal", {});
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to open billing portal");
    }
  };

  const getCurrentTier = () => subscription?.tier || "free";

  const findProductPrice = (tierKey: string): { priceId: string; amount: number } | null => {
    for (const product of products) {
      const meta = product.metadata || {};
      if (meta.tier === tierKey) {
        const price = product.prices.find(p => p.active);
        if (price) return { priceId: price.id, amount: price.unit_amount };
      }
    }
    const nameMap: Record<string, string[]> = {
      creator: ['creator'],
      pro: ['pro'],
      studio: ['studio'],
      lifetime: ['lifetime', 'founder'],
    };
    const names = nameMap[tierKey] || [];
    for (const product of products) {
      if (names.some(n => product.name.toLowerCase().includes(n))) {
        const price = product.prices.find(p => p.active);
        if (price) return { priceId: price.id, amount: price.unit_amount };
      }
    }
    return null;
  };

  const foundersProduct = findProductPrice('lifetime');

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white">
        <header className="h-14 border-b-4 border-white flex items-center justify-between px-6 bg-black sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 hover:bg-white hover:text-black border-2 border-white transition-colors" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5" />
              <h1 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Pricing</h1>
            </div>
          </div>
          {subscription?.tier && subscription.tier !== "free" && (
            <button
              onClick={handleManageBilling}
              className="px-4 py-2 bg-zinc-800 text-white text-sm font-black flex items-center gap-2 border-2 border-white hover:bg-zinc-700 uppercase"
              data-testid="button-manage-billing"
            >
              <ExternalLink className="w-4 h-4" />
              Manage Billing
            </button>
          )}
        </header>

        <div className="max-w-7xl mx-auto p-6 md:p-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Create. Level Up. Unlock More.
            </h2>
            <p className="text-zinc-400 mt-3 max-w-xl mx-auto text-sm">
              Every plan includes XP progression, achievements, and unlockable content packs. Pick the tier that matches your ambition.
            </p>
          </div>

          {subscription && subscription.tier !== "free" && (
            <div className="mb-8 p-6 border-4 border-white bg-zinc-900">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-black text-xl uppercase" data-testid="text-current-plan">Current Plan: {subscription.tier.toUpperCase()}</h2>
                  <p className="text-zinc-400 mt-1">
                    Status: <span className={subscription.status === "active" ? "text-green-400" : "text-yellow-400"}>{subscription.status}</span>
                    {subscription.currentPeriodEnd && (
                      <span className="ml-2">
                        {subscription.cancelAtPeriodEnd ? "Cancels" : "Renews"} on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>
                <div className="p-3 bg-white text-black">
                  <Crown className="w-6 h-6" />
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Sparkles className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {TIERS.map((tier) => {
                const isCurrentPlan = getCurrentTier() === tier.key;
                const productPrice = tier.key !== "free" ? findProductPrice(tier.key) : null;
                const TierIcon = tier.icon;
                const isPro = tier.key === "pro";

                return (
                  <div
                    key={tier.key}
                    className={`border-4 bg-zinc-900 p-6 flex flex-col relative ${isPro ? "border-green-500" : "border-white"}`}
                    data-testid={`card-tier-${tier.key}`}
                  >
                    {tier.badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-black px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                        {tier.badge}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-4">
                      <TierIcon className="w-5 h-5" />
                      <h3 className="font-black text-lg uppercase">{tier.name}</h3>
                    </div>
                    <div className="mb-5">
                      <span className="text-3xl font-black">{productPrice ? `$${(productPrice.amount / 100).toFixed(2)}` : tier.price}</span>
                      <span className="text-zinc-400 ml-1 text-sm">/{tier.interval}</span>
                    </div>
                    <ul className="space-y-2.5 flex-1">
                      {tier.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${isPro ? "text-green-400" : "text-zinc-400"}`} />
                          <span className="text-xs text-zinc-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {tier.key === "free" ? (
                      <button
                        disabled={isCurrentPlan}
                        className="mt-5 w-full py-3 border-2 border-white font-black uppercase text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white hover:text-black transition-colors"
                        data-testid="button-free-plan"
                      >
                        {isCurrentPlan ? "Current Plan" : "Free Forever"}
                      </button>
                    ) : (
                      <button
                        onClick={() => productPrice && handleCheckout(productPrice.priceId)}
                        disabled={isCurrentPlan || !productPrice || checkoutLoading === productPrice?.priceId}
                        className={`mt-5 w-full py-3 font-black uppercase text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          isPro
                            ? "bg-green-500 text-black border-2 border-green-500 hover:bg-green-400"
                            : "border-2 border-white hover:bg-white hover:text-black"
                        }`}
                        data-testid={`button-${tier.key}-plan`}
                      >
                        {checkoutLoading === productPrice?.priceId ? (
                          <span className="flex items-center justify-center gap-2">
                            <Sparkles className="w-4 h-4 animate-spin" />
                            Loading...
                          </span>
                        ) : isCurrentPlan ? (
                          "Current Plan"
                        ) : !productPrice ? (
                          "Coming Soon"
                        ) : (
                          "Get Started"
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-8 p-6 border-4 border-amber-500 bg-zinc-900 relative">
            <div className="absolute -top-3 left-6 bg-amber-500 text-black px-3 py-1 text-[10px] font-black uppercase tracking-wider">
              Limited Drop
            </div>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Trophy className="w-6 h-6 text-amber-400" />
                  <h3 className="font-black text-xl uppercase">Founders Pass</h3>
                  <span className="text-3xl font-black text-amber-400 ml-auto md:ml-4">
                    {foundersProduct ? `$${(foundersProduct.amount / 100).toFixed(0)}` : "$199"}
                  </span>
                  <span className="text-zinc-400 text-sm">one-time</span>
                </div>
                <p className="text-zinc-400 text-sm mb-3">
                  Lifetime Pro access for early believers. Limited to first 300 users.
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  {[
                    "Lifetime Pro access",
                    "Founders badge",
                    "Early feature access",
                    "Exclusive asset drops",
                    "No recurring payments",
                    "Priority feature requests",
                  ].map((f, i) => (
                    <span key={i} className="flex items-center gap-1.5 text-xs text-zinc-300">
                      <Check className="w-3 h-3 text-amber-400" />{f}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => foundersProduct && handleCheckout(foundersProduct.priceId)}
                disabled={getCurrentTier() === "lifetime" || !foundersProduct || checkoutLoading === foundersProduct?.priceId}
                className="px-8 py-3 bg-amber-500 text-black font-black uppercase text-sm hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                data-testid="button-founders-plan"
              >
                {getCurrentTier() === "lifetime" ? "You're a Founder" : !foundersProduct ? "Coming Soon" : "Claim Founders Pass"}
              </button>
            </div>
          </div>

          <div className="mt-8 p-6 border-4 border-zinc-700 bg-zinc-900">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-zinc-400" />
              <h3 className="font-black uppercase text-sm text-zinc-400">Earn XP on Every Plan</h3>
            </div>
            <p className="text-zinc-500 text-sm">
              Every user earns XP by creating, publishing, and engaging. Level up to unlock free content packs, bonus AI credits, 
              achievement badges, and exclusive rewards. Your subscription controls your access level. XP controls your progression.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
