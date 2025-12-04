import { Layout } from "@/components/layout/Layout";
import { Play, Plus, Settings } from "lucide-react";
import vnBg from "@assets/generated_images/visual_novel_background.png";

export default function VNCreator() {
  return (
    <Layout>
      <div className="h-screen flex flex-col">
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background">
          <h2 className="font-display font-bold text-lg">Visual Novel Engine</h2>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-secondary hover:bg-border border border-border text-sm font-medium flex items-center gap-2">
              <Settings className="w-4 h-4" /> Settings
            </button>
            <button className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-hard-sm">
              <Play className="w-4 h-4" /> Playtest
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Scene Graph (Left) */}
          <div className="w-1/3 border-r border-border bg-secondary/10 flex flex-col">
             <div className="p-4 border-b border-border flex justify-between items-center">
                <h3 className="font-bold font-display">Scene Flow</h3>
                <button className="p-1 hover:bg-secondary rounded"><Plus className="w-4 h-4" /></button>
             </div>
             <div className="flex-1 p-4 overflow-auto space-y-4">
                {/* Mock Node */}
                <div className="p-4 bg-background border border-primary shadow-hard-sm relative">
                  <div className="absolute -left-3 top-1/2 w-3 h-px bg-primary"></div>
                  <div className="font-bold text-sm mb-1">Scene 1: Intro</div>
                  <div className="text-xs text-muted-foreground">Starts at line 0</div>
                </div>

                <div className="p-4 bg-background border border-border hover:border-primary transition-colors relative ml-8">
                  <div className="absolute -left-8 top-1/2 w-8 h-px bg-border"></div>
                  <div className="absolute -left-8 top-[-30px] bottom-1/2 w-px bg-border"></div>
                  <div className="font-bold text-sm mb-1">Scene 2: Classroom</div>
                  <div className="text-xs text-muted-foreground">Branch A</div>
                </div>

                <div className="p-4 bg-background border border-border hover:border-primary transition-colors relative ml-8">
                  <div className="absolute -left-8 top-1/2 w-8 h-px bg-border"></div>
                  <div className="absolute -left-8 top-[-100px] bottom-1/2 w-px bg-border"></div>
                  <div className="font-bold text-sm mb-1">Scene 3: Rooftop</div>
                  <div className="text-xs text-muted-foreground">Branch B</div>
                </div>
             </div>
          </div>

          {/* Editor (Center) */}
          <div className="flex-1 flex flex-col">
            {/* Visual Preview */}
            <div className="h-[60%] bg-black relative overflow-hidden">
              <img src={vnBg} className="w-full h-full object-cover opacity-50" />
              
              {/* Character Sprite Placeholder */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[80%] w-[300px] bg-gradient-to-t from-black to-transparent opacity-50 border-b border-white"></div>
              
              {/* Dialogue Box */}
              <div className="absolute bottom-8 left-8 right-8 h-32 bg-background/90 border border-white p-6 shadow-hard">
                <div className="font-bold font-display mb-2 text-primary uppercase tracking-wider">Akira</div>
                <p className="font-mono text-sm typing-effect">
                  &quot;I never thought I&apos;d see you here again... not after what happened.&quot;
                </p>
                <div className="absolute bottom-4 right-4 animate-bounce">▼</div>
              </div>
            </div>

            {/* Script Editor */}
            <div className="flex-1 border-t border-border bg-background p-0 flex flex-col">
              <div className="border-b border-border p-2 bg-secondary/30 flex gap-2 text-xs font-mono overflow-x-auto">
                 <button className="px-3 py-1 bg-primary text-primary-foreground">Script</button>
                 <button className="px-3 py-1 hover:bg-muted">Characters</button>
                 <button className="px-3 py-1 hover:bg-muted">Audio</button>
              </div>
              <div className="flex-1 p-4 overflow-auto font-mono text-sm space-y-2">
                 <div className="flex gap-4">
                    <span className="text-muted-foreground w-8 text-right">1</span>
                    <span className="text-blue-600">bg</span> classroom_day
                 </div>
                 <div className="flex gap-4">
                    <span className="text-muted-foreground w-8 text-right">2</span>
                    <span className="text-purple-600">music</span> play calm_theme
                 </div>
                 <div className="flex gap-4">
                    <span className="text-muted-foreground w-8 text-right">3</span>
                    <span className="text-green-600">show</span> akira neutral at center
                 </div>
                 <div className="flex gap-4 bg-secondary/30 -mx-4 px-4">
                    <span className="text-muted-foreground w-8 text-right">4</span>
                    <span className="font-bold">akira</span> &quot;I never thought I&apos;d see you here again... not after what happened.&quot;
                 </div>
                 <div className="flex gap-4">
                    <span className="text-muted-foreground w-8 text-right">5</span>
                    <span className="text-orange-600">choice</span>:
                 </div>
                 <div className="flex gap-4 pl-8">
                    <span className="text-muted-foreground w-8 text-right">6</span>
                    &quot;Tell him the truth&quot; {`->`} jump scene_truth
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
