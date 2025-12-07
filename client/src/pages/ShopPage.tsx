import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { 
  ShoppingCart, Heart, Search, Filter, X, Plus, Minus, 
  Package, Truck, CreditCard, Check, ChevronRight, Loader2,
  ZoomIn
} from "lucide-react";
import { toast } from "sonner";

interface ShopItem {
  id: string;
  title: string;
  category: string;
  medium: string;
  dimensions: { width: number; height: number; unit: string };
  price: number;
  available: boolean;
  featured: boolean;
  image: string;
  year: number;
}

interface CartItem extends ShopItem {
  quantity: number;
}

const SAMPLE_SHOP_ITEMS: ShopItem[] = [
  {
    id: "1",
    title: "Neon Genesis",
    category: "digital",
    medium: "Digital Print on Canvas",
    dimensions: { width: 24, height: 36, unit: "in" },
    price: 45000,
    available: true,
    featured: true,
    image: "https://image.pollinations.ai/prompt/cyberpunk%20neon%20art%20print%20abstract?width=400&height=500&nologo=true&seed=101",
    year: 2024
  },
  {
    id: "2",
    title: "Urban Decay",
    category: "mixed-media",
    medium: "Mixed Media on Wood Panel",
    dimensions: { width: 18, height: 24, unit: "in" },
    price: 85000,
    available: true,
    featured: false,
    image: "https://image.pollinations.ai/prompt/urban%20decay%20mixed%20media%20art%20textured?width=400&height=500&nologo=true&seed=102",
    year: 2024
  },
  {
    id: "3",
    title: "Binary Dreams",
    category: "prints",
    medium: "Giclee Print, Limited Edition",
    dimensions: { width: 16, height: 20, unit: "in" },
    price: 15000,
    available: true,
    featured: true,
    image: "https://image.pollinations.ai/prompt/binary%20code%20dreams%20abstract%20art%20print?width=400&height=500&nologo=true&seed=103",
    year: 2023
  },
  {
    id: "4",
    title: "Fractured Reality",
    category: "paintings",
    medium: "Acrylic on Canvas",
    dimensions: { width: 30, height: 40, unit: "in" },
    price: 120000,
    available: false,
    featured: false,
    image: "https://image.pollinations.ai/prompt/fractured%20reality%20abstract%20painting%20bold%20colors?width=400&height=500&nologo=true&seed=104",
    year: 2024
  },
  {
    id: "5",
    title: "Pixel Storm",
    category: "digital",
    medium: "Metal Print",
    dimensions: { width: 20, height: 30, unit: "in" },
    price: 55000,
    available: true,
    featured: false,
    image: "https://image.pollinations.ai/prompt/pixel%20storm%20digital%20art%20glitch%20aesthetic?width=400&height=500&nologo=true&seed=105",
    year: 2024
  },
  {
    id: "6",
    title: "Analog Heart",
    category: "sculptures",
    medium: "Bronze and Steel",
    dimensions: { width: 12, height: 18, unit: "in" },
    price: 250000,
    available: true,
    featured: true,
    image: "https://image.pollinations.ai/prompt/mechanical%20heart%20sculpture%20bronze%20steel%20art?width=400&height=500&nologo=true&seed=106",
    year: 2023
  }
];

const CATEGORIES = ["all", "digital", "mixed-media", "paintings", "prints", "sculptures"];

