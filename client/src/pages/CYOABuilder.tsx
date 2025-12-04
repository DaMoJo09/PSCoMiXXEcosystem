import { Layout } from "@/components/layout/Layout";
import { 
  Save, 
  Download, 
  GitBranch, 
  Plus, 
  AlertCircle, 
  BookOpen,
  Link as LinkIcon,
  ArrowLeft
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useProject, useUpdateProject, useCreateProject } from "@/hooks/useProjects";
import { toast } from "sonner";

export default function CYOABuilder() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const projectId = searchParams.get('id');
  
  const { data: project } = useProject(projectId || '');
  const updateProject = useUpdateProject();
  const createProject = useCreateProject();

  const [title, setTitle] = useState("Untitled CYOA");
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
          type: "cyoa",
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
              data-testid="input-cyoa-title"
            />
            <span className="text-xs font-mono text-muted-foreground">Interactive Fiction Engine</span>
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
            <button className="px-4 py-2 bg-secondary hover:bg-border border border-border text-sm font-medium flex items-center gap-2" data-testid="button-validate">
              <AlertCircle className="w-4 h-4" /> Validate Logic
            </button>
            <button className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-hard-sm" data-testid="button-export">
              <Download className="w-4 h-4" /> Export Story
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Node Canvas */}
          <div className="flex-1 bg-secondary/20 relative overflow-hidden cursor-grab active:cursor-grabbing">
            {/* Grid */}
            <div className="absolute inset-0 opacity-[0.1]" 
                 style={{ backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)", backgroundSize: "30px 30px" }} 
            />

            {/* Mock Nodes */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px]">
               
               {/* Start Node */}
               <div className="absolute top-10 left-[350px] w-48 bg-background border-2 border-black shadow-hard p-4 z-10">
                 <div className="flex justify-between mb-2">
                   <span className="font-bold text-xs bg-black text-white px-1">START</span>
                   <SettingsButton />
                 </div>
                 <p className="text-xs font-mono line-clamp-2">You wake up in a cold, dark room. The air smells of ozone.</p>
                 <div className="mt-3 flex justify-center">
                    <div className="w-3 h-3 bg-black rounded-full cursor-pointer hover:scale-125 transition-transform"></div>
                 </div>
               </div>

               {/* Connection Line */}
               <svg className="absolute inset-0 pointer-events-none overflow-visible z-0">
                 <path d="M 446 130 C 446 200, 300 200, 300 250" stroke="black" strokeWidth="2" fill="none" />
                 <path d="M 446 130 C 446 200, 600 200, 600 250" stroke="black" strokeWidth="2" fill="none" />
               </svg>

               {/* Branch A */}
               <div className="absolute top-[250px] left-[200px] w-48 bg-background border border-black shadow-sm p-4 z-10">
                 <div className="font-bold text-xs mb-2 text-muted-foreground">CHOICE A</div>
                 <p className="text-xs font-mono line-clamp-2">Search the pockets.</p>
                 <div className="mt-3 flex justify-center">
                    <div className="w-3 h-3 border border-black bg-white rounded-full cursor-pointer"></div>
                 </div>
               </div>

               {/* Branch B */}
               <div className="absolute top-[250px] left-[500px] w-48 bg-background border border-black shadow-sm p-4 z-10">
                 <div className="font-bold text-xs mb-2 text-muted-foreground">CHOICE B</div>
                 <p className="text-xs font-mono line-clamp-2">Call out for help.</p>
                 <div className="mt-3 flex justify-center">
                    <div className="w-3 h-3 border border-black bg-white rounded-full cursor-pointer"></div>
                 </div>
               </div>

               {/* Death Node */}
               <svg className="absolute inset-0 pointer-events-none overflow-visible z-0">
                 <path d="M 600 335 C 600 380, 600 380, 600 420" stroke="black" strokeWidth="2" fill="none" strokeDasharray="4 4" />
               </svg>

               <div className="absolute top-[420px] left-[500px] w-48 bg-red-50 border border-red-500 p-4 z-10">
                 <div className="flex justify-between mb-2">
                   <span className="font-bold text-xs text-red-600">ENDING (BAD)</span>
                 </div>
                 <p className="text-xs font-mono line-clamp-2">The noise attracts the guards. You are captured.</p>
               </div>

            </div>
            
            <div className="absolute bottom-6 right-6 bg-background border border-border p-2 shadow-hard-sm flex gap-2">
              <button className="w-8 h-8 flex items-center justify-center hover:bg-secondary border border-transparent hover:border-border transition-colors font-bold">+</button>
              <button className="w-8 h-8 flex items-center justify-center hover:bg-secondary border border-transparent hover:border-border transition-colors font-bold">-</button>
            </div>
          </div>

          {/* Properties Panel */}
          <div className="w-80 border-l border-border bg-background flex flex-col">
            <div className="p-4 border-b border-border font-display font-bold">Node Properties</div>
            <div className="flex-1 overflow-auto p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase">Node Title</label>
                <input type="text" className="w-full p-2 border border-border text-sm font-mono focus:ring-1 focus:ring-black outline-none" defaultValue="Start" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase">Story Text</label>
                <textarea className="w-full h-32 p-2 border border-border text-sm font-mono focus:ring-1 focus:ring-black outline-none resize-none" defaultValue="You wake up in a cold, dark room..." />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase">Choices</label>
                  <button className="text-xs bg-secondary hover:bg-border px-2 py-1 flex items-center gap-1 transition-colors"><Plus className="w-3 h-3" /> Add</button>
                </div>
                
                <div className="space-y-2">
                  <div className="p-2 border border-border flex items-center gap-2 bg-secondary/10">
                     <LinkIcon className="w-3 h-3 text-muted-foreground" />
                     <input type="text" className="bg-transparent w-full text-xs outline-none" defaultValue="Search pockets" />
                     <div className="w-4 h-4 bg-black text-white text-[10px] flex items-center justify-center rounded-full">A</div>
                  </div>
                  <div className="p-2 border border-border flex items-center gap-2 bg-secondary/10">
                     <LinkIcon className="w-3 h-3 text-muted-foreground" />
                     <input type="text" className="bg-transparent w-full text-xs outline-none" defaultValue="Call out" />
                     <div className="w-4 h-4 bg-black text-white text-[10px] flex items-center justify-center rounded-full">B</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                 <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded border-gray-300" />
                    <span>Is Ending Node?</span>
                 </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function SettingsButton() {
  return <button className="opacity-50 hover:opacity-100"><Settings className="w-3 h-3" /></button>;
}

function Settings(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.35a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
