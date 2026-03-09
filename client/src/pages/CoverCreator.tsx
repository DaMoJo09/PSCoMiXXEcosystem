import { Layout } from "@/components/layout/Layout";
import html2canvas from "html2canvas";
import { 
  Save, Download, ArrowLeft, Type, ImageIcon, Wand2, X, Upload, Eye, 
  RotateCw, Palette, Settings, Layers, Plus, Trash2, Copy, Pen,
  Undo2, Redo2, Ruler, FileText,
  AlignHorizontalJustifyStart, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
  ChevronsUp, ChevronsDown, ChevronUp, ChevronDown
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { AIGenerator } from "@/components/tools/AIGenerator";
import { TransformableElement, TransformState } from "@/components/tools/TransformableElement";
import { TextElement } from "@/components/tools/TextElement";
import { DrawingWorkspace } from "@/components/tools/DrawingWorkspace";
import { AssetBrowser, AssetBrowserTrigger } from "@/components/tools/AssetBrowser";
import type { AssetItem } from "@/components/tools/AssetBrowser";
import { useProject, useUpdateProject, useCreateProject } from "@/hooks/useProjects";
import { toast } from "sonner";
import { saveProjectWithOfflineFallback } from "@/lib/offlineStorage";
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
  titleEffect?: string;
  titleArch?: number;
  titleStrokeColor?: string;
  titleStrokeWidth?: number;
  subtitleFont: string;
  subtitleColor: string;
  subtitleSize: number;
  subtitleEffect?: string;
  subtitleArch?: number;
  subtitleStrokeColor?: string;
  subtitleStrokeWidth?: number;
  authorFont: string;
  authorColor: string;
  authorSize: number;
  authorEffect?: string;
  authorArch?: number;
  authorStrokeColor?: string;
  authorStrokeWidth?: number;
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
  isbn: string;
  filters: typeof FILTER_PRESETS;
  frontBgTransform?: { x: number; y: number; width: number; height: number; rotation: number; scaleX: number; scaleY: number };
  backBgTransform?: { x: number; y: number; width: number; height: number; rotation: number; scaleX: number; scaleY: number };
  spineBgTransform?: { x: number; y: number; width: number; height: number; rotation: number; scaleX: number; scaleY: number };
  titleTransform?: TransformState;
  subtitleTransform?: TransformState;
  authorTransform?: TransformState;
  backBlurbTransform?: TransformState;
  bannerTransform?: TransformState;
  priceBoxTransform?: TransformState;
  issueNumberTransform?: TransformState;
  elementZOrder: string[];
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
  isbn: "",
  filters: { ...FILTER_PRESETS },
  elementZOrder: ["master-banner", "master-issue", "master-title", "master-subtitle", "master-author", "master-price"],
};

