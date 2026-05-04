import { Layout } from "@/components/layout/Layout";
import { captureElement } from "@/lib/canvasCapture";
import { 
  Save, Download, RefreshCw, Sparkles, Package, RotateCw, ImageIcon, 
  Wand2, ArrowLeft, Upload, Type, Palette, Settings, X, Plus, Trash2,
  Copy, Layers, Eye, Pen, Share2, Printer, Users, Trophy, Grid3X3, Film, Music, Volume2
} from "lucide-react";
import { FxBrowserPanel } from "@/components/FxBrowserPanel";
import { fxStudioApi } from "@/lib/api";
import type { FxEffect } from "@/lib/api";
import { useFxStudio } from "@/hooks/useFxStudio";
import cardArt from "@assets/generated_images/cyberpunk_trading_card_art.png";
import backCoverArt from "@assets/generated_images/noir_comic_panel.png";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { AIGenerator } from "@/components/tools/AIGenerator";
import { DrawingWorkspace } from "@/components/tools/DrawingWorkspace";
import { useProject, useUpdateProject, useCreateProject } from "@/hooks/useProjects";
import { useAssetLibrary } from "@/contexts/AssetLibraryContext";
import { usePostAction } from "@/contexts/PostActionContext";
import { toast } from "sonner";
import { useSyncToCoMiXX } from "@/hooks/useSyncToCoMiXX";
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

const FONT_OPTIONS = [
  { value: "Inter, sans-serif", label: "Inter", category: "clean" },
  { value: "'Space Grotesk', sans-serif", label: "Space Grotesk", category: "clean" },
  { value: "'Bangers', cursive", label: "Bangers", category: "comic" },
  { value: "'Permanent Marker', cursive", label: "Permanent Marker", category: "comic" },
  { value: "'Luckiest Guy', cursive", label: "Luckiest Guy", category: "comic" },
  { value: "'Londrina Solid', cursive", label: "Londrina Solid", category: "comic" },
  { value: "'Gloria Hallelujah', cursive", label: "Gloria Hallelujah", category: "comic" },
  { value: "'Bungee', cursive", label: "Bungee", category: "bold" },
  { value: "'Black Ops One', cursive", label: "Black Ops One", category: "bold" },
  { value: "'Russo One', sans-serif", label: "Russo One", category: "bold" },
  { value: "'Bebas Neue', sans-serif", label: "Bebas Neue", category: "bold" },
  { value: "'Anton', sans-serif", label: "Anton", category: "bold" },
  { value: "'Oswald', sans-serif", label: "Oswald", category: "bold" },
  { value: "'Titan One', cursive", label: "Titan One", category: "bold" },
  { value: "'Alfa Slab One', cursive", label: "Alfa Slab One", category: "bold" },
  { value: "'Archivo Black', sans-serif", label: "Archivo Black", category: "bold" },
  { value: "'Audiowide', cursive", label: "Audiowide", category: "scifi" },
  { value: "'Orbitron', sans-serif", label: "Orbitron", category: "scifi" },
  { value: "'Press Start 2P', cursive", label: "Press Start 2P", category: "scifi" },
  { value: "'Silkscreen', cursive", label: "Silkscreen", category: "scifi" },
  { value: "'VT323', monospace", label: "VT323", category: "scifi" },
  { value: "'Creepster', cursive", label: "Creepster", category: "horror" },
  { value: "'Nosifer', cursive", label: "Nosifer", category: "horror" },
  { value: "'Metal Mania', cursive", label: "Metal Mania", category: "horror" },
  { value: "'Fugaz One', cursive", label: "Fugaz One", category: "action" },
  { value: "'Racing Sans One', cursive", label: "Racing Sans One", category: "action" },
  { value: "'Faster One', cursive", label: "Faster One", category: "action" },
  { value: "'Special Elite', cursive", label: "Special Elite", category: "vintage" },
  { value: "'Rye', cursive", label: "Rye", category: "vintage" },
  { value: "'Monoton', cursive", label: "Monoton", category: "vintage" },
  { value: "'Satisfy', cursive", label: "Satisfy", category: "script" },
  { value: "'Pacifico', cursive", label: "Pacifico", category: "script" },
  { value: "'Lobster', cursive", label: "Lobster", category: "script" },
  { value: "'Fredoka', sans-serif", label: "Fredoka", category: "fun" },
  { value: "'Jua', sans-serif", label: "Jua", category: "fun" },
  { value: "'Impact', sans-serif", label: "Impact", category: "system" },
  { value: "Georgia, serif", label: "Georgia", category: "system" },
  { value: "'Courier New', monospace", label: "Courier New", category: "system" },
];

const CARD_TYPES = ["Character", "Weapon", "Spell", "Event", "Location", "Item"];
const SPORTS_CARD_TYPES = ["Player", "Coach", "MVP", "Rookie", "Team", "All-Star", "Legend", "Captain"];
const RARITIES = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"];

const SPORTS_LIST = [
  "Baseball", "Basketball", "Football", "Soccer", "Hockey", "Volleyball",
  "Track & Field", "Swimming", "Tennis", "Lacrosse", "Wrestling", "Softball",
  "Cheerleading", "Gymnastics", "Cross Country", "Other"
];

const SPORTS_POSITIONS: Record<string, string[]> = {
  Baseball: ["Pitcher", "Catcher", "1st Base", "2nd Base", "3rd Base", "Shortstop", "Left Field", "Center Field", "Right Field", "DH"],
  Basketball: ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"],
  Football: ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "CB", "Safety", "Kicker", "Punter"],
  Soccer: ["Goalkeeper", "Defender", "Midfielder", "Forward", "Striker", "Winger"],
  Hockey: ["Center", "Left Wing", "Right Wing", "Defenseman", "Goalie"],
  Volleyball: ["Setter", "Outside Hitter", "Middle Blocker", "Libero", "Opposite Hitter"],
  "Track & Field": ["Sprinter", "Distance", "Jumper", "Thrower", "Hurdler", "Multi-Event"],
  Swimming: ["Freestyle", "Backstroke", "Breaststroke", "Butterfly", "IM", "Relay"],
  Tennis: ["Singles", "Doubles"],
  Lacrosse: ["Attack", "Midfield", "Defense", "Goalie"],
  Wrestling: ["Lightweight", "Middleweight", "Heavyweight"],
  Softball: ["Pitcher", "Catcher", "Infield", "Outfield"],
  Cheerleading: ["Flyer", "Base", "Back Spot", "Tumbler"],
  Gymnastics: ["All-Around", "Floor", "Vault", "Bars", "Beam"],
  "Cross Country": ["Varsity", "JV", "Open"],
  Other: ["Player", "Captain", "Starter", "Reserve"],
};

const PACK_TEMPLATES = [
  { id: "starter", name: "Starter Pack", cards: 10, guaranteed: ["Rare"], distribution: { Common: 5, Uncommon: 3, Rare: 2 } },
  { id: "booster", name: "Booster Pack", cards: 5, guaranteed: ["Uncommon"], distribution: { Common: 3, Uncommon: 1, Rare: 1 } },
  { id: "premium", name: "Premium Pack", cards: 7, guaranteed: ["Epic"], distribution: { Uncommon: 2, Rare: 3, Epic: 2 } },
  { id: "collectors", name: "Collector's Box", cards: 15, guaranteed: ["Legendary"], distribution: { Rare: 5, Epic: 6, Legendary: 4 } },
  { id: "mega", name: "Mega Pack", cards: 20, guaranteed: ["Mythic"], distribution: { Common: 5, Uncommon: 5, Rare: 5, Epic: 3, Legendary: 1, Mythic: 1 } },
  { id: "custom", name: "Custom Pack", cards: 5, guaranteed: [], distribution: { Common: 2, Uncommon: 1, Rare: 1, Epic: 1 } },
];

const SPORTS_PACK_TEMPLATES = [
  { id: "team-roster", name: "Team Roster", cards: 15, description: "Full team roster cards" },
  { id: "starting-lineup", name: "Starting Lineup", cards: 5, description: "Starting 5 / First team" },
  { id: "varsity-squad", name: "Varsity Squad", cards: 12, description: "Varsity team set" },
  { id: "jv-squad", name: "JV Squad", cards: 12, description: "Junior varsity set" },
  { id: "all-stars", name: "All-Stars Pack", cards: 10, description: "Best of the best" },
  { id: "senior-night", name: "Senior Night", cards: 8, description: "Senior class tribute" },
  { id: "championship", name: "Championship Set", cards: 20, description: "Full season roster" },
  { id: "custom-team", name: "Custom Team", cards: 10, description: "Build your own set" },
];

const RARITY_COLORS: { [key: string]: string } = {
  Common: "#6b7280",
  Uncommon: "#22c55e",
  Rare: "#3b82f6",
  Epic: "#a855f7",
  Legendary: "#f59e0b",
  Mythic: "#ef4444",
};

const RARITY_GLOW: { [key: string]: string } = {
  Common: "none",
  Uncommon: "0 0 8px rgba(34,197,94,0.4)",
  Rare: "0 0 15px rgba(59,130,246,0.5), 0 0 30px rgba(59,130,246,0.2)",
  Epic: "0 0 20px rgba(168,85,247,0.5), 0 0 40px rgba(168,85,247,0.2)",
  Legendary: "0 0 25px rgba(245,158,11,0.6), 0 0 50px rgba(245,158,11,0.3), 0 0 75px rgba(245,158,11,0.1)",
  Mythic: "0 0 30px rgba(239,68,68,0.6), 0 0 60px rgba(239,68,68,0.3), 0 0 90px rgba(239,68,68,0.1)",
};

const RARITY_PATTERNS: { [key: string]: string } = {
  Common: "none",
  Uncommon: "dots",
  Rare: "stripes",
  Epic: "crosshatch",
  Legendary: "diamonds",
  Mythic: "stars",
};

const RARITY_ODDS: { [key: string]: number } = {
  Common: 50,
  Uncommon: 25,
  Rare: 15,
  Epic: 7,
  Legendary: 2.5,
  Mythic: 0.5,
};

const CARD_TEMPLATES = [
  { id: "mtg-style", name: "Magic: The Gathering Style", borderColor: "#1a1a1a", accentColor: "#C9A227", frameStyle: "classic" },
  { id: "pokemon-style", name: "Pokemon Style", borderColor: "#FFD93D", accentColor: "#FF6B6B", frameStyle: "rounded" },
  { id: "yugioh-style", name: "Yu-Gi-Oh! Style", borderColor: "#8B4513", accentColor: "#FFD700", frameStyle: "angular" },
  { id: "hearthstone-style", name: "Hearthstone Style", borderColor: "#4A3728", accentColor: "#FF9F1C", frameStyle: "ornate" },
  { id: "cyberpunk", name: "Cyberpunk Neon", borderColor: "#000000", accentColor: "#00FFFF", frameStyle: "tech" },
  { id: "noir-classic", name: "Noir Classic", borderColor: "#1a1a1a", accentColor: "#FFFFFF", frameStyle: "minimal" },
  { id: "vintage-sepia", name: "Vintage Sepia", borderColor: "#5C4033", accentColor: "#D4A574", frameStyle: "aged" },
  { id: "horror-blood", name: "Horror/Blood", borderColor: "#1a0000", accentColor: "#8B0000", frameStyle: "splatter" },
  { id: "fantasy-gold", name: "Fantasy Gold", borderColor: "#2C1810", accentColor: "#FFD700", frameStyle: "ornate" },
  { id: "scifi-hologram", name: "Sci-Fi Hologram", borderColor: "#0a0a2e", accentColor: "#00FF88", frameStyle: "holographic" },
  { id: "minimalist-white", name: "Minimalist White", borderColor: "#FFFFFF", accentColor: "#000000", frameStyle: "clean" },
  { id: "dark-souls", name: "Dark Souls Style", borderColor: "#1a1a1a", accentColor: "#FF6600", frameStyle: "gothic" },
];

const SPORTS_CARD_TEMPLATES = [
  { id: "baseball-classic", name: "Baseball Classic", borderColor: "#1a3a1a", accentColor: "#C41E3A", frameStyle: "classic", sport: "Baseball" },
  { id: "basketball-court", name: "Basketball Court", borderColor: "#FF6B00", accentColor: "#1D1160", frameStyle: "rounded", sport: "Basketball" },
  { id: "football-gridiron", name: "Football Gridiron", borderColor: "#013369", accentColor: "#D50A0A", frameStyle: "angular", sport: "Football" },
  { id: "soccer-pitch", name: "Soccer Pitch", borderColor: "#006633", accentColor: "#FFFFFF", frameStyle: "classic", sport: "Soccer" },
  { id: "hockey-ice", name: "Hockey Ice", borderColor: "#002868", accentColor: "#BF0A30", frameStyle: "tech", sport: "Hockey" },
  { id: "varsity-classic", name: "Varsity Classic", borderColor: "#2C2C2C", accentColor: "#CDA434", frameStyle: "ornate", sport: "All" },
  { id: "retro-sports", name: "Retro Sports", borderColor: "#5C4033", accentColor: "#D4A574", frameStyle: "aged", sport: "All" },
  { id: "neon-athlete", name: "Neon Athlete", borderColor: "#0a0a0a", accentColor: "#00FF88", frameStyle: "tech", sport: "All" },
  { id: "team-spirit", name: "Team Spirit", borderColor: "#1a1a4a", accentColor: "#FFD700", frameStyle: "ornate", sport: "All" },
  { id: "rookie-card", name: "Rookie Card", borderColor: "#FFFFFF", accentColor: "#FF1493", frameStyle: "clean", sport: "All" },
];

