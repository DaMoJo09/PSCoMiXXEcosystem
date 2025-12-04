import { Layout } from "@/components/layout/Layout";
import { Save, Download, RefreshCw, Sparkles, Package, RotateCw, ImageIcon, Wand2, ArrowLeft } from "lucide-react";
import cardArt from "@assets/generated_images/cyberpunk_trading_card_art.png";
import backCoverArt from "@assets/generated_images/noir_comic_panel.png";
import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { AIGenerator } from "@/components/tools/AIGenerator";
import { useProject, useUpdateProject, useCreateProject } from "@/hooks/useProjects";
import { toast } from "sonner";

export default function CardCreator() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const projectId = searchParams.get('id');
  
  const { data: project } = useProject(projectId || '');
  const updateProject = useUpdateProject();
  const createProject = useCreateProject();

  const [mode, setMode] = useState<"single" | "pack">("single");
  const [side, setSide] = useState<"front" | "back">("front");
  const [showAIGen, setShowAIGen] = useState(false);
  const [cardImage, setCardImage] = useState(cardArt);
  const [cardName, setCardName] = useState("Cyber Ronin");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (project) {
      const data = project.data as any;
      if (data?.cardName) setCardName(data.cardName);
      if (data?.cardImage) setCardImage(data.cardImage);
    }
  }, [project]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (projectId) {
        await updateProject.mutateAsync({
          id: projectId,
          data: { title: cardName, data: { cardName, cardImage } },
        });
      } else {
        await createProject.mutateAsync({
          title: cardName,
          type: "card",
          status: "draft",
          data: { cardName, cardImage },
        });
      }
      toast.success("Card saved");
    } catch (error: any) {
      toast.error(error.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="h-screen flex flex-col">
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 hover:bg-muted border border-transparent hover:border-border transition-colors" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <h2 className="font-display font-bold text-lg">Card Forge</h2>
            <div className="flex bg-secondary p-1 rounded-sm">
              <button 
                onClick={() => setMode("single")}
                className={`px-3 py-1 text-xs font-medium rounded-sm transition-all flex items-center gap-2 ${mode === "single" ? "bg-white shadow-sm text-black" : "text-muted-foreground hover:text-black"}`}
                data-testid="button-mode-single"
              >
                <Sparkles className="w-3 h-3" /> Single Card
              </button>
              <button 
                onClick={() => setMode("pack")}
                className={`px-3 py-1 text-xs font-medium rounded-sm transition-all flex items-center gap-2 ${mode === "pack" ? "bg-white shadow-sm text-black" : "text-muted-foreground hover:text-black"}`}
                data-testid="button-mode-pack"
              >
                <Package className="w-3 h-3" /> Pack Builder
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-secondary hover:bg-border border border-border text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              data-testid="button-save"
            >
              <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save"}
            </button>
            <button className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-hard-sm" data-testid="button-export">
              <Download className="w-4 h-4" /> Export Card
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Form Area */}
          <div className="w-1/2 p-8 overflow-auto border-r border-border">
            <div className="max-w-md mx-auto space-y-8">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="font-display font-bold text-xl">
                   {side === "front" ? "Front Design" : "Back Design"}
                </h3>
                <button 
                   onClick={() => setSide(side === "front" ? "back" : "front")}
                   className="text-xs bg-secondary hover:bg-border px-2 py-1 flex items-center gap-1"
                >
                  <RotateCw className="w-3 h-3" /> Flip to {side === "front" ? "Back" : "Front"}
                </button>
              </div>

              {side === "front" ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-background border border-border p-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                      defaultValue="Cyber Ronin"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold flex justify-between">
                      <span>Card Art</span>
                      <button 
                        onClick={() => setShowAIGen(!showAIGen)}
                        className="text-[10px] bg-black text-white px-2 py-0.5 flex items-center gap-1"
                      >
                        <Wand2 className="w-3 h-3" /> AI GENERATE
                      </button>
                    </label>
                    
                    {showAIGen && (
                       <div className="mb-4">
                         <AIGenerator type="card" onImageGenerated={(url) => {
                           setCardImage(url);
                           setShowAIGen(false);
                         }} />
                       </div>
                    )}

                    <div className="aspect-video bg-secondary border border-border flex items-center justify-center text-muted-foreground text-xs cursor-pointer hover:border-primary">
                       <ImageIcon className="w-4 h-4 mr-2" /> Upload Custom Art
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold">Type</label>
                      <select className="w-full bg-background border border-border p-2 text-sm outline-none">
                        <option>Character</option>
                        <option>Weapon</option>
                        <option>Event</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold">Rarity</label>
                      <select className="w-full bg-background border border-border p-2 text-sm outline-none">
                        <option>Common</option>
                        <option>Rare</option>
                        <option>Legendary</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold">Stats</label>
                    <div className="grid grid-cols-3 gap-2">
                      <input type="number" placeholder="ATK" className="bg-background border border-border p-2 text-sm text-center" defaultValue="8" />
                      <input type="number" placeholder="DEF" className="bg-background border border-border p-2 text-sm text-center" defaultValue="4" />
                      <input type="number" placeholder="COST" className="bg-background border border-border p-2 text-sm text-center" defaultValue="3" />
                    </div>
                  </div>
                  
                  <div className="space-y-4 pt-4 border-t border-border">
                    <h3 className="font-display font-bold text-sm">Evolution Chain</h3>
                    <div className="p-4 border border-border border-dashed flex flex-col items-center justify-center gap-2 text-muted-foreground bg-secondary/20 hover:bg-secondary/50 transition-colors cursor-pointer">
                      <RefreshCw className="w-6 h-6" />
                      <span className="text-sm font-mono">Configure Evolution Stage</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-display font-bold text-sm">Lore & Flavor</h3>
                    <textarea 
                      className="w-full h-32 bg-background border border-border p-2 text-sm resize-none outline-none"
                      defaultValue="A warrior from the neon slums, he fights not for honor, but for the highest bidder. His blade hums with a frequency that can shatter diamond."
                    ></textarea>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                   <div className="bg-secondary/20 p-4 border border-border space-y-4">
                      <p className="text-sm text-muted-foreground">Back design is shared across all cards in this set unless overridden.</p>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-bold">Pattern / Logo</label>
                        <div className="aspect-[2.5/3.5] bg-black border border-border flex items-center justify-center relative overflow-hidden">
                           <img src={backCoverArt} className="w-full h-full object-cover opacity-50 grayscale" />
                           <div className="absolute inset-0 flex items-center justify-center">
                             <span className="bg-black text-white px-2 py-1 text-xs font-bold border border-white">UPLOAD LOGO</span>
                           </div>
                        </div>
                      </div>
                   </div>
                </div>
              )}
            </div>
          </div>

          {/* Preview Area */}
          <div className="w-1/2 bg-secondary/30 flex flex-col items-center justify-center p-8 relative perspective-1000">
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
                 style={{ backgroundImage: "linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000)", backgroundSize: "20px 20px", backgroundPosition: "0 0, 10px 10px" }} 
            />
            
            {side === "front" ? (
              <div className="relative w-[450px] max-w-[90%] aspect-[2.5/3.5] bg-black p-2 shadow-hard group animate-in zoom-in duration-300">
                <div className="w-full h-full bg-white border-2 border-white relative flex flex-col">
                  {/* Header */}
                  <div className="h-8 border-b-2 border-black flex justify-between items-center px-2 bg-white z-10">
                    <span className="font-bold font-display uppercase tracking-tighter text-black">Cyber Ronin</span>
                    <div className="flex gap-1">
                      <div className="w-3 h-3 rounded-full bg-black"></div>
                      <div className="w-3 h-3 rounded-full bg-black"></div>
                      <div className="w-3 h-3 rounded-full border border-black"></div>
                    </div>
                  </div>
                  
                  {/* Image */}
                  <div className="flex-1 border-b-2 border-black relative overflow-hidden bg-gray-100">
                    <img src={cardImage} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />
                    <div className="absolute bottom-0 left-0 bg-black text-white px-2 py-1 text-xs font-mono font-bold">
                      LEGENDARY
                    </div>
                  </div>
                  
                  {/* Description */}
                  <div className="h-1/3 p-3 flex flex-col justify-between bg-white text-black">
                    <p className="text-xs font-serif italic leading-relaxed">
                      "A warrior from the neon slums, he fights not for honor, but for the highest bidder."
                    </p>
                    
                    <div className="flex justify-between items-center border-t-2 border-black pt-2 mt-2">
                      <div className="flex gap-4 text-sm font-bold font-mono">
                        <span>ATK 8</span>
                        <span>DEF 4</span>
                      </div>
                      <Sparkles className="w-4 h-4 text-black" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative w-[450px] max-w-[90%] aspect-[2.5/3.5] bg-black p-4 shadow-hard group animate-in zoom-in duration-300 flex items-center justify-center border-2 border-white">
                 <div className="absolute inset-2 border border-white/50"></div>
                 <div className="absolute inset-0 opacity-20">
                    <img src={backCoverArt} className="w-full h-full object-cover grayscale" />
                 </div>
                 <div className="z-10 w-24 h-24 rounded-full border-4 border-white flex items-center justify-center">
                    <div className="w-16 h-16 bg-white rotate-45"></div>
                 </div>
              </div>
            )}
            
            <p className="mt-8 font-mono text-xs text-muted-foreground">PREVIEW MODE - 300 DPI PRINT READY</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
