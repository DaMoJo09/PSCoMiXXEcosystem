import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Layout } from "@/components/layout/Layout";
import {
  FileText,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  Upload,
  ChevronDown,
  Package,
  X,
} from "lucide-react";
import type { PrintQuoteRequest as PrintQuoteRequestType } from "@shared/schema";

const ACCOUNT_TYPES = [
  { value: "school", label: "School" },
  { value: "program", label: "Program" },
  { value: "creator", label: "Creator" },
];

const PRODUCT_TYPES = [
  { value: "comic", label: "Comic Book" },
  { value: "book", label: "Book / Novel" },
  { value: "card", label: "Trading Card" },
  { value: "shirt", label: "T-Shirt" },
  { value: "poster", label: "Poster" },
  { value: "sticker", label: "Sticker" },
];

const SIZE_OPTIONS: Record<string, string[]> = {
  comic: ['6.625" x 10.25"', '5.5" x 8.5"', '8.5" x 11"'],
  book: ['5" x 8" (Pocket)', '5.5" x 8.5" (Digest)', '6" x 9" (Trade)', '8.5" x 11" (Full Size)'],
  card: ['2.5" x 3.5"', '3.5" x 5"'],
  shirt: ["S", "M", "L", "XL", "2XL", "Mixed"],
  poster: ['11" x 17"', '18" x 24"', '24" x 36"'],
  sticker: ['2" x 2"', '3" x 3"', '4" x 6" Sheet'],
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Pending" },
  reviewed: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Reviewed" },
  quoted: { bg: "bg-green-500/20", text: "text-green-400", label: "Quoted" },
  completed: { bg: "bg-zinc-500/20", text: "text-zinc-400", label: "Completed" },
};

interface FormData {
  name: string;
  organization: string;
  accountType: string;
  selectedProducts: string[];
  quantity: string;
  size: string;
  deadline: string;
  notes: string;
  artworkUrl: string;
}

const initialForm: FormData = {
  name: "",
  organization: "",
  accountType: "",
  selectedProducts: [],
  quantity: "",
  size: "",
  deadline: "",
  notes: "",
  artworkUrl: "",
};

interface FormErrors {
  name?: string;
  accountType?: string;
  selectedProducts?: string;
  quantity?: string;
}

