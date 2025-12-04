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
  Plus,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Circle,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Trash2,
  Copy,
  MoveUp,
  MoveDown,
  Sparkles,
  X,
  Check,
  Upload,
  PenTool
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { DrawingCanvas } from "@/components/tools/DrawingCanvas";
import { AIGenerator } from "@/components/tools/AIGenerator";
import { useProject, useUpdateProject, useCreateProject } from "@/hooks/useProjects";
import { toast } from "sonner";

interface Panel {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: "rectangle" | "circle";
  content?: {
    type: "image" | "video" | "drawing" | "ai";
    url?: string;
  };
  zIndex: number;
}

interface Spread {
  id: string;
  leftPage: Panel[];
  rightPage: Panel[];
}

const panelTemplates = [
  { id: "diagonal_split", name: "Diagonal Split", category: "Action", panels: [{x:0,y:0,width:50,height:100},{x:50,y:0,width:50,height:100}] },
  { id: "triple_impact", name: "Triple Impact", category: "Action", panels: [{x:0,y:0,width:33,height:100},{x:33,y:0,width:34,height:100},{x:67,y:0,width:33,height:100}] },
  { id: "explosion", name: "Explosion Layout", category: "Action", panels: [{x:0,y:0,width:100,height:40},{x:0,y:40,width:50,height:60},{x:50,y:40,width:50,height:60}] },
  { id: "speed_lines", name: "Speed Lines", category: "Action", panels: [{x:0,y:0,width:100,height:30},{x:0,y:30,width:100,height:40},{x:0,y:70,width:100,height:30}] },
  { id: "slash_cut", name: "Slash Cut", category: "Action", panels: [{x:0,y:0,width:60,height:100},{x:60,y:0,width:40,height:100}] },
  { id: "grid_2x2", name: "2x2 Grid", category: "Grid", panels: [{x:0,y:0,width:50,height:50},{x:50,y:0,width:50,height:50},{x:0,y:50,width:50,height:50},{x:50,y:50,width:50,height:50}] },
  { id: "grid_3x3", name: "3x3 Grid", category: "Grid", panels: [{x:0,y:0,width:33,height:33},{x:33,y:0,width:34,height:33},{x:67,y:0,width:33,height:33},{x:0,y:33,width:33,height:34},{x:33,y:33,width:34,height:34},{x:67,y:33,width:33,height:34},{x:0,y:67,width:33,height:33},{x:33,y:67,width:34,height:33},{x:67,y:67,width:33,height:33}] },
  { id: "splash", name: "Full Splash", category: "Splash", panels: [{x:0,y:0,width:100,height:100}] },
  { id: "splash_inset", name: "Splash with Inset", category: "Splash", panels: [{x:0,y:0,width:100,height:100},{x:5,y:5,width:25,height:30}] },
  { id: "manga_read", name: "Manga Flow", category: "Manga", panels: [{x:50,y:0,width:50,height:50},{x:0,y:0,width:50,height:50},{x:50,y:50,width:50,height:50},{x:0,y:50,width:50,height:50}] },
  { id: "dialogue_focus", name: "Dialogue Focus", category: "Dialogue", panels: [{x:0,y:0,width:100,height:35},{x:0,y:35,width:50,height:30},{x:50,y:35,width:50,height:30},{x:0,y:65,width:100,height:35}] },
  { id: "cinematic", name: "Cinematic Wide", category: "Cinematic", panels: [{x:0,y:0,width:100,height:25},{x:0,y:25,width:100,height:50},{x:0,y:75,width:100,height:25}] },
];

const templateCategories = ["Action", "Dialogue", "Splash", "Grid", "Manga", "Webcomic", "Cinematic", "Experimental"];

const tools = [
  { icon: MousePointer, label: "Select", shortcut: "V" },
  { icon: Pen, label: "Draw", shortcut: "B" },
  { icon: Eraser, label: "Erase", shortcut: "E" },
  { icon: Type, label: "Text", shortcut: "T" },
  { icon: MessageSquare, label: "Bubble", shortcut: "U" },
  { icon: ImageIcon, label: "Image", shortcut: "I" },
  { icon: Film, label: "Video", shortcut: "M" },
  { icon: Square, label: "Panel", shortcut: "R" },
  { icon: Wand2, label: "AI Gen", shortcut: "G" },
];

