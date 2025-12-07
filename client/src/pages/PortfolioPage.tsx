import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { 
  Search, Filter, Grid, List, X, ZoomIn, ChevronLeft, ChevronRight,
  Calendar, MapPin, Tag, DollarSign, Maximize2, ExternalLink, Heart, ShoppingCart
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Artwork {
  id: string;
  title: string;
  description: string;
  category: string;
  medium: string;
  dimensions: { width: number; height: number; depth?: number; unit: string };
  year: number;
  price: number;
  available: boolean;
  featured: boolean;
  images: string[];
  tags: string[];
}

const SAMPLE_ARTWORKS: Artwork[] = [
  {
    id: "1",
    title: "Neon Dreams",
    description: "A cyberpunk cityscape rendered in mixed media, combining digital illustration with traditional ink work.",
    category: "digital",
    medium: "Digital + Ink on Paper",
    dimensions: { width: 24, height: 36, unit: "in" },
    year: 2024,
    price: 45000,
    available: true,
    featured: true,
    images: [
      "https://image.pollinations.ai/prompt/cyberpunk%20cityscape%20neon%20lights%20rain%20noir%20style?width=800&height=1200&nologo=true&seed=1001",
      "https://image.pollinations.ai/prompt/cyberpunk%20cityscape%20detail%20view%20noir?width=800&height=800&nologo=true&seed=1002"
    ],
    tags: ["cyberpunk", "neon", "cityscape", "noir"]
  },
  {
    id: "2",
    title: "The Watcher",
    description: "An enigmatic figure observing the chaos of the urban landscape below.",
    category: "mixed-media",
    medium: "Acrylic + Digital",
    dimensions: { width: 18, height: 24, unit: "in" },
    year: 2024,
    price: 32000,
    available: true,
    featured: false,
    images: [
      "https://image.pollinations.ai/prompt/mysterious%20figure%20watching%20city%20noir%20comic%20style?width=800&height=1200&nologo=true&seed=2001"
    ],
    tags: ["figure", "urban", "mystery", "noir"]
  },
  {
    id: "3",
    title: "Digital Decay",
    description: "Exploring the intersection of organic forms and digital glitches.",
    category: "digital",
    medium: "Pure Digital",
    dimensions: { width: 30, height: 40, unit: "in" },
    year: 2023,
    price: 28000,
    available: false,
    featured: true,
    images: [
      "https://image.pollinations.ai/prompt/abstract%20glitch%20art%20organic%20forms%20black%20white?width=800&height=1200&nologo=true&seed=3001"
    ],
    tags: ["abstract", "glitch", "digital", "organic"]
  },
  {
    id: "4",
    title: "Shadow Protocol",
    description: "A narrative piece exploring themes of surveillance and identity.",
    category: "paintings",
    medium: "Oil on Canvas",
    dimensions: { width: 48, height: 60, unit: "in" },
    year: 2024,
    price: 85000,
    available: true,
    featured: true,
    images: [
      "https://image.pollinations.ai/prompt/surveillance%20eye%20noir%20dramatic%20shadows%20oil%20painting?width=800&height=1000&nologo=true&seed=4001"
    ],
    tags: ["surveillance", "identity", "noir", "narrative"]
  },
  {
    id: "5",
    title: "Circuit Dreams",
    description: "Where technology meets the subconscious mind.",
    category: "prints",
    medium: "Giclee Print",
    dimensions: { width: 16, height: 20, unit: "in" },
    year: 2023,
    price: 15000,
    available: true,
    featured: false,
    images: [
      "https://image.pollinations.ai/prompt/circuit%20board%20abstract%20art%20dreamy%20black%20white?width=800&height=1000&nologo=true&seed=5001"
    ],
    tags: ["technology", "abstract", "dreams", "circuit"]
  },
  {
    id: "6",
    title: "Urban Fragments",
    description: "Collage exploring urban decay and renewal.",
    category: "mixed-media",
    medium: "Mixed Media Collage",
    dimensions: { width: 24, height: 24, unit: "in" },
    year: 2024,
    price: 22000,
    available: true,
    featured: false,
    images: [
      "https://image.pollinations.ai/prompt/urban%20collage%20fragments%20noir%20mixed%20media?width=800&height=800&nologo=true&seed=6001"
    ],
    tags: ["urban", "collage", "decay", "mixed-media"]
  }
];

const CATEGORIES = [
  { id: "all", name: "All Works" },
  { id: "digital", name: "Digital" },
  { id: "mixed-media", name: "Mixed Media" },
  { id: "paintings", name: "Paintings" },
  { id: "prints", name: "Prints" },
  { id: "sculptures", name: "Sculptures" }
];

export default function PortfolioPage() {
  const [artworks] = useState<Artwork[]>(SAMPLE_ARTWORKS);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (favorites.includes(id)) {
      setFavorites(favorites.filter(f => f !== id));
      toast.success("Removed from favorites");
    } else {
      setFavorites([...favorites, id]);
      toast.success("Added to favorites");
    }
  };

  const filteredArtworks = artworks.filter(artwork => {
    const matchesCategory = selectedCategory === "all" || artwork.category === selectedCategory;
    const matchesSearch = artwork.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         artwork.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         artwork.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPrice = artwork.price >= priceRange[0] && artwork.price <= priceRange[1];
    const matchesAvailability = !showAvailableOnly || artwork.available;
    const matchesFavorites = !showFavoritesOnly || favorites.includes(artwork.id);
    return matchesCategory && matchesSearch && matchesPrice && matchesAvailability && matchesFavorites;
  });

  const openLightbox = (artwork: Artwork) => {
    setSelectedArtwork(artwork);
    setCurrentImageIndex(0);
  };

  const closeLightbox = () => {
    setSelectedArtwork(null);
    setCurrentImageIndex(0);
  };

  const nextImage = () => {
    if (selectedArtwork && currentImageIndex < selectedArtwork.images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(cents / 100);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <header className="border-b-4 border-border p-6">
          <h1 className="text-4xl font-black font-display tracking-tight mb-2">PORTFOLIO</h1>
          <p className="text-muted-foreground">Explore the complete collection of works</p>
        </header>

        <div className="p-6 border-b border-border">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search artworks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-background border-2 border-border text-sm focus:ring-0 focus:border-foreground outline-none"
                  data-testid="portfolio-search"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 border-2 border-border ${showFilters ? "bg-foreground text-background" : ""}`}
                data-testid="toggle-filters"
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex border-2 border-border">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 text-xs font-bold uppercase ${
                      selectedCategory === cat.id ? "bg-foreground text-background" : "hover:bg-muted"
                    }`}
                    data-testid={`category-${cat.id}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              <div className="flex border-2 border-border">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 ${viewMode === "grid" ? "bg-foreground text-background" : ""}`}
                  data-testid="view-grid"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 ${viewMode === "list" ? "bg-foreground text-background" : ""}`}
                  data-testid="view-list"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 p-4 border-2 border-border bg-card">
              <div className="flex flex-wrap gap-6">
                <div>
                  <label className="text-xs font-bold uppercase mb-2 block">Price Range</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={priceRange[0] / 100}
                      onChange={(e) => setPriceRange([Number(e.target.value) * 100, priceRange[1]])}
                      className="w-24 px-2 py-1 border-2 border-border text-sm"
                      placeholder="Min"
                    />
                    <span>-</span>
                    <input
                      type="number"
                      value={priceRange[1] / 100}
                      onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value) * 100])}
                      className="w-24 px-2 py-1 border-2 border-border text-sm"
                      placeholder="Max"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase mb-2 block">Availability</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showAvailableOnly}
                      onChange={(e) => setShowAvailableOnly(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Available only</span>
                  </label>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase mb-2 block">Favorites</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showFavoritesOnly}
                      onChange={(e) => setShowFavoritesOnly(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Show favorites only ({favorites.length})</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6">
          <p className="text-sm text-muted-foreground mb-4">
            Showing {filteredArtworks.length} of {artworks.length} works
          </p>

          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArtworks.map((artwork) => (
                <div
                  key={artwork.id}
                  className="group border-4 border-border bg-card hover:border-foreground transition-colors cursor-pointer"
                  onClick={() => openLightbox(artwork)}
                  data-testid={`artwork-card-${artwork.id}`}
                >
                  <div className="aspect-[3/4] relative overflow-hidden bg-black">
                    <img
                      src={artwork.images[0]}
                      alt={artwork.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    {artwork.featured && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-foreground text-background text-[10px] font-bold uppercase">
                        Featured
                      </div>
                    )}
                    {!artwork.available && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white text-[10px] font-bold uppercase">
                        Sold
                      </div>
                    )}
                    <button
                      onClick={(e) => toggleFavorite(e, artwork.id)}
                      className={`absolute top-2 right-2 p-2 transition-colors z-10 ${
                        favorites.includes(artwork.id) 
                          ? "bg-red-500 text-white" 
                          : "bg-background/80 hover:bg-background text-foreground"
                      } ${!artwork.available ? "top-10" : ""}`}
                      data-testid={`favorite-${artwork.id}`}
                    >
                      <Heart className={`w-4 h-4 ${favorites.includes(artwork.id) ? "fill-current" : ""}`} />
                    </button>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <ZoomIn className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-1">{artwork.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{artwork.medium}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{artwork.year}</span>
                      <span className="font-bold">{formatPrice(artwork.price)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredArtworks.map((artwork) => (
                <div
                  key={artwork.id}
                  className="flex gap-6 border-4 border-border bg-card hover:border-foreground transition-colors cursor-pointer p-4"
                  onClick={() => openLightbox(artwork)}
                  data-testid={`artwork-list-${artwork.id}`}
                >
                  <div className="w-48 h-48 shrink-0 overflow-hidden bg-black">
                    <img
                      src={artwork.images[0]}
                      alt={artwork.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-xl">{artwork.title}</h3>
                        <p className="text-sm text-muted-foreground">{artwork.medium}</p>
                      </div>
                      <span className="font-bold text-xl">{formatPrice(artwork.price)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{artwork.description}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" /> {artwork.year}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Maximize2 className="w-3 h-3" /> {artwork.dimensions.width} x {artwork.dimensions.height} {artwork.dimensions.unit}
                      </span>
                      {artwork.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="flex items-center gap-1 text-xs bg-muted px-2 py-0.5">
                          <Tag className="w-3 h-3" /> {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Dialog open={!!selectedArtwork} onOpenChange={closeLightbox}>
          <DialogContent className="max-w-6xl h-[90vh] p-0 bg-black border-4 border-white">
            {selectedArtwork && (
              <div className="flex h-full">
                <div className="flex-1 relative bg-black flex items-center justify-center">
                  <img
                    src={selectedArtwork.images[currentImageIndex]}
                    alt={selectedArtwork.title}
                    className="max-w-full max-h-full object-contain"
                  />
                  
                  {selectedArtwork.images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        disabled={currentImageIndex === 0}
                        className="absolute left-4 p-2 bg-white/20 hover:bg-white/40 disabled:opacity-30"
                      >
                        <ChevronLeft className="w-6 h-6 text-white" />
                      </button>
                      <button
                        onClick={nextImage}
                        disabled={currentImageIndex === selectedArtwork.images.length - 1}
                        className="absolute right-4 p-2 bg-white/20 hover:bg-white/40 disabled:opacity-30"
                      >
                        <ChevronRight className="w-6 h-6 text-white" />
                      </button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {selectedArtwork.images.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentImageIndex(idx)}
                            className={`w-2 h-2 rounded-full ${idx === currentImageIndex ? "bg-white" : "bg-white/40"}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="w-96 bg-zinc-950 p-6 overflow-y-auto text-white">
                  <button
                    onClick={closeLightbox}
                    className="absolute top-4 right-4 p-2 hover:bg-white/20"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <h2 className="text-2xl font-black mb-2">{selectedArtwork.title}</h2>
                  <p className="text-gray-400 mb-6">{selectedArtwork.year}</p>

                  <div className="space-y-4 mb-6">
                    <div>
                      <h4 className="text-xs font-bold uppercase text-gray-500 mb-1">Medium</h4>
                      <p>{selectedArtwork.medium}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase text-gray-500 mb-1">Dimensions</h4>
                      <p>
                        {selectedArtwork.dimensions.width} x {selectedArtwork.dimensions.height}
                        {selectedArtwork.dimensions.depth && ` x ${selectedArtwork.dimensions.depth}`}
                        {" "}{selectedArtwork.dimensions.unit}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase text-gray-500 mb-1">Description</h4>
                      <p className="text-sm text-gray-300">{selectedArtwork.description}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-6">
                    {selectedArtwork.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-zinc-800 text-xs">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="border-t border-zinc-800 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-black">{formatPrice(selectedArtwork.price)}</span>
                      {selectedArtwork.available ? (
                        <span className="px-2 py-1 bg-green-900 text-green-400 text-xs font-bold">AVAILABLE</span>
                      ) : (
                        <span className="px-2 py-1 bg-red-900 text-red-400 text-xs font-bold">SOLD</span>
                      )}
                    </div>
                    {selectedArtwork.available && (
                      <button className="w-full py-3 bg-white text-black font-bold hover:bg-gray-200" data-testid="inquire-button">
                        INQUIRE
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
