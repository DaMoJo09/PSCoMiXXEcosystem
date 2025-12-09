import { Layout } from "@/components/layout/Layout";
import { 
  Save, Undo, Redo, MousePointer, Pen, Eraser, Type, Image as ImageIcon, 
  Square, Layers, Download, Film, MessageSquare, Wand2, Plus, ArrowLeft,
  ChevronLeft, ChevronRight, Circle, LayoutGrid, Maximize2, Minimize2,
  Trash2, MoveUp, MoveDown, X, Upload, Move, ZoomIn, ZoomOut, Eye, EyeOff,
  Lock, Unlock, Copy, RotateCcw, Palette, Grid, Scissors, ClipboardPaste, PenTool, Share2
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { AIGenerator } from "@/components/tools/AIGenerator";
import { TransformableElement, TransformState } from "@/components/tools/TransformableElement";
import { TextElement } from "@/components/tools/TextElement";
import { DrawingWorkspace } from "@/components/tools/DrawingWorkspace";
import { useProject, useUpdateProject, useCreateProject } from "@/hooks/useProjects";
import { useAssetLibrary } from "@/contexts/AssetLibraryContext";
import { toast } from "sonner";
import { PostComposer } from "@/components/social/PostComposer";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VectorPath {
  id: string;
  type: "path" | "line" | "rectangle" | "ellipse" | "arrow" | "text";
  points: { x: number; y: number; handleIn?: { x: number; y: number }; handleOut?: { x: number; y: number } }[];
  stroke: string;
  strokeWidth: number;
  fill: string;
  closed: boolean;
  visible: boolean;
  locked: boolean;
}

interface PanelContent {
  id: string;
  type: "image" | "text" | "bubble" | "drawing" | "shape" | "video" | "gif";
  transform: TransformState;
  data: {
    url?: string;
    text?: string;
    bubbleStyle?: "none" | "speech" | "thought" | "shout" | "whisper" | "burst" | "scream" | "robot" | "drip" | "glitch" | "retro" | "neon" | "graffiti";
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    drawingData?: string;
    vectorData?: VectorPath[];
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
  rotation: number;
  type: "rectangle" | "circle";
  contents: PanelContent[];
  zIndex: number;
  locked: boolean;
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

const FONT_OPTIONS = [
  { value: "Inter, sans-serif", label: "Inter" },
  { value: "'Space Grotesk', sans-serif", label: "Space Grotesk" },
  { value: "'Bangers', cursive", label: "Bangers" },
  { value: "'Permanent Marker', cursive", label: "Permanent Marker" },
  { value: "'Luckiest Guy', cursive", label: "Luckiest Guy" },
  { value: "'Londrina Solid', cursive", label: "Londrina Solid" },
  { value: "'Gloria Hallelujah', cursive", label: "Gloria Hallelujah" },
  { value: "'Caveat', cursive", label: "Caveat" },
  { value: "'Bungee', cursive", label: "Bungee" },
  { value: "'Black Ops One', cursive", label: "Black Ops One" },
  { value: "'Russo One', sans-serif", label: "Russo One" },
  { value: "'Bebas Neue', sans-serif", label: "Bebas Neue" },
  { value: "'Anton', sans-serif", label: "Anton" },
  { value: "'Press Start 2P', cursive", label: "Press Start 2P" },
  { value: "'Orbitron', sans-serif", label: "Orbitron" },
  { value: "'VT323', monospace", label: "VT323" },
  { value: "'Creepster', cursive", label: "Creepster" },
  { value: "'Nosifer', cursive", label: "Nosifer" },
  { value: "'Special Elite', cursive", label: "Special Elite" },
  { value: "'Satisfy', cursive", label: "Satisfy" },
  { value: "'Pacifico', cursive", label: "Pacifico" },
  { value: "'Lobster', cursive", label: "Lobster" },
  { value: "'Impact', sans-serif", label: "Impact" },
  { value: "'JetBrains Mono', monospace", label: "JetBrains Mono" },
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
  
  const [showPreview, setShowPreview] = useState(false);
  const [previewPage, setPreviewPage] = useState(0);
  const [comicMeta, setComicMeta] = useState({
    frontCover: "",
    backCover: "",
    bonusCards: [] as string[],
    credits: "Created with Press Start CoMixx"
  });
  
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
        case 'r': if (e.ctrlKey || e.metaKey) { e.preventDefault(); setPreviewPage(0); setShowPreview(true); } break;
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

  const exportPageToCanvas = async (panels: Panel[], pageWidth: number, pageHeight: number): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement("canvas");
    canvas.width = pageWidth;
    canvas.height = pageHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageWidth, pageHeight);

    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };

    for (const panel of panels.sort((a, b) => a.zIndex - b.zIndex)) {
      const panelX = (panel.x / 100) * pageWidth;
      const panelY = (panel.y / 100) * pageHeight;
      const panelW = (panel.width / 100) * pageWidth;
      const panelH = (panel.height / 100) * pageHeight;

      ctx.save();
      
      if (panel.type === "circle") {
        ctx.beginPath();
        ctx.ellipse(panelX + panelW / 2, panelY + panelH / 2, panelW / 2, panelH / 2, 0, 0, Math.PI * 2);
        ctx.clip();
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(panelX, panelY, panelW, panelH);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3;
      ctx.strokeRect(panelX, panelY, panelW, panelH);

      for (const content of panel.contents.sort((a, b) => a.zIndex - b.zIndex)) {
        const { transform, data, type } = content;
        const contentX = panelX + transform.x;
        const contentY = panelY + transform.y;
        const contentW = transform.width;
        const contentH = transform.height;

        ctx.save();
        ctx.translate(contentX + contentW / 2, contentY + contentH / 2);
        ctx.rotate((transform.rotation * Math.PI) / 180);
        ctx.scale(transform.scaleX || 1, transform.scaleY || 1);
        ctx.translate(-contentW / 2, -contentH / 2);

        if ((type === "image" || type === "gif") && data.url) {
          try {
            const img = await loadImage(data.url);
            ctx.drawImage(img, 0, 0, contentW, contentH);
          } catch (e) {
            ctx.fillStyle = "#cccccc";
            ctx.fillRect(0, 0, contentW, contentH);
          }
        } else if (type === "drawing" && data.drawingData) {
          try {
            const img = await loadImage(data.drawingData);
            ctx.drawImage(img, 0, 0, contentW, contentH);
          } catch (e) {}
        } else if ((type === "text" || type === "bubble") && data.text) {
          if (data.bubbleStyle && data.bubbleStyle !== "none") {
            ctx.fillStyle = data.bubbleStyle === "shout" ? "#fef08a" : "#ffffff";
            ctx.strokeStyle = data.bubbleStyle === "shout" ? "#ef4444" : "#000000";
            ctx.lineWidth = data.bubbleStyle === "shout" ? 3 : 2;
            
            if (data.bubbleStyle === "thought") {
              ctx.beginPath();
              ctx.ellipse(contentW / 2, contentH / 2, contentW / 2, contentH / 2, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            } else {
              ctx.fillRect(0, 0, contentW, contentH);
              ctx.strokeRect(0, 0, contentW, contentH);
            }
          }
          
          ctx.fillStyle = data.color || "#000000";
          ctx.font = `${data.fontSize || 16}px ${(data.fontFamily || "Inter").replace(/'/g, "")}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(data.text, contentW / 2, contentH / 2);
        } else if (type === "video") {
          ctx.fillStyle = "#1a1a2e";
          ctx.fillRect(0, 0, contentW, contentH);
          ctx.fillStyle = "#ffffff";
          ctx.font = "14px Inter";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("[Video Frame]", contentW / 2, contentH / 2);
        }

        ctx.restore();
      }

      ctx.restore();
    }

    return canvas;
  };

  const handleExportCurrentPagePNG = async () => {
    try {
      toast.info("Exporting current page...");
      const panels = selectedPage === "left" ? currentSpread.leftPage : currentSpread.rightPage;
      const canvas = await exportPageToCanvas(panels, 800, 1200);
      
      const link = document.createElement("a");
      link.download = `${title.replace(/\s+/g, "_")}_page_${currentSpreadIndex * 2 + (selectedPage === "left" ? 1 : 2)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      toast.success("Page exported successfully!");
    } catch (error) {
      toast.error("Failed to export page");
    }
  };

  const handleExportAllPagesPNG = async () => {
    try {
      toast.info("Exporting all pages...");
      
      for (let i = 0; i < spreads.length; i++) {
        const spread = spreads[i];
        
        if (spread.leftPage.length > 0) {
          const leftCanvas = await exportPageToCanvas(spread.leftPage, 800, 1200);
          const leftLink = document.createElement("a");
          leftLink.download = `${title.replace(/\s+/g, "_")}_page_${i * 2 + 1}.png`;
          leftLink.href = leftCanvas.toDataURL("image/png");
          leftLink.click();
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        if (spread.rightPage.length > 0) {
          const rightCanvas = await exportPageToCanvas(spread.rightPage, 800, 1200);
          const rightLink = document.createElement("a");
          rightLink.download = `${title.replace(/\s+/g, "_")}_page_${i * 2 + 2}.png`;
          rightLink.href = rightCanvas.toDataURL("image/png");
          rightLink.click();
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      toast.success("All pages exported successfully!");
    } catch (error) {
      toast.error("Failed to export pages");
    }
  };

  const handleExportProjectJSON = () => {
    try {
      const projectData = {
        title,
        type: "comic",
        spreads,
        comicMeta,
        exportedAt: new Date().toISOString(),
      };
      
      const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.download = `${title.replace(/\s+/g, "_")}_project.json`;
      link.href = URL.createObjectURL(blob);
      link.click();
      
      toast.success("Project data exported!");
    } catch (error) {
      toast.error("Failed to export project data");
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
      rotation: 0,
      contents: [],
      zIndex: page === "left" ? currentSpread.leftPage.length : currentSpread.rightPage.length,
      locked: false,
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

  const updatePanelTransform = (page: "left" | "right", panelId: string, transform: { x: number; y: number; width: number; height: number; rotation: number }) => {
    setSpreads(prev => prev.map((spread, i) => {
      if (i !== currentSpreadIndex) return spread;
      const key = page === "left" ? "leftPage" : "rightPage";
      return {
        ...spread,
        [key]: spread[key].map(p => 
          p.id === panelId 
            ? { ...p, x: transform.x, y: transform.y, width: transform.width, height: transform.height, rotation: transform.rotation }
            : p
        )
      };
    }));
  };

  const duplicatePanel = (page: "left" | "right", panelId: string) => {
    const panels = page === "left" ? currentSpread.leftPage : currentSpread.rightPage;
    const original = panels.find(p => p.id === panelId);
    if (!original) return;
    
    const newPanel: Panel = {
      ...original,
      id: `panel_${Date.now()}`,
      x: original.x + 5,
      y: original.y + 5,
      contents: original.contents.map(c => ({ ...c, id: `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` })),
      zIndex: panels.length,
    };
    
    setSpreads(prev => prev.map((spread, i) => {
      if (i !== currentSpreadIndex) return spread;
      return {
        ...spread,
        [page === "left" ? "leftPage" : "rightPage"]: [...spread[page === "left" ? "leftPage" : "rightPage"], newPanel]
      };
    }));
    
    setSelectedPanelId(newPanel.id);
    toast.success("Panel duplicated");
  };

  const togglePanelLock = (page: "left" | "right", panelId: string) => {
    setSpreads(prev => prev.map((spread, i) => {
      if (i !== currentSpreadIndex) return spread;
      const key = page === "left" ? "leftPage" : "rightPage";
      return {
        ...spread,
        [key]: spread[key].map(p => 
          p.id === panelId ? { ...p, locked: !p.locked } : p
        )
      };
    }));
  };

  const handlePanelClick = (e: React.MouseEvent, panelId: string, page: "left" | "right") => {
    e.stopPropagation();
    setSelectedPage(page);
    setSelectedPanelId(panelId);
    setSelectedContentId(null);
    
    const contentAddingTools = ["text", "bubble", "draw", "erase", "image"];
    if (!contentAddingTools.includes(activeTool)) {
      setActiveTool("select");
    }
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
  
  const handlePanelCanvasPointerDown = (e: React.PointerEvent) => {
    if (!panelCanvasRef.current || !panelCtxRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDrawingInCanvas(true);
    const rect = panelCanvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * panelCanvasRef.current.width;
    const y = ((e.clientY - rect.top) / rect.height) * panelCanvasRef.current.height;
    setLastDrawPoint({ x, y });
  };
  
  const handlePanelCanvasPointerMove = (e: React.PointerEvent) => {
    if (!isDrawingInCanvas || !panelCanvasRef.current || !panelCtxRef.current || !lastDrawPoint) return;
    const ctx = panelCtxRef.current;
    const rect = panelCanvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * panelCanvasRef.current.width;
    const y = ((e.clientY - rect.top) / rect.height) * panelCanvasRef.current.height;
    
    const pressure = e.pressure > 0 ? e.pressure : 0.5;
    const pressureBrushSize = activeTool === 'erase' 
      ? brushSize * 3 * pressure 
      : brushSize * (0.5 + pressure * 0.8);
    
    ctx.globalCompositeOperation = activeTool === 'erase' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = Math.max(1, pressureBrushSize);
    ctx.beginPath();
    ctx.moveTo(lastDrawPoint.x, lastDrawPoint.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    
    setLastDrawPoint({ x, y });
  };
  
  const handlePanelCanvasPointerUp = (e: React.PointerEvent) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch (_) {}
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
  
  const getExistingDrawingData = (panelId: string): string | undefined => {
    const panels = selectedPage === "left" ? currentSpread.leftPage : currentSpread.rightPage;
    const panel = panels.find(p => p.id === panelId);
    if (!panel) return undefined;
    const drawingContent = panel.contents.find(c => c.type === "drawing");
    return drawingContent?.data.drawingData;
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

  const updateContentStyle = (page: "left" | "right", panelId: string, contentId: string, styleUpdates: Partial<PanelContent['data']>) => {
    setSpreads(prev => prev.map((spread, i) => {
      if (i !== currentSpreadIndex) return spread;
      const key = page === "left" ? "leftPage" : "rightPage";
      return {
        ...spread,
        [key]: spread[key].map(panel => {
          if (panel.id !== panelId) return panel;
          return {
            ...panel,
            contents: panel.contents.map(c => 
              c.id === contentId 
                ? { ...c, data: { ...c.data, ...styleUpdates } }
                : c
            )
          };
        })
      };
    }));
  };

  const getSelectedContent = (): PanelContent | null => {
    if (!selectedPanelId || !selectedContentId) return null;
    const panels = selectedPage === "left" ? currentSpread.leftPage : currentSpread.rightPage;
    const panel = panels.find(p => p.id === selectedPanelId);
    return panel?.contents.find(c => c.id === selectedContentId) || null;
  };

  const selectedContent = getSelectedContent();

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
    const pageRef = page === "left" ? leftPageRef : rightPageRef;
    
    const HANDLE_SIZE = 10;
    const handles = [
      { position: 'nw', cursor: 'nwse-resize', x: -HANDLE_SIZE/2, y: -HANDLE_SIZE/2 },
      { position: 'n', cursor: 'ns-resize', x: '50%', y: -HANDLE_SIZE/2, translateX: '-50%' },
      { position: 'ne', cursor: 'nesw-resize', x: `calc(100% - ${HANDLE_SIZE/2}px)`, y: -HANDLE_SIZE/2 },
      { position: 'w', cursor: 'ew-resize', x: -HANDLE_SIZE/2, y: '50%', translateY: '-50%' },
      { position: 'e', cursor: 'ew-resize', x: `calc(100% - ${HANDLE_SIZE/2}px)`, y: '50%', translateY: '-50%' },
      { position: 'sw', cursor: 'nesw-resize', x: -HANDLE_SIZE/2, y: `calc(100% - ${HANDLE_SIZE/2}px)` },
      { position: 's', cursor: 'ns-resize', x: '50%', y: `calc(100% - ${HANDLE_SIZE/2}px)`, translateX: '-50%' },
      { position: 'se', cursor: 'nwse-resize', x: `calc(100% - ${HANDLE_SIZE/2}px)`, y: `calc(100% - ${HANDLE_SIZE/2}px)` },
    ];
    
    return (
      <div
        key={panel.id}
        className={`absolute border-2 transition-all cursor-pointer overflow-visible ${
          isSelected ? 'border-white ring-2 ring-white/50 z-20' : 'border-black hover:border-gray-600'
        } ${panel.type === "circle" ? "rounded-full" : ""}`}
        style={{
          left: `${panel.x}%`,
          top: `${panel.y}%`,
          width: `${panel.width}%`,
          height: `${panel.height}%`,
          zIndex: panel.zIndex,
          transform: `rotate(${panel.rotation || 0}deg)`,
          transformOrigin: 'center center',
          boxShadow: isSelected 
            ? '0 0 20px rgba(255,255,255,0.4), 0 8px 32px rgba(0,0,0,0.8)' 
            : '0 4px 16px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)',
        }}
        onClick={(e) => handlePanelClick(e, panel.id, page)}
        onDoubleClick={(e) => handlePanelDoubleClick(e, panel.id, page)}
        data-testid={`panel-${panel.id}`}
      >
        <div className="absolute inset-0 overflow-hidden bg-white">
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
        
        {isSelected && !panel.locked && (
          <>
            <div className="absolute inset-0 border-2 border-white pointer-events-none" 
                 style={{ boxShadow: '0 0 0 1px black' }} />
            
            {handles.map((handle) => (
              <div
                key={handle.position}
                className="absolute bg-white border-2 border-black hover:bg-gray-300 z-50"
                style={{
                  width: HANDLE_SIZE,
                  height: HANDLE_SIZE,
                  left: handle.x,
                  top: handle.y,
                  cursor: handle.cursor,
                  transform: `${handle.translateX ? `translateX(${handle.translateX})` : ''} ${handle.translateY ? `translateY(${handle.translateY})` : ''}`,
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const startX = e.clientX;
                  const startY = e.clientY;
                  const startPanel = { ...panel };
                  const pageEl = pageRef.current;
                  if (!pageEl) return;
                  const pageRect = pageEl.getBoundingClientRect();
                  
                  const handleMouseMove = (moveE: MouseEvent) => {
                    const dx = ((moveE.clientX - startX) / pageRect.width) * 100;
                    const dy = ((moveE.clientY - startY) / pageRect.height) * 100;
                    
                    let newX = startPanel.x;
                    let newY = startPanel.y;
                    let newWidth = startPanel.width;
                    let newHeight = startPanel.height;
                    
                    if (handle.position.includes('e')) newWidth = Math.max(5, startPanel.width + dx);
                    if (handle.position.includes('w')) {
                      const proposedWidth = startPanel.width - dx;
                      if (proposedWidth >= 5) {
                        newWidth = proposedWidth;
                        newX = startPanel.x + dx;
                      }
                    }
                    if (handle.position.includes('s')) newHeight = Math.max(5, startPanel.height + dy);
                    if (handle.position.includes('n')) {
                      const proposedHeight = startPanel.height - dy;
                      if (proposedHeight >= 5) {
                        newHeight = proposedHeight;
                        newY = startPanel.y + dy;
                      }
                    }
                    
                    updatePanelTransform(page, panel.id, {
                      x: newX,
                      y: newY,
                      width: newWidth,
                      height: newHeight,
                      rotation: startPanel.rotation || 0
                    });
                  };
                  
                  const handleMouseUp = () => {
                    window.removeEventListener('mousemove', handleMouseMove);
                    window.removeEventListener('mouseup', handleMouseUp);
                  };
                  
                  window.addEventListener('mousemove', handleMouseMove);
                  window.addEventListener('mouseup', handleMouseUp);
                }}
              />
            ))}

            <div
              className="absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-2 border-black rounded-full flex items-center justify-center cursor-grab hover:bg-gray-300 z-50"
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                const startAngle = panel.rotation || 0;
                const panelEl = e.currentTarget.parentElement;
                if (!panelEl) return;
                const rect = panelEl.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const startMouseAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
                
                const handleMouseMove = (moveE: MouseEvent) => {
                  const mouseAngle = Math.atan2(moveE.clientY - centerY, moveE.clientX - centerX) * (180 / Math.PI);
                  let newRotation = startAngle + (mouseAngle - startMouseAngle);
                  
                  if (moveE.shiftKey) {
                    newRotation = Math.round(newRotation / 15) * 15;
                  }
                  
                  updatePanelTransform(page, panel.id, {
                    x: panel.x,
                    y: panel.y,
                    width: panel.width,
                    height: panel.height,
                    rotation: newRotation
                  });
                };
                
                const handleMouseUp = () => {
                  window.removeEventListener('mousemove', handleMouseMove);
                  window.removeEventListener('mouseup', handleMouseUp);
                };
                
                window.addEventListener('mousemove', handleMouseMove);
                window.addEventListener('mouseup', handleMouseUp);
              }}
              title="Rotate panel"
            >
              <RotateCcw className="w-3 h-3" />
            </div>

            <div 
              className="absolute -top-8 right-0 flex gap-1 z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="p-1 bg-white border border-black hover:bg-gray-100"
                onClick={(e) => { e.stopPropagation(); duplicatePanel(page, panel.id); }}
                title="Duplicate"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                className="p-1 bg-white border border-black hover:bg-gray-100"
                onClick={(e) => { e.stopPropagation(); togglePanelLock(page, panel.id); }}
                title="Lock"
              >
                <Unlock className="w-3 h-3" />
              </button>
              <button
                className="p-1 bg-red-500 text-white border border-black hover:bg-red-600"
                onClick={(e) => { e.stopPropagation(); deletePanel(page, panel.id); setSelectedPanelId(null); }}
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </>
        )}
        
        {isSelected && panel.locked && (
          <div 
            className="absolute -top-8 right-0 flex gap-1 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="p-1 bg-white border border-black hover:bg-gray-100"
              onClick={(e) => { e.stopPropagation(); togglePanelLock(page, panel.id); }}
              title="Unlock"
            >
              <Lock className="w-3 h-3" />
            </button>
          </div>
        )}

        <div
          className="absolute inset-0 cursor-move z-10"
          style={{ pointerEvents: panel.locked ? 'none' : 'auto' }}
          onMouseDown={(e) => {
            if (panel.locked || !isSelected) return;
            if ((e.target as HTMLElement).closest('[data-transform-handle]')) return;
            e.stopPropagation();
            const startX = e.clientX;
            const startY = e.clientY;
            const startPanel = { ...panel };
            const pageEl = pageRef.current;
            if (!pageEl) return;
            const pageRect = pageEl.getBoundingClientRect();
            
            const handleMouseMove = (moveE: MouseEvent) => {
              const dx = ((moveE.clientX - startX) / pageRect.width) * 100;
              const dy = ((moveE.clientY - startY) / pageRect.height) * 100;
              
              updatePanelTransform(page, panel.id, {
                x: startPanel.x + dx,
                y: startPanel.y + dy,
                width: startPanel.width,
                height: startPanel.height,
                rotation: startPanel.rotation || 0
              });
            };
            
            const handleMouseUp = () => {
              window.removeEventListener('mousemove', handleMouseMove);
              window.removeEventListener('mouseup', handleMouseUp);
            };
            
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
          }}
        />
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
            <button 
              onClick={() => { setPreviewPage(0); setShowPreview(true); }}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-medium flex items-center gap-2"
              data-testid="button-preview"
            >
              <Eye className="w-4 h-4" /> Preview
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="px-4 py-2 bg-white text-black text-sm font-bold flex items-center gap-2 hover:bg-zinc-200">
                  <Download className="w-4 h-4" /> Export
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-zinc-900 border-zinc-700 text-white">
                <DropdownMenuItem onClick={handleExportCurrentPagePNG} className="hover:bg-zinc-800 cursor-pointer">
                  <ImageIcon className="w-4 h-4 mr-2" /> Current Page as PNG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportAllPagesPNG} className="hover:bg-zinc-800 cursor-pointer">
                  <Layers className="w-4 h-4 mr-2" /> All Pages as PNGs
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-700" />
                <DropdownMenuItem onClick={handleExportProjectJSON} className="hover:bg-zinc-800 cursor-pointer">
                  <Save className="w-4 h-4 mr-2" /> Project Data (JSON)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {projectId && (
              <PostComposer
                projectId={projectId}
                projectType="comic"
                projectTitle={title}
                trigger={
                  <button className="px-4 py-2 bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 border border-zinc-600 text-sm font-bold flex items-center gap-2" data-testid="button-share">
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                }
              />
            )}
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <aside className="w-16 border-r border-zinc-800 flex flex-col items-center py-4 gap-1 bg-zinc-900">
            {tools.map((tool) => (
              <Tooltip key={tool.id} delayDuration={100}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveTool(tool.id)}
                    className={`p-3 w-12 h-12 flex items-center justify-center transition-all ${
                      activeTool === tool.id ? 'bg-white text-black' : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                    data-testid={`tool-${tool.id}`}
                  >
                    <tool.icon className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-black border border-white text-white font-mono text-xs">
                  <p>{tool.label} <span className="text-zinc-400 ml-1">({tool.shortcut})</span></p>
                </TooltipContent>
              </Tooltip>
            ))}
            <div className="w-10 h-px bg-zinc-700 my-2" />
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
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
                  data-testid="tool-color-picker"
                />
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-black border border-white text-white font-mono text-xs">
                <p>Brush Color</p>
              </TooltipContent>
            </Tooltip>
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
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <div 
                    ref={leftPageRef}
                    className={`bg-white border-4 border-black relative select-none shadow-2xl flex-shrink-0 ${
                      isFullscreen ? "w-[800px] h-[1130px]" : "w-[650px] h-[920px]"
                    }`}
                    style={{ maxHeight: 'calc(100vh - 180px)', maxWidth: isFullscreen ? '45vw' : '40vw' }}
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
                </ContextMenuTrigger>
                <ContextMenuContent className="w-56 bg-zinc-900 border-zinc-700 text-white">
                  <ContextMenuItem onClick={() => setActiveTool("panel")} className="hover:bg-zinc-800 cursor-pointer">
                    <Square className="w-4 h-4 mr-2" /> Add Panel <ContextMenuShortcut>P</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => setActiveTool("text")} className="hover:bg-zinc-800 cursor-pointer">
                    <Type className="w-4 h-4 mr-2" /> Add Text <ContextMenuShortcut>T</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => setActiveTool("bubble")} className="hover:bg-zinc-800 cursor-pointer">
                    <MessageSquare className="w-4 h-4 mr-2" /> Add Bubble <ContextMenuShortcut>U</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuSeparator className="bg-zinc-700" />
                  <ContextMenuSub>
                    <ContextMenuSubTrigger className="hover:bg-zinc-800 cursor-pointer">
                      <LayoutGrid className="w-4 h-4 mr-2" /> Apply Template
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="w-48 bg-zinc-900 border-zinc-700 text-white">
                      {panelTemplates.map(template => (
                        <ContextMenuItem 
                          key={template.id} 
                          onClick={() => applyTemplate(template, "left")}
                          className="hover:bg-zinc-800 cursor-pointer"
                        >
                          {template.name}
                        </ContextMenuItem>
                      ))}
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                  <ContextMenuSeparator className="bg-zinc-700" />
                  <ContextMenuItem onClick={() => setActiveTool("draw")} className="hover:bg-zinc-800 cursor-pointer">
                    <Pen className="w-4 h-4 mr-2" /> Draw <ContextMenuShortcut>B</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => setShowAIGen(true)} className="hover:bg-zinc-800 cursor-pointer">
                    <Wand2 className="w-4 h-4 mr-2" /> AI Generate
                  </ContextMenuItem>
                  <ContextMenuSub>
                    <ContextMenuSubTrigger className="hover:bg-zinc-800 cursor-pointer">
                      <Layers className="w-4 h-4 mr-2" /> Asset Library
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="w-48 bg-zinc-900 border-zinc-700 text-white">
                      {assets.filter(a => a.type === "bubble" || a.type === "effect" || a.folderId === "bubbles" || a.folderId === "effects").slice(0, 6).map(asset => (
                        <ContextMenuItem
                          key={asset.id}
                          onClick={() => {
                            if (selectedPanelId) {
                              addContentToPanel("left", selectedPanelId, {
                                type: "image",
                                transform: { x: 50, y: 50, width: 150, height: 100, rotation: 0, scaleX: 1, scaleY: 1 },
                                data: { url: asset.url },
                                locked: false,
                              });
                              toast.success("Asset added to panel");
                            } else {
                              toast.error("Select a panel first");
                            }
                          }}
                          className="hover:bg-zinc-800 cursor-pointer"
                        >
                          {asset.name}
                        </ContextMenuItem>
                      ))}
                      {assets.filter(a => a.type === "bubble" || a.type === "effect" || a.folderId === "bubbles" || a.folderId === "effects").length === 0 && (
                        <ContextMenuItem disabled className="text-zinc-500">
                          No saved assets
                        </ContextMenuItem>
                      )}
                      <ContextMenuSeparator className="bg-zinc-700" />
                      <ContextMenuItem
                        onClick={() => window.location.href = "/tools/assets"}
                        className="hover:bg-zinc-800 cursor-pointer"
                      >
                        Open Asset Builder
                      </ContextMenuItem>
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                  <ContextMenuSeparator className="bg-zinc-700" />
                  <ContextMenuItem onClick={() => setShowLayers(!showLayers)} className="hover:bg-zinc-800 cursor-pointer">
                    <Layers className="w-4 h-4 mr-2" /> {showLayers ? "Hide" : "Show"} Layers
                  </ContextMenuItem>
                  {selectedPanelId && (
                    <>
                      <ContextMenuSeparator className="bg-zinc-700" />
                      <ContextMenuItem 
                        onClick={() => {
                          const panel = currentSpread.leftPage.find(p => p.id === selectedPanelId);
                          if (panel) {
                            sessionStorage.setItem('panel_edit_data', JSON.stringify({
                              panelId: panel.id,
                              contents: panel.contents,
                              page: "left",
                              spreadIndex: currentSpreadIndex,
                              projectId: projectId
                            }));
                            navigate(`/creator/motion?panel=${panel.id}&return=${encodeURIComponent(location)}`);
                          }
                        }} 
                        className="hover:bg-zinc-800 cursor-pointer"
                      >
                        <Film className="w-4 h-4 mr-2" /> Edit in Motion Studio
                      </ContextMenuItem>
                      <ContextMenuItem 
                        onClick={() => setActiveTool("draw")} 
                        className="hover:bg-zinc-800 cursor-pointer"
                      >
                        <Pen className="w-4 h-4 mr-2" /> Draw on Panel
                      </ContextMenuItem>
                      <ContextMenuSeparator className="bg-zinc-700" />
                      <ContextMenuItem onClick={() => deletePanel("left", selectedPanelId)} className="hover:bg-red-900 cursor-pointer text-red-400">
                        <Trash2 className="w-4 h-4 mr-2" /> Delete Panel
                      </ContextMenuItem>
                    </>
                  )}
                </ContextMenuContent>
              </ContextMenu>

              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <div 
                    ref={rightPageRef}
                    className={`bg-white border-4 border-black relative select-none shadow-2xl flex-shrink-0 ${
                      isFullscreen ? "w-[800px] h-[1130px]" : "w-[650px] h-[920px]"
                    }`}
                    style={{ maxHeight: 'calc(100vh - 180px)', maxWidth: isFullscreen ? '45vw' : '40vw' }}
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
                </ContextMenuTrigger>
                <ContextMenuContent className="w-56 bg-zinc-900 border-zinc-700 text-white">
                  <ContextMenuItem onClick={() => setActiveTool("panel")} className="hover:bg-zinc-800 cursor-pointer">
                    <Square className="w-4 h-4 mr-2" /> Add Panel <ContextMenuShortcut>P</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => setActiveTool("text")} className="hover:bg-zinc-800 cursor-pointer">
                    <Type className="w-4 h-4 mr-2" /> Add Text <ContextMenuShortcut>T</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => setActiveTool("bubble")} className="hover:bg-zinc-800 cursor-pointer">
                    <MessageSquare className="w-4 h-4 mr-2" /> Add Bubble <ContextMenuShortcut>U</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuSeparator className="bg-zinc-700" />
                  <ContextMenuSub>
                    <ContextMenuSubTrigger className="hover:bg-zinc-800 cursor-pointer">
                      <LayoutGrid className="w-4 h-4 mr-2" /> Apply Template
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="w-48 bg-zinc-900 border-zinc-700 text-white">
                      {panelTemplates.map(template => (
                        <ContextMenuItem 
                          key={template.id} 
                          onClick={() => applyTemplate(template, "right")}
                          className="hover:bg-zinc-800 cursor-pointer"
                        >
                          {template.name}
                        </ContextMenuItem>
                      ))}
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                  <ContextMenuSeparator className="bg-zinc-700" />
                  <ContextMenuItem onClick={() => setActiveTool("draw")} className="hover:bg-zinc-800 cursor-pointer">
                    <Pen className="w-4 h-4 mr-2" /> Draw <ContextMenuShortcut>B</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => setShowAIGen(true)} className="hover:bg-zinc-800 cursor-pointer">
                    <Wand2 className="w-4 h-4 mr-2" /> AI Generate
                  </ContextMenuItem>
                  <ContextMenuSub>
                    <ContextMenuSubTrigger className="hover:bg-zinc-800 cursor-pointer">
                      <Layers className="w-4 h-4 mr-2" /> Asset Library
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="w-48 bg-zinc-900 border-zinc-700 text-white">
                      {assets.filter(a => a.type === "bubble" || a.type === "effect" || a.folderId === "bubbles" || a.folderId === "effects").slice(0, 6).map(asset => (
                        <ContextMenuItem
                          key={asset.id}
                          onClick={() => {
                            if (selectedPanelId) {
                              addContentToPanel("right", selectedPanelId, {
                                type: "image",
                                transform: { x: 50, y: 50, width: 150, height: 100, rotation: 0, scaleX: 1, scaleY: 1 },
                                data: { url: asset.url },
                                locked: false,
                              });
                              toast.success("Asset added to panel");
                            } else {
                              toast.error("Select a panel first");
                            }
                          }}
                          className="hover:bg-zinc-800 cursor-pointer"
                        >
                          {asset.name}
                        </ContextMenuItem>
                      ))}
                      {assets.filter(a => a.type === "bubble" || a.type === "effect" || a.folderId === "bubbles" || a.folderId === "effects").length === 0 && (
                        <ContextMenuItem disabled className="text-zinc-500">
                          No saved assets
                        </ContextMenuItem>
                      )}
                      <ContextMenuSeparator className="bg-zinc-700" />
                      <ContextMenuItem
                        onClick={() => window.location.href = "/tools/assets"}
                        className="hover:bg-zinc-800 cursor-pointer"
                      >
                        Open Asset Builder
                      </ContextMenuItem>
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                  <ContextMenuSeparator className="bg-zinc-700" />
                  <ContextMenuItem onClick={() => setShowLayers(!showLayers)} className="hover:bg-zinc-800 cursor-pointer">
                    <Layers className="w-4 h-4 mr-2" /> {showLayers ? "Hide" : "Show"} Layers
                  </ContextMenuItem>
                  {selectedPanelId && (
                    <>
                      <ContextMenuSeparator className="bg-zinc-700" />
                      <ContextMenuItem 
                        onClick={() => {
                          const panel = currentSpread.rightPage.find(p => p.id === selectedPanelId);
                          if (panel) {
                            sessionStorage.setItem('panel_edit_data', JSON.stringify({
                              panelId: panel.id,
                              contents: panel.contents,
                              page: "right",
                              spreadIndex: currentSpreadIndex,
                              projectId: projectId
                            }));
                            navigate(`/creator/motion?panel=${panel.id}&return=${encodeURIComponent(location)}`);
                          }
                        }} 
                        className="hover:bg-zinc-800 cursor-pointer"
                      >
                        <Film className="w-4 h-4 mr-2" /> Edit in Motion Studio
                      </ContextMenuItem>
                      <ContextMenuItem 
                        onClick={() => setActiveTool("draw")} 
                        className="hover:bg-zinc-800 cursor-pointer"
                      >
                        <Pen className="w-4 h-4 mr-2" /> Draw on Panel
                      </ContextMenuItem>
                      <ContextMenuSeparator className="bg-zinc-700" />
                      <ContextMenuItem onClick={() => deletePanel("right", selectedPanelId)} className="hover:bg-red-900 cursor-pointer text-red-400">
                        <Trash2 className="w-4 h-4 mr-2" /> Delete Panel
                      </ContextMenuItem>
                    </>
                  )}
                </ContextMenuContent>
              </ContextMenu>
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
              
              {selectedContent && (selectedContent.type === 'text' || selectedContent.type === 'bubble') && selectedPanelId && (
                <div className="border-t border-zinc-800 p-3">
                  <h4 className="font-bold text-xs mb-3 flex items-center gap-2">
                    <Type className="w-3 h-3" /> Text Properties
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Font</label>
                      <select
                        value={selectedContent.data.fontFamily || "Inter, sans-serif"}
                        onChange={(e) => updateContentStyle(selectedPage, selectedPanelId, selectedContentId!, { fontFamily: e.target.value })}
                        className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs p-1.5"
                        data-testid="select-font"
                      >
                        {FONT_OPTIONS.map(font => (
                          <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                            {font.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-zinc-400 block mb-1">Size</label>
                        <input
                          type="number"
                          min="8"
                          max="120"
                          value={selectedContent.data.fontSize || 16}
                          onChange={(e) => updateContentStyle(selectedPage, selectedPanelId, selectedContentId!, { fontSize: Number(e.target.value) })}
                          className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs p-1.5"
                          data-testid="input-font-size"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-zinc-400 block mb-1">Color</label>
                        <input
                          type="color"
                          value={selectedContent.data.color || "#000000"}
                          onChange={(e) => updateContentStyle(selectedPage, selectedPanelId, selectedContentId!, { color: e.target.value })}
                          className="w-full h-7 bg-zinc-800 border border-zinc-700 cursor-pointer"
                          data-testid="input-text-color"
                        />
                      </div>
                    </div>
                    {selectedContent.type === 'bubble' && (
                      <div>
                        <label className="text-xs text-zinc-400 block mb-1">Bubble Style</label>
                        <select
                          value={selectedContent.data.bubbleStyle || "speech"}
                          onChange={(e) => updateContentStyle(selectedPage, selectedPanelId, selectedContentId!, { bubbleStyle: e.target.value as any })}
                          className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs p-1.5"
                          data-testid="select-bubble-style"
                        >
                          <option value="none">None</option>
                          <option value="speech">Speech</option>
                          <option value="thought">Thought</option>
                          <option value="shout">Shout</option>
                          <option value="whisper">Whisper</option>
                          <option value="burst">Burst</option>
                          <option value="scream">Scream</option>
                          <option value="robot">Robot</option>
                          <option value="drip">Drip</option>
                          <option value="glitch">Glitch</option>
                          <option value="retro">Retro</option>
                          <option value="neon">Neon</option>
                          <option value="graffiti">Graffiti</option>
                        </select>
                      </div>
                    )}
                    <div className="text-xs text-zinc-500 mt-2">
                      Double-click text to edit content
                    </div>
                  </div>
                </div>
              )}
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
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-8">
            <DrawingWorkspace
              width={800}
              height={800}
              initialData={getExistingDrawingData(drawingInPanel)}
              onSave={(rasterData, vectorData) => {
                addContentToPanel(selectedPage, drawingInPanel, {
                  type: "drawing",
                  transform: { x: 0, y: 0, width: 500, height: 500, rotation: 0, scaleX: 1, scaleY: 1 },
                  data: { drawingData: rasterData, vectorData },
                  locked: false,
                });
                setDrawingInPanel(null);
                toast.success("Drawing saved to panel");
              }}
              onCancel={() => setDrawingInPanel(null)}
              className="w-full max-w-5xl h-[85vh]"
            />
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

        {showPreview && (
          <div className="fixed inset-0 bg-black flex flex-col z-50">
            <div className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-6">
              <div className="flex items-center gap-4">
                <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-zinc-800">
                  <X className="w-5 h-5" />
                </button>
                <h2 className="font-display font-bold text-lg">{title} - Preview Mode</h2>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-zinc-400">
                  Page {previewPage + 1} of {2 + spreads.length * 2 + comicMeta.bonusCards.length}
                </span>
                <div className="flex gap-1">
                  <button 
                    onClick={() => setPreviewPage(p => Math.max(0, p - 1))}
                    disabled={previewPage === 0}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setPreviewPage(p => Math.min(1 + spreads.length * 2 + comicMeta.bonusCards.length, p + 1))}
                    disabled={previewPage >= 1 + spreads.length * 2 + comicMeta.bonusCards.length}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex-1 flex items-center justify-center p-8 bg-zinc-950">
              <div className="relative" style={{ perspective: "2000px" }}>
                {previewPage === 0 && (
                  <div className="w-[500px] h-[750px] bg-black border-4 border-zinc-800 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
                    {comicMeta.frontCover ? (
                      <img src={comicMeta.frontCover} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-black" />
                        <div className="relative z-10 text-center p-8">
                          <h1 className="text-4xl font-display font-black uppercase tracking-tight mb-4">{title}</h1>
                          <div className="w-32 h-1 bg-white mx-auto mb-4" />
                          <p className="text-zinc-400 uppercase tracking-widest text-sm">Issue #1</p>
                        </div>
                        <div className="absolute bottom-8 text-xs text-zinc-600">{comicMeta.credits}</div>
                      </>
                    )}
                    <div className="absolute top-4 right-4 text-xs text-white/50 font-mono">FRONT COVER</div>
                  </div>
                )}

                {previewPage > 0 && previewPage <= spreads.length * 2 && (() => {
                  const spreadIndex = Math.floor((previewPage - 1) / 2);
                  const isLeftPage = (previewPage - 1) % 2 === 0;
                  const spread = spreads[spreadIndex];
                  const panels = isLeftPage ? spread?.leftPage : spread?.rightPage;
                  
                  return (
                    <div className="w-[500px] h-[750px] bg-white border-4 border-zinc-800 shadow-2xl relative overflow-hidden">
                      {panels?.map(panel => (
                        <div 
                          key={panel.id}
                          className="absolute border-2 border-black bg-white overflow-hidden"
                          style={{
                            left: `${panel.x}%`,
                            top: `${panel.y}%`,
                            width: `${panel.width}%`,
                            height: `${panel.height}%`,
                          }}
                        >
                          {panel.contents.map(content => (
                            <div
                              key={content.id}
                              className="absolute"
                              style={{
                                left: content.transform.x,
                                top: content.transform.y,
                                width: content.transform.width,
                                height: content.transform.height,
                                transform: `rotate(${content.transform.rotation}deg)`,
                                zIndex: content.zIndex,
                              }}
                            >
                              {content.type === "image" && content.data.url && (
                                <img src={content.data.url} className="w-full h-full object-cover" />
                              )}
                              {content.type === "gif" && content.data.url && (
                                <img src={content.data.url} className="w-full h-full object-cover" />
                              )}
                              {content.type === "drawing" && content.data.drawingData && (
                                <img src={content.data.drawingData} className="w-full h-full object-contain" />
                              )}
                              {content.type === "video" && content.data.videoUrl && (
                                <video 
                                  src={content.data.videoUrl} 
                                  className="w-full h-full object-cover"
                                  autoPlay={content.data.autoplay !== false}
                                  loop={content.data.loop !== false}
                                  muted={content.data.muted !== false}
                                  playsInline
                                  controls
                                />
                              )}
                              {(content.type === "text" || content.type === "bubble") && (
                                <div 
                                  className={`w-full h-full flex items-center justify-center p-2 text-center ${
                                    content.data.bubbleStyle === "speech" ? "bg-white border-2 border-black rounded-2xl" :
                                    content.data.bubbleStyle === "thought" ? "bg-white border-2 border-black rounded-full" :
                                    content.data.bubbleStyle === "shout" ? "bg-yellow-300 border-2 border-black" : ""
                                  }`}
                                  style={{ 
                                    color: content.data.color, 
                                    fontSize: content.data.fontSize,
                                    fontFamily: content.data.fontFamily 
                                  }}
                                >
                                  {content.data.text}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                      {(!panels || panels.length === 0) && (
                        <div className="absolute inset-0 flex items-center justify-center text-zinc-300">
                          <p className="text-lg">Empty Page</p>
                        </div>
                      )}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-zinc-400 font-mono">
                        Page {previewPage}
                      </div>
                    </div>
                  );
                })()}

                {previewPage === spreads.length * 2 + 1 && (
                  <div className="w-[500px] h-[750px] bg-black border-4 border-zinc-800 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
                    {comicMeta.backCover ? (
                      <img src={comicMeta.backCover} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-black" />
                        <div className="relative z-10 text-center p-8 max-w-md">
                          <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                            Thank you for reading {title}. This comic was created using Press Start CoMixx.
                          </p>
                          <div className="w-16 h-16 border-2 border-zinc-700 mx-auto mb-4 flex items-center justify-center">
                            <span className="text-xs text-zinc-500 font-mono">BARCODE</span>
                          </div>
                          <p className="text-xs text-zinc-600">{comicMeta.credits}</p>
                        </div>
                      </>
                    )}
                    <div className="absolute top-4 right-4 text-xs text-white/50 font-mono">BACK COVER</div>
                  </div>
                )}

                {previewPage > spreads.length * 2 + 1 && comicMeta.bonusCards.length > 0 && (
                  <div className="w-[400px] h-[560px] bg-zinc-900 border-4 border-zinc-800 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute top-4 text-xs text-white/50 font-mono">BONUS CARD {previewPage - spreads.length * 2 - 1}</div>
                    {comicMeta.bonusCards[previewPage - spreads.length * 2 - 2] ? (
                      <img src={comicMeta.bonusCards[previewPage - spreads.length * 2 - 2]} className="w-[90%] h-[90%] object-contain" />
                    ) : (
                      <div className="text-zinc-500 text-center">
                        <p className="text-lg mb-2">Bonus Trading Card</p>
                        <p className="text-xs">Add cards in settings</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="h-24 bg-zinc-900 border-t border-zinc-800 flex items-center justify-center gap-2 px-4 overflow-x-auto">
              <button 
                onClick={() => setPreviewPage(0)}
                className={`w-12 h-16 border-2 flex-shrink-0 flex items-center justify-center text-[8px] ${previewPage === 0 ? 'border-white' : 'border-zinc-700'}`}
              >
                <span className="text-zinc-400">COVER</span>
              </button>
              {spreads.map((spread, idx) => (
                <div key={spread.id} className="flex gap-1">
                  <button 
                    onClick={() => setPreviewPage(idx * 2 + 1)}
                    className={`w-10 h-14 border flex-shrink-0 bg-white ${previewPage === idx * 2 + 1 ? 'border-2 border-blue-500' : 'border-zinc-700'}`}
                  >
                    <span className="text-[8px] text-black">{idx * 2 + 1}</span>
                  </button>
                  <button 
                    onClick={() => setPreviewPage(idx * 2 + 2)}
                    className={`w-10 h-14 border flex-shrink-0 bg-white ${previewPage === idx * 2 + 2 ? 'border-2 border-blue-500' : 'border-zinc-700'}`}
                  >
                    <span className="text-[8px] text-black">{idx * 2 + 2}</span>
                  </button>
                </div>
              ))}
              <button 
                onClick={() => setPreviewPage(spreads.length * 2 + 1)}
                className={`w-12 h-16 border-2 flex-shrink-0 flex items-center justify-center text-[8px] ${previewPage === spreads.length * 2 + 1 ? 'border-white' : 'border-zinc-700'}`}
              >
                <span className="text-zinc-400">BACK</span>
              </button>
              {comicMeta.bonusCards.map((_, idx) => (
                <button 
                  key={idx}
                  onClick={() => setPreviewPage(spreads.length * 2 + 2 + idx)}
                  className={`w-10 h-14 border flex-shrink-0 bg-zinc-800 flex items-center justify-center ${previewPage === spreads.length * 2 + 2 + idx ? 'border-2 border-yellow-500' : 'border-zinc-700'}`}
                >
                  <span className="text-[8px] text-yellow-500">CARD</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