export default function PrintQuoteRequest() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const { data: quotes = [], isLoading: quotesLoading } = useQuery<PrintQuoteRequestType[]>({
    queryKey: ["/api/print-quotes"],
  });

  const submitMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest("POST", "/api/print-quotes", {
        name: data.name,
        organization: data.organization || null,
        accountType: data.accountType,
        productType: data.selectedProducts.join(","),
        quantity: data.quantity ? parseInt(data.quantity, 10) : null,
        size: data.size || null,
        deadline: data.deadline || null,
        notes: data.notes || null,
        artworkUrl: data.artworkUrl || null,
      });
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      setForm(initialForm);
      setErrors({});
      queryClient.invalidateQueries({ queryKey: ["/api/print-quotes"] });
    },
  });

  function validate(): boolean {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.accountType) e.accountType = "Account type is required";
    if (form.selectedProducts.length === 0) e.selectedProducts = "Select at least one product type";
    if (form.quantity && (isNaN(Number(form.quantity)) || Number(form.quantity) < 1))
      e.quantity = "Enter a valid quantity";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) {
      submitMutation.mutate(form);
    }
  }

  function toggleProduct(value: string) {
    setForm((prev) => ({
      ...prev,
      selectedProducts: prev.selectedProducts.includes(value)
        ? prev.selectedProducts.filter((p) => p !== value)
        : [...prev.selectedProducts, value],
      size: "",
    }));
  }

  const availableSizes = form.selectedProducts.length === 1 ? SIZE_OPTIONS[form.selectedProducts[0]] || [] : [];

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-12 sm:py-20">
          <div className="mb-12 text-center">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.3em] block mb-4">
              PRINT STUDIO
            </span>
            <h1
              className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              data-testid="text-page-title"
            >
              REQUEST A PRINT QUOTE
            </h1>
            <div className="w-24 h-1 bg-white mx-auto mb-6" />
            <p className="text-sm sm:text-base text-zinc-500 font-mono max-w-xl mx-auto" data-testid="text-page-description">
              Tell us what you need printed and we'll get back to you with pricing and turnaround.
            </p>
          </div>

          {submitted && !submitMutation.isPending && (
            <div
              className="border border-green-500/30 bg-green-500/10 p-6 mb-10 flex items-start gap-4"
              data-testid="status-success"
            >
              <CheckCircle className="w-6 h-6 text-green-400 shrink-0 mt-0.5" />
              <div>
                <h3
                  className="text-lg font-black uppercase tracking-wider mb-1"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  QUOTE REQUEST SUBMITTED
                </h3>
                <p className="text-sm text-zinc-400 font-mono">
                  We've received your request. You'll hear back within 1-2 business days.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-4 text-sm font-mono uppercase tracking-wider text-green-400 hover:text-green-300 transition-colors bg-transparent border-none cursor-pointer"
                  data-testid="button-new-request"
                >
                  Submit another request →
                </button>
              </div>
            </div>
          )}

          {!submitted && (
            <form onSubmit={handleSubmit} className="space-y-8" data-testid="form-print-quote">
              <div className="border border-white/10 bg-white/[0.02] p-6 sm:p-8 space-y-6">
                <h2
                  className="text-lg font-black uppercase tracking-wider flex items-center gap-3"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <FileText className="w-5 h-5 text-zinc-400" />
                  YOUR DETAILS
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full bg-black border border-white/20 px-4 py-3 text-sm font-mono text-white placeholder-zinc-600 focus:border-white/50 focus:outline-none transition-colors"
                      placeholder="Your name"
                      data-testid="input-name"
                    />
                    {errors.name && (
                      <p className="text-xs text-red-400 font-mono mt-1 flex items-center gap-1" data-testid="error-name">
                        <AlertCircle className="w-3 h-3" /> {errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">
                      Organization
                    </label>
                    <input
                      type="text"
                      value={form.organization}
                      onChange={(e) => setForm({ ...form, organization: e.target.value })}
                      className="w-full bg-black border border-white/20 px-4 py-3 text-sm font-mono text-white placeholder-zinc-600 focus:border-white/50 focus:outline-none transition-colors"
                      placeholder="School, program, or studio name"
                      data-testid="input-organization"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">
                    Account Type *
                  </label>
                  <div className="flex flex-wrap gap-3" data-testid="select-account-type">
                    {ACCOUNT_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setForm({ ...form, accountType: type.value })}
                        className={`px-5 py-2.5 text-sm font-mono uppercase tracking-wider border transition-all cursor-pointer ${
                          form.accountType === type.value
                            ? "bg-white text-black border-white"
                            : "bg-transparent text-zinc-400 border-white/20 hover:border-white/40"
                        }`}
                        data-testid={`button-account-type-${type.value}`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                  {errors.accountType && (
                    <p className="text-xs text-red-400 font-mono mt-1 flex items-center gap-1" data-testid="error-account-type">
                      <AlertCircle className="w-3 h-3" /> {errors.accountType}
                    </p>
                  )}
                </div>
              </div>

              <div className="border border-white/10 bg-white/[0.02] p-6 sm:p-8 space-y-6">
                <h2
                  className="text-lg font-black uppercase tracking-wider flex items-center gap-3"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <Package className="w-5 h-5 text-zinc-400" />
                  PRODUCT DETAILS
                </h2>

                <div>
                  <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">
                    Product Type * (select all that apply)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" data-testid="select-product-type">
                    {PRODUCT_TYPES.map((product) => {
                      const selected = form.selectedProducts.includes(product.value);
                      return (
                        <button
                          key={product.value}
                          type="button"
                          onClick={() => toggleProduct(product.value)}
                          className={`px-4 py-3 text-sm font-mono uppercase tracking-wider border transition-all cursor-pointer flex items-center justify-between ${
                            selected
                              ? "bg-white text-black border-white"
                              : "bg-transparent text-zinc-400 border-white/20 hover:border-white/40"
                          }`}
                          data-testid={`button-product-type-${product.value}`}
                        >
                          {product.label}
                          {selected && <X className="w-3 h-3 ml-2" />}
                        </button>
                      );
                    })}
                  </div>
                  {errors.selectedProducts && (
                    <p className="text-xs text-red-400 font-mono mt-1 flex items-center gap-1" data-testid="error-product-type">
                      <AlertCircle className="w-3 h-3" /> {errors.selectedProducts}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                      className="w-full bg-black border border-white/20 px-4 py-3 text-sm font-mono text-white placeholder-zinc-600 focus:border-white/50 focus:outline-none transition-colors"
                      placeholder="e.g. 100"
                      data-testid="input-quantity"
                    />
                    {errors.quantity && (
                      <p className="text-xs text-red-400 font-mono mt-1 flex items-center gap-1" data-testid="error-quantity">
                        <AlertCircle className="w-3 h-3" /> {errors.quantity}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">
                      Size
                    </label>
                    {availableSizes.length > 0 ? (
                      <div className="relative">
                        <select
                          value={form.size}
                          onChange={(e) => setForm({ ...form, size: e.target.value })}
                          className="w-full bg-black border border-white/20 px-4 py-3 text-sm font-mono text-white appearance-none focus:border-white/50 focus:outline-none transition-colors cursor-pointer"
                          data-testid="select-size"
                        >
                          <option value="">Select size</option>
                          {availableSizes.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={form.size}
                        onChange={(e) => setForm({ ...form, size: e.target.value })}
                        className="w-full bg-black border border-white/20 px-4 py-3 text-sm font-mono text-white placeholder-zinc-600 focus:border-white/50 focus:outline-none transition-colors"
                        placeholder="e.g. 6.625x10.25"
                        data-testid="input-size"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">
                      Deadline
                    </label>
                    <input
                      type="date"
                      value={form.deadline}
                      onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                      className="w-full bg-black border border-white/20 px-4 py-3 text-sm font-mono text-white focus:border-white/50 focus:outline-none transition-colors cursor-pointer"
                      data-testid="input-deadline"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">
                    Notes
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={4}
                    className="w-full bg-black border border-white/20 px-4 py-3 text-sm font-mono text-white placeholder-zinc-600 focus:border-white/50 focus:outline-none transition-colors resize-vertical"
                    placeholder="Paper weight, finish, binding, special instructions..."
                    data-testid="input-notes"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">
                    Artwork URL (optional)
                  </label>
                  <div className="flex items-center gap-3">
                    <Upload className="w-5 h-5 text-zinc-500 shrink-0" />
                    <input
                      type="url"
                      value={form.artworkUrl}
                      onChange={(e) => setForm({ ...form, artworkUrl: e.target.value })}
                      className="w-full bg-black border border-white/20 px-4 py-3 text-sm font-mono text-white placeholder-zinc-600 focus:border-white/50 focus:outline-none transition-colors"
                      placeholder="Link to your print-ready file (Drive, Dropbox, etc.)"
                      data-testid="input-artwork-url"
                    />
                  </div>
                </div>
              </div>

              {submitMutation.isError && (
                <div
                  className="border border-red-500/30 bg-red-500/10 p-4 flex items-center gap-3"
                  data-testid="status-error"
                >
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                  <p className="text-sm text-red-400 font-mono">
                    {(submitMutation.error as Error)?.message || "Failed to submit. Please try again."}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitMutation.isPending}
                className="group w-full sm:w-auto px-10 py-4 bg-white text-black font-bold text-lg uppercase tracking-wider flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all relative border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                data-testid="button-submit-quote"
              >
                {submitMutation.isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    SUBMITTING...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    SUBMIT QUOTE REQUEST
                  </>
                )}
                <div className="absolute inset-0 border-2 border-white translate-x-2 translate-y-2 -z-10 group-hover:translate-x-3 group-hover:translate-y-3 transition-transform" />
              </button>
            </form>
          )}

          <div className="mt-16" data-testid="section-quote-history">
            <div className="mb-8">
              <h2
                className="text-xl sm:text-2xl font-black uppercase tracking-tight mb-2"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                data-testid="text-history-title"
              >
                YOUR QUOTE REQUESTS
              </h2>
              <div className="w-16 h-1 bg-white/30" />
            </div>

            {quotesLoading ? (
              <div className="border border-white/10 p-8 text-center">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-zinc-500 font-mono">Loading requests...</p>
              </div>
            ) : quotes.length === 0 ? (
              <div className="border border-white/10 bg-white/[0.02] p-8 text-center" data-testid="text-no-quotes">
                <Clock className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                <p className="text-sm text-zinc-500 font-mono">No quote requests yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {quotes.map((quote) => {
                  const status = STATUS_STYLES[quote.status] || STATUS_STYLES.pending;
                  return (
                    <div
                      key={quote.id}
                      className="border border-white/10 bg-white/[0.02] p-5 sm:p-6 hover:border-white/20 transition-colors"
                      data-testid={`card-quote-${quote.id}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 ${status.bg} ${status.text}`}
                            data-testid={`status-quote-${quote.id}`}
                          >
                            {status.label}
                          </span>
                          <span className="text-xs text-zinc-600 font-mono">
                            {new Date(quote.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-600 font-mono uppercase">
                          {quote.accountType}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-[10px] font-mono text-zinc-600 uppercase block mb-1">Product</span>
                          <span className="font-mono text-zinc-300" data-testid={`text-product-${quote.id}`}>
                            {quote.productType.split(",").join(", ")}
                          </span>
                        </div>
                        {quote.quantity && (
                          <div>
                            <span className="text-[10px] font-mono text-zinc-600 uppercase block mb-1">Qty</span>
                            <span className="font-mono text-zinc-300">{quote.quantity}</span>
                          </div>
                        )}
                        {quote.size && (
                          <div>
                            <span className="text-[10px] font-mono text-zinc-600 uppercase block mb-1">Size</span>
                            <span className="font-mono text-zinc-300">{quote.size}</span>
                          </div>
                        )}
                        {quote.deadline && (
                          <div>
                            <span className="text-[10px] font-mono text-zinc-600 uppercase block mb-1">Deadline</span>
                            <span className="font-mono text-zinc-300">{quote.deadline}</span>
                          </div>
                        )}
                      </div>
                      {quote.notes && (
                        <p className="text-xs text-zinc-500 font-mono mt-3 border-t border-white/5 pt-3">
                          {quote.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