const CARD_FILTERS = {
  contrast: 50,
  brightness: 50,
  saturation: 100,
  grayscale: false,
  sepia: false,
  halftone: false,
  grain: false,
  vignette: false,
};

interface CardData {
  id: string;
  name: string;
  type: string;
  rarity: string;
  frontImage: string;
  backImage: string;
  attack: number;
  defense: number;
  cost: number;
  lore: string;
  effect: string;
  nameFont: string;
  statsFont: string;
  loreFont: string;
  borderColor: string;
  accentColor: string;
  templateId: string;
  filters: typeof CARD_FILTERS;
  nameArch: number;
  imageOffsetX: number;
  imageOffsetY: number;
  imageScale: number;
  imageRotation: number;
  audioUrl?: string;
  cardMode?: "tcg" | "sports";
  sport?: string;
  position?: string;
  jerseyNumber?: string;
  teamName?: string;
  season?: string;
  height?: string;
  weight?: string;
  statLine?: string;
  grade?: string;
  school?: string;
  logo?: string;
  logoPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  logoSize?: number;
  logoOpacity?: number;
}

interface PackData {
  name: string;
  cardsPerPack: number;
  rarityDistribution: { [key: string]: number };
  cards: CardData[];
  packArt: string;
  templateId: string;
  seriesName: string;
  setNumber: string;
  totalInSet: number;
  guaranteedRarities: string[];
  price: string;
  packMode: "tcg" | "sports";
  teamName: string;
  sport: string;
  season: string;
  school: string;
  teamColors: { primary: string; secondary: string };
  coachName: string;
  mascot: string;
}

