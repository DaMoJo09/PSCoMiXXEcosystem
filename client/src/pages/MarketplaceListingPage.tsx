import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { ArrowLeft, ShoppingCart, Star, Eye, DollarSign, Package, User, Calendar, Tag, Download, Edit, Trash2 } from "lucide-react";
import { marketplaceApi } from "@/lib/api";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

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

export default function MarketplaceListingPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPreview, setSelectedPreview] = useState(0);

  const { data: listing, isLoading, error } = useQuery({
    queryKey: ["marketplace-listing", params.id],
    queryFn: () => marketplaceApi.getListing(params.id!),
    enabled: !!params.id,
  });

  const checkoutMutation = useMutation({
    mutationFn: () => marketplaceApi.checkout(listing!.id),
    onSuccess: (data) => { window.location.href = data.url; },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => marketplaceApi.deleteListing(listing!.id),
    onSuccess: () => {
      toast.success("Listing deleted");
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
      navigate("/marketplace");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this listing? This action cannot be undone.")) {
      deleteMutation.mutate();
    }
  };

  const isOwner = user && listing && String(listing.sellerId) === String(user.id);

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-background text-foreground">
          <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-zinc-800 w-48" />
              <div className="aspect-video bg-zinc-800" />
              <div className="h-10 bg-zinc-800 w-3/4" />
              <div className="h-6 bg-zinc-800 w-1/2" />
              <div className="h-24 bg-zinc-800 w-full" />
              <div className="h-12 bg-zinc-800 w-full" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !listing) {
    return (
      <Layout>
        <div className="min-h-screen bg-background text-foreground">
          <div className="max-w-4xl mx-auto px-6 py-8">
            <button
              onClick={() => navigate("/marketplace")}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-cyan-400 transition-colors mb-8"
              data-testid="button-back-marketplace"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Marketplace
            </button>
            <div className="text-center py-20 border-2 border-dashed border-border">
              <Package className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-lg" data-testid="text-listing-not-found">
                Listing not found
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const typeColor = TYPE_COLORS[listing.type] || "bg-zinc-600 text-white";
  const gradient = TYPE_GRADIENTS[listing.type] || "from-zinc-800 to-zinc-600";
  const previewImages = (listing as any).previewImages || [];
  const tags = (listing as any).tags || [];

  return (
    <Layout>
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate("/marketplace")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-cyan-400 transition-colors mb-8"
            data-testid="button-back-marketplace"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Marketplace
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="aspect-video relative overflow-hidden border-2 border-border">
                {listing.thumbnail ? (
                  <img
                    src={listing.thumbnail}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                    data-testid="img-listing-hero"
                  />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                    <Tag className="w-20 h-20 text-white/20" />
                  </div>
                )}
                <div className="absolute top-3 left-3">
                  <span className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${typeColor}`}>
                    {listing.type?.replace("_", " ")}
                  </span>
                </div>
              </div>

              {previewImages.length > 0 && (
                <div data-testid="gallery-preview-images">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">Preview Images</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {previewImages.map((img: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => setSelectedPreview(i)}
                        className={`aspect-square border-2 overflow-hidden transition-colors ${
                          selectedPreview === i ? "border-cyan-500" : "border-border hover:border-cyan-500/50"
                        }`}
                        data-testid={`button-preview-image-${i}`}
                      >
                        <img src={img} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 aspect-video border-2 border-border overflow-hidden">
                    <img
                      src={previewImages[selectedPreview]}
                      alt="Selected preview"
                      className="w-full h-full object-cover"
                      data-testid="img-selected-preview"
                    />
                  </div>
                </div>
              )}

              {listing.description && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">Description</h3>
                  <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap" data-testid="text-listing-description">
                    {listing.description}
                  </p>
                </div>
              )}

              {tags.length > 0 && (
                <div data-testid="listing-tags">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag: string, i: number) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 text-xs font-mono bg-zinc-800 border border-border text-zinc-300"
                        data-testid={`tag-${tag}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="border-2 border-border bg-card p-6 space-y-4">
                <h1
                  className="text-3xl font-display font-bold"
                  data-testid="text-listing-title"
                >
                  {listing.title}
                </h1>

                <div className="flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-green-400" />
                  <span className="text-3xl font-bold text-green-400" data-testid="text-listing-price">
                    ${formatPrice(listing.priceInCents || 0)}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground py-2 border-t border-b border-border">
                  {(listing as any).salesCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-400" />
                      {(listing as any).salesCount} sold
                    </span>
                  )}
                  {listing.createdAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(listing.createdAt), "MMM d, yyyy")}
                    </span>
                  )}
                </div>

                {(listing as any).sellerName && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span data-testid="text-seller-name">{(listing as any).sellerName}</span>
                  </div>
                )}

                {!user ? (
                  <button
                    onClick={() => navigate("/login")}
                    className="w-full py-3 text-sm font-bold uppercase tracking-wide bg-zinc-700 text-zinc-300 border-2 border-border hover:border-cyan-500/50 transition-colors flex items-center justify-center gap-2"
                    data-testid="button-sign-in-to-purchase"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Sign in to purchase
                  </button>
                ) : isOwner ? (
                  <button
                    disabled
                    className="w-full py-3 text-sm font-bold uppercase tracking-wide bg-zinc-800 text-zinc-500 border-2 border-border cursor-not-allowed flex items-center justify-center gap-2"
                    data-testid="button-own-listing"
                  >
                    <Package className="w-4 h-4" />
                    This is your listing
                  </button>
                ) : (
                  <button
                    onClick={() => checkoutMutation.mutate()}
                    disabled={checkoutMutation.isPending}
                    className="w-full py-3 text-sm font-bold uppercase tracking-wide bg-cyan-500 text-black border-2 border-cyan-500 hover:bg-cyan-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    data-testid="button-buy-now"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {checkoutMutation.isPending ? "Processing..." : "Buy Now"}
                  </button>
                )}

                {isOwner && (
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <button
                      onClick={() => navigate(`/marketplace/edit/${listing.id}`)}
                      className="flex-1 py-2.5 text-xs font-bold uppercase tracking-wide border-2 border-border text-muted-foreground hover:border-cyan-500 hover:text-cyan-400 transition-colors flex items-center justify-center gap-2"
                      data-testid="button-edit-listing"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                      className="flex-1 py-2.5 text-xs font-bold uppercase tracking-wide border-2 border-red-500/50 text-red-400 hover:bg-red-500 hover:text-black transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      data-testid="button-delete-listing"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {deleteMutation.isPending ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}