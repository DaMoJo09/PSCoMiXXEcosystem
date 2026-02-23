import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { ArrowLeft, ShoppingBag, DollarSign, Package, Calendar, TrendingUp, Download } from "lucide-react";
import { marketplaceApi } from "@/lib/api";
import { useLocation } from "wouter";
import { format } from "date-fns";

const formatPrice = (cents: number) => (cents / 100).toFixed(2);

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500 text-black",
  completed: "bg-green-500 text-black",
  failed: "bg-red-500 text-white",
};

const TYPE_GRADIENTS: Record<string, string> = {
  comic: "from-cyan-900 to-cyan-700",
  card: "from-fuchsia-900 to-fuchsia-700",
  vn: "from-yellow-900 to-yellow-700",
  cyoa: "from-green-900 to-green-700",
  cover: "from-orange-900 to-orange-700",
  motion: "from-purple-900 to-purple-700",
  asset_pack: "from-blue-900 to-blue-700",
};

export default function MarketplacePurchasesPage() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"purchases" | "sales">("purchases");

  const { data: purchases = [], isLoading: purchasesLoading } = useQuery({
    queryKey: ["marketplace-purchases"],
    queryFn: () => marketplaceApi.getPurchases(),
  });

  const { data: earningsData, isLoading: earningsLoading } = useQuery({
    queryKey: ["marketplace-earnings"],
    queryFn: () => marketplaceApi.getEarnings(),
  });

  const { data: myListings = [], isLoading: listingsLoading } = useQuery({
    queryKey: ["marketplace-my-listings"],
    queryFn: () => marketplaceApi.getMyListings(),
  });

  const handleDownload = async (listingId: string) => {
    try {
      const data = await marketplaceApi.getDownload(listingId);
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate("/marketplace")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-cyan-400 transition-colors mb-6 font-mono"
            data-testid="button-back-marketplace"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Marketplace
          </button>

          <div className="mb-10 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <ShoppingBag className="w-8 h-8 text-cyan-400" />
              <h1
                className="text-4xl md:text-5xl font-display font-bold uppercase tracking-tighter"
                data-testid="text-purchases-title"
              >
                MY ACCOUNT
              </h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Manage your purchases and sales
            </p>
          </div>

          <div className="flex items-center gap-2 mb-8 border-b-2 border-border">
            <button
              onClick={() => setActiveTab("purchases")}
              className={`px-6 py-3 text-sm font-bold uppercase tracking-wide transition-colors border-b-2 -mb-[2px] ${
                activeTab === "purchases"
                  ? "border-cyan-500 text-cyan-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tab-purchases"
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                My Purchases
              </span>
            </button>
            <button
              onClick={() => setActiveTab("sales")}
              className={`px-6 py-3 text-sm font-bold uppercase tracking-wide transition-colors border-b-2 -mb-[2px] ${
                activeTab === "sales"
                  ? "border-cyan-500 text-cyan-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tab-sales"
            >
              <span className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                My Sales
              </span>
            </button>
          </div>

          {activeTab === "purchases" && (
            <div data-testid="panel-purchases">
              {purchasesLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="border-2 border-border bg-card animate-pulse p-5">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-zinc-800" />
                        <div className="flex-1 space-y-2">
                          <div className="h-5 bg-zinc-800 w-1/3" />
                          <div className="h-4 bg-zinc-800 w-1/4" />
                        </div>
                        <div className="h-8 bg-zinc-800 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : purchases.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-border">
                  <Package className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground text-lg mb-2" data-testid="text-empty-purchases">
                    No purchases yet
                  </p>
                  <p className="text-muted-foreground/60 text-sm mb-6">
                    Browse the marketplace to find creative assets
                  </p>
                  <button
                    onClick={() => navigate("/marketplace")}
                    className="px-6 py-2.5 text-xs font-bold uppercase tracking-wide border-2 border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-black transition-colors"
                    data-testid="button-browse-marketplace"
                  >
                    Browse Marketplace
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {purchases.map((order: any) => {
                    const statusStyle = STATUS_STYLES[order.status] || "bg-zinc-600 text-white";
                    return (
                      <div
                        key={order.id}
                        className="border-2 border-border bg-card p-5 hover:border-cyan-500/50 transition-colors"
                        data-testid={`card-purchase-${order.id}`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          <div className="flex-1">
                            <h3
                              className="font-display font-bold text-lg mb-1"
                              data-testid={`text-purchase-title-${order.id}`}
                            >
                              {order.listingTitle || order.listing?.title || `Order #${order.id.slice(0, 8)}`}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-3.5 h-3.5" />
                                <span data-testid={`text-purchase-amount-${order.id}`}>
                                  ${formatPrice(order.amountInCents || 0)}
                                </span>
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                <span data-testid={`text-purchase-date-${order.id}`}>
                                  {order.createdAt
                                    ? format(new Date(order.createdAt), "MMM d, yyyy")
                                    : "—"}
                                </span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${statusStyle}`}
                              data-testid={`badge-purchase-status-${order.id}`}
                            >
                              {order.status}
                            </span>

                            {order.status === "completed" && order.listingId && (
                              <button
                                onClick={() => handleDownload(order.listingId)}
                                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wide border-2 border-green-500 text-green-400 hover:bg-green-500 hover:text-black transition-colors"
                                data-testid={`button-download-${order.id}`}
                              >
                                <Download className="w-3.5 h-3.5" />
                                Download
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "sales" && (
            <div data-testid="panel-sales">
              {earningsLoading ? (
                <div className="border-2 border-border bg-card animate-pulse p-6 mb-8">
                  <div className="h-6 bg-zinc-800 w-1/4 mb-2" />
                  <div className="h-10 bg-zinc-800 w-1/3" />
                </div>
              ) : (
                <div className="border-2 border-green-500/30 bg-card p-6 mb-8" data-testid="card-earnings-summary">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <TrendingUp className="w-4 h-4" />
                    <span className="font-bold uppercase tracking-wide">Total Earnings</span>
                  </div>
                  <p
                    className="text-4xl font-display font-bold text-green-400"
                    data-testid="text-total-earnings"
                  >
                    ${formatPrice(earningsData?.totalEarnings || 0)}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-display font-bold uppercase tracking-tight">
                  My Listings
                </h2>
                <button
                  onClick={() => navigate("/marketplace/sell")}
                  className="px-5 py-2.5 text-xs font-bold uppercase tracking-wide bg-cyan-500 text-black hover:bg-cyan-400 transition-colors flex items-center gap-2"
                  data-testid="button-create-listing"
                >
                  <Package className="w-3.5 h-3.5" />
                  Create Listing
                </button>
              </div>

              {listingsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="border-2 border-border bg-card animate-pulse">
                      <div className="aspect-[4/3] bg-zinc-800" />
                      <div className="p-4 space-y-3">
                        <div className="h-5 bg-zinc-800 w-3/4" />
                        <div className="h-4 bg-zinc-800 w-1/2" />
                        <div className="h-8 bg-zinc-800 w-full mt-2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : myListings.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-border">
                  <Package className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground text-lg mb-2" data-testid="text-empty-listings">
                    No listings yet - start selling!
                  </p>
                  <p className="text-muted-foreground/60 text-sm mb-6">
                    Share your creative work with the community
                  </p>
                  <button
                    onClick={() => navigate("/marketplace/sell")}
                    className="px-6 py-2.5 text-xs font-bold uppercase tracking-wide border-2 border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-black transition-colors"
                    data-testid="button-start-selling"
                  >
                    Start Selling
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {myListings.map((listing: any) => {
                    const gradient = TYPE_GRADIENTS[listing.type] || "from-zinc-800 to-zinc-600";
                    const statusStyle = listing.status === "active"
                      ? "bg-green-500 text-black"
                      : listing.status === "draft"
                      ? "bg-yellow-500 text-black"
                      : "bg-zinc-600 text-white";

                    return (
                      <div
                        key={listing.id}
                        className="border-2 border-border bg-card hover:border-cyan-500/50 transition-colors"
                        data-testid={`card-my-listing-${listing.id}`}
                      >
                        <div className="aspect-[4/3] relative overflow-hidden">
                          {listing.thumbnailUrl ? (
                            <img
                              src={listing.thumbnailUrl}
                              alt={listing.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                              <Package className="w-12 h-12 text-white/20" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2">
                            <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${statusStyle}`}>
                              {listing.status || "active"}
                            </span>
                          </div>
                        </div>

                        <div className="p-4 border-t-2 border-border">
                          <h3
                            className="font-display font-bold text-lg mb-1 truncate"
                            data-testid={`text-my-listing-title-${listing.id}`}
                          >
                            {listing.title}
                          </h3>

                          <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                            <span className="flex items-center gap-1 text-green-400 font-bold">
                              <DollarSign className="w-3.5 h-3.5" />
                              {formatPrice(listing.priceInCents || 0)}
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-3.5 h-3.5" />
                              {listing.salesCount || 0} sold
                            </span>
                          </div>

                          <button
                            onClick={() => navigate(`/marketplace/listing/${listing.id}`)}
                            className="w-full py-2 text-xs font-bold uppercase tracking-wide border-2 border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-black transition-colors flex items-center justify-center gap-2"
                            data-testid={`button-edit-listing-${listing.id}`}
                          >
                            Edit Listing
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
