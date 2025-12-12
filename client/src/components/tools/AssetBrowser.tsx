import { useState, useMemo, useCallback } from "react";
import { 
  Search, X, FolderOpen, Image as ImageIcon, Zap, MessageSquare,
  Grid, List, Filter, Download, Plus, Sparkles, Star, Clock,
  ChevronDown, ChevronRight, Layers, Upload, Check
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface AssetItem {
  id: string;
  name: string;
  url: string;
  category: "effect" | "bubble" | "background" | "character" | "prop";
  tags: string[];
  isFavorite?: boolean;
}

const BUILTIN_EFFECTS: AssetItem[] = [
  { id: "effect_8", name: "POW", url: "/attached_assets/8_1765504738170.png", category: "effect", tags: ["action", "impact", "pow"] },
  { id: "effect_9", name: "BAM", url: "/attached_assets/9_1765504738170.png", category: "effect", tags: ["action", "impact", "bam"] },
  { id: "effect_10", name: "CRASH", url: "/attached_assets/10_1765504738170.png", category: "effect", tags: ["action", "impact", "crash"] },
  { id: "effect_11", name: "KABOOM", url: "/attached_assets/11_1765504738171.png", category: "effect", tags: ["explosion", "impact", "kaboom"] },
  { id: "effect_12", name: "WOW", url: "/attached_assets/12_1765504738171.png", category: "effect", tags: ["reaction", "wow", "surprise"] },
  { id: "effect_13", name: "BOOM", url: "/attached_assets/13_1765504738171.png", category: "effect", tags: ["explosion", "impact", "boom"] },
  { id: "effect_14", name: "WHAM", url: "/attached_assets/14_1765504738171.png", category: "effect", tags: ["action", "impact", "wham"] },
  { id: "effect_15", name: "ZAP", url: "/attached_assets/15_1765504738171.png", category: "effect", tags: ["electric", "energy", "zap"] },
  { id: "effect_16", name: "BANG", url: "/attached_assets/16_1765504738171.png", category: "effect", tags: ["action", "gun", "bang"] },
  { id: "effect_17", name: "SMASH", url: "/attached_assets/17_1765504738172.png", category: "effect", tags: ["action", "impact", "smash"] },
  { id: "effect_18", name: "THWACK", url: "/attached_assets/18_1765504790325.png", category: "effect", tags: ["action", "hit", "thwack"] },
  { id: "effect_19", name: "CRUNCH", url: "/attached_assets/19_1765504790325.png", category: "effect", tags: ["action", "impact", "crunch"] },
  { id: "effect_20", name: "WHOOSH", url: "/attached_assets/20_1765504790325.png", category: "effect", tags: ["motion", "speed", "whoosh"] },
  { id: "effect_21", name: "SLASH", url: "/attached_assets/21_1765504790325.png", category: "effect", tags: ["action", "cut", "slash"] },
  { id: "effect_22", name: "KAPOW", url: "/attached_assets/22_1765504790325.png", category: "effect", tags: ["action", "impact", "kapow"] },
  { id: "effect_23", name: "SPLAT", url: "/attached_assets/23_1765504790326.png", category: "effect", tags: ["action", "messy", "splat"] },
  { id: "effect_24", name: "THUD", url: "/attached_assets/24_1765504790326.png", category: "effect", tags: ["action", "impact", "thud"] },
  { id: "effect_25", name: "CRACK", url: "/attached_assets/25_1765504790326.png", category: "effect", tags: ["action", "break", "crack"] },
  { id: "effect_26", name: "SNAP", url: "/attached_assets/26_1765504790326.png", category: "effect", tags: ["action", "break", "snap"] },
  { id: "effect_27", name: "SIZZLE", url: "/attached_assets/27_1765504790326.png", category: "effect", tags: ["heat", "fire", "sizzle"] },
  { id: "effect_28", name: "FWOOSH", url: "/attached_assets/28_1765504821452.png", category: "effect", tags: ["fire", "flame", "fwoosh"] },
  { id: "effect_29", name: "ZING", url: "/attached_assets/29_1765504821453.png", category: "effect", tags: ["speed", "sharp", "zing"] },
  { id: "effect_30", name: "WHOMP", url: "/attached_assets/30_1765504821453.png", category: "effect", tags: ["action", "impact", "whomp"] },
  { id: "effect_31", name: "THUMP", url: "/attached_assets/31_1765504821453.png", category: "effect", tags: ["action", "impact", "thump"] },
  { id: "effect_32", name: "CLANG", url: "/attached_assets/32_1765504821453.png", category: "effect", tags: ["metal", "impact", "clang"] },
  { id: "effect_33", name: "SWOOSH", url: "/attached_assets/33_1765504821454.png", category: "effect", tags: ["motion", "speed", "swoosh"] },
  { id: "effect_34", name: "BLAST", url: "/attached_assets/34_1765504821454.png", category: "effect", tags: ["explosion", "energy", "blast"] },
  { id: "effect_35", name: "RUMBLE", url: "/attached_assets/35_1765504821454.png", category: "effect", tags: ["earthquake", "shake", "rumble"] },
  { id: "effect_36", name: "FLASH", url: "/attached_assets/36_1765504821454.png", category: "effect", tags: ["light", "energy", "flash"] },
  { id: "effect_37", name: "SPARK", url: "/attached_assets/37_1765504821454.png", category: "effect", tags: ["electric", "energy", "spark"] },
  { id: "effect_38", name: "SCREECH", url: "/attached_assets/38_1765504821454.png", category: "effect", tags: ["sound", "sharp", "screech"] },
  { id: "effect_39", name: "ROAR", url: "/attached_assets/39_1765504821455.png", category: "effect", tags: ["sound", "loud", "roar"] },
  { id: "effect_40", name: "GROWL", url: "/attached_assets/40_1765504821455.png", category: "effect", tags: ["sound", "angry", "growl"] },
  { id: "effect_41", name: "HISS", url: "/attached_assets/41_1765504821455.png", category: "effect", tags: ["sound", "snake", "hiss"] },
  { id: "effect_42", name: "BUZZ", url: "/attached_assets/42_1765504821455.png", category: "effect", tags: ["sound", "insect", "buzz"] },
  { id: "effect_43", name: "CLICK", url: "/attached_assets/43_1765504821455.png", category: "effect", tags: ["sound", "mechanical", "click"] },
  { id: "effect_44", name: "WHACK", url: "/attached_assets/44_1765504821455.png", category: "effect", tags: ["action", "impact", "whack"] },
  { id: "effect_45", name: "BONK", url: "/attached_assets/45_1765504821455.png", category: "effect", tags: ["action", "impact", "bonk"] },
  { id: "effect_46", name: "POOF", url: "/attached_assets/46_1765504821456.png", category: "effect", tags: ["magic", "disappear", "poof"] },
  { id: "effect_47", name: "SPLOSH", url: "/attached_assets/47_1765504821456.png", category: "effect", tags: ["water", "splash", "splosh"] },
  { id: "effect_48", name: "DRIP", url: "/attached_assets/48_1765504836674.png", category: "effect", tags: ["water", "liquid", "drip"] },
];

const BUILTIN_BUBBLES: AssetItem[] = [
  { id: "bubble_1", name: "Speech Bubble 1", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_1_1765504897119.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_2", name: "Speech Bubble 2", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_2_1765504897120.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_3", name: "Speech Bubble 3", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_3_1765504897120.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_4", name: "Speech Bubble 4", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_4_1765504897120.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_5", name: "Speech Bubble 5", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_5_1765504897121.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_6", name: "Speech Bubble 6", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_6_1765504897121.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_7", name: "Speech Bubble 7", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_7_1765504897121.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_8", name: "Speech Bubble 8", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_8_1765504897121.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_9", name: "Speech Bubble 9", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_9_1765504897122.png", category: "bubble", tags: ["speech", "thought", "bubble"] },
  { id: "bubble_10", name: "Speech Bubble 10", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_10_1765504897122.png", category: "bubble", tags: ["speech", "shout", "yell"] },
  { id: "bubble_11", name: "Speech Bubble 11", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_11_1765504897122.png", category: "bubble", tags: ["speech", "whisper", "quiet"] },
  { id: "bubble_12", name: "Speech Bubble 12", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_12_1765504897122.png", category: "bubble", tags: ["speech", "burst", "exclaim"] },
  { id: "bubble_13", name: "Speech Bubble 13", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_13_1765504897122.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_14", name: "Speech Bubble 14", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_14_1765504897123.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_15", name: "Speech Bubble 15", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_15_1765504897123.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_16", name: "Speech Bubble 16", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_16_1765504897123.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_17", name: "Speech Bubble 17", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_17_1765505335119.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_18", name: "Speech Bubble 18", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_18_1765505335119.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_19", name: "Speech Bubble 19", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_19_1765505335120.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_20", name: "Speech Bubble 20", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_20_1765505335120.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_21", name: "Speech Bubble 21", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_21_1765505335120.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_22", name: "Speech Bubble 22", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_22_1765505335120.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_23", name: "Speech Bubble 23", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_23_1765505335120.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_24", name: "Speech Bubble 24", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_24_1765505335120.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_25", name: "Speech Bubble 25", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_25_1765505335120.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_26", name: "Speech Bubble 26", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_26_1765505335120.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_27", name: "Speech Bubble 27", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_27_1765505335120.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_28", name: "Speech Bubble 28", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_28_1765505335120.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_29", name: "Speech Bubble 29", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_29_1765505335120.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_30", name: "Speech Bubble 30", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_30_1765505335120.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_31", name: "Speech Bubble 31", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_31_1765505335121.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_32", name: "Speech Bubble 32", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_32_1765505335121.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_33", name: "Speech Bubble 33", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_33_1765505335121.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_34", name: "Speech Bubble 34", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_34_1765505335121.png", category: "bubble", tags: ["speech", "narration", "caption"] },
  { id: "bubble_35", name: "Speech Bubble 35", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_35_1765505335121.png", category: "bubble", tags: ["speech", "narration", "caption"] },
  { id: "bubble_36", name: "Speech Bubble 36", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_36_1765505335121.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_37", name: "Speech Bubble 37", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_37_1765505335122.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_38", name: "Speech Bubble 38", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_38_1765505335122.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_39", name: "Speech Bubble 39", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_39_1765505335122.png", category: "bubble", tags: ["speech", "narration", "caption"] },
  { id: "bubble_40", name: "Speech Bubble 40", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_40_1765505335122.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_41", name: "Speech Bubble 41", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_41_1765505335122.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_42", name: "Speech Bubble 42", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_42_1765505335122.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_43", name: "Speech Bubble 43", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_43_1765505335122.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_44", name: "Speech Bubble 44", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_44_1765505335123.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_45", name: "Speech Bubble 45", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_45_1765505335123.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_46", name: "Speech Bubble 46", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_46_1765505335123.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_47", name: "Speech Bubble 47", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_47_1765505335123.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_48", name: "Speech Bubble 48", url: "/attached_assets/Comic_Speech_Bubbles_No_Middle_48_1765505335123.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
];

const ALL_ASSETS = [...BUILTIN_EFFECTS, ...BUILTIN_BUBBLES];

const CATEGORIES = [
  { id: "all", name: "All Assets", icon: Layers, count: ALL_ASSETS.length },
  { id: "effect", name: "Action Effects", icon: Zap, count: BUILTIN_EFFECTS.length },
  { id: "bubble", name: "Speech Bubbles", icon: MessageSquare, count: BUILTIN_BUBBLES.length },
  { id: "favorites", name: "Favorites", icon: Star, count: 0 },
  { id: "recent", name: "Recently Used", icon: Clock, count: 0 },
];

const EFFECT_TAGS = [
  "action", "impact", "explosion", "motion", "speed", "sound", 
  "electric", "fire", "water", "magic", "energy"
];

interface AssetBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAsset: (asset: AssetItem) => void;
  mode?: "insert" | "browse";
}

export function AssetBrowser({ isOpen, onClose, onSelectAsset, mode = "insert" }: AssetBrowserProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<AssetItem | null>(null);

  const filteredAssets = useMemo(() => {
    let assets = ALL_ASSETS;

    if (selectedCategory === "favorites") {
      assets = assets.filter(a => favorites.includes(a.id));
    } else if (selectedCategory === "recent") {
      assets = assets.filter(a => recentlyUsed.includes(a.id));
      assets = recentlyUsed.map(id => assets.find(a => a.id === id)).filter(Boolean) as AssetItem[];
    } else if (selectedCategory !== "all") {
      assets = assets.filter(a => a.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      assets = assets.filter(a => 
        a.name.toLowerCase().includes(query) || 
        a.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    if (selectedTags.length > 0) {
      assets = assets.filter(a => 
        selectedTags.some(tag => a.tags.includes(tag))
      );
    }

    return assets;
  }, [selectedCategory, searchQuery, selectedTags, favorites, recentlyUsed]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  }, []);

  const handleSelect = useCallback((asset: AssetItem) => {
    setRecentlyUsed(prev => {
      const filtered = prev.filter(id => id !== asset.id);
      return [asset.id, ...filtered].slice(0, 20);
    });
    onSelectAsset(asset);
    if (mode === "insert") {
      onClose();
    }
    toast.success(`${asset.name} added`);
  }, [onSelectAsset, onClose, mode]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, []);

  const categoriesWithCounts = useMemo(() => {
    return CATEGORIES.map(cat => ({
      ...cat,
      count: cat.id === "favorites" ? favorites.length :
             cat.id === "recent" ? recentlyUsed.length :
             cat.count
    }));
  }, [favorites.length, recentlyUsed.length]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[80vh] p-0 bg-[#0a0a0a] border-[#252525] text-white flex flex-col overflow-hidden">
        <DialogHeader className="p-4 border-b border-[#252525] shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-violet-600 to-purple-600 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold">Asset Library</span>
              <p className="text-xs text-zinc-500 font-normal">Browse effects, bubbles, and graphics</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          <aside className="w-56 bg-[#0d0d0d] border-r border-[#252525] p-3 shrink-0 overflow-y-auto">
            <div className="space-y-1">
              {categoriesWithCounts.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                    selectedCategory === cat.id 
                      ? "bg-violet-600/20 text-violet-300 border border-violet-500/30" 
                      : "hover:bg-[#1a1a1a] text-zinc-400 hover:text-white"
                  }`}
                  data-testid={`category-${cat.id}`}
                >
                  <cat.icon className="w-4 h-4" />
                  <span className="flex-1 text-sm">{cat.name}</span>
                  <span className="text-xs bg-[#252525] px-2 py-0.5 rounded-full">{cat.count}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-[#252525]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-zinc-500 uppercase">Filter by Tag</span>
                {selectedTags.length > 0 && (
                  <button 
                    onClick={() => setSelectedTags([])}
                    className="text-[10px] text-violet-400 hover:text-violet-300"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {EFFECT_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-2 py-1 text-[10px] rounded-full transition-all ${
                      selectedTags.includes(tag)
                        ? "bg-violet-600 text-white"
                        : "bg-[#1a1a1a] text-zinc-500 hover:text-zinc-300 hover:bg-[#252525]"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#252525]">
              <label className="flex items-center gap-2 p-3 bg-[#1a1a1a] hover:bg-[#202020] rounded-lg cursor-pointer transition-colors border border-dashed border-[#303030]">
                <Upload className="w-4 h-4 text-zinc-400" />
                <span className="text-xs text-zinc-400">Upload Custom</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    toast.success("Custom asset upload coming soon");
                  }
                }} />
              </label>
            </div>
          </aside>

          <div className="flex-1 flex flex-col min-w-0">
            <div className="p-3 border-b border-[#252525] flex items-center gap-3 shrink-0">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1a] border border-[#303030] rounded-lg text-sm outline-none focus:border-violet-500 transition-colors"
                  data-testid="input-search-assets"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-[#303030] rounded"
                  >
                    <X className="w-3 h-3 text-zinc-500" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 bg-[#1a1a1a] border border-[#303030] rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded ${viewMode === "grid" ? "bg-violet-600" : "hover:bg-[#252525]"}`}
                  data-testid="button-view-grid"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded ${viewMode === "list" ? "bg-violet-600" : "hover:bg-[#252525]"}`}
                  data-testid="button-view-list"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {filteredAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="p-4 bg-[#1a1a1a] rounded-full mb-4">
                    <Search className="w-8 h-8 text-zinc-600" />
                  </div>
                  <p className="text-zinc-400 mb-2">No assets found</p>
                  <p className="text-zinc-600 text-sm">Try adjusting your search or filters</p>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-4 gap-4">
                  {filteredAssets.map(asset => (
                    <div
                      key={asset.id}
                      className="group relative bg-[#1a1a1a] rounded-xl border border-[#252525] overflow-hidden hover:border-violet-500/50 transition-all cursor-pointer"
                      onClick={() => handleSelect(asset)}
                      onMouseEnter={() => setPreviewAsset(asset)}
                      onMouseLeave={() => setPreviewAsset(null)}
                      data-testid={`asset-${asset.id}`}
                    >
                      <div className="aspect-square bg-[#0d0d0d] flex items-center justify-center p-4 relative overflow-hidden">
                        <img 
                          src={asset.url} 
                          alt={asset.name}
                          className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(asset.id); }}
                          className={`absolute top-2 right-2 p-1.5 rounded-lg transition-all ${
                            favorites.includes(asset.id) 
                              ? "bg-yellow-500 text-black" 
                              : "bg-black/50 text-white opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          <Star className="w-3.5 h-3.5" fill={favorites.includes(asset.id) ? "currentColor" : "none"} />
                        </button>
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium truncate">{asset.name}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {asset.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-[#252525] rounded text-zinc-500">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="p-3 bg-violet-600 rounded-full shadow-lg">
                          <Plus className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAssets.map(asset => (
                    <div
                      key={asset.id}
                      className="flex items-center gap-4 p-3 bg-[#1a1a1a] rounded-lg border border-[#252525] hover:border-violet-500/50 transition-all cursor-pointer group"
                      onClick={() => handleSelect(asset)}
                      data-testid={`asset-list-${asset.id}`}
                    >
                      <div className="w-16 h-16 bg-[#0d0d0d] rounded-lg flex items-center justify-center p-2 shrink-0">
                        <img 
                          src={asset.url} 
                          alt={asset.name}
                          className="max-w-full max-h-full object-contain"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{asset.name}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {asset.tags.map(tag => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-[#252525] rounded text-zinc-500">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(asset.id); }}
                          className={`p-2 rounded-lg transition-all ${
                            favorites.includes(asset.id) 
                              ? "bg-yellow-500/20 text-yellow-500" 
                              : "hover:bg-[#252525] text-zinc-500"
                          }`}
                        >
                          <Star className="w-4 h-4" fill={favorites.includes(asset.id) ? "currentColor" : "none"} />
                        </button>
                        <button className="p-2 bg-violet-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-[#252525] flex items-center justify-between text-sm text-zinc-500 shrink-0">
              <span>{filteredAssets.length} assets</span>
              {selectedTags.length > 0 && (
                <span className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5" />
                  {selectedTags.length} filter{selectedTags.length > 1 ? "s" : ""} applied
                </span>
              )}
            </div>
          </div>
        </div>

        {previewAsset && (
          <div className="absolute bottom-20 right-8 p-4 bg-[#1a1a1a] border border-[#303030] rounded-xl shadow-2xl pointer-events-none z-50">
            <img 
              src={previewAsset.url} 
              alt={previewAsset.name}
              className="w-40 h-40 object-contain"
            />
            <p className="text-center text-sm mt-2 font-medium">{previewAsset.name}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AssetBrowserTrigger({ 
  onSelectAsset,
  children,
  className = ""
}: { 
  onSelectAsset: (asset: AssetItem) => void;
  children?: React.ReactNode;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className={className || "p-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-lg transition-all flex items-center gap-2"}
        data-testid="button-open-asset-browser"
      >
        {children || (
          <>
            <Layers className="w-4 h-4" />
            <span className="text-sm font-medium">Assets</span>
          </>
        )}
      </button>
      <AssetBrowser 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        onSelectAsset={onSelectAsset}
      />
    </>
  );
}

export type { AssetItem };
