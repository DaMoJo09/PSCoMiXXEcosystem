import { Layout } from "@/components/layout/Layout";
import { useState, useEffect } from "react";
import { 
  Crown, 
  Check, 
  ArrowLeft,
  Zap,
  Star,
  Rocket,
  Sparkles,
  ExternalLink
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

const tierFeatures: Record<string, string[]> = {
  free: [
    "Basic comic creation tools",
    "5 projects limit",
    "Standard export quality",
    "Community access",
  ],
  creator: [
    "Everything in Free",
    "Unlimited projects",
    "HD export quality",
    "Priority support",
    "Advanced AI assistance",
    "Custom templates",
  ],
  studio: [
    "Everything in Creator Pro",
    "4K export quality",
    "Team collaboration (5 seats)",
    "White-label exports",
    "API access",
    "Dedicated support",
    "Early feature access",
  ],
  lifetime: [
    "All Studio Pro features",
    "Lifetime access",
    "No recurring payments",
    "Founding member badge",
    "Priority feature requests",
  ],
};

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

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getCurrentTier = () => subscription?.tier || "free";

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

        <div className="max-w-6xl mx-auto p-8">
          {subscription && subscription.tier !== "free" && (
            <div className="mb-8 p-6 border-4 border-white bg-zinc-900">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-black text-xl uppercase">Current Plan: {subscription.tier.toUpperCase()}</h2>
                  <p className="text-zinc-400 mt-1">
                    Status: <span className={subscription.status === "active" ? "text-green-400" : "text-yellow-400"}>{subscription.status}</span>
                    {subscription.currentPeriodEnd && (
                      <span className="ml-2">
                        • {subscription.cancelAtPeriodEnd ? "Cancels" : "Renews"} on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border-4 border-white bg-zinc-900 p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="w-6 h-6" />
                  <h3 className="font-black text-xl uppercase">Free</h3>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-black">$0</span>
                  <span className="text-zinc-400 ml-2">/forever</span>
                </div>
                <ul className="space-y-3 flex-1">
                  {tierFeatures.free.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-4 h-4 mt-1 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  disabled={getCurrentTier() === "free"}
                  className="mt-6 w-full py-3 border-2 border-white font-black uppercase text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white hover:text-black transition-colors"
                  data-testid="button-free-plan"
                >
                  {getCurrentTier() === "free" ? "Current Plan" : "Downgrade"}
                </button>
              </div>

              {products.map((product) => {
                const price = product.prices.find(p => p.active);
                const isCreatorPro = product.name.toLowerCase().includes("creator");
                const isStudioPro = product.name.toLowerCase().includes("studio");
                const tierKey = isCreatorPro ? "creator" : isStudioPro ? "studio" : "creator";
                const isCurrentPlan = getCurrentTier() === tierKey || (isCreatorPro && getCurrentTier() === "creator") || (isStudioPro && getCurrentTier() === "studio");

                return (
                  <div 
                    key={product.id} 
                    className={`border-4 bg-zinc-900 p-6 flex flex-col ${isStudioPro ? "border-white relative" : "border-white"}`}
                  >
                    {isStudioPro && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-black px-3 py-1 text-xs font-black uppercase">
                        Most Popular
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-4">
                      {isStudioPro ? <Rocket className="w-6 h-6" /> : <Star className="w-6 h-6" />}
                      <h3 className="font-black text-xl uppercase">{product.name}</h3>
                    </div>
                    {price && (
                      <div className="mb-6">
                        <span className="text-4xl font-black">{formatPrice(price.unit_amount, price.currency)}</span>
                        <span className="text-zinc-400 ml-2">/{price.recurring?.interval || "month"}</span>
                      </div>
                    )}
                    <p className="text-sm text-zinc-400 mb-4">{product.description}</p>
                    <ul className="space-y-3 flex-1">
                      {tierFeatures[tierKey]?.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-4 h-4 mt-1 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => price && handleCheckout(price.id)}
                      disabled={isCurrentPlan || !price || checkoutLoading === price?.id}
                      className={`mt-6 w-full py-3 font-black uppercase text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        isStudioPro 
                          ? "bg-white text-black border-2 border-white hover:bg-zinc-200" 
                          : "border-2 border-white hover:bg-white hover:text-black"
                      }`}
                      data-testid={`button-${tierKey}-plan`}
                    >
                      {checkoutLoading === price?.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <Sparkles className="w-4 h-4 animate-spin" />
                          Loading...
                        </span>
                      ) : isCurrentPlan ? (
                        "Current Plan"
                      ) : (
                        "Upgrade Now"
                      )}
                    </button>
                  </div>
                );
              })}

              {products.length === 0 && (
                <>
                  <div className="border-4 border-white bg-zinc-900 p-6 flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                      <Star className="w-6 h-6" />
                      <h3 className="font-black text-xl uppercase">Creator Pro</h3>
                    </div>
                    <div className="mb-6">
                      <span className="text-4xl font-black">$19.99</span>
                      <span className="text-zinc-400 ml-2">/month</span>
                    </div>
                    <ul className="space-y-3 flex-1">
                      {tierFeatures.creator.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-4 h-4 mt-1 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      disabled
                      className="mt-6 w-full py-3 border-2 border-white font-black uppercase text-sm opacity-50 cursor-not-allowed"
                      data-testid="button-creator-plan-pending"
                    >
                      Coming Soon
                    </button>
                  </div>
                  <div className="border-4 border-white bg-zinc-900 p-6 flex flex-col relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-black px-3 py-1 text-xs font-black uppercase">
                      Most Popular
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <Rocket className="w-6 h-6" />
                      <h3 className="font-black text-xl uppercase">Studio Pro</h3>
                    </div>
                    <div className="mb-6">
                      <span className="text-4xl font-black">$49.99</span>
                      <span className="text-zinc-400 ml-2">/month</span>
                    </div>
                    <ul className="space-y-3 flex-1">
                      {tierFeatures.studio.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-4 h-4 mt-1 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      disabled
                      className="mt-6 w-full py-3 bg-white text-black border-2 border-white font-black uppercase text-sm opacity-50 cursor-not-allowed"
                      data-testid="button-studio-plan-pending"
                    >
                      Coming Soon
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="mt-12 p-6 border-4 border-white bg-zinc-900">
            <div className="flex items-center gap-3 mb-4">
              <Crown className="w-6 h-6" />
              <h3 className="font-black text-xl uppercase">Lifetime License</h3>
            </div>
            <p className="text-zinc-400 mb-4">
              Get lifetime access to all features with a one-time payment. Available exclusively through AppSumo deals.
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {tierFeatures.lifetime.map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-1 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-zinc-500">
              Have an AppSumo code? Redeem it in your Settings page.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
