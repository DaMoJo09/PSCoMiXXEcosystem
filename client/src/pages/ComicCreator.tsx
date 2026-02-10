import { Layout } from "@/components/layout/Layout";
import { 
  Save, Undo, Redo, MousePointer, Pen, Eraser, Type, Image as ImageIcon, 
  Square, Layers, Download, Film, MessageSquare, Wand2, Plus, ArrowLeft,
  ChevronLeft, ChevronRight, Circle, LayoutGrid, Maximize2, Minimize2,
  Trash2, MoveUp, MoveDown, X, Upload, Move, ZoomIn, ZoomOut, Eye, EyeOff,
  Lock, Unlock, Copy, RotateCcw, Palette, Grid, Scissors, ClipboardPaste, PenTool, Share2, Volume2, FolderOpen
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { AIGenerator } from "@/components/tools/AIGenerator";
import { TransformableElement, TransformState } from "@/components/tools/TransformableElement";
import { TextElement } from "@/components/tools/TextElement";
import { useProject, useUpdateProject, useCreateProject } from "@/hooks/useProjects";
import { SendHorizonal, Rocket } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAssetLibrary } from "@/contexts/AssetLibraryContext";
import { toast } from "sonner";
import { PostComposer } from "@/components/social/PostComposer";
import { useSubscription } from "@/hooks/use-subscription";
import { UpgradeModal } from "@/components/UpgradeModal";
import { BubbleSidebar } from "@/components/tools/BubbleSidebar";
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
  type: "image" | "text" | "bubble" | "drawing" | "shape" | "video" | "gif" | "audio";
  transform: TransformState;
  data: {
    url?: string;
    text?: string;
    bubbleStyle?: "none" | "speech" | "thought" | "shout" | "whisper" | "burst" | "scream" | "robot" | "drip" | "glitch" | "retro" | "neon" | "graffiti" | "caption" | "starburst";
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    backgroundColor?: string;
    padding?: number;
    borderRadius?: number;
    drawingData?: string;
    vectorData?: VectorPath[];
    videoUrl?: string;
    audioUrl?: string;
    audioName?: string;
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
    textEffect?: "none" | "outline" | "shadow" | "glow" | "3d" | "emboss" | "neon" | "comic" | "retro" | "fire" | "ice" | "gold" | "chrome";
    strokeColor?: string;
    strokeWidth?: number;
    shadowColor?: string;
    shadowBlur?: number;
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
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

interface Spread {
  id: string;
  leftPage: Panel[];
  rightPage: Panel[];
}

// Panel templates organized by category - inspired by standard comic book template layouts
// Using integer values to avoid precision issues with thirds
const third = 100/3;
const twoThird = 200/3;

const panelTemplates = [
  // Basic Layouts
  { id: "full_splash", name: "Full Splash", category: "basic", panels: [{x:0,y:0,width:100,height:100}] },
  { id: "split_vertical", name: "Split Vertical", category: "basic", panels: [{x:0,y:0,width:50,height:100},{x:50,y:0,width:50,height:100}] },
  { id: "split_horizontal", name: "Split Horizontal", category: "basic", panels: [{x:0,y:0,width:100,height:50},{x:0,y:50,width:100,height:50}] },
  
  // Grid Layouts
  { id: "grid_2x2", name: "2x2 Grid", category: "grid", panels: [{x:0,y:0,width:50,height:50},{x:50,y:0,width:50,height:50},{x:0,y:50,width:50,height:50},{x:50,y:50,width:50,height:50}] },
  { id: "grid_3x3", name: "3x3 Grid", category: "grid", panels: [{x:0,y:0,width:third,height:third},{x:third,y:0,width:third,height:third},{x:twoThird,y:0,width:third,height:third},{x:0,y:third,width:third,height:third},{x:third,y:third,width:third,height:third},{x:twoThird,y:third,width:third,height:third},{x:0,y:twoThird,width:third,height:third},{x:third,y:twoThird,width:third,height:third},{x:twoThird,y:twoThird,width:third,height:third}] },
  { id: "grid_2x3", name: "2x3 Grid", category: "grid", panels: [{x:0,y:0,width:50,height:third},{x:50,y:0,width:50,height:third},{x:0,y:third,width:50,height:third},{x:50,y:third,width:50,height:third},{x:0,y:twoThird,width:50,height:third},{x:50,y:twoThird,width:50,height:third}] },
  { id: "grid_3x2", name: "3x2 Grid", category: "grid", panels: [{x:0,y:0,width:third,height:50},{x:third,y:0,width:third,height:50},{x:twoThird,y:0,width:third,height:50},{x:0,y:50,width:third,height:50},{x:third,y:50,width:third,height:50},{x:twoThird,y:50,width:third,height:50}] },
  
  // Action Layouts
  { id: "action_impact", name: "Action Impact", category: "action", panels: [{x:0,y:0,width:60,height:100},{x:60,y:0,width:40,height:50},{x:60,y:50,width:40,height:50}] },
  { id: "action_sequence", name: "Action Sequence", category: "action", panels: [{x:0,y:0,width:100,height:40},{x:0,y:40,width:third,height:60},{x:third,y:40,width:third,height:60},{x:twoThird,y:40,width:third,height:60}] },
  { id: "hero_moment", name: "Hero Moment", category: "action", panels: [{x:0,y:0,width:70,height:70},{x:70,y:0,width:30,height:35},{x:70,y:35,width:30,height:35},{x:0,y:70,width:50,height:30},{x:50,y:70,width:50,height:30}] },
  { id: "explosion", name: "Explosion", category: "action", panels: [{x:20,y:10,width:60,height:60},{x:0,y:0,width:25,height:40},{x:75,y:0,width:25,height:40},{x:0,y:60,width:40,height:40},{x:60,y:60,width:40,height:40}] },
  
  // Dialogue Layouts
  { id: "dialogue_flow", name: "Dialogue Flow", category: "dialogue", panels: [{x:0,y:0,width:50,height:50},{x:50,y:0,width:50,height:50},{x:0,y:50,width:100,height:50}] },
  { id: "reaction_shot", name: "Reaction Shot", category: "dialogue", panels: [{x:0,y:0,width:100,height:60},{x:0,y:60,width:third,height:40},{x:third,y:60,width:third,height:40},{x:twoThird,y:60,width:third,height:40}] },
  
  // Manga Layouts
  { id: "manga_action", name: "Manga Action", category: "manga", panels: [{x:0,y:0,width:60,height:40},{x:60,y:0,width:40,height:60},{x:0,y:40,width:60,height:60},{x:60,y:60,width:40,height:40}] },
  { id: "manga_intro", name: "Manga Intro", category: "manga", panels: [{x:0,y:0,width:100,height:50},{x:0,y:50,width:40,height:50},{x:40,y:50,width:30,height:50},{x:70,y:50,width:30,height:50}] },
  { id: "manga_dramatic", name: "Manga Dramatic", category: "manga", panels: [{x:0,y:0,width:100,height:30},{x:0,y:30,width:50,height:70},{x:50,y:30,width:50,height:35},{x:50,y:65,width:50,height:35}] },
  { id: "manga_closeup", name: "Manga Closeup", category: "manga", panels: [{x:0,y:0,width:40,height:50},{x:40,y:0,width:60,height:50},{x:0,y:50,width:60,height:50},{x:60,y:50,width:40,height:50}] },
  
  // Webtoon Layouts
  { id: "webtoon_scroll", name: "Webtoon Scroll", category: "webtoon", panels: [{x:0,y:0,width:100,height:third},{x:0,y:third,width:100,height:third},{x:0,y:twoThird,width:100,height:third}] },
  { id: "webtoon_dramatic", name: "Webtoon Dramatic", category: "webtoon", panels: [{x:0,y:0,width:100,height:50},{x:0,y:50,width:100,height:25},{x:0,y:75,width:100,height:25}] },
  { id: "webtoon_conversation", name: "Webtoon Conversation", category: "webtoon", panels: [{x:0,y:0,width:100,height:25},{x:0,y:25,width:100,height:25},{x:0,y:50,width:100,height:25},{x:0,y:75,width:100,height:25}] },
  
  // Cinematic Layouts
  { id: "cinematic_wide", name: "Cinematic Wide", category: "cinematic", panels: [{x:0,y:0,width:100,height:25},{x:0,y:25,width:100,height:50},{x:0,y:75,width:100,height:25}] },
  { id: "cinematic_letterbox", name: "Cinematic Letterbox", category: "cinematic", panels: [{x:0,y:15,width:100,height:70}] },
  { id: "cinematic_triptych", name: "Cinematic Triptych", category: "cinematic", panels: [{x:0,y:0,width:third,height:100},{x:third,y:0,width:third,height:100},{x:twoThird,y:0,width:third,height:100}] },
  { id: "cinematic_sequence", name: "Cinematic Sequence", category: "cinematic", panels: [{x:0,y:0,width:100,height:20},{x:0,y:20,width:100,height:20},{x:0,y:40,width:100,height:20},{x:0,y:60,width:100,height:20},{x:0,y:80,width:100,height:20}] },
  
  // Creative Layouts
  { id: "broken_grid", name: "Broken Grid", category: "creative", panels: [{x:0,y:0,width:60,height:60},{x:40,y:40,width:60,height:60}] },
  { id: "diagonal_split", name: "Diagonal Split", category: "creative", panels: [{x:0,y:0,width:100,height:50},{x:0,y:50,width:50,height:50},{x:50,y:50,width:50,height:50}] },
  { id: "l_shape", name: "L-Shape", category: "creative", panels: [{x:0,y:0,width:70,height:100},{x:70,y:0,width:30,height:50},{x:70,y:50,width:30,height:50}] },
  { id: "t_shape", name: "T-Shape", category: "creative", panels: [{x:0,y:0,width:100,height:40},{x:0,y:40,width:third,height:60},{x:third,y:40,width:third,height:60},{x:twoThird,y:40,width:third,height:60}] },
  { id: "pyramid", name: "Pyramid", category: "creative", panels: [{x:25,y:0,width:50,height:third},{x:0,y:third,width:50,height:third},{x:50,y:third,width:50,height:third},{x:0,y:twoThird,width:third,height:third},{x:third,y:twoThird,width:third,height:third},{x:twoThird,y:twoThird,width:third,height:third}] },
  
  // Classic Comic Layouts - with traditional gutters (2% margins)
  { id: "classic_6panel", name: "Classic 6-Panel", category: "classic", panels: [{x:1,y:1,width:48,height:31},{x:51,y:1,width:48,height:31},{x:1,y:34,width:48,height:31},{x:51,y:34,width:48,height:31},{x:1,y:67,width:48,height:32},{x:51,y:67,width:48,height:32}] },
  { id: "classic_splash_bottom", name: "Splash + Bottom", category: "classic", panels: [{x:0,y:0,width:100,height:70},{x:0,y:70,width:50,height:30},{x:50,y:70,width:50,height:30}] },
  { id: "classic_top_splash", name: "Top + Splash", category: "classic", panels: [{x:0,y:0,width:50,height:30},{x:50,y:0,width:50,height:30},{x:0,y:30,width:100,height:70}] },
];

// Template categories for UI organization
const templateCategories = [
  { id: "basic", name: "Basic" },
  { id: "grid", name: "Grids" },
  { id: "action", name: "Action" },
  { id: "dialogue", name: "Dialogue" },
  { id: "manga", name: "Manga" },
  { id: "webtoon", name: "Webtoon" },
  { id: "cinematic", name: "Cinematic" },
  { id: "creative", name: "Creative" },
  { id: "classic", name: "Classic" },
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

// SVG Speech Bubble Presets (from custom assets)
const bubblePresets = [
  { id: "bubble_8", name: "Classic Round", file: "/assets/bubbles/8.svg" },
  { id: "bubble_9", name: "Oval Speech", file: "/assets/bubbles/9.svg" },
  { id: "bubble_10", name: "Cloud Thought", file: "/assets/bubbles/10.svg" },
  { id: "bubble_11", name: "Rounded Rect", file: "/assets/bubbles/11.svg" },
  { id: "bubble_12", name: "Pointed Speech", file: "/assets/bubbles/12.svg" },
  { id: "bubble_13", name: "Burst Shout", file: "/assets/bubbles/13.svg" },
  { id: "bubble_14", name: "Wavy Edge", file: "/assets/bubbles/14.svg" },
  { id: "bubble_15", name: "Square Speech", file: "/assets/bubbles/15.svg" },
  { id: "bubble_16", name: "Double Outline", file: "/assets/bubbles/16.svg" },
  { id: "bubble_17", name: "Fluffy Cloud", file: "/assets/bubbles/17.svg" },
  { id: "bubble_18", name: "Starburst", file: "/assets/bubbles/18.svg" },
  { id: "bubble_19", name: "Explosion", file: "/assets/bubbles/19.svg" },
  { id: "bubble_20", name: "Whisper", file: "/assets/bubbles/20.svg" },
  { id: "bubble_21", name: "Yell", file: "/assets/bubbles/21.svg" },
  { id: "bubble_22", name: "Narration Box", file: "/assets/bubbles/22.svg" },
  { id: "bubble_23", name: "Caption", file: "/assets/bubbles/23.svg" },
  { id: "bubble_24", name: "Thought Bubble", file: "/assets/bubbles/24.svg" },
  { id: "bubble_25", name: "Electric", file: "/assets/bubbles/25.svg" },
  { id: "bubble_26", name: "Jagged Edge", file: "/assets/bubbles/26.svg" },
  { id: "bubble_27", name: "Scalloped", file: "/assets/bubbles/27.svg" },
  { id: "bubble_28", name: "Soft Round", file: "/assets/bubbles/28.svg" },
  { id: "bubble_29", name: "Pointed Left", file: "/assets/bubbles/29.svg" },
  { id: "bubble_30", name: "Pointed Right", file: "/assets/bubbles/30.svg" },
  { id: "bubble_31", name: "Double Bubble", file: "/assets/bubbles/31.svg" },
  { id: "bubble_32", name: "Wide Speech", file: "/assets/bubbles/32.svg" },
  { id: "bubble_33", name: "Tall Speech", file: "/assets/bubbles/33.svg" },
  { id: "bubble_34", name: "Comic Classic", file: "/assets/bubbles/34.svg" },
  { id: "bubble_35", name: "Action Burst", file: "/assets/bubbles/35.svg" },
  { id: "bubble_36", name: "Impact", file: "/assets/bubbles/36.svg" },
  { id: "bubble_37", name: "Splash", file: "/assets/bubbles/37.svg" },
  { id: "bubble_38", name: "Emotion", file: "/assets/bubbles/38.svg" },
  { id: "bubble_39", name: "Dramatic", file: "/assets/bubbles/39.svg" },
  { id: "bubble_40", name: "Sleek", file: "/assets/bubbles/40.svg" },
  { id: "bubble_41", name: "Bold", file: "/assets/bubbles/41.svg" },
  { id: "bubble_42", name: "Retro", file: "/assets/bubbles/42.svg" },
  { id: "bubble_43", name: "Modern", file: "/assets/bubbles/43.svg" },
  { id: "bubble_44", name: "Funky", file: "/assets/bubbles/44.svg" },
  { id: "bubble_45", name: "Simple", file: "/assets/bubbles/45.svg" },
  { id: "bubble_46", name: "Elegant", file: "/assets/bubbles/46.svg" },
  { id: "bubble_47", name: "Sharp", file: "/assets/bubbles/47.svg" },
  { id: "bubble_48", name: "Smooth", file: "/assets/bubbles/48.svg" },
];

// SVG Sound Effect Presets (from custom assets)
const effectPresets = [
  { id: "effect_20", name: "POW!", file: "/assets/effects/20.svg" },
  { id: "effect_21", name: "BAM!", file: "/assets/effects/21.svg" },
  { id: "effect_22", name: "CRASH!", file: "/assets/effects/22.svg" },
  { id: "effect_23", name: "BOOM!", file: "/assets/effects/23.svg" },
  { id: "effect_24", name: "ZAP!", file: "/assets/effects/24.svg" },
  { id: "effect_25", name: "WHAM!", file: "/assets/effects/25.svg" },
  { id: "effect_26", name: "KAPOW!", file: "/assets/effects/26.svg" },
  { id: "effect_27", name: "SPLASH!", file: "/assets/effects/27.svg" },
  { id: "effect_28", name: "CRACK!", file: "/assets/effects/28.svg" },
  { id: "effect_29", name: "SMASH!", file: "/assets/effects/29.svg" },
  { id: "effect_30", name: "BANG!", file: "/assets/effects/30.svg" },
  { id: "effect_31", name: "THWACK!", file: "/assets/effects/31.svg" },
  { id: "effect_32", name: "WHOOSH!", file: "/assets/effects/32.svg" },
  { id: "effect_33", name: "PUNCH!", file: "/assets/effects/33.svg" },
  { id: "effect_34", name: "KICK!", file: "/assets/effects/34.svg" },
  { id: "effect_35", name: "SLAM!", file: "/assets/effects/35.svg" },
  { id: "effect_36", name: "THUD!", file: "/assets/effects/36.svg" },
  { id: "effect_37", name: "CRUNCH!", file: "/assets/effects/37.svg" },
  { id: "effect_38", name: "SNAP!", file: "/assets/effects/38.svg" },
  { id: "effect_39", name: "POP!", file: "/assets/effects/39.svg" },
  { id: "effect_40", name: "BLAST!", file: "/assets/effects/40.svg" },
  { id: "effect_41", name: "KABOOM!", file: "/assets/effects/41.svg" },
  { id: "effect_42", name: "WHACK!", file: "/assets/effects/42.svg" },
  { id: "effect_43", name: "BONK!", file: "/assets/effects/43.svg" },
  { id: "effect_44", name: "CLANG!", file: "/assets/effects/44.svg" },
  { id: "effect_45", name: "ZING!", file: "/assets/effects/45.svg" },
  { id: "effect_46", name: "SWOOSH!", file: "/assets/effects/46.svg" },
  { id: "effect_47", name: "BUZZ!", file: "/assets/effects/47.svg" },
  { id: "effect_48", name: "SIZZLE!", file: "/assets/effects/48.svg" },
  { id: "effect_49", name: "FWOOSH!", file: "/assets/effects/49.svg" },
  { id: "effect_50", name: "KRASH!", file: "/assets/effects/50.svg" },
  { id: "effect_51", name: "BLAM!", file: "/assets/effects/51.svg" },
  { id: "effect_52", name: "SPLAT!", file: "/assets/effects/52.svg" },
  { id: "effect_53", name: "THUMP!", file: "/assets/effects/53.svg" },
  { id: "effect_54", name: "WHAM 2!", file: "/assets/effects/54.svg" },
  { id: "effect_55", name: "POW 2!", file: "/assets/effects/55.svg" },
  { id: "effect_56", name: "ZAP 2!", file: "/assets/effects/56.svg" },
  { id: "effect_57", name: "BOOM 2!", file: "/assets/effects/57.svg" },
  { id: "effect_58", name: "CRASH 2!", file: "/assets/effects/58.svg" },
  { id: "effect_59", name: "SMACK!", file: "/assets/effects/59.svg" },
  { id: "effect_60", name: "BIFF!", file: "/assets/effects/60.svg" },
  { id: "effect_61", name: "OOF!", file: "/assets/effects/61.svg" },
  { id: "effect_62", name: "UGH!", file: "/assets/effects/62.svg" },
  { id: "effect_63", name: "ARGH!", file: "/assets/effects/63.svg" },
  { id: "effect_64", name: "YEAH!", file: "/assets/effects/64.svg" },
  { id: "effect_65", name: "WOW!", file: "/assets/effects/65.svg" },
  { id: "effect_66", name: "OOPS!", file: "/assets/effects/66.svg" },
  { id: "effect_67", name: "HEY!", file: "/assets/effects/67.svg" },
  { id: "effect_68", name: "YAY!", file: "/assets/effects/68.svg" },
  { id: "effect_69", name: "NO!", file: "/assets/effects/69.svg" },
  { id: "effect_70", name: "YES!", file: "/assets/effects/70.svg" },
  { id: "effect_71", name: "HA!", file: "/assets/effects/71.svg" },
  { id: "effect_72", name: "HMM!", file: "/assets/effects/72.svg" },
];

const tools = [
  { id: "select", icon: MousePointer, label: "Select/Move", shortcut: "V" },
  { id: "panel", icon: Square, label: "Panel", shortcut: "P" },
  { id: "draw", icon: Pen, label: "Draw", shortcut: "B" },
  { id: "text", icon: Type, label: "Caption", shortcut: "T" },
  { id: "bubble", icon: MessageSquare, label: "Bubble", shortcut: "U" },
  { id: "ai", icon: Wand2, label: "AI Gen", shortcut: "G" },
];

export default function ComicCreator() {
  const [location, navigate] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const projectId = searchParams.get('id');
  
  const { data: project } = useProject(projectId || '');
  const updateProject = useUpdateProject();
  const createProject = useCreateProject();
  const { importFromFile, importFromFiles, assets, folders, getAssetsInFolder, isLoading: isAssetLibraryLoading, reorderAssets } = useAssetLibrary();
  const { hasFeature, isAdmin } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [activeTool, setActiveTool] = useState("select");
  const [showAIGen, setShowAIGen] = useState(false);
  const [showBubbleSidebar, setShowBubbleSidebar] = useState(false);
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
  const [showAssetLibrary, setShowAssetLibrary] = useState(false);
  const [selectedLibraryFolder, setSelectedLibraryFolder] = useState<string | null>(null);
  const [draggedAssetId, setDraggedAssetId] = useState<string | null>(null);
  const [brushSize, setBrushSize] = useState(4);
  const [brushColor, setBrushColor] = useState("#000000");
  const [zoom, setZoom] = useState(100);
  
  const [showPreview, setShowPreview] = useState(false);
  const [previewPage, setPreviewPage] = useState(0);
  const [autoLockPanels, setAutoLockPanels] = useState(true);
  const [comicMeta, setComicMeta] = useState({
    frontCover: "",
    backCover: "",
    bonusCards: [] as string[],
    credits: "Created with Press Start CoMixx"
  });
  

  const leftPageRef = useRef<HTMLDivElement>(null);
  const rightPageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const creationAttempted = useRef(false);

  const currentSpread = spreads[currentSpreadIndex];

  useEffect(() => {
    sessionStorage.removeItem('comic_creating');
    if (!projectId && !creationAttempted.current && !createProject.isPending) {
      creationAttempted.current = true;
      setIsCreating(true);
      createProject.mutateAsync({
        title: "Untitled Comic",
        type: "comic",
        status: "draft",
        data: { spreads: [] },
      }).then((newProject) => {
        setIsCreating(false);
        navigate(`/creator/comic?id=${newProject.id}`, { replace: true });
      }).catch(() => {
        toast.error("Failed to create project - please try again");
        setIsCreating(false);
        creationAttempted.current = false;
      });
    } else if (projectId) {
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
        case 'p': setActiveTool('panel'); break;
        case 'b': setActiveTool('draw'); break;
        case 'e': setActiveTool('erase'); break;
        case 't': setActiveTool('text'); break;
        case 'u': setShowBubbleSidebar(prev => !prev); break;
        case 'g': setShowAIGen(true); break;
        case 'delete': case 'backspace': {
          const isInInput = document.activeElement instanceof HTMLTextAreaElement || document.activeElement instanceof HTMLInputElement || (document.activeElement as HTMLElement)?.isContentEditable;
          if (!editingTextId && !isInInput) { handleDeleteSelected(); e.preventDefault(); }
          break;
        }
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
  }, [selectedPanelId, selectedContentId, editingTextId]);

  const handleDeleteSelected = () => {
    if (selectedContentId && selectedPanelId) {
      deleteContentFromPanel(selectedPage, selectedPanelId, selectedContentId);
      setSelectedContentId(null);
    } else if (selectedPanelId) {
      deletePanel(selectedPage, selectedPanelId);
      setSelectedPanelId(null);
    }
  };

  const qc = useQueryClient();
  const submitForReview = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/submit-review`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      toast.success("Submitted for review!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to submit for review"),
  });

  const publishProject = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/publish`, { visibility: "public" });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      toast.success("Publishing started!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to publish"),
  });

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
    if (!hasFeature("export") && !isAdmin) {
      setShowUpgradeModal(true);
      return;
    }
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
    if (!hasFeature("export") && !isAdmin) {
      setShowUpgradeModal(true);
      return;
    }
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
      id: `panel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...panelData,
      rotation: 0,
      contents: [],
      zIndex: page === "left" ? currentSpread.leftPage.length : currentSpread.rightPage.length,
      locked: autoLockPanels,
    };

    setSpreads(prev => prev.map((spread, i) => {
      if (i !== currentSpreadIndex) return spread;
      return {
        ...spread,
        [page === "left" ? "leftPage" : "rightPage"]: [...spread[page === "left" ? "leftPage" : "rightPage"], newPanel]
      };
    }));

    setSelectedPanelId(newPanel.id);
    toast.success(autoLockPanels ? "Panel created (locked)" : "Panel created");
    setActiveTool("select");
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

  const moveLayerUp = (page: "left" | "right", panelId: string) => {
    setSpreads(prev => prev.map((spread, i) => {
      if (i !== currentSpreadIndex) return spread;
      const key = page === "left" ? "leftPage" : "rightPage";
      const panels = [...spread[key]];
      const idx = panels.findIndex(p => p.id === panelId);
      if (idx > 0) {
        [panels[idx - 1], panels[idx]] = [panels[idx], panels[idx - 1]];
      }
      return { ...spread, [key]: panels };
    }));
  };

  const moveLayerDown = (page: "left" | "right", panelId: string) => {
    setSpreads(prev => prev.map((spread, i) => {
      if (i !== currentSpreadIndex) return spread;
      const key = page === "left" ? "leftPage" : "rightPage";
      const panels = [...spread[key]];
      const idx = panels.findIndex(p => p.id === panelId);
      if (idx < panels.length - 1) {
        [panels[idx], panels[idx + 1]] = [panels[idx + 1], panels[idx]];
      }
      return { ...spread, [key]: panels };
    }));
  };

  const moveContentUp = (page: "left" | "right", panelId: string, contentId: string) => {
    setSpreads(prev => prev.map((spread, i) => {
      if (i !== currentSpreadIndex) return spread;
      const key = page === "left" ? "leftPage" : "rightPage";
      return {
        ...spread,
        [key]: spread[key].map(p => {
          if (p.id !== panelId) return p;
          const contents = [...p.contents];
          const idx = contents.findIndex(c => c.id === contentId);
          if (idx > 0) {
            [contents[idx - 1], contents[idx]] = [contents[idx], contents[idx - 1]];
          }
          return { ...p, contents };
        })
      };
    }));
  };

  const moveContentDown = (page: "left" | "right", panelId: string, contentId: string) => {
    setSpreads(prev => prev.map((spread, i) => {
      if (i !== currentSpreadIndex) return spread;
      const key = page === "left" ? "leftPage" : "rightPage";
      return {
        ...spread,
        [key]: spread[key].map(p => {
          if (p.id !== panelId) return p;
          const contents = [...p.contents];
          const idx = contents.findIndex(c => c.id === contentId);
          if (idx < contents.length - 1) {
            [contents[idx], contents[idx + 1]] = [contents[idx + 1], contents[idx]];
          }
          return { ...p, contents };
        })
      };
    }));
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
    
    // Check if user double-clicked directly on an image element
    const target = e.target as HTMLElement;
    const clickedOnImage = target.tagName === 'IMG';
    
    if (clickedOnImage && activeTool !== "text" && activeTool !== "bubble" && activeTool !== "draw" && activeTool !== "erase") {
      // Find the content ID from the parent transformable element (data-testid="transformable-{id}")
      const transformableWrapper = target.closest('[data-testid^="transformable-"]');
      if (transformableWrapper) {
        const testId = transformableWrapper.getAttribute('data-testid');
        const contentId = testId?.replace('transformable-', '');
        if (contentId) {
          setSelectedContentId(contentId);
          setActiveTool("select");
          return;
        }
      }
    }
    
    const panels = page === "left" ? currentSpread.leftPage : currentSpread.rightPage;
    const panel = panels.find(p => p.id === panelId);
    
    if (activeTool === "text") {
      addTextToPanel(page, panelId);
    } else if (activeTool === "bubble") {
      addBubbleToPanel(page, panelId);
    } else if (activeTool === "draw" || activeTool === "erase") {
      if (projectId) {
        (async () => {
          try {
            await updateProject.mutateAsync({
              id: projectId,
              data: { title, data: { spreads } },
            });
            navigate(`/creator/motion`);
          } catch {
            toast.error("Save before opening Motion Studio failed");
          }
        })();
      } else {
        toast.error("Please wait for project to be created first");
      }
    } else {
      fileInputRef.current?.click();
    }
  };
  
  const handlePageDoubleClick = (e: React.MouseEvent, page: "left" | "right") => {
    // Only trigger if not clicking on a panel (clicking on empty page area)
    if ((e.target as HTMLElement).closest('[data-testid^="panel-"]')) return;
    // Switch to panel tool on double-click on empty page
    setActiveTool("panel");
    setSelectedPage(page);
    toast.success("Panel tool selected - draw to create panels");
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
      transform: { x: 50, y: 50, width: 300, height: 100, rotation: 0, scaleX: 1, scaleY: 1 },
      data: { 
        text: "YOUR TEXT", 
        fontSize: 32, 
        fontFamily: "'Bangers', cursive", 
        color: "#ffffff",
        textEffect: "comic",
        strokeColor: "#000000",
        strokeWidth: 3,
      },
      locked: false,
    });
    setEditingTextId(`content_${Date.now() - 1}`);
    toast.success("Text added - double-click to edit");
  };

  const addBubbleToPanel = (page: "left" | "right", panelId: string) => {
    addContentToPanel(page, panelId, {
      type: "bubble",
      transform: { x: 50, y: 50, width: 280, height: 150, rotation: 0, scaleX: 1, scaleY: 1 },
      data: { 
        text: "Dialog here...", 
        bubbleStyle: "speech", 
        fontSize: 18, 
        fontFamily: "'Bangers', cursive", 
        color: "#000000",
        textEffect: "none",
      },
      locked: false,
    });
    toast.success("Speech bubble added - double-click to edit");
  };

  const addCaptionToPanel = (page: "left" | "right", panelId: string) => {
    addContentToPanel(page, panelId, {
      type: "bubble",
      transform: { x: 10, y: 10, width: 320, height: 60, rotation: 0, scaleX: 1, scaleY: 1 },
      data: { 
        text: "NARRATOR TEXT...", 
        bubbleStyle: "caption", 
        fontSize: 14, 
        fontFamily: "'Special Elite', cursive", 
        color: "#000000",
        textEffect: "none",
      },
      locked: false,
    });
    toast.success("Caption box added - double-click to edit");
  };

  const addStarburstToPanel = (page: "left" | "right", panelId: string) => {
    addContentToPanel(page, panelId, {
      type: "bubble",
      transform: { x: 50, y: 50, width: 180, height: 180, rotation: 0, scaleX: 1, scaleY: 1 },
      data: { 
        text: "POW!", 
        bubbleStyle: "starburst", 
        fontSize: 36, 
        fontFamily: "'Bangers', cursive", 
        color: "#000000",
        textEffect: "comic",
        strokeColor: "#ff0000",
        strokeWidth: 3,
      },
      locked: false,
    });
    toast.success("Starburst effect added");
  };

  const addSoundEffectToPanel = (page: "left" | "right", panelId: string, effect: string) => {
    const effects: Record<string, { text: string; color: string; strokeColor: string }> = {
      pow: { text: "POW!", color: "#ffff00", strokeColor: "#ff0000" },
      bam: { text: "BAM!", color: "#ff6600", strokeColor: "#000000" },
      crash: { text: "CRASH!", color: "#ff0000", strokeColor: "#ffff00" },
      boom: { text: "BOOM!", color: "#ff3300", strokeColor: "#000000" },
      zap: { text: "ZAP!", color: "#00ffff", strokeColor: "#0066ff" },
      wham: { text: "WHAM!", color: "#ff00ff", strokeColor: "#000000" },
      kapow: { text: "KAPOW!", color: "#ffcc00", strokeColor: "#ff0000" },
      splash: { text: "SPLASH!", color: "#00ccff", strokeColor: "#0044aa" },
    };
    const sfx = effects[effect] || effects.pow;
    addContentToPanel(page, panelId, {
      type: "text",
      transform: { x: 80, y: 80, width: 200, height: 80, rotation: -15, scaleX: 1, scaleY: 1 },
      data: { 
        text: sfx.text, 
        fontSize: 48, 
        fontFamily: "'Bangers', cursive", 
        color: sfx.color,
        textEffect: "comic",
        strokeColor: sfx.strokeColor,
        strokeWidth: 4,
      },
      locked: false,
    });
    toast.success(`${sfx.text} added`);
  };

  const addBubblePresetToPanel = (page: "left" | "right", panelId: string, preset: typeof bubblePresets[0]) => {
    addContentToPanel(page, panelId, {
      type: "image",
      transform: { x: 50, y: 50, width: 250, height: 180, rotation: 0, scaleX: 1, scaleY: 1 },
      data: { url: preset.file },
      locked: false,
    });
    toast.success(`${preset.name} bubble added`);
  };

  const addEffectPresetToPanel = (page: "left" | "right", panelId: string, preset: typeof effectPresets[0]) => {
    addContentToPanel(page, panelId, {
      type: "image",
      transform: { x: 80, y: 80, width: 200, height: 150, rotation: -5, scaleX: 1, scaleY: 1 },
      data: { url: preset.file },
      locked: false,
    });
    toast.success(`${preset.name} effect added`);
  };

  const addSidebarAssetToPanel = (asset: { url: string; name: string }) => {
    if (!selectedPanelId) {
      toast.error("Please select a panel first");
      return;
    }
    addContentToPanel(selectedPage, selectedPanelId, {
      type: "image",
      transform: { x: 50, y: 50, width: 250, height: 180, rotation: 0, scaleX: 1, scaleY: 1 },
      data: { url: asset.url },
      locked: false,
    });
    toast.success(`${asset.name} added`);
  };

  const updatePanelStyle = (page: "left" | "right", panelId: string, style: Partial<Panel>) => {
    setSpreads(prev => prev.map((spread, i) => {
      if (i !== currentSpreadIndex) return spread;
      const key = page === "left" ? "leftPage" : "rightPage";
      return {
        ...spread,
        [key]: spread[key].map(p => p.id === panelId ? { ...p, ...style } : p)
      };
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPanelId) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const url = event.target?.result as string;
      const fileType = file.type.toLowerCase();
      const fileName = file.name.toLowerCase();
      
      // Determine the appropriate folder for the asset
      let folderId = "sprites"; // default folder
      if (fileType.startsWith('audio/') || fileName.match(/\.(mp3|wav|ogg|m4a)$/)) {
        folderId = "effects"; // audio goes to effects
      } else if (fileType.startsWith('video/') || fileName.match(/\.(mp4|webm|mov)$/)) {
        folderId = "effects"; // video goes to effects
      } else if (fileName.includes('background') || fileName.includes('bg')) {
        folderId = "backgrounds";
      } else if (fileName.includes('character') || fileName.includes('char')) {
        folderId = "characters";
      }
      
      // Save to asset library with error handling
      try {
        const savedAsset = await importFromFile(file, folderId);
        if (!savedAsset) {
          console.warn("Asset library save returned null");
        }
      } catch (err) {
        console.warn("Could not save to asset library:", err);
        toast.info("Asset added to panel (library save skipped)");
      }
      
      if (fileType.startsWith('audio/') || fileName.endsWith('.mp3') || fileName.endsWith('.wav') || fileName.endsWith('.ogg') || fileName.endsWith('.m4a')) {
        addContentToPanel(selectedPage, selectedPanelId, {
          type: "audio",
          transform: { x: 50, y: 50, width: 280, height: 80, rotation: 0, scaleX: 1, scaleY: 1 },
          data: { audioUrl: url, audioName: file.name, autoplay: false, loop: false },
          locked: false,
        });
        toast.success("Audio added to panel and saved to library");
      } else if (fileType.startsWith('video/') || fileName.endsWith('.mp4') || fileName.endsWith('.webm') || fileName.endsWith('.mov')) {
        addContentToPanel(selectedPage, selectedPanelId, {
          type: "video",
          transform: { x: 0, y: 0, width: 400, height: 300, rotation: 0, scaleX: 1, scaleY: 1 },
          data: { videoUrl: url, autoplay: true, loop: true, muted: true },
          locked: false,
        });
        toast.success("Video added to panel and saved to library");
      } else if (fileType === 'image/gif' || fileName.endsWith('.gif')) {
        addContentToPanel(selectedPage, selectedPanelId, {
          type: "gif",
          transform: { x: 0, y: 0, width: 400, height: 300, rotation: 0, scaleX: 1, scaleY: 1 },
          data: { url },
          locked: false,
        });
        toast.success("GIF added to panel and saved to library");
      } else {
        addContentToPanel(selectedPage, selectedPanelId, {
          type: "image",
          transform: { x: 0, y: 0, width: 400, height: 300, rotation: 0, scaleX: 1, scaleY: 1 },
          data: { url },
          locked: false,
        });
        toast.success("Image added to panel and saved to library");
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
    // Clear existing panels on the page first, then apply template
    setSpreads(prev => prev.map((spread, i) => {
      if (i !== currentSpreadIndex) return spread;
      const key = page === "left" ? "leftPage" : "rightPage";
      const newPanels = template.panels.map((p, idx) => ({
        id: `panel_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 9)}`,
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
        type: "rectangle" as const,
        rotation: 0,
        contents: [],
        zIndex: idx,
        locked: false,
      }));
      return { ...spread, [key]: newPanels };
    }));
    setSelectedPanelId(null);
    setShowTemplates(false);
    toast.success(`Template "${template.name}" applied (replaced existing panels)`);
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
        className={`absolute cursor-pointer overflow-visible ${
          isSelected ? 'ring-2 ring-white/50 z-20' : 'hover:border-gray-600'
        } ${panel.type === "circle" ? "rounded-full" : ""}`}
        style={{
          left: `${panel.x}%`,
          top: `${panel.y}%`,
          width: `${panel.width}%`,
          height: `${panel.height}%`,
          zIndex: panel.zIndex,
          transform: `rotate(${panel.rotation || 0}deg)`,
          transformOrigin: 'center center',
          backgroundColor: panel.backgroundColor || 'transparent',
          borderWidth: `${panel.borderWidth || 2}px`,
          borderStyle: 'solid',
          borderColor: panel.borderColor || 'black',
          boxShadow: isSelected 
            ? `0 0 0 3px white, 0 0 20px rgba(255,255,255,0.4), 0 8px 32px rgba(0,0,0,0.8)` 
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
                  className="w-full h-full object-contain"
                  draggable={false}
                />
              )}
              {content.type === "video" && content.data.videoUrl && (
                <video
                  src={content.data.videoUrl}
                  className="w-full h-full object-contain"
                  autoPlay={content.data.autoplay ?? true}
                  loop={content.data.loop ?? true}
                  muted={content.data.muted ?? true}
                  playsInline
                  draggable={false}
                />
              )}
              {content.type === "audio" && content.data.audioUrl && (
                <div className="w-full h-full bg-zinc-900 rounded-lg flex flex-col items-center justify-center p-2 gap-1">
                  <div className="flex items-center gap-2 text-white text-xs">
                    <Volume2 className="w-4 h-4 text-blue-400" />
                    <span className="truncate max-w-[180px]">{content.data.audioName || "Audio"}</span>
                  </div>
                  <audio
                    src={content.data.audioUrl}
                    controls
                    loop={content.data.loop ?? false}
                    autoPlay={content.data.autoplay ?? false}
                    className="w-full h-8"
                    style={{ maxHeight: '32px' }}
                  />
                </div>
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
                  backgroundColor={content.data.backgroundColor}
                  padding={content.data.padding}
                  borderRadius={content.data.borderRadius}
                  bubbleStyle={content.type === "bubble" ? (content.data.bubbleStyle as any) : "none"}
                  textEffect={content.data.textEffect as any}
                  strokeColor={content.data.strokeColor}
                  strokeWidth={content.data.strokeWidth}
                  shadowColor={content.data.shadowColor}
                  shadowBlur={content.data.shadowBlur}
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
        
        {panel.locked && (
          <>
            <div 
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
            >
              <div className="bg-black/50 rounded-full p-2">
                <Lock className="w-6 h-6 text-white/70" />
              </div>
            </div>
            {isSelected && (
              <div 
                className="absolute -top-8 right-0 flex gap-1 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="p-1 bg-white border border-black hover:bg-gray-100"
                  onClick={(e) => { e.stopPropagation(); togglePanelLock(page, panel.id); }}
                  title="Unlock Panel"
                >
                  <Unlock className="w-3 h-3" />
                </button>
              </div>
            )}
          </>
        )}

        <div
          className={`absolute inset-0 z-10 ${panel.locked ? 'cursor-pointer' : 'cursor-move'}`}
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => {
            if (panel.locked) {
              e.stopPropagation();
              handlePanelClick(e as any, panel.id, page);
            }
          }}
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
              disabled={isSaving || !projectId}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-save"
              title={!projectId ? "Creating project..." : "Save (Ctrl+S)"}
            >
              <Save className="w-4 h-4" /> {isSaving ? "Saving..." : !projectId ? "Creating..." : "Save"}
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
            {projectId && project && (project.status === "draft" || project.status === "rejected") && (
              <button
                onClick={() => submitForReview.mutate()}
                disabled={submitForReview.isPending}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 border border-cyan-500 text-sm font-bold flex items-center gap-2 text-white disabled:opacity-50"
                data-testid="button-submit-review"
              >
                <SendHorizonal className="w-4 h-4" /> Submit for Review
              </button>
            )}
            {projectId && project && project.status === "approved" && (
              <button
                onClick={() => publishProject.mutate()}
                disabled={publishProject.isPending}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 border border-green-500 text-sm font-bold flex items-center gap-2 text-white disabled:opacity-50"
                data-testid="button-publish"
              >
                <Rocket className="w-4 h-4" /> Publish
              </button>
            )}
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
                    onClick={() => {
                      if (tool.id === "ai") {
                        setShowAIGen(true);
                      } else if (tool.id === "bubble") {
                        setShowBubbleSidebar(prev => !prev);
                      } else {
                        setActiveTool(tool.id);
                      }
                    }}
                    className={`p-3 w-12 h-12 flex items-center justify-center transition-all ${
                      activeTool === tool.id ? 'bg-white text-black' : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                    data-testid={`tool-${tool.id}`}
                  >
                    <tool.icon className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-black border border-white text-white font-mono text-xs z-[200]">
                  <p>{tool.label} <span className="text-zinc-400 ml-1">({tool.shortcut})</span></p>
                </TooltipContent>
              </Tooltip>
            ))}
          </aside>

          <BubbleSidebar
            isOpen={showBubbleSidebar}
            onClose={() => setShowBubbleSidebar(false)}
            onSelectAsset={addSidebarAssetToPanel}
            hasPanelSelected={!!selectedPanelId}
          />

          <main className="flex-1 bg-zinc-950 overflow-auto flex flex-col items-center justify-center p-4 relative">
            <div className="absolute inset-0 pointer-events-none opacity-5"
                 style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

            <div className="text-white text-sm mb-4 font-mono flex items-center gap-4 relative z-[100] bg-zinc-900/80 px-4 py-2 rounded">
              <span>Spread {currentSpreadIndex + 1} of {spreads.length}</span>
              <button 
                onClick={async () => { 
                  if (currentSpreadIndex > 0) {
                    if (projectId) await handleSave();
                    setCurrentSpreadIndex(currentSpreadIndex - 1);
                  }
                }}
                className="px-2 py-1 hover:bg-white/10"
                disabled={currentSpreadIndex === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={async () => {
                  if (currentSpreadIndex < spreads.length - 1) {
                    if (projectId) await handleSave();
                    setCurrentSpreadIndex(currentSpreadIndex + 1);
                  }
                }}
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
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
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
                    onDoubleClick={(e) => handlePageDoubleClick(e, "left")}
                    onClick={(e) => { if (e.target === e.currentTarget) setShowBubbleSidebar(false); }}
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
                  <ContextMenuSub>
                    <ContextMenuSubTrigger className="hover:bg-zinc-800 cursor-pointer">
                      <MessageSquare className="w-4 h-4 mr-2" /> Bubble Presets
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="w-48 bg-zinc-900 border-zinc-700 text-white max-h-80 overflow-y-auto">
                      {bubblePresets.slice(0, 20).map(preset => (
                        <ContextMenuItem
                          key={preset.id}
                          onClick={() => {
                            if (selectedPanelId) {
                              addBubblePresetToPanel("left", selectedPanelId, preset);
                            } else {
                              toast.error("Select a panel first");
                            }
                          }}
                          className="hover:bg-zinc-800 cursor-pointer"
                        >
                          {preset.name}
                        </ContextMenuItem>
                      ))}
                      <ContextMenuSeparator className="bg-zinc-700" />
                      <ContextMenuSub>
                        <ContextMenuSubTrigger className="hover:bg-zinc-800 cursor-pointer">More Bubbles...</ContextMenuSubTrigger>
                        <ContextMenuSubContent className="w-48 bg-zinc-900 border-zinc-700 text-white max-h-80 overflow-y-auto">
                          {bubblePresets.slice(20).map(preset => (
                            <ContextMenuItem
                              key={preset.id}
                              onClick={() => {
                                if (selectedPanelId) {
                                  addBubblePresetToPanel("left", selectedPanelId, preset);
                                } else {
                                  toast.error("Select a panel first");
                                }
                              }}
                              className="hover:bg-zinc-800 cursor-pointer"
                            >
                              {preset.name}
                            </ContextMenuItem>
                          ))}
                        </ContextMenuSubContent>
                      </ContextMenuSub>
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                  <ContextMenuSub>
                    <ContextMenuSubTrigger className="hover:bg-zinc-800 cursor-pointer">
                      <Volume2 className="w-4 h-4 mr-2" /> Effect Presets
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="w-48 bg-zinc-900 border-zinc-700 text-white max-h-80 overflow-y-auto">
                      {effectPresets.slice(0, 20).map(preset => (
                        <ContextMenuItem
                          key={preset.id}
                          onClick={() => {
                            if (selectedPanelId) {
                              addEffectPresetToPanel("left", selectedPanelId, preset);
                            } else {
                              toast.error("Select a panel first");
                            }
                          }}
                          className="hover:bg-zinc-800 cursor-pointer font-bold"
                        >
                          {preset.name}
                        </ContextMenuItem>
                      ))}
                      <ContextMenuSeparator className="bg-zinc-700" />
                      <ContextMenuSub>
                        <ContextMenuSubTrigger className="hover:bg-zinc-800 cursor-pointer">More Effects...</ContextMenuSubTrigger>
                        <ContextMenuSubContent className="w-48 bg-zinc-900 border-zinc-700 text-white max-h-80 overflow-y-auto">
                          {effectPresets.slice(20).map(preset => (
                            <ContextMenuItem
                              key={preset.id}
                              onClick={() => {
                                if (selectedPanelId) {
                                  addEffectPresetToPanel("left", selectedPanelId, preset);
                                } else {
                                  toast.error("Select a panel first");
                                }
                              }}
                              className="hover:bg-zinc-800 cursor-pointer font-bold"
                            >
                              {preset.name}
                            </ContextMenuItem>
                          ))}
                        </ContextMenuSubContent>
                      </ContextMenuSub>
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                  {selectedPanelId && (
                    <ContextMenuItem onClick={() => addCaptionToPanel("left", selectedPanelId)} className="hover:bg-zinc-800 cursor-pointer">
                      <Square className="w-4 h-4 mr-2" /> Add Caption Box
                    </ContextMenuItem>
                  )}
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
                        onClick={() => setShowAssetLibrary(true)}
                        className="hover:bg-zinc-800 cursor-pointer"
                      >
                        Browse All Assets...
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
                      <ContextMenuSeparator className="bg-zinc-700" />
                      <ContextMenuSub>
                        <ContextMenuSubTrigger className="hover:bg-zinc-800 cursor-pointer">
                          <Palette className="w-4 h-4 mr-2" /> Panel Background
                        </ContextMenuSubTrigger>
                        <ContextMenuSubContent className="w-40 bg-zinc-900 border-zinc-700 text-white">
                          {[
                            { name: "Transparent", value: "transparent" },
                            { name: "White", value: "#ffffff" },
                            { name: "Black", value: "#000000" },
                            { name: "Cream", value: "#f5e6d3" },
                            { name: "Yellow", value: "#fef08a" },
                            { name: "Orange", value: "#fed7aa" },
                            { name: "Red", value: "#fecaca" },
                            { name: "Blue", value: "#bfdbfe" },
                            { name: "Green", value: "#bbf7d0" },
                            { name: "Purple", value: "#e9d5ff" },
                            { name: "Gray", value: "#d4d4d8" },
                          ].map(c => (
                            <ContextMenuItem
                              key={c.value}
                              onClick={() => updatePanelStyle("left", selectedPanelId, { backgroundColor: c.value })}
                              className="hover:bg-zinc-800 cursor-pointer flex items-center gap-2"
                            >
                              <div className="w-4 h-4 rounded border border-zinc-600" style={{ backgroundColor: c.value }} />
                              {c.name}
                            </ContextMenuItem>
                          ))}
                        </ContextMenuSubContent>
                      </ContextMenuSub>
                      <ContextMenuSub>
                        <ContextMenuSubTrigger className="hover:bg-zinc-800 cursor-pointer">
                          <Square className="w-4 h-4 mr-2" /> Panel Border
                        </ContextMenuSubTrigger>
                        <ContextMenuSubContent className="w-40 bg-zinc-900 border-zinc-700 text-white">
                          {[
                            { name: "Black", value: "#000000" },
                            { name: "White", value: "#ffffff" },
                            { name: "Red", value: "#ef4444" },
                            { name: "Blue", value: "#3b82f6" },
                            { name: "Gold", value: "#eab308" },
                          ].map(c => (
                            <ContextMenuItem
                              key={c.value}
                              onClick={() => updatePanelStyle("left", selectedPanelId, { borderColor: c.value })}
                              className="hover:bg-zinc-800 cursor-pointer flex items-center gap-2"
                            >
                              <div className="w-4 h-4 rounded border-2" style={{ borderColor: c.value }} />
                              {c.name}
                            </ContextMenuItem>
                          ))}
                          <ContextMenuSeparator className="bg-zinc-700" />
                          {[
                            { name: "Thin (2px)", value: 2 },
                            { name: "Medium (4px)", value: 4 },
                            { name: "Thick (6px)", value: 6 },
                            { name: "Heavy (8px)", value: 8 },
                          ].map(w => (
                            <ContextMenuItem
                              key={w.value}
                              onClick={() => updatePanelStyle("left", selectedPanelId, { borderWidth: w.value })}
                              className="hover:bg-zinc-800 cursor-pointer"
                            >
                              {w.name}
                            </ContextMenuItem>
                          ))}
                        </ContextMenuSubContent>
                      </ContextMenuSub>
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
                    onDoubleClick={(e) => handlePageDoubleClick(e, "right")}
                    onClick={(e) => { if (e.target === e.currentTarget) setShowBubbleSidebar(false); }}
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
                  <ContextMenuSub>
                    <ContextMenuSubTrigger className="hover:bg-zinc-800 cursor-pointer">
                      <MessageSquare className="w-4 h-4 mr-2" /> Bubble Presets
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="w-48 bg-zinc-900 border-zinc-700 text-white max-h-80 overflow-y-auto">
                      {bubblePresets.slice(0, 20).map(preset => (
                        <ContextMenuItem
                          key={preset.id}
                          onClick={() => {
                            if (selectedPanelId) {
                              addBubblePresetToPanel("right", selectedPanelId, preset);
                            } else {
                              toast.error("Select a panel first");
                            }
                          }}
                          className="hover:bg-zinc-800 cursor-pointer"
                        >
                          {preset.name}
                        </ContextMenuItem>
                      ))}
                      <ContextMenuSeparator className="bg-zinc-700" />
                      <ContextMenuSub>
                        <ContextMenuSubTrigger className="hover:bg-zinc-800 cursor-pointer">More Bubbles...</ContextMenuSubTrigger>
                        <ContextMenuSubContent className="w-48 bg-zinc-900 border-zinc-700 text-white max-h-80 overflow-y-auto">
                          {bubblePresets.slice(20).map(preset => (
                            <ContextMenuItem
                              key={preset.id}
                              onClick={() => {
                                if (selectedPanelId) {
                                  addBubblePresetToPanel("right", selectedPanelId, preset);
                                } else {
                                  toast.error("Select a panel first");
                                }
                              }}
                              className="hover:bg-zinc-800 cursor-pointer"
                            >
                              {preset.name}
                            </ContextMenuItem>
                          ))}
                        </ContextMenuSubContent>
                      </ContextMenuSub>
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                  <ContextMenuSub>
                    <ContextMenuSubTrigger className="hover:bg-zinc-800 cursor-pointer">
                      <Volume2 className="w-4 h-4 mr-2" /> Effect Presets
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="w-48 bg-zinc-900 border-zinc-700 text-white max-h-80 overflow-y-auto">
                      {effectPresets.slice(0, 20).map(preset => (
                        <ContextMenuItem
                          key={preset.id}
                          onClick={() => {
                            if (selectedPanelId) {
                              addEffectPresetToPanel("right", selectedPanelId, preset);
                            } else {
                              toast.error("Select a panel first");
                            }
                          }}
                          className="hover:bg-zinc-800 cursor-pointer font-bold"
                        >
                          {preset.name}
                        </ContextMenuItem>
                      ))}
                      <ContextMenuSeparator className="bg-zinc-700" />
                      <ContextMenuSub>
                        <ContextMenuSubTrigger className="hover:bg-zinc-800 cursor-pointer">More Effects...</ContextMenuSubTrigger>
                        <ContextMenuSubContent className="w-48 bg-zinc-900 border-zinc-700 text-white max-h-80 overflow-y-auto">
                          {effectPresets.slice(20).map(preset => (
                            <ContextMenuItem
                              key={preset.id}
                              onClick={() => {
                                if (selectedPanelId) {
                                  addEffectPresetToPanel("right", selectedPanelId, preset);
                                } else {
                                  toast.error("Select a panel first");
                                }
                              }}
                              className="hover:bg-zinc-800 cursor-pointer font-bold"
                            >
                              {preset.name}
                            </ContextMenuItem>
                          ))}
                        </ContextMenuSubContent>
                      </ContextMenuSub>
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                  {selectedPanelId && (
                    <ContextMenuItem onClick={() => addCaptionToPanel("right", selectedPanelId)} className="hover:bg-zinc-800 cursor-pointer">
                      <Square className="w-4 h-4 mr-2" /> Add Caption Box
                    </ContextMenuItem>
                  )}
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
                        onClick={() => setShowAssetLibrary(true)}
                        className="hover:bg-zinc-800 cursor-pointer"
                      >
                        Browse All Assets...
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
                      <ContextMenuSeparator className="bg-zinc-700" />
                      <ContextMenuSub>
                        <ContextMenuSubTrigger className="hover:bg-zinc-800 cursor-pointer">
                          <Palette className="w-4 h-4 mr-2" /> Panel Background
                        </ContextMenuSubTrigger>
                        <ContextMenuSubContent className="w-40 bg-zinc-900 border-zinc-700 text-white">
                          {[
                            { name: "Transparent", value: "transparent" },
                            { name: "White", value: "#ffffff" },
                            { name: "Black", value: "#000000" },
                            { name: "Cream", value: "#f5e6d3" },
                            { name: "Yellow", value: "#fef08a" },
                            { name: "Orange", value: "#fed7aa" },
                            { name: "Red", value: "#fecaca" },
                            { name: "Blue", value: "#bfdbfe" },
                            { name: "Green", value: "#bbf7d0" },
                            { name: "Purple", value: "#e9d5ff" },
                            { name: "Gray", value: "#d4d4d8" },
                          ].map(c => (
                            <ContextMenuItem
                              key={c.value}
                              onClick={() => updatePanelStyle("right", selectedPanelId, { backgroundColor: c.value })}
                              className="hover:bg-zinc-800 cursor-pointer flex items-center gap-2"
                            >
                              <div className="w-4 h-4 rounded border border-zinc-600" style={{ backgroundColor: c.value }} />
                              {c.name}
                            </ContextMenuItem>
                          ))}
                        </ContextMenuSubContent>
                      </ContextMenuSub>
                      <ContextMenuSub>
                        <ContextMenuSubTrigger className="hover:bg-zinc-800 cursor-pointer">
                          <Square className="w-4 h-4 mr-2" /> Panel Border
                        </ContextMenuSubTrigger>
                        <ContextMenuSubContent className="w-40 bg-zinc-900 border-zinc-700 text-white">
                          {[
                            { name: "Black", value: "#000000" },
                            { name: "White", value: "#ffffff" },
                            { name: "Red", value: "#ef4444" },
                            { name: "Blue", value: "#3b82f6" },
                            { name: "Gold", value: "#eab308" },
                          ].map(c => (
                            <ContextMenuItem
                              key={c.value}
                              onClick={() => updatePanelStyle("right", selectedPanelId, { borderColor: c.value })}
                              className="hover:bg-zinc-800 cursor-pointer flex items-center gap-2"
                            >
                              <div className="w-4 h-4 rounded border-2" style={{ borderColor: c.value }} />
                              {c.name}
                            </ContextMenuItem>
                          ))}
                          <ContextMenuSeparator className="bg-zinc-700" />
                          {[
                            { name: "Thin (2px)", value: 2 },
                            { name: "Medium (4px)", value: 4 },
                            { name: "Thick (6px)", value: 6 },
                            { name: "Heavy (8px)", value: 8 },
                          ].map(w => (
                            <ContextMenuItem
                              key={w.value}
                              onClick={() => updatePanelStyle("right", selectedPanelId, { borderWidth: w.value })}
                              className="hover:bg-zinc-800 cursor-pointer"
                            >
                              {w.name}
                            </ContextMenuItem>
                          ))}
                        </ContextMenuSubContent>
                      </ContextMenuSub>
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
              <div className="p-2 border-b border-zinc-800">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={autoLockPanels} 
                    onChange={(e) => setAutoLockPanels(e.target.checked)}
                    className="w-4 h-4 accent-white"
                  />
                  <Lock className="w-3 h-3" />
                  Auto-lock new panels
                </label>
              </div>
              <div className="flex-1 overflow-auto p-2 space-y-1">
                {(selectedPage === "left" ? currentSpread.leftPage : currentSpread.rightPage).map((panel, idx, arr) => {
                  const isActive = selectedPanelId === panel.id;
                  return (
                  <div key={panel.id}>
                    <div
                      className={`px-2 py-1.5 text-sm cursor-pointer flex items-center gap-1 group ${isActive ? 'bg-white text-black' : 'bg-zinc-800 hover:bg-zinc-700'}`}
                      onClick={() => { setSelectedPanelId(panel.id); setSelectedContentId(null); }}
                    >
                      <span className="flex-1 truncate text-xs font-medium">Panel {idx + 1}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePanelLock(selectedPage, panel.id); }}
                        className={`p-0.5 rounded ${isActive ? 'hover:bg-zinc-200' : 'hover:bg-zinc-600'}`}
                        title={panel.locked ? "Unlock" : "Lock"}
                      >
                        {panel.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3 opacity-40 group-hover:opacity-100" />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveLayerUp(selectedPage, panel.id); }}
                        disabled={idx === 0}
                        className={`p-0.5 rounded ${idx === 0 ? 'opacity-20' : isActive ? 'hover:bg-zinc-200' : 'opacity-40 group-hover:opacity-100 hover:bg-zinc-600'}`}
                        title="Move Up"
                      >
                        <MoveUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveLayerDown(selectedPage, panel.id); }}
                        disabled={idx === arr.length - 1}
                        className={`p-0.5 rounded ${idx === arr.length - 1 ? 'opacity-20' : isActive ? 'hover:bg-zinc-200' : 'opacity-40 group-hover:opacity-100 hover:bg-zinc-600'}`}
                        title="Move Down"
                      >
                        <MoveDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deletePanel(selectedPage, panel.id); if (isActive) setSelectedPanelId(null); }}
                        className={`p-0.5 rounded ${isActive ? 'hover:bg-red-200 text-red-600' : 'opacity-0 group-hover:opacity-100 hover:bg-red-900 text-red-400'}`}
                        title="Delete Panel"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <span className="text-[10px] opacity-40 ml-0.5 tabular-nums">{panel.contents.length}</span>
                    </div>
                    {isActive && panel.contents.length > 0 && (
                      <div className="ml-3 border-l border-zinc-700 space-y-0.5 py-0.5">
                        {panel.contents.map((content, cIdx, contentArr) => {
                          const isContentActive = selectedContentId === content.id;
                          const typeLabel = content.type === "image" ? "Image" : content.type === "text" ? "Text" : content.type === "bubble" ? "Bubble" : content.type === "drawing" ? "Drawing" : content.type === "video" ? "Video" : content.type === "audio" ? "Audio" : content.type === "gif" ? "GIF" : content.type;
                          return (
                          <div
                            key={content.id}
                            className={`px-2 py-1 text-xs cursor-pointer flex items-center gap-1 group/item ${isContentActive ? 'bg-zinc-600 text-white' : 'hover:bg-zinc-750'}`}
                            onClick={(e) => { e.stopPropagation(); setSelectedContentId(content.id); }}
                          >
                            <span className="flex-1 truncate">{typeLabel} {cIdx + 1}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); moveContentUp(selectedPage, panel.id, content.id); }}
                              disabled={cIdx === 0}
                              className={`p-0.5 rounded ${cIdx === 0 ? 'opacity-20' : 'opacity-40 group-hover/item:opacity-100 hover:bg-zinc-500'}`}
                              title="Move Up"
                            >
                              <MoveUp className="w-2.5 h-2.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); moveContentDown(selectedPage, panel.id, content.id); }}
                              disabled={cIdx === contentArr.length - 1}
                              className={`p-0.5 rounded ${cIdx === contentArr.length - 1 ? 'opacity-20' : 'opacity-40 group-hover/item:opacity-100 hover:bg-zinc-500'}`}
                              title="Move Down"
                            >
                              <MoveDown className="w-2.5 h-2.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteContentFromPanel(selectedPage, panel.id, content.id); if (isContentActive) setSelectedContentId(null); }}
                              className="p-0.5 rounded opacity-0 group-hover/item:opacity-100 hover:bg-red-900 text-red-400"
                              title="Delete"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
              
              {selectedContent && (selectedContent.type === 'text' || selectedContent.type === 'bubble') && selectedPanelId && (
                <div className="border-t border-zinc-800 p-3">
                  <h4 className="font-bold text-xs mb-3 flex items-center gap-2">
                    <Type className="w-3 h-3" /> Caption Properties
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Text Content</label>
                      <textarea
                        value={selectedContent.data.text || ""}
                        onChange={(e) => updateContentStyle(selectedPage, selectedPanelId, selectedContentId!, { text: e.target.value })}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs p-2 min-h-[60px] resize-none"
                        placeholder="Enter your text..."
                        data-testid="textarea-caption-text"
                      />
                    </div>
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
                        <label className="text-xs text-zinc-400 block mb-1">Text Color</label>
                        <input
                          type="color"
                          value={selectedContent.data.color || "#000000"}
                          onChange={(e) => updateContentStyle(selectedPage, selectedPanelId, selectedContentId!, { color: e.target.value })}
                          className="w-full h-7 bg-zinc-800 border border-zinc-700 cursor-pointer"
                          data-testid="input-text-color"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="text-xs text-zinc-400 block mb-1">Background</label>
                        <input
                          type="color"
                          value={selectedContent.data.backgroundColor || "#ffffff"}
                          onChange={(e) => updateContentStyle(selectedPage, selectedPanelId, selectedContentId!, { backgroundColor: e.target.value })}
                          className="w-full h-7 bg-zinc-800 border border-zinc-700 cursor-pointer"
                          data-testid="input-bg-color"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-zinc-400 block mb-1">Padding</label>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={selectedContent.data.padding || 8}
                          onChange={(e) => updateContentStyle(selectedPage, selectedPanelId, selectedContentId!, { padding: Number(e.target.value) })}
                          className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs p-1.5"
                          data-testid="input-padding"
                        />
                      </div>
                      <button
                        onClick={() => updateContentStyle(selectedPage, selectedPanelId, selectedContentId!, { backgroundColor: "transparent" })}
                        className="px-2 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-xs rounded"
                        title="Remove background"
                        data-testid="button-remove-bg"
                      >
                        Clear
                      </button>
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
                                      </div>
                </div>
              )}
            </aside>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*,.gif,.mp4,.webm,.mov,.mp3,.wav,.ogg,.m4a"
          className="hidden"
          onChange={handleFileUpload}
        />


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
                          {panel.contents.map(content => {
                          const panelW = (panel.width / 100) * 500;
                          const panelH = (panel.height / 100) * 750;
                          const leftPct = panelW > 0 ? (content.transform.x / panelW) * 100 : 0;
                          const topPct = panelH > 0 ? (content.transform.y / panelH) * 100 : 0;
                          const widthPct = panelW > 0 ? (content.transform.width / panelW) * 100 : 100;
                          const heightPct = panelH > 0 ? (content.transform.height / panelH) * 100 : 100;
                          return (
                            <div
                              key={content.id}
                              className="absolute"
                              style={{
                                left: `${leftPct}%`,
                                top: `${topPct}%`,
                                width: `${widthPct}%`,
                                height: `${heightPct}%`,
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
                              {content.type === "audio" && content.data.audioUrl && (
                                <div className="w-full h-full bg-zinc-800 rounded flex items-center justify-center p-1">
                                  <audio
                                    src={content.data.audioUrl}
                                    controls
                                    className="w-full"
                                    style={{ maxHeight: '24px' }}
                                  />
                                </div>
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
                          );
                          })}
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
      
      {showAssetLibrary && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border-2 border-white w-[700px] h-[500px] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-zinc-700">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Layers className="w-5 h-5" /> Asset Library
              </h3>
              <button 
                onClick={() => setShowAssetLibrary(false)}
                className="p-1 hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-1 overflow-hidden">
              <div className="w-48 border-r border-zinc-700 p-2 overflow-y-auto">
                <button
                  onClick={() => setSelectedLibraryFolder(null)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-800 ${selectedLibraryFolder === null ? 'bg-zinc-800 border-l-2 border-white' : ''}`}
                >
                  All Assets
                </button>
                {folders.map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedLibraryFolder(folder.id)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-800 flex items-center gap-2 ${selectedLibraryFolder === folder.id ? 'bg-zinc-800 border-l-2 border-white' : ''}`}
                  >
                    <FolderOpen className="w-4 h-4 text-zinc-400" />
                    {folder.name}
                  </button>
                ))}
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="grid grid-cols-4 gap-3">
                  {(selectedLibraryFolder ? getAssetsInFolder(selectedLibraryFolder) : assets).map((asset, index) => (
                    <button
                      key={asset.id}
                      draggable
                      onDragStart={(e) => {
                        setDraggedAssetId(asset.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => setDraggedAssetId(null)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        if (draggedAssetId && draggedAssetId !== asset.id) {
                          const currentAssets = selectedLibraryFolder ? getAssetsInFolder(selectedLibraryFolder) : assets;
                          const draggedIndex = currentAssets.findIndex(a => a.id === draggedAssetId);
                          const dropIndex = index;
                          if (draggedIndex !== -1) {
                            const newOrder = [...currentAssets];
                            const [removed] = newOrder.splice(draggedIndex, 1);
                            newOrder.splice(dropIndex, 0, removed);
                            await reorderAssets(newOrder.map(a => a.id));
                            toast.success("Assets reordered");
                          }
                        }
                        setDraggedAssetId(null);
                      }}
                      onClick={() => {
                        if (selectedPanelId) {
                          addContentToPanel(selectedPage, selectedPanelId, {
                            type: "image",
                            transform: { x: 50, y: 50, width: 150, height: 100, rotation: 0, scaleX: 1, scaleY: 1 },
                            data: { url: asset.url },
                            locked: false,
                          });
                          toast.success("Asset added to panel");
                          setShowAssetLibrary(false);
                        } else {
                          toast.error("Select a panel first");
                        }
                      }}
                      className={`group relative aspect-square bg-zinc-800 border border-zinc-700 hover:border-white overflow-hidden cursor-grab active:cursor-grabbing ${draggedAssetId === asset.id ? 'opacity-50' : ''}`}
                    >
                      {asset.type === "image" || asset.type === "sprite" || asset.type === "background" ? (
                        <img src={asset.thumbnail || asset.url} className="w-full h-full object-cover pointer-events-none" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-zinc-600" />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-black/80 px-2 py-1 text-xs truncate opacity-0 group-hover:opacity-100 transition-opacity">
                        {asset.name}
                      </div>
                    </button>
                  ))}
                  {(selectedLibraryFolder ? getAssetsInFolder(selectedLibraryFolder) : assets).length === 0 && (
                    <div className="col-span-4 text-center py-12 text-zinc-500">
                      <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No assets in this folder</p>
                      <p className="text-xs mt-1">Import images to add them here</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-3 border-t border-zinc-700 flex justify-between items-center">
              <span className="text-xs text-zinc-500">
                {isAssetLibraryLoading ? "Loading..." : `${(selectedLibraryFolder ? getAssetsInFolder(selectedLibraryFolder) : assets).length} assets`}
              </span>
              <label className="px-4 py-2 bg-white text-black text-sm font-bold hover:bg-zinc-200 cursor-pointer">
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  multiple
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      try {
                        const filesArray = Array.from(files);
                        if (filesArray.length === 1) {
                          await importFromFile(filesArray[0], selectedLibraryFolder || "sprites");
                          toast.success("Asset imported!");
                        } else {
                          await importFromFiles(filesArray, selectedLibraryFolder || "sprites");
                          toast.success(`${filesArray.length} assets imported!`);
                        }
                      } catch (err) {
                        toast.error("Failed to import assets");
                      }
                    }
                  }}
                />
                Import Assets
              </label>
            </div>
          </div>
        </div>
      )}

      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
        feature="Export to PNG"
        requiredTier="creator"
      />
    </Layout>
  );
}
