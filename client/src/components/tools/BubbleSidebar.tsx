import { useState, useMemo } from "react";
import { Search, X, Zap, MessageSquare, ChevronDown, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AssetItem {
  id: string;
  name: string;
  url: string;
  category: "effect" | "bubble";
  tags: string[];
}

const BUILTIN_EFFECTS: AssetItem[] = [
  { id: "effect_10", name: "CRASH", url: "/assets/effects/10_1765504738170.png", category: "effect", tags: ["action", "impact", "crash"] },
  { id: "effect_11", name: "KABOOM", url: "/assets/effects/11_1765504738171.png", category: "effect", tags: ["explosion", "impact", "kaboom"] },
  { id: "effect_12", name: "WOW", url: "/assets/effects/12_1765504738171.png", category: "effect", tags: ["reaction", "wow", "surprise"] },
  { id: "effect_13", name: "BOOM", url: "/assets/effects/13_1765504738171.png", category: "effect", tags: ["explosion", "impact", "boom"] },
  { id: "effect_14", name: "WHAM", url: "/assets/effects/14_1765504738171.png", category: "effect", tags: ["action", "impact", "wham"] },
  { id: "effect_15", name: "ZAP", url: "/assets/effects/15_1765504738171.png", category: "effect", tags: ["electric", "energy", "zap"] },
  { id: "effect_16", name: "BANG", url: "/assets/effects/16_1765504738171.png", category: "effect", tags: ["action", "gun", "bang"] },
  { id: "effect_17", name: "SMASH", url: "/assets/effects/17_1765504738172.png", category: "effect", tags: ["action", "impact", "smash"] },
  { id: "effect_18", name: "THWACK", url: "/assets/effects/18_1765504790325.png", category: "effect", tags: ["action", "hit", "thwack"] },
  { id: "effect_19", name: "CRUNCH", url: "/assets/effects/19_1765504790325.png", category: "effect", tags: ["action", "impact", "crunch"] },
  { id: "effect_20", name: "WHOOSH", url: "/assets/effects/20_1765504790325.png", category: "effect", tags: ["motion", "speed", "whoosh"] },
  { id: "effect_21", name: "SLASH", url: "/assets/effects/21_1765504790325.png", category: "effect", tags: ["action", "cut", "slash"] },
  { id: "effect_22", name: "KAPOW", url: "/assets/effects/22_1765504790325.png", category: "effect", tags: ["action", "impact", "kapow"] },
  { id: "effect_23", name: "SPLAT", url: "/assets/effects/23_1765504790326.png", category: "effect", tags: ["action", "messy", "splat"] },
  { id: "effect_24", name: "THUD", url: "/assets/effects/24_1765504790326.png", category: "effect", tags: ["action", "impact", "thud"] },
  { id: "effect_25", name: "CRACK", url: "/assets/effects/25_1765504790326.png", category: "effect", tags: ["action", "break", "crack"] },
  { id: "effect_26", name: "SNAP", url: "/assets/effects/26_1765504790326.png", category: "effect", tags: ["action", "break", "snap"] },
  { id: "effect_27", name: "SIZZLE", url: "/assets/effects/27_1765504790326.png", category: "effect", tags: ["heat", "fire", "sizzle"] },
  { id: "effect_28", name: "FWOOSH", url: "/assets/effects/28_1765504821452.png", category: "effect", tags: ["fire", "flame", "fwoosh"] },
  { id: "effect_29", name: "ZING", url: "/assets/effects/29_1765504821453.png", category: "effect", tags: ["speed", "sharp", "zing"] },
];

const BUILTIN_BUBBLES: AssetItem[] = [
  { id: "bubble_1", name: "Speech Bubble 1", url: "/assets/bubbles/Comic_Speech_Bubbles_No_Middle_1_1765504897119.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_2", name: "Speech Bubble 2", url: "/assets/bubbles/Comic_Speech_Bubbles_No_Middle_2_1765504897120.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_3", name: "Speech Bubble 3", url: "/assets/bubbles/Comic_Speech_Bubbles_No_Middle_3_1765504897120.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_4", name: "Speech Bubble 4", url: "/assets/bubbles/Comic_Speech_Bubbles_No_Middle_4_1765504897120.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_5", name: "Speech Bubble 5", url: "/assets/bubbles/Comic_Speech_Bubbles_No_Middle_5_1765504897121.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_6", name: "Speech Bubble 6", url: "/assets/bubbles/Comic_Speech_Bubbles_No_Middle_6_1765504897121.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_7", name: "Speech Bubble 7", url: "/assets/bubbles/Comic_Speech_Bubbles_No_Middle_7_1765504897121.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_8", name: "Speech Bubble 8", url: "/assets/bubbles/Comic_Speech_Bubbles_No_Middle_8_1765504897121.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_9", name: "Speech Bubble 9", url: "/assets/bubbles/Comic_Speech_Bubbles_No_Middle_9_1765504897122.png", category: "bubble", tags: ["speech", "thought", "bubble"] },
  { id: "bubble_10", name: "Speech Bubble 10", url: "/assets/bubbles/Comic_Speech_Bubbles_No_Middle_10_1765504897122.png", category: "bubble", tags: ["speech", "shout", "yell"] },
  { id: "bubble_11", name: "Speech Bubble 11", url: "/assets/bubbles/Comic_Speech_Bubbles_No_Middle_11_1765504897122.png", category: "bubble", tags: ["speech", "whisper", "quiet"] },
  { id: "bubble_12", name: "Speech Bubble 12", url: "/assets/bubbles/Comic_Speech_Bubbles_No_Middle_12_1765504897122.png", category: "bubble", tags: ["speech", "burst", "exclaim"] },
  { id: "bubble_13", name: "Speech Bubble 13", url: "/assets/bubbles/Comic_Speech_Bubbles_No_Middle_13_1765504897122.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_14", name: "Speech Bubble 14", url: "/assets/bubbles/Comic_Speech_Bubbles_No_Middle_14_1765504897123.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_15", name: "Speech Bubble 15", url: "/assets/bubbles/Comic_Speech_Bubbles_No_Middle_15_1765504897123.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_16", name: "Speech Bubble 16", url: "/assets/bubbles/Comic_Speech_Bubbles_No_Middle_16_1765504897123.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_17", name: "Speech Bubble 17", url: "/assets/bubbles/Comic_Speech_Bubbles_No_Middle_17_1765505335119.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_18", name: "Speech Bubble 18", url: "/assets/bubbles/Comic_Speech_Bubbles_No_Middle_18_1765505335119.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_19", name: "Speech Bubble 19", url: "/assets/bubbles/Comic_Speech_Bubbles_No_Middle_19_1765505335120.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
  { id: "bubble_20", name: "Speech Bubble 20", url: "/assets/bubbles/Comic_Speech_Bubbles_No_Middle_20_1765505335120.png", category: "bubble", tags: ["speech", "dialogue", "talk"] },
];

const SVG_DIALOG_BUBBLES: AssetItem[] = Array.from({ length: 20 }, (_, i) => {
  const num = String(i + 1).padStart(2, '0');
  return {
    id: `dialog_${num}`,
    name: `Dialog ${i + 1}`,
    url: `/assets/bubbles/Comic style dialog-${num}.svg`,
    category: "bubble" as const,
    tags: ["speech", "dialogue", "comic", "svg"],
  };
});

interface BubbleSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAsset: (asset: { url: string; name: string }) => void;
  hasPanelSelected: boolean;
}

export function BubbleSidebar({ isOpen, onClose, onSelectAsset, hasPanelSelected }: BubbleSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    effects: true,
    bubbles: true,
    svgDialogs: true,
  });

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const filteredEffects = useMemo(() => {
    if (!searchQuery) return BUILTIN_EFFECTS;
    const query = searchQuery.toLowerCase();
    return BUILTIN_EFFECTS.filter(
      asset => asset.name.toLowerCase().includes(query) || asset.tags.some(tag => tag.includes(query))
    );
  }, [searchQuery]);

  const filteredBubbles = useMemo(() => {
    if (!searchQuery) return BUILTIN_BUBBLES;
    const query = searchQuery.toLowerCase();
    return BUILTIN_BUBBLES.filter(
      asset => asset.name.toLowerCase().includes(query) || asset.tags.some(tag => tag.includes(query))
    );
  }, [searchQuery]);

  const filteredSvgDialogs = useMemo(() => {
    if (!searchQuery) return SVG_DIALOG_BUBBLES;
    const query = searchQuery.toLowerCase();
    return SVG_DIALOG_BUBBLES.filter(
      asset => asset.name.toLowerCase().includes(query) || asset.tags.some(tag => tag.includes(query))
    );
  }, [searchQuery]);

  if (!isOpen) return null;

  const renderAssetGrid = (assets: AssetItem[]) => (
    <div className="grid grid-cols-3 gap-1 p-2">
      {assets.map((asset) => (
        <button
          key={asset.id}
          onClick={() => {
            if (!hasPanelSelected) {
              return;
            }
            onSelectAsset({ url: asset.url, name: asset.name });
          }}
          className={`aspect-square border border-zinc-700 bg-white p-1 hover:border-white transition-colors ${
            !hasPanelSelected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
          title={hasPanelSelected ? asset.name : "Select a panel first"}
          data-testid={`sidebar-asset-${asset.id}`}
        >
          <img
            src={asset.url}
            alt={asset.name}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        </button>
      ))}
    </div>
  );

  return (
    <aside className="w-64 border-r border-zinc-800 bg-zinc-900 flex flex-col" data-testid="bubble-sidebar">
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> Bubbles & Effects
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white" data-testid="sidebar-close">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-2 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs py-2 pl-8 pr-3 focus:outline-none focus:border-white"
            data-testid="sidebar-search"
          />
        </div>
      </div>

      {!hasPanelSelected && (
        <div className="p-2 bg-zinc-800 text-yellow-400 text-xs text-center">
          Select a panel to add assets
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          <button
            onClick={() => toggleCategory('effects')}
            className="w-full flex items-center justify-between p-2 hover:bg-zinc-800 text-white text-sm font-medium"
            data-testid="category-effects"
          >
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              Action Effects ({filteredEffects.length})
            </span>
            {expandedCategories.effects ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {expandedCategories.effects && renderAssetGrid(filteredEffects)}

          <button
            onClick={() => toggleCategory('bubbles')}
            className="w-full flex items-center justify-between p-2 hover:bg-zinc-800 text-white text-sm font-medium"
            data-testid="category-bubbles"
          >
            <span className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              Speech Bubbles ({filteredBubbles.length})
            </span>
            {expandedCategories.bubbles ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {expandedCategories.bubbles && renderAssetGrid(filteredBubbles)}

          <button
            onClick={() => toggleCategory('svgDialogs')}
            className="w-full flex items-center justify-between p-2 hover:bg-zinc-800 text-white text-sm font-medium"
            data-testid="category-svg-dialogs"
          >
            <span className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-green-400" />
              Comic Dialogs ({filteredSvgDialogs.length})
            </span>
            {expandedCategories.svgDialogs ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {expandedCategories.svgDialogs && renderAssetGrid(filteredSvgDialogs)}
        </div>
      </ScrollArea>
    </aside>
  );
}