export default function CardCreator() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const projectId = searchParams.get('id');
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const effectiveProjectId = projectId || createdProjectId;
  
  const { data: project } = useProject(effectiveProjectId || '');
  const updateProject = useUpdateProject();
  const createProject = useCreateProject();
  const { importFromFile } = useAssetLibrary();
  const { showWhatsNext, fireXpAction } = usePostAction();

  const [mode, setMode] = useState<"single" | "pack">("single");
  const [side, setSide] = useState<"front" | "back">("front");
  const [showAIGen, setShowAIGen] = useState(false);
  const [showDrawing, setShowDrawing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showFxBrowser, setShowFxBrowser] = useState(false);

  const { syncAsset, isSyncing: isSyncingToCoMiXX } = useSyncToCoMiXX({
    defaultTag: "character-art",
    sourceMode: "/creator/card",
    projectId: effectiveProjectId || undefined,
  });
  const [isCreating, setIsCreating] = useState(!effectiveProjectId);
  const creationAttempted = useRef(false);
  const [activeSection, setActiveSection] = useState<"design" | "stats" | "lore" | "style">("design");
  const [cardMode, setCardMode] = useState<"tcg" | "sports">("tcg");

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const cardPreviewRef = useRef<HTMLDivElement>(null);

  const fxStudio = useFxStudio({
    projectId: effectiveProjectId || undefined,
  });

  const switchCardMode = (newMode: "tcg" | "sports") => {
    setCardMode(newMode);
    if (newMode === "sports") {
      setCardData(prev => ({
        ...prev,
        cardMode: "sports",
        type: "Player",
        sport: "Basketball",
        position: "Point Guard",
        jerseyNumber: "23",
        teamName: "",
        season: new Date().getFullYear().toString(),
        school: "",
        grade: "",
        height: "",
        weight: "",
        statLine: "",
        lore: "",
        effect: "",
        name: prev.name === "Cyber Ronin" ? "Player Name" : prev.name,
      }));
    } else {
      setCardData(prev => ({
        ...prev,
        cardMode: "tcg",
        type: "Character",
        attack: prev.attack || 8,
        defense: prev.defense || 4,
        cost: prev.cost || 3,
        name: prev.name === "Player Name" ? "Cyber Ronin" : prev.name,
      }));
    }
  };

  const [cardData, setCardData] = useState<CardData>({
    id: `card_${Date.now()}`,
    name: "Cyber Ronin",
    type: "Character",
    rarity: "Legendary",
    frontImage: cardArt,
    backImage: backCoverArt,
    attack: 8,
    defense: 4,
    cost: 3,
    lore: "A warrior from the neon slums, he fights not for honor, but for the highest bidder. His blade hums with a frequency that can shatter diamond.",
    effect: "When this card enters play, deal 2 damage to target enemy.",
    nameFont: "'Impact', sans-serif",
    statsFont: "'Courier New', monospace",
    loreFont: "Georgia, serif",
    borderColor: "#000000",
    accentColor: "#FFD700",
    templateId: "noir-classic",
    filters: { ...CARD_FILTERS },
    nameArch: 0,
    imageOffsetX: 0,
    imageOffsetY: 0,
    imageScale: 100,
    imageRotation: 0,
    cardMode: "tcg",
  });

  const [packData, setPackData] = useState<PackData>({
    name: "Cyber Legends Pack",
    cardsPerPack: 5,
    rarityDistribution: { Common: 2, Uncommon: 1, Rare: 1, Epic: 1 },
    cards: [],
    packArt: cardArt,
    templateId: "booster",
    seriesName: "Series 1",
    setNumber: "001",
    totalInSet: 100,
    guaranteedRarities: ["Uncommon"],
    price: "$4.99",
    packMode: "tcg",
    teamName: "",
    sport: "Basketball",
    season: new Date().getFullYear().toString(),
    school: "",
    teamColors: { primary: "#1D1160", secondary: "#FF6B00" },
    coachName: "",
    mascot: "",
  });

  const [showTeamPrint, setShowTeamPrint] = useState(false);
  const teamPrintRef = useRef<HTMLDivElement>(null);

  const [selectedPackCard, setSelectedPackCard] = useState<string | null>(null);
  const [showPackOpening, setShowPackOpening] = useState(false);
  const [revealedCards, setRevealedCards] = useState<CardData[]>([]);
  const [isRevealing, setIsRevealing] = useState(false);
  const [packSection, setPackSection] = useState<"cards" | "settings" | "simulate">("cards");
  const packArtInputRef = useRef<HTMLInputElement>(null);

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
          .filter((p: any) => p.type === "card")
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
          navigate(`/creator/card?id=${existing[0].id}`, { replace: true });
          return;
        }
        return createProject.mutateAsync({
          title: "Untitled Card",
          type: "card",
          status: "draft",
          data: cardData,
        }).then((newProject) => {
          if (cancelled) return;
          clearTimeout(timeoutId);
          setCreatedProjectId(newProject.id);
          setIsCreating(false);
          navigate(`/creator/card?id=${newProject.id}`, { replace: true });
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
      const data = project.data as CardData;
      if (data) setCardData(prev => ({ ...prev, ...data }));
    }
  }, [project]);

  const cardClipboardRef = useRef<CardData | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        e.preventDefault();
        if (selectedPackCard) {
          const card = packData.cards.find(c => c.id === selectedPackCard);
          if (card) { cardClipboardRef.current = JSON.parse(JSON.stringify(card)); toast.success("Card copied"); }
        } else {
          cardClipboardRef.current = JSON.parse(JSON.stringify(cardData));
          toast.success("Card copied");
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "v" && cardClipboardRef.current) {
        e.preventDefault();
        const clip = cardClipboardRef.current;
        if (selectedPackCard || packData.cards.length > 0) {
          const newCard = { ...JSON.parse(JSON.stringify(clip)), id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`, name: `${clip.name} (Copy)` };
          setPackData(prev => ({ ...prev, cards: [...prev.cards, newCard] }));
          setSelectedPackCard(newCard.id);
          toast.success("Card pasted to pack");
        } else {
          setCardData(JSON.parse(JSON.stringify(clip)));
          toast.success("Card data pasted");
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [cardData, selectedPackCard, packData]);

  const pendingSaveRef = useRef(false);
  const initialLoadDoneRef = useRef(false);
  const latestDataRef = useRef({ cardData, projectId: effectiveProjectId });
  latestDataRef.current = { cardData, projectId: effectiveProjectId };

  useEffect(() => {
    if (project && !initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true;
    }
  }, [project]);

  useEffect(() => {
    if (!effectiveProjectId || !initialLoadDoneRef.current) return;
    pendingSaveRef.current = true;
  }, [cardData, effectiveProjectId]);

  useEffect(() => {
    return () => {
      if (pendingSaveRef.current) {
        const { projectId: pid, cardData: cd } = latestDataRef.current;
        if (pid) {
          navigator.sendBeacon(
            `/api/projects/${pid}/autosave`,
            new Blob([JSON.stringify({ title: cd.name, data: cd })], { type: "application/json" })
          );
        }
      }
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingSaveRef.current) {
        const { projectId: pid, cardData: cd } = latestDataRef.current;
        if (pid) {
          navigator.sendBeacon(
            `/api/projects/${pid}/autosave`,
            new Blob([JSON.stringify({ title: cd.name, data: cd })], { type: "application/json" })
          );
        }
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const updateCard = (updates: Partial<CardData>) => {
    setCardData(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (effectiveProjectId) {
        await updateProject.mutateAsync({
          id: effectiveProjectId,
          data: { title: cardData.name, data: cardData },
        });
      }
      pendingSaveRef.current = false;
      toast.success("Card saved");
      fireXpAction("save");
    } catch (error: any) {
      toast.error(error.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    if (!cardPreviewRef.current) return;
    try {
      toast.info("Exporting print-ready card (300 DPI)...");
      
      const el = cardPreviewRef.current;
      const elWidth = el.offsetWidth;
      const targetDPI = 300;
      const inchW = mode === "pack" ? 4.5 : 2.5;
      const targetWidth = Math.round(inchW * targetDPI);
      const printScale = targetWidth / elWidth;
      
      const canvas = await captureElement(el, { scale: printScale });
      
      const label = mode === "pack" ? "pack" : `card_${side}`;
      const link = document.createElement("a");
      link.download = `${cardData.name.replace(/\s+/g, "_")}_${label}_print.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      toast.success(`Exported at ${canvas.width}x${canvas.height}px (print-ready ${targetDPI} DPI)`);
      fireXpAction("export");
      showWhatsNext();
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export card");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, side: "front" | "back") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      if (side === "front") {
        updateCard({ frontImage: url, imageOffsetX: 0, imageOffsetY: 0, imageScale: 100, imageRotation: 0 });
      } else {
        updateCard({ backImage: url });
      }
      toast.success(`${side === "front" ? "Front" : "Back"} image updated`);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      updateCard({ logo: event.target?.result as string, logoPosition: cardData.logoPosition || "top-right", logoSize: cardData.logoSize || 48, logoOpacity: cardData.logoOpacity ?? 100 });
      toast.success("Logo added to card");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleAIGenerated = (url: string) => {
    if (side === "front") {
      updateCard({ frontImage: url, imageOffsetX: 0, imageOffsetY: 0, imageScale: 100, imageRotation: 0 });
    } else {
      updateCard({ backImage: url });
    }
    setShowAIGen(false);
    toast.success("AI image applied");
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      updateCard({ audioUrl: event.target?.result as string });
      toast.success("Audio added to card");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const sendCardToHop = async () => {
    if (!cardPreviewRef.current) { toast.error("Card preview not ready"); return; }
    const toastId = toast.loading("Sending card to HOP Builder...");
    try {
      const el = cardPreviewRef.current;
      const canvas = await captureElement(el, { scale: 2 });
      const dataUrl = canvas.toDataURL("image/png");
      const result = await fxStudioApi.pushTaggedAsset({
        name: `${cardData.name || "Card"} — Trading Card`,
        asset_tag: "hop-scene",
        preview_data_url: dataUrl,
        project_id: effectiveProjectId || undefined,
        source_mode: "/creator/card",
        type: "hop-asset",
        metadata: { cardMode, cardName: cardData.name },
        mode_hints: {
          hop: { suggestedDuration: 5, assetType: "image", transition: "fade" },
        },
      });
      fetch("/api/xp/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "hop_asset_sent" }),
      }).catch(() => {});
      toast.success("Card sent — opening HOP Builder", { id: toastId });
      fxStudio.openFxStudio({ mode: "hops", effectId: result?.id });
    } catch (err: any) {
      toast.error(err.message || "Failed to send card to HOP Builder", { id: toastId });
    }
  };

  const getImageTransformStyle = (): React.CSSProperties => {
    const s = (cardData.imageScale || 100) / 100;
    const ox = cardData.imageOffsetX || 0;
    const oy = cardData.imageOffsetY || 0;
    const rot = cardData.imageRotation || 0;
    return {
      position: "absolute" as const,
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover" as const,
      transform: `translate(${ox}px, ${oy}px) scale(${s}) rotate(${rot}deg)`,
      transformOrigin: "center center",
    };
  };

  const handleImageDragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const origOx = cardData.imageOffsetX || 0;
    const origOy = cardData.imageOffsetY || 0;
    const onMove = (me: MouseEvent) => {
      const dx = me.clientX - startX;
      const dy = me.clientY - startY;
      updateCard({ imageOffsetX: origOx + dx, imageOffsetY: origOy + dy });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleImageWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -5 : 5;
    const next = Math.max(10, Math.min(300, (cardData.imageScale || 100) + delta));
    updateCard({ imageScale: next });
  };

  const applyCardTemplate = (templateId: string) => {
    const allTemplates = [...CARD_TEMPLATES, ...SPORTS_CARD_TEMPLATES];
    const template = allTemplates.find(t => t.id === templateId);
    if (!template) return;
    updateCard({
      templateId,
      borderColor: template.borderColor,
      accentColor: template.accentColor,
    });
    toast.success(`Applied ${template.name} template`);
  };

  const updateCardFilter = (key: keyof typeof CARD_FILTERS, value: any) => {
    updateCard({ filters: { ...cardData.filters, [key]: value } });
  };

  const getCardFilterStyle = (): React.CSSProperties => {
    const f = cardData.filters;
    return {
      filter: `contrast(${100 + (f.contrast - 50)}%) brightness(${100 + (f.brightness - 50)}%) saturate(${f.saturation}%)${f.grayscale ? ' grayscale(100%)' : ''}${f.sepia ? ' sepia(100%)' : ''}`
    };
  };

  const getLogoPositionStyle = (): React.CSSProperties => {
    const pos = cardData.logoPosition || "top-right";
    const size = cardData.logoSize || 48;
    const opacity = (cardData.logoOpacity ?? 100) / 100;
    const base: React.CSSProperties = {
      position: "absolute",
      width: `${size}px`,
      height: `${size}px`,
      objectFit: "contain",
      opacity,
      zIndex: 10,
      pointerEvents: "none",
    };
    if (pos.includes("top")) base.top = "8px";
    if (pos.includes("bottom")) base.bottom = "8px";
    if (pos.includes("left")) base.left = "8px";
    if (pos.includes("right")) base.right = "8px";
    return base;
  };

  const addCardToPack = () => {
    const isSports = packData.packMode === "sports";
    const types = isSports ? SPORTS_CARD_TYPES : CARD_TYPES;
    const positions = isSports ? (SPORTS_POSITIONS[packData.sport] || ["Player"]) : [];
    const newCard: CardData = {
      id: `card_${Date.now()}`,
      name: isSports ? `Player ${packData.cards.length + 1}` : `Card ${packData.cards.length + 1}`,
      type: types[Math.floor(Math.random() * types.length)],
      rarity: isSports ? "Common" : RARITIES[Math.floor(Math.random() * 3)],
      frontImage: cardArt,
      backImage: backCoverArt,
      attack: Math.floor(Math.random() * 10) + 1,
      defense: Math.floor(Math.random() * 10) + 1,
      cost: Math.floor(Math.random() * 5) + 1,
      lore: "",
      effect: "",
      nameFont: "'Impact', sans-serif",
      statsFont: "'Courier New', monospace",
      loreFont: "Georgia, serif",
      borderColor: isSports ? packData.teamColors.primary : cardData.borderColor,
      accentColor: isSports ? packData.teamColors.secondary : cardData.accentColor,
      templateId: isSports ? "team-spirit" : cardData.templateId,
      filters: { ...CARD_FILTERS },
      nameArch: 0,
      imageOffsetX: 0,
      imageOffsetY: 0,
      imageScale: 100,
      imageRotation: 0,
      cardMode: isSports ? "sports" : "tcg",
      sport: packData.sport,
      position: isSports ? positions[packData.cards.length % positions.length] : "",
      jerseyNumber: isSports ? String(packData.cards.length + 1) : "",
      teamName: packData.teamName,
      season: packData.season,
      school: packData.school,
    };
    setPackData({ ...packData, cards: [...packData.cards, newCard] });
    setSelectedPackCard(newCard.id);
    toast.success(isSports ? "Player card added" : "Card added to pack");
  };

  const updatePackCard = (cardId: string, updates: Partial<CardData>) => {
    setPackData({
      ...packData,
      cards: packData.cards.map(c => c.id === cardId ? { ...c, ...updates } : c)
    });
  };

  const removeCardFromPack = (cardId: string) => {
    setPackData({
      ...packData,
      cards: packData.cards.filter(c => c.id !== cardId)
    });
    if (selectedPackCard === cardId) setSelectedPackCard(null);
    toast.success("Card removed from pack");
  };

  const duplicatePackCard = (cardId: string) => {
    const card = packData.cards.find(c => c.id === cardId);
    if (card) {
      const newCard = { ...card, id: `card_${Date.now()}`, name: `${card.name} (Copy)` };
      setPackData({ ...packData, cards: [...packData.cards, newCard] });
      toast.success("Card duplicated");
    }
  };

  const handlePackArtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setPackData({ ...packData, packArt: event.target?.result as string });
      toast.success("Pack art updated");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const applyPackTemplate = (templateId: string) => {
    const template = PACK_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;
    setPackData({
      ...packData,
      templateId,
      name: template.name,
      cardsPerPack: template.cards,
      rarityDistribution: { ...template.distribution } as { [key: string]: number },
      guaranteedRarities: [...template.guaranteed],
    });
    toast.success(`Applied ${template.name} template`);
  };

  const simulatePackOpening = () => {
    if (packData.cards.length === 0) {
      toast.error("Add some cards to the pack first!");
      return;
    }
    
    setIsRevealing(true);
    setRevealedCards([]);
    setShowPackOpening(true);
    
    const cardsToReveal: CardData[] = [];
    const availableByRarity: { [key: string]: CardData[] } = {};
    const maxCards = packData.cardsPerPack;
    
    packData.cards.forEach(card => {
      if (!availableByRarity[card.rarity]) availableByRarity[card.rarity] = [];
      availableByRarity[card.rarity].push(card);
    });
    
    packData.guaranteedRarities.forEach(rarity => {
      if (cardsToReveal.length >= maxCards) return;
      if (availableByRarity[rarity]?.length > 0) {
        const randomCard = availableByRarity[rarity][Math.floor(Math.random() * availableByRarity[rarity].length)];
        cardsToReveal.push({ ...randomCard, id: `revealed_${Date.now()}_${Math.random()}` });
      }
    });
    
    while (cardsToReveal.length < maxCards && packData.cards.length > 0) {
      const randomCard = packData.cards[Math.floor(Math.random() * packData.cards.length)];
      cardsToReveal.push({ ...randomCard, id: `revealed_${Date.now()}_${Math.random()}` });
    }
    
    let revealIndex = 0;
    const revealInterval = setInterval(() => {
      if (revealIndex < cardsToReveal.length) {
        setRevealedCards(prev => [...prev, cardsToReveal[revealIndex]]);
        revealIndex++;
      } else {
        clearInterval(revealInterval);
        setIsRevealing(false);
      }
    }, 800);
  };

  const getPackStats = () => {
    const stats: { [key: string]: number } = {};
    packData.cards.forEach(card => {
      stats[card.rarity] = (stats[card.rarity] || 0) + 1;
    });
    return stats;
  };

  const switchPackMode = (newMode: "tcg" | "sports") => {
    if (newMode === "sports") {
      setPackData(prev => ({
        ...prev,
        packMode: "sports",
        name: prev.teamName ? `${prev.teamName} Team Cards` : "Team Cards",
        templateId: "team-roster",
        cardsPerPack: 15,
        cards: prev.cards.map((c, i) => ({
          ...c,
          cardMode: "sports" as const,
          type: c.type === "Character" || c.type === "Weapon" || c.type === "Spell" ? "Player" : c.type,
          sport: prev.sport,
          teamName: prev.teamName,
          season: prev.season,
          school: prev.school,
          borderColor: prev.teamColors.primary,
          accentColor: prev.teamColors.secondary,
          jerseyNumber: c.jerseyNumber || String(i + 1),
          position: c.position || (SPORTS_POSITIONS[prev.sport] || ["Player"])[i % (SPORTS_POSITIONS[prev.sport] || ["Player"]).length],
        })),
      }));
    } else {
      setPackData(prev => ({
        ...prev,
        packMode: "tcg",
        name: "Cyber Legends Pack",
        templateId: "booster",
        cardsPerPack: 5,
        cards: prev.cards.map(c => ({
          ...c,
          cardMode: "tcg" as const,
          type: c.type === "Player" || c.type === "Coach" || c.type === "MVP" ? "Character" : c.type,
        })),
      }));
    }
  };

  const applyPackSportsTemplate = (templateId: string) => {
    const template = SPORTS_PACK_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;
    setPackData(prev => ({
      ...prev,
      templateId,
      cardsPerPack: template.cards,
      name: prev.teamName ? `${prev.teamName} - ${template.name}` : template.name,
    }));
    toast.success(`Applied ${template.name} template`);
  };

  const handleTeamPrintExport = async () => {
    if (packData.cards.length === 0) {
      toast.error("Add player cards to print!");
      return;
    }
    setShowTeamPrint(true);
    setTimeout(async () => {
      if (!teamPrintRef.current) return;
      try {
        toast.info("Generating print-ready team sheet (300 DPI)...");
        const el = teamPrintRef.current;
        const targetDPI = 300;
        const pageWidthInches = 8.5;
        const targetWidth = Math.round(pageWidthInches * targetDPI);
        const printScale = targetWidth / el.offsetWidth;

        const canvas = await captureElement(el, { scale: printScale, backgroundColor: "#ffffff" });

        const link = document.createElement("a");
        const teamLabel = packData.teamName ? packData.teamName.replace(/\s+/g, "_") : "team";
        link.download = `${teamLabel}_cards_print_${targetDPI}dpi.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();

        toast.success(`Team sheet exported at ${canvas.width}x${canvas.height}px (${targetDPI} DPI print-ready)`);
        showWhatsNext();
      } catch (error) {
        console.error("Team print error:", error);
        toast.error("Failed to export team sheet");
      }
      setShowTeamPrint(false);
    }, 200);
  };

  const selectedCard = packData.cards.find(c => c.id === selectedPackCard);

  if (isCreating) {
    return (
      <Layout>
        <div className="h-screen flex items-center justify-center bg-black">
          <div className="text-center text-white">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-400">Creating card project...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-screen flex flex-col bg-black text-white">
        <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 hover:bg-zinc-800" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <h2 className="font-display font-bold text-lg">Card Forge</h2>
            <div className="flex bg-zinc-800 p-1">
              <button 
                onClick={() => setMode("single")}
                className={`px-3 py-1 text-xs font-medium flex items-center gap-2 ${mode === "single" ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
              >
                <Sparkles className="w-3 h-3" /> Single Card
              </button>
              <button 
                onClick={() => setMode("pack")}
                className={`px-3 py-1 text-xs font-medium flex items-center gap-2 ${mode === "pack" ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
              >
                <Package className="w-3 h-3" /> Pack Builder
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                try {
                  const p = await createProject.mutateAsync({ title: "Untitled Card", type: "card", status: "draft", data: {}, forceNew: true } as any);
                  navigate(`/creator/card?id=${p.id}`, { replace: true });
                  window.location.reload();
                } catch { toast.error("Failed to create new project"); }
              }}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-medium flex items-center gap-2"
              data-testid="button-new-card"
            >
              <Plus className="w-4 h-4" /> New
            </button>
            <button
              onClick={() => setShowFxBrowser(!showFxBrowser)}
              className={`px-3 py-2 border border-purple-500/30 text-sm font-medium flex items-center gap-2 ${showFxBrowser ? "bg-purple-600 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-purple-400"}`}
              data-testid="button-card-fx-studio"
            >
              <Sparkles className="w-4 h-4" /> FX Studio
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save"}
            </button>
            <button onClick={handleExport} className="px-4 py-2 bg-white text-black text-sm font-bold flex items-center gap-2 hover:bg-zinc-200" data-testid="button-export-card">
              <Download className="w-4 h-4" /> Export
            </button>
            <button
              onClick={async () => {
                if (!cardPreviewRef.current) return;
                try {
                  const el = cardPreviewRef.current;
                  const canvas = await captureElement(el, { scale: 2 });
                  const dataUrl = canvas.toDataURL("image/png");
                  await syncAsset({ name: `${cardData.name} - Card`, dataUrl, tag: "character-art" });
                } catch { toast.error("Failed to sync card"); }
              }}
              disabled={isSyncingToCoMiXX}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-cyan-600 text-cyan-400 text-sm font-bold flex items-center gap-2"
              data-testid="button-sync-comixx"
            >
              <Share2 className="w-4 h-4" /> Sync to CoMiXX
            </button>
            {mode === "pack" && packData.packMode === "sports" && (
              <button onClick={handleTeamPrintExport} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-sm font-bold flex items-center gap-2" data-testid="button-print-team-sheet">
                <Printer className="w-4 h-4" /> Print Team Sheet
              </button>
            )}
            <button
              onClick={sendCardToHop}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-orange-500/30 text-orange-400 text-sm font-bold flex items-center gap-2"
              data-testid="button-use-as-hop"
            >
              <Film className="w-4 h-4" /> Use as HOP
            </button>
            {effectiveProjectId && (
              <PostComposer
                projectId={effectiveProjectId}
                projectType="card"
                projectTitle={cardData.name || "Trading Card"}
                trigger={
                  <button className="px-4 py-2 bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 border border-zinc-600 text-sm font-bold flex items-center gap-2" data-testid="button-share-card">
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                }
              />
            )}
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {mode === "single" ? (
          <div className="w-80 p-4 overflow-auto border-r border-zinc-800 bg-zinc-900 space-y-4">
            <div className="flex border-b border-zinc-700">
              {["design", "stats", "lore", "style"].map(section => (
                <button
                  key={section}
                  onClick={() => setActiveSection(section as any)}
                  className={`flex-1 py-2 text-xs font-bold uppercase ${activeSection === section ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
                >
                  {section}
                </button>
              ))}
            </div>

            {activeSection === "design" && (
              <div className="space-y-4">
                <div className="flex border border-zinc-700 rounded overflow-hidden">
                  <button
                    onClick={() => switchCardMode("tcg")}
                    className={`flex-1 py-1.5 text-xs font-bold uppercase ${cardMode === "tcg" ? "bg-cyan-500 text-black" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}
                    data-testid="button-mode-tcg"
                  >
                    TCG Card
                  </button>
                  <button
                    onClick={() => switchCardMode("sports")}
                    className={`flex-1 py-1.5 text-xs font-bold uppercase ${cardMode === "sports" ? "bg-emerald-500 text-black" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}
                    data-testid="button-mode-sports"
                  >
                    Sports Card
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400">{cardMode === "sports" ? "Player / Team Name" : "Card Name"}</label>
                  <input 
                    type="text" 
                    value={cardData.name}
                    onChange={(e) => updateCard({ name: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                  />
                </div>

                {cardMode === "sports" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-400">Sport</label>
                        <select
                          value={cardData.sport || "Basketball"}
                          onChange={(e) => updateCard({ sport: e.target.value, position: (SPORTS_POSITIONS[e.target.value] || SPORTS_POSITIONS.Other)[0] })}
                          className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                          data-testid="select-sport"
                        >
                          {SPORTS_LIST.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-400">Position</label>
                        <select
                          value={cardData.position || ""}
                          onChange={(e) => updateCard({ position: e.target.value })}
                          className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                          data-testid="select-position"
                        >
                          {(SPORTS_POSITIONS[cardData.sport || "Other"] || SPORTS_POSITIONS.Other).map(p => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-400">Jersey #</label>
                        <input
                          type="text"
                          value={cardData.jerseyNumber || ""}
                          onChange={(e) => updateCard({ jerseyNumber: e.target.value })}
                          className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm text-center"
                          data-testid="input-jersey"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-400">Season</label>
                        <input
                          type="text"
                          value={cardData.season || ""}
                          onChange={(e) => updateCard({ season: e.target.value })}
                          className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm text-center"
                          data-testid="input-season"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-400">Grade</label>
                        <input
                          type="text"
                          value={cardData.grade || ""}
                          onChange={(e) => updateCard({ grade: e.target.value })}
                          placeholder="9th"
                          className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm text-center"
                          data-testid="input-grade"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-zinc-400">Team Name</label>
                      <input
                        type="text"
                        value={cardData.teamName || ""}
                        onChange={(e) => updateCard({ teamName: e.target.value })}
                        placeholder="e.g. Eastside Eagles"
                        className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                        data-testid="input-team"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-zinc-400">School / Organization</label>
                      <input
                        type="text"
                        value={cardData.school || ""}
                        onChange={(e) => updateCard({ school: e.target.value })}
                        placeholder="e.g. Lincoln Middle School"
                        className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                        data-testid="input-school"
                      />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-zinc-400">Type</label>
                    <select 
                      value={cardData.type}
                      onChange={(e) => updateCard({ type: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                    >
                      {(cardMode === "sports" ? SPORTS_CARD_TYPES : CARD_TYPES).map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-zinc-400">Rarity</label>
                    <select 
                      value={cardData.rarity}
                      onChange={(e) => updateCard({ rarity: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                    >
                      {RARITIES.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400 flex justify-between">
                    <span>Front Art</span>
                    <button onClick={() => { setSide("front"); setShowAIGen(true); }} className="text-[10px] bg-white text-black px-2 py-0.5">AI GEN</button>
                  </label>
                  <div 
                    onClick={() => frontInputRef.current?.click()}
                    className="aspect-video bg-zinc-800 border border-zinc-700 flex items-center justify-center cursor-pointer hover:border-white relative overflow-hidden"
                  >
                    {cardData.frontImage ? (
                      <img src={cardData.frontImage} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-zinc-500 text-xs"><Upload className="w-4 h-4 mx-auto mb-1" /> Upload</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400 flex justify-between">
                    <span>Back Art</span>
                    <button onClick={() => { setSide("back"); setShowAIGen(true); }} className="text-[10px] bg-white text-black px-2 py-0.5">AI GEN</button>
                  </label>
                  <div 
                    onClick={() => backInputRef.current?.click()}
                    className="aspect-video bg-zinc-800 border border-zinc-700 flex items-center justify-center cursor-pointer hover:border-white relative overflow-hidden"
                  >
                    {cardData.backImage ? (
                      <img src={cardData.backImage} className="w-full h-full object-cover opacity-50 grayscale" />
                    ) : (
                      <span className="text-zinc-500 text-xs"><Upload className="w-4 h-4 mx-auto mb-1" /> Upload</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-zinc-700">
                  <label className="text-xs font-bold uppercase text-zinc-400">School / Team Logo</label>
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="aspect-[3/1] bg-zinc-800 border border-zinc-700 flex items-center justify-center cursor-pointer hover:border-white relative overflow-hidden"
                  >
                    {cardData.logo ? (
                      <img src={cardData.logo} className="h-full object-contain p-2" data-testid="img-logo-preview" />
                    ) : (
                      <span className="text-zinc-500 text-xs flex flex-col items-center"><Upload className="w-4 h-4 mb-1" /> Upload Logo</span>
                    )}
                  </div>
                  {cardData.logo && (
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase">Position</label>
                        <div className="grid grid-cols-4 gap-1 mt-1">
                          {([
                            { key: "top-left", label: "TL" },
                            { key: "top-right", label: "TR" },
                            { key: "bottom-left", label: "BL" },
                            { key: "bottom-right", label: "BR" },
                          ] as const).map(pos => (
                            <button
                              key={pos.key}
                              onClick={() => updateCard({ logoPosition: pos.key })}
                              className={`py-1 text-[9px] font-bold transition ${
                                (cardData.logoPosition || "top-right") === pos.key
                                  ? "bg-cyan-600 text-white"
                                  : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                              }`}
                              data-testid={`button-logo-pos-${pos.key}`}
                            >
                              {pos.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase flex justify-between">
                          <span>Size</span>
                          <span>{cardData.logoSize || 48}px</span>
                        </label>
                        <input
                          type="range" min="20" max="100" step="2"
                          value={cardData.logoSize || 48}
                          onChange={(e) => updateCard({ logoSize: Number(e.target.value) })}
                          className="w-full h-1 accent-cyan-500 mt-1"
                          data-testid="slider-logo-size"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase flex justify-between">
                          <span>Opacity</span>
                          <span>{cardData.logoOpacity ?? 100}%</span>
                        </label>
                        <input
                          type="range" min="10" max="100" step="5"
                          value={cardData.logoOpacity ?? 100}
                          onChange={(e) => updateCard({ logoOpacity: Number(e.target.value) })}
                          className="w-full h-1 accent-cyan-500 mt-1"
                          data-testid="slider-logo-opacity"
                        />
                      </div>
                      <button
                        onClick={() => updateCard({ logo: undefined })}
                        className="w-full py-1 text-[10px] bg-zinc-800 hover:bg-red-900/30 text-red-400 border border-zinc-700 transition"
                        data-testid="button-remove-logo"
                      >
                        Remove Logo
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-zinc-700">
                  <label className="text-xs font-bold uppercase text-zinc-400 mb-2 block">Card Templates</label>
                  <select
                    value={cardData.templateId}
                    onChange={(e) => applyCardTemplate(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                  >
                    {cardMode === "sports" ? (
                      SPORTS_CARD_TEMPLATES.map(template => (
                        <option key={template.id} value={template.id}>{template.name}</option>
                      ))
                    ) : (
                      CARD_TEMPLATES.map(template => (
                        <option key={template.id} value={template.id}>{template.name}</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="pt-4 border-t border-zinc-700 space-y-3">
                  <label className="text-xs font-bold uppercase text-zinc-400 block">Image Filters</label>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-400">Contrast</span>
                      <span className="text-xs text-zinc-500">{cardData.filters.contrast}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" 
                      value={cardData.filters.contrast}
                      onChange={(e) => updateCardFilter('contrast', Number(e.target.value))}
                      className="w-full accent-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-400">Brightness</span>
                      <span className="text-xs text-zinc-500">{cardData.filters.brightness}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" 
                      value={cardData.filters.brightness}
                      onChange={(e) => updateCardFilter('brightness', Number(e.target.value))}
                      className="w-full accent-white"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={cardData.filters.grayscale}
                        onChange={(e) => updateCardFilter('grayscale', e.target.checked)}
                        className="w-3 h-3"
                      />
                      Grayscale
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={cardData.filters.sepia}
                        onChange={(e) => updateCardFilter('sepia', e.target.checked)}
                        className="w-3 h-3"
                      />
                      Sepia
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={cardData.filters.halftone}
                        onChange={(e) => updateCardFilter('halftone', e.target.checked)}
                        className="w-3 h-3"
                      />
                      Halftone
                    </label>
                  </div>

                  <button 
                    onClick={() => updateCard({ filters: { ...CARD_FILTERS } })}
                    className="w-full py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-600"
                  >
                    Reset Filters
                  </button>
                </div>

                <div className="pt-4 border-t border-zinc-700 space-y-3">
                  <label className="text-xs font-bold uppercase text-zinc-400 block">Image Transform</label>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-400">Scale</span>
                      <span className="text-xs text-zinc-500">{cardData.imageScale}%</span>
                    </div>
                    <input
                      type="range" min="50" max="300" step="1"
                      value={cardData.imageScale}
                      onChange={(e) => updateCard({ imageScale: Number(e.target.value) })}
                      className="w-full accent-white"
                      data-testid="input-image-scale"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-400">Horizontal</span>
                      <span className="text-xs text-zinc-500">{cardData.imageOffsetX}px</span>
                    </div>
                    <input
                      type="range" min="-200" max="200" step="1"
                      value={cardData.imageOffsetX}
                      onChange={(e) => updateCard({ imageOffsetX: Number(e.target.value) })}
                      className="w-full accent-white"
                      data-testid="input-image-offset-x"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-400">Vertical</span>
                      <span className="text-xs text-zinc-500">{cardData.imageOffsetY}px</span>
                    </div>
                    <input
                      type="range" min="-200" max="200" step="1"
                      value={cardData.imageOffsetY}
                      onChange={(e) => updateCard({ imageOffsetY: Number(e.target.value) })}
                      className="w-full accent-white"
                      data-testid="input-image-offset-y"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-400">Rotation</span>
                      <span className="text-xs text-zinc-500">{cardData.imageRotation}°</span>
                    </div>
                    <input
                      type="range" min="-180" max="180" step="1"
                      value={cardData.imageRotation}
                      onChange={(e) => updateCard({ imageRotation: Number(e.target.value) })}
                      className="w-full accent-white"
                      data-testid="input-image-rotation"
                    />
                  </div>

                  <button
                    onClick={() => updateCard({ imageOffsetX: 0, imageOffsetY: 0, imageScale: 100, imageRotation: 0 })}
                    className="w-full py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-600"
                    data-testid="button-reset-transform"
                  >
                    Reset Transform
                  </button>
                </div>

                <div className="pt-4 border-t border-zinc-700 space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400">Card Audio</label>
                  {cardData.audioUrl ? (
                    <div className="space-y-2">
                      <audio src={cardData.audioUrl} controls className="w-full h-8" />
                      <div className="flex gap-1">
                        <button
                          onClick={() => audioInputRef.current?.click()}
                          className="flex-1 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 flex items-center justify-center gap-1"
                          data-testid="button-replace-audio"
                        >
                          <Music className="w-3 h-3" /> Replace
                        </button>
                        <button
                          onClick={() => updateCard({ audioUrl: undefined })}
                          className="py-1.5 px-2 text-xs bg-zinc-800 hover:bg-red-900 border border-zinc-600 text-red-400"
                          data-testid="button-remove-audio"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => audioInputRef.current?.click()}
                      className="w-full py-2 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 border-dashed flex items-center justify-center gap-2"
                      data-testid="button-add-audio"
                    >
                      <Volume2 className="w-3 h-3" /> Add Audio
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeSection === "stats" && (
              <div className="space-y-4">
                {cardMode === "sports" ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-400">Height</label>
                        <input
                          type="text"
                          value={cardData.height || ""}
                          onChange={(e) => updateCard({ height: e.target.value })}
                          placeholder={`5'10"`}
                          className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm text-center"
                          data-testid="input-height"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-400">Weight</label>
                        <input
                          type="text"
                          value={cardData.weight || ""}
                          onChange={(e) => updateCard({ weight: e.target.value })}
                          placeholder="165 lbs"
                          className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm text-center"
                          data-testid="input-weight"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-zinc-400">Stat Line / Highlights</label>
                      <textarea
                        value={cardData.statLine || ""}
                        onChange={(e) => updateCard({ statLine: e.target.value })}
                        placeholder="e.g. 15.2 PPG • 4.3 APG • 3.1 RPG"
                        className="w-full h-24 bg-zinc-800 border border-zinc-700 p-2 text-sm resize-none"
                        data-testid="input-statline"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-zinc-400">Awards / Achievements</label>
                      <textarea
                        value={cardData.effect}
                        onChange={(e) => updateCard({ effect: e.target.value })}
                        placeholder="e.g. Team MVP, All-Conference, State Champion"
                        className="w-full h-20 bg-zinc-800 border border-zinc-700 p-2 text-sm resize-none"
                        data-testid="input-awards"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-400">ATK</label>
                        <input 
                          type="number" 
                          value={cardData.attack}
                          onChange={(e) => updateCard({ attack: Number(e.target.value) })}
                          className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm text-center"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-400">DEF</label>
                        <input 
                          type="number" 
                          value={cardData.defense}
                          onChange={(e) => updateCard({ defense: Number(e.target.value) })}
                          className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm text-center"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-400">Cost</label>
                        <input 
                          type="number" 
                          value={cardData.cost}
                          onChange={(e) => updateCard({ cost: Number(e.target.value) })}
                          className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm text-center"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-zinc-400">Card Effect</label>
                      <textarea 
                        value={cardData.effect}
                        onChange={(e) => updateCard({ effect: e.target.value })}
                        className="w-full h-24 bg-zinc-800 border border-zinc-700 p-2 text-sm resize-none"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {activeSection === "lore" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400">{cardMode === "sports" ? "Player Bio / Fun Facts" : "Flavor Text / Lore"}</label>
                  <textarea 
                    value={cardData.lore}
                    onChange={(e) => updateCard({ lore: e.target.value })}
                    placeholder={cardMode === "sports" ? "e.g. Started playing at age 5. Favorite player: LeBron James. Hobbies: Drawing, Gaming." : ""}
                    className="w-full h-40 bg-zinc-800 border border-zinc-700 p-2 text-sm resize-none"
                  />
                </div>
              </div>
            )}

            {activeSection === "style" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400">Name Font</label>
                  <select 
                    value={cardData.nameFont}
                    onChange={(e) => updateCard({ nameFont: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                  >
                    {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400">Stats Font</label>
                  <select 
                    value={cardData.statsFont}
                    onChange={(e) => updateCard({ statsFont: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                  >
                    {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400">Lore Font</label>
                  <select 
                    value={cardData.loreFont}
                    onChange={(e) => updateCard({ loreFont: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                  >
                    {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-zinc-400">Border</label>
                    <input 
                      type="color" 
                      value={cardData.borderColor}
                      onChange={(e) => updateCard({ borderColor: e.target.value })}
                      className="w-full h-10 bg-zinc-800 border border-zinc-700 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-zinc-400">Accent</label>
                    <input 
                      type="color" 
                      value={cardData.accentColor}
                      onChange={(e) => updateCard({ accentColor: e.target.value })}
                      className="w-full h-10 bg-zinc-800 border border-zinc-700 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase text-zinc-400">Name Arch</label>
                    <span className="text-xs text-zinc-500">{cardData.nameArch}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={cardData.nameArch}
                    onChange={(e) => updateCard({ nameArch: Number(e.target.value) })}
                    className="w-full accent-white"
                    data-testid="slider-name-arch"
                  />
                  <p className="text-[10px] text-zinc-500">Curve the card name up or down</p>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-zinc-700">
              <button 
                onClick={() => setSide(side === "front" ? "back" : "front")}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-sm flex items-center justify-center gap-2"
              >
                <RotateCw className="w-4 h-4" /> Flip to {side === "front" ? "Back" : "Front"}
              </button>
            </div>
          </div>
          ) : (
          <div className="w-80 overflow-auto border-r border-zinc-800 bg-zinc-900 flex flex-col">
            <div className="flex bg-zinc-800 m-2 p-1 gap-1">
              <button
                onClick={() => switchPackMode("tcg")}
                className={`flex-1 py-1.5 text-xs font-bold flex items-center justify-center gap-1 ${packData.packMode === "tcg" ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
                data-testid="button-pack-tcg-mode"
              >
                <Sparkles className="w-3 h-3" /> TCG
              </button>
              <button
                onClick={() => switchPackMode("sports")}
                className={`flex-1 py-1.5 text-xs font-bold flex items-center justify-center gap-1 ${packData.packMode === "sports" ? "bg-emerald-500 text-white" : "text-zinc-400 hover:text-white"}`}
                data-testid="button-pack-sports-mode"
              >
                <Trophy className="w-3 h-3" /> Sports
              </button>
            </div>

            <div className="flex border-b border-zinc-800">
              <button
                onClick={() => setPackSection("cards")}
                className={`flex-1 py-2 text-xs font-bold uppercase ${packSection === "cards" ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
              >
                {packData.packMode === "sports" ? "Roster" : "Cards"}
              </button>
              <button
                onClick={() => setPackSection("settings")}
                className={`flex-1 py-2 text-xs font-bold uppercase ${packSection === "settings" ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
              >
                {packData.packMode === "sports" ? "Team" : "Settings"}
              </button>
              <button
                onClick={() => setPackSection("simulate")}
                className={`flex-1 py-2 text-xs font-bold uppercase ${packSection === "simulate" ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
              >
                {packData.packMode === "sports" ? "Preview" : "Simulate"}
              </button>
            </div>

            <div className="flex-1 p-4 overflow-auto space-y-4">
              {packSection === "cards" && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold uppercase text-zinc-400">
                        {packData.packMode === "sports" ? "Players on Roster" : "Cards in Pack"}
                      </label>
                      <span className="text-xs text-zinc-500">{packData.cards.length} {packData.packMode === "sports" ? "players" : "cards"}</span>
                    </div>
                    <button 
                      onClick={addCardToPack}
                      className={`w-full py-2 text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 ${
                        packData.packMode === "sports" 
                          ? "bg-emerald-600 text-white hover:bg-emerald-500" 
                          : "bg-white text-black hover:bg-zinc-200"
                      }`}
                      data-testid="button-add-pack-card"
                    >
                      <Plus className="w-4 h-4" /> {packData.packMode === "sports" ? "Add Player" : "Add Card"}
                    </button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-auto">
                    {packData.cards.map((card, idx) => (
                      <div 
                        key={card.id}
                        onClick={() => setSelectedPackCard(card.id)}
                        className={`p-2 border cursor-pointer flex items-center gap-2 group ${
                          selectedPackCard === card.id ? "bg-white text-black border-white" : "border-zinc-700 hover:border-zinc-500"
                        }`}
                        data-testid={`card-pack-item-${idx}`}
                      >
                        <div className="w-8 h-10 bg-zinc-800 overflow-hidden flex-shrink-0">
                          <img src={card.frontImage} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{card.name}</p>
                          <p className={`text-[10px] flex items-center gap-1 ${selectedPackCard === card.id ? "text-zinc-600" : "text-zinc-500"}`}>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: RARITY_COLORS[card.rarity] }} />
                            {card.rarity} {card.type}
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeCardFromPack(card.id); }}
                          className={`p-1 opacity-0 group-hover:opacity-100 ${selectedPackCard === card.id ? "hover:text-red-600" : "hover:text-red-500"}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {selectedCard && (
                    <div className="pt-4 border-t border-zinc-700 space-y-3">
                      <h4 className="text-xs font-bold uppercase text-zinc-400">
                        {packData.packMode === "sports" ? "Edit Player Card" : "Edit Selected Card"}
                      </h4>
                      <div className="space-y-2">
                        <input 
                          type="text" 
                          value={selectedCard.name}
                          onChange={(e) => updatePackCard(selectedCard.id, { name: e.target.value })}
                          className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                          placeholder={packData.packMode === "sports" ? "Player name" : "Card name"}
                        />
                      </div>

                      {packData.packMode === "sports" ? (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={selectedCard.type}
                              onChange={(e) => updatePackCard(selectedCard.id, { type: e.target.value })}
                              className="bg-zinc-800 border border-zinc-700 p-2 text-xs"
                              data-testid="select-pack-card-type"
                            >
                              {SPORTS_CARD_TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>
                            <select
                              value={selectedCard.position || ""}
                              onChange={(e) => updatePackCard(selectedCard.id, { position: e.target.value })}
                              className="bg-zinc-800 border border-zinc-700 p-2 text-xs"
                              data-testid="select-pack-card-position"
                            >
                              <option value="">Position</option>
                              {(SPORTS_POSITIONS[packData.sport] || []).map(p => <option key={p}>{p}</option>)}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] text-zinc-500">Jersey #</label>
                              <input
                                type="text"
                                value={selectedCard.jerseyNumber || ""}
                                onChange={(e) => updatePackCard(selectedCard.id, { jerseyNumber: e.target.value })}
                                className="w-full bg-zinc-800 border border-zinc-700 p-1 text-xs text-center"
                                placeholder="#"
                                data-testid="input-pack-card-jersey"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-zinc-500">Grade</label>
                              <select
                                value={selectedCard.grade || ""}
                                onChange={(e) => updatePackCard(selectedCard.id, { grade: e.target.value })}
                                className="w-full bg-zinc-800 border border-zinc-700 p-1 text-xs"
                                data-testid="select-pack-card-grade"
                              >
                                <option value="">Grade</option>
                                {["6th", "7th", "8th", "9th (Fr.)", "10th (So.)", "11th (Jr.)", "12th (Sr.)"].map(g => <option key={g}>{g}</option>)}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] text-zinc-500">Height</label>
                              <input
                                type="text"
                                value={selectedCard.height || ""}
                                onChange={(e) => updatePackCard(selectedCard.id, { height: e.target.value })}
                                className="w-full bg-zinc-800 border border-zinc-700 p-1 text-xs text-center"
                                placeholder="5'10&quot;"
                                data-testid="input-pack-card-height"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-zinc-500">Weight</label>
                              <input
                                type="text"
                                value={selectedCard.weight || ""}
                                onChange={(e) => updatePackCard(selectedCard.id, { weight: e.target.value })}
                                className="w-full bg-zinc-800 border border-zinc-700 p-1 text-xs text-center"
                                placeholder="160 lbs"
                                data-testid="input-pack-card-weight"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500">Stat Line</label>
                            <input
                              type="text"
                              value={selectedCard.statLine || ""}
                              onChange={(e) => updatePackCard(selectedCard.id, { statLine: e.target.value })}
                              className="w-full bg-zinc-800 border border-zinc-700 p-2 text-xs"
                              placeholder="e.g., 15.2 PPG | 6.4 RPG | 3.1 APG"
                              data-testid="input-pack-card-statline"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500">Player Bio</label>
                            <textarea
                              value={selectedCard.lore || ""}
                              onChange={(e) => updatePackCard(selectedCard.id, { lore: e.target.value })}
                              className="w-full bg-zinc-800 border border-zinc-700 p-2 text-xs resize-none"
                              rows={2}
                              placeholder="Fun facts, achievements..."
                              data-testid="input-pack-card-bio"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500">Player Photo</label>
                            <button
                              onClick={() => {
                                const input = document.createElement("input");
                                input.type = "file";
                                input.accept = "image/*";
                                input.onchange = (e: any) => {
                                  const file = e.target?.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    updatePackCard(selectedCard.id, { frontImage: ev.target?.result as string });
                                    toast.success("Player photo updated");
                                  };
                                  reader.readAsDataURL(file);
                                };
                                input.click();
                              }}
                              className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs flex items-center justify-center gap-2"
                            >
                              <Upload className="w-3 h-3" /> Upload Photo
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <select 
                              value={selectedCard.type}
                              onChange={(e) => updatePackCard(selectedCard.id, { type: e.target.value })}
                              className="bg-zinc-800 border border-zinc-700 p-2 text-xs"
                            >
                              {CARD_TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>
                            <select 
                              value={selectedCard.rarity}
                              onChange={(e) => updatePackCard(selectedCard.id, { rarity: e.target.value })}
                              className="bg-zinc-800 border border-zinc-700 p-2 text-xs"
                            >
                              {RARITIES.map(r => <option key={r}>{r}</option>)}
                            </select>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] text-zinc-500">ATK</label>
                              <input 
                                type="number" 
                                value={selectedCard.attack}
                                onChange={(e) => updatePackCard(selectedCard.id, { attack: Number(e.target.value) })}
                                className="w-full bg-zinc-800 border border-zinc-700 p-1 text-xs text-center"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-zinc-500">DEF</label>
                              <input 
                                type="number" 
                                value={selectedCard.defense}
                                onChange={(e) => updatePackCard(selectedCard.id, { defense: Number(e.target.value) })}
                                className="w-full bg-zinc-800 border border-zinc-700 p-1 text-xs text-center"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-zinc-500">Cost</label>
                              <input 
                                type="number" 
                                value={selectedCard.cost}
                                onChange={(e) => updatePackCard(selectedCard.id, { cost: Number(e.target.value) })}
                                className="w-full bg-zinc-800 border border-zinc-700 p-1 text-xs text-center"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      <button
                        onClick={() => duplicatePackCard(selectedCard.id)}
                        className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-xs flex items-center justify-center gap-2"
                      >
                        <Copy className="w-3 h-3" /> Duplicate {packData.packMode === "sports" ? "Player" : "Card"}
                      </button>
                    </div>
                  )}
                </>
              )}

              {packSection === "settings" && (
                <>
                  {packData.packMode === "sports" ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-400">Team Template</label>
                        <div className="grid grid-cols-2 gap-2">
                          {SPORTS_PACK_TEMPLATES.map(template => (
                            <button
                              key={template.id}
                              onClick={() => applyPackSportsTemplate(template.id)}
                              className={`p-2 text-xs border text-left ${
                                packData.templateId === template.id
                                  ? "bg-emerald-600 text-white border-emerald-500"
                                  : "border-zinc-700 hover:border-zinc-500"
                              }`}
                              data-testid={`button-pack-template-${template.id}`}
                            >
                              <p className="font-bold">{template.name}</p>
                              <p className={`text-[10px] ${packData.templateId === template.id ? "text-emerald-200" : "text-zinc-500"}`}>
                                {template.cards} cards — {template.description}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-400">Sport</label>
                        <select
                          value={packData.sport}
                          onChange={(e) => setPackData({ ...packData, sport: e.target.value })}
                          className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                          data-testid="select-pack-sport"
                        >
                          {SPORTS_LIST.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-400">Team Name</label>
                        <input
                          type="text"
                          value={packData.teamName}
                          onChange={(e) => setPackData({ ...packData, teamName: e.target.value })}
                          className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                          placeholder="e.g., Wildcats"
                          data-testid="input-pack-team-name"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-400">School / Organization</label>
                        <input
                          type="text"
                          value={packData.school}
                          onChange={(e) => setPackData({ ...packData, school: e.target.value })}
                          className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                          placeholder="e.g., Lincoln High School"
                          data-testid="input-pack-school"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase text-zinc-400">Season</label>
                          <input
                            type="text"
                            value={packData.season}
                            onChange={(e) => setPackData({ ...packData, season: e.target.value })}
                            className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                            placeholder="2025-26"
                            data-testid="input-pack-season"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase text-zinc-400">Coach</label>
                          <input
                            type="text"
                            value={packData.coachName}
                            onChange={(e) => setPackData({ ...packData, coachName: e.target.value })}
                            className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                            placeholder="Coach name"
                            data-testid="input-pack-coach"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-400">Mascot</label>
                        <input
                          type="text"
                          value={packData.mascot}
                          onChange={(e) => setPackData({ ...packData, mascot: e.target.value })}
                          className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                          placeholder="Team mascot"
                          data-testid="input-pack-mascot"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-400">Team Colors</label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500">Primary</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={packData.teamColors.primary}
                                onChange={(e) => setPackData({ ...packData, teamColors: { ...packData.teamColors, primary: e.target.value } })}
                                className="w-8 h-8 cursor-pointer bg-transparent border-0"
                              />
                              <span className="text-[10px] text-zinc-400 font-mono">{packData.teamColors.primary}</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500">Secondary</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={packData.teamColors.secondary}
                                onChange={(e) => setPackData({ ...packData, teamColors: { ...packData.teamColors, secondary: e.target.value } })}
                                className="w-8 h-8 cursor-pointer bg-transparent border-0"
                              />
                              <span className="text-[10px] text-zinc-400 font-mono">{packData.teamColors.secondary}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-400">Card Template</label>
                        <div className="grid grid-cols-2 gap-2">
                          {SPORTS_CARD_TEMPLATES.map(template => (
                            <button
                              key={template.id}
                              onClick={() => {
                                setPackData(prev => ({
                                  ...prev,
                                  cards: prev.cards.map(c => ({
                                    ...c,
                                    templateId: template.id,
                                    borderColor: template.borderColor,
                                    accentColor: template.accentColor,
                                  }))
                                }));
                                toast.success(`Applied ${template.name} to all cards`);
                              }}
                              className="p-2 text-xs border border-zinc-700 hover:border-zinc-500 text-left"
                              style={{ borderLeftColor: template.accentColor, borderLeftWidth: 3 }}
                            >
                              <p className="font-bold truncate">{template.name}</p>
                              <p className="text-[10px] text-zinc-500">{template.sport}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-400 flex justify-between">
                          <span>Pack Art / Team Logo</span>
                        </label>
                        <div
                          onClick={() => packArtInputRef.current?.click()}
                          className="aspect-video bg-zinc-800 border border-zinc-700 flex items-center justify-center cursor-pointer hover:border-white overflow-hidden"
                        >
                          <img src={packData.packArt} className="w-full h-full object-cover" />
                        </div>
                      </div>

                      <div className="pt-3 border-t border-zinc-700">
                        <button
                          onClick={() => {
                            setPackData(prev => ({
                              ...prev,
                              cards: prev.cards.map(c => ({
                                ...c,
                                teamName: prev.teamName,
                                school: prev.school,
                                season: prev.season,
                                sport: prev.sport,
                                borderColor: prev.teamColors.primary,
                                accentColor: prev.teamColors.secondary,
                              }))
                            }));
                            toast.success("Team info applied to all cards");
                          }}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2"
                          data-testid="button-apply-team-to-all"
                        >
                          <Users className="w-3 h-3" /> Apply Team Info to All Cards
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-400">Pack Template</label>
                        <div className="grid grid-cols-2 gap-2">
                          {PACK_TEMPLATES.map(template => (
                            <button
                              key={template.id}
                              onClick={() => applyPackTemplate(template.id)}
                              className={`p-2 text-xs border text-left ${
                                packData.templateId === template.id
                                  ? "bg-white text-black border-white"
                                  : "border-zinc-700 hover:border-zinc-500"
                              }`}
                              data-testid={`button-pack-template-${template.id}`}
                            >
                              <p className="font-bold">{template.name}</p>
                              <p className={`text-[10px] ${packData.templateId === template.id ? "text-zinc-600" : "text-zinc-500"}`}>
                                {template.cards} cards
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-400">Pack Name</label>
                        <input
                          type="text"
                          value={packData.name}
                          onChange={(e) => setPackData({ ...packData, name: e.target.value })}
                          className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase text-zinc-400">Series</label>
                          <input
                            type="text"
                            value={packData.seriesName}
                            onChange={(e) => setPackData({ ...packData, seriesName: e.target.value })}
                            className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase text-zinc-400">Price</label>
                          <input
                            type="text"
                            value={packData.price}
                            onChange={(e) => setPackData({ ...packData, price: e.target.value })}
                            className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-400 flex justify-between">
                          <span>Pack Art</span>
                        </label>
                        <div
                          onClick={() => packArtInputRef.current?.click()}
                          className="aspect-video bg-zinc-800 border border-zinc-700 flex items-center justify-center cursor-pointer hover:border-white overflow-hidden"
                        >
                          <img src={packData.packArt} className="w-full h-full object-cover" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-400">Cards Per Pack</label>
                        <input
                          type="number"
                          value={packData.cardsPerPack}
                          onChange={(e) => setPackData({ ...packData, cardsPerPack: Number(e.target.value) })}
                          className="w-full bg-zinc-800 border border-zinc-700 p-2 text-sm text-center"
                          min={1}
                          max={20}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-400">Guaranteed Rarities</label>
                        <div className="flex flex-wrap gap-1">
                          {RARITIES.map(rarity => (
                            <button
                              key={rarity}
                              onClick={() => {
                                const newGuaranteed = packData.guaranteedRarities.includes(rarity)
                                  ? packData.guaranteedRarities.filter(r => r !== rarity)
                                  : [...packData.guaranteedRarities, rarity];
                                setPackData({ ...packData, guaranteedRarities: newGuaranteed });
                              }}
                              className={`px-2 py-1 text-[10px] font-bold border ${
                                packData.guaranteedRarities.includes(rarity)
                                  ? "bg-white text-black border-white"
                                  : "border-zinc-700 hover:border-zinc-500"
                              }`}
                              style={{ borderLeftColor: RARITY_COLORS[rarity], borderLeftWidth: 3 }}
                            >
                              {rarity}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {packSection === "simulate" && (
                <>
                  {packData.packMode === "sports" ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-400">Team Roster Summary</label>
                        <div className="bg-zinc-800 border border-zinc-700 p-3 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-400">Total Players</span>
                            <span className="font-bold">{packData.cards.length}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-400">Sport</span>
                            <span className="font-bold">{packData.sport}</span>
                          </div>
                          {packData.teamName && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-zinc-400">Team</span>
                              <span className="font-bold">{packData.teamName}</span>
                            </div>
                          )}
                          {packData.coachName && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-zinc-400">Coach</span>
                              <span className="font-bold">{packData.coachName}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-400">By Position</label>
                        <div className="bg-zinc-800 border border-zinc-700 p-3 space-y-2">
                          {(() => {
                            const positionCounts: Record<string, number> = {};
                            packData.cards.forEach(c => {
                              const pos = c.position || "Unassigned";
                              positionCounts[pos] = (positionCounts[pos] || 0) + 1;
                            });
                            return Object.entries(positionCounts).map(([pos, count]) => (
                              <div key={pos} className="flex items-center justify-between text-xs">
                                <span className="text-zinc-400">{pos}</span>
                                <span className="font-mono">{count}</span>
                              </div>
                            ));
                          })()}
                          {packData.cards.length === 0 && (
                            <p className="text-xs text-zinc-500 text-center">No players yet</p>
                          )}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-zinc-700 space-y-3">
                        <button
                          onClick={handleTeamPrintExport}
                          disabled={packData.cards.length === 0}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          data-testid="button-print-team-sheet-sidebar"
                        >
                          <Printer className="w-4 h-4" /> Print Team Sheet
                        </button>
                        <p className="text-[10px] text-zinc-500 text-center">
                          Exports all cards in a 3-column grid layout for printing (300 DPI)
                        </p>
                      </div>

                      <div className="pt-3 border-t border-zinc-700 space-y-3">
                        <button
                          onClick={handleExport}
                          disabled={packData.cards.length === 0}
                          className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Download className="w-4 h-4" /> Export Pack Preview
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-400">Pack Statistics</label>
                        <div className="bg-zinc-800 border border-zinc-700 p-3 space-y-2">
                          {Object.entries(getPackStats()).map(([rarity, count]) => (
                            <div key={rarity} className="flex items-center justify-between">
                              <span className="flex items-center gap-2 text-xs">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: RARITY_COLORS[rarity] }} />
                                {rarity}
                              </span>
                              <span className="text-xs font-mono">{count} cards</span>
                            </div>
                          ))}
                          {packData.cards.length === 0 && (
                            <p className="text-xs text-zinc-500 text-center">No cards in pack yet</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-400">Rarity Drop Rates</label>
                        <div className="bg-zinc-800 border border-zinc-700 p-3 space-y-2">
                          {RARITIES.map(rarity => (
                            <div key={rarity} className="flex items-center justify-between">
                              <span className="flex items-center gap-2 text-xs">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: RARITY_COLORS[rarity] }} />
                                {rarity}
                              </span>
                              <span className="text-xs font-mono">{RARITY_ODDS[rarity]}%</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-zinc-700 space-y-3">
                        <button 
                          onClick={simulatePackOpening}
                          disabled={packData.cards.length === 0}
                          className="w-full py-3 bg-white text-black text-sm font-bold flex items-center justify-center gap-2 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          data-testid="button-simulate-pack"
                        >
                          <Sparkles className="w-4 h-4" /> Open Pack Simulation
                        </button>
                        <p className="text-[10px] text-zinc-500 text-center">
                          Simulates opening your pack with random card selection
                        </p>
                      </div>

                      {packData.guaranteedRarities.length > 0 && (
                        <div className="bg-zinc-800 border border-zinc-700 p-3">
                          <p className="text-xs text-zinc-400 mb-2">Guaranteed per pack:</p>
                          <div className="flex flex-wrap gap-1">
                            {packData.guaranteedRarities.map(rarity => (
                              <span 
                                key={rarity}
                                className="px-2 py-1 text-[10px] font-bold bg-zinc-900 border border-zinc-600"
                                style={{ borderLeftColor: RARITY_COLORS[rarity], borderLeftWidth: 3 }}
                              >
                                {rarity}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          )}

          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div className="flex-1 bg-black flex items-center justify-center p-4 relative">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                     style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
            
                <input 
                  ref={packArtInputRef} 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handlePackArtUpload} 
                />
            
                <div ref={cardPreviewRef}>
                {mode === "pack" ? (
                  packData.packMode === "sports" ? (
                  <div className="relative">
                    <div className="text-center mb-4">
                      <h3 className="text-2xl font-bold" style={{ color: packData.teamColors.secondary }}>{packData.teamName || "Team Name"}</h3>
                      <p className="text-sm text-zinc-400">{packData.sport} {packData.season && `• ${packData.season}`}</p>
                      {packData.school && <p className="text-xs text-zinc-500">{packData.school}</p>}
                      <p className="text-xs text-zinc-600 mt-1">{packData.cards.length} players</p>
                    </div>
                    <div className="w-[600px] mx-auto">
                      {packData.cards.length === 0 ? (
                        <div className="aspect-[3/4] border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center gap-3">
                          <Users className="w-12 h-12 text-zinc-600" />
                          <p className="text-zinc-500 text-sm">Add players from the Roster tab</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-3">
                          {packData.cards.map((card) => (
                            <div
                              key={card.id}
                              className={`relative aspect-[2.5/3.5] shadow-lg cursor-pointer transition-all ${selectedPackCard === card.id ? "ring-2 ring-emerald-400 scale-105" : "hover:scale-102"}`}
                              style={{ backgroundColor: card.borderColor || packData.teamColors.primary }}
                              onClick={() => setSelectedPackCard(card.id)}
                              data-testid={`pack-sports-card-${card.id}`}
                            >
                              <div className="absolute inset-1 bg-white flex flex-col overflow-hidden">
                                <div className="flex-1 relative overflow-hidden">
                                  <img src={card.frontImage} className="w-full h-full object-cover" />
                                  {card.jerseyNumber && (
                                    <div className="absolute top-1 right-1 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow" style={{ backgroundColor: card.accentColor || packData.teamColors.secondary, color: card.borderColor || packData.teamColors.primary }}>
                                      {card.jerseyNumber}
                                    </div>
                                  )}
                                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                    <p className="text-[10px] font-bold text-white truncate uppercase">{card.name}</p>
                                    <p className="text-[8px] text-white/70">{card.position}</p>
                                  </div>
                                </div>
                                <div className="p-1.5 flex items-center justify-between" style={{ backgroundColor: card.borderColor || packData.teamColors.primary }}>
                                  <span className="text-[8px] font-bold text-white truncate">{card.teamName || packData.teamName}</span>
                                  <span className="text-[7px] text-white/60">{card.sport || packData.sport}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  ) : (
                  <div className="relative">
                    <div className="text-center mb-4">
                      <h3 className="text-2xl font-bold">{packData.name}</h3>
                      <p className="text-sm text-zinc-500">{packData.cards.length} / {packData.cardsPerPack} cards</p>
                    </div>
                    <div className="relative w-[550px] aspect-[3/4] mx-auto">
                      <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 to-zinc-900 border-4 border-zinc-600 shadow-2xl overflow-hidden">
                        <img src={packData.packArt} className="w-full h-full object-cover opacity-60" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                          <div className="bg-black/80 p-6 border border-white/20">
                            <h4 className="text-3xl font-bold uppercase tracking-widest">{packData.name}</h4>
                            <p className="text-sm text-zinc-400 mt-2">{packData.cardsPerPack} Cards</p>
                          </div>
                        </div>
                        <div className="absolute bottom-6 left-6 right-6 flex justify-center gap-2">
                          {packData.cards.slice(0, 5).map((card, i) => (
                            <div 
                              key={card.id}
                              className="w-14 h-20 border border-white/20 bg-zinc-800 overflow-hidden"
                              style={{ transform: `rotate(${(i - 2) * 5}deg)` }}
                            >
                              <img src={card.frontImage} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                      {packData.cards.slice(0, 3).map((card, i) => (
                        <div 
                          key={card.id}
                          className="absolute top-0 left-0 w-full h-full pointer-events-none"
                          style={{ transform: `translate(${(i + 1) * 8}px, ${(i + 1) * -8}px) rotate(${(i + 1) * 2}deg)`, zIndex: -i - 1 }}
                        >
                          <div className="w-full h-full bg-zinc-800 border-2 border-zinc-700 opacity-50" />
                        </div>
                      ))}
                    </div>
                    {packData.cards.length === 0 && (
                      <p className="text-center text-zinc-500 text-sm mt-4">Add cards to your pack from the sidebar</p>
                    )}
                  </div>
                  )
                ) : side === "front" ? (
                  cardMode === "sports" ? (
                  <div className="relative w-[550px] aspect-[2.5/3.5] shadow-2xl group overflow-hidden" style={{ backgroundColor: cardData.borderColor }} data-testid="card-preview-sports">
                    <div className="absolute inset-2 bg-white flex flex-col overflow-hidden">
                      {cardData.logo && side === "front" && (
                        <img src={cardData.logo} style={getLogoPositionStyle()} alt="Logo" data-testid="card-logo-sports" />
                      )}
                      <div className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing" onMouseDown={handleImageDragStart} onWheel={handleImageWheel}>
                        <img src={cardData.frontImage} style={{ ...getImageTransformStyle(), ...getCardFilterStyle() }} draggable={false} />
                        {cardData.filters.halftone && (
                          <div className="absolute inset-0 pointer-events-none mix-blend-multiply" 
                               style={{ backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.3) 25%, transparent 25%)`, backgroundSize: '4px 4px' }} />
                        )}
                        {cardData.jerseyNumber && (
                          <div className="absolute top-3 right-3 w-14 h-14 rounded-full flex items-center justify-center font-bold text-2xl shadow-lg" style={{ backgroundColor: cardData.accentColor, color: cardData.borderColor, fontFamily: cardData.statsFont }}>
                            {cardData.jerseyNumber}
                          </div>
                        )}
                        <div className="absolute top-3 left-3 px-2 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: cardData.accentColor, color: cardData.borderColor }}>
                          {cardData.type}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-12 pb-3 px-4">
                          {cardData.nameArch !== 0 ? (
                            <svg viewBox="0 0 300 40" className="w-full h-10" preserveAspectRatio="xMidYMid meet">
                              <defs>
                                <path
                                  id="card-name-arch"
                                  d={cardData.nameArch > 0
                                    ? `M 5,35 Q 150,${35 - Math.abs(cardData.nameArch) * 0.35} 295,35`
                                    : `M 5,10 Q 150,${10 + Math.abs(cardData.nameArch) * 0.35} 295,10`}
                                  fill="none"
                                />
                              </defs>
                              <text fontSize="18" fontFamily={cardData.nameFont} fontWeight="bold" fill="white" textAnchor="middle" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                <textPath href="#card-name-arch" startOffset="50%">{cardData.name}</textPath>
                              </text>
                            </svg>
                          ) : (
                            <h3 className="text-xl font-bold uppercase tracking-wider text-white" style={{ fontFamily: cardData.nameFont }} data-testid="text-card-name">{cardData.name}</h3>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {cardData.position && <span className="text-xs text-white/80 font-medium">{cardData.position}</span>}
                            {cardData.teamName && <span className="text-xs text-white/60">• {cardData.teamName}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="p-3 flex flex-col gap-2" style={{ backgroundColor: cardData.borderColor === "#FFFFFF" ? "#f8f8f8" : "white" }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-black">
                            {cardData.sport && <span className="text-xs font-bold uppercase px-2 py-0.5 rounded" style={{ backgroundColor: cardData.accentColor + "20", color: cardData.borderColor === "#FFFFFF" ? "#333" : cardData.borderColor }}>{cardData.sport}</span>}
                            {cardData.season && <span className="text-xs text-zinc-500" style={{ fontFamily: cardData.statsFont }}>{cardData.season}</span>}
                          </div>
                          {cardData.school && <span className="text-[10px] text-zinc-400 italic">{cardData.school}</span>}
                        </div>
                        {(cardData.height || cardData.weight) && (
                          <div className="flex gap-4 text-[11px] text-zinc-600 border-t border-zinc-200 pt-2" style={{ fontFamily: cardData.statsFont }}>
                            {cardData.height && <span>HT: {cardData.height}</span>}
                            {cardData.weight && <span>WT: {cardData.weight}</span>}
                            {cardData.grade && <span>Grade: {cardData.grade}</span>}
                          </div>
                        )}
                        {cardData.statLine && (
                          <p className="text-xs font-bold text-black border-t border-zinc-200 pt-2" style={{ fontFamily: cardData.statsFont }}>{cardData.statLine}</p>
                        )}
                        {cardData.effect && (
                          <p className="text-[10px] text-zinc-600 italic" style={{ fontFamily: cardData.loreFont }}>{cardData.effect}</p>
                        )}
                        {cardData.lore && (
                          <p className="text-[9px] text-zinc-400 italic leading-relaxed" style={{ fontFamily: cardData.loreFont }}>"{cardData.lore.substring(0, 80)}{cardData.lore.length > 80 ? "..." : ""}"</p>
                        )}
                      </div>
                    </div>
                  </div>
                  ) : (
                  <div className="relative w-[550px] aspect-[2.5/3.5] shadow-2xl group overflow-hidden" style={{ backgroundColor: cardData.borderColor }}>
                    <div className="absolute inset-2 bg-white flex flex-col overflow-hidden">
                      {cardData.logo && (
                        <img src={cardData.logo} style={getLogoPositionStyle()} alt="Logo" data-testid="card-logo-tcg" />
                      )}
                      <div className="h-10 flex justify-between items-center px-3 border-b-2" style={{ borderColor: cardData.borderColor }}>
                        {cardData.nameArch !== 0 ? (
                          <svg viewBox="0 0 300 40" className="flex-1 h-full" preserveAspectRatio="xMidYMid meet">
                            <defs>
                              <path
                                id="card-name-arch"
                                d={cardData.nameArch > 0
                                  ? `M 5,35 Q 150,${35 - Math.abs(cardData.nameArch) * 0.35} 295,35`
                                  : `M 5,10 Q 150,${10 + Math.abs(cardData.nameArch) * 0.35} 295,10`}
                                fill="none"
                              />
                            </defs>
                            <text
                              fontSize="16"
                              fontFamily={cardData.nameFont}
                              fontWeight="bold"
                              fill="black"
                              textAnchor="middle"
                              style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
                            >
                              <textPath href="#card-name-arch" startOffset="50%">
                                {cardData.name}
                              </textPath>
                            </text>
                          </svg>
                        ) : (
                          <span className="font-bold uppercase tracking-tight text-black" style={{ fontFamily: cardData.nameFont }} data-testid="text-card-name">{cardData.name}</span>
                        )}
                        <div className="flex gap-1">
                          {[...Array(Math.min(cardData.cost, 5))].map((_, i) => (
                            <div key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: cardData.accentColor }} />
                          ))}
                        </div>
                      </div>
                      <div className="flex-1 relative overflow-hidden border-b-2 cursor-grab active:cursor-grabbing" style={{ borderColor: cardData.borderColor }} onMouseDown={handleImageDragStart} onWheel={handleImageWheel}>
                        <img src={cardData.frontImage} style={{ ...getImageTransformStyle(), ...getCardFilterStyle() }} draggable={false} />
                        {cardData.filters.halftone && (
                          <div className="absolute inset-0 pointer-events-none mix-blend-multiply" 
                               style={{ backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.3) 25%, transparent 25%)`, backgroundSize: '4px 4px' }} />
                        )}
                        <div className="absolute bottom-0 left-0 px-2 py-1 text-xs font-bold text-white" style={{ backgroundColor: cardData.borderColor }}>
                          {cardData.rarity.toUpperCase()}
                        </div>
                      </div>
                      <div className="h-1/3 p-3 flex flex-col justify-between text-black">
                        <div className="space-y-2">
                          <p className="text-xs font-bold">{cardData.effect}</p>
                          <p className="text-[10px] italic leading-relaxed opacity-70" style={{ fontFamily: cardData.loreFont }}>
                            "{cardData.lore.substring(0, 100)}..."
                          </p>
                        </div>
                        <div className="flex justify-between items-center border-t-2 pt-2 mt-2" style={{ borderColor: cardData.borderColor }}>
                          <div className="flex gap-4 text-sm font-bold" style={{ fontFamily: cardData.statsFont }}>
                            <span>ATK {cardData.attack}</span>
                            <span>DEF {cardData.defense}</span>
                          </div>
                          <span className="text-xs font-bold">{cardData.type}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  )
                ) : (
                  <div className="relative w-[550px] aspect-[2.5/3.5] shadow-2xl flex items-center justify-center overflow-hidden" style={{ backgroundColor: cardData.borderColor }}>
                    <div className="absolute inset-4 border-2 border-white/30" />
                    <div className="absolute inset-0 opacity-30">
                      <img src={cardData.backImage} className="w-full h-full object-cover grayscale" />
                    </div>
                    <div className="z-10 w-28 h-28 rounded-full border-4 flex items-center justify-center" style={{ borderColor: cardData.accentColor }}>
                      <div className="w-20 h-20 rotate-45" style={{ backgroundColor: cardData.accentColor }} />
                    </div>
                  </div>
                )}
                </div>
                <p className="absolute bottom-8 font-mono text-xs text-zinc-500">
                  {side.toUpperCase()} • 300 DPI PRINT READY
                </p>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-56 bg-zinc-900 border-zinc-700 text-white">
              <ContextMenuItem onClick={() => setMode(mode === "single" ? "pack" : "single")} className="hover:bg-zinc-800 cursor-pointer">
                {mode === "single" ? <Package className="w-4 h-4 mr-2" /> : <Layers className="w-4 h-4 mr-2" />}
                {mode === "single" ? "Switch to Pack Mode" : "Switch to Card Mode"}
              </ContextMenuItem>
              <ContextMenuSeparator className="bg-zinc-700" />
              {mode === "single" && (
                <>
                  <ContextMenuItem onClick={() => setSide(side === "front" ? "back" : "front")} className="hover:bg-zinc-800 cursor-pointer">
                    <RotateCw className="w-4 h-4 mr-2" /> Flip Card
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => setShowDrawing(true)} className="hover:bg-zinc-800 cursor-pointer">
                    <Pen className="w-4 h-4 mr-2" /> Draw on {side === "front" ? "Front" : "Back"}
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => frontInputRef.current?.click()} className="hover:bg-zinc-800 cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" /> Upload Front Image
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => backInputRef.current?.click()} className="hover:bg-zinc-800 cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" /> Upload Back Image
                  </ContextMenuItem>
                  <ContextMenuSeparator className="bg-zinc-700" />
                </>
              )}
              <ContextMenuItem onClick={() => setShowAIGen(true)} className="hover:bg-zinc-800 cursor-pointer">
                <Wand2 className="w-4 h-4 mr-2" /> AI Generate Art
              </ContextMenuItem>
              <ContextMenuSeparator className="bg-zinc-700" />
              <ContextMenuSub>
                <ContextMenuSubTrigger className="hover:bg-zinc-800 cursor-pointer">
                  <Palette className="w-4 h-4 mr-2" /> Rarity
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-40 bg-zinc-900 border-zinc-700 text-white">
                  {(["common", "uncommon", "rare", "ultra", "legendary", "mythic"] as const).map(rarity => (
                    <ContextMenuItem 
                      key={rarity}
                      onClick={() => setCardData(prev => ({ ...prev, rarity }))}
                      className="hover:bg-zinc-800 cursor-pointer capitalize"
                    >
                      {rarity}
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
            </ContextMenuContent>
          </ContextMenu>
        </div>

        <input ref={frontInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "front")} />
        <input ref={backInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "back")} />
        <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
        <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />

        {showAIGen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-zinc-700 p-6 w-[500px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Wand2 className="w-5 h-5" /> AI Generate {side === "front" ? "Front" : "Back"} Art
                </h3>
                <button onClick={() => setShowAIGen(false)} className="p-2 hover:bg-zinc-800">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <AIGenerator type="card" onImageGenerated={handleAIGenerated} />
            </div>
          </div>
        )}

        {showDrawing && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-8">
            <DrawingWorkspace
              width={700}
              height={1000}
              initialData={side === "front" ? cardData.frontImage : cardData.backImage}
              onSave={(rasterData) => {
                if (side === "front") {
                  setCardData(prev => ({ ...prev, frontImage: rasterData, imageOffsetX: 0, imageOffsetY: 0, imageScale: 100, imageRotation: 0 }));
                } else {
                  setCardData(prev => ({ ...prev, backImage: rasterData }));
                }
                setShowDrawing(false);
                toast.success(`Drawing saved to ${side} of card`);
              }}
              onCancel={() => setShowDrawing(false)}
              className="w-full max-w-5xl h-[85vh]"
            />
          </div>
        )}

        {showPackOpening && (
          <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 overflow-auto">
            <style>{`
              @keyframes packShake { 0%,100%{transform:rotate(0)} 10%{transform:rotate(-3deg)} 20%{transform:rotate(3deg)} 30%{transform:rotate(-5deg)} 40%{transform:rotate(5deg)} 50%{transform:rotate(-3deg)} 60%{transform:rotate(3deg)} 70%{transform:rotate(-1deg)} 80%{transform:rotate(1deg)} 90%{transform:rotate(0)} }
              @keyframes packBurst { 0%{transform:scale(1);opacity:1} 50%{transform:scale(1.15);opacity:0.8} 100%{transform:scale(0.8);opacity:0} }
              @keyframes cardFlipIn { 0%{transform:perspective(600px) rotateY(180deg) scale(0.8);opacity:0} 40%{transform:perspective(600px) rotateY(90deg) scale(0.9);opacity:0.5} 100%{transform:perspective(600px) rotateY(0deg) scale(1);opacity:1} }
              @keyframes cardGlowPulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
              @keyframes rarityFlash { 0%{opacity:0.8} 100%{opacity:0} }
              @keyframes newBadgeBounce { 0%{transform:scale(0) rotate(-12deg)} 50%{transform:scale(1.3) rotate(-12deg)} 100%{transform:scale(1) rotate(-12deg)} }
              .pack-shake { animation: packShake 0.8s ease-in-out infinite; }
              .pack-burst { animation: packBurst 0.5s ease-out forwards; }
              .card-flip-in { animation: cardFlipIn 0.7s ease-out both; }
              .card-glow-pulse { animation: cardGlowPulse 2s ease-in-out infinite; }
              .new-badge-bounce { animation: newBadgeBounce 0.5s ease-out both; }
            `}</style>
            <div className="relative w-full max-w-4xl p-8">
              <button 
                onClick={() => { setShowPackOpening(false); setRevealedCards([]); }}
                className="absolute top-4 right-4 p-2 hover:bg-zinc-800 z-10"
                data-testid="button-close-pack-opening"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold font-display mb-2">{packData.name}</h2>
                <p className="text-zinc-400 font-mono text-sm">
                  {isRevealing ? `Revealing... ${revealedCards.length}/${packData.cardsPerPack}` : `${revealedCards.length} cards revealed`}
                </p>
                {isRevealing && (
                  <div className="w-48 mx-auto mt-3 h-1 bg-zinc-800 overflow-hidden">
                    <div className="h-full bg-white transition-all duration-500" style={{ width: `${(revealedCards.length / packData.cardsPerPack) * 100}%` }} />
                  </div>
                )}
              </div>

              {revealedCards.length === 0 && isRevealing && (
                <div className="flex justify-center items-center h-64">
                  <div className="relative w-48 aspect-[3/4] pack-shake">
                    <div className="absolute inset-0 bg-zinc-900 border-4 border-zinc-600 shadow-2xl overflow-hidden">
                      <img src={packData.packArt} className="w-full h-full object-cover opacity-60" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="w-12 h-12 text-white animate-spin" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(() => {
                const highestRarity = revealedCards.length > 0 ? revealedCards.reduce((best, c) => {
                  const order = ["Common","Uncommon","Rare","Epic","Legendary","Mythic"];
                  return order.indexOf(c.rarity) > order.indexOf(best.rarity) ? c : best;
                }, revealedCards[0]) : null;
                const flashColor = highestRarity && ["Epic","Legendary","Mythic"].includes(highestRarity.rarity) ? RARITY_COLORS[highestRarity.rarity] : null;
                return flashColor && revealedCards.length === 1 ? (
                  <div className="fixed inset-0 pointer-events-none z-40" style={{ backgroundColor: flashColor, animation: "rarityFlash 0.6s ease-out forwards" }} />
                ) : null;
              })()}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 justify-items-center">
                {revealedCards.map((card, idx) => {
                  const rarityIndex = ["Common","Uncommon","Rare","Epic","Legendary","Mythic"].indexOf(card.rarity);
                  const isHighRarity = rarityIndex >= 3;
                  return (
                    <div 
                      key={card.id}
                      className="relative w-32 aspect-[2.5/3.5] card-flip-in"
                      style={{ 
                        animationDelay: `${idx * 150}ms`,
                        boxShadow: RARITY_GLOW[card.rarity] || "none"
                      }}
                      data-testid={`revealed-card-${idx}`}
                    >
                      <div className="absolute inset-0" style={{ backgroundColor: card.borderColor || RARITY_COLORS[card.rarity] }}>
                        <div className="absolute inset-1 bg-white flex flex-col overflow-hidden">
                          <div 
                            className="h-6 flex justify-between items-center px-2 border-b"
                            style={{ borderColor: card.borderColor || RARITY_COLORS[card.rarity] }}
                          >
                            <span className="font-bold text-[8px] uppercase tracking-tight text-black truncate">
                              {card.name}
                            </span>
                          </div>
                          
                          <div className="flex-1 relative overflow-hidden">
                            <img src={card.frontImage} className="w-full h-full object-cover" />
                            <div 
                              className="absolute bottom-0 left-0 px-1.5 py-0.5 text-[6px] font-bold text-white uppercase tracking-wider"
                              style={{ backgroundColor: RARITY_COLORS[card.rarity] }}
                            >
                              {card.rarity}
                            </div>
                          </div>
                          
                          <div className="h-6 px-1 flex items-center justify-between text-black border-t" style={{ borderColor: card.borderColor || RARITY_COLORS[card.rarity] }}>
                            <span className="text-[8px] font-bold">ATK {card.attack}</span>
                            <span className="text-[8px] font-bold">DEF {card.defense}</span>
                          </div>
                        </div>
                      </div>

                      {isHighRarity && (
                        <div 
                          className="absolute -top-3 -left-3 px-1.5 py-0.5 text-[7px] font-black text-black uppercase tracking-wider new-badge-bounce"
                          style={{ backgroundColor: RARITY_COLORS[card.rarity], animationDelay: `${idx * 150 + 500}ms` }}
                        >
                          NEW!
                        </div>
                      )}

                      <div 
                        className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center text-[8px] font-bold border-2 border-black text-black"
                        style={{ backgroundColor: RARITY_COLORS[card.rarity] }}
                      >
                        {rarityIndex + 1}
                      </div>
                    </div>
                  );
                })}
              </div>

              {!isRevealing && revealedCards.length > 0 && (
                <div className="text-center mt-8 space-y-4">
                  <div className="flex justify-center gap-2 flex-wrap">
                    {["Common","Uncommon","Rare","Epic","Legendary","Mythic"].map(rarity => {
                      const count = revealedCards.filter(c => c.rarity === rarity).length;
                      if (count === 0) return null;
                      return (
                        <span 
                          key={rarity}
                          className="px-3 py-1 text-xs font-bold bg-zinc-900 border-2"
                          style={{ borderColor: RARITY_COLORS[rarity], color: RARITY_COLORS[rarity] }}
                        >
                          {rarity}: {count}
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex justify-center gap-4">
                    <button 
                      onClick={simulatePackOpening}
                      className="px-6 py-3 bg-white text-black font-bold flex items-center gap-2 hover:bg-zinc-200"
                      data-testid="button-open-another-pack"
                    >
                      <RefreshCw className="w-4 h-4" /> Open Another Pack
                    </button>
                    <button 
                      onClick={() => { setShowPackOpening(false); setRevealedCards([]); }}
                      className="px-6 py-3 bg-zinc-800 text-white font-bold flex items-center gap-2 hover:bg-zinc-700"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {showTeamPrint && (
          <div className="fixed inset-0 bg-white z-[9999] overflow-auto" style={{ position: "fixed", left: "-9999px", top: 0 }}>
            <div ref={teamPrintRef} style={{ width: "8.5in", padding: "0.5in", fontFamily: "Arial, sans-serif", backgroundColor: "white" }}>
              <div style={{ textAlign: "center", marginBottom: "24px", borderBottom: "3px solid black", paddingBottom: "12px" }}>
                <h1 style={{ fontSize: "28px", fontWeight: "bold", margin: 0, color: packData.teamColors.primary }}>{packData.teamName || "Team Cards"}</h1>
                <p style={{ fontSize: "14px", color: "#666", margin: "4px 0" }}>{packData.sport} {packData.season && `• ${packData.season} Season`}</p>
                {packData.school && <p style={{ fontSize: "12px", color: "#999", margin: "2px 0" }}>{packData.school}</p>}
                {packData.coachName && <p style={{ fontSize: "12px", color: "#999", margin: "2px 0" }}>Coach: {packData.coachName}</p>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                {packData.cards.map((card) => (
                  <div key={card.id} style={{ aspectRatio: "2.5/3.5", backgroundColor: card.borderColor || packData.teamColors.primary, position: "relative", pageBreakInside: "avoid" }}>
                    <div style={{ position: "absolute", inset: "4px", backgroundColor: "white", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                        <img src={card.frontImage} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        {card.jerseyNumber && (
                          <div style={{ position: "absolute", top: "6px", right: "6px", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "14px", backgroundColor: card.accentColor || packData.teamColors.secondary, color: card.borderColor || packData.teamColors.primary }}>
                            {card.jerseyNumber}
                          </div>
                        )}
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.8))", padding: "8px" }}>
                          <p style={{ fontSize: "11px", fontWeight: "bold", color: "white", textTransform: "uppercase", margin: 0 }}>{card.name}</p>
                          <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.7)", margin: 0 }}>{card.position}</p>
                        </div>
                      </div>
                      <div style={{ padding: "6px", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: card.borderColor || packData.teamColors.primary }}>
                        <span style={{ fontSize: "8px", fontWeight: "bold", color: "white" }}>{card.teamName || packData.teamName}</span>
                        <span style={{ fontSize: "7px", color: "rgba(255,255,255,0.6)" }}>{card.season || packData.season}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: "center", marginTop: "16px", paddingTop: "8px", borderTop: "1px solid #ddd", fontSize: "10px", color: "#999" }}>
                Created with PSCoMiXX Creator • {packData.cards.length} Player Cards • Print at 300 DPI for best quality
              </div>
            </div>
          </div>
        )}

        {showFxBrowser && (
          <div className="fixed top-16 right-4 w-96 max-h-[80vh] bg-black border border-purple-500/30 shadow-[4px_4px_0px_0px_rgba(168,85,247,0.3)] z-50 overflow-hidden flex flex-col">
            <FxBrowserPanel
              onClose={() => setShowFxBrowser(false)}
              useLabel="Use as Card Art"
              onSelectEffect={(effect: FxEffect) => {
                if (effect.preview_data_url) {
                  setCardData(prev => ({
                    ...prev,
                    [side === "front" ? "frontImage" : "backImage"]: effect.preview_data_url!,
                  }));
                  toast.success(`"${effect.name}" applied as ${side} card art`);
                  setShowFxBrowser(false);
                } else {
                  toast.error("This effect has no preview image");
                }
              }}
            />
          </div>
        )}
      </div>
    </Layout>
  );
}
