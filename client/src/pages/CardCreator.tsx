import { Layout } from "@/components/layout/Layout";
import { 
  Save, Download, RefreshCw, Sparkles, Package, RotateCw, ImageIcon, 
  Wand2, ArrowLeft, Upload, Type, Palette, Settings, X, Plus, Trash2
} from "lucide-react";
import cardArt from "@assets/generated_images/cyberpunk_trading_card_art.png";
import backCoverArt from "@assets/generated_images/noir_comic_panel.png";
import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { AIGenerator } from "@/components/tools/AIGenerator";
import { useProject, useUpdateProject, useCreateProject } from "@/hooks/useProjects";
import { useAssetLibrary } from "@/contexts/AssetLibraryContext";
import { toast } from "sonner";

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
}

interface PackData {
  name: string;
  cardsPerPack: number;
  rarityDistribution: { [key: string]: number };
  cards: CardData[];
  packArt: string;
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
  });

  const [packData, setPackData] = useState<PackData>({
    name: "Cyber Legends Pack",
    cardsPerPack: 5,
    rarityDistribution: { Common: 2, Uncommon: 1, Rare: 1, Epic: 1 },
    cards: [],
    packArt: cardArt,
  });

  const [selectedPackCard, setSelectedPackCard] = useState<string | null>(null);
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
          <div className="w-80 p-4 overflow-auto border-r border-zinc-800 bg-zinc-900 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-zinc-400">Pack Name</label>
              <input 
                type="text" 
                value={packData.name}
                onChange={(e) => setPackData({ ...packData, name: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
              />
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
                max={15}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase text-zinc-400">Cards in Pack</label>
                <span className="text-xs text-zinc-500">{packData.cards.length} cards</span>
              </div>
              <button 
                onClick={addCardToPack}
                className="w-full py-2 bg-white text-black text-sm font-bold flex items-center justify-center gap-2 hover:bg-zinc-200"
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
                >
                  <div className="w-8 h-10 bg-zinc-800 overflow-hidden flex-shrink-0">
                    <img src={card.frontImage} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{card.name}</p>
                    <p className={`text-[10px] ${selectedPackCard === card.id ? "text-zinc-600" : "text-zinc-500"}`}>
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
          </div>
          )}

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
                    <img src={cardData.frontImage} className="w-full h-full object-cover" />
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
      </div>
    </Layout>
  );
}
