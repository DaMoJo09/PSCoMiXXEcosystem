import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { marketplaceApi, projectsApi } from "@/lib/api";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/use-subscription";
import { ProFeatureDiscovery, useProFeatureDiscovery } from "@/components/UpgradeModal";
import { ArrowLeft, DollarSign, Package, Tag, Image, FileText, Upload, X, Gift } from "lucide-react";
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

const LISTING_MODES = [
  { id: "project", label: "Published Project", description: "List one of your published works" },
  { id: "asset_pack", label: "Asset Pack", description: "Upload images as a reusable asset pack" },
];

export default function MarketplaceSellPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { hasFeature, isAdmin } = useSubscription();
  const { isOpen: discoveryOpen, featureKey: discoveryFeature, showDiscovery, closeDiscovery } = useProFeatureDiscovery();

  const [listingMode, setListingMode] = useState<"project" | "asset_pack">("project");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("");
  const [price, setPrice] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [assetFiles, setAssetFiles] = useState<{ name: string; dataUrl: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleAssetUpload = async (files: FileList) => {
    setIsUploading(true);
    const newAssets: { name: string; dataUrl: string }[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newAssets.push({ name: file.name, dataUrl });
    }
    setAssetFiles(prev => [...prev, ...newAssets]);
    setIsUploading(false);
    if (newAssets.length > 0) {
      toast.success(`${newAssets.length} asset(s) added`);
    }
  };

  const removeAssetFile = (index: number) => {
    setAssetFiles(prev => prev.filter((_, i) => i !== index));
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

    if (!hasFeature("commercial") && !isAdmin) {
      showDiscovery("commercial_license");
      return;
    }

    if (listingMode === "project" && !selectedProjectId) {
      toast.error("Please select a project");
      return;
    }
    if (listingMode === "asset_pack" && assetFiles.length === 0) {
      toast.error("Please upload at least one asset");
      return;
    }
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!isFree && (!price || parseFloat(price) < 0.99)) {
      toast.error("Price must be at least $0.99 for paid listings");
      return;
    }

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const listingData: any = {
      title: title.trim(),
      description: description.trim() || undefined,
      type: listingMode === "asset_pack" ? "asset_pack" : type,
      priceInCents: isFree ? 0 : Math.round(parseFloat(price) * 100),
      tags: tags.length > 0 ? tags : undefined,
      thumbnail: thumbnailUrl.trim() || (assetFiles.length > 0 ? assetFiles[0].dataUrl : undefined),
    };

    if (listingMode === "project") {
      listingData.projectId = selectedProjectId;
    } else {
      listingData.downloadData = {
        type: "asset_pack",
        assets: assetFiles.map(a => ({ name: a.name, url: a.dataUrl })),
      };
    }

    createMutation.mutate(listingData);
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

          <div className="flex gap-3 mb-6">
            {LISTING_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => {
                  setListingMode(mode.id as "project" | "asset_pack");
                  if (mode.id === "asset_pack") {
                    setType("asset_pack");
                    setSelectedProjectId("");
                  } else {
                    setType("");
                  }
                }}
                className={`flex-1 p-4 border-2 text-left transition-colors ${
                  listingMode === mode.id
                    ? "border-cyan-500 bg-cyan-500/10"
                    : "border-border hover:border-cyan-500/50"
                }`}
                data-testid={`mode-${mode.id}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {mode.id === "project" ? <Package className="w-4 h-4 text-cyan-400" /> : <Upload className="w-4 h-4 text-blue-400" />}
                  <span className="text-sm font-bold uppercase tracking-wide">{mode.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{mode.description}</p>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-2 border-border bg-card p-6 space-y-5">
              {listingMode === "project" ? (
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
              ) : (
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground mb-2">
                    <Upload className="w-4 h-4 text-blue-400" />
                    Upload Assets
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border hover:border-blue-500/50 p-6 text-center cursor-pointer transition-colors"
                    data-testid="dropzone-assets"
                  >
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {isUploading ? "Processing..." : "Click to upload images for your asset pack"}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">PNG, JPG, WebP supported</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => e.target.files && handleAssetUpload(e.target.files)}
                      data-testid="input-asset-files"
                    />
                  </div>
                  {assetFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{assetFiles.length} asset(s) added</p>
                      <div className="grid grid-cols-6 gap-2">
                        {assetFiles.map((asset, i) => (
                          <div key={i} className="relative group aspect-square border border-border overflow-hidden">
                            <img src={asset.dataUrl} alt={asset.name} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeAssetFile(i)}
                              className="absolute top-0.5 right-0.5 p-0.5 bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              data-testid={`button-remove-asset-${i}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5">
                              <p className="text-[8px] text-white truncate">{asset.name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground mb-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={listingMode === "asset_pack" ? "e.g. Fantasy Character Sprites Pack" : "Listing title"}
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
                  placeholder={listingMode === "asset_pack" ? "Describe the assets in this pack..." : "Describe what buyers will get..."}
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
                  Pricing
                </label>
                <div className="flex gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => setIsFree(false)}
                    className={`flex-1 py-2.5 text-sm font-bold uppercase tracking-wide border-2 flex items-center justify-center gap-2 transition-colors ${
                      !isFree ? "border-cyan-500 bg-cyan-500/10 text-cyan-400" : "border-border text-muted-foreground hover:border-cyan-500/50"
                    }`}
                    data-testid="button-pricing-paid"
                  >
                    <DollarSign className="w-4 h-4" /> Paid
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsFree(true); setPrice("0"); }}
                    className={`flex-1 py-2.5 text-sm font-bold uppercase tracking-wide border-2 flex items-center justify-center gap-2 transition-colors ${
                      isFree ? "border-green-500 bg-green-500/10 text-green-400" : "border-border text-muted-foreground hover:border-green-500/50"
                    }`}
                    data-testid="button-pricing-free"
                  >
                    <Gift className="w-4 h-4" /> Free
                  </button>
                </div>
                {!isFree && (
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
                )}
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
                  placeholder={listingMode === "asset_pack" ? "sprites, characters, fantasy (comma-separated)" : "comic, manga, action (comma-separated)"}
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
                {listingMode === "asset_pack" && assetFiles.length > 0 && !thumbnailUrl && (
                  <p className="text-xs text-muted-foreground mt-1">
                    First uploaded asset will be used as thumbnail if left empty
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={createMutation.isPending || isUploading}
              className={`w-full py-3 text-sm font-bold uppercase tracking-wide border-2 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                isFree
                  ? "border-green-500 bg-green-500 text-black hover:bg-green-400 hover:border-green-400"
                  : "border-cyan-500 bg-cyan-500 text-black hover:bg-cyan-400 hover:border-cyan-400"
              }`}
              data-testid="button-submit-listing"
            >
              {isFree ? <Gift className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
              {createMutation.isPending ? "Creating..." : isFree ? "List for Free" : "List for Sale"}
            </button>
          </form>
        </div>
      </div>
      <ProFeatureDiscovery
        isOpen={discoveryOpen}
        onClose={closeDiscovery}
        featureKey={discoveryFeature}
      />
    </Layout>
  );
}
