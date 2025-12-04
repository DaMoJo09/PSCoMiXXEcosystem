import { Layout } from "@/components/layout/Layout";
import { 
  Save, 
  Download, 
  Columns, 
  Book,
  Type,
  Image as ImageIcon,
  QrCode,
  Barcode,
  ArrowLeft
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import coverArt from "@assets/generated_images/comic_cover_art.png";
import backCoverArt from "@assets/generated_images/noir_comic_panel.png";
import { useProject, useUpdateProject, useCreateProject } from "@/hooks/useProjects";
import { toast } from "sonner";

export default function CoverCreator() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const projectId = searchParams.get('id');
  
  const { data: project } = useProject(projectId || '');
  const updateProject = useUpdateProject();
  const createProject = useCreateProject();

  const [activeTab, setActiveTab] = useState<"front" | "back" | "spine">("front");
  const [title, setTitle] = useState("NEON RAIN");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (project) {
      const data = project.data as any;
      if (data?.title) setTitle(data.title);
    }
  }, [project]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (projectId) {
        await updateProject.mutateAsync({
          id: projectId,
          data: { title, data: { title } },
        });
      } else {
        await createProject.mutateAsync({
          title,
          type: "cover",
          status: "draft",
          data: { title },
        });
      }
      toast.success("Cover saved");
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
            <h2 className="font-display font-bold text-lg">Cover Architect</h2>
            <div className="flex bg-secondary p-1 rounded-sm">
              <button 
                onClick={() => setActiveTab("front")}
                className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${activeTab === "front" ? "bg-white shadow-sm text-black" : "text-muted-foreground hover:text-black"}`}
                data-testid="button-tab-front"
              >
                Front Cover
              </button>
              <button 
                onClick={() => setActiveTab("spine")}
                className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${activeTab === "spine" ? "bg-white shadow-sm text-black" : "text-muted-foreground hover:text-black"}`}
                data-testid="button-tab-spine"
              >
                Spine
              </button>
              <button 
                onClick={() => setActiveTab("back")}
                className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${activeTab === "back" ? "bg-white shadow-sm text-black" : "text-muted-foreground hover:text-black"}`}
                data-testid="button-tab-back"
              >
                Back Cover
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
            <button className="px-4 py-2 bg-secondary hover:bg-border border border-border text-sm font-medium flex items-center gap-2" data-testid="button-preview">
              <Columns className="w-4 h-4" /> Preview Spread
            </button>
            <button className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-hard-sm" data-testid="button-export">
              <Download className="w-4 h-4" /> Export Print PDF
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Tools */}
          <aside className="w-16 border-r border-border flex flex-col items-center py-4 gap-4 bg-background z-10">
            <button className="p-3 hover:bg-secondary border border-transparent hover:border-border transition-colors" title="Layouts">
              <Columns className="w-5 h-5" />
            </button>
            <button className="p-3 hover:bg-secondary border border-transparent hover:border-border transition-colors" title="Text">
              <Type className="w-5 h-5" />
            </button>
            <button className="p-3 hover:bg-secondary border border-transparent hover:border-border transition-colors" title="Images">
              <ImageIcon className="w-5 h-5" />
            </button>
            <div className="w-8 h-px bg-border my-2"></div>
            <button className="p-3 hover:bg-secondary border border-transparent hover:border-border transition-colors" title="QR Code">
              <QrCode className="w-5 h-5" />
            </button>
            <button className="p-3 hover:bg-secondary border border-transparent hover:border-border transition-colors" title="Barcode">
              <Barcode className="w-5 h-5" />
            </button>
          </aside>

          {/* Canvas */}
          <main className="flex-1 bg-secondary/50 p-8 overflow-auto flex items-center justify-center relative">
             {/* Bleed Guides */}
             <div className="absolute inset-0 pointer-events-none" 
                  style={{ backgroundImage: "linear-gradient(#ccc 1px, transparent 1px), linear-gradient(90deg, #ccc 1px, transparent 1px)", backgroundSize: "50px 50px", opacity: 0.2 }} 
             />

             <div className="relative shadow-2xl transition-all duration-500">
                {activeTab === "front" && (
                  <div className="w-[600px] h-[900px] max-h-[calc(100vh-140px)] bg-white border border-border relative overflow-hidden group">
                    {/* Front Cover Template */}
                    <img src={coverArt} className="w-full h-full object-cover" />
                    
                    {/* Editable Overlay */}
                    <div className="absolute top-12 left-0 right-0 text-center">
                      <h1 className="text-6xl font-display font-black text-white uppercase tracking-tighter drop-shadow-lg text-stroke-black">
                        NEON RAIN
                      </h1>
                    </div>
                    
                    <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end text-white">
                      <div>
                         <p className="font-bold text-lg">VOL. 1</p>
                         <p className="text-sm opacity-80">The Beginning</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">PSCoMiXX</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "back" && (
                  <div className="w-[600px] h-[900px] max-h-[calc(100vh-140px)] bg-background border border-border relative overflow-hidden p-8 flex flex-col">
                    {/* Back Cover Template */}
                    <div className="absolute inset-0 opacity-10">
                       <img src={backCoverArt} className="w-full h-full object-cover grayscale" />
                    </div>
                    
                    <div className="relative z-10 flex-1 flex flex-col justify-center items-center text-center space-y-8">
                       <div className="w-32 h-32 bg-black text-white flex items-center justify-center font-bold rounded-full mb-4">
                         LOGO
                       </div>
                       
                       <div className="max-w-xs space-y-4">
                         <h3 className="font-display font-bold text-2xl uppercase">Synopsis</h3>
                         <p className="font-serif text-sm leading-relaxed">
                           In a city where the rain never stops, one detective must choose between truth and survival. The neon lights hide dark secrets, and the shadows are alive with digital ghosts.
                         </p>
                       </div>
                    </div>

                    <div className="relative z-10 flex justify-between items-end pt-8 border-t-2 border-black mt-auto">
                       <div className="text-xs font-mono">
                         <p>PSCoMiXX PUBLISHING</p>
                         <p>www.pscomixx.online</p>
                       </div>
                       <div className="flex flex-col items-end gap-2">
                         <Barcode className="w-24 h-12" />
                         <p className="text-[10px] font-mono">ISBN 978-3-16-148410-0</p>
                       </div>
                    </div>
                  </div>
                )}

                {activeTab === "spine" && (
                  <div className="w-[50px] h-[900px] max-h-[calc(100vh-140px)] bg-black text-white border border-border relative flex flex-col items-center justify-between py-8">
                     <div className="w-6 h-6 rounded-full bg-white/20"></div>
                     <div className="flex-1 flex items-center justify-center py-8">
                        <h2 className="text-xl font-display font-bold tracking-widest whitespace-nowrap rotate-90 uppercase">
                          NEON RAIN • VOL 1
                        </h2>
                     </div>
                     <div className="w-6 h-6 border border-white/50"></div>
                  </div>
                )}
             </div>
          </main>

          {/* Inspector */}
          <aside className="w-72 border-l border-border bg-background flex flex-col">
             <div className="p-4 border-b border-border font-bold font-display">Details</div>
             <div className="p-4 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase">Title Text</label>
                  <input className="w-full p-2 border border-border text-sm" defaultValue="NEON RAIN" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase">Author(s)</label>
                  <input className="w-full p-2 border border-border text-sm" defaultValue="Kai Zen" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase">ISBN / Barcode</label>
                  <input className="w-full p-2 border border-border text-sm" defaultValue="978-3-16-148410-0" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase">QR Link</label>
                  <input className="w-full p-2 border border-border text-sm" defaultValue="https://pscomixx.online/read/neon-rain" />
                  <p className="text-[10px] text-muted-foreground">Link to PSStreaming reader</p>
                </div>
             </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