export default function CoverCreator() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const projectId = searchParams.get('id');
  const comicId = searchParams.get('comicId');
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const effectiveProjectId = projectId || createdProjectId;
  
  const { data: project } = useProject(effectiveProjectId || '');
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
  const [isCreating, setIsCreating] = useState(!effectiveProjectId);
  const creationAttempted = useRef(false);
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
  const selectedLayerId = selectedLayerIds[0] || null;
  const setSelectedLayerId = useCallback((id: string | null) => {
    setSelectedLayerIds(id ? [id] : []);
  }, []);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingMasterId, setEditingMasterId] = useState<string | null>(null);
  const [showAssetBrowser, setShowAssetBrowser] = useState(false);
  const [showGuides, setShowGuides] = useState(false);
  const [selectedMasterElement, setSelectedMasterElement] = useState<string | null>(null);

  const historyRef = useRef<CoverData[]>([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);

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

    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      setIsCreating(false);
      toast.error("Project creation timed out - please try again");
    }, 15000);

    fetch("/api/projects?fields=meta", { credentials: "include" })
      .then(res => res.ok ? res.json() : Promise.reject(new Error("Failed to fetch projects")))
      .then((allProjects: any[]) => {
        if (cancelled) return;
        const existing = allProjects
          .filter((p: any) => p.type === "cover")
          .sort((a: any, b: any) => {
            const aHasData = a.updatedAt !== a.createdAt;
            const bHasData = b.updatedAt !== b.createdAt;
            if (aHasData && !bHasData) return -1;
            if (!aHasData && bHasData) return 1;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          });
        if (existing.length > 0) {
          clearTimeout(timeoutId);
          setCreatedProjectId(existing[0].id);
          setIsCreating(false);
          navigate(`/creator/cover?id=${existing[0].id}`, { replace: true });
          return;
        }
        return createProject.mutateAsync({
          title: "Untitled Cover",
          type: "cover",
          status: "draft",
          data: defaultCover,
        }).then((newProject) => {
          if (cancelled) return;
          clearTimeout(timeoutId);
          setCreatedProjectId(newProject.id);
          setIsCreating(false);
          navigate(`/creator/cover?id=${newProject.id}`, { replace: true });
        });
      }).catch((err) => {
        if (cancelled) return;
        clearTimeout(timeoutId);
        toast.error(err?.message || "Failed to create project - please try again");
        setIsCreating(false);
        creationAttempted.current = false;
      });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [projectId]);

  useEffect(() => {
    if (project) {
      const data = project.data as CoverData;
      if (data) setCoverData(prev => ({ ...prev, ...data }));
    }
  }, [project]);

  useEffect(() => {
    if (!comicId) return;
    fetch(`/api/projects/${comicId}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(comic => {
        if (comic && !effectiveProjectId) {
          setCoverData(prev => ({
            ...prev,
            title: comic.title || prev.title,
            spineText: comic.title || prev.spineText,
            author: comic.data?.author || prev.author,
          }));
          toast.info("Auto-populated from comic project");
        }
      })
      .catch(() => {});
  }, [comicId, projectId]);

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userEditCountRef = useRef(0);
  const initialLoadDoneRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const latestDataRef = useRef({ coverData, projectId: effectiveProjectId });
  latestDataRef.current = { coverData, projectId: effectiveProjectId };

  const flushSave = useCallback(async () => {
    const { projectId: pid, coverData: cd } = latestDataRef.current;
    if (!pid || !pendingSaveRef.current) return;
    pendingSaveRef.current = false;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    await saveProjectWithOfflineFallback(pid, { title: cd.title, data: cd }, 'cover');
  }, []);

  useEffect(() => {
    if (project && !initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true;
      userEditCountRef.current = 0;
    }
  }, [project]);

  useEffect(() => {
    if (!effectiveProjectId || !initialLoadDoneRef.current) return;
    userEditCountRef.current += 1;
    if (userEditCountRef.current <= 1) return;
    pendingSaveRef.current = true;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      await flushSave();
    }, 3000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [coverData, projectId, flushSave]);

  useEffect(() => {
    return () => {
      if (pendingSaveRef.current) {
        const { projectId: pid, coverData: cd } = latestDataRef.current;
        if (pid) {
          navigator.sendBeacon(
            `/api/projects/${pid}/autosave`,
            new Blob([JSON.stringify({ title: cd.title, data: cd })], { type: "application/json" })
          );
        }
      }
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingSaveRef.current) {
        const { projectId: pid, coverData: cd } = latestDataRef.current;
        if (pid) {
          navigator.sendBeacon(
            `/api/projects/${pid}/autosave`,
            new Blob([JSON.stringify({ title: cd.title, data: cd })], { type: "application/json" })
          );
        }
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const pushHistory = useCallback((data: CoverData) => {
    if (isUndoRedoRef.current) return;
    const idx = historyIndexRef.current;
    const newHistory = historyRef.current.slice(0, idx + 1);
    newHistory.push(JSON.parse(JSON.stringify(data)));
    if (newHistory.length > 50) newHistory.shift();
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
  }, []);

  const updateCover = useCallback((updates: Partial<CoverData>) => {
    setCoverData(prev => {
      const next = { ...prev, ...updates };
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    isUndoRedoRef.current = true;
    historyIndexRef.current--;
    setCoverData(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])));
    isUndoRedoRef.current = false;
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    isUndoRedoRef.current = true;
    historyIndexRef.current++;
    setCoverData(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])));
    isUndoRedoRef.current = false;
  }, []);

  useEffect(() => {
    if (historyRef.current.length === 0) {
      historyRef.current = [JSON.parse(JSON.stringify(coverData))];
      historyIndexRef.current = 0;
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
      if (e.key === "Delete" && selectedLayerIds.length > 0 && !editingMasterId && !editingTextId) {
        const viewKey = activeView === "spread" ? "front" : activeView;
        const updates: Partial<CoverData> = {};
        const textLayers = coverData[`${viewKey}Layers` as keyof CoverData] as TextLayer[];
        const imgLayers = (coverData[`${viewKey}ImageLayers` as keyof CoverData] as ImageLayer[]) || [];
        updates[`${viewKey}Layers` as keyof CoverData] = textLayers.filter(l => !selectedLayerIds.includes(l.id)) as any;
        updates[`${viewKey}ImageLayers` as keyof CoverData] = imgLayers.filter(l => !selectedLayerIds.includes(l.id)) as any;
        updates.elementZOrder = (coverData.elementZOrder || []).filter(id => !selectedLayerIds.includes(id));
        updateCover(updates);
        setSelectedLayerIds([]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, selectedLayerIds, editingMasterId, editingTextId, activeView, coverData]);

  const handleShiftSelect = useCallback((id: string, e?: React.MouseEvent) => {
    if (e?.shiftKey) {
      setSelectedLayerIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    } else {
      setSelectedLayerIds([id]);
    }
  }, []);

  const generateEAN13Barcode = useCallback((isbn: string): string => {
    const digits = isbn.replace(/[^0-9]/g, "");
    if (digits.length !== 13) return "";
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 100;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 200, 100);
    ctx.fillStyle = "#000000";

    const LEFT_ODD = [
      "0001101","0011001","0010011","0111101","0100011","0110001","0101111","0111011","0110111","0001011"
    ];
    const LEFT_EVEN = [
      "0100111","0110011","0011011","0100001","0011101","0111001","0000101","0010001","0001001","0010111"
    ];
    const RIGHT = [
      "1110010","1100110","1101100","1000010","1011100","1001110","1010000","1000100","1001000","1110100"
    ];
    const PARITY = [
      "OOOOOO","OOEOEE","OOEEOE","OOEEEO","OEOOEE","OEEOOE","OEEEOO","OEOEOE","OEOEEO","OEEOEO"
    ];
    const d = digits.split("").map(Number);
    const parity = PARITY[d[0]];
    let bits = "101";
    for (let i = 0; i < 6; i++) {
      bits += parity[i] === "O" ? LEFT_ODD[d[i + 1]] : LEFT_EVEN[d[i + 1]];
    }
    bits += "01010";
    for (let i = 7; i < 13; i++) {
      bits += RIGHT[d[i]];
    }
    bits += "101";
    const barWidth = 1.6;
    const startX = 10;
    for (let i = 0; i < bits.length; i++) {
      if (bits[i] === "1") {
        const isGuard = i < 3 || (i >= 45 && i < 50) || i >= 92;
        ctx.fillRect(startX + i * barWidth, 5, barWidth, isGuard ? 75 : 65);
      }
    }
    ctx.font = "10px monospace";
    ctx.fillText(digits.substring(0, 1), 1, 90);
    ctx.fillText(digits.substring(1, 7), startX + 8, 90);
    ctx.fillText(digits.substring(7, 13), startX + 56 * barWidth, 90);
    return canvas.toDataURL("image/png");
  }, []);

  const handlePDFExport = async () => {
    if (!coverContentRef.current) return;
    try {
      toast.info("Generating print-ready PDF...");
      const el = coverContentRef.current;
      const targetDPI = 300;
      const inchW = activeView === "spread" ? 13.95 : activeView === "spine" ? 0.7 : 6.625;
      const inchH = activeView === "spread" ? 10.25 : activeView === "spine" ? 10.25 : 10.25;
      const targetWidth = Math.round(inchW * targetDPI);
      const printScale = targetWidth / el.offsetWidth;
      const canvas = await html2canvas(el, {
        scale: printScale,
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        logging: false,
      });
      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF({
        orientation: inchW > inchH ? "landscape" : "portrait",
        unit: "in",
        format: [inchW, inchH],
      });
      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, inchW, inchH);
      pdf.save(`${coverData.title.replace(/\s+/g, "_")}_cover_${activeView}_print.pdf`);
      toast.success("PDF exported successfully!");
      fetch("/api/xp/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "export" }), credentials: "include" });
    } catch (error: any) {
      console.error("PDF export error:", error);
      toast.error("Failed to export PDF: " + (error?.message || "Unknown error"));
    }
  };

  const alignElements = useCallback((direction: string) => {
    if (!selectedLayerId) return;
    const id = selectedLayerId;
    const viewKey = activeView === "spread" ? "front" : activeView;
    const isMaster = id.startsWith("master-");
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const getCanvasSize = () => {
      if (activeView === "front" || activeView === "back") return { w: 600, h: 900 };
      if (activeView === "spine") return { w: 80, h: 900 };
      return { w: 1020, h: 720 };
    };
    const { w: cw, h: ch } = getCanvasSize();

    if (isMaster) {
      const transformKey = `${id.replace("master-", "")}Transform` as keyof CoverData;
      const mapKey: Record<string, string> = {
        "master-title": "titleTransform", "master-subtitle": "subtitleTransform",
        "master-author": "authorTransform", "master-blurb": "backBlurbTransform",
        "master-banner": "bannerTransform", "master-price": "priceBoxTransform",
        "master-issue": "issueNumberTransform"
      };
      const key = mapKey[id] as keyof CoverData;
      if (!key) return;
      const t = (coverData[key] as TransformState) || { x: 0, y: 0, width: 200, height: 40, rotation: 0, scaleX: 1, scaleY: 1 };
      let newT = { ...t };
      if (direction === "left") newT.x = 0;
      if (direction === "center-h") newT.x = (cw - t.width) / 2;
      if (direction === "right") newT.x = cw - t.width;
      if (direction === "top") newT.y = 0;
      if (direction === "center-v") newT.y = (ch - t.height) / 2;
      if (direction === "bottom") newT.y = ch - t.height;
      updateCover({ [key]: newT });
    } else {
      const layers = coverData[`${viewKey}Layers` as keyof CoverData] as TextLayer[];
      const imgLayers = (coverData[`${viewKey}ImageLayers` as keyof CoverData] as ImageLayer[]) || [];
      const tl = layers.find(l => l.id === id);
      const il = imgLayers.find(l => l.id === id);
      if (tl) {
        let newT = { ...tl.transform };
        if (direction === "left") newT.x = 0;
        if (direction === "center-h") newT.x = (cw - newT.width) / 2;
        if (direction === "right") newT.x = cw - newT.width;
        if (direction === "top") newT.y = 0;
        if (direction === "center-v") newT.y = (ch - newT.height) / 2;
        if (direction === "bottom") newT.y = ch - newT.height;
        updateCover({ [`${viewKey}Layers`]: layers.map(l => l.id === id ? { ...l, transform: newT } : l) });
      }
      if (il) {
        let newT = { ...il.transform };
        if (direction === "left") newT.x = 0;
        if (direction === "center-h") newT.x = (cw - newT.width) / 2;
        if (direction === "right") newT.x = cw - newT.width;
        if (direction === "top") newT.y = 0;
        if (direction === "center-v") newT.y = (ch - newT.height) / 2;
        if (direction === "bottom") newT.y = ch - newT.height;
        updateCover({ [`${viewKey}ImageLayers`]: imgLayers.map(l => l.id === id ? { ...l, transform: newT } : l) });
      }
    }
  }, [selectedLayerId, activeView, coverData, updateCover]);

  const moveLayerOrder = useCallback((id: string, direction: "front" | "back" | "forward" | "backward") => {
    const order = [...(coverData.elementZOrder || [])];
    const idx = order.indexOf(id);
    if (idx === -1) {
      order.push(id);
      updateCover({ elementZOrder: order });
      return;
    }
    let newOrder = [...order];
    if (direction === "front") {
      newOrder.splice(idx, 1);
      newOrder.push(id);
    } else if (direction === "back") {
      newOrder.splice(idx, 1);
      newOrder.unshift(id);
    } else if (direction === "forward" && idx < order.length - 1) {
      [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    } else if (direction === "backward" && idx > 0) {
      [newOrder[idx], newOrder[idx - 1]] = [newOrder[idx - 1], newOrder[idx]];
    }
    updateCover({ elementZOrder: newOrder });
  }, [coverData.elementZOrder, updateCover]);

  const getMasterElementInfo = useCallback((id: string) => {
    const map: Record<string, { label: string; fontKey: string; colorKey: string; sizeKey: string; effectKey: string; archKey: string; strokeColorKey: string; strokeWidthKey: string }> = {
      "master-title": { label: "Title", fontKey: "titleFont", colorKey: "titleColor", sizeKey: "titleSize", effectKey: "titleEffect", archKey: "titleArch", strokeColorKey: "titleStrokeColor", strokeWidthKey: "titleStrokeWidth" },
      "master-subtitle": { label: "Subtitle", fontKey: "subtitleFont", colorKey: "subtitleColor", sizeKey: "subtitleSize", effectKey: "subtitleEffect", archKey: "subtitleArch", strokeColorKey: "subtitleStrokeColor", strokeWidthKey: "subtitleStrokeWidth" },
      "master-author": { label: "Author", fontKey: "authorFont", colorKey: "authorColor", sizeKey: "authorSize", effectKey: "authorEffect", archKey: "authorArch", strokeColorKey: "authorStrokeColor", strokeWidthKey: "authorStrokeWidth" },
    };
    return map[id] || null;
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (effectiveProjectId) {
        await updateProject.mutateAsync({
          id: effectiveProjectId,
          data: { title: coverData.title, data: coverData },
        });
        toast.success("Cover saved");
        fetch("/api/xp/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save" }), credentials: "include" });
      } else {
        const newProject = await createProject.mutateAsync({
          title: coverData.title || "Untitled Cover",
          type: "cover",
          status: "draft",
          data: coverData,
        });
        navigate(`/creator/cover?id=${newProject.id}`, { replace: true });
        toast.success("Cover created and saved");
        fetch("/api/xp/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save" }), credentials: "include" });
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
      let savedProjectId = effectiveProjectId;
      if (effectiveProjectId) {
        await updateProject.mutateAsync({
          id: effectiveProjectId,
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
            allowTaint: false,
            backgroundColor: null,
            logging: false,
          });
          coverImageUrl = canvas.toDataURL("image/png");
        } catch (err) {
          console.error("Cover image capture failed:", err);
        }
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
        allowTaint: false,
        backgroundColor: null,
        logging: false,
      });
      
      const link = document.createElement("a");
      link.download = `${coverData.title.replace(/\s+/g, "_")}_cover_${activeView}_print.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      toast.success(`Cover exported at ${canvas.width}x${canvas.height}px (print-ready ${targetDPI} DPI)`);
      fetch("/api/xp/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "export" }), credentials: "include" });
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error("Failed to export cover: " + (error?.message || "Unknown error"));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: "front" | "back" | "spine") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const bgKey = target === "front" ? "frontImage" : target === "back" ? "backImage" : "spineImage";
      const bgTransformKey = `${target}BgTransform`;
      const dW = target === "spine" ? 80 : 600;
      const dH = target === "spine" ? 900 : 900;
      updateCover({ 
        [bgKey]: url,
        [bgTransformKey]: { x: 0, y: 0, width: dW, height: dH, rotation: 0, scaleX: 1, scaleY: 1 }
      });
      toast.success(`${target} image updated`);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleAIGenerated = (url: string) => {
    const bgKey = aiTarget === "front" ? "frontImage" : aiTarget === "back" ? "backImage" : "spineImage";
    const bgTransformKey = `${aiTarget}BgTransform`;
    const dW = aiTarget === "spine" ? 80 : 600;
    const dH = aiTarget === "spine" ? 900 : 900;
    updateCover({ 
      [bgKey]: url,
      [bgTransformKey]: { x: 0, y: 0, width: dW, height: dH, rotation: 0, scaleX: 1, scaleY: 1 }
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
    const newOrder = [...(coverData.elementZOrder || []), newLayer.id];
    updateCover({ [layerKey]: [...(coverData[layerKey] as TextLayer[]), newLayer], elementZOrder: newOrder });
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
    const newOrder = (coverData.elementZOrder || []).filter(id => id !== layerId);
    updateCover({ [layerKey]: layers.filter(l => l.id !== layerId), elementZOrder: newOrder });
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
    const newOrder = [...(coverData.elementZOrder || []), newLayer.id];
    updateCover({ [layerKey]: [...existing, newLayer], elementZOrder: newOrder });
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
    const newOrder = (coverData.elementZOrder || []).filter(id => id !== layerId);
    updateCover({ [layerKey]: layers.filter(l => l.id !== layerId), elementZOrder: newOrder });
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

    const designW = view === "spine" ? 80 : 600;
    const designH = view === "spine" ? 900 : 900;
    const requestedW = parseInt(width);
    const isSpread = activeView === "spread";
    const scale = isSpread ? requestedW / designW : 1;

    return (
      <div
        className="relative overflow-hidden border-2 border-black shadow-xl"
        style={{ width, height, backgroundColor: bgColor }}
        onClick={(e) => { if (!e.shiftKey) setSelectedLayerIds([]); setEditingMasterId(null); setActiveView(view); }}
      >
      <div
        className="absolute origin-top-left"
        style={{
          top: 0,
          left: 0,
          width: isSpread ? `${designW}px` : '100%',
          height: isSpread ? `${designH}px` : '100%',
          transform: isSpread ? `scale(${scale})` : 'none',
        }}
      >
        {bgImage && (
          <TransformableElement
            id={`bg-${view}`}
            initialTransform={
              coverData[`${view}BgTransform` as keyof CoverData] as any || 
              { x: 0, y: 0, width: designW, height: designH, rotation: 0, scaleX: 1, scaleY: 1 }
            }
            isSelected={selectedLayerIds.includes(`bg-${view}`)}
            onSelect={(id) => handleShiftSelect(id)}
            onTransformChange={(_, transform) => updateCover({ [`${view}BgTransform`]: transform })}
            locked={false}
            containerRef={canvasRef}
            containerScale={scale}
            minWidth={20}
            minHeight={20}
          >
            <img src={bgImage} className="w-full h-full object-cover pointer-events-none select-none" style={getFilterStyle()} draggable={false} />
          </TransformableElement>
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
              <TransformableElement
                id="master-banner"
                initialTransform={coverData.bannerTransform || { x: 0, y: 0, width: 600, height: 32, rotation: 0, scaleX: 1, scaleY: 1 }}
                isSelected={selectedLayerIds.includes("master-banner")}
                onSelect={(id) => handleShiftSelect(id)}
                onTransformChange={(_, transform) => updateCover({ bannerTransform: transform })}
                locked={false}
                containerRef={canvasRef}
                containerScale={scale}
              >
                <div 
                  className="w-full h-full flex items-center justify-between px-2 text-white"
                  style={{ backgroundColor: coverData.bannerBgColor }}
                >
                  {editingMasterId === "master-publisher" ? (
                    <input
                      autoFocus
                      className="text-xs font-bold bg-transparent outline-none border-b border-white/50 text-white w-1/2"
                      value={coverData.publisherName}
                      onChange={(e) => updateCover({ publisherName: e.target.value })}
                      onBlur={() => setEditingMasterId(null)}
                      onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter" || e.key === "Escape") setEditingMasterId(null); }}
                    />
                  ) : (
                    <span className="text-xs font-bold cursor-text" onDoubleClick={(e) => { e.stopPropagation(); setEditingMasterId("master-publisher"); }}>{coverData.publisherName}</span>
                  )}
                  {editingMasterId === "master-tagline" ? (
                    <input
                      autoFocus
                      className="text-xs bg-transparent outline-none border-b border-white/50 text-white w-1/2 text-right"
                      value={coverData.tagline}
                      onChange={(e) => updateCover({ tagline: e.target.value })}
                      onBlur={() => setEditingMasterId(null)}
                      onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter" || e.key === "Escape") setEditingMasterId(null); }}
                    />
                  ) : (
                    <span className="text-xs cursor-text" onDoubleClick={(e) => { e.stopPropagation(); setEditingMasterId("master-tagline"); }}>{coverData.tagline}</span>
                  )}
                </div>
              </TransformableElement>
            )}
            
            {coverData.showPriceBox && (
              <TransformableElement
                id="master-price"
                initialTransform={coverData.priceBoxTransform || { x: 540, y: 4, width: 50, height: 50, rotation: 0, scaleX: 1, scaleY: 1 }}
                isSelected={selectedLayerIds.includes("master-price")}
                onSelect={(id) => handleShiftSelect(id)}
                onTransformChange={(_, transform) => updateCover({ priceBoxTransform: transform })}
                locked={false}
                containerRef={canvasRef}
                containerScale={scale}
              >
                <div className="w-full h-full bg-white border-2 border-black flex items-center justify-center">
                  {editingMasterId === "master-price" ? (
                    <input
                      autoFocus
                      className="text-xs font-bold text-black bg-transparent outline-none border-b border-black/50 w-full text-center"
                      value={coverData.priceText}
                      onChange={(e) => updateCover({ priceText: e.target.value })}
                      onBlur={() => setEditingMasterId(null)}
                      onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter" || e.key === "Escape") setEditingMasterId(null); }}
                    />
                  ) : (
                    <span className="text-xs font-bold text-black cursor-text" onDoubleClick={(e) => { e.stopPropagation(); setEditingMasterId("master-price"); }}>{coverData.priceText}</span>
                  )}
                </div>
              </TransformableElement>
            )}
            
            {coverData.issueNumber && (
              <TransformableElement
                id="master-issue"
                initialTransform={coverData.issueNumberTransform || { x: 4, y: 4, width: 60, height: 40, rotation: 0, scaleX: 1, scaleY: 1 }}
                isSelected={selectedLayerIds.includes("master-issue")}
                onSelect={(id) => handleShiftSelect(id)}
                onTransformChange={(_, transform) => updateCover({ issueNumberTransform: transform })}
                locked={false}
                containerRef={canvasRef}
                containerScale={scale}
              >
                <div className="w-full h-full flex items-center justify-center">
                  {editingMasterId === "master-issue" ? (
                    <input
                      autoFocus
                      className="text-2xl font-bold bg-transparent outline-none border-b border-white/50 w-full text-center"
                      style={{ color: coverData.titleColor, fontFamily: coverData.titleFont }}
                      value={coverData.issueNumber}
                      onChange={(e) => updateCover({ issueNumber: e.target.value })}
                      onBlur={() => setEditingMasterId(null)}
                      onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter" || e.key === "Escape") setEditingMasterId(null); }}
                    />
                  ) : (
                    <span className="text-2xl font-bold cursor-text" style={{ color: coverData.titleColor, fontFamily: coverData.titleFont }} onDoubleClick={(e) => { e.stopPropagation(); setEditingMasterId("master-issue"); }}>
                      {coverData.issueNumber}
                    </span>
                  )}
                </div>
              </TransformableElement>
            )}
            
            <TransformableElement
              id="master-title"
              initialTransform={coverData.titleTransform || { x: 100, y: 80, width: 400, height: 80, rotation: 0, scaleX: 1, scaleY: 1 }}
              isSelected={selectedLayerIds.includes("master-title")}
              onSelect={(id) => handleShiftSelect(id)}
              onTransformChange={(_, transform) => updateCover({ titleTransform: transform })}
              locked={false}
              containerRef={canvasRef}
              containerScale={scale}
              style={{ zIndex: (coverData.elementZOrder || []).indexOf("master-title") + 10 }}
            >
              <div className="w-full h-full flex items-center justify-center text-center">
                {editingMasterId === "master-title" ? (
                  <input
                    autoFocus
                    className="font-bold uppercase tracking-tight leading-none bg-transparent outline-none border-b-2 border-white/50 w-full text-center"
                    style={{ fontFamily: coverData.titleFont, color: coverData.titleColor, fontSize: `${coverData.titleSize}px` }}
                    value={coverData.title}
                    onChange={(e) => updateCover({ title: e.target.value })}
                    onBlur={() => setEditingMasterId(null)}
                    onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter" || e.key === "Escape") setEditingMasterId(null); }}
                  />
                ) : (
                  <TextElement
                    id="master-title-text"
                    text={coverData.title}
                    fontSize={coverData.titleSize}
                    fontFamily={coverData.titleFont}
                    color={coverData.titleColor}
                    textEffect={coverData.titleEffect as any}
                    textArch={coverData.titleArch}
                    strokeColor={coverData.titleStrokeColor}
                    strokeWidth={coverData.titleStrokeWidth}
                    fontWeight="bold"
                    textTransform="uppercase"
                    isEditing={false}
                    onEditStart={() => setEditingMasterId("master-title")}
                    onEditEnd={() => {}}
                    onChange={() => {}}
                  />
                )}
              </div>
            </TransformableElement>

            <TransformableElement
              id="master-subtitle"
              initialTransform={coverData.subtitleTransform || { x: 150, y: 170, width: 300, height: 40, rotation: 0, scaleX: 1, scaleY: 1 }}
              isSelected={selectedLayerIds.includes("master-subtitle")}
              onSelect={(id) => handleShiftSelect(id)}
              onTransformChange={(_, transform) => updateCover({ subtitleTransform: transform })}
              locked={false}
              containerRef={canvasRef}
              containerScale={scale}
              style={{ zIndex: (coverData.elementZOrder || []).indexOf("master-subtitle") + 10 }}
            >
              <div className="w-full h-full flex items-center justify-center text-center">
                {editingMasterId === "master-subtitle" ? (
                  <input
                    autoFocus
                    className="italic bg-transparent outline-none border-b border-white/50 w-full text-center"
                    style={{ fontFamily: coverData.subtitleFont, color: coverData.subtitleColor, fontSize: `${coverData.subtitleSize}px` }}
                    value={coverData.subtitle}
                    onChange={(e) => updateCover({ subtitle: e.target.value })}
                    onBlur={() => setEditingMasterId(null)}
                    onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter" || e.key === "Escape") setEditingMasterId(null); }}
                  />
                ) : (
                  <TextElement
                    id="master-subtitle-text"
                    text={coverData.subtitle}
                    fontSize={coverData.subtitleSize}
                    fontFamily={coverData.subtitleFont}
                    color={coverData.subtitleColor}
                    textEffect={coverData.subtitleEffect as any}
                    textArch={coverData.subtitleArch}
                    strokeColor={coverData.subtitleStrokeColor}
                    strokeWidth={coverData.subtitleStrokeWidth}
                    fontStyle="italic"
                    isEditing={false}
                    onEditStart={() => setEditingMasterId("master-subtitle")}
                    onEditEnd={() => {}}
                    onChange={() => {}}
                  />
                )}
              </div>
            </TransformableElement>

            <TransformableElement
              id="master-author"
              initialTransform={coverData.authorTransform || { x: 100, y: 650, width: 400, height: 40, rotation: 0, scaleX: 1, scaleY: 1 }}
              isSelected={selectedLayerIds.includes("master-author")}
              onSelect={(id) => handleShiftSelect(id)}
              onTransformChange={(_, transform) => updateCover({ authorTransform: transform })}
              locked={false}
              containerRef={canvasRef}
              containerScale={scale}
              style={{ zIndex: (coverData.elementZOrder || []).indexOf("master-author") + 10 }}
            >
              <div className="w-full h-full flex items-center justify-center text-center">
                {editingMasterId === "master-author" ? (
                  <input
                    autoFocus
                    className="font-medium tracking-widest uppercase bg-transparent outline-none border-b border-white/50 w-full text-center"
                    style={{ fontFamily: coverData.authorFont, color: coverData.authorColor, fontSize: `${coverData.authorSize}px` }}
                    value={coverData.author}
                    onChange={(e) => updateCover({ author: e.target.value })}
                    onBlur={() => setEditingMasterId(null)}
                    onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter" || e.key === "Escape") setEditingMasterId(null); }}
                  />
                ) : (
                  <TextElement
                    id="master-author-text"
                    text={coverData.author}
                    fontSize={coverData.authorSize}
                    fontFamily={coverData.authorFont}
                    color={coverData.authorColor}
                    textEffect={coverData.authorEffect as any}
                    textArch={coverData.authorArch}
                    strokeColor={coverData.authorStrokeColor}
                    strokeWidth={coverData.authorStrokeWidth}
                    fontWeight="bold"
                    textTransform="uppercase"
                    isEditing={false}
                    onEditStart={() => setEditingMasterId("master-author")}
                    onEditEnd={() => {}}
                    onChange={() => {}}
                  />
                )}
              </div>
            </TransformableElement>
          </>
        )}

        {view === "back" && (
          <>
            <TransformableElement
              id="master-blurb"
              initialTransform={coverData.backBlurbTransform || { x: 50, y: 100, width: 500, height: 500, rotation: 0, scaleX: 1, scaleY: 1 }}
              isSelected={selectedLayerIds.includes("master-blurb")}
              onSelect={(id) => handleShiftSelect(id)}
              onTransformChange={(_, transform) => updateCover({ backBlurbTransform: transform })}
              locked={false}
              containerRef={canvasRef}
              containerScale={scale}
            >
              <div className="w-full h-full flex items-center justify-center text-center p-4">
                {editingMasterId === "master-blurb" ? (
                  <textarea
                    autoFocus
                    className="leading-relaxed bg-transparent outline-none border border-white/30 w-full h-full resize-none p-2 text-center"
                    style={{ fontFamily: coverData.backBlurbFont, color: coverData.backBlurbColor, fontSize: `${coverData.backBlurbSize}px` }}
                    value={coverData.backBlurb}
                    onChange={(e) => updateCover({ backBlurb: e.target.value })}
                    onBlur={() => setEditingMasterId(null)}
                    onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Escape") setEditingMasterId(null); if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); setEditingMasterId(null); } }}
                  />
                ) : (
                  <p 
                    style={{ fontFamily: coverData.backBlurbFont, color: coverData.backBlurbColor, fontSize: `${coverData.backBlurbSize}px` }}
                    className="leading-relaxed cursor-text"
                    onDoubleClick={(e) => { e.stopPropagation(); setEditingMasterId("master-blurb"); }}
                  >
                    {coverData.backBlurb}
                  </p>
                )}
              </div>
            </TransformableElement>
            <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10">
              {coverData.isbn && generateEAN13Barcode(coverData.isbn) ? (
                <img src={generateEAN13Barcode(coverData.isbn)} alt="ISBN Barcode" className="h-16 object-contain" />
              ) : (
                <div className="w-32 h-10 bg-white/10 flex items-center justify-center text-xs text-white/50 font-mono">
                  ISBN
                </div>
              )}
            </div>
          </>
        )}

        {view === "spine" && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            {editingMasterId === "master-spine" ? (
              <input
                autoFocus
                className="text-lg font-bold tracking-widest uppercase bg-transparent outline-none border border-white/30 text-center"
                style={{ fontFamily: coverData.spineFont, color: coverData.spineColor, writingMode: "vertical-rl", textOrientation: "mixed" }}
                value={coverData.spineText}
                onChange={(e) => updateCover({ spineText: e.target.value })}
                onBlur={() => setEditingMasterId(null)}
                onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter" || e.key === "Escape") setEditingMasterId(null); }}
              />
            ) : (
              <p 
                style={{ fontFamily: coverData.spineFont, color: coverData.spineColor, writingMode: "vertical-rl", textOrientation: "mixed" }}
                className="text-lg font-bold tracking-widest uppercase cursor-text"
                onDoubleClick={(e) => { e.stopPropagation(); setEditingMasterId("master-spine"); }}
              >
                {coverData.spineText} — {coverData.author}
              </p>
            )}
          </div>
        )}

        {(() => {
          const zOrder = coverData.elementZOrder || [];
          const imgMap = new Map(imageLayers.map(il => [il.id, il]));
          const txtMap = new Map(layers.map(tl => [tl.id, tl]));
          const allIds = new Set([...imageLayers.map(il => il.id), ...layers.map(tl => tl.id)]);
          const orderedIds = [...zOrder.filter(id => allIds.has(id))];
          allIds.forEach(id => { if (!orderedIds.includes(id)) orderedIds.push(id); });

          return orderedIds.map((id) => {
            const globalIdx = zOrder.indexOf(id);
            const zIdx = (globalIdx >= 0 ? globalIdx : zOrder.length) + 10;
            const imgLayer = imgMap.get(id);
            if (imgLayer) {
              return (
                <TransformableElement
                  key={imgLayer.id}
                  id={imgLayer.id}
                  initialTransform={imgLayer.transform}
                  isSelected={selectedLayerIds.includes(imgLayer.id)}
                  onSelect={(lid) => handleShiftSelect(lid)}
                  onTransformChange={(lid, transform) => updateImageLayer(view, lid, { transform })}
                  onDelete={(lid) => deleteImageLayer(view, lid)}
                  locked={imgLayer.locked}
                  containerRef={canvasRef}
                  containerScale={scale}
                  style={{ zIndex: zIdx }}
                >
                  <img
                    src={imgLayer.url}
                    alt={imgLayer.name}
                    className="w-full h-full object-contain pointer-events-none select-none"
                    style={{ opacity: imgLayer.opacity }}
                    draggable={false}
                  />
                </TransformableElement>
              );
            }
            const layer = txtMap.get(id);
            if (layer) {
              return (
                <TransformableElement
                  key={layer.id}
                  id={layer.id}
                  initialTransform={layer.transform}
                  isSelected={selectedLayerIds.includes(layer.id)}
                  onSelect={(lid) => handleShiftSelect(lid)}
                  onTransformChange={(lid, transform) => updateTextLayer(view, lid, { transform })}
                  onDelete={(lid) => deleteTextLayer(view, lid)}
                  locked={layer.locked}
                  containerRef={canvasRef}
                  containerScale={scale}
                  style={{ zIndex: zIdx }}
                >
                  <TextElement
                    id={layer.id}
                    text={layer.text}
                    fontSize={layer.fontSize}
                    fontFamily={layer.fontFamily}
                    color={layer.color}
                    textArch={layer.textArch}
                    textEffect={layer.textEffect as any}
                    strokeColor={layer.strokeColor}
                    strokeWidth={layer.strokeWidth}
                    shadowColor={layer.shadowColor}
                    fontWeight={layer.fontWeight as any}
                    fontStyle={layer.fontStyle as any}
                    textTransform={layer.textTransform as any}
                    isEditing={editingTextId === layer.id}
                    onEditStart={() => setEditingTextId(layer.id)}
                    onEditEnd={() => setEditingTextId(null)}
                    onChange={(lid, text) => updateTextLayer(view, lid, { text })}
                  />
                </TransformableElement>
              );
            }
            return null;
          });
        })()}

        {showGuides && view !== "spine" && (
          <>
            <div className="absolute inset-0 pointer-events-none z-[60]" style={{ border: "2px dashed rgba(255,0,0,0.6)", margin: "-9px" }} title="Bleed (0.125&quot;)" />
            <div className="absolute inset-0 pointer-events-none z-[60]" style={{ border: "1px dashed rgba(0,120,255,0.7)" }} title="Trim Line" />
            <div className="absolute pointer-events-none z-[60]" style={{ inset: "18px", border: "1px dashed rgba(0,200,80,0.6)" }} title="Safe Zone (0.25&quot;)" />
            <div className="absolute top-0 left-0 text-[8px] text-red-400 bg-black/60 px-1 z-[61]">BLEED</div>
            <div className="absolute top-0 right-0 text-[8px] text-blue-400 bg-black/60 px-1 z-[61]">TRIM</div>
            <div className="absolute bottom-0 left-0 text-[8px] text-green-400 bg-black/60 px-1 z-[61]">SAFE</div>
          </>
        )}
      </div>
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
          <div className="flex gap-2 items-center">
            <div className="flex border border-zinc-700 mr-1">
              <button onClick={undo} className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white" title="Undo (Ctrl+Z)" data-testid="button-undo">
                <Undo2 className="w-4 h-4" />
              </button>
              <button onClick={redo} className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white" title="Redo (Ctrl+Shift+Z)" data-testid="button-redo">
                <Redo2 className="w-4 h-4" />
              </button>
            </div>
            {selectedLayerId && (
              <div className="flex border border-zinc-700 mr-1">
                <button onClick={() => alignElements("left")} className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white" title="Align Left">
                  <AlignHorizontalJustifyStart className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => alignElements("center-h")} className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white" title="Align Center">
                  <AlignHorizontalJustifyCenter className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => alignElements("right")} className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white" title="Align Right">
                  <AlignHorizontalJustifyEnd className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => alignElements("top")} className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white" title="Align Top">
                  <AlignVerticalJustifyStart className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => alignElements("center-v")} className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white" title="Align Middle">
                  <AlignVerticalJustifyCenter className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => alignElements("bottom")} className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white" title="Align Bottom">
                  <AlignVerticalJustifyEnd className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {selectedLayerId && (
              <div className="flex border border-zinc-700 mr-1">
                <button onClick={() => moveLayerOrder(selectedLayerId, "front")} className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white" title="Bring to Front">
                  <ChevronsUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => moveLayerOrder(selectedLayerId, "forward")} className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white" title="Bring Forward">
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => moveLayerOrder(selectedLayerId, "backward")} className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white" title="Send Backward">
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => moveLayerOrder(selectedLayerId, "back")} className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white" title="Send to Back">
                  <ChevronsDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <button
              onClick={() => setShowGuides(!showGuides)}
              className={`p-2 border ${showGuides ? "bg-cyan-600 border-cyan-500 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white"}`}
              title="Bleed/Trim/Safe Guides"
              data-testid="button-toggle-guides"
            >
              <Ruler className="w-4 h-4" />
            </button>
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
              className="px-3 py-2 bg-white text-black text-sm font-bold flex items-center gap-2 hover:bg-zinc-200"
            >
              <Download className="w-4 h-4" /> PNG
            </button>
            <button 
              onClick={handlePDFExport}
              className="px-3 py-2 bg-amber-500 text-black text-sm font-bold flex items-center gap-2 hover:bg-amber-400"
              data-testid="button-export-pdf"
            >
              <FileText className="w-4 h-4" /> PDF
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
                    <input 
                      type="text" 
                      placeholder="ISBN (13 digits for barcode)"
                      value={coverData.isbn}
                      onChange={(e) => updateCover({ isbn: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                      data-testid="input-isbn"
                    />
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
                  <label className="text-xs font-bold uppercase text-zinc-400 mb-2 block">Text Effects</label>
                  {(["title", "subtitle", "author"] as const).map(field => {
                    const effectKey = `${field}Effect` as keyof CoverData;
                    const archKey = `${field}Arch` as keyof CoverData;
                    const strokeColorKey = `${field}StrokeColor` as keyof CoverData;
                    const strokeWidthKey = `${field}StrokeWidth` as keyof CoverData;
                    const label = field.charAt(0).toUpperCase() + field.slice(1);
                    return (
                      <div key={field} className="space-y-1 mb-3">
                        <span className="text-[10px] text-zinc-500">{label}</span>
                        <select
                          value={(coverData[effectKey] as string) || "none"}
                          onChange={(e) => updateCover({ [effectKey]: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-600 p-1 text-xs"
                          data-testid={`select-${field}-effect`}
                        >
                          {["none", "comic", "outline", "3d", "retro", "glow", "neon", "fire", "ice"].map(e => (
                            <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
                          ))}
                        </select>
                        {["outline", "comic", "3d", "retro"].includes((coverData[effectKey] as string) || "none") && (
                          <div className="flex gap-2">
                            <input type="color" value={(coverData[strokeColorKey] as string) || "#000000"} onChange={(e) => updateCover({ [strokeColorKey]: e.target.value })} className="w-8 h-6 bg-zinc-900 border border-zinc-600 cursor-pointer" />
                            <input type="number" value={(coverData[strokeWidthKey] as number) || 2} onChange={(e) => updateCover({ [strokeWidthKey]: Number(e.target.value) })} className="flex-1 bg-zinc-900 border border-zinc-600 p-1 text-xs text-center" min="0" max="10" step="0.5" />
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-zinc-600">Arch</span>
                          <input type="range" min="-100" max="100" step="5" value={(coverData[archKey] as number) || 0} onChange={(e) => updateCover({ [archKey]: Number(e.target.value) })} className="flex-1 h-1 accent-cyan-500" />
                          <span className="text-[9px] text-zinc-600 w-6 text-right">{(coverData[archKey] as number) || 0}</span>
                        </div>
                      </div>
                    );
                  })}
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

                {(() => {
                  const viewKey = activeView === "spread" ? "front" : activeView;
                  const bgImg = coverData[`${viewKey}Image` as keyof CoverData] as string;
                  if (!bgImg) return null;
                  return (
                    <div className="pt-4 border-t border-zinc-700">
                      <label className="text-xs font-bold uppercase text-zinc-400 mb-2 block">Background Image</label>
                      <div 
                        onClick={() => setSelectedLayerId(`bg-${viewKey}`)}
                        className={`p-2 border cursor-pointer flex items-center gap-2 ${selectedLayerId === `bg-${viewKey}` ? "border-cyan-500 bg-zinc-800" : "border-zinc-700 hover:border-zinc-500"}`}
                        data-testid="bg-image-layer-item"
                      >
                        <img src={bgImg} alt="Background" className="w-8 h-8 object-cover bg-zinc-900 border border-zinc-700" />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium">Background</span>
                          <p className="text-[10px] text-zinc-500">Click to select, then drag to move</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

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
                
                {selectedLayerId && getMasterElementInfo(selectedLayerId) && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[70] bg-zinc-900 border border-zinc-700 p-2 flex items-center gap-2 shadow-xl" data-testid="floating-toolbar">
                    {(() => {
                      const info = getMasterElementInfo(selectedLayerId)!;
                      return (
                        <>
                          <select
                            value={(coverData as any)[info.fontKey]}
                            onChange={(e) => updateCover({ [info.fontKey]: e.target.value })}
                            className="bg-zinc-800 border border-zinc-600 text-xs p-1 max-w-[120px]"
                          >
                            {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                          </select>
                          <input
                            type="number"
                            value={(coverData as any)[info.sizeKey]}
                            onChange={(e) => updateCover({ [info.sizeKey]: Number(e.target.value) })}
                            className="w-14 bg-zinc-800 border border-zinc-600 text-xs p-1 text-center"
                            min="8" max="200"
                          />
                          <input
                            type="color"
                            value={(coverData as any)[info.colorKey]}
                            onChange={(e) => updateCover({ [info.colorKey]: e.target.value })}
                            className="w-7 h-7 bg-zinc-800 border border-zinc-600 cursor-pointer"
                          />
                          <select
                            value={(coverData as any)[info.effectKey] || "none"}
                            onChange={(e) => updateCover({ [info.effectKey]: e.target.value })}
                            className="bg-zinc-800 border border-zinc-600 text-xs p-1"
                          >
                            {["none", "comic", "outline", "3d", "retro", "glow", "neon", "fire", "ice"].map(e => (
                              <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
                            ))}
                          </select>
                        </>
                      );
                    })()}
                  </div>
                )}
                <div ref={coverContentRef}>
                {activeView === "spread" ? (
                  <div className="flex items-center shadow-2xl" style={{ perspective: "1000px" }}>
                    {renderCoverSection("back", "480px", "720px")}
                    {renderCoverSection("spine", "64px", "720px")}
                    {renderCoverSection("front", "480px", "720px")}
                  </div>
                ) : activeView === "front" ? (
                  renderCoverSection("front", "600px", "900px")
                ) : activeView === "back" ? (
                  renderCoverSection("back", "600px", "900px")
                ) : (
                  renderCoverSection("spine", "80px", "900px")
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
              {selectedLayerId && (
                <>
                  <ContextMenuSeparator className="bg-zinc-700" />
                  <ContextMenuItem onClick={() => moveLayerOrder(selectedLayerId, "front")} className="hover:bg-zinc-800 cursor-pointer">
                    <ChevronsUp className="w-4 h-4 mr-2" /> Bring to Front
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => moveLayerOrder(selectedLayerId, "forward")} className="hover:bg-zinc-800 cursor-pointer">
                    <ChevronUp className="w-4 h-4 mr-2" /> Bring Forward
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => moveLayerOrder(selectedLayerId, "backward")} className="hover:bg-zinc-800 cursor-pointer">
                    <ChevronDown className="w-4 h-4 mr-2" /> Send Backward
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => moveLayerOrder(selectedLayerId, "back")} className="hover:bg-zinc-800 cursor-pointer">
                    <ChevronsDown className="w-4 h-4 mr-2" /> Send to Back
                  </ContextMenuItem>
                </>
              )}
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
                const imgKey = drawingTarget === "front" ? "frontImage" : drawingTarget === "back" ? "backImage" : "spineImage";
                const tKey = `${drawingTarget}BgTransform`;
                const dW2 = drawingTarget === "spine" ? 80 : 600;
                const dH2 = drawingTarget === "spine" ? 900 : 900;
                setCoverData(prev => ({ ...prev, [imgKey]: rasterData, [tKey]: { x: 0, y: 0, width: dW2, height: dH2, rotation: 0, scaleX: 1, scaleY: 1 } }));
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
