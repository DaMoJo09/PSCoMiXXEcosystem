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

          <div className="flex-1 bg-zinc-950 flex items-center justify-center p-8 relative">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
            
            {side === "front" ? (
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
