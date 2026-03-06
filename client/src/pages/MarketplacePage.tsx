import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Search, ShoppingBag, Filter, Tag, Star, Eye, DollarSign, Package, Gift } from "lucide-react";
import { marketplaceApi } from "@/lib/api";
import { useLocation } from "wouter";

const TYPE_FILTERS = [
  { id: "", label: "All" },
  { id: "comic", label: "Comic" },
  { id: "card", label: "Card" },
  { id: "vn", label: "Visual Novel" },
  { id: "cyoa", label: "CYOA" },
  { id: "cover", label: "Cover" },
  { id: "motion", label: "Motion" },
  { id: "asset_pack", label: "Asset Pack" },
];

const PRICING_FILTERS = [
  { id: "", label: "All Prices" },
  { id: "free", label: "Free" },
  { id: "paid", label: "Paid" },
];

const TYPE_COLORS: Record<string, string> = {
  comic: "bg-cyan-500 text-black",
  card: "bg-fuchsia-500 text-black",
  vn: "bg-yellow-500 text-black",
  cyoa: "bg-green-500 text-black",
  cover: "bg-orange-500 text-black",
  motion: "bg-purple-500 text-white",
  asset_pack: "bg-blue-500 text-white",
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

const formatPrice = (cents: number) => (cents / 100).toFixed(2);

export default function MarketplacePage() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedPricing, setSelectedPricing] = useState<string>("");

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["marketplace-listings", selectedType, searchQuery, selectedPricing],
    queryFn: () => marketplaceApi.getListings({
      type: selectedType || undefined,
      search: searchQuery || undefined,
      pricing: selectedPricing || undefined,
    }),
  });

  return (
    <Layout>
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-10 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <ShoppingBag className="w-8 h-8 text-cyan-400" />
              <h1
                className="text-4xl md:text-5xl font-display font-bold uppercase tracking-tighter"
                data-testid="text-marketplace-title"
              >
                MARKETPLACE
              </h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Buy, sell, and share comics, cards, and creative assets
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search listings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border-2 border-border text-sm text-foreground focus:border-cyan-500 outline-none font-mono"
                data-testid="input-marketplace-search"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-muted-foreground hidden md:block" />
              {TYPE_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedType(f.id)}
                  className={`px-3 py-1.5 text-xs font-bold border-2 transition-colors uppercase tracking-wide ${
                    selectedType === f.id
                      ? "bg-cyan-500 text-black border-cyan-500"
                      : "border-border text-muted-foreground hover:border-cyan-500/50 hover:text-foreground"
                  }`}
                  data-testid={`filter-type-${f.id || "all"}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 mb-6">
            <DollarSign className="w-4 h-4 text-muted-foreground hidden md:block" />
            {PRICING_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedPricing(f.id)}
                className={`px-3 py-1.5 text-xs font-bold border-2 transition-colors uppercase tracking-wide ${
                  selectedPricing === f.id
                    ? f.id === "free" ? "bg-green-500 text-black border-green-500" : "bg-cyan-500 text-black border-cyan-500"
                    : "border-border text-muted-foreground hover:border-cyan-500/50 hover:text-foreground"
                }`}
                data-testid={`filter-pricing-${f.id || "all"}`}
              >
                {f.id === "free" && <Gift className="w-3 h-3 inline mr-1" />}
                {f.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="border-2 border-border bg-card animate-pulse">
                  <div className="aspect-[4/3] bg-zinc-800" />
                  <div className="p-4 space-y-3">
                    <div className="h-5 bg-zinc-800 w-3/4" />
                    <div className="h-4 bg-zinc-800 w-full" />
                    <div className="h-4 bg-zinc-800 w-1/2" />
                    <div className="h-8 bg-zinc-800 w-full mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-border">
              <Package className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-lg mb-2" data-testid="text-empty-state">
                {searchQuery || selectedType || selectedPricing
                  ? "No listings match your filters"
                  : "No listings available yet"}
              </p>
              <p className="text-muted-foreground/60 text-sm">
                {searchQuery || selectedType || selectedPricing
                  ? "Try adjusting your search or filters"
                  : "Check back soon for new creative assets"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {listings.map((listing: any) => {
                const typeColor = TYPE_COLORS[listing.type] || "bg-zinc-600 text-white";
                const gradient = TYPE_GRADIENTS[listing.type] || "from-zinc-800 to-zinc-600";
                const isFree = listing.priceInCents === 0;

                return (
                  <div
                    key={listing.id}
                    className="group border-2 border-border bg-card cursor-pointer transition-all hover:border-cyan-500 hover:shadow-[4px_4px_0px_0px_rgba(6,182,212,0.3)]"
                    onClick={() => navigate(`/marketplace/listing/${listing.id}`)}
                    data-testid={`card-listing-${listing.id}`}
                  >
                    <div className="aspect-[4/3] relative overflow-hidden">
                      {(listing.thumbnailUrl || listing.thumbnail) ? (
                        <img
                          src={listing.thumbnailUrl || listing.thumbnail}
                          alt={listing.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                          <Tag className="w-12 h-12 text-white/20" />
                        </div>
                      )}

                      <div className="absolute top-2 left-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${typeColor}`}>
                          {listing.type?.replace("_", " ")}
                        </span>
                      </div>

                      <div className="absolute top-2 right-2">
                        {isFree ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-green-500 text-black">
                            <Gift className="w-3 h-3" />
                            FREE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-green-500 text-black">
                            <DollarSign className="w-3 h-3" />
                            {formatPrice(listing.priceInCents || 0)}
                          </span>
                        )}
                      </div>

                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    <div className="p-4 border-t-2 border-border">
                      <h3
                        className="font-display font-bold text-lg mb-1 truncate"
                        data-testid={`text-listing-title-${listing.id}`}
                      >
                        {listing.title}
                      </h3>

                      {listing.description && (
                        <p className="text-zinc-400 text-sm line-clamp-2 mb-3">
                          {listing.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                        <span className="truncate">
                          {listing.sellerName || "Unknown Seller"}
                        </span>
                        {listing.salesCount > 0 && (
                          <span className="flex items-center gap-1 text-yellow-400">
                            <Star className="w-3 h-3" />
                            {listing.salesCount} {isFree ? "claimed" : "sold"}
                          </span>
                        )}
                      </div>

                      <button
                        className={`w-full py-2 text-xs font-bold uppercase tracking-wide border-2 transition-colors flex items-center justify-center gap-2 ${
                          isFree
                            ? "border-green-500 text-green-400 hover:bg-green-500 hover:text-black"
                            : "border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-black"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/marketplace/listing/${listing.id}`);
                        }}
                        data-testid={`button-view-listing-${listing.id}`}
                      >
                        {isFree ? <Gift className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {isFree ? "Get Free" : "View Details"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
