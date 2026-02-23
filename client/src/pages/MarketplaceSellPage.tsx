import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { marketplaceApi, projectsApi } from "@/lib/api";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, DollarSign, Package, Tag, Image, FileText } from "lucide-react";
import { toast } from "sonner";

const TYPE_COLORS: Record<string, string> = {
  comic: "bg-cyan-500 text-black",
  card: "bg-fuchsia-500 text-black",
  vn: "bg-yellow-500 text-black",
  cyoa: "bg-green-500 text-black",
  cover: "bg-orange-500 text-black",
  motion: "bg-purple-500 text-white",
  asset_pack: "bg-blue-500 text-white",
};

export default function MarketplaceSellPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("");
  const [price, setPrice] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.getAll(),
    enabled: !!user && user.accountType !== "student",
  });

  const publishedProjects = projects.filter(
    (p: any) => p.status === "published" || p.status === "approved"
  );

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
    const project = projects.find((p: any) => p.id === projectId);
    if (project) {
      setTitle(project.title || "");
      setType(project.type || "");
      if (project.thumbnail) {
        setThumbnailUrl(project.thumbnail);
      }
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => marketplaceApi.createListing(data),
    onSuccess: () => {
      toast.success("Listing created!");
      navigate("/marketplace");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProjectId) {
      toast.error("Please select a project");
      return;
    }
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!price || parseFloat(price) < 0.99) {
      toast.error("Price must be at least $0.99");
      return;
    }

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    createMutation.mutate({
      projectId: selectedProjectId,
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      priceInCents: Math.round(parseFloat(price) * 100),
      tags: tags.length > 0 ? tags : undefined,
      thumbnailUrl: thumbnailUrl.trim() || undefined,
    });
  };

  if (user?.accountType === "student") {
    return (
      <Layout>
        <div className="min-h-screen bg-background text-foreground">
          <div className="max-w-2xl mx-auto px-6 py-8">
            <button
              onClick={() => navigate("/marketplace")}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-cyan-400 transition-colors mb-6"
              data-testid="button-back-marketplace"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Marketplace
            </button>

            <div className="border-2 border-border bg-card p-8 text-center">
              <Package className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <h2
                className="text-2xl font-display font-bold uppercase tracking-tighter mb-3"
                data-testid="text-student-restricted"
              >
                CREATOR ACCOUNT REQUIRED
              </h2>
              <p className="text-muted-foreground">
                Student accounts cannot sell on the marketplace. Upgrade to a Creator account to list your projects for sale.
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate("/marketplace")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-cyan-400 transition-colors mb-6"
            data-testid="button-back-marketplace"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Marketplace
          </button>

          <div className="flex items-center gap-3 mb-8">
            <DollarSign className="w-8 h-8 text-cyan-400" />
            <h1
              className="text-4xl md:text-5xl font-display font-bold uppercase tracking-tighter"
              data-testid="text-create-listing-title"
            >
              CREATE LISTING
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-2 border-border bg-card p-6 space-y-5">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground mb-2">
                  <Package className="w-4 h-4 text-cyan-400" />
                  Select Project
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => handleProjectSelect(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-900 border-2 border-border text-sm text-foreground focus:border-cyan-500 outline-none font-mono appearance-none cursor-pointer"
                  data-testid="select-project"
                >
                  <option value="">Choose a published project...</option>
                  {publishedProjects.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.type})
                    </option>
                  ))}
                </select>
                {publishedProjects.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    No published or approved projects found. Publish a project first.
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground mb-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Listing title"
                  className="w-full px-4 py-2.5 bg-zinc-900 border-2 border-border text-sm text-foreground focus:border-cyan-500 outline-none font-mono"
                  data-testid="input-title"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground mb-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what buyers will get..."
                  rows={4}
                  className="w-full px-4 py-2.5 bg-zinc-900 border-2 border-border text-sm text-foreground focus:border-cyan-500 outline-none font-mono resize-none"
                  data-testid="input-description"
                />
              </div>

              {type && (
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground mb-2">
                    <Tag className="w-4 h-4 text-cyan-400" />
                    Type
                  </label>
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${TYPE_COLORS[type] || "bg-zinc-600 text-white"}`}
                    data-testid="badge-type"
                  >
                    {type.replace("_", " ")}
                  </span>
                </div>
              )}

              <div>
                <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground mb-2">
                  <DollarSign className="w-4 h-4 text-cyan-400" />
                  Price (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.99"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.99"
                    className="w-full pl-8 pr-4 py-2.5 bg-zinc-900 border-2 border-border text-sm text-foreground focus:border-cyan-500 outline-none font-mono"
                    data-testid="input-price"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground mb-2">
                  <Tag className="w-4 h-4 text-cyan-400" />
                  Tags
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="comic, manga, action (comma-separated)"
                  className="w-full px-4 py-2.5 bg-zinc-900 border-2 border-border text-sm text-foreground focus:border-cyan-500 outline-none font-mono"
                  data-testid="input-tags"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Separate tags with commas
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground mb-2">
                  <Image className="w-4 h-4 text-cyan-400" />
                  Thumbnail URL (optional)
                </label>
                <input
                  type="text"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://example.com/image.png"
                  className="w-full px-4 py-2.5 bg-zinc-900 border-2 border-border text-sm text-foreground focus:border-cyan-500 outline-none font-mono"
                  data-testid="input-thumbnail-url"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full py-3 text-sm font-bold uppercase tracking-wide border-2 border-cyan-500 bg-cyan-500 text-black hover:bg-cyan-400 hover:border-cyan-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-submit-listing"
            >
              <DollarSign className="w-4 h-4" />
              {createMutation.isPending ? "Creating..." : "List for Sale"}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
