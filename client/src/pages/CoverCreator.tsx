import { Layout } from "@/components/layout/Layout";
import html2canvas from "html2canvas";
import { 
  Save, Download, ArrowLeft, Type, ImageIcon, Wand2, X, Upload, Eye, 
  RotateCw, Palette, Settings, Layers, Plus, Trash2, Copy, Pen
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { AIGenerator } from "@/components/tools/AIGenerator";
import { TransformableElement, TransformState } from "@/components/tools/TransformableElement";
import { TextElement } from "@/components/tools/TextElement";
import { DrawingWorkspace } from "@/components/tools/DrawingWorkspace";
import { AssetBrowser, AssetBrowserTrigger } from "@/components/tools/AssetBrowser";
import type { AssetItem } from "@/components/tools/AssetBrowser";
import { useProject, useUpdateProject, useCreateProject } from "@/hooks/useProjects";
import { toast } from "sonner";
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

const FONT_OPTIONS = [
  { value: "Inter, sans-serif", label: "Inter", category: "clean" },
  { value: "'Space Grotesk', sans-serif", label: "Space Grotesk", category: "clean" },
  { value: "'Bangers', cursive", label: "Bangers", category: "comic" },
  { value: "'Permanent Marker', cursive", label: "Permanent Marker", category: "comic" },
  { value: "'Luckiest Guy', cursive", label: "Luckiest Guy", category: "comic" },
  { value: "'Londrina Solid', cursive", label: "Londrina Solid", category: "comic" },
  { value: "'Londrina Sketch', cursive", label: "Londrina Sketch", category: "comic" },
  { value: "'Kranky', cursive", label: "Kranky", category: "comic" },
  { value: "'Gloria Hallelujah', cursive", label: "Gloria Hallelujah", category: "comic" },
  { value: "'Rock Salt', cursive", label: "Rock Salt", category: "comic" },
  { value: "'Bungee', cursive", label: "Bungee", category: "bold" },
  { value: "'Black Ops One', cursive", label: "Black Ops One", category: "bold" },
  { value: "'Russo One', sans-serif", label: "Russo One", category: "bold" },
  { value: "'Righteous', cursive", label: "Righteous", category: "bold" },
  { value: "'Bebas Neue', sans-serif", label: "Bebas Neue", category: "bold" },
  { value: "'Anton', sans-serif", label: "Anton", category: "bold" },
  { value: "'Oswald', sans-serif", label: "Oswald", category: "bold" },
  { value: "'Titan One', cursive", label: "Titan One", category: "bold" },
  { value: "'Alfa Slab One', cursive", label: "Alfa Slab One", category: "bold" },
  { value: "'Sigmar One', cursive", label: "Sigmar One", category: "bold" },
  { value: "'Ultra', serif", label: "Ultra", category: "bold" },
  { value: "'Archivo Black', sans-serif", label: "Archivo Black", category: "bold" },
  { value: "'Passion One', cursive", label: "Passion One", category: "bold" },
  { value: "'Lilita One', cursive", label: "Lilita One", category: "bold" },
  { value: "'Dela Gothic One', cursive", label: "Dela Gothic One", category: "bold" },
  { value: "'Audiowide', cursive", label: "Audiowide", category: "scifi" },
  { value: "'Orbitron', sans-serif", label: "Orbitron", category: "scifi" },
  { value: "'Press Start 2P', cursive", label: "Press Start 2P", category: "scifi" },
  { value: "'Silkscreen', cursive", label: "Silkscreen", category: "scifi" },
  { value: "'VT323', monospace", label: "VT323", category: "scifi" },
  { value: "'Share Tech Mono', monospace", label: "Share Tech Mono", category: "scifi" },
  { value: "'Rubik Mono One', sans-serif", label: "Rubik Mono One", category: "scifi" },
  { value: "'Fugaz One', cursive", label: "Fugaz One", category: "action" },
  { value: "'Racing Sans One', cursive", label: "Racing Sans One", category: "action" },
  { value: "'Faster One', cursive", label: "Faster One", category: "action" },
  { value: "'Rampart One', cursive", label: "Rampart One", category: "action" },
  { value: "'Creepster', cursive", label: "Creepster", category: "horror" },
  { value: "'Nosifer', cursive", label: "Nosifer", category: "horror" },
  { value: "'Metal Mania', cursive", label: "Metal Mania", category: "horror" },
  { value: "'Butcherman', cursive", label: "Butcherman", category: "horror" },
  { value: "'Eater', cursive", label: "Eater", category: "horror" },
  { value: "'Special Elite', cursive", label: "Special Elite", category: "vintage" },
  { value: "'Rye', cursive", label: "Rye", category: "vintage" },
  { value: "'Fascinate Inline', cursive", label: "Fascinate Inline", category: "vintage" },
  { value: "'Monoton', cursive", label: "Monoton", category: "vintage" },
  { value: "'Satisfy', cursive", label: "Satisfy", category: "script" },
  { value: "'Pacifico', cursive", label: "Pacifico", category: "script" },
  { value: "'Lobster', cursive", label: "Lobster", category: "script" },
  { value: "'Shadows Into Light', cursive", label: "Shadows Into Light", category: "script" },
  { value: "'Amatic SC', cursive", label: "Amatic SC", category: "script" },
  { value: "'Fredoka', sans-serif", label: "Fredoka", category: "fun" },
  { value: "'Bowlby One SC', cursive", label: "Bowlby One SC", category: "fun" },
  { value: "'Jua', sans-serif", label: "Jua", category: "fun" },
  { value: "'Impact', sans-serif", label: "Impact", category: "system" },
  { value: "'Arial Black', sans-serif", label: "Arial Black", category: "system" },
  { value: "Georgia, serif", label: "Georgia", category: "system" },
  { value: "'Courier New', monospace", label: "Courier New", category: "system" },
  { value: "'JetBrains Mono', monospace", label: "JetBrains Mono", category: "system" },
];

const GENRE_TEMPLATES = [
  { id: "sci-fi", name: "Sci-Fi", colors: ["#0a0a20", "#00ffcc", "#9945FF"] },
  { id: "romance", name: "Romance", colors: ["#2D0A31", "#FF4D8D", "#FFD6E8"] },
  { id: "thriller", name: "Thriller", colors: ["#0D0D0D", "#8B0000", "#FFD700"] },
  { id: "fantasy", name: "Fantasy", colors: ["#1A1A2E", "#D4AF37", "#7B68EE"] },
  { id: "horror", name: "Horror", colors: ["#000000", "#8B0000", "#1A1A1A"] },
  { id: "mystery", name: "Mystery", colors: ["#1C1C2D", "#2E8B57", "#C0C0C0"] },
];

const COVER_TEMPLATES = [
  { id: "marvel-classic", name: "Marvel Classic (1960s-80s)", bgColor: "#FFFFFF", titleFont: "'Impact', sans-serif", titleColor: "#000000", bannerBg: "#000000", priceBox: true },
  { id: "marvel-modern", name: "Marvel Modern (2000s+)", bgColor: "#1a1a1a", titleFont: "'Impact', sans-serif", titleColor: "#FF0000", bannerBg: "#1a1a1a", priceBox: false },
  { id: "dc-classic", name: "DC Classic (Bronze Age)", bgColor: "#FFFFFF", titleFont: "'Arial Black', sans-serif", titleColor: "#0000CC", bannerBg: "#FFFF00", priceBox: true },
  { id: "indie-minimal", name: "Indie Minimal", bgColor: "#FAFAFA", titleFont: "'Space Grotesk', sans-serif", titleColor: "#222222", bannerBg: "transparent", priceBox: false },
  { id: "ironman-126", name: "Iron Man #126 Style", bgColor: "#FFFFFF", titleFont: "'Impact', sans-serif", titleColor: "#8B0000", bannerBg: "#000000", priceBox: true },
  { id: "spiderman-vintage", name: "Spider-Man Vintage", bgColor: "#FFFFFF", titleFont: "'Impact', sans-serif", titleColor: "#FF0000", bannerBg: "#0000CC", priceBox: true },
  { id: "golden-age", name: "Golden Age (1940s)", bgColor: "#FFF8DC", titleFont: "Georgia, serif", titleColor: "#8B4513", bannerBg: "#FFD700", priceBox: true },
  { id: "horror-tales", name: "Horror/Dark (Tales from Crypt)", bgColor: "#1a0a0a", titleFont: "'Courier New', monospace", titleColor: "#8B0000", bannerBg: "#000000", priceBox: false },
  { id: "retro-newspaper", name: "Retro Newspaper (1930s)", bgColor: "#F5DEB3", titleFont: "Georgia, serif", titleColor: "#2F4F4F", bannerBg: "#8B4513", priceBox: true },
  { id: "manga-shonen", name: "Manga (Shonen Jump)", bgColor: "#FFFFFF", titleFont: "'Impact', sans-serif", titleColor: "#FF6600", bannerBg: "#000000", priceBox: false },
  { id: "grunge-underground", name: "Grunge Underground (1970s)", bgColor: "#3d3d3d", titleFont: "'Courier New', monospace", titleColor: "#CCFF00", bannerBg: "#000000", priceBox: false },
  { id: "team-heroes", name: "Team Heroes (Avengers)", bgColor: "#1a1a4e", titleFont: "'Impact', sans-serif", titleColor: "#FFD700", bannerBg: "#8B0000", priceBox: true },
  { id: "custom-blank", name: "Custom/Freeform (Blank Canvas)", bgColor: "#000000", titleFont: "Inter, sans-serif", titleColor: "#FFFFFF", bannerBg: "transparent", priceBox: false },
];

const FILTER_PRESETS = {
  contrast: 50,
  brightness: 50,
  saturation: 100,
  grayscale: false,
  sepia: false,
  invert: false,
  halftone: false,
  halftoneIntensity: 100,
  halftoneSize: 4,
  grain: false,
  sharpen: false,
  blur: false,
  vignette: false,
  yellowing: false,
  stains: false,
  folds: false,
  tears: false,
};

interface TextLayer {
  id: string;
  text: string;
  transform: TransformState;
  fontSize: number;
  fontFamily: string;
  color: string;
  locked: boolean;
  textArch?: number;
  textEffect?: string;
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  fontWeight?: string;
  fontStyle?: string;
  textTransform?: string;
}

interface ImageLayer {
  id: string;
  url: string;
  name: string;
  transform: TransformState;
  opacity: number;
  locked: boolean;
}

interface CoverData {
  title: string;
  subtitle: string;
  author: string;
  frontImage: string;
  backImage: string;
  spineImage: string;
  frontBgColor: string;
  backBgColor: string;
  spineBgColor: string;
  titleFont: string;
  titleColor: string;
  titleSize: number;
  subtitleFont: string;
  subtitleColor: string;
  subtitleSize: number;
  authorFont: string;
  authorColor: string;
  authorSize: number;
  backBlurb: string;
  backBlurbFont: string;
  backBlurbColor: string;
  backBlurbSize: number;
  spineText: string;
  spineFont: string;
  spineColor: string;
  frontLayers: TextLayer[];
  backLayers: TextLayer[];
  spineLayers: TextLayer[];
  frontImageLayers: ImageLayer[];
  backImageLayers: ImageLayer[];
  spineImageLayers: ImageLayer[];
  templateId: string;
  bannerText: string;
  bannerBgColor: string;
  showPriceBox: boolean;
  priceText: string;
  issueNumber: string;
  publisherName: string;
  tagline: string;
  filters: typeof FILTER_PRESETS;
  titleTransform?: TransformState;
  subtitleTransform?: TransformState;
  authorTransform?: TransformState;
  backBlurbTransform?: TransformState;
}

const defaultCover: CoverData = {
  title: "UNTITLED",
  subtitle: "A Novel",
  author: "Author Name",
  frontImage: "",
  backImage: "",
  spineImage: "",
  frontBgColor: "#000000",
  backBgColor: "#000000",
  spineBgColor: "#000000",
  titleFont: "'Impact', sans-serif",
  titleColor: "#FFFFFF",
  titleSize: 48,
  subtitleFont: "Georgia, serif",
  subtitleColor: "#888888",
  subtitleSize: 18,
  authorFont: "'Space Grotesk', sans-serif",
  authorColor: "#FFFFFF",
  authorSize: 20,
  backBlurb: "Enter your book description here. This is the back cover text that will entice readers to pick up your book.",
  backBlurbFont: "Georgia, serif",
  backBlurbColor: "#CCCCCC",
  backBlurbSize: 14,
  spineText: "UNTITLED",
  spineFont: "'Impact', sans-serif",
  spineColor: "#FFFFFF",
  frontLayers: [],
  backLayers: [],
  spineLayers: [],
  frontImageLayers: [],
  backImageLayers: [],
  spineImageLayers: [],
  templateId: "marvel-classic",
  bannerText: "COMICS GROUP",
  bannerBgColor: "#000000",
  showPriceBox: true,
  priceText: "40¢",
  issueNumber: "#1",
  publisherName: "PUBLISHER",
  tagline: "COLLECT THEM ALL!",
  filters: { ...FILTER_PRESETS },
};

export default function CoverCreator() {
  const [location, navigate] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const projectId = searchParams.get('id');
  const comicId = searchParams.get('comicId');
  
  const { data: project } = useProject(projectId || '');
  const updateProject = useUpdateProject();
  const createProject = useCreateProject();

  const [coverData, setCoverData] = useState<CoverData>(defaultCover);
  const [activeView, setActiveView] = useState<"front" | "back" | "spine" | "spread">("front");
  const [activeSection, setActiveSection] = useState<"content" | "style" | "images">("content");
  const [showAIGen, setShowAIGen] = useState(false);
  const [showDrawing, setShowDrawing] = useState(false);
  const [drawingTarget, setDrawingTarget] = useState<"front" | "back" | "spine">("front");
  const [aiTarget, setAiTarget] = useState<"front" | "back" | "spine">("front");
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(!projectId);
  const creationAttempted = useRef(false);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [showAssetBrowser, setShowAssetBrowser] = useState(false);

  const coverContentRef = useRef<HTMLDivElement>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const spineInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (projectId) {
      setIsCreating(false);
      return;
    }
    if (creationAttempted.current) return;

    creationAttempted.current = true;
    setIsCreating(true);

    const timeoutId = setTimeout(() => {
      setIsCreating(false);
      creationAttempted.current = false;
      toast.error("Project creation timed out - please try again");
    }, 15000);

    createProject.mutateAsync({
      title: "Untitled Cover",
      type: "cover",
      status: "draft",
      data: defaultCover,
    }).then((newProject) => {
      clearTimeout(timeoutId);
      setIsCreating(false);
      navigate(`/creator/cover?id=${newProject.id}`, { replace: true });
    }).catch((err) => {
      clearTimeout(timeoutId);
      toast.error(err?.message || "Failed to create project - please try again");
      setIsCreating(false);
      creationAttempted.current = false;
    });
  }, [projectId]);

  useEffect(() => {
    if (project) {
      const data = project.data as CoverData;
      if (data) setCoverData(prev => ({ ...prev, ...data }));
    }
  }, [project]);

  const updateCover = (updates: Partial<CoverData>) => {
    setCoverData(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (projectId) {
        await updateProject.mutateAsync({
          id: projectId,
          data: { title: coverData.title, data: coverData },
        });
        toast.success("Cover saved");
      } else {
        const newProject = await createProject.mutateAsync({
          title: coverData.title || "Untitled Cover",
          type: "cover",
          status: "draft",
          data: coverData,
        });
        navigate(`/creator/cover?id=${newProject.id}`, { replace: true });
        toast.success("Cover created and saved");
      }
    } catch (error: any) {
      toast.error(error.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndReturnToComic = async () => {
    setIsSaving(true);
    try {
      let savedProjectId = projectId;
      if (projectId) {
        await updateProject.mutateAsync({
          id: projectId,
          data: { title: coverData.title, data: coverData },
        });
      } else {
        const newProject = await createProject.mutateAsync({
          title: coverData.title || "Untitled Cover",
          type: "cover",
          status: "draft",
          data: coverData,
        });
        savedProjectId = newProject.id;
      }

      let coverImageUrl = "";
      if (coverContentRef.current) {
        try {
          const html2canvasMod = await import("html2canvas");
          const canvas = await html2canvasMod.default(coverContentRef.current, {
            scale: 1,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            logging: false,
          });
          coverImageUrl = canvas.toDataURL("image/png");
        } catch {}
      }

      if (comicId) {
        await fetch(`/api/projects/${comicId}/autosave`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            data: {
              comicMeta: {
                frontCover: coverImageUrl || savedProjectId,
                coverProjectId: savedProjectId,
              }
            },
            thumbnail: coverImageUrl || undefined,
          }),
        });
        toast.success("Cover linked to comic!");
        navigate(`/creator/comic?id=${comicId}`);
      } else {
        toast.success("Cover saved");
      }
    } catch (error: any) {
      toast.error(error.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    if (!coverContentRef.current) return;
    
    try {
      toast.info("Exporting print-ready cover (300 DPI)...");
      
      const el = coverContentRef.current;
      const elWidth = el.offsetWidth;
      const elHeight = el.offsetHeight;
      const targetDPI = 300;
      const inchW = activeView === "spread" ? 13.95 : activeView === "spine" ? 0.7 : 6.625;
      const targetWidth = Math.round(inchW * targetDPI);
      const printScale = targetWidth / elWidth;
      
      const canvas = await html2canvas(el, {
        scale: printScale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      });
      
      const link = document.createElement("a");
      link.download = `${coverData.title.replace(/\s+/g, "_")}_cover_${activeView}_print.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      toast.success(`Cover exported at ${canvas.width}x${canvas.height}px (print-ready ${targetDPI} DPI)`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export cover");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: "front" | "back" | "spine") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      updateCover({ 
        [target === "front" ? "frontImage" : target === "back" ? "backImage" : "spineImage"]: url 
      });
      toast.success(`${target} image updated`);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleAIGenerated = (url: string) => {
    updateCover({ 
      [aiTarget === "front" ? "frontImage" : aiTarget === "back" ? "backImage" : "spineImage"]: url 
    });
    setShowAIGen(false);
    toast.success("AI image applied");
  };

  const addTextLayer = (view: "front" | "back" | "spine") => {
    const newLayer: TextLayer = {
      id: `layer_${Date.now()}`,
      text: "New Text",
      transform: { x: 50, y: 50, width: 200, height: 60, rotation: 0, scaleX: 1, scaleY: 1 },
      fontSize: 24,
      fontFamily: "Inter, sans-serif",
      color: "#FFFFFF",
      locked: false,
    };
    const layerKey = `${view}Layers` as keyof CoverData;
    updateCover({ [layerKey]: [...(coverData[layerKey] as TextLayer[]), newLayer] });
    toast.success("Text layer added");
  };

  const updateTextLayer = (view: "front" | "back" | "spine", layerId: string, updates: Partial<TextLayer>) => {
    const layerKey = `${view}Layers` as keyof CoverData;
    const layers = coverData[layerKey] as TextLayer[];
    updateCover({ [layerKey]: layers.map(l => l.id === layerId ? { ...l, ...updates } : l) });
  };

  const deleteTextLayer = (view: "front" | "back" | "spine", layerId: string) => {
    const layerKey = `${view}Layers` as keyof CoverData;
    const layers = coverData[layerKey] as TextLayer[];
    updateCover({ [layerKey]: layers.filter(l => l.id !== layerId) });
  };

  const addImageLayer = (view: "front" | "back" | "spine", asset: AssetItem) => {
    const newLayer: ImageLayer = {
      id: `img_${Date.now()}`,
      url: asset.url,
      name: asset.name,
      transform: { x: 50, y: 50, width: 150, height: 150, rotation: 0, scaleX: 1, scaleY: 1 },
      opacity: 1,
      locked: false,
    };
    const layerKey = `${view}ImageLayers` as keyof CoverData;
    const existing = (coverData[layerKey] as ImageLayer[]) || [];
    updateCover({ [layerKey]: [...existing, newLayer] });
    setSelectedLayerId(newLayer.id);
    toast.success(`"${asset.name}" added to ${view} cover`);
  };

  const updateImageLayer = (view: "front" | "back" | "spine", layerId: string, updates: Partial<ImageLayer>) => {
    const layerKey = `${view}ImageLayers` as keyof CoverData;
    const layers = (coverData[layerKey] as ImageLayer[]) || [];
    updateCover({ [layerKey]: layers.map(l => l.id === layerId ? { ...l, ...updates } : l) });
  };

  const deleteImageLayer = (view: "front" | "back" | "spine", layerId: string) => {
    const layerKey = `${view}ImageLayers` as keyof CoverData;
    const layers = (coverData[layerKey] as ImageLayer[]) || [];
    updateCover({ [layerKey]: layers.filter(l => l.id !== layerId) });
  };

  const handleAssetSelected = (asset: AssetItem) => {
    const view = activeView === "spread" ? "front" : activeView;
    addImageLayer(view, asset);
    setShowAssetBrowser(false);
  };

  const applyTemplate = (templateId: string) => {
    const template = COVER_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;
    updateCover({
      templateId,
      frontBgColor: template.bgColor,
      titleFont: template.titleFont,
      titleColor: template.titleColor,
      bannerBgColor: template.bannerBg,
      showPriceBox: template.priceBox,
    });
    toast.success(`Applied ${template.name} template`);
  };

  const updateFilter = (key: keyof typeof FILTER_PRESETS, value: any) => {
    updateCover({ filters: { ...coverData.filters, [key]: value } });
  };

  const getFilterStyle = (): React.CSSProperties => {
    const f = coverData.filters;
    return {
      filter: `contrast(${100 + (f.contrast - 50)}%) brightness(${100 + (f.brightness - 50)}%) saturate(${f.saturation}%)${f.grayscale ? ' grayscale(100%)' : ''}${f.sepia ? ' sepia(100%)' : ''}${f.invert ? ' invert(100%)' : ''}${f.blur ? ' blur(2px)' : ''}`
    };
  };

  const applyGenreTemplate = (template: typeof GENRE_TEMPLATES[0]) => {
    updateCover({
      frontBgColor: template.colors[0],
      backBgColor: template.colors[0],
      spineBgColor: template.colors[0],
      titleColor: template.colors[1],
      authorColor: template.colors[2],
    });
    toast.success(`${template.name} theme applied`);
  };

  const renderCoverSection = (view: "front" | "back" | "spine", width: string, height: string) => {
    const bgColor = view === "front" ? coverData.frontBgColor : view === "back" ? coverData.backBgColor : coverData.spineBgColor;
    const bgImage = view === "front" ? coverData.frontImage : view === "back" ? coverData.backImage : coverData.spineImage;
    const layers = coverData[`${view}Layers` as keyof CoverData] as TextLayer[];
    const imageLayers = (coverData[`${view}ImageLayers` as keyof CoverData] as ImageLayer[]) || [];

    return (
      <div 
        className="relative overflow-hidden border-2 border-black shadow-xl"
        style={{ width, height, backgroundColor: bgColor }}
        onClick={() => { setSelectedLayerId(null); setActiveView(view); }}
      >
        {bgImage && (
          <img src={bgImage} className="absolute inset-0 w-full h-full object-cover" style={getFilterStyle()} />
        )}
        
        {coverData.filters.halftone && (
          <div className="absolute inset-0 pointer-events-none z-[5] mix-blend-multiply" 
               style={{ 
                 backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.3) 25%, transparent 25%)`,
                 backgroundSize: `${coverData.filters.halftoneSize}px ${coverData.filters.halftoneSize}px`
               }} />
        )}
        
        {coverData.filters.grain && (
          <div className="absolute inset-0 pointer-events-none z-[5] opacity-20 mix-blend-overlay"
               style={{ 
                 backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")` 
               }} />
        )}
        
        {coverData.filters.vignette && (
          <div className="absolute inset-0 pointer-events-none z-[6]"
               style={{ 
                 background: 'radial-gradient(circle, transparent 50%, rgba(0,0,0,0.5) 100%)' 
               }} />
        )}
        
        {view === "front" && (
          <>
            {coverData.bannerBgColor && coverData.bannerBgColor !== "transparent" && (
              <div 
                className="absolute top-0 left-0 right-0 h-8 flex items-center justify-between px-2 z-20 text-white"
                style={{ backgroundColor: coverData.bannerBgColor }}
              >
                <span className="text-xs font-bold">{coverData.publisherName}</span>
                <span className="text-xs">{coverData.tagline}</span>
              </div>
            )}
            
            {coverData.showPriceBox && (
              <div className="absolute top-2 right-2 w-10 h-10 bg-white border-2 border-black flex items-center justify-center z-20">
                <span className="text-xs font-bold text-black">{coverData.priceText}</span>
              </div>
            )}
            
            {coverData.issueNumber && (
              <div className="absolute top-2 left-2 z-20">
                <span className="text-2xl font-bold" style={{ color: coverData.titleColor, fontFamily: coverData.titleFont }}>
                  {coverData.issueNumber}
                </span>
              </div>
            )}
            
            <TransformableElement
              id="master-title"
              initialTransform={coverData.titleTransform || { x: 30, y: 80, width: 280, height: 80, rotation: 0, scaleX: 1, scaleY: 1 }}
              isSelected={selectedLayerId === "master-title"}
              onSelect={setSelectedLayerId}
              onTransformChange={(_, transform) => updateCover({ titleTransform: transform })}
              locked={false}
              containerRef={canvasRef}
            >
              <div className="w-full h-full flex items-center justify-center text-center">
                <h1 
                  style={{ fontFamily: coverData.titleFont, color: coverData.titleColor, fontSize: `${coverData.titleSize}px` }}
                  className="font-bold uppercase tracking-tight leading-none"
                >
                  {coverData.title}
                </h1>
              </div>
            </TransformableElement>

            <TransformableElement
              id="master-subtitle"
              initialTransform={coverData.subtitleTransform || { x: 80, y: 170, width: 200, height: 40, rotation: 0, scaleX: 1, scaleY: 1 }}
              isSelected={selectedLayerId === "master-subtitle"}
              onSelect={setSelectedLayerId}
              onTransformChange={(_, transform) => updateCover({ subtitleTransform: transform })}
              locked={false}
              containerRef={canvasRef}
            >
              <div className="w-full h-full flex items-center justify-center text-center">
                <p 
                  style={{ fontFamily: coverData.subtitleFont, color: coverData.subtitleColor, fontSize: `${coverData.subtitleSize}px` }}
                  className="italic"
                >
                  {coverData.subtitle}
                </p>
              </div>
            </TransformableElement>

            <TransformableElement
              id="master-author"
              initialTransform={coverData.authorTransform || { x: 60, y: 440, width: 220, height: 40, rotation: 0, scaleX: 1, scaleY: 1 }}
              isSelected={selectedLayerId === "master-author"}
              onSelect={setSelectedLayerId}
              onTransformChange={(_, transform) => updateCover({ authorTransform: transform })}
              locked={false}
              containerRef={canvasRef}
            >
              <div className="w-full h-full flex items-center justify-center text-center">
                <p 
                  style={{ fontFamily: coverData.authorFont, color: coverData.authorColor, fontSize: `${coverData.authorSize}px` }}
                  className="font-medium tracking-widest uppercase"
                >
                  {coverData.author}
                </p>
              </div>
            </TransformableElement>
          </>
        )}

        {view === "back" && (
          <>
            <TransformableElement
              id="master-blurb"
              initialTransform={coverData.backBlurbTransform || { x: 20, y: 60, width: 300, height: 350, rotation: 0, scaleX: 1, scaleY: 1 }}
              isSelected={selectedLayerId === "master-blurb"}
              onSelect={setSelectedLayerId}
              onTransformChange={(_, transform) => updateCover({ backBlurbTransform: transform })}
              locked={false}
              containerRef={canvasRef}
            >
              <div className="w-full h-full flex items-center justify-center text-center p-4">
                <p 
                  style={{ fontFamily: coverData.backBlurbFont, color: coverData.backBlurbColor, fontSize: `${coverData.backBlurbSize}px` }}
                  className="leading-relaxed"
                >
                  {coverData.backBlurb}
                </p>
              </div>
            </TransformableElement>
            <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10">
              <div className="w-32 h-10 bg-white/10 flex items-center justify-center text-xs text-white/50 font-mono">
                ISBN
              </div>
            </div>
          </>
        )}

        {view === "spine" && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <p 
              style={{ fontFamily: coverData.spineFont, color: coverData.spineColor, writingMode: "vertical-rl", textOrientation: "mixed" }}
              className="text-lg font-bold tracking-widest uppercase"
            >
              {coverData.spineText} — {coverData.author}
            </p>
          </div>
        )}

        {imageLayers.map(imgLayer => (
          <TransformableElement
            key={imgLayer.id}
            id={imgLayer.id}
            initialTransform={imgLayer.transform}
            isSelected={selectedLayerId === imgLayer.id}
            onSelect={setSelectedLayerId}
            onTransformChange={(id, transform) => updateImageLayer(view, id, { transform })}
            onDelete={(id) => deleteImageLayer(view, id)}
            locked={imgLayer.locked}
            containerRef={canvasRef}
          >
            <img
              src={imgLayer.url}
              alt={imgLayer.name}
              className="w-full h-full object-contain pointer-events-none select-none"
              style={{ opacity: imgLayer.opacity }}
              draggable={false}
            />
          </TransformableElement>
        ))}

        {layers.map(layer => (
          <TransformableElement
            key={layer.id}
            id={layer.id}
            initialTransform={layer.transform}
            isSelected={selectedLayerId === layer.id}
            onSelect={setSelectedLayerId}
            onTransformChange={(id, transform) => updateTextLayer(view, id, { transform })}
            onDelete={(id) => deleteTextLayer(view, id)}
            locked={layer.locked}
            containerRef={canvasRef}
          >
            <TextElement
              id={layer.id}
              text={layer.text}
              fontSize={layer.fontSize}
              fontFamily={layer.fontFamily}
              color={layer.color}
              textArch={layer.textArch}
              textEffect={layer.textEffect}
              strokeColor={layer.strokeColor}
              strokeWidth={layer.strokeWidth}
              shadowColor={layer.shadowColor}
              fontWeight={layer.fontWeight}
              fontStyle={layer.fontStyle}
              textTransform={layer.textTransform}
              isEditing={editingTextId === layer.id}
              onEditStart={() => setEditingTextId(layer.id)}
              onEditEnd={() => setEditingTextId(null)}
              onChange={(id, text) => updateTextLayer(view, id, { text })}
            />
          </TransformableElement>
        ))}
      </div>
    );
  };

  if (isCreating) {
    return (
      <Layout>
        <div className="h-screen flex items-center justify-center bg-black">
          <div className="text-center text-white">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-400">Creating cover project...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-screen flex flex-col bg-zinc-950 text-white">
        <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 hover:bg-zinc-800" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <h2 className="font-display font-bold text-lg">Cover Designer</h2>
            <div className="flex bg-zinc-800 p-1">
              {(["front", "back", "spine", "spread"] as const).map(view => (
                <button 
                  key={view}
                  onClick={() => setActiveView(view)}
                  className={`px-3 py-1 text-xs font-medium capitalize ${activeView === view ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAssetBrowser(true)}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 border border-violet-500 text-sm font-bold flex items-center gap-2"
              data-testid="button-open-assets"
            >
              <Layers className="w-4 h-4" /> Assets
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save"}
            </button>
            {comicId && (
              <button 
                onClick={handleSaveAndReturnToComic}
                disabled={isSaving}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 border border-cyan-500 text-sm font-bold flex items-center gap-2 text-white disabled:opacity-50"
                data-testid="button-save-return-comic"
              >
                <ArrowLeft className="w-4 h-4" /> {isSaving ? "Saving..." : "Save & Return to Comic"}
              </button>
            )}
            <button 
              onClick={handleExport}
              className="px-4 py-2 bg-white text-black text-sm font-bold flex items-center gap-2 hover:bg-zinc-200"
            >
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-80 p-4 overflow-auto border-r border-zinc-800 bg-zinc-900 space-y-4">
            <div className="flex border-b border-zinc-700">
              {["content", "style", "images"].map(section => (
                <button
                  key={section}
                  onClick={() => setActiveSection(section as any)}
                  className={`flex-1 py-2 text-xs font-bold uppercase ${activeSection === section ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
                >
                  {section}
                </button>
              ))}
            </div>

            {activeSection === "content" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400">Title</label>
                  <input 
                    type="text" 
                    value={coverData.title}
                    onChange={(e) => updateCover({ title: e.target.value, spineText: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400">Subtitle</label>
                  <input 
                    type="text" 
                    value={coverData.subtitle}
                    onChange={(e) => updateCover({ subtitle: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400">Author</label>
                  <input 
                    type="text" 
                    value={coverData.author}
                    onChange={(e) => updateCover({ author: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400">Back Cover Blurb</label>
                  <textarea 
                    value={coverData.backBlurb}
                    onChange={(e) => updateCover({ backBlurb: e.target.value })}
                    className="w-full h-32 bg-zinc-800 border border-zinc-700 p-2 text-sm resize-none"
                  />
                </div>

                <div className="pt-4 border-t border-zinc-700">
                  <label className="text-xs font-bold uppercase text-zinc-400 mb-2 block">Cover Templates</label>
                  <select
                    value={coverData.templateId}
                    onChange={(e) => applyTemplate(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm mb-3"
                  >
                    {COVER_TEMPLATES.map(template => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                  </select>
                  
                  <label className="text-xs font-bold uppercase text-zinc-400 mb-2 block">Comic Details</label>
                  <div className="space-y-2">
                    <input 
                      type="text" 
                      placeholder="Issue # (e.g., #1)"
                      value={coverData.issueNumber}
                      onChange={(e) => updateCover({ issueNumber: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                    />
                    <input 
                      type="text" 
                      placeholder="Publisher Name"
                      value={coverData.publisherName}
                      onChange={(e) => updateCover({ publisherName: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                    />
                    <input 
                      type="text" 
                      placeholder="Tagline"
                      value={coverData.tagline}
                      onChange={(e) => updateCover({ tagline: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                    />
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Price (e.g., 40¢)"
                        value={coverData.priceText}
                        onChange={(e) => updateCover({ priceText: e.target.value })}
                        className="flex-1 bg-zinc-800 border border-zinc-700 p-2 text-sm"
                      />
                      <label className="flex items-center gap-2 text-xs text-zinc-400">
                        <input 
                          type="checkbox" 
                          checked={coverData.showPriceBox}
                          onChange={(e) => updateCover({ showPriceBox: e.target.checked })}
                          className="w-4 h-4"
                        />
                        Show
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-700">
                  <label className="text-xs font-bold uppercase text-zinc-400 mb-2 block">Color Themes</label>
                  <div className="grid grid-cols-3 gap-2">
                    {GENRE_TEMPLATES.map(template => (
                      <button
                        key={template.id}
                        onClick={() => applyGenreTemplate(template)}
                        className="p-2 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 border border-zinc-600"
                        style={{ borderLeftColor: template.colors[1], borderLeftWidth: 3 }}
                      >
                        {template.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeSection === "style" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400">Title Font</label>
                  <select 
                    value={coverData.titleFont}
                    onChange={(e) => updateCover({ titleFont: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                  >
                    {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      value={coverData.titleColor}
                      onChange={(e) => updateCover({ titleColor: e.target.value })}
                      className="w-10 h-8 bg-zinc-800 border border-zinc-700 cursor-pointer"
                    />
                    <input 
                      type="number" 
                      value={coverData.titleSize}
                      onChange={(e) => updateCover({ titleSize: Number(e.target.value) })}
                      className="flex-1 bg-zinc-800 border border-zinc-700 p-1 text-sm text-center"
                      min="12"
                      max="120"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400">Subtitle Font</label>
                  <select 
                    value={coverData.subtitleFont}
                    onChange={(e) => updateCover({ subtitleFont: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                  >
                    {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      value={coverData.subtitleColor}
                      onChange={(e) => updateCover({ subtitleColor: e.target.value })}
                      className="w-10 h-8 bg-zinc-800 border border-zinc-700 cursor-pointer"
                    />
                    <input 
                      type="number" 
                      value={coverData.subtitleSize}
                      onChange={(e) => updateCover({ subtitleSize: Number(e.target.value) })}
                      className="flex-1 bg-zinc-800 border border-zinc-700 p-1 text-sm text-center"
                      min="8"
                      max="60"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400">Author Font</label>
                  <select 
                    value={coverData.authorFont}
                    onChange={(e) => updateCover({ authorFont: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                  >
                    {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      value={coverData.authorColor}
                      onChange={(e) => updateCover({ authorColor: e.target.value })}
                      className="w-10 h-8 bg-zinc-800 border border-zinc-700 cursor-pointer"
                    />
                    <input 
                      type="number" 
                      value={coverData.authorSize}
                      onChange={(e) => updateCover({ authorSize: Number(e.target.value) })}
                      className="flex-1 bg-zinc-800 border border-zinc-700 p-1 text-sm text-center"
                      min="8"
                      max="48"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-700">
                  <label className="text-xs font-bold uppercase text-zinc-400 mb-2 block">Background Colors</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <input 
                        type="color" 
                        value={coverData.frontBgColor}
                        onChange={(e) => updateCover({ frontBgColor: e.target.value })}
                        className="w-full h-10 bg-zinc-800 border border-zinc-700 cursor-pointer"
                      />
                      <span className="text-[10px] text-zinc-500">Front</span>
                    </div>
                    <div className="text-center">
                      <input 
                        type="color" 
                        value={coverData.spineBgColor}
                        onChange={(e) => updateCover({ spineBgColor: e.target.value })}
                        className="w-full h-10 bg-zinc-800 border border-zinc-700 cursor-pointer"
                      />
                      <span className="text-[10px] text-zinc-500">Spine</span>
                    </div>
                    <div className="text-center">
                      <input 
                        type="color" 
                        value={coverData.backBgColor}
                        onChange={(e) => updateCover({ backBgColor: e.target.value })}
                        className="w-full h-10 bg-zinc-800 border border-zinc-700 cursor-pointer"
                      />
                      <span className="text-[10px] text-zinc-500">Back</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-700">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold uppercase text-zinc-400">Text Layers</label>
                    <button 
                      onClick={() => addTextLayer(activeView === "spread" ? "front" : activeView)}
                      className="p-1 bg-white text-black text-xs flex items-center gap-1"
                      data-testid="button-add-text-layer"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>
                  {(() => {
                    const viewKey = activeView === "spread" ? "front" : activeView;
                    const layers = coverData[`${viewKey}Layers` as keyof CoverData] as TextLayer[];
                    return layers.length > 0 && (
                      <div className="space-y-2">
                        {layers.map((layer) => (
                          <div 
                            key={layer.id}
                            onClick={() => setSelectedLayerId(layer.id)}
                            className={`p-2 border cursor-pointer ${selectedLayerId === layer.id ? "border-cyan-500 bg-zinc-800" : "border-zinc-700 hover:border-zinc-500"}`}
                            data-testid={`layer-item-${layer.id}`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-bold truncate flex-1" style={{ fontFamily: layer.fontFamily, color: layer.color }}>
                                {layer.text || "Empty"}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteTextLayer(viewKey, layer.id); }}
                                className="p-0.5 hover:text-red-500"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            {selectedLayerId === layer.id && (
                              <div className="space-y-2 pt-2 border-t border-zinc-700" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={layer.text}
                                  onChange={(e) => updateTextLayer(viewKey, layer.id, { text: e.target.value })}
                                  className="w-full bg-zinc-900 border border-zinc-600 p-1.5 text-xs"
                                  placeholder="Text content"
                                  data-testid="input-layer-text"
                                />
                                <select
                                  value={layer.fontFamily}
                                  onChange={(e) => updateTextLayer(viewKey, layer.id, { fontFamily: e.target.value })}
                                  className="w-full bg-zinc-900 border border-zinc-600 p-1 text-xs"
                                  data-testid="select-layer-font"
                                >
                                  {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                </select>
                                <div className="flex gap-2">
                                  <input
                                    type="color"
                                    value={layer.color}
                                    onChange={(e) => updateTextLayer(viewKey, layer.id, { color: e.target.value })}
                                    className="w-8 h-7 bg-zinc-900 border border-zinc-600 cursor-pointer"
                                    data-testid="input-layer-color"
                                  />
                                  <input
                                    type="number"
                                    value={layer.fontSize}
                                    onChange={(e) => updateTextLayer(viewKey, layer.id, { fontSize: Number(e.target.value) })}
                                    className="flex-1 bg-zinc-900 border border-zinc-600 p-1 text-xs text-center"
                                    min="8"
                                    max="200"
                                    data-testid="input-layer-fontsize"
                                  />
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => updateTextLayer(viewKey, layer.id, { fontWeight: layer.fontWeight === "bold" ? "normal" : "bold" })}
                                    className={`px-2 py-1 text-xs font-bold border ${layer.fontWeight === "bold" ? "bg-white text-black border-white" : "border-zinc-600 hover:border-zinc-400"}`}
                                    data-testid="button-layer-bold"
                                  >B</button>
                                  <button
                                    onClick={() => updateTextLayer(viewKey, layer.id, { fontStyle: layer.fontStyle === "italic" ? "normal" : "italic" })}
                                    className={`px-2 py-1 text-xs italic border ${layer.fontStyle === "italic" ? "bg-white text-black border-white" : "border-zinc-600 hover:border-zinc-400"}`}
                                    data-testid="button-layer-italic"
                                  >I</button>
                                  <button
                                    onClick={() => updateTextLayer(viewKey, layer.id, { textTransform: layer.textTransform === "uppercase" ? "none" : "uppercase" })}
                                    className={`px-2 py-1 text-xs border ${layer.textTransform === "uppercase" ? "bg-white text-black border-white" : "border-zinc-600 hover:border-zinc-400"}`}
                                    data-testid="button-layer-uppercase"
                                  >AA</button>
                                </div>
                                <div>
                                  <label className="text-[10px] text-zinc-500 block mb-0.5">Effect</label>
                                  <select
                                    value={layer.textEffect || "comic"}
                                    onChange={(e) => updateTextLayer(viewKey, layer.id, { textEffect: e.target.value })}
                                    className="w-full bg-zinc-900 border border-zinc-600 p-1 text-xs"
                                    data-testid="select-layer-effect"
                                  >
                                    {["none", "comic", "outline", "3d", "retro", "glow", "neon", "fire", "ice"].map(e => (
                                      <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
                                    ))}
                                  </select>
                                </div>
                                {["outline", "comic", "3d", "retro"].includes(layer.textEffect || "comic") && (
                                  <div className="flex gap-2">
                                    <div className="flex-1">
                                      <label className="text-[10px] text-zinc-500">Stroke</label>
                                      <input
                                        type="color"
                                        value={layer.strokeColor || "#000000"}
                                        onChange={(e) => updateTextLayer(viewKey, layer.id, { strokeColor: e.target.value })}
                                        className="w-full h-6 bg-zinc-900 border border-zinc-600 cursor-pointer"
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <label className="text-[10px] text-zinc-500">Width</label>
                                      <input
                                        type="number"
                                        value={layer.strokeWidth || 2}
                                        onChange={(e) => updateTextLayer(viewKey, layer.id, { strokeWidth: Number(e.target.value) })}
                                        className="w-full bg-zinc-900 border border-zinc-600 p-1 text-xs text-center"
                                        min="0" max="10" step="0.5"
                                      />
                                    </div>
                                  </div>
                                )}
                                <div>
                                  <label className="text-[10px] text-zinc-500 flex justify-between">
                                    <span>Text Arch</span>
                                    <span className="text-zinc-600">{layer.textArch || 0}</span>
                                  </label>
                                  <input
                                    type="range"
                                    min="-100" max="100" step="5"
                                    value={layer.textArch || 0}
                                    onChange={(e) => updateTextLayer(viewKey, layer.id, { textArch: Number(e.target.value) })}
                                    className="w-full h-1.5 accent-cyan-500"
                                    data-testid="input-layer-arch"
                                  />
                                  <div className="flex justify-between text-[9px] text-zinc-600">
                                    <span>Down</span>
                                    <button
                                      onClick={() => updateTextLayer(viewKey, layer.id, { textArch: 0 })}
                                      className="text-zinc-400 hover:text-white"
                                    >Reset</button>
                                    <span>Up</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                <div className="pt-4 border-t border-zinc-700">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold uppercase text-zinc-400">Image Layers</label>
                    <button 
                      onClick={() => setShowAssetBrowser(true)}
                      className="p-1 bg-violet-600 text-white text-xs flex items-center gap-1"
                      data-testid="button-add-image-layer"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>
                  {(() => {
                    const viewKey = activeView === "spread" ? "front" : activeView;
                    const imgLayers = (coverData[`${viewKey}ImageLayers` as keyof CoverData] as ImageLayer[]) || [];
                    return imgLayers.length > 0 && (
                      <div className="space-y-2">
                        {imgLayers.map((imgLayer) => (
                          <div 
                            key={imgLayer.id}
                            onClick={() => setSelectedLayerId(imgLayer.id)}
                            className={`p-2 border cursor-pointer ${selectedLayerId === imgLayer.id ? "border-violet-500 bg-zinc-800" : "border-zinc-700 hover:border-zinc-500"}`}
                            data-testid={`image-layer-item-${imgLayer.id}`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <img src={imgLayer.url} alt={imgLayer.name} className="w-6 h-6 object-contain bg-zinc-900 border border-zinc-700" />
                                <span className="text-xs font-medium truncate">{imgLayer.name}</span>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteImageLayer(viewKey, imgLayer.id); }}
                                className="p-0.5 hover:text-red-500"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            {selectedLayerId === imgLayer.id && (
                              <div className="space-y-2 pt-2 border-t border-zinc-700" onClick={(e) => e.stopPropagation()}>
                                <div>
                                  <label className="text-[10px] text-zinc-500 flex justify-between">
                                    <span>Opacity</span>
                                    <span className="text-zinc-600">{Math.round((imgLayer.opacity ?? 1) * 100)}%</span>
                                  </label>
                                  <input
                                    type="range"
                                    min="0" max="1" step="0.05"
                                    value={imgLayer.opacity ?? 1}
                                    onChange={(e) => updateImageLayer(viewKey, imgLayer.id, { opacity: Number(e.target.value) })}
                                    className="w-full h-1.5 accent-violet-500"
                                    data-testid="input-image-opacity"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {activeSection === "images" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400 flex justify-between">
                    <span>Front Cover</span>
                    <button onClick={() => { setAiTarget("front"); setShowAIGen(true); }} className="text-[10px] bg-white text-black px-2 py-0.5 flex items-center gap-1">
                      <Wand2 className="w-3 h-3" /> AI
                    </button>
                  </label>
                  <div 
                    onClick={() => frontInputRef.current?.click()}
                    className="aspect-[2/3] bg-zinc-800 border border-zinc-700 flex items-center justify-center cursor-pointer hover:border-white relative overflow-hidden"
                  >
                    {coverData.frontImage ? (
                      <img src={coverData.frontImage} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-zinc-500 text-xs flex flex-col items-center"><Upload className="w-4 h-4 mb-1" /> Upload</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400 flex justify-between">
                    <span>Back Cover</span>
                    <button onClick={() => { setAiTarget("back"); setShowAIGen(true); }} className="text-[10px] bg-white text-black px-2 py-0.5 flex items-center gap-1">
                      <Wand2 className="w-3 h-3" /> AI
                    </button>
                  </label>
                  <div 
                    onClick={() => backInputRef.current?.click()}
                    className="aspect-[2/3] bg-zinc-800 border border-zinc-700 flex items-center justify-center cursor-pointer hover:border-white relative overflow-hidden"
                  >
                    {coverData.backImage ? (
                      <img src={coverData.backImage} className="w-full h-full object-cover opacity-50" />
                    ) : (
                      <span className="text-zinc-500 text-xs flex flex-col items-center"><Upload className="w-4 h-4 mb-1" /> Upload</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400 flex justify-between">
                    <span>Spine</span>
                    <button onClick={() => { setAiTarget("spine"); setShowAIGen(true); }} className="text-[10px] bg-white text-black px-2 py-0.5 flex items-center gap-1">
                      <Wand2 className="w-3 h-3" /> AI
                    </button>
                  </label>
                  <div 
                    onClick={() => spineInputRef.current?.click()}
                    className="h-20 bg-zinc-800 border border-zinc-700 flex items-center justify-center cursor-pointer hover:border-white relative overflow-hidden"
                  >
                    {coverData.spineImage ? (
                      <img src={coverData.spineImage} className="w-full h-full object-cover opacity-50" />
                    ) : (
                      <span className="text-zinc-500 text-xs flex items-center gap-1"><Upload className="w-3 h-3" /> Upload</span>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-700 space-y-3">
                  <label className="text-xs font-bold uppercase text-zinc-400 block">Filter Builder</label>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-400">Contrast</span>
                      <span className="text-xs text-zinc-500">{coverData.filters.contrast}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" 
                      value={coverData.filters.contrast}
                      onChange={(e) => updateFilter('contrast', Number(e.target.value))}
                      className="w-full accent-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-400">Brightness</span>
                      <span className="text-xs text-zinc-500">{coverData.filters.brightness}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" 
                      value={coverData.filters.brightness}
                      onChange={(e) => updateFilter('brightness', Number(e.target.value))}
                      className="w-full accent-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-400">Saturation</span>
                      <span className="text-xs text-zinc-500">{coverData.filters.saturation}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="200" 
                      value={coverData.filters.saturation}
                      onChange={(e) => updateFilter('saturation', Number(e.target.value))}
                      className="w-full accent-white"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={coverData.filters.grayscale}
                        onChange={(e) => updateFilter('grayscale', e.target.checked)}
                        className="w-3 h-3"
                      />
                      Grayscale
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={coverData.filters.sepia}
                        onChange={(e) => updateFilter('sepia', e.target.checked)}
                        className="w-3 h-3"
                      />
                      Sepia
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={coverData.filters.invert}
                        onChange={(e) => updateFilter('invert', e.target.checked)}
                        className="w-3 h-3"
                      />
                      Invert
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={coverData.filters.blur}
                        onChange={(e) => updateFilter('blur', e.target.checked)}
                        className="w-3 h-3"
                      />
                      Blur
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={coverData.filters.halftone}
                        onChange={(e) => updateFilter('halftone', e.target.checked)}
                        className="w-3 h-3"
                      />
                      Halftone
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={coverData.filters.grain}
                        onChange={(e) => updateFilter('grain', e.target.checked)}
                        className="w-3 h-3"
                      />
                      Grain
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={coverData.filters.vignette}
                        onChange={(e) => updateFilter('vignette', e.target.checked)}
                        className="w-3 h-3"
                      />
                      Vignette
                    </label>
                  </div>

                  <button 
                    onClick={() => updateCover({ filters: { ...FILTER_PRESETS } })}
                    className="w-full py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-600"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div ref={canvasRef} className="flex-1 bg-zinc-950 flex items-center justify-center p-4 relative">
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none" 
                     style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
                
                <div ref={coverContentRef}>
                {activeView === "spread" ? (
                  <div className="flex items-center shadow-2xl" style={{ perspective: "1000px" }}>
                    {renderCoverSection("back", "400px", "600px")}
                    {renderCoverSection("spine", "50px", "600px")}
                    {renderCoverSection("front", "400px", "600px")}
                  </div>
                ) : activeView === "front" ? (
                  renderCoverSection("front", "500px", "750px")
                ) : activeView === "back" ? (
                  renderCoverSection("back", "500px", "750px")
                ) : (
                  renderCoverSection("spine", "70px", "750px")
                )}
                </div>
                
                <p className="absolute bottom-8 font-mono text-xs text-zinc-500">
                  {activeView.toUpperCase()} VIEW • 300 DPI PRINT READY
                </p>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-56 bg-zinc-900 border-zinc-700 text-white">
              <ContextMenuItem onClick={() => addTextLayer(activeView === "spread" ? "front" : activeView)} className="hover:bg-zinc-800 cursor-pointer">
                <Type className="w-4 h-4 mr-2" /> Add Text Layer
              </ContextMenuItem>
              <ContextMenuItem onClick={() => setShowAssetBrowser(true)} className="hover:bg-zinc-800 cursor-pointer">
                <Layers className="w-4 h-4 mr-2" /> Add Asset from Library
              </ContextMenuItem>
              <ContextMenuSeparator className="bg-zinc-700" />
              <ContextMenuSub>
                <ContextMenuSubTrigger className="hover:bg-zinc-800 cursor-pointer">
                  <Palette className="w-4 h-4 mr-2" /> Apply Template
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-48 bg-zinc-900 border-zinc-700 text-white">
                  {COVER_TEMPLATES.slice(0, 6).map(template => (
                    <ContextMenuItem 
                      key={template.id} 
                      onClick={() => applyTemplate(template.id)}
                      className="hover:bg-zinc-800 cursor-pointer text-xs"
                    >
                      {template.name}
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
              <ContextMenuSeparator className="bg-zinc-700" />
              <ContextMenuItem onClick={() => { setAiTarget("front"); setShowAIGen(true); }} className="hover:bg-zinc-800 cursor-pointer">
                <Wand2 className="w-4 h-4 mr-2" /> AI Generate Cover
              </ContextMenuItem>
              <ContextMenuItem 
                onClick={() => { 
                  setDrawingTarget(activeView === "spread" ? "front" : activeView);
                  setShowDrawing(true); 
                }} 
                className="hover:bg-zinc-800 cursor-pointer"
              >
                <Pen className="w-4 h-4 mr-2" /> Draw on {activeView === "spread" ? "Front" : activeView}
              </ContextMenuItem>
              <ContextMenuSeparator className="bg-zinc-700" />
              <ContextMenuItem onClick={() => setActiveView("front")} className="hover:bg-zinc-800 cursor-pointer">
                <Eye className="w-4 h-4 mr-2" /> View Front
              </ContextMenuItem>
              <ContextMenuItem onClick={() => setActiveView("back")} className="hover:bg-zinc-800 cursor-pointer">
                <Eye className="w-4 h-4 mr-2" /> View Back
              </ContextMenuItem>
              <ContextMenuItem onClick={() => setActiveView("spread")} className="hover:bg-zinc-800 cursor-pointer">
                <Layers className="w-4 h-4 mr-2" /> View Spread
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </div>

        <input ref={frontInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "front")} />
        <input ref={backInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "back")} />
        <input ref={spineInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "spine")} />

        {showAIGen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-zinc-700 p-6 w-[500px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Wand2 className="w-5 h-5" /> AI Generate {aiTarget} cover
                </h3>
                <button onClick={() => setShowAIGen(false)} className="p-2 hover:bg-zinc-800">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <AIGenerator type="cover" onImageGenerated={handleAIGenerated} />
            </div>
          </div>
        )}

        {showDrawing && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-8">
            <DrawingWorkspace
              width={800}
              height={1200}
              initialData={drawingTarget === "front" ? coverData.frontImage : 
                          drawingTarget === "back" ? coverData.backImage : 
                          coverData.spineImage}
              onSave={(rasterData) => {
                if (drawingTarget === "front") {
                  setCoverData(prev => ({ ...prev, frontImage: rasterData }));
                } else if (drawingTarget === "back") {
                  setCoverData(prev => ({ ...prev, backImage: rasterData }));
                } else {
                  setCoverData(prev => ({ ...prev, spineImage: rasterData }));
                }
                setShowDrawing(false);
                toast.success(`Drawing saved to ${drawingTarget} cover`);
              }}
              onCancel={() => setShowDrawing(false)}
              className="w-full max-w-5xl h-[85vh]"
            />
          </div>
        )}

        <AssetBrowser
          isOpen={showAssetBrowser}
          onClose={() => setShowAssetBrowser(false)}
          onSelectAsset={handleAssetSelected}
          mode="insert"
        />
      </div>
    </Layout>
  );
}
