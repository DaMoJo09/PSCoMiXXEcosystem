import { Layout } from "@/components/layout/Layout";
import { 
  Save, Download, RefreshCw, Sparkles, Package, RotateCw, ImageIcon, 
  Wand2, ArrowLeft, Upload, Type, Palette, Settings, X, Plus, Trash2,
  Copy, Layers, Eye
} from "lucide-react";
import cardArt from "@assets/generated_images/cyberpunk_trading_card_art.png";
import backCoverArt from "@assets/generated_images/noir_comic_panel.png";
import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { AIGenerator } from "@/components/tools/AIGenerator";
import { useProject, useUpdateProject, useCreateProject } from "@/hooks/useProjects";
import { useAssetLibrary } from "@/contexts/AssetLibraryContext";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";

const FONT_OPTIONS = [
  { value: "Inter, sans-serif", label: "Inter" },
  { value: "'Space Grotesk', sans-serif", label: "Space Grotesk" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "'Impact', sans-serif", label: "Impact" },
  { value: "'Courier New', monospace", label: "Courier" },
  { value: "'Comic Sans MS', cursive", label: "Comic Sans" },
];

const CARD_TYPES = ["Character", "Weapon", "Spell", "Event", "Location", "Item"];
const RARITIES = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"];

const PACK_TEMPLATES = [
  { id: "starter", name: "Starter Pack", cards: 10, guaranteed: ["Rare"], distribution: { Common: 5, Uncommon: 3, Rare: 2 } },
  { id: "booster", name: "Booster Pack", cards: 5, guaranteed: ["Uncommon"], distribution: { Common: 3, Uncommon: 1, Rare: 1 } },
  { id: "premium", name: "Premium Pack", cards: 7, guaranteed: ["Epic"], distribution: { Uncommon: 2, Rare: 3, Epic: 2 } },
  { id: "collectors", name: "Collector's Box", cards: 15, guaranteed: ["Legendary"], distribution: { Rare: 5, Epic: 6, Legendary: 4 } },
  { id: "mega", name: "Mega Pack", cards: 20, guaranteed: ["Mythic"], distribution: { Common: 5, Uncommon: 5, Rare: 5, Epic: 3, Legendary: 1, Mythic: 1 } },
  { id: "custom", name: "Custom Pack", cards: 5, guaranteed: [], distribution: { Common: 2, Uncommon: 1, Rare: 1, Epic: 1 } },
];

const RARITY_COLORS: { [key: string]: string } = {
  Common: "#4a4a4a",
  Uncommon: "#6b6b6b",
  Rare: "#8c8c8c",
  Epic: "#a8a8a8",
  Legendary: "#c4c4c4",
  Mythic: "#ffffff",
};

const RARITY_PATTERNS: { [key: string]: string } = {
  Common: "none",
  Uncommon: "dots",
  Rare: "stripes",
  Epic: "crosshatch",
  Legendary: "diamonds",
  Mythic: "stars",
};

const RARITY_ODDS: { [key: string]: number } = {
  Common: 50,
  Uncommon: 25,
  Rare: 15,
  Epic: 7,
  Legendary: 2.5,
  Mythic: 0.5,
};

const CARD_TEMPLATES = [
  { id: "mtg-style", name: "Magic: The Gathering Style", borderColor: "#1a1a1a", accentColor: "#C9A227", frameStyle: "classic" },
  { id: "pokemon-style", name: "Pokemon Style", borderColor: "#FFD93D", accentColor: "#FF6B6B", frameStyle: "rounded" },
  { id: "yugioh-style", name: "Yu-Gi-Oh! Style", borderColor: "#8B4513", accentColor: "#FFD700", frameStyle: "angular" },
  { id: "hearthstone-style", name: "Hearthstone Style", borderColor: "#4A3728", accentColor: "#FF9F1C", frameStyle: "ornate" },
  { id: "cyberpunk", name: "Cyberpunk Neon", borderColor: "#000000", accentColor: "#00FFFF", frameStyle: "tech" },
  { id: "noir-classic", name: "Noir Classic", borderColor: "#1a1a1a", accentColor: "#FFFFFF", frameStyle: "minimal" },
  { id: "vintage-sepia", name: "Vintage Sepia", borderColor: "#5C4033", accentColor: "#D4A574", frameStyle: "aged" },
  { id: "horror-blood", name: "Horror/Blood", borderColor: "#1a0000", accentColor: "#8B0000", frameStyle: "splatter" },
  { id: "fantasy-gold", name: "Fantasy Gold", borderColor: "#2C1810", accentColor: "#FFD700", frameStyle: "ornate" },
  { id: "scifi-hologram", name: "Sci-Fi Hologram", borderColor: "#0a0a2e", accentColor: "#00FF88", frameStyle: "holographic" },
  { id: "minimalist-white", name: "Minimalist White", borderColor: "#FFFFFF", accentColor: "#000000", frameStyle: "clean" },
  { id: "dark-souls", name: "Dark Souls Style", borderColor: "#1a1a1a", accentColor: "#FF6600", frameStyle: "gothic" },
];

const CARD_FILTERS = {
  contrast: 50,
  brightness: 50,
  saturation: 100,
  grayscale: false,
  sepia: false,
  halftone: false,
  grain: false,
  vignette: false,
};

