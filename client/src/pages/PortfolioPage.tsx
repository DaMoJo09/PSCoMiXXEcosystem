import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { 
  Search, Filter, Grid, List, X, ZoomIn, ChevronLeft, ChevronRight,
  Calendar, MapPin, Tag, DollarSign, Maximize2, ExternalLink, Heart, 
  Plus, Edit2, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";

interface Artwork {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  category: string;
  medium: string | null;
  dimensions: { width: number; height: number; depth?: number; unit: string } | null;
  year: number | null;
  price: number | null;
  available: boolean | null;
  featured: boolean | null;
  images: string[];
  tags: string[] | null;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  { id: "all", name: "All Works" },
  { id: "digital", name: "Digital" },
  { id: "mixed-media", name: "Mixed Media" },
  { id: "paintings", name: "Paintings" },
  { id: "prints", name: "Prints" },
  { id: "sculptures", name: "Sculptures" }
];

export default function PortfolioPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<Artwork | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "digital",
    medium: "",
    year: new Date().getFullYear(),
    price: 0,
    available: true,
    featured: false,
    images: [""],
    tags: ""
  });

  const { data: artworks = [], isLoading } = useQuery({
    queryKey: ["/api/portfolio"],
    queryFn: async () => {
      const res = await fetch("/api/portfolio", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create artwork");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      setIsAddDialogOpen(false);
      resetForm();
      toast.success("Artwork added to portfolio");
    },
    onError: () => toast.error("Failed to add artwork"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/portfolio/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update artwork");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      setEditingArtwork(null);
      resetForm();
      toast.success("Artwork updated");
    },
    onError: () => toast.error("Failed to update artwork"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/portfolio/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete artwork");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      toast.success("Artwork deleted");
    },
    onError: () => toast.error("Failed to delete artwork"),
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "digital",
      medium: "",
      year: new Date().getFullYear(),
      price: 0,
      available: true,
      featured: false,
      images: [""],
      tags: ""
    });
  };

  const openEditDialog = (artwork: Artwork) => {
    setEditingArtwork(artwork);
    setFormData({
      title: artwork.title,
      description: artwork.description || "",
      category: artwork.category,
      medium: artwork.medium || "",
      year: artwork.year || new Date().getFullYear(),
      price: artwork.price || 0,
      available: artwork.available ?? true,
      featured: artwork.featured ?? false,
      images: artwork.images?.length ? artwork.images : [""],
      tags: artwork.tags?.join(", ") || ""
    });
  };

  const handleSubmit = () => {
    const data = {
      title: formData.title,
      description: formData.description || null,
      category: formData.category,
      medium: formData.medium || null,
      dimensions: null,
      year: formData.year,
      price: formData.price,
      available: formData.available,
      featured: formData.featured,
      images: formData.images.filter(img => img.trim()),
      tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean)
    };

    if (editingArtwork) {
      updateMutation.mutate({ id: editingArtwork.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

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

  const filteredArtworks = artworks.filter((artwork: Artwork) => {
    const matchesCategory = selectedCategory === "all" || artwork.category === selectedCategory;
    const matchesSearch = artwork.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (artwork.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (artwork.tags || []).some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPrice = (artwork.price || 0) >= priceRange[0] && (artwork.price || 0) <= priceRange[1];
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
      <div className="min-h-screen bg-black text-white">
        <header className="border-b-4 border-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tight mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>PORTFOLIO</h1>
              <p className="text-zinc-400">Explore the complete collection of works</p>
            </div>
            {user && (
              <Dialog open={isAddDialogOpen || !!editingArtwork} onOpenChange={(open) => {
                if (!open) {
                  setIsAddDialogOpen(false);
                  setEditingArtwork(null);
                  resetForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => setIsAddDialogOpen(true)}
                    className="bg-white text-black hover:bg-zinc-200 font-bold border-2 border-white"
                    data-testid="btn-add-artwork"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    ADD ARTWORK
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-black border-2 border-white text-white max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-black">{editingArtwork ? "EDIT ARTWORK" : "ADD ARTWORK"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label className="text-white">Title *</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="bg-zinc-900 border-white text-white"
                        data-testid="input-artwork-title"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Description</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="bg-zinc-900 border-white text-white"
                        data-testid="input-artwork-description"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white">Category</Label>
                        <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                          <SelectTrigger className="bg-zinc-900 border-white text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-black border-white">
                            {CATEGORIES.filter(c => c.id !== "all").map(cat => (
                              <SelectItem key={cat.id} value={cat.id} className="text-white">{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-white">Medium</Label>
                        <Input
                          value={formData.medium}
                          onChange={(e) => setFormData({ ...formData, medium: e.target.value })}
                          className="bg-zinc-900 border-white text-white"
                          placeholder="e.g., Oil on Canvas"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white">Year</Label>
                        <Input
                          type="number"
                          value={formData.year}
                          onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                          className="bg-zinc-900 border-white text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-white">Price (cents)</Label>
                        <Input
                          type="number"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                          className="bg-zinc-900 border-white text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-white">Image URL</Label>
                      <Input
                        value={formData.images[0]}
                        onChange={(e) => setFormData({ ...formData, images: [e.target.value] })}
                        className="bg-zinc-900 border-white text-white"
                        placeholder="https://..."
                        data-testid="input-artwork-image"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Tags (comma-separated)</Label>
                      <Input
                        value={formData.tags}
                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                        className="bg-zinc-900 border-white text-white"
                        placeholder="digital, portrait, noir"
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.available}
                          onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span>Available for Sale</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.featured}
                          onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span>Featured</span>
                      </label>
                    </div>
                    <Button
                      onClick={handleSubmit}
                      disabled={!formData.title || createMutation.isPending || updateMutation.isPending}
                      className="w-full bg-white text-black hover:bg-zinc-200 font-bold"
                      data-testid="btn-save-artwork"
                    >
                      {editingArtwork ? "UPDATE ARTWORK" : "ADD TO PORTFOLIO"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </header>

        <div className="p-6 border-b border-zinc-800">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search artworks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-black border-2 border-white text-sm focus:ring-0 focus:border-zinc-400 outline-none text-white"
                  data-testid="portfolio-search"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 border-2 border-white ${showFilters ? "bg-white text-black" : ""}`}
                data-testid="toggle-filters"
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex border-2 border-white">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1 text-sm font-bold transition-colors ${
                      selectedCategory === cat.id
                        ? "bg-white text-black"
                        : "hover:bg-zinc-900"
                    }`}
                    data-testid={`category-${cat.id}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              <div className="flex border-2 border-white">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 ${viewMode === "grid" ? "bg-white text-black" : ""}`}
                  data-testid="view-grid"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 ${viewMode === "list" ? "bg-white text-black" : ""}`}
                  data-testid="view-list"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 p-4 border-2 border-white bg-zinc-900 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-bold mb-2 block">Price Range</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceRange[0]}
                    onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                    className="w-full p-2 bg-black border border-white text-sm"
                  />
                  <span>-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 100000])}
                    className="w-full p-2 bg-black border border-white text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAvailableOnly}
                    onChange={(e) => setShowAvailableOnly(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Available Only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showFavoritesOnly}
                    onChange={(e) => setShowFavoritesOnly(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Favorites Only</span>
                </label>
              </div>
            </div>
          )}
        </div>

        <main className="p-6">
          {isLoading ? (
            <div className="text-center py-12 text-zinc-500">Loading...</div>
          ) : filteredArtworks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-500 mb-4">No artworks found</p>
              {user && (
                <Button onClick={() => setIsAddDialogOpen(true)} className="bg-white text-black">
                  <Plus className="w-4 h-4 mr-2" /> Add Your First Artwork
                </Button>
              )}
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredArtworks.map((artwork: Artwork) => (
                <div
                  key={artwork.id}
                  className="group border-2 border-white bg-black cursor-pointer hover:border-zinc-400 transition-all"
                  onClick={() => openLightbox(artwork)}
                  data-testid={`artwork-card-${artwork.id}`}
                >
                  <div className="aspect-[3/4] relative overflow-hidden">
                    {artwork.images?.[0] ? (
                      <img
                        src={artwork.images[0]}
                        alt={artwork.title}
                        className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-600">
                        No Image
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button
                        onClick={(e) => toggleFavorite(e, artwork.id)}
                        className={`p-2 bg-black/80 border border-white ${favorites.includes(artwork.id) ? "text-white" : "text-zinc-500"}`}
                      >
                        <Heart className={`w-4 h-4 ${favorites.includes(artwork.id) ? "fill-current" : ""}`} />
                      </button>
                    </div>
                    {artwork.featured && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-white text-black text-xs font-bold">
                        FEATURED
                      </div>
                    )}
                    {user && artwork.userId === user.id && (
                      <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditDialog(artwork); }}
                          className="p-2 bg-black/80 border border-white text-white hover:bg-white hover:text-black"
                          data-testid={`btn-edit-${artwork.id}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(artwork.id); }}
                          className="p-2 bg-black/80 border border-white text-white hover:bg-white hover:text-black"
                          data-testid={`btn-delete-${artwork.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="p-4 border-t-2 border-white">
                    <h3 className="font-black text-lg mb-1">{artwork.title}</h3>
                    <p className="text-zinc-400 text-sm">{artwork.medium || artwork.category}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold">{artwork.price ? formatPrice(artwork.price) : "—"}</span>
                      {artwork.available === false && (
                        <span className="text-xs text-zinc-500">SOLD</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredArtworks.map((artwork: Artwork) => (
                <div
                  key={artwork.id}
                  className="flex gap-6 border-2 border-white p-4 cursor-pointer hover:border-zinc-400 transition-all"
                  onClick={() => openLightbox(artwork)}
                  data-testid={`artwork-row-${artwork.id}`}
                >
                  <div className="w-32 h-32 flex-shrink-0">
                    {artwork.images?.[0] ? (
                      <img src={artwork.images[0]} alt={artwork.title} className="w-full h-full object-cover grayscale" />
                    ) : (
                      <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-600 text-xs">No Image</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-black text-xl">{artwork.title}</h3>
                        <p className="text-zinc-400">{artwork.medium || artwork.category} • {artwork.year}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-xl">{artwork.price ? formatPrice(artwork.price) : "—"}</span>
                        {artwork.available === false && <p className="text-xs text-zinc-500">SOLD</p>}
                      </div>
                    </div>
                    <p className="text-zinc-400 text-sm mt-2 line-clamp-2">{artwork.description}</p>
                    {artwork.tags && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {artwork.tags.map(tag => (
                          <span key={tag} className="px-2 py-1 bg-zinc-900 text-xs border border-zinc-700">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {user && artwork.userId === user.id && (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditDialog(artwork); }}
                        className="p-2 border border-white hover:bg-white hover:text-black"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(artwork.id); }}
                        className="p-2 border border-white hover:bg-white hover:text-black"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>

        {selectedArtwork && (
          <Dialog open={!!selectedArtwork} onOpenChange={() => closeLightbox()}>
            <DialogContent className="max-w-4xl bg-black border-2 border-white p-0">
              <div className="relative">
                {selectedArtwork.images?.length > 0 && (
                  <img
                    src={selectedArtwork.images[currentImageIndex]}
                    alt={selectedArtwork.title}
                    className="w-full max-h-[70vh] object-contain"
                  />
                )}
                {selectedArtwork.images?.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      disabled={currentImageIndex === 0}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/80 border border-white disabled:opacity-30"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={nextImage}
                      disabled={currentImageIndex === selectedArtwork.images.length - 1}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/80 border border-white disabled:opacity-30"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}
              </div>
              <div className="p-6 border-t-2 border-white">
                <h2 className="text-2xl font-black">{selectedArtwork.title}</h2>
                <p className="text-zinc-400">{selectedArtwork.medium} • {selectedArtwork.year}</p>
                <p className="mt-4 text-zinc-300">{selectedArtwork.description}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-2xl font-bold">{selectedArtwork.price ? formatPrice(selectedArtwork.price) : "Price on request"}</span>
                  {selectedArtwork.available !== false && (
                    <Button className="bg-white text-black hover:bg-zinc-200 font-bold">
                      INQUIRE
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Layout>
  );
}
