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
  MoveUp,
  MoveDown,
  Sparkles,
  X,
  Upload,
  PenTool,
  ChevronDown,
  Eye,
  Grid,
  Crop,
  Move,
  ZoomIn,
  Settings
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
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
  { id: "diagonal_split", name: "Diagonal Split", category: "Action", desc: "Angled panels for tension", panels: [{x:0,y:0,width:50,height:100},{x:50,y:0,width:50,height:100}] },
  { id: "triple_impact", name: "Triple Impact", category: "Action", desc: "Sequential action panels", panels: [{x:0,y:0,width:33,height:100},{x:33,y:0,width:34,height:100},{x:67,y:0,width:33,height:100}] },
  { id: "explosion_layout", name: "Explosion Layout", category: "Action", desc: "Impact explosion with wide panel", panels: [{x:0,y:0,width:100,height:40},{x:0,y:40,width:50,height:60},{x:50,y:40,width:50,height:60}] },
  { id: "speed_lines", name: "Speed Lines", category: "Action", desc: "Horizontal for fast movement", panels: [{x:0,y:0,width:100,height:30},{x:0,y:30,width:100,height:40},{x:0,y:70,width:100,height:30}] },
  { id: "slash_cut", name: "Slash Cut", category: "Action", desc: "Diagonal slash through panels", panels: [{x:0,y:0,width:60,height:100},{x:60,y:0,width:40,height:100}] },
  { id: "impact_frame", name: "Impact Frame", category: "Action", desc: "Asymmetric with corner attack", panels: [{x:0,y:0,width:70,height:60},{x:70,y:0,width:30,height:100},{x:0,y:60,width:70,height:40}] },
  { id: "vertical_slice", name: "Vertical Slice", category: "Action", desc: "Tall vertical cut panels", panels: [{x:0,y:0,width:30,height:100},{x:30,y:0,width:40,height:100},{x:70,y:0,width:30,height:100}] },
  { id: "extreme_diagonal", name: "Extreme Diagonal", category: "Action", desc: "45° angle for maximum impact", panels: [{x:0,y:0,width:45,height:100},{x:45,y:0,width:55,height:100}] },
  { id: "triple_slash", name: "Triple Slash", category: "Action", desc: "Three angled panels clashing", panels: [{x:0,y:0,width:33,height:100},{x:33,y:0,width:34,height:100},{x:67,y:0,width:33,height:100}] },
  { id: "speed_lines_angled", name: "Speed Lines Angled", category: "Action", desc: "Angled panels for dynamic motion", panels: [{x:0,y:0,width:50,height:50},{x:50,y:0,width:50,height:50},{x:0,y:50,width:100,height:50}] },
  { id: "lightning_bolt", name: "Lightning Bolt", category: "Action", desc: "Jagged for electric shockwaves", panels: [{x:0,y:0,width:40,height:60},{x:40,y:0,width:60,height:40},{x:40,y:40,width:60,height:60},{x:0,y:60,width:40,height:40}] },
  { id: "collapse", name: "Collapse", category: "Action", desc: "Panels falling inward", panels: [{x:10,y:0,width:80,height:30},{x:0,y:30,width:100,height:40},{x:10,y:70,width:80,height:30}] },
  { id: "explosion_radial", name: "Explosion Radial", category: "Action", desc: "Panels radiating from center", panels: [{x:25,y:25,width:50,height:50},{x:0,y:0,width:25,height:25},{x:75,y:0,width:25,height:25},{x:0,y:75,width:25,height:25},{x:75,y:75,width:25,height:25}] },
  { id: "shockwave", name: "Shockwave", category: "Action", desc: "Concentric angled rectangles", panels: [{x:20,y:20,width:60,height:60},{x:0,y:0,width:100,height:20},{x:0,y:80,width:100,height:20}] },
  { id: "sword_slash", name: "Sword Slash", category: "Action", desc: "Diagonal cut like a sword thrust", panels: [{x:0,y:0,width:65,height:100},{x:65,y:0,width:35,height:100}] },
  { id: "momentum", name: "Momentum", category: "Action", desc: "Progressive angle increase", panels: [{x:0,y:0,width:25,height:100},{x:25,y:0,width:25,height:100},{x:50,y:0,width:25,height:100},{x:75,y:0,width:25,height:100}] },
  { id: "dialogue_focus", name: "Dialogue Focus", category: "Dialogue", desc: "Conversation between two", panels: [{x:0,y:0,width:100,height:35},{x:0,y:35,width:50,height:30},{x:50,y:35,width:50,height:30},{x:0,y:65,width:100,height:35}] },
  { id: "conversation_flow", name: "Conversation Flow", category: "Dialogue", desc: "Natural dialogue rhythm", panels: [{x:0,y:0,width:50,height:50},{x:50,y:0,width:50,height:50},{x:0,y:50,width:100,height:50}] },
  { id: "reaction_shot", name: "Reaction Shot", category: "Dialogue", desc: "Statement and reaction", panels: [{x:0,y:0,width:60,height:100},{x:60,y:0,width:40,height:50},{x:60,y:50,width:40,height:50}] },
  { id: "interview", name: "Interview", category: "Dialogue", desc: "Question and answer format", panels: [{x:0,y:0,width:100,height:25},{x:0,y:25,width:100,height:50},{x:0,y:75,width:100,height:25}] },
  { id: "group_chat", name: "Group Chat", category: "Dialogue", desc: "Multiple speakers", panels: [{x:0,y:0,width:33,height:50},{x:33,y:0,width:34,height:50},{x:67,y:0,width:33,height:50},{x:0,y:50,width:100,height:50}] },
  { id: "splash", name: "Full Splash", category: "Splash", desc: "Single full page panel", panels: [{x:0,y:0,width:100,height:100}] },
  { id: "splash_inset", name: "Splash with Inset", category: "Splash", desc: "Main splash with detail panel", panels: [{x:0,y:0,width:100,height:100},{x:5,y:5,width:25,height:30}] },
  { id: "splash_bottom", name: "Splash Bottom Strip", category: "Splash", desc: "Splash with bottom panels", panels: [{x:0,y:0,width:100,height:75},{x:0,y:75,width:50,height:25},{x:50,y:75,width:50,height:25}] },
  { id: "hero_shot", name: "Hero Shot", category: "Splash", desc: "Dramatic character reveal", panels: [{x:0,y:0,width:100,height:100}] },
  { id: "double_splash", name: "Double Splash", category: "Splash", desc: "Two-page spread", panels: [{x:0,y:0,width:100,height:100}] },
  { id: "grid_2x2", name: "2x2 Grid", category: "Grid", desc: "Classic four panel grid", panels: [{x:0,y:0,width:50,height:50},{x:50,y:0,width:50,height:50},{x:0,y:50,width:50,height:50},{x:50,y:50,width:50,height:50}] },
  { id: "grid_3x3", name: "3x3 Grid", category: "Grid", desc: "Nine panel grid", panels: [{x:0,y:0,width:33,height:33},{x:33,y:0,width:34,height:33},{x:67,y:0,width:33,height:33},{x:0,y:33,width:33,height:34},{x:33,y:33,width:34,height:34},{x:67,y:33,width:33,height:34},{x:0,y:67,width:33,height:33},{x:33,y:67,width:34,height:33},{x:67,y:67,width:33,height:33}] },
  { id: "grid_2x3", name: "2x3 Grid", category: "Grid", desc: "Six panel grid", panels: [{x:0,y:0,width:50,height:33},{x:50,y:0,width:50,height:33},{x:0,y:33,width:50,height:34},{x:50,y:33,width:50,height:34},{x:0,y:67,width:50,height:33},{x:50,y:67,width:50,height:33}] },
  { id: "grid_4x4", name: "4x4 Grid", category: "Grid", desc: "Sixteen panel grid", panels: [{x:0,y:0,width:25,height:25},{x:25,y:0,width:25,height:25},{x:50,y:0,width:25,height:25},{x:75,y:0,width:25,height:25},{x:0,y:25,width:25,height:25},{x:25,y:25,width:25,height:25},{x:50,y:25,width:25,height:25},{x:75,y:25,width:25,height:25},{x:0,y:50,width:25,height:25},{x:25,y:50,width:25,height:25},{x:50,y:50,width:25,height:25},{x:75,y:50,width:25,height:25},{x:0,y:75,width:25,height:25},{x:25,y:75,width:25,height:25},{x:50,y:75,width:25,height:25},{x:75,y:75,width:25,height:25}] },
  { id: "manga_read", name: "Manga Flow", category: "Manga", desc: "Right-to-left reading order", panels: [{x:50,y:0,width:50,height:50},{x:0,y:0,width:50,height:50},{x:50,y:50,width:50,height:50},{x:0,y:50,width:50,height:50}] },
  { id: "manga_action", name: "Manga Action", category: "Manga", desc: "Dynamic manga action layout", panels: [{x:0,y:0,width:60,height:40},{x:60,y:0,width:40,height:60},{x:0,y:40,width:60,height:60},{x:60,y:60,width:40,height:40}] },
  { id: "manga_emotion", name: "Manga Emotion", category: "Manga", desc: "Focus on character emotion", panels: [{x:0,y:0,width:100,height:40},{x:0,y:40,width:40,height:60},{x:40,y:40,width:60,height:60}] },
  { id: "shoujo_style", name: "Shoujo Style", category: "Manga", desc: "Soft romantic manga layout", panels: [{x:0,y:0,width:100,height:35},{x:0,y:35,width:50,height:65},{x:50,y:35,width:50,height:65}] },
  { id: "seinen_dark", name: "Seinen Dark", category: "Manga", desc: "Mature dark manga layout", panels: [{x:0,y:0,width:70,height:100},{x:70,y:0,width:30,height:50},{x:70,y:50,width:30,height:50}] },
  { id: "webtoon_scroll", name: "Webtoon Scroll", category: "Webcomic", desc: "Vertical scroll format", panels: [{x:0,y:0,width:100,height:25},{x:0,y:25,width:100,height:25},{x:0,y:50,width:100,height:25},{x:0,y:75,width:100,height:25}] },
  { id: "webtoon_wide", name: "Webtoon Wide", category: "Webcomic", desc: "Wide panels for mobile", panels: [{x:0,y:0,width:100,height:33},{x:0,y:33,width:100,height:34},{x:0,y:67,width:100,height:33}] },
  { id: "webcomic_strip", name: "Webcomic Strip", category: "Webcomic", desc: "Classic 3-panel strip", panels: [{x:0,y:0,width:33,height:100},{x:33,y:0,width:34,height:100},{x:67,y:0,width:33,height:100}] },
  { id: "social_square", name: "Social Square", category: "Webcomic", desc: "Square format for social", panels: [{x:0,y:0,width:50,height:50},{x:50,y:0,width:50,height:50},{x:0,y:50,width:50,height:50},{x:50,y:50,width:50,height:50}] },
  { id: "cinematic", name: "Cinematic Wide", category: "Cinematic", desc: "Widescreen movie feel", panels: [{x:0,y:0,width:100,height:25},{x:0,y:25,width:100,height:50},{x:0,y:75,width:100,height:25}] },
  { id: "cinematic_bars", name: "Cinematic Bars", category: "Cinematic", desc: "Letterbox format", panels: [{x:0,y:15,width:100,height:70}] },
  { id: "establishing_shot", name: "Establishing Shot", category: "Cinematic", desc: "Wide then close-ups", panels: [{x:0,y:0,width:100,height:60},{x:0,y:60,width:33,height:40},{x:33,y:60,width:34,height:40},{x:67,y:60,width:33,height:40}] },
  { id: "montage", name: "Montage", category: "Cinematic", desc: "Multiple scene cuts", panels: [{x:0,y:0,width:50,height:50},{x:50,y:0,width:50,height:50},{x:0,y:50,width:33,height:50},{x:33,y:50,width:34,height:50},{x:67,y:50,width:33,height:50}] },
  { id: "film_strip", name: "Film Strip", category: "Cinematic", desc: "Sequential frames", panels: [{x:0,y:20,width:20,height:60},{x:20,y:20,width:20,height:60},{x:40,y:20,width:20,height:60},{x:60,y:20,width:20,height:60},{x:80,y:20,width:20,height:60}] },
  { id: "kirby", name: "Kirby", category: "Experimental", desc: "Jack Kirby style dynamic", panels: [{x:0,y:0,width:40,height:100},{x:40,y:0,width:60,height:50},{x:40,y:50,width:30,height:50},{x:70,y:50,width:30,height:50}] },
  { id: "z_path", name: "Z-Path", category: "Experimental", desc: "Z reading pattern", panels: [{x:0,y:0,width:50,height:50},{x:50,y:0,width:50,height:50},{x:25,y:50,width:50,height:50}] },
  { id: "social_media", name: "Social Media", category: "Experimental", desc: "Optimized for social", panels: [{x:0,y:0,width:100,height:100}] },
  { id: "broken_grid", name: "Broken Grid", category: "Experimental", desc: "Overlapping panels", panels: [{x:0,y:0,width:60,height:60},{x:40,y:40,width:60,height:60}] },
  { id: "spiral", name: "Spiral", category: "Experimental", desc: "Spiral reading path", panels: [{x:0,y:0,width:50,height:50},{x:50,y:0,width:50,height:50},{x:50,y:50,width:50,height:50},{x:0,y:50,width:50,height:50},{x:25,y:25,width:50,height:50}] },
  { id: "nested", name: "Nested Panels", category: "Experimental", desc: "Panel within panel", panels: [{x:0,y:0,width:100,height:100},{x:10,y:10,width:40,height:40}] },
  { id: "fragmented", name: "Fragmented", category: "Experimental", desc: "Shattered glass effect", panels: [{x:0,y:0,width:30,height:40},{x:30,y:0,width:40,height:30},{x:70,y:0,width:30,height:50},{x:0,y:40,width:40,height:60},{x:40,y:30,width:30,height:40},{x:40,y:70,width:60,height:30},{x:70,y:50,width:30,height:20}] },
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
  const [location, navigate] = useLocation();
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
  const [isCreating, setIsCreating] = useState(false);
  const [panelEditMode, setPanelEditMode] = useState(false);
  
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
    if (!projectId && !isCreating) {
      setIsCreating(true);
      createProject.mutateAsync({
        title: "Untitled Comic",
        type: "comic",
        status: "draft",
        data: { spreads: [{ id: "spread_1", leftPage: [], rightPage: [] }] },
      }).then((newProject) => {
        navigate(`/creator/comic?id=${newProject.id}`, { replace: true });
        setIsCreating(false);
      }).catch(() => {
        toast.error("Failed to create project");
        setIsCreating(false);
      });
    }
  }, [projectId, isCreating]);

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
    if (!projectId) return;
    setIsSaving(true);
    try {
      await updateProject.mutateAsync({
        id: projectId,
        data: { title, data: { spreads } },
      });
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
      setPanelEditMode(true);
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
      className={`absolute border-2 border-black cursor-pointer transition-all group ${
        selectedPanelId === panel.id ? "ring-2 ring-black ring-offset-2" : ""
      } ${panel.type === "circle" ? "rounded-full" : ""}`}
      style={{
        left: `${panel.x}%`,
        top: `${panel.y}%`,
        width: `${panel.width}%`,
        height: `${panel.height}%`,
        zIndex: panel.zIndex,
        backgroundColor: panel.content?.url ? "transparent" : "rgba(255,255,255,0.95)",
      }}
      data-testid={`panel-${panel.id}`}
    >
      {panel.content?.url ? (
        <img src={panel.content.url} className="w-full h-full object-cover" alt="" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 opacity-50 group-hover:opacity-100 transition-opacity">
          <div className="text-center">
            <Plus className="w-6 h-6 mx-auto mb-1" />
            <p className="text-[10px] font-mono">Double-click or Right-click</p>
            <p className="text-[10px] font-mono">to add media or draw</p>
          </div>
        </div>
      )}
      <div className="absolute -top-1 -left-1 w-3 h-3 bg-black rounded-full opacity-0 group-hover:opacity-100" />
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-black rounded-full opacity-0 group-hover:opacity-100" />
      <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-black rounded-full opacity-0 group-hover:opacity-100" />
      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-black rounded-full opacity-0 group-hover:opacity-100" />
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
        className={`absolute border-2 border-dashed border-black bg-black/5 pointer-events-none ${panelShape === "circle" ? "rounded-full" : ""}`}
        style={{ left: `${x}%`, top: `${y}%`, width: `${width}%`, height: `${height}%` }}
      />
    );
  };

  if (isCreating) {
    return (
      <Layout>
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Creating new comic project...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-screen flex flex-col" onClick={closeContextMenu}>
        <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-background">
          <div className="flex items-center gap-2">
            {isFullscreen && (
              <div className="flex items-center gap-2 mr-4">
                <span className="text-sm font-mono">Spread {currentSpreadIndex + 1} of {spreads.length}</span>
                <button 
                  onClick={() => currentSpreadIndex > 0 && setCurrentSpreadIndex(currentSpreadIndex - 1)}
                  className="px-2 py-1 text-sm hover:bg-muted flex items-center gap-1"
                  disabled={currentSpreadIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button 
                  onClick={() => currentSpreadIndex < spreads.length - 1 && setCurrentSpreadIndex(currentSpreadIndex + 1)}
                  className="px-2 py-1 text-sm hover:bg-muted flex items-center gap-1"
                  disabled={currentSpreadIndex === spreads.length - 1}
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            
            <button className="p-2 hover:bg-muted" data-testid="button-undo"><Undo className="w-4 h-4" /></button>
            <button className="p-2 hover:bg-muted" data-testid="button-redo"><Redo className="w-4 h-4" /></button>
            
            <div className="w-px h-6 bg-border mx-2" />
            
            <div className="relative">
              <button 
                onClick={() => setShowCreateMenu(!showCreateMenu)}
                className="px-3 py-1.5 bg-black text-white text-sm font-medium flex items-center gap-2 hover:bg-gray-800"
                data-testid="button-create"
              >
                <Square className="w-4 h-4" /> Create <ChevronDown className="w-3 h-3" />
              </button>
              {showCreateMenu && (
                <div className="absolute top-full left-0 mt-1 bg-background border border-border shadow-lg z-50 min-w-[180px]">
                  <div className="p-2 text-xs font-bold uppercase text-muted-foreground border-b border-border">Panels</div>
                  <button 
                    onClick={() => { setPanelShape("rectangle"); setActiveTool("Panel"); setShowCreateMenu(false); setPanelEditMode(true); }}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                  >
                    <Square className="w-4 h-4" /> Rectangle (R)
                  </button>
                  <button 
                    onClick={() => { setPanelShape("circle"); setActiveTool("Panel"); setShowCreateMenu(false); setPanelEditMode(true); }}
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

            <div className="w-px h-6 bg-border mx-2" />

            <div className="flex items-center gap-1">
              {tools.slice(0, 3).map((tool) => (
                <button
                  key={tool.label}
                  onClick={() => { setActiveTool(tool.label); if (tool.label !== "Panel") setPanelEditMode(false); }}
                  className={`p-2 ${activeTool === tool.label ? "bg-black text-white" : "hover:bg-muted"}`}
                  title={`${tool.label} (${tool.shortcut})`}
                >
                  <tool.icon className="w-4 h-4" />
                </button>
              ))}
            </div>

            <div className="w-px h-6 bg-border mx-2" />

            <button className="px-3 py-1.5 border border-border text-sm hover:bg-muted flex items-center gap-2">
              Media <ChevronDown className="w-3 h-3" />
            </button>

            <button className="px-3 py-1.5 border border-border text-sm hover:bg-muted flex items-center gap-2">
              Text & FX <ChevronDown className="w-3 h-3" />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 mr-4">
              <button className="p-2 hover:bg-muted"><Grid className="w-4 h-4" /></button>
              <button className="p-2 hover:bg-muted"><Crop className="w-4 h-4" /></button>
              <button className="p-2 hover:bg-muted"><Move className="w-4 h-4" /></button>
              <button className="p-2 hover:bg-muted"><Eye className="w-4 h-4" /></button>
              <button className="p-2 hover:bg-muted"><ZoomIn className="w-4 h-4" /></button>
              <button className="p-2 hover:bg-muted"><Download className="w-4 h-4" /></button>
            </div>
            
            {isFullscreen && (
              <button 
                onClick={() => setIsFullscreen(false)}
                className="px-3 py-1.5 border border-border text-sm hover:bg-muted"
              >
                Exit Full-Screen
              </button>
            )}
            
            <button className="px-3 py-1.5 border border-border text-sm hover:bg-muted flex items-center gap-2">
              Save <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden bg-zinc-800">
          {!isFullscreen && (
            <Link href="/">
              <button className="absolute top-20 left-72 z-10 p-2 bg-background border border-border hover:bg-muted" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
          )}
          
          <main className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-auto">
            {!isFullscreen && (
              <div className="text-white text-sm mb-4 font-mono flex items-center gap-4">
                <span>Spread {currentSpreadIndex + 1} of {spreads.length}</span>
                <button 
                  onClick={() => currentSpreadIndex > 0 && setCurrentSpreadIndex(currentSpreadIndex - 1)}
                  className="px-2 py-1 hover:bg-white/10 flex items-center gap-1"
                  disabled={currentSpreadIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button 
                  onClick={() => currentSpreadIndex < spreads.length - 1 && setCurrentSpreadIndex(currentSpreadIndex + 1)}
                  className="px-2 py-1 hover:bg-white/10 flex items-center gap-1"
                  disabled={currentSpreadIndex === spreads.length - 1}
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className={`flex ${isFullscreen ? "gap-0" : "gap-4"}`}>
              <div 
                ref={leftPageRef}
                className={`bg-white border border-black relative select-none ${isFullscreen ? "w-[500px] h-[700px]" : "w-[350px] h-[500px]"}`}
                onMouseDown={(e) => handleMouseDown(e, "left", leftPageRef)}
                onMouseMove={(e) => handleMouseMove(e, leftPageRef)}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {currentSpread.leftPage.map(panel => renderPanel(panel, "left"))}
                {isDrawingPanel && selectedPage === "left" && renderDrawingPreview()}
                {currentSpread.leftPage.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
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
                className={`bg-white border border-black relative select-none ${isFullscreen ? "w-[500px] h-[700px]" : "w-[350px] h-[500px]"}`}
                onMouseDown={(e) => handleMouseDown(e, "right", rightPageRef)}
                onMouseMove={(e) => handleMouseMove(e, rightPageRef)}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {currentSpread.rightPage.map(panel => renderPanel(panel, "right"))}
                {isDrawingPanel && selectedPage === "right" && renderDrawingPreview()}
                {currentSpread.rightPage.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
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
              className="mt-6 px-4 py-2 bg-zinc-700 text-white text-sm flex items-center gap-2 hover:bg-zinc-600 border border-zinc-500"
              data-testid="button-add-spread"
            >
              <Plus className="w-4 h-4" /> Add New Spread
            </button>

            <div className="absolute bottom-4 right-4 flex items-center gap-2">
              <button 
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 bg-zinc-700 text-white hover:bg-zinc-600"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-700 text-white text-xs font-mono">
                <div className={`w-2 h-2 rounded-full ${panelEditMode ? "bg-white" : "bg-gray-500"}`} />
                Panel Edit Mode {panelEditMode ? "ON" : "OFF"}
              </div>
            </div>
          </main>
        </div>

        {showPanelModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background border border-border p-6 w-96 shadow-lg">
              <div className="flex justify-between items-start mb-2">
                <h2 className="font-display font-bold text-lg">Panel Created! What would you like to add?</h2>
                <button onClick={() => { setShowPanelModal(false); setNewPanelData(null); }} className="p-1 hover:bg-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-6">Choose how to fill your new panel</p>
              
              <div className="space-y-3">
                <button 
                  onClick={() => confirmPanel("media")}
                  className="w-full p-4 border border-border hover:border-black text-left flex items-center gap-4"
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
                  className="w-full p-4 border border-border hover:border-black text-left flex items-center gap-4"
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
            <div className="bg-zinc-900 border border-zinc-700 w-[700px] max-h-[80vh] overflow-hidden shadow-lg">
              <div className="p-4 border-b border-zinc-700 flex justify-between items-center">
                <div>
                  <h2 className="font-mono font-bold text-xl text-white tracking-wider">Panel Templates</h2>
                  <p className="text-sm text-zinc-400">Choose from {panelTemplates.length} professional comic layouts</p>
                </div>
                <button onClick={() => setShowTemplates(false)} className="p-2 hover:bg-zinc-800 text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex gap-1 p-3 border-b border-zinc-700 overflow-x-auto">
                {templateCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 text-sm whitespace-nowrap ${
                      selectedCategory === cat ? "bg-white text-black" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              
              <div className="p-4 grid grid-cols-5 gap-3 max-h-[500px] overflow-auto">
                {panelTemplates.filter(t => t.category === selectedCategory).map(template => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template, selectedPage)}
                    className="aspect-[3/4] border border-zinc-600 hover:border-white bg-zinc-800 relative group flex flex-col"
                  >
                    <div className="flex-1 relative p-2">
                      {template.panels.map((p, i) => (
                        <div 
                          key={i}
                          className="absolute bg-zinc-600 border border-zinc-500"
                          style={{
                            left: `${p.x * 0.9 + 5}%`, top: `${p.y * 0.9 + 5}%`,
                            width: `${p.width * 0.9}%`, height: `${p.height * 0.9}%`
                          }}
                        />
                      ))}
                    </div>
                    <div className="p-2 text-center border-t border-zinc-700">
                      <div className="text-[10px] text-white font-bold truncate">{template.name}</div>
                      <div className="text-[8px] text-zinc-500 truncate">{template.desc}</div>
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
              <div className="w-4 h-4 border border-current" /> Add Image
            </button>
            <button className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-3">
              <div className="w-4 h-4 border border-current" /> Add Video
            </button>
            <button className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-3">
              <div className="w-4 h-4 border border-current" /> Add Text
            </button>
            <button className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-3">
              <div className="w-4 h-4 border border-current" /> Add Effect
            </button>
            <button className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-3">
              <div className="w-4 h-4 border border-current" /> Add Caption Block
            </button>
            <button className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-3">
              <div className="w-4 h-4 border border-current" /> Add SVG Bubble/Graphic
            </button>
            <div className="border-t border-border my-1" />
            <button 
              onClick={() => handleAIGenerate(contextMenu.panelId, contextMenu.page)}
              className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-3"
            >
              <Sparkles className="w-4 h-4" /> AI Generate Image
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
              <div className="w-4 h-4 border border-current" /> Use as VN Background
            </button>
            <button className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-3">
              <div className="w-4 h-4 border border-current" /> Use in CYOA
            </button>
            <div className="border-t border-border my-1" />
            <button className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-3">
              <Film className="w-4 h-4" /> Animation Sequences
            </button>
            <button className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-3">
              <div className="w-4 h-4 border border-current" /> Save Animation to Library
            </button>
            <button className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-3">
              <div className="w-4 h-4 border border-current" /> Apply Saved Animation
            </button>
            <button className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-3">
              <PenTool className="w-4 h-4" /> Apply Saved Drawing
            </button>
            <div className="border-t border-border my-1" />
            <button onClick={deletePanel} className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-3 text-red-500">
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