interface CardData {
  id: string;
  name: string;
  type: string;
  rarity: string;
  frontImage: string;
  backImage: string;
  attack: number;
  defense: number;
  cost: number;
  lore: string;
  effect: string;
  nameFont: string;
  statsFont: string;
  loreFont: string;
  borderColor: string;
  accentColor: string;
  templateId: string;
  filters: typeof CARD_FILTERS;
}

interface PackData {
  name: string;
  cardsPerPack: number;
  rarityDistribution: { [key: string]: number };
  cards: CardData[];
  packArt: string;
  templateId: string;
  seriesName: string;
  setNumber: string;
  totalInSet: number;
  guaranteedRarities: string[];
  price: string;
}

export default function CardCreator() {
  const [location, navigate] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const projectId = searchParams.get('id');
  
  const { data: project } = useProject(projectId || '');
  const updateProject = useUpdateProject();
  const createProject = useCreateProject();
  const { importFromFile } = useAssetLibrary();

  const [mode, setMode] = useState<"single" | "pack">("single");
  const [side, setSide] = useState<"front" | "back">("front");
  const [showAIGen, setShowAIGen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [activeSection, setActiveSection] = useState<"design" | "stats" | "lore" | "style">("design");

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const [cardData, setCardData] = useState<CardData>({
    id: `card_${Date.now()}`,
    name: "Cyber Ronin",
    type: "Character",
    rarity: "Legendary",
    frontImage: cardArt,
    backImage: backCoverArt,
    attack: 8,
    defense: 4,
    cost: 3,
    lore: "A warrior from the neon slums, he fights not for honor, but for the highest bidder. His blade hums with a frequency that can shatter diamond.",
    effect: "When this card enters play, deal 2 damage to target enemy.",
    nameFont: "'Impact', sans-serif",
    statsFont: "'Courier New', monospace",
    loreFont: "Georgia, serif",
    borderColor: "#000000",
    accentColor: "#FFD700",
    templateId: "noir-classic",
    filters: { ...CARD_FILTERS },
  });

  const [packData, setPackData] = useState<PackData>({
    name: "Cyber Legends Pack",
    cardsPerPack: 5,
    rarityDistribution: { Common: 2, Uncommon: 1, Rare: 1, Epic: 1 },
    cards: [],
    packArt: cardArt,
    templateId: "booster",
    seriesName: "Series 1",
    setNumber: "001",
    totalInSet: 100,
    guaranteedRarities: ["Uncommon"],
    price: "$4.99",
  });

  const [selectedPackCard, setSelectedPackCard] = useState<string | null>(null);
  const [showPackOpening, setShowPackOpening] = useState(false);
  const [revealedCards, setRevealedCards] = useState<CardData[]>([]);
  const [isRevealing, setIsRevealing] = useState(false);
  const [packSection, setPackSection] = useState<"cards" | "settings" | "simulate">("cards");
  const packArtInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const creatingFlag = sessionStorage.getItem('card_creating');
    if (!projectId && !creatingFlag && !createProject.isPending) {
      sessionStorage.setItem('card_creating', 'true');
      setIsCreating(true);
      createProject.mutateAsync({
        title: "Untitled Card",
        type: "card",
        status: "draft",
        data: cardData,
      }).then((newProject) => {
        sessionStorage.removeItem('card_creating');
        setIsCreating(false);
        navigate(`/creator/card?id=${newProject.id}`, { replace: true });
      }).catch(() => {
        toast.error("Failed to create project");
        sessionStorage.removeItem('card_creating');
        setIsCreating(false);
      });
    } else if (projectId) {
      sessionStorage.removeItem('card_creating');
      setIsCreating(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (project) {
      const data = project.data as CardData;
      if (data) setCardData(prev => ({ ...prev, ...data }));
    }
  }, [project]);

  const updateCard = (updates: Partial<CardData>) => {
    setCardData(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (projectId) {
        await updateProject.mutateAsync({
          id: projectId,
          data: { title: cardData.name, data: cardData },
        });
      }
      toast.success("Card saved");
    } catch (error: any) {
      toast.error(error.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, side: "front" | "back") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      updateCard(side === "front" ? { frontImage: url } : { backImage: url });
      toast.success(`${side === "front" ? "Front" : "Back"} image updated`);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleAIGenerated = (url: string) => {
    updateCard(side === "front" ? { frontImage: url } : { backImage: url });
    setShowAIGen(false);
    toast.success("AI image applied");
  };

  const applyCardTemplate = (templateId: string) => {
    const template = CARD_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;
    updateCard({
      templateId,
      borderColor: template.borderColor,
      accentColor: template.accentColor,
    });
    toast.success(`Applied ${template.name} template`);
  };

  const updateCardFilter = (key: keyof typeof CARD_FILTERS, value: any) => {
    updateCard({ filters: { ...cardData.filters, [key]: value } });
  };

  const getCardFilterStyle = (): React.CSSProperties => {
    const f = cardData.filters;
    return {
      filter: `contrast(${100 + (f.contrast - 50)}%) brightness(${100 + (f.brightness - 50)}%) saturate(${f.saturation}%)${f.grayscale ? ' grayscale(100%)' : ''}${f.sepia ? ' sepia(100%)' : ''}`
    };
  };

  const addCardToPack = () => {
    const newCard: CardData = {
      id: `card_${Date.now()}`,
      name: `Card ${packData.cards.length + 1}`,
      type: CARD_TYPES[Math.floor(Math.random() * CARD_TYPES.length)],
      rarity: RARITIES[Math.floor(Math.random() * 3)],
      frontImage: cardArt,
      backImage: backCoverArt,
      attack: Math.floor(Math.random() * 10) + 1,
      defense: Math.floor(Math.random() * 10) + 1,
      cost: Math.floor(Math.random() * 5) + 1,
      lore: "A mysterious card waiting to be designed...",
      effect: "Effect to be determined.",
      nameFont: "'Impact', sans-serif",
      statsFont: "'Courier New', monospace",
      loreFont: "Georgia, serif",
      borderColor: "#000000",
      accentColor: "#FFD700",
      templateId: "noir-classic",
      filters: { ...CARD_FILTERS },
    };
    setPackData({ ...packData, cards: [...packData.cards, newCard] });
    setSelectedPackCard(newCard.id);
    toast.success("Card added to pack");
  };

  const updatePackCard = (cardId: string, updates: Partial<CardData>) => {
    setPackData({
      ...packData,
      cards: packData.cards.map(c => c.id === cardId ? { ...c, ...updates } : c)
    });
  };

  const removeCardFromPack = (cardId: string) => {
    setPackData({
      ...packData,
      cards: packData.cards.filter(c => c.id !== cardId)
    });
    if (selectedPackCard === cardId) setSelectedPackCard(null);
    toast.success("Card removed from pack");
  };

  const duplicatePackCard = (cardId: string) => {
    const card = packData.cards.find(c => c.id === cardId);
    if (card) {
      const newCard = { ...card, id: `card_${Date.now()}`, name: `${card.name} (Copy)` };
      setPackData({ ...packData, cards: [...packData.cards, newCard] });
      toast.success("Card duplicated");
    }
  };

  const handlePackArtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setPackData({ ...packData, packArt: event.target?.result as string });
      toast.success("Pack art updated");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const applyPackTemplate = (templateId: string) => {
    const template = PACK_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;
    setPackData({
      ...packData,
      templateId,
      name: template.name,
      cardsPerPack: template.cards,
      rarityDistribution: { ...template.distribution },
      guaranteedRarities: [...template.guaranteed],
    });
    toast.success(`Applied ${template.name} template`);
  };

  const simulatePackOpening = () => {
    if (packData.cards.length === 0) {
      toast.error("Add some cards to the pack first!");
      return;
    }
    
    setIsRevealing(true);
    setRevealedCards([]);
    setShowPackOpening(true);
    
    const cardsToReveal: CardData[] = [];
    const availableByRarity: { [key: string]: CardData[] } = {};
    const maxCards = packData.cardsPerPack;
    
    packData.cards.forEach(card => {
      if (!availableByRarity[card.rarity]) availableByRarity[card.rarity] = [];
      availableByRarity[card.rarity].push(card);
    });
    
    packData.guaranteedRarities.forEach(rarity => {
      if (cardsToReveal.length >= maxCards) return;
      if (availableByRarity[rarity]?.length > 0) {
        const randomCard = availableByRarity[rarity][Math.floor(Math.random() * availableByRarity[rarity].length)];
        cardsToReveal.push({ ...randomCard, id: `revealed_${Date.now()}_${Math.random()}` });
      }
    });
    
    while (cardsToReveal.length < maxCards && packData.cards.length > 0) {
      const randomCard = packData.cards[Math.floor(Math.random() * packData.cards.length)];
      cardsToReveal.push({ ...randomCard, id: `revealed_${Date.now()}_${Math.random()}` });
    }
    
    let revealIndex = 0;
    const revealInterval = setInterval(() => {
      if (revealIndex < cardsToReveal.length) {
        setRevealedCards(prev => [...prev, cardsToReveal[revealIndex]]);
        revealIndex++;
      } else {
        clearInterval(revealInterval);
        setIsRevealing(false);
      }
    }, 500);
  };

  const getPackStats = () => {
    const stats: { [key: string]: number } = {};
    packData.cards.forEach(card => {
      stats[card.rarity] = (stats[card.rarity] || 0) + 1;
    });
    return stats;
  };

  const selectedCard = packData.cards.find(c => c.id === selectedPackCard);

  if (isCreating) {
    return (
      <Layout>
        <div className="h-screen flex items-center justify-center bg-black">
          <div className="text-center text-white">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-400">Creating card project...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-screen flex flex-col bg-zinc-950 text-white">
        <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 hover:bg-zinc-800" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <h2 className="font-display font-bold text-lg">Card Forge</h2>
            <div className="flex bg-zinc-800 p-1">
              <button 
                onClick={() => setMode("single")}
                className={`px-3 py-1 text-xs font-medium flex items-center gap-2 ${mode === "single" ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
              >
                <Sparkles className="w-3 h-3" /> Single Card
              </button>
              <button 
                onClick={() => setMode("pack")}
                className={`px-3 py-1 text-xs font-medium flex items-center gap-2 ${mode === "pack" ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
              >
                <Package className="w-3 h-3" /> Pack Builder
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save"}
            </button>
            <button className="px-4 py-2 bg-white text-black text-sm font-bold flex items-center gap-2 hover:bg-zinc-200">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {mode === "single" ? (
          <div className="w-80 p-4 overflow-auto border-r border-zinc-800 bg-zinc-900 space-y-4">
            <div className="flex border-b border-zinc-700">
              {["design", "stats", "lore", "style"].map(section => (
                <button
                  key={section}
                  onClick={() => setActiveSection(section as any)}
                  className={`flex-1 py-2 text-xs font-bold uppercase ${activeSection === section ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
                >
                  {section}
                </button>
              ))}
            </div>

            {activeSection === "design" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400">Card Name</label>
                  <input 
                    type="text" 
                    value={cardData.name}
                    onChange={(e) => updateCard({ name: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-zinc-400">Type</label>
                    <select 
                      value={cardData.type}
                      onChange={(e) => updateCard({ type: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                    >
                      {CARD_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-zinc-400">Rarity</label>
                    <select 
                      value={cardData.rarity}
                      onChange={(e) => updateCard({ rarity: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                    >
                      {RARITIES.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400 flex justify-between">
                    <span>Front Art</span>
                    <button onClick={() => { setSide("front"); setShowAIGen(true); }} className="text-[10px] bg-white text-black px-2 py-0.5">AI GEN</button>
                  </label>
                  <div 
                    onClick={() => frontInputRef.current?.click()}
                    className="aspect-video bg-zinc-800 border border-zinc-700 flex items-center justify-center cursor-pointer hover:border-white relative overflow-hidden"
                  >
                    {cardData.frontImage ? (
                      <img src={cardData.frontImage} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-zinc-500 text-xs"><Upload className="w-4 h-4 mx-auto mb-1" /> Upload</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400 flex justify-between">
                    <span>Back Art</span>
                    <button onClick={() => { setSide("back"); setShowAIGen(true); }} className="text-[10px] bg-white text-black px-2 py-0.5">AI GEN</button>
                  </label>
                  <div 
                    onClick={() => backInputRef.current?.click()}
                    className="aspect-video bg-zinc-800 border border-zinc-700 flex items-center justify-center cursor-pointer hover:border-white relative overflow-hidden"
                  >
                    {cardData.backImage ? (
                      <img src={cardData.backImage} className="w-full h-full object-cover opacity-50 grayscale" />
                    ) : (
                      <span className="text-zinc-500 text-xs"><Upload className="w-4 h-4 mx-auto mb-1" /> Upload</span>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-700">
                  <label className="text-xs font-bold uppercase text-zinc-400 mb-2 block">Card Templates</label>
                  <select
                    value={cardData.templateId}
                    onChange={(e) => applyCardTemplate(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                  >
                    {CARD_TEMPLATES.map(template => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-4 border-t border-zinc-700 space-y-3">
                  <label className="text-xs font-bold uppercase text-zinc-400 block">Image Filters</label>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-400">Contrast</span>
                      <span className="text-xs text-zinc-500">{cardData.filters.contrast}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" 
                      value={cardData.filters.contrast}
                      onChange={(e) => updateCardFilter('contrast', Number(e.target.value))}
                      className="w-full accent-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-400">Brightness</span>
                      <span className="text-xs text-zinc-500">{cardData.filters.brightness}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" 
                      value={cardData.filters.brightness}
                      onChange={(e) => updateCardFilter('brightness', Number(e.target.value))}
                      className="w-full accent-white"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={cardData.filters.grayscale}
                        onChange={(e) => updateCardFilter('grayscale', e.target.checked)}
                        className="w-3 h-3"
                      />
                      Grayscale
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={cardData.filters.sepia}
                        onChange={(e) => updateCardFilter('sepia', e.target.checked)}
                        className="w-3 h-3"
                      />
                      Sepia
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={cardData.filters.halftone}
                        onChange={(e) => updateCardFilter('halftone', e.target.checked)}
                        className="w-3 h-3"
                      />
                      Halftone
                    </label>
                  </div>

                  <button 
                    onClick={() => updateCard({ filters: { ...CARD_FILTERS } })}
                    className="w-full py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-600"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            )}

            {activeSection === "stats" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-zinc-400">ATK</label>
                    <input 
                      type="number" 
                      value={cardData.attack}
                      onChange={(e) => updateCard({ attack: Number(e.target.value) })}
                      className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm text-center"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-zinc-400">DEF</label>
                    <input 
                      type="number" 
                      value={cardData.defense}
                      onChange={(e) => updateCard({ defense: Number(e.target.value) })}
                      className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm text-center"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-zinc-400">Cost</label>
                    <input 
                      type="number" 
                      value={cardData.cost}
                      onChange={(e) => updateCard({ cost: Number(e.target.value) })}
                      className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm text-center"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400">Card Effect</label>
                  <textarea 
                    value={cardData.effect}
                    onChange={(e) => updateCard({ effect: e.target.value })}
                    className="w-full h-24 bg-zinc-800 border border-zinc-700 p-2 text-sm resize-none"
                  />
                </div>
              </div>
            )}

            {activeSection === "lore" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400">Flavor Text / Lore</label>
                  <textarea 
                    value={cardData.lore}
                    onChange={(e) => updateCard({ lore: e.target.value })}
                    className="w-full h-40 bg-zinc-800 border border-zinc-700 p-2 text-sm resize-none"
                  />
                </div>
              </div>
            )}

            {activeSection === "style" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400">Name Font</label>
                  <select 
                    value={cardData.nameFont}
                    onChange={(e) => updateCard({ nameFont: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                  >
                    {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400">Stats Font</label>
                  <select 
                    value={cardData.statsFont}
                    onChange={(e) => updateCard({ statsFont: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                  >
                    {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400">Lore Font</label>
                  <select 
                    value={cardData.loreFont}
                    onChange={(e) => updateCard({ loreFont: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                  >
                    {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-zinc-400">Border</label>
                    <input 
                      type="color" 
                      value={cardData.borderColor}
                      onChange={(e) => updateCard({ borderColor: e.target.value })}
                      className="w-full h-10 bg-zinc-800 border border-zinc-700 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-zinc-400">Accent</label>
                    <input 
                      type="color" 
                      value={cardData.accentColor}
                      onChange={(e) => updateCard({ accentColor: e.target.value })}
                      className="w-full h-10 bg-zinc-800 border border-zinc-700 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-zinc-700">
              <button 
                onClick={() => setSide(side === "front" ? "back" : "front")}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-sm flex items-center justify-center gap-2"
              >
                <RotateCw className="w-4 h-4" /> Flip to {side === "front" ? "Back" : "Front"}
              </button>
            </div>
          </div>
          ) : (
          <div className="w-80 overflow-auto border-r border-zinc-800 bg-zinc-900 flex flex-col">
            <div className="flex border-b border-zinc-800">
              <button
                onClick={() => setPackSection("cards")}
                className={`flex-1 py-2 text-xs font-bold uppercase ${packSection === "cards" ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
              >
                Cards
              </button>
              <button
                onClick={() => setPackSection("settings")}
                className={`flex-1 py-2 text-xs font-bold uppercase ${packSection === "settings" ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
              >
                Settings
              </button>
              <button
                onClick={() => setPackSection("simulate")}
                className={`flex-1 py-2 text-xs font-bold uppercase ${packSection === "simulate" ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
              >
                Simulate
              </button>
            </div>

            <div className="flex-1 p-4 overflow-auto space-y-4">
              {packSection === "cards" && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold uppercase text-zinc-400">Cards in Pack</label>
                      <span className="text-xs text-zinc-500">{packData.cards.length} cards</span>
                    </div>
                    <button 
                      onClick={addCardToPack}
                      className="w-full py-2 bg-white text-black text-sm font-bold flex items-center justify-center gap-2 hover:bg-zinc-200"
                      data-testid="button-add-pack-card"
                    >
                      <Plus className="w-4 h-4" /> Add Card
                    </button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-auto">
                    {packData.cards.map((card, idx) => (
                      <div 
                        key={card.id}
                        onClick={() => setSelectedPackCard(card.id)}
                        className={`p-2 border cursor-pointer flex items-center gap-2 group ${
                          selectedPackCard === card.id ? "bg-white text-black border-white" : "border-zinc-700 hover:border-zinc-500"
                        }`}
                        data-testid={`card-pack-item-${idx}`}
                      >
                        <div className="w-8 h-10 bg-zinc-800 overflow-hidden flex-shrink-0">
                          <img src={card.frontImage} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{card.name}</p>
                          <p className={`text-[10px] flex items-center gap-1 ${selectedPackCard === card.id ? "text-zinc-600" : "text-zinc-500"}`}>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: RARITY_COLORS[card.rarity] }} />
                            {card.rarity} {card.type}
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeCardFromPack(card.id); }}
                          className={`p-1 opacity-0 group-hover:opacity-100 ${selectedPackCard === card.id ? "hover:text-red-600" : "hover:text-red-500"}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {selectedCard && (
                    <div className="pt-4 border-t border-zinc-700 space-y-3">
                      <h4 className="text-xs font-bold uppercase text-zinc-400">Edit Selected Card</h4>
                      <div className="space-y-2">
                        <input 
                          type="text" 
                          value={selectedCard.name}
                          onChange={(e) => updatePackCard(selectedCard.id, { name: e.target.value })}
                          className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                          placeholder="Card name"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select 
                          value={selectedCard.type}
                          onChange={(e) => updatePackCard(selectedCard.id, { type: e.target.value })}
                          className="bg-zinc-800 border border-zinc-700 p-2 text-xs"
                        >
                          {CARD_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                        <select 
                          value={selectedCard.rarity}
                          onChange={(e) => updatePackCard(selectedCard.id, { rarity: e.target.value })}
                          className="bg-zinc-800 border border-zinc-700 p-2 text-xs"
                        >
                          {RARITIES.map(r => <option key={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-500">ATK</label>
                          <input 
                            type="number" 
                            value={selectedCard.attack}
                            onChange={(e) => updatePackCard(selectedCard.id, { attack: Number(e.target.value) })}
                            className="w-full bg-zinc-800 border border-zinc-700 p-1 text-xs text-center"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-500">DEF</label>
                          <input 
                            type="number" 
                            value={selectedCard.defense}
                            onChange={(e) => updatePackCard(selectedCard.id, { defense: Number(e.target.value) })}
                            className="w-full bg-zinc-800 border border-zinc-700 p-1 text-xs text-center"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-500">Cost</label>
                          <input 
                            type="number" 
                            value={selectedCard.cost}
                            onChange={(e) => updatePackCard(selectedCard.id, { cost: Number(e.target.value) })}
                            className="w-full bg-zinc-800 border border-zinc-700 p-1 text-xs text-center"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => duplicatePackCard(selectedCard.id)}
                        className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-xs flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-3 h-3" /> Duplicate Card
                      </button>
                    </div>
                  )}
                </>
              )}

              {packSection === "settings" && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-zinc-400">Pack Template</label>
                    <div className="grid grid-cols-2 gap-2">
                      {PACK_TEMPLATES.map(template => (
                        <button
                          key={template.id}
                          onClick={() => applyPackTemplate(template.id)}
                          className={`p-2 text-xs border text-left ${
                            packData.templateId === template.id 
                              ? "bg-white text-black border-white" 
                              : "border-zinc-700 hover:border-zinc-500"
                          }`}
                          data-testid={`button-pack-template-${template.id}`}
                        >
                          <p className="font-bold">{template.name}</p>
                          <p className={`text-[10px] ${packData.templateId === template.id ? "text-zinc-600" : "text-zinc-500"}`}>
                            {template.cards} cards
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-zinc-400">Pack Name</label>
                    <input 
                      type="text" 
                      value={packData.name}
                      onChange={(e) => setPackData({ ...packData, name: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-zinc-400">Series</label>
                      <input 
                        type="text" 
                        value={packData.seriesName}
                        onChange={(e) => setPackData({ ...packData, seriesName: e.target.value })}
                        className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-zinc-400">Price</label>
                      <input 
                        type="text" 
                        value={packData.price}
                        onChange={(e) => setPackData({ ...packData, price: e.target.value })}
                        className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-zinc-400 flex justify-between">
                      <span>Pack Art</span>
                    </label>
                    <div 
                      onClick={() => packArtInputRef.current?.click()}
                      className="aspect-video bg-zinc-800 border border-zinc-700 flex items-center justify-center cursor-pointer hover:border-white overflow-hidden"
                    >
                      <img src={packData.packArt} className="w-full h-full object-cover" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-zinc-400">Cards Per Pack</label>
                    <input 
                      type="number" 
                      value={packData.cardsPerPack}
                      onChange={(e) => setPackData({ ...packData, cardsPerPack: Number(e.target.value) })}
                      className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm text-center"
                      min={1}
                      max={20}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-zinc-400">Guaranteed Rarities</label>
                    <div className="flex flex-wrap gap-1">
                      {RARITIES.map(rarity => (
                        <button
                          key={rarity}
                          onClick={() => {
                            const newGuaranteed = packData.guaranteedRarities.includes(rarity)
                              ? packData.guaranteedRarities.filter(r => r !== rarity)
                              : [...packData.guaranteedRarities, rarity];
                            setPackData({ ...packData, guaranteedRarities: newGuaranteed });
                          }}
                          className={`px-2 py-1 text-[10px] font-bold border ${
                            packData.guaranteedRarities.includes(rarity)
                              ? "bg-white text-black border-white"
                              : "border-zinc-700 hover:border-zinc-500"
                          }`}
                          style={{ borderLeftColor: RARITY_COLORS[rarity], borderLeftWidth: 3 }}
                        >
                          {rarity}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {packSection === "simulate" && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-zinc-400">Pack Statistics</label>
                    <div className="bg-zinc-800 border border-zinc-700 p-3 space-y-2">
                      {Object.entries(getPackStats()).map(([rarity, count]) => (
                        <div key={rarity} className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-xs">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: RARITY_COLORS[rarity] }} />
                            {rarity}
                          </span>
                          <span className="text-xs font-mono">{count} cards</span>
                        </div>
                      ))}
                      {packData.cards.length === 0 && (
                        <p className="text-xs text-zinc-500 text-center">No cards in pack yet</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-zinc-400">Rarity Drop Rates</label>
                    <div className="bg-zinc-800 border border-zinc-700 p-3 space-y-2">
                      {RARITIES.map(rarity => (
                        <div key={rarity} className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-xs">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: RARITY_COLORS[rarity] }} />
                            {rarity}
                          </span>
                          <span className="text-xs font-mono">{RARITY_ODDS[rarity]}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-700 space-y-3">
                    <button 
                      onClick={simulatePackOpening}
                      disabled={packData.cards.length === 0}
                      className="w-full py-3 bg-white text-black text-sm font-bold flex items-center justify-center gap-2 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="button-simulate-pack"
                    >
                      <Sparkles className="w-4 h-4" /> Open Pack Simulation
                    </button>
                    <p className="text-[10px] text-zinc-500 text-center">
                      Simulates opening your pack with random card selection
                    </p>
                  </div>

                  {packData.guaranteedRarities.length > 0 && (
                    <div className="bg-zinc-800 border border-zinc-700 p-3">
                      <p className="text-xs text-zinc-400 mb-2">Guaranteed per pack:</p>
                      <div className="flex flex-wrap gap-1">
                        {packData.guaranteedRarities.map(rarity => (
                          <span 
                            key={rarity}
                            className="px-2 py-1 text-[10px] font-bold bg-zinc-900 border border-zinc-600"
                            style={{ borderLeftColor: RARITY_COLORS[rarity], borderLeftWidth: 3 }}
                          >
                            {rarity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          )}

          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div className="flex-1 bg-zinc-950 flex items-center justify-center p-8 relative">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                     style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
            
                <input 
                  ref={packArtInputRef} 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handlePackArtUpload} 
                />
            
                {mode === "pack" ? (
              <div className="relative">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold">{packData.name}</h3>
                  <p className="text-xs text-zinc-500">{packData.cards.length} / {packData.cardsPerPack} cards</p>
                </div>
                
                <div className="relative w-[280px] aspect-[3/4] mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 to-zinc-900 border-4 border-zinc-600 shadow-2xl overflow-hidden">
                    <img src={packData.packArt} className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                      <div className="bg-black/80 p-4 border border-white/20">
                        <h4 className="text-xl font-bold uppercase tracking-widest">{packData.name}</h4>
                        <p className="text-xs text-zinc-400 mt-1">{packData.cardsPerPack} Cards</p>
                      </div>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-1">
                      {packData.cards.slice(0, 5).map((card, i) => (
                        <div 
                          key={card.id}
                          className="w-8 h-12 border border-white/20 bg-zinc-800 overflow-hidden"
                          style={{ transform: `rotate(${(i - 2) * 5}deg)` }}
                        >
                          <img src={card.frontImage} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {packData.cards.slice(0, 3).map((card, i) => (
                    <div 
                      key={card.id}
                      className="absolute top-0 left-0 w-full h-full pointer-events-none"
                      style={{ 
                        transform: `translate(${(i + 1) * 8}px, ${(i + 1) * -8}px) rotate(${(i + 1) * 2}deg)`,
                        zIndex: -i - 1 
                      }}
                    >
                      <div className="w-full h-full bg-zinc-800 border-2 border-zinc-700 opacity-50" />
                    </div>
                  ))}
                </div>
                
                {packData.cards.length === 0 && (
                  <p className="text-center text-zinc-500 text-sm mt-4">
                    Add cards to your pack from the sidebar
                  </p>
                )}
              </div>
            ) : side === "front" ? (
              <div 
                className="relative w-[400px] aspect-[2.5/3.5] shadow-2xl group"
                style={{ backgroundColor: cardData.borderColor }}
              >
                <div className="absolute inset-2 bg-white flex flex-col">
                  <div 
                    className="h-10 flex justify-between items-center px-3 border-b-2"
                    style={{ borderColor: cardData.borderColor }}
                  >
                    <span 
                      className="font-bold uppercase tracking-tight text-black"
                      style={{ fontFamily: cardData.nameFont }}
                    >
                      {cardData.name}
                    </span>
                    <div className="flex gap-1">
                      {[...Array(Math.min(cardData.cost, 5))].map((_, i) => (
                        <div key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: cardData.accentColor }} />
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex-1 relative overflow-hidden border-b-2" style={{ borderColor: cardData.borderColor }}>
                    <img src={cardData.frontImage} className="w-full h-full object-cover" style={getCardFilterStyle()} />
                    {cardData.filters.halftone && (
                      <div className="absolute inset-0 pointer-events-none mix-blend-multiply" 
                           style={{ 
                             backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.3) 25%, transparent 25%)`,
                             backgroundSize: '4px 4px'
                           }} />
                    )}
                    <div className="absolute bottom-0 left-0 px-2 py-1 text-xs font-bold text-white" style={{ backgroundColor: cardData.borderColor }}>
                      {cardData.rarity.toUpperCase()}
                    </div>
                  </div>
                  
                  <div className="h-1/3 p-3 flex flex-col justify-between text-black">
                    <div className="space-y-2">
                      <p className="text-xs font-bold">{cardData.effect}</p>
                      <p 
                        className="text-[10px] italic leading-relaxed opacity-70"
                        style={{ fontFamily: cardData.loreFont }}
                      >
                        "{cardData.lore.substring(0, 100)}..."
                      </p>
                    </div>
                    
                    <div 
                      className="flex justify-between items-center border-t-2 pt-2 mt-2"
                      style={{ borderColor: cardData.borderColor }}
                    >
                      <div 
                        className="flex gap-4 text-sm font-bold"
                        style={{ fontFamily: cardData.statsFont }}
                      >
                        <span>ATK {cardData.attack}</span>
                        <span>DEF {cardData.defense}</span>
                      </div>
                      <span className="text-xs font-bold">{cardData.type}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div 
                className="relative w-[400px] aspect-[2.5/3.5] shadow-2xl flex items-center justify-center"
                style={{ backgroundColor: cardData.borderColor }}
              >
                <div className="absolute inset-4 border-2 border-white/30" />
                <div className="absolute inset-0 opacity-30">
                  <img src={cardData.backImage} className="w-full h-full object-cover grayscale" />
                </div>
                <div 
                  className="z-10 w-28 h-28 rounded-full border-4 flex items-center justify-center"
                  style={{ borderColor: cardData.accentColor }}
                >
                  <div className="w-20 h-20 rotate-45" style={{ backgroundColor: cardData.accentColor }} />
                </div>
              </div>
            )}
            
                <p className="absolute bottom-8 font-mono text-xs text-zinc-500">
                  {side.toUpperCase()} • 300 DPI PRINT READY
                </p>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-56 bg-zinc-900 border-zinc-700 text-white">
              <ContextMenuItem onClick={() => setMode(mode === "card" ? "pack" : "card")} className="hover:bg-zinc-800 cursor-pointer">
                {mode === "card" ? <Package className="w-4 h-4 mr-2" /> : <Layers className="w-4 h-4 mr-2" />}
                {mode === "card" ? "Switch to Pack Mode" : "Switch to Card Mode"}
              </ContextMenuItem>
              <ContextMenuSeparator className="bg-zinc-700" />
              {mode === "card" && (
                <>
                  <ContextMenuItem onClick={() => setSide(side === "front" ? "back" : "front")} className="hover:bg-zinc-800 cursor-pointer">
                    <RotateCw className="w-4 h-4 mr-2" /> Flip Card
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => frontInputRef.current?.click()} className="hover:bg-zinc-800 cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" /> Upload Front Image
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => backInputRef.current?.click()} className="hover:bg-zinc-800 cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" /> Upload Back Image
                  </ContextMenuItem>
                  <ContextMenuSeparator className="bg-zinc-700" />
                </>
              )}
              <ContextMenuItem onClick={() => setShowAIGen(true)} className="hover:bg-zinc-800 cursor-pointer">
                <Wand2 className="w-4 h-4 mr-2" /> AI Generate Art
              </ContextMenuItem>
              <ContextMenuSeparator className="bg-zinc-700" />
              <ContextMenuSub>
                <ContextMenuSubTrigger className="hover:bg-zinc-800 cursor-pointer">
                  <Palette className="w-4 h-4 mr-2" /> Rarity
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-40 bg-zinc-900 border-zinc-700 text-white">
                  {(["common", "uncommon", "rare", "ultra", "legendary", "mythic"] as const).map(rarity => (
                    <ContextMenuItem 
                      key={rarity}
                      onClick={() => setCardData(prev => ({ ...prev, rarity }))}
                      className="hover:bg-zinc-800 cursor-pointer capitalize"
                    >
                      {rarity}
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
            </ContextMenuContent>
          </ContextMenu>
        </div>

        <input ref={frontInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "front")} />
        <input ref={backInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "back")} />

        {showAIGen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-zinc-700 p-6 w-[500px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Wand2 className="w-5 h-5" /> AI Generate {side === "front" ? "Front" : "Back"} Art
                </h3>
                <button onClick={() => setShowAIGen(false)} className="p-2 hover:bg-zinc-800">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <AIGenerator type="card" onImageGenerated={handleAIGenerated} />
            </div>
          </div>
        )}

        {showPackOpening && (
          <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
            <div className="relative w-full max-w-4xl p-8">
              <button 
                onClick={() => { setShowPackOpening(false); setRevealedCards([]); }}
                className="absolute top-4 right-4 p-2 hover:bg-zinc-800 z-10"
                data-testid="button-close-pack-opening"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">{packData.name}</h2>
                <p className="text-zinc-400">
                  {isRevealing ? `Revealing... ${revealedCards.length}/${packData.cardsPerPack}` : `${revealedCards.length} cards revealed`}
                </p>
              </div>

              {revealedCards.length === 0 && isRevealing && (
                <div className="flex justify-center items-center h-64">
                  <div className="relative w-48 aspect-[3/4] animate-pulse">
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 to-zinc-900 border-4 border-zinc-600 shadow-2xl overflow-hidden">
                      <img src={packData.packArt} className="w-full h-full object-cover opacity-60" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="w-12 h-12 text-white animate-spin" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-5 gap-4 justify-items-center">
                {revealedCards.map((card, idx) => (
                  <div 
                    key={card.id}
                    className="relative w-32 aspect-[2.5/3.5] shadow-xl transform transition-all duration-500 animate-in fade-in slide-in-from-bottom-4"
                    style={{ 
                      animationDelay: `${idx * 100}ms`,
                      backgroundColor: card.borderColor 
                    }}
                    data-testid={`revealed-card-${idx}`}
                  >
                    <div className="absolute inset-1 bg-white flex flex-col overflow-hidden">
                      <div 
                        className="h-6 flex justify-between items-center px-2 border-b"
                        style={{ borderColor: card.borderColor }}
                      >
                        <span className="font-bold text-[8px] uppercase tracking-tight text-black truncate">
                          {card.name}
                        </span>
                      </div>
                      
                      <div className="flex-1 relative overflow-hidden">
                        <img src={card.frontImage} className="w-full h-full object-cover" />
                        <div 
                          className="absolute bottom-0 left-0 px-1 py-0.5 text-[6px] font-bold text-white"
                          style={{ backgroundColor: RARITY_COLORS[card.rarity] }}
                        >
                          {card.rarity.toUpperCase()}
                        </div>
                      </div>
                      
                      <div className="h-6 px-1 flex items-center justify-between text-black border-t" style={{ borderColor: card.borderColor }}>
                        <span className="text-[8px] font-bold">ATK {card.attack}</span>
                        <span className="text-[8px] font-bold">DEF {card.defense}</span>
                      </div>
                    </div>

                    <div 
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold border-2 border-black"
                      style={{ backgroundColor: RARITY_COLORS[card.rarity] }}
                    >
                      {RARITIES.indexOf(card.rarity) + 1}
                    </div>
                  </div>
                ))}
              </div>

              {!isRevealing && revealedCards.length > 0 && (
                <div className="text-center mt-8 space-y-4">
                  <div className="flex justify-center gap-2 flex-wrap">
                    {RARITIES.map(rarity => {
                      const count = revealedCards.filter(c => c.rarity === rarity).length;
                      if (count === 0) return null;
                      return (
                        <span 
                          key={rarity}
                          className="px-3 py-1 text-xs font-bold bg-zinc-800 border border-zinc-700"
                          style={{ borderLeftColor: RARITY_COLORS[rarity], borderLeftWidth: 4 }}
                        >
                          {rarity}: {count}
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex justify-center gap-4">
                    <button 
                      onClick={simulatePackOpening}
                      className="px-6 py-3 bg-white text-black font-bold flex items-center gap-2 hover:bg-zinc-200"
                      data-testid="button-open-another-pack"
                    >
                      <RefreshCw className="w-4 h-4" /> Open Another Pack
                    </button>
                    <button 
                      onClick={() => { setShowPackOpening(false); setRevealedCards([]); }}
                      className="px-6 py-3 bg-zinc-800 text-white font-bold flex items-center gap-2 hover:bg-zinc-700"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
