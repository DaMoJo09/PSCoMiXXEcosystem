import { Layout } from "@/components/layout/Layout";
import { 
  Save, 
  Undo, 
  Redo, 
  MousePointer, 
  Pen, 
  Eraser, 
  Type, 
  Image as ImageIcon, 
  Square,
  Layers,
  Download,
  Film,
  MessageSquare,
  Wand2,
  Play,
  Plus
} from "lucide-react";
import { useState } from "react";
import { DrawingCanvas } from "@/components/tools/DrawingCanvas";
import { AIGenerator } from "@/components/tools/AIGenerator";

const tools = [
  { icon: MousePointer, label: "Select" },
  { icon: Pen, label: "Draw" },
  { icon: Eraser, label: "Erase" },
  { icon: Type, label: "Text" },
  { icon: MessageSquare, label: "Bubble" },
  { icon: ImageIcon, label: "Image" },
  { icon: Film, label: "Video" },
  { icon: Square, label: "Panel" },
  { icon: Wand2, label: "AI Gen" },
];

export default function ComicCreator() {
  const [activeTool, setActiveTool] = useState("Draw");
  const [showAIGen, setShowAIGen] = useState(false);
  const [layers, setLayers] = useState(["Background", "Panel 1", "Drawing Layer"]);

  const handleImageGenerated = (url: string) => {
    // In a real app, this would add the image to the canvas
    console.log("Adding generated image:", url);
    setShowAIGen(false);
    setLayers(prev => [`AI Asset #${prev.length}`, ...prev]);
  };

  return (
    <Layout>
      <div className="h-screen flex flex-col">
        {/* Toolbar Header */}
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background">
          <div className="flex items-center gap-4">
            <h2 className="font-display font-bold text-lg">Untitled Comic #1</h2>
            <span className="text-xs font-mono text-muted-foreground px-2 py-1 border border-border">DRAFT</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-muted border border-transparent hover:border-border transition-colors">
              <Undo className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-muted border border-transparent hover:border-border transition-colors">
              <Redo className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-border mx-2" />
            <button className="px-4 py-2 bg-secondary hover:bg-border border border-border text-sm font-medium flex items-center gap-2">
              <Save className="w-4 h-4" />
              Save
            </button>
            <button className="px-4 py-2 bg-primary text-primary-foreground border border-primary hover:opacity-90 text-sm font-medium flex items-center gap-2 shadow-hard-sm">
              <Download className="w-4 h-4" />
              Publish
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Tools Sidebar */}
          <aside className="w-16 border-r border-border flex flex-col items-center py-4 gap-4 bg-background z-10">
            {tools.map((tool) => (
              <button
                key={tool.label}
                onClick={() => {
                  setActiveTool(tool.label);
                  if (tool.label === "AI Gen") setShowAIGen(!showAIGen);
                }}
                className={`p-3 border transition-all relative ${
                  activeTool === tool.label
                    ? "bg-primary text-primary-foreground border-primary shadow-hard-sm"
                    : "bg-background text-muted-foreground border-transparent hover:border-border hover:text-foreground"
                }`}
                title={tool.label}
              >
                <tool.icon className="w-5 h-5" />
                {tool.label === "Draw" && <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" title="Wacom Active" />}
              </button>
            ))}
          </aside>

          {/* Canvas Area */}
          <main className="flex-1 bg-secondary/50 p-8 overflow-auto flex items-center justify-center relative">
            {/* Grid Pattern Background */}
            <div className="absolute inset-0 opacity-[0.05]" 
                 style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "20px 20px" }} 
            />

            <div className="bg-white w-[800px] h-[1200px] shadow-hard border border-border relative overflow-hidden">
              {/* Full Page Drawing Canvas Layer */}
              <div className="absolute inset-0 z-10 pointer-events-none">
                 {/* We enable pointer events only when drawing tool is active */}
                 <div className={`w-full h-full ${activeTool === "Draw" || activeTool === "Eraser" ? "pointer-events-auto" : ""}`}>
                   <DrawingCanvas 
                      width={800} 
                      height={1200} 
                      tool={activeTool === "Eraser" ? "eraser" : "pen"} 
                      brushSize={activeTool === "Eraser" ? 20 : 3}
                   />
                 </div>
              </div>

              {/* Mock Panels Layer */}
              <div className="absolute inset-0 p-12 grid grid-cols-2 grid-rows-3 gap-4 pointer-events-none">
                {/* Panel 1 with Video Placeholder */}
                <div className="border-4 border-black bg-transparent relative overflow-hidden group pointer-events-auto">
                   <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-100 transition-opacity">
                      <div className="text-center">
                        <Film className="w-8 h-8 mx-auto mb-2" />
                        <span className="text-xs font-mono font-bold">DROP VIDEO CLIP</span>
                      </div>
                   </div>
                   <div className="absolute bottom-2 right-2 bg-black text-white text-[10px] px-1 font-mono">Frame 1</div>
                </div>

                {/* Panel 2 with Image */}
                <div className="border-4 border-black bg-gray-100 relative overflow-hidden pointer-events-auto">
                  <div className="absolute top-2 left-2 bg-white border border-black px-3 py-2 rounded-[50%] rounded-bl-none shadow-sm z-20">
                    <p className="font-display font-bold text-xs uppercase">Bam!</p>
                  </div>
                </div>

                {/* Panel 3 - Animation Strip Mock */}
                <div className="col-span-2 border-4 border-black relative pointer-events-auto flex">
                   <div className="w-1/4 border-r border-black border-dashed h-full flex items-center justify-center bg-secondary/10">
                      <span className="text-[10px] font-mono rotate-90">Keyframe 1</span>
                   </div>
                   <div className="w-1/4 border-r border-black border-dashed h-full flex items-center justify-center">
                      <span className="text-[10px] font-mono rotate-90">Keyframe 2</span>
                   </div>
                   <div className="w-1/4 border-r border-black border-dashed h-full flex items-center justify-center">
                      <span className="text-[10px] font-mono rotate-90">Keyframe 3</span>
                   </div>
                   <div className="w-1/4 h-full flex items-center justify-center bg-secondary/10">
                      <Plus className="w-4 h-4 opacity-50" />
                   </div>
                   <div className="absolute top-0 left-0 bg-black text-white px-2 py-1 text-[10px] font-mono font-bold flex items-center gap-2">
                     <Film className="w-3 h-3" /> ANIMATION STRIP
                   </div>
                </div>
              </div>

              {/* AI Generator Modal Overlay */}
              {showAIGen && (
                <div className="absolute top-20 left-20 w-80 z-50">
                  <AIGenerator type="comic" onImageGenerated={handleImageGenerated} />
                </div>
              )}
            </div>
          </main>

          {/* Layers & Properties */}
          <aside className="w-72 border-l border-border bg-background flex flex-col">
            <div className="p-4 border-b border-border">
              <h3 className="font-display font-bold flex items-center gap-2">
                <Layers className="w-4 h-4" /> Layers
              </h3>
            </div>
            <div className="flex-1 overflow-auto p-2 space-y-2">
              {layers.map((layer, i) => (
                <div key={layer} className={`p-2 border border-border text-sm flex items-center gap-2 ${i === 0 ? 'bg-secondary' : 'hover:bg-muted'}`}>
                  <div className="w-4 h-4 border border-border rounded-sm bg-white" />
                  {layer}
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-border bg-secondary/10">
              <h4 className="font-bold text-sm mb-2">Brush Settings</h4>
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <label className="text-xs font-mono text-muted-foreground">SIZE</label>
                    <span className="text-xs font-mono">3px</span>
                  </div>
                  <input type="range" className="w-full accent-white" min="1" max="50" defaultValue="3" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <label className="text-xs font-mono text-muted-foreground">PRESSURE</label>
                    <span className="text-xs font-mono text-green-500">ACTIVE</span>
                  </div>
                  <div className="h-1 w-full bg-secondary rounded overflow-hidden">
                    <div className="h-full bg-green-500 w-[75%]"></div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
