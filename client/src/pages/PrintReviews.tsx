import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "sonner";
import {
  Star,
  MessageSquare,
  CheckCircle,
  Book,
  CreditCard,
  Image,
  Sticker,
  Shirt,
  Megaphone,
  ChevronDown,
  Send,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { Link } from "wouter";

const PRODUCT_TYPES = [
  { id: "comic-books", label: "Comic Books", icon: Book },
  { id: "books-novels", label: "Books & Novels", icon: Book },
  { id: "trading-cards", label: "Trading Cards", icon: CreditCard },
  { id: "posters", label: "Posters", icon: Image },
  { id: "stickers", label: "Stickers", icon: Sticker },
  { id: "t-shirts", label: "T-Shirts", icon: Shirt },
  { id: "promo-materials", label: "Promo Materials", icon: Megaphone },
];

interface Review {
  id: string;
  userId: string;
  productType: string;
  rating: number;
  title: string | null;
  reviewText: string | null;
  verifiedOrder: boolean;
  createdAt: string;
  authorName: string;
  authorAvatar: string | null;
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: Record<number, number>;
}

function StarRating({ rating, onRate, interactive = false, size = "md" }: {
  rating: number;
  onRate?: (r: number) => void;
  interactive?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const [hover, setHover] = useState(0);
  const sizeClass = size === "sm" ? "w-3 h-3" : size === "lg" ? "w-6 h-6" : "w-4 h-4";

  return (
    <div className="flex gap-0.5" data-testid="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          className={`${interactive ? "cursor-pointer hover:scale-110" : "cursor-default"} transition-transform`}
          data-testid={`star-${star}`}
        >
          <Star
            className={`${sizeClass} ${(hover || rating) >= star ? "fill-amber-400 text-amber-400" : "text-zinc-600"} transition-colors`}
          />
        </button>
      ))}
    </div>
  );
}

function RatingDistribution({ stats }: { stats: ReviewStats }) {
  const maxCount = Math.max(...Object.values(stats.distribution), 1);

  return (
    <div className="space-y-1.5" data-testid="rating-distribution">
      {[5, 4, 3, 2, 1].map((star) => (
        <div key={star} className="flex items-center gap-2 text-xs">
          <span className="w-4 text-right font-mono text-zinc-500">{star}</span>
          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
          <div className="flex-1 h-2 bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all duration-500"
              style={{ width: `${(stats.distribution[star] / maxCount) * 100}%` }}
            />
          </div>
          <span className="w-6 text-right font-mono text-zinc-600">{stats.distribution[star]}</span>
        </div>
      ))}
    </div>
  );
}

