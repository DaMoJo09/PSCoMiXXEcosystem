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
  Download
} from "lucide-react";
import { useState } from "react";

const tools = [
  { icon: MousePointer, label: "Select" },
  { icon: Pen, label: "Draw" },
  { icon: Eraser, label: "Erase" },
  { icon: Type, label: "Text" },
  { icon: ImageIcon, label: "Image" },
  { icon: Square, label: "Panel" },
];

export default function ComicCreator() {
  const [activeTool, setActiveTool] = useState("Select");

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
                onClick={() => setActiveTool(tool.label)}
                className={`p-3 border transition-all ${
                  activeTool === tool.label
                    ? "bg-primary text-primary-foreground border-primary shadow-hard-sm"
                    : "bg-background text-muted-foreground border-transparent hover:border-border hover:text-foreground"
                }`}
                title={tool.label}
              >
                <tool.icon className="w-5 h-5" />
              </button>
            ))}
          </aside>

          {/* Canvas Area */}
          <main className="flex-1 bg-secondary/50 p-8 overflow-auto flex items-center justify-center relative">
            {/* Grid Pattern Background */}
            <div className="absolute inset-0 opacity-[0.03]" 
                 style={{ backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)", backgroundSize: "20px 20px" }} 
            />

            <div className="bg-white w-[800px] h-[1200px] shadow-hard border border-border relative">
              {/* Mock Panel 1 */}
              <div className="absolute top-12 left-12 right-12 h-[400px] border-2 border-black overflow-hidden group">
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="font-mono text-xs">PANEL 1</span>
                </div>
                {/* Placeholder Content */}
                <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                  <p className="text-gray-300 font-display text-4xl font-bold uppercase">Action Shot</p>
                </div>
              </div>

              {/* Mock Panel 2 */}
              <div className="absolute top-[430px] left-12 w-[360px] h-[300px] border-2 border-black overflow-hidden"></div>

              {/* Mock Panel 3 */}
              <div className="absolute top-[430px] right-12 w-[360px] h-[300px] border-2 border-black overflow-hidden"></div>
              
              {/* Mock Panel 4 */}
              <div className="absolute bottom-12 left-12 right-12 h-[400px] border-2 border-black overflow-hidden"></div>
            </div>
          </main>

          {/* Properties Panel */}
          <aside className="w-72 border-l border-border bg-background flex flex-col">
            <div className="p-4 border-b border-border">
              <h3 className="font-display font-bold flex items-center gap-2">
                <Layers className="w-4 h-4" /> Layers
              </h3>
            </div>
            <div className="flex-1 overflow-auto p-2 space-y-2">
              {["Text: BOOM!", "Panel 4", "Panel 3", "Panel 2", "Panel 1", "Background"].map((layer, i) => (
                <div key={layer} className={`p-2 border border-border text-sm flex items-center gap-2 ${i === 0 ? 'bg-secondary' : 'hover:bg-muted'}`}>
                  <div className="w-4 h-4 border border-border rounded-sm" />
                  {layer}
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-border bg-secondary/30">
              <h4 className="font-bold text-sm mb-2">Properties</h4>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-muted-foreground">OPACITY</label>
                  <input type="range" className="w-full accent-black" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono text-muted-foreground">BLEND MODE</label>
                  <select className="w-full p-1 text-sm bg-background border border-border">
                    <option>Normal</option>
                    <option>Multiply</option>
                    <option>Screen</option>
                  </select>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
