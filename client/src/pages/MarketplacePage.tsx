import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Search, ShoppingBag, Filter, Tag, Star, Eye, DollarSign, Package, Gift, Sparkles, User, Image as ImageIcon, Sword, Glasses, Music, Mic, Volume2, Lock } from "lucide-react";
import { marketplaceApi } from "@/lib/api";
import { useLocation } from "wouter";

const PLATFORM_CATEGORIES: { id: string; label: string; icon: any; comingSoon?: boolean }[] = [
  { id: "characters", label: "Characters", icon: User },
  { id: "backgrounds", label: "Backgrounds", icon: ImageIcon },
  { id: "items", label: "Items", icon: Sword },
  { id: "accessories", label: "Accessories", icon: Glasses },
  { id: "music", label: "Music", icon: Music, comingSoon: true },
  { id: "vocals", label: "Vocal Packs", icon: Mic, comingSoon: true },
  { id: "sfx", label: "SFX Packs", icon: Volume2, comingSoon: true },
];

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
  const [platformCategory, setPlatformCategory] = useState<string>("characters");

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["marketplace-listings", selectedType, searchQuery, selectedPricing],
    queryFn: () => marketplaceApi.getListings({
      type: selectedType || undefined,
      search: searchQuery || undefined,
      pricing: selectedPricing || undefined,
    }),
  });

  const { data: platformAssets = [], isLoading: platformLoading } = useQuery<any[]>({
    queryKey: ["platform-assets-store"],
    queryFn: async () => {
      const res = await fetch("/api/platform-assets/store", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load originals");
      return res.json();
    },
  });

  const activePlatformCat = PLATFORM_CATEGORIES.find((c) => c.id === platformCategory);
  const isAudioCat = !!activePlatformCat?.comingSoon;
  const filteredOriginals = platformAssets.filter((a: any) => a.category === platformCategory);
  const freeOriginals = filteredOriginals.filter((a: any) => a.isFree);
  const paidOriginals = filteredOriginals.filter((a: any) => !a.isFree);

  return (
    <Layout>
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="mb-6 sm:mb-10 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400" />
              <h1
                className="text-2xl sm:text-4xl md:text-5xl font-display font-bold uppercase tracking-tighter"
                data-testid="text-marketplace-title"
              >
                MARKETPLACE
              </h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Buy, sell, and share comics, cards, and creative assets
            </p>
          </div>

          <section className="mb-12 border-2 border-cyan-500/40 bg-gradient-to-br from-zinc-900 via-zinc-900 to-cyan-950/30 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-xl sm:text-2xl font-display font-bold uppercase tracking-tight" data-testid="text-originals-title">
                    Press Start Originals
                  </h2>
                </div>
                <p className="text-muted-foreground text-sm">
                  Curated assets ready to drop into any Comic, Card, or Story project
                </p>
              </div>
              <p className="text-xs text-muted-foreground/70 font-mono">
                Tip: add these inside any Studio via <span className="text-cyan-400">+ Asset</span>
              </p>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-5">
              {PLATFORM_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = platformCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setPlatformCategory(cat.id)}
                    className={`px-3 py-2 sm:py-1.5 text-xs font-bold border-2 transition-colors uppercase tracking-wide whitespace-nowrap flex items-center gap-1.5 ${
                      isActive
                        ? "bg-cyan-500 text-black border-cyan-500"
                        : "border-border text-muted-foreground hover:border-cyan-500/50 hover:text-foreground"
                    }`}
                    data-testid={`filter-platform-cat-${cat.id}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {cat.label}
                    {cat.comingSoon && (
                      <span className="ml-1 text-[9px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 border border-yellow-500/30">SOON</span>
                    )}
                  </button>
                );
              })}
            </div>

            {isAudioCat ? (
              <div className="border-2 border-dashed border-yellow-500/40 bg-yellow-500/5 p-8 text-center">
                <div className="flex justify-center mb-3">
                  {activePlatformCat?.icon && <activePlatformCat.icon className="w-12 h-12 text-yellow-400/60" />}
                </div>
                <h3 className="text-lg font-display font-bold uppercase mb-1" data-testid={`text-coming-soon-${platformCategory}`}>
                  {activePlatformCat?.label} — Coming Soon
                </h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">
                  Free and paid {activePlatformCat?.label.toLowerCase()} packs are on the way. Want to be a launch contributor?
                </p>
                <button
                  onClick={() => navigate("/marketplace/sell")}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wide border-2 border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black transition-colors"
                  data-testid={`button-submit-${platformCategory}`}
                >
                  Submit a Pack
                </button>
              </div>
            ) : platformLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="border-2 border-border bg-card animate-pulse">
                    <div className="aspect-square bg-zinc-800" />
                    <div className="p-3 space-y-2">
                      <div className="h-4 bg-zinc-800 w-3/4" />
                      <div className="h-3 bg-zinc-800 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredOriginals.length === 0 ? (
              <div className="border-2 border-dashed border-border p-8 text-center text-muted-foreground text-sm">
                No {activePlatformCat?.label.toLowerCase()} yet.
              </div>
            ) : (
              <div className="space-y-6">
                {freeOriginals.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Gift className="w-4 h-4 text-green-400" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-green-400">Free</h3>
                      <span className="text-xs text-muted-foreground">({freeOriginals.length})</span>
                    </div>
                    <OriginalsGrid items={freeOriginals} />
                  </div>
                )}
                {paidOriginals.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400">Premium</h3>
                      <span className="text-xs text-muted-foreground">({paidOriginals.length})</span>
                    </div>
                    <OriginalsGrid items={paidOriginals} />
                  </div>
                )}
              </div>
            )}
          </section>

          <div className="mb-4">
            <h2 className="text-xl sm:text-2xl font-display font-bold uppercase tracking-tight mb-1" data-testid="text-community-title">
              Community Marketplace
            </h2>
            <p className="text-muted-foreground text-sm">
              Comics, cards, and assets from creators across the platform
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 sm:gap-4 mb-4">
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

            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap overflow-x-auto pb-1">
              <Filter className="w-4 h-4 text-muted-foreground hidden md:block" />
              {TYPE_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedType(f.id)}
                  className={`px-3 py-2 sm:py-1.5 text-xs font-bold border-2 transition-colors uppercase tracking-wide whitespace-nowrap ${
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

          <div className="flex items-center gap-1.5 sm:gap-2 mb-6">
            <DollarSign className="w-4 h-4 text-muted-foreground hidden md:block" />
            {PRICING_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedPricing(f.id)}
                className={`px-3 py-2 sm:py-1.5 text-xs font-bold border-2 transition-colors uppercase tracking-wide ${
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
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="border-2 border-border bg-card animate-pulse">
                  <div className="aspect-[4/3] bg-zinc-800" />
                  <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                    <div className="h-4 sm:h-5 bg-zinc-800 w-3/4" />
                    <div className="h-3 sm:h-4 bg-zinc-800 w-full" />
                    <div className="h-3 sm:h-4 bg-zinc-800 w-1/2" />
                    <div className="h-7 sm:h-8 bg-zinc-800 w-full mt-2" />
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
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
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

                    <div className="p-3 sm:p-4 border-t-2 border-border">
                      <h3
                        className="font-display font-bold text-sm sm:text-lg mb-1 truncate"
                        data-testid={`text-listing-title-${listing.id}`}
                      >
                        {listing.title}
                      </h3>

                      {listing.description && (
                        <p className="text-zinc-400 text-xs sm:text-sm line-clamp-2 mb-2 sm:mb-3 hidden sm:block">
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

function OriginalsGrid({ items }: { items: any[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((asset) => {
        const isFree = asset.isFree;
        return (
          <div
            key={asset.id}
            className="group border-2 border-border bg-card transition-all hover:border-cyan-500 hover:shadow-[4px_4px_0px_0px_rgba(6,182,212,0.3)]"
            data-testid={`card-original-${asset.id}`}
          >
            <div className="aspect-square relative overflow-hidden bg-zinc-900">
              {asset.thumbnailUrl ? (
                <img
                  src={asset.thumbnailUrl}
                  alt={asset.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-white/20" />
                </div>
              )}
              <div className="absolute top-2 right-2">
                {isFree ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-green-500 text-black">
                    <Gift className="w-3 h-3" />
                    FREE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-cyan-500 text-black">
                    <DollarSign className="w-3 h-3" />
                    {(asset.priceInCents / 100).toFixed(2)}
                  </span>
                )}
              </div>
              {!isFree && (
                <div className="absolute top-2 left-2">
                  <span className="inline-flex items-center gap-1 px-1.5 py-1 text-[10px] font-bold bg-black/70 text-yellow-400 border border-yellow-500/40">
                    <Lock className="w-2.5 h-2.5" />
                    PREMIUM
                  </span>
                </div>
              )}
            </div>
            <div className="p-3 border-t-2 border-border">
              <h4
                className="font-display font-bold text-sm mb-0.5 truncate"
                data-testid={`text-original-name-${asset.id}`}
                title={asset.name}
              >
                {asset.name}
              </h4>
              <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
                {asset.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