export default function ShopPage() {
  const [items] = useState<ShopItem[]>(SAMPLE_SHOP_ITEMS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showCart, setShowCart] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.medium.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (item: ShopItem) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
    toast.success(`${item.title} added to cart`);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(c => c.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(cart.map(c => {
      if (c.id === id) {
        const newQty = c.quantity + delta;
        return newQty > 0 ? { ...c, quantity: newQty } : c;
      }
      return c;
    }).filter(c => c.quantity > 0));
  };

  const toggleFavorite = (id: string) => {
    if (favorites.includes(id)) {
      setFavorites(favorites.filter(f => f !== id));
      toast.success("Removed from favorites");
    } else {
      setFavorites([...favorites, id]);
      toast.success("Added to favorites");
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  };

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsCheckingOut(false);
    setCart([]);
    setShowCart(false);
    toast.success("Order placed successfully! You'll receive a confirmation email shortly.");
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <header className="border-b-4 border-border p-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black font-display tracking-tight mb-2">SHOP</h1>
            <p className="text-muted-foreground">Original artworks and limited edition prints</p>
          </div>
          <button
            onClick={() => setShowCart(true)}
            className="relative p-3 border-2 border-border hover:border-foreground transition-colors"
            data-testid="button-cart"
          >
            <ShoppingCart className="w-6 h-6" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-foreground text-background text-xs font-bold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </header>

        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search artworks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-background border-2 border-border focus:border-foreground outline-none"
                data-testid="input-shop-search"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 text-sm font-bold uppercase transition-colors ${
                    selectedCategory === cat
                      ? "bg-foreground text-background"
                      : "border-2 border-border hover:border-foreground"
                  }`}
                  data-testid={`filter-${cat}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map(item => (
              <div 
                key={item.id} 
                className="border-4 border-border bg-card group"
                data-testid={`shop-item-${item.id}`}
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  {item.featured && (
                    <span className="absolute top-2 left-2 px-2 py-1 bg-foreground text-background text-xs font-bold">
                      FEATURED
                    </span>
                  )}
                  {!item.available && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">SOLD</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button
                      onClick={() => toggleFavorite(item.id)}
                      className={`p-2 transition-colors ${
                        favorites.includes(item.id) 
                          ? "bg-red-500 text-white" 
                          : "bg-background/80 hover:bg-background"
                      }`}
                      data-testid={`favorite-${item.id}`}
                    >
                      <Heart className={`w-4 h-4 ${favorites.includes(item.id) ? "fill-current" : ""}`} />
                    </button>
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="p-2 bg-background/80 hover:bg-background transition-colors"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{item.medium}</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    {item.dimensions.width}" x {item.dimensions.height}" • {item.year}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-black">{formatPrice(item.price)}</span>
                    <button
                      onClick={() => addToCart(item)}
                      disabled={!item.available}
                      className="px-4 py-2 bg-foreground text-background font-bold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      data-testid={`add-to-cart-${item.id}`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      ADD
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-16">
              <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-xl font-bold mb-2">No artworks found</p>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          )}
        </div>

        {showCart && (
          <div className="fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowCart(false)} />
            <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-background border-l-4 border-border flex flex-col">
              <div className="p-6 border-b-4 border-border flex items-center justify-between">
                <h2 className="text-2xl font-black">CART ({cartCount})</h2>
                <button onClick={() => setShowCart(false)} className="p-2 hover:bg-muted">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Your cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map(item => (
                      <div key={item.id} className="flex gap-4 p-4 border-2 border-border">
                        <img src={item.image} alt={item.title} className="w-20 h-24 object-cover" />
                        <div className="flex-1">
                          <h4 className="font-bold">{item.title}</h4>
                          <p className="text-sm text-muted-foreground">{formatPrice(item.price)}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="p-1 border border-border hover:bg-muted"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-bold">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="p-1 border border-border hover:bg-muted"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="ml-auto text-sm text-muted-foreground hover:text-foreground"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 border-t-4 border-border space-y-4">
                  <div className="flex items-center justify-between text-lg">
                    <span className="font-bold">Subtotal</span>
                    <span className="font-black text-xl">{formatPrice(cartTotal)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Truck className="w-4 h-4" />
                    <span>Free shipping on orders over $500</span>
                  </div>
                  <button
                    onClick={handleCheckout}
                    disabled={isCheckingOut}
                    className="w-full py-4 bg-foreground text-background font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
                    data-testid="button-checkout"
                  >
                    {isCheckingOut ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        CHECKOUT
                        <ChevronRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/80" onClick={() => setSelectedItem(null)} />
            <div className="relative max-w-4xl w-full bg-background border-4 border-border flex flex-col md:flex-row">
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-background border-2 border-border hover:bg-muted"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="md:w-1/2 aspect-[4/5] bg-muted">
                <img src={selectedItem.image} alt={selectedItem.title} className="w-full h-full object-cover" />
              </div>
              <div className="md:w-1/2 p-6 flex flex-col">
                <span className="text-xs font-bold uppercase text-muted-foreground mb-2">{selectedItem.category}</span>
                <h2 className="text-3xl font-black mb-2">{selectedItem.title}</h2>
                <p className="text-muted-foreground mb-4">{selectedItem.medium}</p>
                <div className="space-y-2 mb-6">
                  <p className="text-sm"><span className="font-bold">Dimensions:</span> {selectedItem.dimensions.width}" x {selectedItem.dimensions.height}"</p>
                  <p className="text-sm"><span className="font-bold">Year:</span> {selectedItem.year}</p>
                  <p className="text-sm"><span className="font-bold">Availability:</span> {selectedItem.available ? "Available" : "Sold"}</p>
                </div>
                <div className="mt-auto space-y-4">
                  <p className="text-3xl font-black">{formatPrice(selectedItem.price)}</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { addToCart(selectedItem); setSelectedItem(null); }}
                      disabled={!selectedItem.available}
                      className="flex-1 py-3 bg-foreground text-background font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      ADD TO CART
                    </button>
                    <button
                      onClick={() => toggleFavorite(selectedItem.id)}
                      className={`p-3 border-2 transition-colors ${
                        favorites.includes(selectedItem.id) 
                          ? "bg-red-500 border-red-500 text-white" 
                          : "border-border hover:border-foreground"
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${favorites.includes(selectedItem.id) ? "fill-current" : ""}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
