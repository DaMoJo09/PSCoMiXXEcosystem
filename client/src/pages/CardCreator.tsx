import { Layout } from "@/components/layout/Layout";
import { Save, Download, RefreshCw, Sparkles } from "lucide-react";
import cardArt from "@assets/generated_images/cyberpunk_trading_card_art.png";

export default function CardCreator() {
  return (
    <Layout>
      <div className="h-screen flex flex-col">
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background">
          <h2 className="font-display font-bold text-lg">Card Forge</h2>
          <button className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-hard-sm">
            <Download className="w-4 h-4" /> Export Card
          </button>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Form Area */}
          <div className="w-1/2 p-8 overflow-auto border-r border-border">
            <div className="max-w-md mx-auto space-y-8">
              <div className="space-y-4">
                <h3 className="font-display font-bold text-xl border-b border-border pb-2">Card Details</h3>
                
                <div className="space-y-2">
                  <label className="text-sm font-bold">Name</label>
                  <input 
                    type="text" 
                    className="w-full bg-background border border-border p-2 text-sm focus:ring-1 focus:ring-black outline-none"
                    defaultValue="Cyber Ronin"
                  />
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
              </div>

              <div className="space-y-4">
                <h3 className="font-display font-bold text-xl border-b border-border pb-2">Evolution Chain</h3>
                <div className="p-4 border border-border border-dashed flex flex-col items-center justify-center gap-2 text-muted-foreground bg-secondary/20 hover:bg-secondary/50 transition-colors cursor-pointer">
                  <RefreshCw className="w-6 h-6" />
                  <span className="text-sm font-mono">Configure Evolution Stage</span>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-display font-bold text-xl border-b border-border pb-2">Lore & Flavor</h3>
                <textarea 
                  className="w-full h-32 bg-background border border-border p-2 text-sm resize-none outline-none"
                  defaultValue="A warrior from the neon slums, he fights not for honor, but for the highest bidder. His blade hums with a frequency that can shatter diamond."
                ></textarea>
              </div>
            </div>
          </div>

          {/* Preview Area */}
          <div className="w-1/2 bg-secondary/30 flex flex-col items-center justify-center p-8 relative">
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
                 style={{ backgroundImage: "linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000)", backgroundSize: "20px 20px", backgroundPosition: "0 0, 10px 10px" }} 
            />
            
            <div className="relative w-[350px] aspect-[2.5/3.5] bg-black p-2 shadow-hard group transition-transform hover:scale-105 duration-500">
              <div className="w-full h-full bg-white border-2 border-white relative flex flex-col">
                {/* Header */}
                <div className="h-8 border-b-2 border-black flex justify-between items-center px-2 bg-white z-10">
                  <span className="font-bold font-display uppercase tracking-tighter">Cyber Ronin</span>
                  <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-full bg-black"></div>
                    <div className="w-3 h-3 rounded-full bg-black"></div>
                    <div className="w-3 h-3 rounded-full border border-black"></div>
                  </div>
                </div>
                
                {/* Image */}
                <div className="flex-1 border-b-2 border-black relative overflow-hidden">
                  <img src={cardArt} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />
                  <div className="absolute bottom-0 left-0 bg-black text-white px-2 py-1 text-xs font-mono font-bold">
                    LEGENDARY
                  </div>
                </div>
                
                {/* Description */}
                <div className="h-1/3 p-3 flex flex-col justify-between bg-white">
                  <p className="text-xs font-serif italic leading-relaxed">
                    "A warrior from the neon slums, he fights not for honor, but for the highest bidder."
                  </p>
                  
                  <div className="flex justify-between items-center border-t-2 border-black pt-2 mt-2">
                    <div className="flex gap-4 text-sm font-bold font-mono">
                      <span>ATK 8</span>
                      <span>DEF 4</span>
                    </div>
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
            
            <p className="mt-8 font-mono text-xs text-muted-foreground">PREVIEW MODE - 300 DPI PRINT READY</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