export default function ComicCreator() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const projectId = searchParams.get('id');
  
  const { data: project } = useProject(projectId || '');
  const updateProject = useUpdateProject();
  const createProject = useCreateProject();

  const [activeTool, setActiveTool] = useState("Select");
  const [showAIGen, setShowAIGen] = useState(false);
  const [title, setTitle] = useState("Untitled Comic #1");
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [spreads, setSpreads] = useState<Spread[]>([
    { id: "spread_1", leftPage: [], rightPage: [] }
  ]);
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(0);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<"left" | "right">("left");
  
  const [isDrawingPanel, setIsDrawingPanel] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [drawCurrent, setDrawCurrent] = useState({ x: 0, y: 0 });
  
  const [showPanelModal, setShowPanelModal] = useState(false);
  const [newPanelData, setNewPanelData] = useState<Panel | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; panelId: string; page: "left" | "right" } | null>(null);
  const [panelShape, setPanelShape] = useState<"rectangle" | "circle">("rectangle");
  const [selectedCategory, setSelectedCategory] = useState("Action");
  
  const leftPageRef = useRef<HTMLDivElement>(null);
  const rightPageRef = useRef<HTMLDivElement>(null);

  const currentSpread = spreads[currentSpreadIndex];

  useEffect(() => {
    if (project) {
      setTitle(project.title);
      const data = project.data as any;
      if (data?.spreads) {
        setSpreads(data.spreads);
      }
    }
  }, [project]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (projectId) {
        await updateProject.mutateAsync({
          id: projectId,
          data: { title, data: { spreads } },
        });
      } else {
        await createProject.mutateAsync({
          title,
          type: "comic",
          status: "draft",
          data: { spreads },
        });
      }
      toast.success("Project saved");
    } catch (error: any) {
      toast.error(error.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const getPagePanels = (page: "left" | "right") => {
    return page === "left" ? currentSpread.leftPage : currentSpread.rightPage;
  };

  const updatePagePanels = (page: "left" | "right", panels: Panel[]) => {
    const newSpreads = [...spreads];
    if (page === "left") {
      newSpreads[currentSpreadIndex].leftPage = panels;
    } else {
      newSpreads[currentSpreadIndex].rightPage = panels;
    }
    setSpreads(newSpreads);
  };

  const handleMouseDown = (e: React.MouseEvent, page: "left" | "right", pageRef: React.RefObject<HTMLDivElement | null>) => {
    if (activeTool !== "Panel" && activeTool !== "Select") return;
    if (e.button === 2) return;
    
    const rect = pageRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    if (activeTool === "Panel") {
      setIsDrawingPanel(true);
      setDrawStart({ x, y });
      setDrawCurrent({ x, y });
      setSelectedPage(page);
    }
  };

  const handleMouseMove = (e: React.MouseEvent, pageRef: React.RefObject<HTMLDivElement | null>) => {
    if (!isDrawingPanel) return;
    
    const rect = pageRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    
    setDrawCurrent({ x, y });
  };

  const handleMouseUp = () => {
    if (!isDrawingPanel) return;
    
    const width = Math.abs(drawCurrent.x - drawStart.x);
    const height = Math.abs(drawCurrent.y - drawStart.y);
    
    if (width > 5 && height > 5) {
      const newPanel: Panel = {
        id: `panel_${Date.now()}`,
        x: Math.min(drawStart.x, drawCurrent.x),
        y: Math.min(drawStart.y, drawCurrent.y),
        width,
        height,
        type: panelShape,
        zIndex: getPagePanels(selectedPage).length,
      };
      
      setNewPanelData(newPanel);
      setShowPanelModal(true);
    }
    
    setIsDrawingPanel(false);
  };

  const confirmPanel = (action: "media" | "draw" | "skip") => {
    if (!newPanelData) return;
    
    const panels = [...getPagePanels(selectedPage), newPanelData];
    updatePagePanels(selectedPage, panels);
    
    if (action === "media") {
      toast.success("Panel created! Add your media now.");
    } else if (action === "draw") {
      setActiveTool("Draw");
      toast.success("Panel created! Draw mode activated.");
    } else {
      toast.success("Panel created!");
    }
    
    setShowPanelModal(false);
    setNewPanelData(null);
  };

  const handleContextMenu = (e: React.MouseEvent, panelId: string, page: "left" | "right") => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, panelId, page });
    setSelectedPanelId(panelId);
    setSelectedPage(page);
  };

  const closeContextMenu = () => setContextMenu(null);

  const deletePanel = () => {
    if (!contextMenu) return;
    const panels = getPagePanels(contextMenu.page).filter(p => p.id !== contextMenu.panelId);
    updatePagePanels(contextMenu.page, panels);
    closeContextMenu();
    toast.success("Panel deleted");
  };

  const bringToFront = () => {
    if (!contextMenu) return;
    const panels = getPagePanels(contextMenu.page);
    const maxZ = Math.max(...panels.map(p => p.zIndex));
    const updated = panels.map(p => p.id === contextMenu.panelId ? { ...p, zIndex: maxZ + 1 } : p);
    updatePagePanels(contextMenu.page, updated);
    closeContextMenu();
  };

  const sendToBack = () => {
    if (!contextMenu) return;
    const panels = getPagePanels(contextMenu.page);
    const minZ = Math.min(...panels.map(p => p.zIndex));
    const updated = panels.map(p => p.id === contextMenu.panelId ? { ...p, zIndex: minZ - 1 } : p);
    updatePagePanels(contextMenu.page, updated);
    closeContextMenu();
  };

  const addSpread = () => {
    const newSpread: Spread = {
      id: `spread_${Date.now()}`,
      leftPage: [],
      rightPage: [],
    };
    setSpreads([...spreads, newSpread]);
    toast.success("New spread added");
  };

  const applyTemplate = (template: typeof panelTemplates[0], page: "left" | "right") => {
    const panels: Panel[] = template.panels.map((p, i) => ({
      id: `panel_${Date.now()}_${i}`,
      x: p.x,
      y: p.y,
      width: p.width,
      height: p.height,
      type: "rectangle" as const,
      zIndex: i,
    }));
    updatePagePanels(page, panels);
    setShowTemplates(false);
    toast.success(`Applied ${template.name} template`);
  };

  const handleAIGenerate = (panelId: string, page: "left" | "right") => {
    setSelectedPanelId(panelId);
    setSelectedPage(page);
    setShowAIGen(true);
    closeContextMenu();
  };

  const handleImageGenerated = (url: string) => {
    if (selectedPanelId) {
      const panels = getPagePanels(selectedPage).map(p => 
        p.id === selectedPanelId ? { ...p, content: { type: "ai" as const, url } } : p
      );
      updatePagePanels(selectedPage, panels);
    }
    setShowAIGen(false);
    toast.success("AI image added to panel");
  };

  const renderPanel = (panel: Panel, page: "left" | "right") => (
    <div
      key={panel.id}
      onClick={() => { setSelectedPanelId(panel.id); setSelectedPage(page); }}
      onContextMenu={(e) => handleContextMenu(e, panel.id, page)}
      onDoubleClick={() => handleAIGenerate(panel.id, page)}
      className={`absolute border-4 border-black cursor-pointer transition-all group ${
        selectedPanelId === panel.id ? "ring-2 ring-blue-500 ring-offset-2" : ""
      } ${panel.type === "circle" ? "rounded-full" : ""}`}
      style={{
        left: `${panel.x}%`,
        top: `${panel.y}%`,
        width: `${panel.width}%`,
        height: `${panel.height}%`,
        zIndex: panel.zIndex,
        backgroundColor: panel.content?.url ? "transparent" : "rgba(255,255,255,0.9)",
      }}
      data-testid={`panel-${panel.id}`}
    >
      {panel.content?.url ? (
        <img src={panel.content.url} className="w-full h-full object-cover" alt="" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity">
          <div className="text-center">
            <Plus className="w-6 h-6 mx-auto mb-1" />
            <p className="text-[10px] font-mono">Double-click or Right-click</p>
            <p className="text-[10px] font-mono">to add media or draw</p>
          </div>
        </div>
      )}
      <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100" />
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100" />
      <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100" />
      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100" />
    </div>
  );

  const renderDrawingPreview = () => {
    if (!isDrawingPanel) return null;
    
    const x = Math.min(drawStart.x, drawCurrent.x);
    const y = Math.min(drawStart.y, drawCurrent.y);
    const width = Math.abs(drawCurrent.x - drawStart.x);
    const height = Math.abs(drawCurrent.y - drawStart.y);
    
    return (
      <div
        className={`absolute border-2 border-dashed border-blue-500 bg-blue-500/10 pointer-events-none ${panelShape === "circle" ? "rounded-full" : ""}`}
        style={{ left: `${x}%`, top: `${y}%`, width: `${width}%`, height: `${height}%` }}
      />
    );
  };

  return (
    <Layout>
      <div className="h-screen flex flex-col" onClick={closeContextMenu}>
        <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-background">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 hover:bg-muted border border-transparent hover:border-border transition-colors" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <button className="p-2 hover:bg-muted" data-testid="button-undo"><Undo className="w-4 h-4" /></button>
            <button className="p-2 hover:bg-muted" data-testid="button-redo"><Redo className="w-4 h-4" /></button>
            
            <div className="relative">
              <button 
                onClick={() => setShowCreateMenu(!showCreateMenu)}
                className="px-3 py-1.5 bg-pink-500 text-white text-sm font-medium flex items-center gap-2 hover:bg-pink-600"
                data-testid="button-create"
              >
                <Plus className="w-4 h-4" /> Create
              </button>
              {showCreateMenu && (
                <div className="absolute top-full left-0 mt-1 bg-background border border-border shadow-lg z-50 min-w-[180px]">
                  <div className="p-2 text-xs font-bold uppercase text-muted-foreground border-b border-border">Panels</div>
                  <button 
                    onClick={() => { setPanelShape("rectangle"); setActiveTool("Panel"); setShowCreateMenu(false); }}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                  >
                    <Square className="w-4 h-4" /> Rectangle (R)
                  </button>
                  <button 
                    onClick={() => { setPanelShape("circle"); setActiveTool("Panel"); setShowCreateMenu(false); }}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                  >
                    <Circle className="w-4 h-4" /> Circle (C)
                  </button>
                  <button 
                    onClick={() => { setShowTemplates(true); setShowCreateMenu(false); }}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                  >
                    <LayoutGrid className="w-4 h-4" /> Templates
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 border-l border-border pl-4">
              {tools.slice(0, 5).map((tool) => (
                <button
                  key={tool.label}
                  onClick={() => setActiveTool(tool.label)}
                  className={`p-2 ${activeTool === tool.label ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  title={`${tool.label} (${tool.shortcut})`}
                >
                  <tool.icon className="w-4 h-4" />
                </button>
              ))}
            </div>

            <div className="border-l border-border pl-4">
              <button className="px-3 py-1.5 border border-border text-sm hover:bg-muted flex items-center gap-2">
                Media
              </button>
            </div>

            <div className="border-l border-border pl-4">
              <button className="px-3 py-1.5 border border-border text-sm hover:bg-muted flex items-center gap-2">
                Text & FX
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-display font-bold text-sm bg-transparent border-none outline-none hover:bg-muted px-2 py-1 max-w-[200px]"
              data-testid="input-comic-title"
            />
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1.5 bg-secondary hover:bg-muted border border-border text-sm flex items-center gap-2"
              data-testid="button-save"
            >
              <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden bg-zinc-900">
          <main className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-auto">
            <div className="absolute inset-0 opacity-[0.03]" 
              style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "30px 30px" }} 
            />

            <div className="text-white text-sm mb-4 font-mono">
              Spread {currentSpreadIndex + 1} of {spreads.length}
              <button onClick={() => currentSpreadIndex > 0 && setCurrentSpreadIndex(currentSpreadIndex - 1)} className="ml-4 px-2 hover:bg-white/10">
                <ChevronLeft className="w-4 h-4 inline" /> Previous
              </button>
              <button onClick={() => currentSpreadIndex < spreads.length - 1 && setCurrentSpreadIndex(currentSpreadIndex + 1)} className="ml-2 px-2 hover:bg-white/10">
                Next <ChevronRight className="w-4 h-4 inline" />
              </button>
            </div>

            <div className={`flex gap-4 ${isFullscreen ? "scale-100" : ""}`}>
              <div 
                ref={leftPageRef}
                className="bg-white w-[400px] h-[600px] border border-black relative select-none"
                onMouseDown={(e) => handleMouseDown(e, "left", leftPageRef)}
                onMouseMove={(e) => handleMouseMove(e, leftPageRef)}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {currentSpread.leftPage.map(panel => renderPanel(panel, "left"))}
                {isDrawingPanel && selectedPage === "left" && renderDrawingPreview()}
                {currentSpread.leftPage.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Plus className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-mono opacity-50">Double-click or Right-click</p>
                      <p className="text-xs font-mono opacity-50">to add media or draw</p>
                    </div>
                  </div>
                )}
              </div>

              <div 
                ref={rightPageRef}
                className="bg-white w-[400px] h-[600px] border border-black relative select-none"
                onMouseDown={(e) => handleMouseDown(e, "right", rightPageRef)}
                onMouseMove={(e) => handleMouseMove(e, rightPageRef)}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {currentSpread.rightPage.map(panel => renderPanel(panel, "right"))}
                {isDrawingPanel && selectedPage === "right" && renderDrawingPreview()}
                {currentSpread.rightPage.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Plus className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-mono opacity-50">Double-click or Right-click</p>
                      <p className="text-xs font-mono opacity-50">to add media or draw</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button 
              onClick={addSpread}
              className="mt-6 px-4 py-2 bg-zinc-800 text-white text-sm flex items-center gap-2 hover:bg-zinc-700 border border-zinc-600"
              data-testid="button-add-spread"
            >
              <Plus className="w-4 h-4" /> Add New Spread
            </button>

            <div className="absolute bottom-4 right-4 flex gap-2">
              <button 
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 bg-zinc-800 text-white hover:bg-zinc-700"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <span className="px-2 py-1 bg-zinc-800 text-white text-xs font-mono">
                {activeTool === "Panel" ? "Panel Edit Mode ON" : "Full canvas"}
              </span>
            </div>
          </main>

          <aside className="w-64 border-l border-border bg-background flex flex-col">
            <div className="p-3 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Layers className="w-4 h-4" /> Layers
              </h3>
            </div>
            <div className="flex-1 overflow-auto p-2 space-y-1">
              {getPagePanels(selectedPage).map((panel, i) => (
                <div 
                  key={panel.id} 
                  onClick={() => setSelectedPanelId(panel.id)}
                  className={`p-2 border text-xs flex items-center gap-2 cursor-pointer ${
                    selectedPanelId === panel.id ? "bg-primary/10 border-primary" : "border-border hover:bg-muted"
                  }`}
                >
                  <Square className="w-3 h-3" />
                  Panel {i + 1}
                  {panel.content?.type === "ai" && <Sparkles className="w-3 h-3 text-yellow-500" />}
                </div>
              ))}
              {getPagePanels(selectedPage).length === 0 && (
                <p className="text-xs text-muted-foreground p-2">No panels yet. Use Create menu or draw panels.</p>
              )}
            </div>
          </aside>
        </div>

        {showPanelModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background border border-border p-6 w-96 shadow-hard">
              <h2 className="font-display font-bold text-lg mb-2">Panel Created! What would you like to add?</h2>
              <p className="text-sm text-muted-foreground mb-6">Choose how to fill your new panel</p>
              
              <div className="space-y-3">
                <button 
                  onClick={() => confirmPanel("media")}
                  className="w-full p-4 border border-border hover:border-primary text-left flex items-center gap-4"
                  data-testid="button-add-media"
                >
                  <Upload className="w-6 h-6" />
                  <div>
                    <div className="font-bold">Add Media</div>
                    <div className="text-xs text-muted-foreground">Upload image, video, or GIF</div>
                  </div>
                </button>
                
                <button 
                  onClick={() => confirmPanel("draw")}
                  className="w-full p-4 border border-border hover:border-primary text-left flex items-center gap-4"
                  data-testid="button-draw"
                >
                  <PenTool className="w-6 h-6" />
                  <div>
                    <div className="font-bold">Draw</div>
                    <div className="text-xs text-muted-foreground">Sketch with Wacom support</div>
                  </div>
                </button>
                
                <button 
                  onClick={() => confirmPanel("skip")}
                  className="w-full p-3 text-sm text-muted-foreground hover:text-foreground"
                >
                  Skip - I'll add content later
                </button>
              </div>
            </div>
          </div>
        )}

        {showTemplates && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background border border-border w-[700px] max-h-[80vh] overflow-hidden shadow-hard">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <div>
                  <h2 className="font-display font-bold text-xl tracking-wide">Panel Templates</h2>
                  <p className="text-sm text-muted-foreground">Choose from {panelTemplates.length} professional comic layouts</p>
                </div>
                <button onClick={() => setShowTemplates(false)} className="p-2 hover:bg-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex gap-2 p-3 border-b border-border overflow-x-auto">
                {templateCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 text-sm whitespace-nowrap ${
                      selectedCategory === cat ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-muted"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              
              <div className="p-4 grid grid-cols-4 gap-4 max-h-[400px] overflow-auto">
                {panelTemplates.filter(t => t.category === selectedCategory).map(template => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template, selectedPage)}
                    className="aspect-[3/4] border border-border hover:border-primary bg-white relative group"
                  >
                    <div className="absolute inset-2 flex flex-col gap-1">
                      {template.panels.map((p, i) => (
                        <div 
                          key={i}
                          className="absolute bg-gray-200 border border-gray-400"
                          style={{
                            left: `${p.x}%`, top: `${p.y}%`,
                            width: `${p.width}%`, height: `${p.height}%`
                          }}
                        />
                      ))}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black text-white text-[10px] p-1 opacity-0 group-hover:opacity-100">
                      {template.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {contextMenu && (
          <div 
            className="fixed bg-background border border-border shadow-lg z-50 min-w-[220px] py-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-3">
              <ImageIcon className="w-4 h-4" /> Add Image
            </button>
            <button className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-3">
              <Film className="w-4 h-4" /> Add Video
            </button>
            <button className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-3">
              <Type className="w-4 h-4" /> Add Text
            </button>
            <button className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-3">
              <Sparkles className="w-4 h-4" /> Add Effect
            </button>
            <button className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-3">
              <MessageSquare className="w-4 h-4" /> Add Caption Block
            </button>
            <button className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-3">
              <Square className="w-4 h-4" /> Add SVG Bubble/Graphic
            </button>
            <div className="border-t border-border my-1" />
            <button 
              onClick={() => handleAIGenerate(contextMenu.panelId, contextMenu.page)}
              className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-3"
            >
              <Wand2 className="w-4 h-4" /> AI Generate Image
            </button>
            <button className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-3">
              <ImageIcon className="w-4 h-4" /> Set Background Image
            </button>
            <div className="border-t border-border my-1" />
            <button onClick={bringToFront} className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-3">
              <MoveUp className="w-4 h-4" /> Bring to Front
            </button>
            <button onClick={sendToBack} className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-3">
              <MoveDown className="w-4 h-4" /> Send to Back
            </button>
            <div className="border-t border-border my-1" />
            <button className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-3">
              <Square className="w-4 h-4" /> Use as VN Background
            </button>
            <button className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-3">
              <Square className="w-4 h-4" /> Use in CYOA
            </button>
            <div className="border-t border-border my-1" />
            <button className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-3">
              <Film className="w-4 h-4" /> Animation Sequences
            </button>
            <button className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-3">
              <Save className="w-4 h-4" /> Save Animation to Library
            </button>
            <button className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-3">
              <Download className="w-4 h-4" /> Apply Saved Animation
            </button>
            <button className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-3">
              <PenTool className="w-4 h-4" /> Apply Saved Drawing
            </button>
            <div className="border-t border-border my-1" />
            <button onClick={deletePanel} className="w-full px-4 py-2 text-sm text-left hover:bg-red-500/10 text-red-500 flex items-center gap-3">
              <Trash2 className="w-4 h-4" /> Delete Panel
            </button>
          </div>
        )}

        {showAIGen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background border border-border p-4 w-96">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">AI Generate Image</h3>
                <button onClick={() => setShowAIGen(false)} className="p-1 hover:bg-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <AIGenerator type="comic" onImageGenerated={handleImageGenerated} />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
