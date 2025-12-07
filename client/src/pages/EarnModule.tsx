import { Layout } from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { 
  DollarSign, TrendingUp, Clock, ArrowUpRight, ArrowDownRight,
  ChevronRight, CreditCard, Gift, ShoppingBag, BarChart3
} from "lucide-react";

export default function EarnModule() {
  const { isAuthenticated } = useAuth();

  const { data: revenue, isLoading } = useQuery({
    queryKey: ["ecosystem", "revenue"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/ecosystem/revenue");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const revenueStreams = [
    { name: "Content Views", icon: BarChart3, description: "Earn from views on your published content" },
    { name: "Tips & Donations", icon: Gift, description: "Receive tips from your supporters" },
    { name: "Ad Revenue Share", icon: TrendingUp, description: "Share in advertising revenue" },
    { name: "Merch Sales", icon: ShoppingBag, description: "Sell MAD-Ts merchandise" },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <header className="mb-8">
            <Link 
              href="/ecosystem" 
              className="text-zinc-400 hover:text-white text-sm mb-4 inline-flex items-center gap-2"
              data-testid="link-back-ecosystem"
            >
              <ChevronRight className="w-4 h-4 rotate-180" /> Back to Ecosystem
            </Link>
            <div className="flex items-center gap-3 mt-4">
              <div className="w-12 h-12 bg-white flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-3xl font-black" data-testid="text-page-title">EARN</h1>
                <p className="text-zinc-400 font-mono text-sm">
                  Monetize your creative work
                </p>
              </div>
            </div>
          </header>

          {!isAuthenticated ? (
            <div className="text-center py-16 bg-zinc-900 border-4 border-zinc-800">
              <DollarSign className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
              <h2 className="text-2xl font-black mb-2">Sign In to View Earnings</h2>
              <p className="text-zinc-400 mb-6">Track your revenue and manage payouts</p>
              <Link 
                href="/login" 
                className="px-6 py-3 bg-white text-black font-bold"
                data-testid="link-sign-in"
              >
                Sign In
              </Link>
            </div>
          ) : (
            <>
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-zinc-900 border-4 border-zinc-800 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-zinc-400 text-sm">Total Revenue</span>
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-4xl font-black" data-testid="text-total-revenue">
                    {formatCurrency(revenue?.totalRevenue || 0)}
                  </p>
                  <p className="text-xs text-zinc-500 mt-2">Lifetime earnings</p>
                </div>

                <div className="bg-zinc-900 border-4 border-zinc-800 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-zinc-400 text-sm">Pending</span>
                    <Clock className="w-5 h-5 text-zinc-400" />
                  </div>
                  <p className="text-4xl font-black text-zinc-400" data-testid="text-pending-revenue">
                    {formatCurrency(revenue?.pendingRevenue || 0)}
                  </p>
                  <p className="text-xs text-zinc-500 mt-2">Awaiting processing</p>
                </div>

                <div className="bg-zinc-900 border-4 border-zinc-800 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-zinc-400 text-sm">Available</span>
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-4xl font-black" data-testid="text-available-revenue">
                    {formatCurrency((revenue?.totalRevenue || 0) - (revenue?.pendingRevenue || 0))}
                  </p>
                  <button 
                    className="mt-4 w-full py-2 bg-white text-black font-bold text-sm"
                    data-testid="button-request-payout"
                  >
                    Request Payout
                  </button>
                </div>
              </section>

              <section className="mb-12">
                <h2 className="text-xl font-black mb-4" data-testid="text-section-streams">REVENUE STREAMS</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {revenueStreams.map((stream, index) => {
                    const Icon = stream.icon;
                    return (
                      <div
                        key={stream.name}
                        className="bg-zinc-900 border-4 border-zinc-800 p-4"
                        data-testid={`card-stream-${index}`}
                      >
                        <div className="w-10 h-10 flex items-center justify-center mb-3 bg-white">
                          <Icon className="w-5 h-5 text-black" />
                        </div>
                        <h3 className="font-bold mb-1">{stream.name}</h3>
                        <p className="text-xs text-zinc-400">{stream.description}</p>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="mb-12">
                <h2 className="text-xl font-black mb-4" data-testid="text-section-activity">RECENT ACTIVITY</h2>
                {revenue?.recentEvents?.length > 0 ? (
                  <div className="bg-zinc-900 border-4 border-zinc-800">
                    {revenue.recentEvents.map((event: any, index: number) => (
                      <div
                        key={event.id}
                        className={`flex items-center justify-between p-4 ${
                          index !== revenue.recentEvents.length - 1 ? "border-b border-zinc-800" : ""
                        }`}
                        data-testid={`row-event-${event.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-zinc-700 flex items-center justify-center">
                            <ArrowUpRight className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="font-bold text-sm capitalize">{event.type.replace("_", " ")}</p>
                            <p className="text-xs text-zinc-400">
                              {new Date(event.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span className="font-mono" data-testid={`text-event-amount-${event.id}`}>
                          +{formatCurrency(event.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-zinc-900 border-2 border-zinc-800">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
                    <h3 className="font-bold mb-2">No Revenue Yet</h3>
                    <p className="text-zinc-400 text-sm">
                      Start publishing content to earn revenue
                    </p>
                  </div>
                )}
              </section>

              <section>
                <h2 className="text-xl font-black mb-4" data-testid="text-section-payouts">PAYOUT HISTORY</h2>
                {revenue?.payouts?.length > 0 ? (
                  <div className="bg-zinc-900 border-4 border-zinc-800">
                    {revenue.payouts.map((payout: any, index: number) => (
                      <div
                        key={payout.id}
                        className={`flex items-center justify-between p-4 ${
                          index !== revenue.payouts.length - 1 ? "border-b border-zinc-800" : ""
                        }`}
                        data-testid={`row-payout-${payout.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-zinc-700 flex items-center justify-center">
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-sm capitalize">{payout.method}</p>
                            <p className="text-xs text-zinc-400">
                              {new Date(payout.requestedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono">{formatCurrency(payout.amount)}</span>
                          <p className={`text-xs ${
                            payout.status === "completed" ? "text-white" :
                            payout.status === "pending" ? "text-zinc-400" : "text-zinc-500"
                          }`} data-testid={`text-payout-status-${payout.id}`}>
                            {payout.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-zinc-900 border-2 border-zinc-800">
                    <CreditCard className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
                    <h3 className="font-bold mb-2">No Payouts Yet</h3>
                    <p className="text-zinc-400 text-sm">
                      Request a payout when you have available funds
                    </p>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