export default function PrintReviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [filterType, setFilterType] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formRating, setFormRating] = useState(0);
  const [formTitle, setFormTitle] = useState("");
  const [formText, setFormText] = useState("");
  const [formProductType, setFormProductType] = useState("comic-books");
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = async () => {
    try {
      const params = filterType ? `?productType=${filterType}` : "";
      const [reviewsRes, statsRes] = await Promise.all([
        fetch(`/api/print-reviews${params}`).then(r => r.json()),
        fetch(`/api/print-reviews/stats${params}`).then(r => r.json()),
      ]);
      setReviews(reviewsRes);
      setStats(statsRes);
    } catch {
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [filterType]);

  const handleSubmit = async () => {
    if (formRating === 0) { toast.error("Please select a rating"); return; }
    if (!formProductType) { toast.error("Please select a product type"); return; }

    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/print-reviews", {
        productType: formProductType,
        rating: formRating,
        title: formTitle || undefined,
        reviewText: formText || undefined,
      });
      toast.success("Review submitted");
      setShowForm(false);
      setFormRating(0);
      setFormTitle("");
      setFormText("");
      fetchReviews();
    } catch (err: any) {
      const msg = err?.message || "Failed to submit review";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest("DELETE", `/api/print-reviews/${id}`);
      toast.success("Review deleted");
      fetchReviews();
    } catch {
      toast.error("Failed to delete review");
    }
  };

  const getProductLabel = (type: string) => PRODUCT_TYPES.find(p => p.id === type)?.label || type;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <Layout>
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/print-studio">
              <button className="p-2 hover:bg-zinc-800 transition-colors" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em] block">PRINT STUDIO</span>
              <h1
                className="text-3xl sm:text-4xl font-black uppercase tracking-tight"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                data-testid="text-reviews-heading"
              >
                CUSTOMER REVIEWS
              </h1>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {stats && (
              <>
                <div className="border border-zinc-800 bg-zinc-900/50 p-6" data-testid="card-rating-summary">
                  <div className="text-center mb-4">
                    <div className="text-5xl font-black font-display">{stats.averageRating.toFixed(1)}</div>
                    <div className="flex justify-center my-2">
                      <StarRating rating={Math.round(stats.averageRating)} size="lg" />
                    </div>
                    <div className="text-xs font-mono text-zinc-500">
                      {stats.totalReviews} review{stats.totalReviews !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <RatingDistribution stats={stats} />
                </div>

                <div className="border border-zinc-800 bg-zinc-900/50 p-6 md:col-span-2" data-testid="card-filter-actions">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider">Filter by Product</h3>
                    <div className="flex gap-2">
                      {user && (
                        <button
                          onClick={() => setShowForm(!showForm)}
                          className="px-4 py-2 bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-zinc-200 transition-colors flex items-center gap-2"
                          data-testid="button-write-review"
                        >
                          <MessageSquare className="w-3 h-3" />
                          Write Review
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFilterType("")}
                      className={`px-3 py-1.5 text-xs font-mono border transition-colors ${!filterType ? "bg-white text-black border-white" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}
                      data-testid="button-filter-all"
                    >
                      All
                    </button>
                    {PRODUCT_TYPES.map((pt) => {
                      const Icon = pt.icon;
                      return (
                        <button
                          key={pt.id}
                          onClick={() => setFilterType(pt.id)}
                          className={`px-3 py-1.5 text-xs font-mono border transition-colors flex items-center gap-1.5 ${filterType === pt.id ? "bg-white text-black border-white" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}
                          data-testid={`button-filter-${pt.id}`}
                        >
                          <Icon className="w-3 h-3" />
                          {pt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {showForm && user && (
            <div className="border-2 border-white/20 bg-zinc-900 p-6 mb-8" data-testid="form-write-review">
              <h3 className="text-sm font-bold uppercase tracking-wider mb-4">Write a Review</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">Product Type</label>
                  <div className="relative">
                    <button
                      onClick={() => setShowFilter(!showFilter)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-zinc-800 border border-zinc-700 text-sm"
                      data-testid="select-product-type"
                    >
                      <span>{getProductLabel(formProductType)}</span>
                      <ChevronDown className="w-4 h-4 text-zinc-500" />
                    </button>
                    {showFilter && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 z-10">
                        {PRODUCT_TYPES.map((pt) => (
                          <button
                            key={pt.id}
                            onClick={() => { setFormProductType(pt.id); setShowFilter(false); }}
                            className="w-full px-3 py-2 text-sm text-left hover:bg-zinc-700 transition-colors"
                            data-testid={`option-product-${pt.id}`}
                          >
                            {pt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">Rating</label>
                  <StarRating rating={formRating} onRate={setFormRating} interactive size="lg" />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">Title (optional)</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Sum up your experience..."
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-sm focus:outline-none focus:border-white transition-colors"
                    maxLength={120}
                    data-testid="input-review-title"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">Review</label>
                  <textarea
                    value={formText}
                    onChange={(e) => setFormText(e.target.value)}
                    placeholder="Share details of your experience..."
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-sm focus:outline-none focus:border-white transition-colors resize-none h-28 font-mono"
                    maxLength={2000}
                    data-testid="input-review-text"
                  />
                  <div className="text-right text-[10px] text-zinc-600 font-mono">{formText.length}/2000</div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || formRating === 0}
                    className="px-6 py-2.5 bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                    data-testid="button-submit-review"
                  >
                    <Send className="w-3 h-3" />
                    {submitting ? "Submitting..." : "Submit Review"}
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 border border-zinc-700 text-zinc-400 text-xs uppercase tracking-wider hover:border-zinc-500 transition-colors"
                    data-testid="button-cancel-review"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-20 border border-zinc-800 bg-zinc-900/30" data-testid="empty-reviews">
              <MessageSquare className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-lg font-bold mb-2">No Reviews Yet</h3>
              <p className="text-sm text-zinc-500 font-mono max-w-md mx-auto mb-6">
                {filterType ? `No reviews for ${getProductLabel(filterType)} yet.` : "Be the first to share your printing experience."}
              </p>
              {user && (
                <button
                  onClick={() => setShowForm(true)}
                  className="px-6 py-2.5 bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-zinc-200 transition-colors"
                  data-testid="button-first-review"
                >
                  Write the First Review
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4" data-testid="reviews-list">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="border border-zinc-800 bg-zinc-900/30 p-5 hover:border-zinc-700 transition-colors"
                  data-testid={`review-card-${review.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold uppercase">
                        {review.authorName?.charAt(0) || "?"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{review.authorName}</span>
                          {review.verifiedOrder && (
                            <span className="flex items-center gap-1 text-[9px] font-mono text-green-400 bg-green-400/10 px-1.5 py-0.5 border border-green-400/20 uppercase" data-testid={`verified-badge-${review.id}`}>
                              <CheckCircle className="w-2.5 h-2.5" />
                              Verified Order
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <StarRating rating={review.rating} size="sm" />
                          <span className="text-[10px] font-mono text-zinc-600">
                            {getProductLabel(review.productType)} · {formatDate(review.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {user && (user.id === review.userId || user.role === "admin") && (
                      <button
                        onClick={() => handleDelete(review.id)}
                        className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        title="Delete review"
                        data-testid={`button-delete-review-${review.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {review.title && (
                    <h4 className="font-bold text-sm mb-1">{review.title}</h4>
                  )}
                  {review.reviewText && (
                    <p className="text-sm text-zinc-400 font-mono leading-relaxed whitespace-pre-wrap">{review.reviewText}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
