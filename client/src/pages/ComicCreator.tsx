import { Layout } from "@/components/layout/Layout";
import { 
  Save, Undo, Redo, MousePointer, Pen, Eraser, Type, Image as ImageIcon, 
  Square, Layers, Download, Film, MessageSquare, Wand2, Plus, ArrowLeft,
  ChevronLeft, ChevronRight, Circle, LayoutGrid, Maximize2, Minimize2,
  Trash2, MoveUp, MoveDown, X, Upload, Move, ZoomIn, ZoomOut, Eye, EyeOff,
  Lock, Unlock, Copy, RotateCcw
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { AIGenerator } from "@/components/tools/AIGenerator";
import { TransformableElement, TransformState } from "@/components/tools/TransformableElement";
import { TextElement } from "@/components/tools/TextElement";
import { useProject, useUpdateProject, useCreateProject } from "@/hooks/useProjects";
import { useAssetLibrary } from "@/contexts/AssetLibraryContext";
import { toast } from "sonner";

interface PanelContent {
  id: string;
  type: "image" | "text" | "bubble" | "drawing" | "shape" | "video" | "gif";
  transform: TransformState;
  data: {
    url?: string;
    text?: string;
    bubbleStyle?: "none" | "speech" | "thought" | "shout";
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    drawingData?: string;
    videoUrl?: string;
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
  };
  zIndex: number;
  locked: boolean;
}

interface Panel {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: "rectangle" | "circle";
  contents: PanelContent[];
  zIndex: number;
}

interface Spread {
  id: string;
  leftPage: Panel[];
  rightPage: Panel[];
}

const panelTemplates = [
  { id: "action_impact", name: "Action Impact", panels: [{x:0,y:0,width:60,height:100},{x:60,y:0,width:40,height:50},{x:60,y:50,width:40,height:50}] },
  { id: "dialogue_flow", name: "Dialogue Flow", panels: [{x:0,y:0,width:50,height:50},{x:50,y:0,width:50,height:50},{x:0,y:50,width:100,height:50}] },
  { id: "full_splash", name: "Full Splash", panels: [{x:0,y:0,width:100,height:100}] },
  { id: "grid_2x2", name: "2x2 Grid", panels: [{x:0,y:0,width:50,height:50},{x:50,y:0,width:50,height:50},{x:0,y:50,width:50,height:50},{x:50,y:50,width:50,height:50}] },
  { id: "manga_action", name: "Manga Action", panels: [{x:0,y:0,width:60,height:40},{x:60,y:0,width:40,height:60},{x:0,y:40,width:60,height:60},{x:60,y:60,width:40,height:40}] },
  { id: "webtoon_scroll", name: "Webtoon Scroll", panels: [{x:0,y:0,width:100,height:33},{x:0,y:33,width:100,height:34},{x:0,y:67,width:100,height:33}] },
  { id: "cinematic_wide", name: "Cinematic Wide", panels: [{x:0,y:0,width:100,height:25},{x:0,y:25,width:100,height:50},{x:0,y:75,width:100,height:25}] },
  { id: "broken_grid", name: "Broken Grid", panels: [{x:0,y:0,width:60,height:60},{x:40,y:40,width:60,height:60}] },
];

const tools = [
  { id: "select", icon: MousePointer, label: "Select", shortcut: "V" },
  { id: "move", icon: Move, label: "Move", shortcut: "M" },
  { id: "panel", icon: Square, label: "Panel", shortcut: "P" },
  { id: "draw", icon: Pen, label: "Draw", shortcut: "B" },
  { id: "erase", icon: Eraser, label: "Erase", shortcut: "E" },
  { id: "text", icon: Type, label: "Text", shortcut: "T" },
  { id: "bubble", icon: MessageSquare, label: "Bubble", shortcut: "U" },
  { id: "image", icon: ImageIcon, label: "Image", shortcut: "I" },
  { id: "ai", icon: Wand2, label: "AI Gen", shortcut: "G" },
];

export default function ComicCreator() {
  const [location, navigate] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const projectId = searchParams.get('id');
  
  const { data: project } = useProject(projectId || '');
  const updateProject = useUpdateProject();
  const createProject = useCreateProject();
  const { importFromFile, assets } = useAssetLibrary();

  const [activeTool, setActiveTool] = useState("select");
  const [showAIGen, setShowAIGen] = useState(false);
  const [title, setTitle] = useState("Untitled Comic");
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [spreads, setSpreads] = useState<Spread[]>([
    { id: "spread_1", leftPage: [], rightPage: [] }
  ]);
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(0);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<"left" | "right">("left");
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  
  const [isDrawingPanel, setIsDrawingPanel] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [drawCurrent, setDrawCurrent] = useState({ x: 0, y: 0 });
  
  const [showTemplates, setShowTemplates] = useState(false);
  const [showLayers, setShowLayers] = useState(true);
  const [brushSize, setBrushSize] = useState(4);
  const [brushColor, setBrushColor] = useState("#000000");
  const [zoom, setZoom] = useState(100);
  
  const [drawingInPanel, setDrawingInPanel] = useState<string | null>(null);
  const [isDrawingInCanvas, setIsDrawingInCanvas] = useState(false);
  const panelCanvasRef = useRef<HTMLCanvasElement>(null);
  const panelCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [lastDrawPoint, setLastDrawPoint] = useState<{x: number, y: number} | null>(null);

  const leftPageRef = useRef<HTMLDivElement>(null);
  const rightPageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSpread = spreads[currentSpreadIndex];

  useEffect(() => {
    const creatingFlag = sessionStorage.getItem('comic_creating');
    if (!projectId && !creatingFlag && !createProject.isPending) {
      sessionStorage.setItem('comic_creating', 'true');
      setIsCreating(true);
      createProject.mutateAsync({
        title: "Untitled Comic",
        type: "comic",
        status: "draft",
        data: { spreads: [] },
      }).then((newProject) => {
        sessionStorage.removeItem('comic_creating');
        setIsCreating(false);
        navigate(`/creator/comic?id=${newProject.id}`, { replace: true });
      }).catch(() => {
        toast.error("Failed to create project");
        sessionStorage.removeItem('comic_creating');
        setIsCreating(false);
      });
    } else if (projectId) {
      sessionStorage.removeItem('comic_creating');
      setIsCreating(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (project) {
      setTitle(project.title);
      const data = project.data as any;
      if (data?.spreads?.length > 0) {
        setSpreads(data.spreads);
      }
    }
  }, [project]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch(e.key.toLowerCase()) {
        case 'v': setActiveTool('select'); break;
        case 'm': setActiveTool('move'); break;
        case 'p': setActiveTool('panel'); break;
        case 'b': setActiveTool('draw'); break;
        case 'e': setActiveTool('erase'); break;
        case 't': setActiveTool('text'); break;
        case 'u': setActiveTool('bubble'); break;
        case 'i': setActiveTool('image'); break;
        case 'g': setShowAIGen(true); break;
        case 'delete': case 'backspace': handleDeleteSelected(); e.preventDefault(); break;
        case 'escape': setSelectedPanelId(null); setSelectedContentId(null); break;
        case 'z': if (e.ctrlKey || e.metaKey) e.preventDefault(); break;
        case 's': if (e.ctrlKey || e.metaKey) { e.preventDefault(); handleSave(); } break;
        case 'f': if (e.ctrlKey || e.metaKey) { e.preventDefault(); setIsFullscreen(!isFullscreen); } break;
        case '[': setBrushSize(s => Math.max(1, s - 2)); break;
        case ']': setBrushSize(s => Math.min(100, s + 2)); break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPanelId, selectedContentId]);

  const handleDeleteSelected = () => {
    if (selectedContentId && selectedPanelId) {
      deleteContentFromPanel(selectedPage, selectedPanelId, selectedContentId);
      setSelectedContentId(null);
    } else if (selectedPanelId) {
      deletePanel(selectedPage, selectedPanelId);
      setSelectedPanelId(null);
    }
  };

  const handleSave = async () => {
    if (!projectId) return;
    setIsSaving(true);
    try {
      await updateProject.mutateAsync({
        id: projectId,
        data: { title, data: { spreads } },
      });
      toast.success("Comic saved");
    } catch (error: any) {
      toast.error(error.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const addSpread = () => {
    setSpreads([...spreads, { id: `spread_${Date.now()}`, leftPage: [], rightPage: [] }]);
    setCurrentSpreadIndex(spreads.length);
  };

  const getPageRef = (page: "left" | "right") => page === "left" ? leftPageRef : rightPageRef;

  const getCoords = (e: React.MouseEvent, pageRef: React.RefObject<HTMLDivElement | null>) => {
    if (!pageRef.current) return { x: 0, y: 0 };
    const rect = pageRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    };
  };

  const handlePageMouseDown = (e: React.MouseEvent, page: "left" | "right", pageRef: React.RefObject<HTMLDivElement | null>) => {
    if (e.button !== 0) return;
    setSelectedPage(page);
    
    if (activeTool === "panel") {
      const coords = getCoords(e, pageRef);
      setIsDrawingPanel(true);
      setDrawStart(coords);
      setDrawCurrent(coords);
      setSelectedPanelId(null);
      setSelectedContentId(null);
    } else if (activeTool === "select") {
      setSelectedPanelId(null);
      setSelectedContentId(null);
    }
  };

  const handlePageMouseMove = (e: React.MouseEvent, pageRef: React.RefObject<HTMLDivElement | null>) => {
    if (isDrawingPanel) {
      setDrawCurrent(getCoords(e, pageRef));
    }
  };

  const handlePageMouseUp = (page: "left" | "right") => {
    if (isDrawingPanel) {
      const x = Math.min(drawStart.x, drawCurrent.x);
      const y = Math.min(drawStart.y, drawCurrent.y);
      const width = Math.abs(drawCurrent.x - drawStart.x);
      const height = Math.abs(drawCurrent.y - drawStart.y);
      
      if (width > 5 && height > 5) {
        addPanel(page, { x, y, width, height, type: "rectangle" });
      }
      setIsDrawingPanel(false);
    }
  };

  const addPanel = (page: "left" | "right", panelData: { x: number; y: number; width: number; height: number; type: "rectangle" | "circle" }) => {
    const newPanel: Panel = {
      id: `panel_${Date.now()}`,
      ...panelData,
      contents: [],
      zIndex: page === "left" ? currentSpread.leftPage.length : currentSpread.rightPage.length,
    };

    setSpreads(prev => prev.map((spread, i) => {
      if (i !== currentSpreadIndex) return spread;
      return {
        ...spread,
        [page === "left" ? "leftPage" : "rightPage"]: [...spread[page === "left" ? "leftPage" : "rightPage"], newPanel]
      };
    }));

    setSelectedPanelId(newPanel.id);
    toast.success("Panel created");
  };

  const deletePanel = (page: "left" | "right", panelId: string) => {
    setSpreads(prev => prev.map((spread, i) => {
      if (i !== currentSpreadIndex) return spread;
      const key = page === "left" ? "leftPage" : "rightPage";
      return { ...spread, [key]: spread[key].filter(p => p.id !== panelId) };
    }));
    toast.success("Panel deleted");
  };

  const handlePanelClick = (e: React.MouseEvent, panelId: string, page: "left" | "right") => {
    e.stopPropagation();
    setSelectedPage(page);
    setSelectedPanelId(panelId);
    setSelectedContentId(null);
    setActiveTool("select");
  };

  const handlePanelDoubleClick = (e: React.MouseEvent, panelId: string, page: "left" | "right") => {
    e.stopPropagation();
    setSelectedPage(page);
    setSelectedPanelId(panelId);
    
    if (activeTool === "text") {
      addTextToPanel(page, panelId);
    } else if (activeTool === "bubble") {
      addBubbleToPanel(page, panelId);
    } else if (activeTool === "draw" || activeTool === "erase") {
      setDrawingInPanel(panelId);
      setTimeout(() => {
        const canvas = panelCanvasRef.current;
        if (canvas) {
          canvas.width = 800;
          canvas.height = 800;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            panelCtxRef.current = ctx;
          }
        }
      }, 50);
    } else {
      fileInputRef.current?.click();
    }
  };
  
  const handlePanelCanvasMouseDown = (e: React.MouseEvent) => {
    if (!panelCanvasRef.current || !panelCtxRef.current) return;
    setIsDrawingInCanvas(true);
    const rect = panelCanvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * panelCanvasRef.current.width;
    const y = ((e.clientY - rect.top) / rect.height) * panelCanvasRef.current.height;
    setLastDrawPoint({ x, y });
  };
  
  const handlePanelCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDrawingInCanvas || !panelCanvasRef.current || !panelCtxRef.current || !lastDrawPoint) return;
    const ctx = panelCtxRef.current;
    const rect = panelCanvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * panelCanvasRef.current.width;
    const y = ((e.clientY - rect.top) / rect.height) * panelCanvasRef.current.height;
    
    ctx.globalCompositeOperation = activeTool === 'erase' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = activeTool === 'erase' ? brushSize * 3 : brushSize;
    ctx.beginPath();
    ctx.moveTo(lastDrawPoint.x, lastDrawPoint.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    
    setLastDrawPoint({ x, y });
  };
  
  const handlePanelCanvasMouseUp = () => {
    setIsDrawingInCanvas(false);
    setLastDrawPoint(null);
  };
  
  const saveDrawingToPanel = () => {
    if (!panelCanvasRef.current || !drawingInPanel) return;
    const drawingData = panelCanvasRef.current.toDataURL('image/png');
    addContentToPanel(selectedPage, drawingInPanel, {
      type: "drawing",
      transform: { x: 0, y: 0, width: 500, height: 500, rotation: 0, scaleX: 1, scaleY: 1 },
      data: { drawingData },
      locked: false,
    });
    setDrawingInPanel(null);
    toast.success("Drawing saved to panel");
  };
  
  const cancelPanelDrawing = () => {
    setDrawingInPanel(null);
  };

  const addContentToPanel = (page: "left" | "right", panelId: string, content: Omit<PanelContent, "id" | "zIndex">) => {
    setSpreads(prev => prev.map((spread, i) => {
      if (i !== currentSpreadIndex) return spread;
      const key = page === "left" ? "leftPage" : "rightPage";
      return {
        ...spread,
        [key]: spread[key].map(panel => {
          if (panel.id !== panelId) return panel;
          const newContent: PanelContent = {
            ...content,
            id: `content_${Date.now()}`,
            zIndex: panel.contents.length,
          };
          return { ...panel, contents: [...panel.contents, newContent] };
        })
      };
    }));
  };

  const updateContentTransform = (page: "left" | "right", panelId: string, contentId: string, transform: TransformState) => {
    setSpreads(prev => prev.map((spread, i) => {
      if (i !== currentSpreadIndex) return spread;
      const key = page === "left" ? "leftPage" : "rightPage";
      return {
        ...spread,
        [key]: spread[key].map(panel => {
          if (panel.id !== panelId) return panel;
          return {
            ...panel,
            contents: panel.contents.map(c => c.id === contentId ? { ...c, transform } : c)
          };
        })
      };
    }));
  };

  const deleteContentFromPanel = (page: "left" | "right", panelId: string, contentId: string) => {
    setSpreads(prev => prev.map((spread, i) => {
      if (i !== currentSpreadIndex) return spread;
      const key = page === "left" ? "leftPage" : "rightPage";
      return {
        ...spread,
        [key]: spread[key].map(panel => {
          if (panel.id !== panelId) return panel;
          return { ...panel, contents: panel.contents.filter(c => c.id !== contentId) };
        })
      };
    }));
  };

  const addTextToPanel = (page: "left" | "right", panelId: string) => {
    addContentToPanel(page, panelId, {
      type: "text",
      transform: { x: 50, y: 50, width: 250, height: 120, rotation: 0, scaleX: 1, scaleY: 1 },
      data: { text: "Enter text here", fontSize: 18, fontFamily: "Inter, sans-serif", color: "#000000" },
      locked: false,
    });
    setEditingTextId(`content_${Date.now() - 1}`);
    toast.success("Text added - click to edit");
  };

  const addBubbleToPanel = (page: "left" | "right", panelId: string) => {
    addContentToPanel(page, panelId, {
      type: "bubble",
      transform: { x: 50, y: 50, width: 280, height: 150, rotation: 0, scaleX: 1, scaleY: 1 },
      data: { text: "Dialog here...", bubbleStyle: "speech", fontSize: 16, fontFamily: "Inter, sans-serif", color: "#000000" },
      locked: false,
    });
    toast.success("Speech bubble added - double-click to edit");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPanelId) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const fileType = file.type.toLowerCase();
      const fileName = file.name.toLowerCase();
      
      if (fileType.startsWith('video/') || fileName.endsWith('.mp4') || fileName.endsWith('.webm') || fileName.endsWith('.mov')) {
        addContentToPanel(selectedPage, selectedPanelId, {
          type: "video",
          transform: { x: 0, y: 0, width: 400, height: 300, rotation: 0, scaleX: 1, scaleY: 1 },
          data: { videoUrl: url, autoplay: true, loop: true, muted: true },
          locked: false,
        });
        toast.success("Video added to panel - drag to position");
      } else if (fileType === 'image/gif' || fileName.endsWith('.gif')) {
        addContentToPanel(selectedPage, selectedPanelId, {
          type: "gif",
          transform: { x: 0, y: 0, width: 400, height: 300, rotation: 0, scaleX: 1, scaleY: 1 },
          data: { url },
          locked: false,
        });
        toast.success("Animated GIF added - drag to position");
      } else {
        addContentToPanel(selectedPage, selectedPanelId, {
          type: "image",
          transform: { x: 0, y: 0, width: 400, height: 300, rotation: 0, scaleX: 1, scaleY: 1 },
          data: { url },
          locked: false,
        });
        toast.success("Image added - drag to position");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleAIGenerated = (url: string) => {
    if (!selectedPanelId) {
      toast.error("Please select a panel first");
      return;
    }
    addContentToPanel(selectedPage, selectedPanelId, {
      type: "image",
      transform: { x: 0, y: 0, width: 450, height: 350, rotation: 0, scaleX: 1, scaleY: 1 },
      data: { url },
      locked: false,
    });
    setShowAIGen(false);
    toast.success("AI image added - drag to position");
  };

  const applyTemplate = (template: typeof panelTemplates[0], page: "left" | "right") => {
    template.panels.forEach(p => {
      addPanel(page, { x: p.x, y: p.y, width: p.width, height: p.height, type: "rectangle" });
    });
    setShowTemplates(false);
    toast.success(`Template "${template.name}" applied`);
  };

  const renderPanel = (panel: Panel, page: "left" | "right") => {
    const isSelected = selectedPanelId === panel.id;
    
    return (
      <div
        key={panel.id}
        className={`absolute border-2 transition-all cursor-pointer overflow-hidden ${
          isSelected ? 'border-white ring-2 ring-white/50 z-20' : 'border-black hover:border-gray-600'
        } ${panel.type === "circle" ? "rounded-full" : ""}`}
        style={{
          left: `${panel.x}%`,
          top: `${panel.y}%`,
          width: `${panel.width}%`,
          height: `${panel.height}%`,
          zIndex: panel.zIndex,
        }}
        onClick={(e) => handlePanelClick(e, panel.id, page)}
        onDoubleClick={(e) => handlePanelDoubleClick(e, panel.id, page)}
        data-testid={`panel-${panel.id}`}
      >
        {panel.contents.map(content => (
          <TransformableElement
            key={content.id}
            id={content.id}
            initialTransform={content.transform}
            isSelected={selectedContentId === content.id}
            onSelect={(id) => { setSelectedContentId(id); setSelectedPanelId(panel.id); }}
            onTransformChange={(id, transform) => updateContentTransform(page, panel.id, id, transform)}
            onDelete={(id) => deleteContentFromPanel(page, panel.id, id)}
            onDuplicate={(id) => {
              const original = panel.contents.find(c => c.id === id);
              if (original) {
                addContentToPanel(page, panel.id, {
                  ...original,
                  transform: { ...original.transform, x: original.transform.x + 20, y: original.transform.y + 20 }
                });
              }
            }}
            locked={content.locked}
          >
            {(content.type === "image" || content.type === "gif") && content.data.url && (
              <img 
                src={content.data.url} 
                alt="Panel content" 
                className="w-full h-full object-cover"
                draggable={false}
              />
            )}
            {content.type === "video" && content.data.videoUrl && (
              <video
                src={content.data.videoUrl}
                className="w-full h-full object-cover"
                autoPlay={content.data.autoplay ?? true}
                loop={content.data.loop ?? true}
                muted={content.data.muted ?? true}
                playsInline
                draggable={false}
              />
            )}
            {content.type === "drawing" && content.data.drawingData && (
              <img
                src={content.data.drawingData}
                alt="Drawing"
                className="w-full h-full object-contain"
                draggable={false}
              />
            )}
            {(content.type === "text" || content.type === "bubble") && (
              <TextElement
                id={content.id}
                text={content.data.text || ""}
                fontSize={content.data.fontSize}
                fontFamily={content.data.fontFamily}
                color={content.data.color}
                bubbleStyle={content.type === "bubble" ? (content.data.bubbleStyle as any) : "none"}
                isEditing={editingTextId === content.id}
                onEditStart={() => setEditingTextId(content.id)}
                onEditEnd={() => setEditingTextId(null)}
                onChange={(id, text) => {
                  setSpreads(prev => prev.map((spread, i) => {
                    if (i !== currentSpreadIndex) return spread;
                    const key = page === "left" ? "leftPage" : "rightPage";
                    return {
                      ...spread,
                      [key]: spread[key].map(p => {
                        if (p.id !== panel.id) return p;
                        return {
                          ...p,
                          contents: p.contents.map(c => c.id === id ? { ...c, data: { ...c.data, text } } : c)
                        };
                      })
                    };
                  }));
                }}
              />
            )}
          </TransformableElement>
        ))}

        {isSelected && panel.contents.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
            <div className="text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-mono">Double-click to add content</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDrawingPreview = () => {
    if (!isDrawingPanel) return null;
    const x = Math.min(drawStart.x, drawCurrent.x);
    const y = Math.min(drawStart.y, drawCurrent.y);
    const width = Math.abs(drawCurrent.x - drawStart.x);
    const height = Math.abs(drawCurrent.y - drawStart.y);
    const isValidSize = width > 5 && height > 5;
    
    return (
      <>
        <div
          className={`absolute pointer-events-none z-50 ${
            isValidSize ? 'bg-blue-500/20' : 'bg-red-500/20'
          }`}
          style={{ 
            left: `${x}%`, 
            top: `${y}%`, 
            width: `${width}%`, 
            height: `${height}%`,
            border: `3px dashed ${isValidSize ? '#000' : '#f00'}`,
            boxShadow: isValidSize 
              ? '0 0 0 2px rgba(59, 130, 246, 0.5), inset 0 0 20px rgba(59, 130, 246, 0.1)' 
              : '0 0 0 2px rgba(239, 68, 68, 0.5)'
          }}
        >
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black text-white px-2 py-0.5 text-xs font-mono whitespace-nowrap">
            {width.toFixed(0)}% × {height.toFixed(0)}%
          </div>
          <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-black" />
          <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-black" />
          <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-black" />
          <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-black" />
        </div>
        {!isValidSize && width > 0 && height > 0 && (
          <div className="absolute z-50 bg-red-600 text-white px-2 py-1 text-xs font-bold pointer-events-none"
            style={{ left: `${x}%`, top: `${y + height + 2}%` }}
          >
            Drag larger to create panel
          </div>
        )}
      </>
    );
  };

  if (isCreating) {
    return (
      <Layout>
        <div className="h-screen flex items-center justify-center bg-black">
          <div className="text-center text-white">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-400">Creating comic project...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-screen flex flex-col bg-zinc-950 text-white">
        <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 hover:bg-zinc-800" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-display font-bold text-lg bg-transparent border-none outline-none hover:bg-zinc-800 px-2 py-1"
              data-testid="input-title"
            />
            <span className="text-xs font-mono text-zinc-500">Comic Creator</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-zinc-800"><Undo className="w-4 h-4" /></button>
            <button className="p-2 hover:bg-zinc-800"><Redo className="w-4 h-4" /></button>
            <div className="w-px h-6 bg-zinc-700 mx-2" />
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className={`px-3 py-1.5 text-sm flex items-center gap-2 ${showTemplates ? 'bg-white text-black' : 'bg-zinc-800 hover:bg-zinc-700'}`}
            >
              <LayoutGrid className="w-4 h-4" /> Templates
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              data-testid="button-save"
            >
              <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save"}
            </button>
            <button className="px-4 py-2 bg-white text-black text-sm font-bold flex items-center gap-2 hover:bg-zinc-200">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <aside className="w-16 border-r border-zinc-800 flex flex-col items-center py-4 gap-1 bg-zinc-900">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`p-3 w-12 h-12 flex items-center justify-center transition-all ${
                  activeTool === tool.id ? 'bg-white text-black' : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
                title={`${tool.label} (${tool.shortcut})`}
              >
                <tool.icon className="w-5 h-5" />
              </button>
            ))}
            <div className="w-10 h-px bg-zinc-700 my-2" />
            <div 
              className="w-8 h-8 border-2 border-zinc-600 cursor-pointer"
              style={{ backgroundColor: brushColor }}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'color';
                input.value = brushColor;
                input.onchange = (e) => setBrushColor((e.target as HTMLInputElement).value);
                input.click();
              }}
            />
          </aside>

          <main className="flex-1 bg-zinc-950 overflow-auto flex flex-col items-center justify-center p-4 relative">
            <div className="absolute inset-0 pointer-events-none opacity-5"
                 style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

            <div className="text-white text-sm mb-4 font-mono flex items-center gap-4">
              <span>Spread {currentSpreadIndex + 1} of {spreads.length}</span>
              <button 
                onClick={() => currentSpreadIndex > 0 && setCurrentSpreadIndex(currentSpreadIndex - 1)}
                className="px-2 py-1 hover:bg-white/10"
                disabled={currentSpreadIndex === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => currentSpreadIndex < spreads.length - 1 && setCurrentSpreadIndex(currentSpreadIndex + 1)}
                className="px-2 py-1 hover:bg-white/10"
                disabled={currentSpreadIndex === spreads.length - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1 ml-4">
                <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="p-1 hover:bg-white/10">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="w-12 text-center text-xs">{zoom}%</span>
                <button onClick={() => setZoom(z => Math.min(150, z + 10))} className="p-1 hover:bg-white/10">
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div 
              className={`flex ${isFullscreen ? "gap-1" : "gap-6"}`}
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }}
            >
              <div 
                ref={leftPageRef}
                className={`bg-white border-4 border-black relative select-none shadow-2xl ${
                  isFullscreen ? "w-[900px] h-[1280px]" : "w-[720px] h-[1020px]"
                }`}
                style={{ maxHeight: 'calc(100vh - 160px)' }}
                onMouseDown={(e) => handlePageMouseDown(e, "left", leftPageRef)}
                onMouseMove={(e) => handlePageMouseMove(e, leftPageRef)}
                onMouseUp={() => handlePageMouseUp("left")}
                onMouseLeave={() => isDrawingPanel && handlePageMouseUp("left")}
              >
                {currentSpread.leftPage.map(panel => renderPanel(panel, "left"))}
                {isDrawingPanel && selectedPage === "left" && renderDrawingPreview()}
                {currentSpread.leftPage.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-400 pointer-events-none">
                    <div className="text-center">
                      <Plus className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-mono opacity-40">Press P and draw panels</p>
                      <p className="text-xs font-mono opacity-30 mt-1">or use Templates</p>
                    </div>
                  </div>
                )}
              </div>

              <div 
                ref={rightPageRef}
                className={`bg-white border-4 border-black relative select-none shadow-2xl ${
                  isFullscreen ? "w-[900px] h-[1280px]" : "w-[720px] h-[1020px]"
                }`}
                style={{ maxHeight: 'calc(100vh - 160px)' }}
                onMouseDown={(e) => handlePageMouseDown(e, "right", rightPageRef)}
                onMouseMove={(e) => handlePageMouseMove(e, rightPageRef)}
                onMouseUp={() => handlePageMouseUp("right")}
                onMouseLeave={() => isDrawingPanel && handlePageMouseUp("right")}
              >
                {currentSpread.rightPage.map(panel => renderPanel(panel, "right"))}
                {isDrawingPanel && selectedPage === "right" && renderDrawingPreview()}
                {currentSpread.rightPage.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-400 pointer-events-none">
                    <div className="text-center">
                      <Plus className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-mono opacity-40">Press P and draw panels</p>
                      <p className="text-xs font-mono opacity-30 mt-1">or use Templates</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button 
                onClick={addSpread}
                className="px-4 py-2 bg-zinc-800 text-white text-sm flex items-center gap-2 hover:bg-zinc-700"
                data-testid="button-add-spread"
              >
                <Plus className="w-4 h-4" /> Add Spread
              </button>
              <button 
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="px-4 py-2 bg-zinc-800 text-white text-sm flex items-center gap-2 hover:bg-zinc-700"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                {isFullscreen ? "Exit Full" : "Full Screen"}
              </button>
            </div>
          </main>

          {showLayers && (
            <aside className="w-64 border-l border-zinc-800 bg-zinc-900 flex flex-col">
              <div className="p-3 border-b border-zinc-800 font-bold text-sm flex items-center justify-between">
                <span className="flex items-center gap-2"><Layers className="w-4 h-4" /> Layers</span>
                <button onClick={() => setShowLayers(false)} className="p-1 hover:bg-zinc-800">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-2 space-y-1">
                {(selectedPage === "left" ? currentSpread.leftPage : currentSpread.rightPage).map((panel, idx) => (
                  <div
                    key={panel.id}
                    className={`p-2 text-sm cursor-pointer ${selectedPanelId === panel.id ? 'bg-white text-black' : 'bg-zinc-800 hover:bg-zinc-700'}`}
                    onClick={() => { setSelectedPanelId(panel.id); setSelectedContentId(null); }}
                  >
                    <div className="flex items-center justify-between">
                      <span>Panel {idx + 1}</span>
                      <span className="text-xs opacity-50">{panel.contents.length} items</span>
                    </div>
                    {selectedPanelId === panel.id && panel.contents.length > 0 && (
                      <div className="mt-2 pl-2 border-l border-zinc-600 space-y-1">
                        {panel.contents.map((content, cIdx) => (
                          <div
                            key={content.id}
                            className={`px-2 py-1 text-xs cursor-pointer ${selectedContentId === content.id ? 'bg-zinc-600' : 'hover:bg-zinc-700'}`}
                            onClick={(e) => { e.stopPropagation(); setSelectedContentId(content.id); }}
                          >
                            {content.type} {cIdx + 1}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </aside>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,.gif,.mp4,.webm,.mov"
          className="hidden"
          onChange={handleFileUpload}
        />

        {drawingInPanel && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-zinc-700 p-4 w-[900px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Pen className="w-5 h-5" /> Draw in Panel
                </h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">Brush:</span>
                    <input 
                      type="range" 
                      min="1" 
                      max="50" 
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="w-20"
                    />
                    <span className="text-xs w-8">{brushSize}px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">Color:</span>
                    <input 
                      type="color" 
                      value={brushColor}
                      onChange={(e) => setBrushColor(e.target.value)}
                      className="w-8 h-8 cursor-pointer"
                    />
                  </div>
                  <button 
                    onClick={() => setActiveTool(activeTool === 'erase' ? 'draw' : 'erase')}
                    className={`p-2 ${activeTool === 'erase' ? 'bg-white text-black' : 'hover:bg-zinc-800'}`}
                  >
                    <Eraser className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="bg-white border-2 border-black">
                <canvas
                  ref={panelCanvasRef}
                  className="w-full aspect-square cursor-crosshair"
                  onMouseDown={handlePanelCanvasMouseDown}
                  onMouseMove={handlePanelCanvasMouseMove}
                  onMouseUp={handlePanelCanvasMouseUp}
                  onMouseLeave={handlePanelCanvasMouseUp}
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button 
                  onClick={cancelPanelDrawing}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveDrawingToPanel}
                  className="px-4 py-2 bg-white text-black font-bold text-sm hover:bg-zinc-200"
                >
                  Save Drawing
                </button>
              </div>
            </div>
          </div>
        )}

        {showTemplates && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-zinc-700 p-6 w-[600px] max-h-[80vh] overflow-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Panel Templates</h3>
                <button onClick={() => setShowTemplates(false)} className="p-2 hover:bg-zinc-800">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {panelTemplates.map(template => (
                  <div key={template.id} className="border border-zinc-700 p-4 hover:border-white cursor-pointer group">
                    <div className="aspect-[3/4] bg-white mb-2 relative">
                      {template.panels.map((p, i) => (
                        <div key={i} className="absolute border border-black" 
                             style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.width}%`, height: `${p.height}%` }} />
                      ))}
                    </div>
                    <p className="text-sm font-medium">{template.name}</p>
                    <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100">
                      <button onClick={() => applyTemplate(template, "left")} className="flex-1 py-1 bg-zinc-800 text-xs">Left</button>
                      <button onClick={() => applyTemplate(template, "right")} className="flex-1 py-1 bg-zinc-800 text-xs">Right</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showAIGen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-zinc-700 p-6 w-[500px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Wand2 className="w-5 h-5" /> AI Generate
                </h3>
                <button onClick={() => setShowAIGen(false)} className="p-2 hover:bg-zinc-800">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {selectedPanelId ? (
                <AIGenerator type="comic" onImageGenerated={handleAIGenerated} />
              ) : (
                <p className="text-zinc-400 text-center py-8">Please select a panel first</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
