import { Layout } from "@/components/layout/Layout";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Settings, 
  Layers, 
  Film, 
  Scissors, 
  Music,
  Download,
  ArrowLeft,
  Save
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import noirComic from "@assets/generated_images/noir_comic_panel.png";
import { useProject, useUpdateProject, useCreateProject } from "@/hooks/useProjects";
import { toast } from "sonner";

export default function MotionStudio() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const projectId = searchParams.get('id');
  
  const { data: project } = useProject(projectId || '');
  const updateProject = useUpdateProject();
  const createProject = useCreateProject();

  const [title, setTitle] = useState("Untitled Motion");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (project) {
      setTitle(project.title);
    }
  }, [project]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (projectId) {
        await updateProject.mutateAsync({
          id: projectId,
          data: { title, data: {} },
        });
      } else {
        await createProject.mutateAsync({
          title,
          type: "motion",
          status: "draft",
          data: {},
        });
      }
      toast.success("Project saved");
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
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-display font-bold text-lg bg-transparent border-none outline-none hover:bg-muted px-2 py-1"
              data-testid="input-motion-title"
            />
            <span className="text-xs font-mono bg-black text-white px-2 py-1">BETA</span>
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
            <button className="px-4 py-2 bg-secondary hover:bg-border border border-border text-sm font-medium flex items-center gap-2" data-testid="button-settings">
              <Settings className="w-4 h-4" /> Render Settings
            </button>
            <button className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-hard-sm" data-testid="button-export">
              <Download className="w-4 h-4" /> Export Video
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main Workspace */}
          <div className="flex-1 flex">
            {/* Assets Panel */}
            <div className="w-64 border-r border-border bg-background flex flex-col">
              <div className="p-3 border-b border-border font-bold font-display text-sm">Project Assets</div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                 {[1, 2, 3].map((i) => (
                   <div key={i} className="aspect-video bg-secondary border border-border relative group cursor-pointer hover:border-primary">
                     <img src={noirComic} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" />
                     <div className="absolute bottom-1 left-1 text-[10px] font-mono bg-black/50 text-white px-1">Panel {i}</div>
                   </div>
                 ))}
                 <div className="p-2 border border-dashed border-border text-center text-xs text-muted-foreground hover:bg-secondary cursor-pointer">
                   + Import Media
                 </div>
              </div>
            </div>

            {/* Viewport */}
            <div className="flex-1 bg-black/5 p-8 flex items-center justify-center relative overflow-hidden">
               {/* Checkerboard pattern for transparency */}
               <div className="absolute inset-0 opacity-20" 
                    style={{ backgroundImage: "linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)", backgroundSize: "20px 20px", backgroundPosition: "0 0, 10px 10px" }} 
               />
               
               {/* Video Canvas */}
               <div className="aspect-video w-[80%] bg-black shadow-2xl relative group">
                 <img src={noirComic} className="w-full h-full object-cover opacity-80" />
                 
                 {/* Overlay Elements */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-display text-6xl font-bold uppercase tracking-tighter drop-shadow-lg animate-pulse">
                   BOOM!
                 </div>

                 {/* Safe Area Guides */}
                 <div className="absolute inset-8 border border-white/30 border-dashed pointer-events-none"></div>
               </div>
            </div>

            {/* Properties Panel */}
            <div className="w-64 border-l border-border bg-background flex flex-col">
               <div className="p-3 border-b border-border font-bold font-display text-sm">Animation Properties</div>
               <div className="p-4 space-y-6">
                 <div className="space-y-2">
                   <label className="text-xs font-bold uppercase">Transform</label>
                   <div className="grid grid-cols-2 gap-2">
                     <input type="number" className="w-full p-1 border border-border text-xs" placeholder="X: 0" />
                     <input type="number" className="w-full p-1 border border-border text-xs" placeholder="Y: 0" />
                     <input type="number" className="w-full p-1 border border-border text-xs" placeholder="Scale: 100%" />
                     <input type="number" className="w-full p-1 border border-border text-xs" placeholder="Rot: 0°" />
                   </div>
                 </div>

                 <div className="space-y-2">
                   <label className="text-xs font-bold uppercase">Effects</label>
                   <div className="space-y-1">
                     <div className="flex items-center gap-2 text-sm">
                       <input type="checkbox" defaultChecked /> Shake
                     </div>
                     <div className="flex items-center gap-2 text-sm">
                       <input type="checkbox" /> Flash
                     </div>
                     <div className="flex items-center gap-2 text-sm">
                       <input type="checkbox" defaultChecked /> Glitch
                     </div>
                   </div>
                 </div>
               </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="h-72 border-t border-border bg-background flex flex-col">
            {/* Transport Controls */}
            <div className="h-10 border-b border-border flex items-center px-4 gap-4 bg-secondary/20">
              <div className="flex items-center gap-2">
                <button className="p-1 hover:text-primary"><SkipBack className="w-4 h-4" /></button>
                <button className="p-1 hover:text-primary"><Play className="w-4 h-4" /></button>
                <button className="p-1 hover:text-primary"><SkipForward className="w-4 h-4" /></button>
              </div>
              <div className="w-px h-4 bg-border"></div>
              <div className="font-mono text-xs">00:00:04:12</div>
              <div className="flex-1"></div>
              <div className="flex items-center gap-2">
                 <button className="p-1 hover:bg-muted rounded" title="Cut"><Scissors className="w-3 h-3" /></button>
                 <button className="p-1 hover:bg-muted rounded" title="Keyframe"><div className="w-2 h-2 rotate-45 bg-current"></div></button>
              </div>
            </div>

            {/* Tracks */}
            <div className="flex-1 overflow-auto flex relative">
               {/* Track Headers */}
               <div className="w-48 border-r border-border bg-secondary/10 flex flex-col sticky left-0 z-10">
                  <div className="h-8 border-b border-border px-2 flex items-center text-xs font-bold gap-2"><Layers className="w-3 h-3" /> Video 1</div>
                  <div className="h-8 border-b border-border px-2 flex items-center text-xs font-bold gap-2"><Layers className="w-3 h-3" /> Video 2</div>
                  <div className="h-8 border-b border-border px-2 flex items-center text-xs font-bold gap-2"><Music className="w-3 h-3" /> Audio</div>
               </div>

               {/* Timeline Grid */}
               <div className="flex-1 bg-background relative min-w-[1000px]">
                  {/* Time Ruler */}
                  <div className="h-6 border-b border-border flex text-[10px] text-muted-foreground font-mono">
                    {[...Array(20)].map((_, i) => (
                      <div key={i} className="flex-1 border-r border-border/30 pl-1">{i}s</div>
                    ))}
                  </div>

                  {/* Playhead */}
                  <div className="absolute top-0 bottom-0 left-[20%] w-px bg-red-500 z-20">
                    <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rotate-45"></div>
                  </div>

                  {/* Clips */}
                  <div className="h-8 border-b border-border/50 relative mt-0 bg-secondary/5">
                    <div className="absolute left-[10%] width-[30%] h-6 top-1 bg-primary/20 border border-primary rounded-sm"></div>
                  </div>
                  <div className="h-8 border-b border-border/50 relative bg-secondary/5">
                     <div className="absolute left-[25%] width-[15%] h-6 top-1 bg-primary/20 border border-primary rounded-sm"></div>
                  </div>
                  <div className="h-8 border-b border-border/50 relative bg-green-500/5">
                     <div className="absolute left-[0%] width-[50%] h-6 top-1 bg-green-500/20 border border-green-500/50 rounded-sm"></div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
