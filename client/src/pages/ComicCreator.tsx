import { Layout } from "@/components/layout/Layout";
import { FirstProjectGuide } from "@/components/FirstProjectGuide";
import { VersionHistory } from "@/components/projects/VersionHistory";
import { ModeSwitcher } from "@/components/comic/ModeSwitcher";
import type { ModeId, BrushProfile } from "@/lib/inkblade/types";
import { getBrush } from "@/lib/inkblade/brushes";
import { BrushSettingsPanel } from "@/components/inkblade/BrushSettingsPanel";
import { InkbladeCanvas, type InkbladeCanvasHandle } from "@/components/inkblade/InkbladeCanvas";
import { SortableLayerList, LayerDragHandle } from "@/components/comic/SortableLayerList";
import { Hexagon, Circle as CircleIcon, Square as SquareIcon } from "lucide-react";
import { 
  Save, Undo, Redo, MousePointer, Pen, Eraser, Type, Image as ImageIcon, 
  Square, Layers, Download, Film, Wand2, Plus, ArrowLeft, FileText,
  ChevronLeft, ChevronRight, Circle, LayoutGrid, Maximize2, Minimize2,
  Trash2, GripVertical, X, Upload, Move, ZoomIn, ZoomOut, Eye, EyeOff,
  Lock, Unlock, Copy, RotateCcw, Palette, Grid, Scissors, ClipboardPaste, PenTool, Share2, Volume2, FolderOpen, Sparkles, BookOpen, ExternalLink, Music, Play, MessageSquareText, Map as MapIcon
} from "lucide-react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { InfiniteCanvas, type CanvasNode, type CanvasConnection } from "@/components/InfiniteCanvas";
import { AIGenerator } from "@/components/tools/AIGenerator";
import { TransformableElement, TransformState } from "@/components/tools/TransformableElement";
import { TextElement } from "@/components/tools/TextElement";
import { useProject, useUpdateProject, useCreateProject } from "@/hooks/useProjects";
import { scriptToComic, normalizeScriptData, layoutToSpreads, type ScriptData, type LayoutData } from "@/lib/scriptImport";
import { SendHorizonal, Rocket, Briefcase, Bold, Italic, AlignLeft, AlignCenter, AlignRight, AlignJustify, CaseSensitive, Package, Crown, X as XIcon } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAssetLibrary } from "@/contexts/AssetLibraryContext";
import { usePostAction } from "@/contexts/PostActionContext";
import { toast } from "sonner";
import { PostComposer } from "@/components/social/PostComposer";
import { useAuth } from "@/contexts/AuthContext";
import { saveProjectWithOfflineFallback, type SaveResult } from "@/lib/offlineStorage";
import { fxStudioApi, type FxEffect } from "@/lib/api";
import { useSyncToCoMiXX } from "@/hooks/useSyncToCoMiXX";
import SendToMenu from "@/components/ecosystem/SendToMenu";
import type { AssetTag } from "@/types/asset-tags";
import { useSubscription } from "@/hooks/use-subscription";
import { UpgradeModal, ProFeatureDiscovery, useProFeatureDiscovery } from "@/components/UpgradeModal";
import { YouAreLiveModal, type PublishResult } from "@/components/YouAreLiveModal";
import { FxBrowserPanel } from "@/components/FxBrowserPanel";
import { FxStudioStatusBar } from "@/components/EmbeddedFxStudio";
import { useFxStudio } from "@/hooks/useFxStudio";
import { CoverData, defaultCover, TextLayer as CoverTextLayer, ImageLayer as CoverImageLayer } from "@/components/tools/CoverEditorPanel";
import { CoverPropertiesPanel } from "@/components/tools/CoverPropertiesPanel";
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
  name?: string;
  type: "image" | "text" | "bubble" | "drawing" | "shape" | "video" | "gif" | "audio";
  hidden?: boolean;
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
    fontWeight?: "normal" | "bold" | "900";
    fontStyle?: "normal" | "italic";
    textAlign?: "left" | "center" | "right";
    textTransform?: "none" | "uppercase" | "lowercase";
    letterSpacing?: number;
    lineHeight?: number;
    textArch?: number;
    filter?: string;
    filterOverlay?: string;
    textPanel?: boolean;
    alt?: string;
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
  type?: "rectangle" | "circle" | "polygon";
  shape?: "rectangle" | "circle" | "polygon";
  /**
   * Polygon vertices for vector-shape panels (Clip Studio-style).
   * Coordinates are PERCENTAGES (0–100) relative to the panel's own bounds —
   * so resizing the bounding box smoothly stretches the polygon, just like
   * a real vector shape.
   */
  points?: { x: number; y: number }[];
  contents: PanelContent[];
  zIndex: number;
  locked?: boolean;
  hidden?: boolean;
  name?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  filter?: string;
  coverRole?: "front-cover" | "back-cover";
}

interface SpreadAudio {
  src: string;
  name: string;
  volume: number;
  loop: boolean;
  autoplay: boolean;
}

interface NarrationBox {
  text: string;
  position: "top" | "bottom";
  style: "caption" | "thought" | "editorial";
  color?: string;
  bgColor?: string;
  fontSize?: number;
  fontFamily?: string;
}

type SpreadTag = "cover" | "back-cover" | "spread" | "panel" | "splash" | "pinup";

const SPREAD_TAG_CONFIG: Record<SpreadTag, { label: string; color: string; bg: string; border: string }> = {
  "cover":      { label: "Front Cover", color: "#a855f7", bg: "rgba(168,85,247,0.15)", border: "rgba(168,85,247,0.6)" },
  "back-cover": { label: "Back Cover",  color: "#22c55e", bg: "rgba(34,197,94,0.15)",  border: "rgba(34,197,94,0.6)" },
  "spread":     { label: "Spread",      color: "#3b82f6", bg: "rgba(59,130,246,0.15)", border: "rgba(59,130,246,0.6)" },
  "panel":      { label: "Panel Page",  color: "#f59e0b", bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.6)" },
  "splash":     { label: "Splash Page", color: "#ef4444", bg: "rgba(239,68,68,0.15)",  border: "rgba(239,68,68,0.6)" },
  "pinup":      { label: "Pin-Up",      color: "#ec4899", bg: "rgba(236,72,153,0.15)", border: "rgba(236,72,153,0.6)" },
};

interface Spread {
  id: string;
  leftPage: Panel[];
  rightPage: Panel[];
  themeMusic?: SpreadAudio;
  leftNarration?: NarrationBox;
  rightNarration?: NarrationBox;
  isLastPage?: boolean;
  tag?: SpreadTag;
}

const COMIC_IMAGE_FILTERS = [
  { name: "None", filter: "none", overlay: "" },
  { name: "Classic Comic", filter: "contrast(140%) saturate(120%) brightness(105%)", overlay: "halftone" },
  { name: "Vintage Comic", filter: "sepia(30%) contrast(130%) saturate(90%) brightness(95%)", overlay: "halftone" },
  { name: "Ink & Paper", filter: "contrast(200%) grayscale(100%) brightness(110%)", overlay: "" },
  { name: "Newsprint", filter: "contrast(120%) brightness(95%) saturate(80%)", overlay: "halftone-fine" },
  { name: "Pop Art", filter: "contrast(160%) saturate(200%) brightness(110%)", overlay: "halftone-bold" },
  { name: "Silver Age", filter: "sepia(15%) contrast(125%) saturate(110%) brightness(100%)", overlay: "halftone" },
  { name: "Golden Age", filter: "sepia(40%) contrast(130%) saturate(80%) brightness(90%)", overlay: "grain" },
  { name: "Manga", filter: "grayscale(100%) contrast(150%) brightness(105%)", overlay: "screentone" },
  { name: "Noir", filter: "grayscale(100%) contrast(180%) brightness(85%)", overlay: "" },
  { name: "Watercolor", filter: "saturate(150%) brightness(110%) contrast(90%)", overlay: "paper" },
  { name: "Cel Shade", filter: "contrast(170%) saturate(130%) brightness(105%)", overlay: "" },
  { name: "Aged Paper", filter: "sepia(50%) contrast(110%) brightness(90%)", overlay: "grain" },
  { name: "Faded Print", filter: "contrast(90%) brightness(115%) saturate(70%)", overlay: "halftone-fine" },
  { name: "High Impact", filter: "contrast(180%) saturate(140%)", overlay: "" },
  { name: "Duotone Blue", filter: "grayscale(100%) contrast(130%) brightness(100%) sepia(100%) hue-rotate(180deg) saturate(300%)", overlay: "" },
  { name: "Duotone Red", filter: "grayscale(100%) contrast(130%) brightness(100%) sepia(100%) hue-rotate(-30deg) saturate(300%)", overlay: "" },
];

function getOverlayStyle(overlayType: string): React.CSSProperties {
  switch (overlayType) {
    case "halftone":
      return {
        backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.15) 20%, transparent 20%)",
        backgroundSize: "4px 4px",
        mixBlendMode: "multiply" as const,
      };
    case "halftone-fine":
      return {
        backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.12) 15%, transparent 15%)",
        backgroundSize: "3px 3px",
        mixBlendMode: "multiply" as const,
      };
    case "halftone-bold":
      return {
        backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.2) 25%, transparent 25%)",
        backgroundSize: "6px 6px",
        mixBlendMode: "multiply" as const,
      };
    case "screentone":
      return {
        backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.1) 10%, transparent 10%)",
        backgroundSize: "2px 2px",
        mixBlendMode: "multiply" as const,
      };
    case "grain":
      return {
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' /%3E%3C/svg%3E")`,
        opacity: 0.15,
        mixBlendMode: "overlay" as const,
      };
    case "paper":
      return {
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.5' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' /%3E%3C/svg%3E")`,
        opacity: 0.1,
        mixBlendMode: "overlay" as const,
      };
    default:
      return {};
  }
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

  // Kids Book Layouts - large illustrations with text areas
  { id: "kids_full_page", name: "Full Page Illustration", category: "kidsbook", panels: [{x:0,y:0,width:100,height:100}] },
  { id: "kids_art_top_text_bottom", name: "Art Top / Text Bottom", category: "kidsbook", panels: [{x:0,y:0,width:100,height:70},{x:0,y:70,width:100,height:30}] },
  { id: "kids_text_top_art_bottom", name: "Text Top / Art Bottom", category: "kidsbook", panels: [{x:0,y:0,width:100,height:25},{x:0,y:25,width:100,height:75}] },
  { id: "kids_art_left_text_right", name: "Art Left / Text Right", category: "kidsbook", panels: [{x:0,y:0,width:60,height:100},{x:60,y:0,width:40,height:100}] },
  { id: "kids_text_left_art_right", name: "Text Left / Art Right", category: "kidsbook", panels: [{x:0,y:0,width:40,height:100},{x:40,y:0,width:60,height:100}] },
  { id: "kids_big_art_small_strip", name: "Big Art + Strip", category: "kidsbook", panels: [{x:0,y:0,width:100,height:75},{x:0,y:75,width:third,height:25},{x:third,y:75,width:third,height:25},{x:twoThird,y:75,width:third,height:25}] },
  { id: "kids_two_scene", name: "Two Scenes", category: "kidsbook", panels: [{x:0,y:0,width:100,height:50},{x:0,y:50,width:100,height:50}] },
  { id: "kids_spot_illustration", name: "Spot Illustration", category: "kidsbook", panels: [{x:0,y:0,width:100,height:20},{x:15,y:20,width:70,height:55},{x:0,y:75,width:100,height:25}] },
  { id: "kids_border_frame", name: "Border Frame", category: "kidsbook", panels: [{x:5,y:5,width:90,height:70},{x:5,y:78,width:90,height:18}] },
  { id: "kids_storyboard", name: "Storyboard (4 Panels)", category: "kidsbook", panels: [{x:2,y:2,width:46,height:46},{x:52,y:2,width:46,height:46},{x:2,y:52,width:46,height:46},{x:52,y:52,width:46,height:46}] },
  { id: "kids_title_page", name: "Title Page", category: "kidsbook", panels: [{x:10,y:5,width:80,height:20},{x:10,y:28,width:80,height:60},{x:10,y:90,width:80,height:8}] },
  { id: "kids_vignette", name: "Vignette", category: "kidsbook", panels: [{x:0,y:0,width:100,height:30},{x:20,y:30,width:60,height:40},{x:0,y:70,width:100,height:30}] },
  { id: "kids_photo_album", name: "Photo Album", category: "kidsbook", panels: [{x:5,y:3,width:42,height:44},{x:53,y:3,width:42,height:44},{x:5,y:53,width:42,height:44},{x:53,y:53,width:42,height:21},{x:53,y:77,width:42,height:20}] },
  { id: "kids_early_reader", name: "Early Reader", category: "kidsbook", panels: [{x:0,y:0,width:100,height:15},{x:0,y:15,width:100,height:55},{x:0,y:70,width:100,height:15},{x:0,y:85,width:100,height:15}] },

  { id: "book_full_text", name: "Full Text Page", category: "book", panels: [{x:0,y:0,width:100,height:100}] },
  { id: "book_chapter_header", name: "Chapter Header + Text", category: "book", panels: [{x:0,y:0,width:100,height:20},{x:0,y:20,width:100,height:80}] },
  { id: "book_text_with_spot", name: "Text + Spot Art", category: "book", panels: [{x:0,y:0,width:100,height:65},{x:20,y:65,width:60,height:35}] },
  { id: "book_two_column", name: "Two Columns", category: "book", panels: [{x:0,y:0,width:48,height:100},{x:52,y:0,width:48,height:100}] },
  { id: "book_text_art_facing", name: "Text / Art Facing Pages", category: "book", panels: [{x:0,y:0,width:100,height:100}] },
  { id: "book_graphic_novel", name: "Graphic Novel Panel", category: "book", panels: [{x:0,y:0,width:100,height:30},{x:0,y:30,width:50,height:40},{x:50,y:30,width:50,height:40},{x:0,y:70,width:100,height:30}] },

  { id: "poster_hero", name: "Hero Image + Title", category: "poster", panels: [{x:0,y:0,width:100,height:75},{x:0,y:75,width:100,height:25}] },
  { id: "poster_full_bleed", name: "Full Bleed", category: "poster", panels: [{x:0,y:0,width:100,height:100}] },
  { id: "poster_title_top", name: "Title Top + Art", category: "poster", panels: [{x:0,y:0,width:100,height:20},{x:0,y:20,width:100,height:80}] },
  { id: "poster_split_half", name: "Split Half", category: "poster", panels: [{x:0,y:0,width:50,height:100},{x:50,y:0,width:50,height:100}] },
  { id: "poster_event", name: "Event Poster", category: "poster", panels: [{x:0,y:0,width:100,height:15},{x:5,y:18,width:90,height:55},{x:0,y:76,width:100,height:12},{x:0,y:90,width:100,height:10}] },
  { id: "poster_quote", name: "Quote Poster", category: "poster", panels: [{x:0,y:0,width:100,height:25},{x:10,y:30,width:80,height:45},{x:0,y:80,width:100,height:20}] },
  { id: "poster_collage", name: "Photo Collage", category: "poster", panels: [{x:0,y:0,width:50,height:50},{x:50,y:0,width:50,height:50},{x:0,y:50,width:50,height:50},{x:50,y:50,width:50,height:50}] },
  { id: "poster_band", name: "Band / Show Poster", category: "poster", panels: [{x:0,y:0,width:100,height:12},{x:10,y:15,width:80,height:50},{x:0,y:68,width:100,height:15},{x:0,y:85,width:100,height:15}] },
  { id: "poster_wanted", name: "Wanted / Notice", category: "poster", panels: [{x:5,y:2,width:90,height:12},{x:15,y:16,width:70,height:55},{x:5,y:74,width:90,height:24}] },
  { id: "poster_infographic", name: "Infographic", category: "poster", panels: [{x:0,y:0,width:100,height:15},{x:0,y:15,width:100,height:17},{x:0,y:32,width:100,height:17},{x:0,y:49,width:100,height:17},{x:0,y:66,width:100,height:17},{x:0,y:83,width:100,height:17}] },
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
  { id: "kidsbook", name: "Kids Book" },
  { id: "book", name: "Book / Novel" },
  { id: "poster", name: "Poster" },
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
  { id: "select", icon: MousePointer, label: "Select/Move", shortcut: "V" },
  { id: "panel", icon: Square, label: "Panel", shortcut: "P" },
  { id: "draw", icon: Pen, label: "Draw", shortcut: "B" },
  { id: "text", icon: Type, label: "Caption", shortcut: "T" },
  { id: "ai", icon: Wand2, label: "AI Gen", shortcut: "G" },
];

const SPREAD_PREVIEW_W = 480;
const SPREAD_PREVIEW_H = 320;
const SINGLE_PAGE_W = 240;
const SINGLE_PAGE_H = 340;
const SPREAD_GAP_X = 100;
const SPREAD_GAP_Y = 80;
const SPREAD_COLS = 4;

type OverviewNodeType = "spread" | "cover" | "back-cover" | "panel";
interface OverviewNodeMeta {
  type: OverviewNodeType;
  spreadIdx: number;
  page?: "left" | "right";
  panelId?: string;
  label: string;
}

type OverviewMode = "design" | "prototype";
type Side = "left" | "right" | "top" | "bottom";
interface FlowConnection { fromId: string; toId: string; fromSide: Side; toSide: Side; }

function FlowPreviewPageRenderer({ panels, narration, coverDesignData, effectiveFrontCover, effectiveBackCover }: {
  panels: Panel[]; narration?: NarrationBox;
  coverDesignData?: Partial<CoverData>; effectiveFrontCover?: string; effectiveBackCover?: string;
}) {
  return (
    <div className="relative w-full h-full bg-white overflow-hidden">
      {panels.filter(p => !p.hidden).map(panel => {
        const isCoverPanel = !!panel.coverRole;
        const cd = isCoverPanel ? { ...defaultCover, ...(coverDesignData || {}) } as CoverData : null;
        const isFr = panel.coverRole === "front-cover";
        const coverBgImg = isCoverPanel && cd
          ? (isFr ? (cd.frontImage || effectiveFrontCover || "") : (cd.backImage || effectiveBackCover || ""))
          : "";
        const coverBg = isCoverPanel && cd ? (isFr ? cd.frontBgColor : cd.backBgColor) : undefined;
        const regularImg = !isCoverPanel ? panel.contents.find(c => c.type === "image" && !c.hidden)?.data?.url : undefined;
        const txt = panel.contents.find(c => c.type === "text" && !c.hidden)?.data?.text;
        const edPanelW = (panel.width / 100) * 650;
        const edPanelH = (panel.height / 100) * 920;
        return (
          <div key={panel.id} className="absolute overflow-hidden" style={{
            left: `${panel.x}%`, top: `${panel.y}%`,
            width: `${panel.width}%`, height: `${panel.height}%`,
            backgroundColor: coverBg || panel.backgroundColor || "transparent",
            border: isCoverPanel ? "none" : `${panel.borderWidth || 2}px solid ${panel.borderColor || "#000"}`,
            borderRadius: panel.shape === "circle" ? "50%" : 3,
            zIndex: panel.zIndex,
            transform: panel.rotation ? `rotate(${panel.rotation}deg)` : undefined,
            containerType: isCoverPanel ? 'size' as any : undefined,
          }}>
            {isCoverPanel && cd ? (
              <>
                {coverBgImg && <img src={coverBgImg} className="absolute inset-0 w-full h-full object-cover" draggable={false} />}
                <div className="relative z-10 w-full h-full flex flex-col items-center justify-between p-[5%]">
                  {isFr ? (
                    <>
                      {cd.bannerText && <div className="w-full py-[2%] text-center font-bold tracking-widest uppercase" style={{ backgroundColor: cd.bannerBgColor || '#000', color: cd.titleColor, fontSize: 'max(6px, 2.5cqi)' }}>{cd.bannerText}</div>}
                      {cd.subtitle && <div className="text-center" style={{ fontFamily: cd.subtitleFont, color: cd.subtitleColor, fontSize: 'max(5px, 3cqi)', fontWeight: cd.subtitleBold ? 'bold' : 'normal', fontStyle: cd.subtitleItalic ? 'italic' : 'normal', textTransform: cd.subtitleUppercase ? 'uppercase' : 'none' }}>{cd.subtitle}</div>}
                      <div className="text-center leading-none break-words w-full" style={{ fontFamily: cd.titleFont, color: cd.titleColor, fontSize: 'max(12px, 8cqi)', textShadow: '2px 2px 4px rgba(0,0,0,0.6)', fontWeight: cd.titleBold !== false ? 'bold' : 'normal', fontStyle: cd.titleItalic ? 'italic' : 'normal', textTransform: cd.titleUppercase !== false ? 'uppercase' : 'none' }}>{cd.title || "TITLE"}</div>
                      <div className="text-center" style={{ fontFamily: cd.authorFont, color: cd.authorColor, fontSize: 'max(6px, 3.5cqi)', fontWeight: cd.authorBold ? 'bold' : 'normal', fontStyle: cd.authorItalic ? 'italic' : 'normal', textTransform: cd.authorUppercase ? 'uppercase' : 'none' }}>{cd.author || "Author"}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-center" style={{ fontFamily: cd.titleFont, color: cd.titleColor, fontSize: 'max(8px, 5cqi)', fontWeight: cd.titleBold !== false ? 'bold' : 'normal', textTransform: cd.titleUppercase !== false ? 'uppercase' : 'none' }}>{cd.title || "TITLE"}</div>
                      {cd.backBlurb && <div className="leading-relaxed break-words text-center flex-1 overflow-hidden" style={{ fontFamily: cd.backBlurbFont, color: cd.backBlurbColor || cd.authorColor, fontSize: 'max(4px, 2.2cqi)', fontWeight: cd.backBlurbBold ? 'bold' : 'normal', fontStyle: cd.backBlurbItalic ? 'italic' : 'normal' }}>{cd.backBlurb}</div>}
                      <div className="text-center" style={{ fontFamily: cd.authorFont, color: cd.authorColor, fontSize: 'max(5px, 2.5cqi)', fontWeight: cd.authorBold ? 'bold' : 'normal', fontStyle: cd.authorItalic ? 'italic' : 'normal' }}>by {cd.author || "Author"}</div>
                    </>
                  )}
                </div>
                {isFr && cd.showPriceBox && cd.priceText && (
                  <div className="absolute z-20" style={{ top: '3%', left: '5%', backgroundColor: cd.priceBoxColor || cd.bannerBgColor || '#FFD700', color: cd.priceBoxTextColor || '#000', padding: '2% 4%', borderRadius: 4, fontWeight: 'bold', fontSize: 'max(5px, 2.5cqi)', border: '2px solid #000' }}>
                    {cd.priceText}
                  </div>
                )}
                {panel.contents.filter(c => !c.hidden).map(content => (
                  <div key={content.id} className="absolute z-[15]" style={{
                    left: `${edPanelW > 0 ? (content.transform.x / edPanelW) * 100 : 0}%`,
                    top: `${edPanelH > 0 ? (content.transform.y / edPanelH) * 100 : 0}%`,
                    width: `${edPanelW > 0 ? (content.transform.width / edPanelW) * 100 : 100}%`,
                    height: `${edPanelH > 0 ? (content.transform.height / edPanelH) * 100 : 100}%`,
                    transform: `rotate(${content.transform.rotation}deg)`,
                    zIndex: content.zIndex,
                  }}>
                    {content.type === "image" && content.data.url && <img src={content.data.url} className="w-full h-full object-cover" draggable={false} />}
                    {content.type === "gif" && content.data.url && <img src={content.data.url} className="w-full h-full object-cover" draggable={false} />}
                    {content.type === "drawing" && content.data.drawingData && <img src={content.data.drawingData} className="w-full h-full object-fill" draggable={false} />}
                  </div>
                ))}
              </>
            ) : (
              <>
                {regularImg && <img src={regularImg} className="w-full h-full object-cover" draggable={false} />}
                {!regularImg && txt && (
                  <div className="w-full h-full flex items-center justify-center p-2 overflow-hidden">
                    <span className="text-xs text-zinc-600 leading-snug text-center line-clamp-6">{txt}</span>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
      {panels.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm text-zinc-300 font-mono">Empty</span>
        </div>
      )}
      {narration && (
        <div className={`absolute left-0 right-0 ${narration.position === "top" ? "top-0" : "bottom-0"} bg-black/80 px-4 py-2 text-sm text-white z-50`}>
          {narration.text}
        </div>
      )}
    </div>
  );
}

function FlowPreviewPlayer({ spreads, flowConnections, startId, onClose, coverDesignData, effectiveFrontCover, effectiveBackCover }: {
  spreads: Spread[];
  flowConnections: FlowConnection[];
  startId: string;
  onClose: () => void;
  coverDesignData?: Partial<CoverData>;
  effectiveFrontCover?: string;
  effectiveBackCover?: string;
}) {
  const coverOnlySpreads = useMemo(() => {
    const cSet = new Set<string>();
    for (const s of spreads) {
      const allPanels = [...s.leftPage, ...s.rightPage];
      if (allPanels.length > 0 && allPanels.every(p => p.coverRole)) cSet.add(s.id);
    }
    return cSet;
  }, [spreads]);

  const allNodeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const s of spreads) {
      if (!coverOnlySpreads.has(s.id)) ids.add(s.id);
      for (const page of ["leftPage", "rightPage"] as const) {
        for (const p of s[page]) {
          if (p.coverRole === "front-cover") ids.add(`cover_${p.id}`);
          if (p.coverRole === "back-cover") ids.add(`backcover_${p.id}`);
        }
      }
    }
    return ids;
  }, [spreads, coverOnlySpreads]);

  const orderedIds = useMemo(() => {
    const allIds = [...allNodeIds];
    if (flowConnections.length === 0) return allIds;
    const outMap = new Map<string, string[]>();
    const incomingIds = new Set<string>();
    for (const c of flowConnections) {
      if (!outMap.has(c.fromId)) outMap.set(c.fromId, []);
      outMap.get(c.fromId)!.push(c.toId);
      incomingIds.add(c.toId);
    }
    const validIds = new Set(allIds);
    const coverNodeId = allIds.find(id => id.startsWith("cover_"));
    const coverS = spreads.find(s => s.tag === "cover");
    let rootId: string;
    if (coverNodeId && !incomingIds.has(coverNodeId)) {
      rootId = coverNodeId;
    } else if (coverS && validIds.has(coverS.id)) {
      rootId = coverS.id;
    } else {
      const rootNode = allIds.find(id => !incomingIds.has(id) && outMap.has(id));
      rootId = rootNode || (validIds.has(startId) ? startId : allIds[0]);
    }
    const ordered: string[] = [];
    const visited = new Set<string>();
    const walk = (id: string) => {
      if (visited.has(id) || !validIds.has(id)) return;
      visited.add(id);
      ordered.push(id);
      const nexts = outMap.get(id) || [];
      for (const nid of nexts) walk(nid);
    };
    walk(rootId);
    for (const id of allIds) {
      if (!visited.has(id)) ordered.push(id);
    }
    const backCoverIdx = ordered.findIndex(id =>
      id.startsWith("backcover_") || spreads.find(s => s.id === id)?.tag === "back-cover"
    );
    if (backCoverIdx >= 0 && backCoverIdx !== ordered.length - 1) {
      const [bc] = ordered.splice(backCoverIdx, 1);
      ordered.push(bc);
    }
    return ordered;
  }, [spreads, flowConnections, startId, allNodeIds]);

  const nodeToSpread = useMemo(() => {
    const map = new Map<string, { spread: Spread; index: number; panel?: Panel; isCoverNode: boolean }>();
    spreads.forEach((s, i) => {
      map.set(s.id, { spread: s, index: i, isCoverNode: false });
      for (const page of ["leftPage", "rightPage"] as const) {
        for (const p of s[page]) {
          if (p.coverRole === "front-cover") map.set(`cover_${p.id}`, { spread: s, index: i, panel: p, isCoverNode: true });
          if (p.coverRole === "back-cover") map.set(`backcover_${p.id}`, { spread: s, index: i, panel: p, isCoverNode: true });
        }
      }
    });
    return map;
  }, [spreads]);

  const [currentStep, setCurrentStep] = useState(0);
  useEffect(() => {
    if (currentStep >= orderedIds.length) setCurrentStep(Math.max(0, orderedIds.length - 1));
  }, [orderedIds.length]);
  const currentId = orderedIds[currentStep];
  const spreadMap = useMemo(() => new Map(spreads.map((s, i) => [s.id, { spread: s, index: i }])), [spreads]);
  const outgoing = useMemo(() => {
    const m = new Map<string, FlowConnection[]>();
    for (const c of flowConnections) {
      if (!m.has(c.fromId)) m.set(c.fromId, []);
      m.get(c.fromId)!.push(c);
    }
    return m;
  }, [flowConnections]);

  const currentNodeData = nodeToSpread.get(currentId);
  const currentConns = outgoing.get(currentId) || [];

  const goNext = () => { if (currentStep < orderedIds.length - 1) setCurrentStep(currentStep + 1); };
  const goPrev = () => { if (currentStep > 0) setCurrentStep(currentStep - 1); };
  const goTo = (id: string) => {
    const idx = orderedIds.indexOf(id);
    if (idx >= 0) setCurrentStep(idx);
  };

  if (!currentNodeData) return null;
  const { spread, index, panel: coverPanel, isCoverNode } = currentNodeData;
  const tagInfo = spread.tag ? SPREAD_TAG_CONFIG[spread.tag] : null;
  const isCoverDisplay = isCoverNode && coverPanel;
  const coverLabel = currentId.startsWith("cover_") ? "Front Cover" : currentId.startsWith("backcover_") ? "Back Cover" : null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" data-testid="flow-preview-player">
      <div className="flex items-center justify-between px-6 py-3 bg-zinc-900/90 border-b border-zinc-800 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Play className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-mono text-white font-bold">Flow Preview</span>
          <div className="w-px h-4 bg-zinc-700" />
          <span className="text-xs text-zinc-500 font-mono">
            {coverLabel || `Spread ${index + 1}`} — {currentStep + 1} of {orderedIds.length}
          </span>
          {coverLabel && (
            <span className="text-[8px] px-1.5 py-0.5 rounded font-bold" style={{
              backgroundColor: currentId.startsWith("cover_") ? "#06b6d433" : "#a855f733",
              color: currentId.startsWith("cover_") ? "#06b6d4" : "#a855f7"
            }}>{coverLabel}</span>
          )}
          {!coverLabel && tagInfo && (
            <span className="text-[8px] px-1.5 py-0.5 rounded font-bold" style={{
              backgroundColor: tagInfo.color + "33", color: tagInfo.color
            }}>{tagInfo.label}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {currentConns.length > 0 && (
            <span className="text-[10px] text-zinc-600 font-mono">
              {currentConns.length} {currentConns.length === 1 ? "connection" : "connections"}
            </span>
          )}
          <button onClick={goPrev} disabled={currentStep <= 0}
            className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            data-testid="button-flow-back">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={goNext} disabled={currentStep >= orderedIds.length - 1}
            className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            data-testid="button-flow-forward">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-all"
            data-testid="button-flow-close">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 relative">
        {isCoverDisplay ? (
          <div className="overflow-hidden rounded-xl"
               style={{ width: "50%", maxWidth: 600, aspectRatio: "1 / 1.4", maxHeight: "80vh", filter: "drop-shadow(0 20px 60px rgba(0,0,0,0.8))" }}>
            <FlowPreviewPageRenderer panels={[coverPanel!]} narration={undefined}
              coverDesignData={coverDesignData} effectiveFrontCover={effectiveFrontCover} effectiveBackCover={effectiveBackCover} />
          </div>
        ) : (
          <div className="flex max-w-[1200px] w-full overflow-hidden rounded-xl"
               style={{ aspectRatio: "2 / 1.4", maxHeight: "80vh", filter: "drop-shadow(0 20px 60px rgba(0,0,0,0.8))" }}>
            <div className="flex-1 relative border-r border-zinc-200">
              <FlowPreviewPageRenderer panels={spread.leftPage} narration={spread.leftNarration}
                coverDesignData={coverDesignData} effectiveFrontCover={effectiveFrontCover} effectiveBackCover={effectiveBackCover} />
            </div>
            <div className="flex-1 relative">
              <FlowPreviewPageRenderer panels={spread.rightPage} narration={spread.rightNarration}
                coverDesignData={coverDesignData} effectiveFrontCover={effectiveFrontCover} effectiveBackCover={effectiveBackCover} />
            </div>
          </div>
        )}
      </div>

      {currentConns.length > 0 && (
        <div className="px-6 py-4 bg-zinc-900/90 border-t border-zinc-800 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Connections:</div>
            <div className="flex gap-2 flex-wrap flex-1">
              {currentConns.map((conn, ci) => {
                const targetInfo = nodeToSpread.get(conn.toId);
                if (!targetInfo) return null;
                const isCoverTarget = conn.toId.startsWith("cover_") || conn.toId.startsWith("backcover_");
                const targetLabel = isCoverTarget
                  ? (conn.toId.startsWith("cover_") ? "Front Cover" : "Back Cover")
                  : (targetInfo.spread.tag ? SPREAD_TAG_CONFIG[targetInfo.spread.tag]?.label : null) || `Spread ${targetInfo.index + 1}`;
                return (
                  <button
                    key={ci}
                    onClick={() => goTo(conn.toId)}
                    className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-sm font-mono rounded-lg border border-blue-500/30 hover:border-blue-400/50 transition-all flex items-center gap-2"
                    data-testid={`button-flow-nav-${ci}`}
                  >
                    <ChevronRight className="w-3 h-3" />
                    {targetLabel}
                  </button>
                );
              })}
            </div>
            {currentStep < orderedIds.length - 1 && (
              <button onClick={goNext}
                className="px-5 py-2 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 text-sm font-mono rounded-lg border border-cyan-500/30 hover:border-cyan-400/50 transition-all flex items-center gap-2"
                data-testid="button-flow-next">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {currentConns.length === 0 && (
        <div className="px-6 py-4 bg-zinc-900/90 border-t border-zinc-800 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-600 font-mono">
              {currentStep >= orderedIds.length - 1 ? "End of flow" : "No outgoing connections from this spread"}
            </span>
            {currentStep < orderedIds.length - 1 && (
              <button onClick={goNext}
                className="px-5 py-2 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 text-sm font-mono rounded-lg border border-cyan-500/30 hover:border-cyan-400/50 transition-all flex items-center gap-2"
                data-testid="button-flow-next-fallback">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-1">
        {orderedIds.map((_id, i) => (
          <button key={i} onClick={() => setCurrentStep(i)}
            className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentStep ? "bg-blue-400 scale-125" : i < currentStep ? "bg-blue-800" : "bg-zinc-700"}`} />
        ))}
      </div>
    </div>
  );
}

function SpreadNodeRenderer({ spread, idx, currentSpreadIndex, mode, flowConnections, nodeId, coverDesignData, effectiveFrontCover, effectiveBackCover }: {
  spread: Spread; idx: number; currentSpreadIndex: number; mode: OverviewMode;
  flowConnections: FlowConnection[]; nodeId: string;
  coverDesignData?: Partial<CoverData>; effectiveFrontCover?: string; effectiveBackCover?: string;
}) {
  const isCover = idx === 0 && spread.leftPage.some(p => p.coverRole === "front-cover");
  const isLast = spread.isLastPage;
  const connCount = flowConnections.filter(c => c.fromId === nodeId || c.toId === nodeId).length;
  const headerH = 24;
  const pageW = SPREAD_PREVIEW_W / 2;
  const pageH = SPREAD_PREVIEW_H - headerH;
  const tagConf = spread.tag ? SPREAD_TAG_CONFIG[spread.tag] : null;

  const renderPagePanels = (panels: Panel[]) => {
    return panels.filter(p => !p.hidden).map(panel => {
      const isCoverPanel = !!panel.coverRole;
      const cd = isCoverPanel ? { ...defaultCover, ...(coverDesignData || {}) } as CoverData : null;
      const isFr = panel.coverRole === "front-cover";
      const coverBgImg = isCoverPanel && cd
        ? (isFr ? (cd.frontImage || effectiveFrontCover || "") : (cd.backImage || effectiveBackCover || ""))
        : "";
      const coverBg = isCoverPanel && cd ? (isFr ? cd.frontBgColor : cd.backBgColor) : undefined;
      const regularImg = !isCoverPanel ? panel.contents.find(c => c.type === "image" && !c.hidden)?.data?.url : undefined;
      const txt = panel.contents.find(c => c.type === "text" && !c.hidden)?.data?.text;
      const edPanelW = (panel.width / 100) * 650;
      const edPanelH = (panel.height / 100) * 920;
      return (
        <div key={panel.id} className="absolute overflow-hidden" style={{
          left: `${panel.x}%`, top: `${panel.y}%`,
          width: `${panel.width}%`, height: `${panel.height}%`,
          backgroundColor: coverBg || panel.backgroundColor || "transparent",
          border: isCoverPanel ? "none" : `${Math.max(1, Math.round((panel.borderWidth || 2) * (pageW / 650)))}px solid ${panel.borderColor || "#000"}`,
          borderRadius: panel.shape === "circle" ? "50%" : Math.round(2 * (pageW / 650)),
          zIndex: panel.zIndex,
          transform: panel.rotation ? `rotate(${panel.rotation}deg)` : undefined,
          containerType: isCoverPanel ? 'size' as any : undefined,
        }}>
          {isCoverPanel && cd ? (
            <>
              {coverBgImg && <img src={coverBgImg} className="absolute inset-0 w-full h-full object-cover" draggable={false} loading="lazy" />}
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-between p-[4%]">
                {isFr ? (
                  <>
                    {cd.bannerText && <div className="w-full py-[1%] text-center font-bold tracking-widest uppercase" style={{ backgroundColor: cd.bannerBgColor || '#000', color: cd.titleColor, fontSize: 'max(3px, 2cqi)' }}>{cd.bannerText}</div>}
                    <div className="text-center leading-none break-words w-full" style={{ fontFamily: cd.titleFont, color: cd.titleColor, fontSize: 'max(5px, 5cqi)', textShadow: '1px 1px 2px rgba(0,0,0,0.6)', fontWeight: cd.titleBold !== false ? 'bold' : 'normal', textTransform: cd.titleUppercase !== false ? 'uppercase' : 'none' }}>{cd.title || "TITLE"}</div>
                    <div className="text-center" style={{ fontFamily: cd.authorFont, color: cd.authorColor, fontSize: 'max(3px, 2cqi)', fontWeight: cd.authorBold ? 'bold' : 'normal' }}>{cd.author || "Author"}</div>
                  </>
                ) : (
                  <>
                    <div className="text-center" style={{ fontFamily: cd.titleFont, color: cd.titleColor, fontSize: 'max(4px, 3.5cqi)', fontWeight: cd.titleBold !== false ? 'bold' : 'normal', textTransform: cd.titleUppercase !== false ? 'uppercase' : 'none' }}>{cd.title || "TITLE"}</div>
                    {cd.backBlurb && <div className="text-center flex-1 overflow-hidden" style={{ fontFamily: cd.backBlurbFont, color: cd.backBlurbColor || cd.authorColor, fontSize: 'max(2px, 1.5cqi)' }}>{cd.backBlurb}</div>}
                    <div className="text-center" style={{ fontFamily: cd.authorFont, color: cd.authorColor, fontSize: 'max(2px, 1.5cqi)' }}>by {cd.author || "Author"}</div>
                  </>
                )}
              </div>
              {isFr && cd.showPriceBox && cd.priceText && (
                <div className="absolute z-20" style={{ top: '2%', left: '4%', backgroundColor: cd.priceBoxColor || cd.bannerBgColor || '#FFD700', color: cd.priceBoxTextColor || '#000', padding: '1% 2%', borderRadius: 1, fontWeight: 'bold', fontSize: 'max(2px, 1.5cqi)', border: '1px solid #000' }}>
                  {cd.priceText}
                </div>
              )}
              {panel.contents.filter(c => !c.hidden).map(content => (
                <div key={content.id} className="absolute z-[15]" style={{
                  left: `${edPanelW > 0 ? (content.transform.x / edPanelW) * 100 : 0}%`,
                  top: `${edPanelH > 0 ? (content.transform.y / edPanelH) * 100 : 0}%`,
                  width: `${edPanelW > 0 ? (content.transform.width / edPanelW) * 100 : 100}%`,
                  height: `${edPanelH > 0 ? (content.transform.height / edPanelH) * 100 : 100}%`,
                  transform: `rotate(${content.transform.rotation}deg)`,
                  zIndex: content.zIndex,
                }}>
                  {content.type === "image" && content.data.url && <img src={content.data.url} className="w-full h-full object-cover" draggable={false} />}
                  {content.type === "drawing" && content.data.drawingData && <img src={content.data.drawingData} className="w-full h-full object-fill" draggable={false} />}
                </div>
              ))}
            </>
          ) : (
            <>
              {regularImg && <img src={regularImg} className="w-full h-full object-cover" draggable={false} loading="lazy" />}
              {!regularImg && txt && (
                <div className="w-full h-full flex items-center justify-center p-0.5 overflow-hidden">
                  <span className="leading-tight text-center line-clamp-3" style={{
                    fontSize: Math.max(5, Math.round(10 * (pageW / 650))),
                    color: "#666",
                  }}>{txt}</span>
                </div>
              )}
            </>
          )}
        </div>
      );
    });
  };

  const activeBorder = idx === currentSpreadIndex
    ? (tagConf ? tagConf.color : "#06b6d4")
    : tagConf ? tagConf.border : isCover ? "rgba(245,158,11,0.5)" : "#52525b";
  const activeShadow = idx === currentSpreadIndex
    ? `0 0 20px ${tagConf ? tagConf.bg : "rgba(6,182,212,0.2)"}`
    : "none";
  const headerBg = tagConf ? tagConf.bg : "rgba(63,63,70,0.9)";

  return (
    <div className="w-full h-full relative" style={{ filter: "drop-shadow(0 4px 20px rgba(0,0,0,0.5))" }}>
      <div className="absolute -top-6 left-0 right-0 flex items-center justify-between px-1">
        <span className="text-[10px] font-bold font-mono" style={{ color: tagConf?.color || "#71717a" }}>
          {tagConf ? tagConf.label.toUpperCase() : isCover ? "COVER" : isLast ? "LAST PAGE" : `SPREAD ${idx + 1}`}
        </span>
        {mode === "prototype" && connCount > 0 && (
          <span className="text-[9px] text-blue-400 font-mono">{connCount} links</span>
        )}
      </div>

      <div className="absolute left-0 right-0 flex rounded-t-md overflow-hidden" style={{ top: 0, height: headerH, backgroundColor: headerBg, borderBottom: tagConf ? `2px solid ${tagConf.border}` : "none" }}>
        <div className="flex-1 flex items-center px-2" style={{ height: headerH }}>
          <span className="text-[10px] font-bold text-white flex items-center gap-1.5 truncate">
            {tagConf && (
              <span className="px-1.5 py-0.5 rounded text-[7px] font-bold" style={{ backgroundColor: tagConf.color, color: "#fff" }}>
                {tagConf.label}
              </span>
            )}
            {!tagConf && isCover && <span className="bg-cyan-500/20 text-cyan-400 px-1 py-0.5 rounded text-[7px]">COVER</span>}
            {isLast && <span className="bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded text-[7px]">LAST</span>}
            Spread {idx + 1}
          </span>
        </div>
        <div className="flex items-center px-2" style={{ height: headerH }}>
          <span className="text-[9px] text-zinc-400 font-mono">{spread.leftPage.length + spread.rightPage.length}p</span>
        </div>
      </div>

      <div className="absolute left-0 flex overflow-hidden" style={{
        top: headerH, width: SPREAD_PREVIEW_W, height: pageH,
        borderRadius: "0 0 6px 6px",
        border: `2px solid ${activeBorder}`,
        boxShadow: activeShadow,
      }}>
        <div className="relative" style={{ width: pageW, height: pageH, backgroundColor: "#fff" }}>
          {renderPagePanels(spread.leftPage)}
          {spread.leftPage.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[9px] text-zinc-300 font-mono">Left Page</span>
            </div>
          )}
        </div>
        <div style={{ width: 1, height: pageH, backgroundColor: "#e5e5e5", flexShrink: 0 }} />
        <div className="relative" style={{ width: pageW - 1, height: pageH, backgroundColor: "#fff" }}>
          {renderPagePanels(spread.rightPage)}
          {spread.rightPage.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[9px] text-zinc-300 font-mono">Right Page</span>
            </div>
          )}
        </div>
      </div>

      {spread.themeMusic && (
        <div className="absolute bottom-2 right-2 z-20 bg-emerald-500/20 p-1 rounded"><Music className="w-3 h-3 text-emerald-400" /></div>
      )}
    </div>
  );
}

function SinglePageNodeRenderer({ panel, label, nodeType, isSelected, coverDesignData, effectiveFrontCover, effectiveBackCover, connCount, mode }: {
  panel: Panel; label: string; nodeType: OverviewNodeType; isSelected: boolean;
  coverDesignData?: Partial<CoverData>; effectiveFrontCover?: string; effectiveBackCover?: string;
  connCount?: number; mode?: OverviewMode;
}) {
  const isCoverType = nodeType === "cover" || nodeType === "back-cover";
  const cd = isCoverType ? { ...defaultCover, ...(coverDesignData || {}) } as CoverData : null;
  const isFront = nodeType === "cover";
  const coverBgImg = cd
    ? (isFront ? (cd.frontImage || effectiveFrontCover || "") : (cd.backImage || effectiveBackCover || ""))
    : "";
  const coverBg = cd ? (isFront ? cd.frontBgColor : cd.backBgColor) : undefined;
  const regularImg = !cd ? panel.contents.find(c => c.type === "image" && !c.hidden)?.data?.url : undefined;
  const txt = panel.contents.find(c => c.type === "text" && !c.hidden)?.data?.text;
  const edPanelW = (panel.width / 100) * 650;
  const edPanelH = (panel.height / 100) * 920;
  const borderColor = nodeType === "cover" ? "#06b6d4" : nodeType === "back-cover" ? "#a855f7" : "#52525b";
  const badgeColor = nodeType === "cover" ? "bg-cyan-500 text-white" : nodeType === "back-cover" ? "bg-purple-500 text-white" : "bg-zinc-600 text-white";

  return (
    <div className="w-full h-full relative" style={{ filter: "drop-shadow(0 4px 20px rgba(0,0,0,0.5))" }}>
      <div className="absolute -top-6 left-0 right-0 flex items-center justify-between px-1">
        <span className="text-[10px] font-bold text-zinc-500 font-mono uppercase">{label}</span>
        {mode === "prototype" && (connCount || 0) > 0 && (
          <span className="text-[9px] text-blue-400 font-mono">{connCount} links</span>
        )}
      </div>
      <div className="absolute left-0 right-0 flex items-center px-2 rounded-t-md" style={{ top: 0, height: 24, backgroundColor: "#333" }}>
        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${badgeColor}`}>
          {nodeType === "cover" ? "FRONT COVER" : nodeType === "back-cover" ? "BACK COVER" : "PANEL"}
        </span>
      </div>
      <div className="absolute left-0 right-0 overflow-hidden" style={{
        top: 24, bottom: 0,
        backgroundColor: coverBg || "#fff",
        borderRadius: "0 0 6px 6px",
        border: `2px solid ${isSelected ? borderColor : "#52525b"}`,
        boxShadow: isSelected ? `0 0 16px ${borderColor}40` : "none",
        containerType: cd ? 'size' as any : undefined,
      }}>
        {cd ? (
          <>
            {coverBgImg && <img src={coverBgImg} className="absolute inset-0 w-full h-full object-cover" draggable={false} loading="lazy" />}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-between p-[5%]">
              {isFront ? (
                <>
                  {cd.bannerText && <div className="w-full py-[2%] text-center font-bold tracking-widest uppercase" style={{ backgroundColor: cd.bannerBgColor || '#000', color: cd.titleColor, fontSize: 'max(4px, 2.5cqi)' }}>{cd.bannerText}</div>}
                  {cd.subtitle && <div className="text-center" style={{ fontFamily: cd.subtitleFont, color: cd.subtitleColor, fontSize: 'max(3px, 2cqi)', fontWeight: cd.subtitleBold ? 'bold' : 'normal', fontStyle: cd.subtitleItalic ? 'italic' : 'normal', textTransform: cd.subtitleUppercase ? 'uppercase' : 'none' }}>{cd.subtitle}</div>}
                  <div className="text-center leading-none break-words w-full" style={{ fontFamily: cd.titleFont, color: cd.titleColor, fontSize: 'max(8px, 6cqi)', textShadow: '1px 1px 2px rgba(0,0,0,0.6)', fontWeight: cd.titleBold !== false ? 'bold' : 'normal', fontStyle: cd.titleItalic ? 'italic' : 'normal', textTransform: cd.titleUppercase !== false ? 'uppercase' : 'none' }}>{cd.title || "TITLE"}</div>
                  <div className="text-center" style={{ fontFamily: cd.authorFont, color: cd.authorColor, fontSize: 'max(4px, 2.5cqi)', fontWeight: cd.authorBold ? 'bold' : 'normal', fontStyle: cd.authorItalic ? 'italic' : 'normal', textTransform: cd.authorUppercase ? 'uppercase' : 'none' }}>{cd.author || "Author"}</div>
                </>
              ) : (
                <>
                  <div className="text-center" style={{ fontFamily: cd.titleFont, color: cd.titleColor, fontSize: 'max(5px, 4cqi)', fontWeight: cd.titleBold !== false ? 'bold' : 'normal', textTransform: cd.titleUppercase !== false ? 'uppercase' : 'none' }}>{cd.title || "TITLE"}</div>
                  {cd.backBlurb && <div className="leading-relaxed break-words text-center flex-1 overflow-hidden" style={{ fontFamily: cd.backBlurbFont, color: cd.backBlurbColor || cd.authorColor, fontSize: 'max(3px, 1.8cqi)', fontWeight: cd.backBlurbBold ? 'bold' : 'normal', fontStyle: cd.backBlurbItalic ? 'italic' : 'normal' }}>{cd.backBlurb}</div>}
                  <div className="text-center" style={{ fontFamily: cd.authorFont, color: cd.authorColor, fontSize: 'max(3px, 2cqi)', fontWeight: cd.authorBold ? 'bold' : 'normal', fontStyle: cd.authorItalic ? 'italic' : 'normal' }}>by {cd.author || "Author"}</div>
                </>
              )}
            </div>
            {isFront && cd.showPriceBox && cd.priceText && (
              <div className="absolute z-20" style={{ top: '3%', left: '5%', backgroundColor: cd.priceBoxColor || cd.bannerBgColor || '#FFD700', color: cd.priceBoxTextColor || '#000', padding: '1% 3%', borderRadius: 2, fontWeight: 'bold', fontSize: 'max(3px, 2cqi)', border: '1px solid #000' }}>
                {cd.priceText}
              </div>
            )}
            {panel.contents.filter(c => !c.hidden).map(content => (
              <div key={content.id} className="absolute z-[15]" style={{
                left: `${edPanelW > 0 ? (content.transform.x / edPanelW) * 100 : 0}%`,
                top: `${edPanelH > 0 ? (content.transform.y / edPanelH) * 100 : 0}%`,
                width: `${edPanelW > 0 ? (content.transform.width / edPanelW) * 100 : 100}%`,
                height: `${edPanelH > 0 ? (content.transform.height / edPanelH) * 100 : 100}%`,
                transform: `rotate(${content.transform.rotation}deg)`,
                zIndex: content.zIndex,
              }}>
                {content.type === "image" && content.data.url && <img src={content.data.url} className="w-full h-full object-cover" draggable={false} />}
                {content.type === "drawing" && content.data.drawingData && <img src={content.data.drawingData} className="w-full h-full object-fill" draggable={false} />}
              </div>
            ))}
          </>
        ) : regularImg ? (
          <img src={regularImg} className="absolute inset-0 w-full h-full object-cover" draggable={false} loading="lazy" />
        ) : (
          <div className="absolute overflow-hidden" style={{
            left: `${panel.x}%`, top: `${panel.y}%`,
            width: `${panel.width}%`, height: `${panel.height}%`,
            backgroundColor: panel.backgroundColor || "transparent",
            border: `${Math.max(1, panel.borderWidth || 2)}px solid ${panel.borderColor || "#000"}`,
            borderRadius: panel.shape === "circle" ? "50%" : 2,
          }}>
            {txt && (
              <div className="w-full h-full flex items-center justify-center p-1 overflow-hidden">
                <span className="text-[8px] text-zinc-500 leading-tight text-center line-clamp-4">{txt}</span>
              </div>
            )}
            {!txt && (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-[9px] text-zinc-400 font-mono">Empty</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ComicCanvasOverview({ spreads, currentSpreadIndex, onSelectSpread, onEditSpread, onClose, setSpreads, coverDesignData, effectiveFrontCover, effectiveBackCover }: {
  spreads: Spread[];
  currentSpreadIndex: number;
  onSelectSpread: (index: number) => void;
  onEditSpread: (index: number) => void;
  onClose: () => void;
  setSpreads: React.Dispatch<React.SetStateAction<Spread[]>>;
  coverDesignData?: Partial<CoverData>;
  effectiveFrontCover: string;
  effectiveBackCover: string;
}) {
  const [mode, setMode] = useState<OverviewMode>("design");
  const [showLayersPanel, setShowLayersPanel] = useState(true);
  const [contextSpreadIdx, setContextSpreadIdx] = useState<number | null>(null);
  const [contextPos, setContextPos] = useState<{ x: number; y: number } | null>(null);
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(() => {
    const m = new Map<string, { x: number; y: number }>();
    let col = 0;
    spreads.forEach((s, idx) => {
      for (const panel of s.leftPage) {
        if (panel.coverRole === "front-cover") {
          const nid = `cover_${panel.id}`;
          m.set(nid, { x: col * (SINGLE_PAGE_W + SPREAD_GAP_X) + 40, y: 40 });
          col++;
        }
      }
      m.set(s.id, {
        x: col * (SPREAD_PREVIEW_W / 2 + SPREAD_GAP_X / 2) + 40,
        y: 40,
      });
      col += 2;
      for (const panel of [...s.leftPage, ...s.rightPage]) {
        if (panel.coverRole === "back-cover") {
          const nid = `backcover_${panel.id}`;
          m.set(nid, { x: col * (SINGLE_PAGE_W + SPREAD_GAP_X) + 40, y: 40 });
          col++;
        }
      }
    });
    return m;
  });
  const [flowConnections, setFlowConnections] = useState<FlowConnection[]>(() =>
    spreads.slice(0, -1).map((s, idx) => ({
      fromId: s.id,
      toId: spreads[idx + 1].id,
      fromSide: "right" as Side,
      toSide: "left" as Side,
    }))
  );
  const [showFlowPreview, setShowFlowPreview] = useState(false);
  const [layerPage, setLayerPage] = useState<"left" | "right">("left");

  useEffect(() => {
    const existingIds = new Set(nodePositions.keys());
    const validIds = new Set<string>();
    let changed = false;
    const newPositions = new Map(nodePositions);

    spreads.forEach((s, idx) => {
      validIds.add(s.id);
      if (!existingIds.has(s.id)) {
        newPositions.set(s.id, {
          x: (idx % SPREAD_COLS) * (SPREAD_PREVIEW_W + SPREAD_GAP_X) + 40,
          y: Math.floor(idx / SPREAD_COLS) * (SPREAD_PREVIEW_H + SPREAD_GAP_Y) + 40,
        });
        changed = true;
      }
      for (const page of ["leftPage", "rightPage"] as const) {
        for (const panel of s[page]) {
          if (panel.coverRole === "front-cover") {
            const nid = `cover_${panel.id}`;
            validIds.add(nid);
            if (!existingIds.has(nid)) {
              const spreadPos = newPositions.get(s.id) || { x: 40, y: 40 };
              newPositions.set(nid, { x: spreadPos.x - SINGLE_PAGE_W - SPREAD_GAP_X, y: spreadPos.y });
              changed = true;
            }
          } else if (panel.coverRole === "back-cover") {
            const nid = `backcover_${panel.id}`;
            validIds.add(nid);
            if (!existingIds.has(nid)) {
              const spreadPos = newPositions.get(s.id) || { x: 40, y: 40 };
              newPositions.set(nid, { x: spreadPos.x + SPREAD_PREVIEW_W + SPREAD_GAP_X, y: spreadPos.y });
              changed = true;
            }
          }
        }
      }
    });

    for (const id of existingIds) {
      if (!validIds.has(id)) {
        newPositions.delete(id);
        changed = true;
      }
    }
    if (changed) setNodePositions(newPositions);

    const allValidIds = new Set(spreads.map(s => s.id));
    for (const id of newPositions.keys()) allValidIds.add(id);
    setFlowConnections(prev => {
      const cleaned = prev.filter(c => allValidIds.has(c.fromId) && allValidIds.has(c.toId));
      return cleaned.length !== prev.length ? cleaned : prev;
    });
  }, [spreads]);

  const spreadMap = useMemo(() => new Map(spreads.map((s, i) => [s.id, i])), [spreads]);

  const nodeMeta = useMemo(() => {
    const meta = new Map<string, OverviewNodeMeta>();
    spreads.forEach((spread, idx) => {
      meta.set(spread.id, { type: "spread", spreadIdx: idx, label: `Spread ${idx + 1}` });
      for (const page of ["leftPage", "rightPage"] as const) {
        const pageSide = page === "leftPage" ? "left" : "right";
        for (const panel of spread[page]) {
          if (panel.coverRole === "front-cover") {
            const nodeId = `cover_${panel.id}`;
            meta.set(nodeId, { type: "cover", spreadIdx: idx, page: pageSide, panelId: panel.id, label: "Front Cover" });
          } else if (panel.coverRole === "back-cover") {
            const nodeId = `backcover_${panel.id}`;
            meta.set(nodeId, { type: "back-cover", spreadIdx: idx, page: pageSide, panelId: panel.id, label: "Back Cover" });
          }
        }
      }
    });
    return meta;
  }, [spreads]);

  const coverOnlySpreads = useMemo(() => {
    const set = new Set<string>();
    for (const s of spreads) {
      const allLeft = s.leftPage.every(p => !!p.coverRole);
      const allRight = s.rightPage.every(p => !!p.coverRole);
      const hasAnyContent = s.leftPage.length > 0 || s.rightPage.length > 0;
      if (hasAnyContent && allLeft && allRight) {
        set.add(s.id);
      }
    }
    return set;
  }, [spreads]);

  const canvasNodes: CanvasNode[] = useMemo(() => {
    const nodes: CanvasNode[] = [];
    spreads.forEach((spread) => {
      if (coverOnlySpreads.has(spread.id)) return;
      const pos = nodePositions.get(spread.id) || { x: 0, y: 0 };
      nodes.push({ id: spread.id, x: pos.x, y: pos.y, width: SPREAD_PREVIEW_W, height: SPREAD_PREVIEW_H });
    });
    for (const [nodeId, m] of nodeMeta) {
      if (m.type === "cover" || m.type === "back-cover") {
        const pos = nodePositions.get(nodeId);
        if (pos) {
          nodes.push({ id: nodeId, x: pos.x, y: pos.y, width: SINGLE_PAGE_W, height: SINGLE_PAGE_H });
        }
      }
    }
    return nodes;
  }, [spreads, nodePositions, nodeMeta, coverOnlySpreads]);

  const canvasConnections: CanvasConnection[] = useMemo(() =>
    flowConnections.map(fc => ({
      fromId: fc.fromId,
      toId: fc.toId,
      fromSide: fc.fromSide,
      toSide: fc.toSide,
    })), [flowConnections]);

  const handleNodeMove = useCallback((id: string, x: number, y: number) => {
    setNodePositions(prev => {
      const next = new Map(prev);
      next.set(id, { x, y });
      return next;
    });
  }, []);

  const handleCreateConnection = useCallback((fromId: string, toId: string, fromSide: Side, toSide: Side) => {
    const validIds = new Set<string>();
    spreads.forEach(s => validIds.add(s.id));
    for (const [nid] of nodeMeta) validIds.add(nid);
    if (!validIds.has(fromId) || !validIds.has(toId)) return;
    setFlowConnections(prev => {
      const exists = prev.some(c => c.fromId === fromId && c.toId === toId);
      if (exists) return prev;
      return [...prev, { fromId, toId, fromSide, toSide }];
    });
  }, [spreads, nodeMeta]);

  const handleDeleteConnection = useCallback((fromId: string, toId: string) => {
    setFlowConnections(prev => prev.filter(c => !(c.fromId === fromId && c.toId === toId)));
  }, []);

  const addSpreadAtEnd = useCallback(() => {
    const newId = `spread_${Date.now()}`;
    setSpreads(prev => [...prev, { id: newId, leftPage: [], rightPage: [] }]);
  }, [setSpreads]);

  const duplicateSpread = useCallback((idx: number) => {
    const src = spreads[idx];
    if (!src) return;
    const newId = `spread_${Date.now()}`;
    const clonePanel = (p: Panel): Panel => ({
      ...p, id: `panel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contents: p.contents.map(c => ({ ...c, id: `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` })),
    });
    const newSpread: Spread = {
      id: newId,
      leftPage: src.leftPage.map(clonePanel),
      rightPage: src.rightPage.map(clonePanel),
      themeMusic: src.themeMusic ? { ...src.themeMusic } : undefined,
      leftNarration: src.leftNarration ? { ...src.leftNarration } : undefined,
      rightNarration: src.rightNarration ? { ...src.rightNarration } : undefined,
      tag: src.tag,
    };
    setSpreads(prev => {
      const next = [...prev];
      next.splice(idx + 1, 0, newSpread);
      return next;
    });
    toast.success(`Duplicated spread ${idx + 1}`);
  }, [spreads, setSpreads]);

  const deleteSpread = useCallback((idx: number) => {
    if (spreads.length <= 1) { toast.error("Cannot delete the only spread"); return; }
    setSpreads(prev => prev.filter((_, i) => i !== idx));
    if (currentSpreadIndex === idx) {
      onSelectSpread(Math.max(0, idx - 1));
    } else if (currentSpreadIndex > idx) {
      onSelectSpread(currentSpreadIndex - 1);
    }
    toast.success(`Deleted spread ${idx + 1}`);
  }, [spreads, currentSpreadIndex, setSpreads, onSelectSpread]);

  const addPanelToSpread = useCallback((idx: number, page: "left" | "right") => {
    const newPanel: Panel = {
      id: `panel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      x: 5, y: 5, width: 45, height: 45, rotation: 0,
      contents: [], zIndex: 0, shape: "rectangle",
      borderWidth: 3, borderColor: "#000000",
    };
    setSpreads(prev => prev.map((s, i) => {
      if (i !== idx) return s;
      const key = page === "left" ? "leftPage" : "rightPage";
      const panels = [...s[key], { ...newPanel, zIndex: s[key].length }];
      return { ...s, [key]: panels };
    }));
    toast.success(`Added panel to ${page} page of spread ${idx + 1}`);
  }, [setSpreads]);

  const deletePanelFromSpread = useCallback((spreadIdx: number, page: "left" | "right", panelId: string) => {
    setSpreads(prev => prev.map((s, i) => {
      if (i !== spreadIdx) return s;
      const key = page === "left" ? "leftPage" : "rightPage";
      const filtered = s[key].filter(p => p.id !== panelId);
      const reindexed = filtered.map((p, pi) => ({ ...p, zIndex: pi }));
      return { ...s, [key]: reindexed };
    }));
  }, [setSpreads]);

  const togglePanelVisibility = useCallback((spreadIdx: number, page: "left" | "right", panelId: string) => {
    setSpreads(prev => prev.map((s, i) => {
      if (i !== spreadIdx) return s;
      const key = page === "left" ? "leftPage" : "rightPage";
      return { ...s, [key]: s[key].map(p => p.id === panelId ? { ...p, hidden: !p.hidden } : p) };
    }));
  }, [setSpreads]);

  const togglePanelLock = useCallback((spreadIdx: number, page: "left" | "right", panelId: string) => {
    setSpreads(prev => prev.map((s, i) => {
      if (i !== spreadIdx) return s;
      const key = page === "left" ? "leftPage" : "rightPage";
      return { ...s, [key]: s[key].map(p => p.id === panelId ? { ...p, locked: !p.locked } : p) };
    }));
  }, [setSpreads]);

  const handleNodeContextMenu = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const idx = spreadMap.get(nodeId);
    if (idx !== undefined) {
      setContextSpreadIdx(idx);
      setContextPos({ x: e.clientX, y: e.clientY });
      onSelectSpread(idx);
    }
  }, [spreadMap, onSelectSpread]);

  useEffect(() => {
    if (contextPos) {
      const close = () => { setContextPos(null); setContextSpreadIdx(null); };
      window.addEventListener("click", close);
      window.addEventListener("contextmenu", close);
      return () => { window.removeEventListener("click", close); window.removeEventListener("contextmenu", close); };
    }
  }, [contextPos]);

  const renderSpreadNode = useCallback((node: CanvasNode) => {
    const meta = nodeMeta.get(node.id);
    if (!meta) return null;

    if (meta.type === "cover" || meta.type === "back-cover") {
      const spread = spreads[meta.spreadIdx];
      if (!spread || !meta.panelId) return null;
      const pageKey = meta.page === "left" ? "leftPage" : "rightPage";
      const panel = spread[pageKey].find(p => p.id === meta.panelId);
      if (!panel) return null;
      const nodeConnCount = flowConnections.filter(c => c.fromId === node.id || c.toId === node.id).length;
      return (
        <SinglePageNodeRenderer
          panel={panel}
          label={meta.label}
          nodeType={meta.type}
          isSelected={meta.spreadIdx === currentSpreadIndex}
          coverDesignData={coverDesignData}
          effectiveFrontCover={effectiveFrontCover}
          effectiveBackCover={effectiveBackCover}
          connCount={nodeConnCount}
          mode={mode}
        />
      );
    }

    const idx = spreadMap.get(node.id);
    if (idx === undefined) return null;
    const spread = spreads[idx];
    if (!spread) return null;
    return (
      <div onContextMenu={(e) => handleNodeContextMenu(e, node.id)}>
        <SpreadNodeRenderer
          spread={spread} idx={idx} currentSpreadIndex={currentSpreadIndex}
          mode={mode} flowConnections={flowConnections} nodeId={node.id}
          coverDesignData={coverDesignData}
          effectiveFrontCover={effectiveFrontCover}
          effectiveBackCover={effectiveBackCover}
        />
      </div>
    );
  }, [spreads, currentSpreadIndex, spreadMap, mode, flowConnections, handleNodeContextMenu, nodeMeta, coverDesignData, effectiveFrontCover, effectiveBackCover]);

  const selectedSpread = spreads[currentSpreadIndex];

  const flowStartId = useMemo(() => {
    const coverSpread = spreads.find(s => s.tag === "cover");
    if (coverSpread) return coverSpread.id;
    const incomingIds = new Set(flowConnections.map(c => c.toId));
    const root = spreads.find(s => !incomingIds.has(s.id) && flowConnections.some(c => c.fromId === s.id));
    if (root) return root.id;
    return spreads[currentSpreadIndex]?.id || spreads[0].id;
  }, [spreads, flowConnections, currentSpreadIndex]);

  if (showFlowPreview && flowConnections.length > 0) {
    return (
      <FlowPreviewPlayer
        spreads={spreads}
        flowConnections={flowConnections}
        startId={flowStartId}
        onClose={() => setShowFlowPreview(false)}
        coverDesignData={coverDesignData}
        effectiveFrontCover={effectiveFrontCover}
        effectiveBackCover={effectiveBackCover}
      />
    );
  }

  const layerPanels = selectedSpread ? (layerPage === "left" ? selectedSpread.leftPage : selectedSpread.rightPage) : [];
  const sortedLayerPanels = [...layerPanels].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div className="absolute inset-0 flex">
      <div className="flex-1 relative">
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-0 bg-black/80 border border-zinc-800 rounded-xl backdrop-blur-xl shadow-lg shadow-black/40 overflow-hidden">
          <button
            onClick={() => setMode("design")}
            className={`px-5 py-2.5 text-sm font-mono font-bold transition-all flex items-center gap-2 ${
              mode === "design"
                ? "bg-cyan-500/20 text-cyan-400 border-b-2 border-cyan-400"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
            }`}
            data-testid="button-mode-design"
          >
            <Layers className="w-3.5 h-3.5" />
            Design
          </button>
          <div className="w-px h-6 bg-zinc-800" />
          <button
            onClick={() => setMode("prototype")}
            className={`px-5 py-2.5 text-sm font-mono font-bold transition-all flex items-center gap-2 ${
              mode === "prototype"
                ? "bg-blue-500/20 text-blue-400 border-b-2 border-blue-400"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
            }`}
            data-testid="button-mode-prototype"
          >
            <Share2 className="w-3.5 h-3.5" />
            Prototype
          </button>
          <div className="w-px h-6 bg-zinc-800" />
          <button
            onClick={() => setShowLayersPanel(!showLayersPanel)}
            className={`px-3 py-2.5 transition-all ${showLayersPanel ? "text-cyan-400 bg-cyan-500/10" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"}`}
            data-testid="button-toggle-layers"
            title="Toggle Layers Panel"
          >
            <Layers className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-zinc-800" />
          <button onClick={onClose} className="px-3 py-2.5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all" data-testid="button-close-canvas-overview">
            <X className="w-4 h-4" />
          </button>
        </div>

        {mode === "design" && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-black/80 border border-zinc-800 rounded-xl p-1 backdrop-blur-xl shadow-lg shadow-black/40">
            <button
              onClick={addSpreadAtEnd}
              className="px-3 py-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-all flex items-center gap-1.5 text-xs font-mono"
              data-testid="button-add-spread"
            >
              <Plus className="w-3.5 h-3.5" /> Add Spread
            </button>
            <div className="w-px h-4 bg-zinc-700" />
            <button
              onClick={() => addPanelToSpread(currentSpreadIndex, "left")}
              className="px-3 py-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-all flex items-center gap-1.5 text-xs font-mono"
              data-testid="button-add-panel-left"
              disabled={!selectedSpread}
            >
              <Square className="w-3 h-3" /> + Left Panel
            </button>
            <button
              onClick={() => addPanelToSpread(currentSpreadIndex, "right")}
              className="px-3 py-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-all flex items-center gap-1.5 text-xs font-mono"
              data-testid="button-add-panel-right"
              disabled={!selectedSpread}
            >
              <Square className="w-3 h-3" /> + Right Panel
            </button>
          </div>
        )}

        {mode === "prototype" && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
            <button
              onClick={() => setShowFlowPreview(true)}
              disabled={flowConnections.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-blue-900/40 disabled:shadow-none"
              data-testid="button-play-flow"
            >
              <Play className="w-3.5 h-3.5" />
              Preview Flow
            </button>
            {flowConnections.length > 0 && (
              <span className="text-[10px] text-blue-400/60 font-mono">{flowConnections.length} connections</span>
            )}
          </div>
        )}

        <InfiniteCanvas
          nodes={canvasNodes}
          connections={canvasConnections}
          onNodeMove={handleNodeMove}
          onNodeDoubleClick={(id) => {
            const meta = nodeMeta.get(id);
            if (meta) onEditSpread(meta.spreadIdx);
          }}
          onNodeClick={(id) => {
            const meta = nodeMeta.get(id);
            if (meta) onSelectSpread(meta.spreadIdx);
          }}
          renderNode={renderSpreadNode}
          selectedNodeId={spreads[currentSpreadIndex]?.id}
          gridSize={20}
          showMinimap={true}
          prototypeMode={mode === "prototype"}
          onCreateConnection={handleCreateConnection}
          onDeleteConnection={handleDeleteConnection}
        />
      </div>

      {showLayersPanel && selectedSpread && (
        <aside className="w-64 border-l border-zinc-800 bg-zinc-900 flex flex-col z-30" data-testid="overview-layers-panel">
          <div className="p-3 border-b border-zinc-800 font-bold text-sm flex items-center justify-between">
            <span className="flex items-center gap-2 text-white"><Layers className="w-4 h-4 text-cyan-400" /> Layers</span>
            <span className="text-[10px] text-zinc-500 font-mono">Spread {currentSpreadIndex + 1}</span>
          </div>
          <div className="flex border-b border-zinc-800">
            <button
              onClick={() => setLayerPage("left")}
              className={`flex-1 py-2 text-xs font-mono font-bold transition-all ${layerPage === "left" ? "bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400" : "text-zinc-500 hover:text-zinc-300"}`}
              data-testid="button-layer-page-left"
            >
              Left ({selectedSpread.leftPage.length})
            </button>
            <button
              onClick={() => setLayerPage("right")}
              className={`flex-1 py-2 text-xs font-mono font-bold transition-all ${layerPage === "right" ? "bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400" : "text-zinc-500 hover:text-zinc-300"}`}
              data-testid="button-layer-page-right"
            >
              Right ({selectedSpread.rightPage.length})
            </button>
          </div>
          <div className="flex-1 overflow-auto p-1.5 space-y-0.5">
            {sortedLayerPanels.length === 0 && (
              <div className="text-center py-6 text-zinc-600 text-xs font-mono">
                No panels on {layerPage} page
              </div>
            )}
            {sortedLayerPanels.map((panel, vi) => {
              const isCover = !!panel.coverRole;
              const img = panel.contents.find(c => c.type === "image" && !c.hidden)?.data?.url;
              const txt = panel.contents.find(c => c.type === "text" && !c.hidden)?.data?.text;
              return (
                <div key={panel.id}
                  className={`px-2 py-1.5 text-xs flex items-center gap-1.5 group rounded-md transition-colors ${
                    panel.hidden ? "opacity-40" : ""
                  } bg-zinc-800 hover:bg-zinc-700`}
                  data-testid={`overview-layer-${panel.id}`}
                >
                  <GripVertical className="w-3 h-3 flex-shrink-0 opacity-30 group-hover:opacity-70 cursor-grab" />
                  <button
                    onClick={() => togglePanelVisibility(currentSpreadIndex, layerPage, panel.id)}
                    className="p-0.5 flex-shrink-0 hover:bg-zinc-600 rounded"
                    data-testid={`overview-eye-${panel.id}`}
                  >
                    {panel.hidden ? <EyeOff className="w-3 h-3 text-zinc-500" /> : <Eye className="w-3 h-3 text-zinc-400" />}
                  </button>
                  {img ? (
                    <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0 border border-zinc-700">
                      <img src={img} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded flex-shrink-0 border border-zinc-700 bg-zinc-900 flex items-center justify-center">
                      {txt ? <Type className="w-3 h-3 text-zinc-600" /> : <Square className="w-3 h-3 text-zinc-600" />}
                    </div>
                  )}
                  <span className="flex-1 truncate font-medium text-white">
                    {panel.name || (isCover ? (panel.coverRole === "front-cover" ? "Front Cover" : "Back Cover") : `Panel ${vi + 1}`)}
                  </span>
                  {isCover && (
                    <span className={`text-[7px] px-1 py-0.5 font-bold rounded ${panel.coverRole === "front-cover" ? "bg-cyan-600 text-white" : "bg-purple-600 text-white"}`}>
                      {panel.coverRole === "front-cover" ? "FC" : "BC"}
                    </span>
                  )}
                  <button
                    onClick={() => togglePanelLock(currentSpreadIndex, layerPage, panel.id)}
                    className="p-0.5 flex-shrink-0 hover:bg-zinc-600 rounded"
                  >
                    {panel.locked ? <Lock className="w-3 h-3 text-zinc-400" /> : <Unlock className="w-3 h-3 opacity-30 group-hover:opacity-70 text-zinc-500" />}
                  </button>
                  <button
                    onClick={() => deletePanelFromSpread(currentSpreadIndex, layerPage, panel.id)}
                    className="p-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:bg-red-900/50 rounded text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="p-2 border-t border-zinc-800 flex gap-1">
            <button
              onClick={() => addPanelToSpread(currentSpreadIndex, layerPage)}
              className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1"
              data-testid="button-layers-add-panel"
            >
              <Plus className="w-3 h-3" /> Add Panel
            </button>
            <button
              onClick={() => onEditSpread(currentSpreadIndex)}
              className="flex-1 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-[10px] font-bold rounded-lg border border-cyan-500/30 transition-all flex items-center justify-center gap-1"
              data-testid="button-layers-edit-spread"
            >
              <Pen className="w-3 h-3" /> Edit
            </button>
          </div>
        </aside>
      )}

      {contextPos && contextSpreadIdx !== null && (
        <div
          className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl shadow-black/60 py-1 min-w-[200px] backdrop-blur-xl"
          style={{ left: contextPos.x, top: contextPos.y }}
          data-testid="overview-context-menu"
        >
          <button onClick={() => { onEditSpread(contextSpreadIdx); setContextPos(null); }}
            className="w-full px-4 py-2 text-left text-xs text-white hover:bg-zinc-800 flex items-center gap-2">
            <Pen className="w-3.5 h-3.5 text-cyan-400" /> Edit Spread {contextSpreadIdx + 1}
          </button>
          <div className="h-px bg-zinc-800 mx-2" />
          <button onClick={() => { addPanelToSpread(contextSpreadIdx, "left"); setContextPos(null); }}
            className="w-full px-4 py-2 text-left text-xs text-white hover:bg-zinc-800 flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" /> Add Panel (Left Page)
          </button>
          <button onClick={() => { addPanelToSpread(contextSpreadIdx, "right"); setContextPos(null); }}
            className="w-full px-4 py-2 text-left text-xs text-white hover:bg-zinc-800 flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" /> Add Panel (Right Page)
          </button>
          <div className="h-px bg-zinc-800 mx-2" />
          <button onClick={() => { duplicateSpread(contextSpreadIdx); setContextPos(null); }}
            className="w-full px-4 py-2 text-left text-xs text-white hover:bg-zinc-800 flex items-center gap-2">
            <Copy className="w-3.5 h-3.5" /> Duplicate Spread
          </button>
          <button onClick={() => { addSpreadAtEnd(); setContextPos(null); }}
            className="w-full px-4 py-2 text-left text-xs text-white hover:bg-zinc-800 flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" /> Add New Spread
          </button>
          <div className="h-px bg-zinc-800 mx-2" />
          <div className="px-4 py-1.5 text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Tag As</div>
          {(Object.entries(SPREAD_TAG_CONFIG) as [SpreadTag, typeof SPREAD_TAG_CONFIG[SpreadTag]][]).map(([tagKey, conf]) => {
            const isActive = spreads[contextSpreadIdx]?.tag === tagKey;
            return (
              <button key={tagKey} onClick={() => {
                setSpreads(prev => prev.map((s, i) => i === contextSpreadIdx ? { ...s, tag: isActive ? undefined : tagKey } : s));
                setContextPos(null);
              }}
                className="w-full px-4 py-2 text-left text-xs text-white hover:bg-zinc-800 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: conf.color, boxShadow: isActive ? `0 0 8px ${conf.color}` : "none" }} />
                <span style={{ color: isActive ? conf.color : "#fff" }}>{conf.label}</span>
                {isActive && <span className="ml-auto text-[9px] opacity-60">✓</span>}
              </button>
            );
          })}
          <button onClick={() => {
            setSpreads(prev => prev.map((s, i) => i === contextSpreadIdx ? { ...s, tag: undefined } : s));
            setContextPos(null);
          }}
            className="w-full px-4 py-2 text-left text-xs text-zinc-500 hover:bg-zinc-800 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0 border border-zinc-600" />
            Clear Tag
          </button>
          <div className="h-px bg-zinc-800 mx-2" />
          <button onClick={() => {
            setSpreads(prev => {
              const wasLast = prev[contextSpreadIdx]?.isLastPage;
              return prev.map((s, i) => ({ ...s, isLastPage: i === contextSpreadIdx ? !wasLast : false }));
            });
            setContextPos(null);
          }} className="w-full px-4 py-2 text-left text-xs text-white hover:bg-zinc-800 flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5" /> Toggle Last Page
          </button>
          <div className="h-px bg-zinc-800 mx-2" />
          <button onClick={() => { deleteSpread(contextSpreadIdx); setContextPos(null); }}
            className="w-full px-4 py-2 text-left text-xs text-red-400 hover:bg-red-900/30 flex items-center gap-2">
            <Trash2 className="w-3.5 h-3.5" /> Delete Spread
          </button>
        </div>
      )}
    </div>
  );
}

export default function ComicCreator() {
  const [location, navigate] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const projectId = searchParams.get('id');
  
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const { data: project, isError: projectFetchError, refetch: refetchProject } = useProject(projectId || createdProjectId || '');
  const updateProject = useUpdateProject();
  const createProject = useCreateProject();
  const { importFromFile, importFromFiles, assets, folders, getAssetsInFolder, isLoading: isAssetLibraryLoading, reorderAssets } = useAssetLibrary();
  const { hasFeature, isAdmin, tier } = useSubscription();
  const { user, isStudent } = useAuth();
  const { showWhatsNext, fireXpAction } = usePostAction();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string>("Export");
  const [upgradeUsageInfo, setUpgradeUsageInfo] = useState<{ used: number; limit: number } | undefined>();

  const showUpgrade = useCallback((feature: string, usage?: { used: number; limit: number }) => {
    setUpgradeFeature(feature);
    setUpgradeUsageInfo(usage);
    setShowUpgradeModal(true);
  }, []);
  const { isOpen: discoveryOpen, featureKey: discoveryFeature, showDiscovery, closeDiscovery } = useProFeatureDiscovery();
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileResult, setCompileResult] = useState<{ status: "success" | "warning"; messages: string[] } | null>(null);
  const [showWatermarkBanner, setShowWatermarkBanner] = useState(false);

  const resolveAssetUrl = useCallback(async (asset: { id: string; url: string }): Promise<string> => {
    if (asset.url) return asset.url;
    try {
      const resp = await fetch(`/api/assets/${asset.id}`, { credentials: "include" });
      if (resp.ok) { const d = await resp.json(); return d.url || ""; }
    } catch (e) { console.error("Failed to resolve asset URL:", e); }
    return "";
  }, []);

  const [activeTool, setActiveTool] = useState("select");
  // UNIFIED CREATION ENGINE — top-level mode. Persisted in project.data.activeMode.
  const [activeMode, setActiveMode] = useState<ModeId>("layout");
  // Sensible default tool per mode. Switching modes auto-picks the right tool
  // so the user feels the mode change immediately. Tools themselves remain
  // identical across modes (per the directive — no degradation).
  const MODE_DEFAULT_TOOL: Record<ModeId, string> = {
    layout: "panel",
    ink: "draw", // legacy — kept for backward-compat with saved projects
    color: "select",
    motion: "select",
    fx: "select",
    text: "text",
  };
  const handleModeChange = useCallback((next: ModeId) => {
    setActiveMode(next);
    setActiveTool(MODE_DEFAULT_TOOL[next]);
  }, []);
  const [showAIGen, setShowAIGen] = useState(false);

  const openAIGen = useCallback(() => {
    if (!hasFeature("ai") && !isAdmin) {
      showUpgrade("AI Generation");
      return;
    }
    setShowAIGen(true);
  }, [hasFeature, isAdmin, showUpgrade]);
  const [title, setTitle] = useState("Untitled Comic");
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCreating, setIsCreating] = useState(!projectId);
  
  const [spreads, setSpreadsRaw] = useState<Spread[]>([
    { id: "spread_1", leftPage: [{
      id: "default-cover-panel",
      x: 0, y: 0, width: 100, height: 100,
      backgroundColor: "#111111",
      shape: "rectangle" as const,
      contents: [],
      zIndex: 0,
      rotation: 0,
      coverRole: "front-cover",
    }], rightPage: [] }
  ]);
  const undoStackRef = useRef<Spread[][]>([]);
  const redoStackRef = useRef<Spread[][]>([]);
  const isUndoRedoRef = useRef(false);
  const MAX_HISTORY = 50;

  const setSpreads: typeof setSpreadsRaw = useCallback((action) => {
    setSpreadsRaw(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      if (!isUndoRedoRef.current) {
        undoStackRef.current = [...undoStackRef.current.slice(-(MAX_HISTORY - 1)), prev];
        redoStackRef.current = [];
      }
      return next;
    });
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const prev = undoStackRef.current[undoStackRef.current.length - 1];
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    setSpreadsRaw(current => {
      redoStackRef.current = [...redoStackRef.current, current];
      return prev;
    });
  }, []);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current[redoStackRef.current.length - 1];
    redoStackRef.current = redoStackRef.current.slice(0, -1);
    setSpreadsRaw(current => {
      undoStackRef.current = [...undoStackRef.current, current];
      return next;
    });
  }, []);

  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(0);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<"left" | "right">("left");
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const clipboardRef = useRef<{ type: "panel"; data: Panel; page: "left" | "right" } | { type: "content"; data: PanelContent; panelId: string; page: "left" | "right" } | null>(null);
  
  const [isDrawingPanel, setIsDrawingPanel] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [drawCurrent, setDrawCurrent] = useState({ x: 0, y: 0 });
  
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateFilter, setTemplateFilter] = useState("all");
  const [showLayers, setShowLayers] = useState(true);
  const [showPanelContents, setShowPanelContents] = useState(true);
  const [showAssetLibrary, setShowAssetLibrary] = useState(false);
  const [canvasOverview, setCanvasOverview] = useState(false);
  const [selectedLibraryFolder, setSelectedLibraryFolder] = useState<string | null>(null);
  const [draggedAssetId, setDraggedAssetId] = useState<string | null>(null);
  const [assetLibraryTab, setAssetLibraryTab] = useState<"library" | "fx-studio">("library");
  const [showFxConfirm, setShowFxConfirm] = useState(false);
  const [showSendTo, setShowSendTo] = useState(false);
  const [skipFxConfirm, setSkipFxConfirm] = useState(() => localStorage.getItem("skipFxStudioConfirm") === "true");
  const fxStudio = useFxStudio({
    projectId: projectId || undefined,
    onAssetsUpdated: () => setAssetLibraryTab("fx-studio"),
    onAssetReturned: (payload) => {
      const target = payload.target;
      if (!target || !payload.previewUrl) return;

      if (target.type === "cover") {
        setCoverDesignData(prev => ({
          ...prev,
          frontImage: payload.previewUrl!,
        }));
        toast.success("FX applied to front cover");
      } else if (target.type === "backCover") {
        setCoverDesignData(prev => ({
          ...prev,
          backImage: payload.previewUrl!,
        }));
        toast.success("FX applied to back cover");
      } else if (target.type === "priceTag") {
        setCoverDesignData(prev => ({
          ...prev,
          priceBoxImage: payload.previewUrl!,
        }));
        toast.success("FX applied to price tag");
      } else if (target.type === "panel") {
        const { panelId, page, spreadIndex } = target;
        setSpreads(prev => prev.map((s, si) => {
          if (si !== spreadIndex) return s;
          const updatePage = (panels: Panel[]) =>
            panels.map(p => {
              if (p.id !== panelId) return p;
              return {
                ...p,
                contents: [...p.contents, {
                  id: `fx-${Date.now()}`,
                  type: "image" as const,
                  data: { url: payload.previewUrl! },
                  transform: { x: 50, y: 50, width: 100, height: 100, rotation: 0, scaleX: 1, scaleY: 1 },
                  zIndex: p.contents.length,
                  locked: false,
                }],
              };
            });
          return {
            ...s,
            leftPage: page === "left" ? updatePage(s.leftPage) : s.leftPage,
            rightPage: page === "right" ? updatePage(s.rightPage) : s.rightPage,
          };
        }));
        toast.success("FX applied to panel");
      }
    },
  });
  // Legacy raster brush state — retained only to keep older keyboard handlers
  // and any unmigrated draw paths working. New code should drive `inkbladeBrush`.
  const [brushSize, setBrushSize] = useState(4);
  const [brushColor, setBrushColor] = useState("#000000");
  void brushColor;
  const [zoom, setZoom] = useState(100);
  const spreadAudioRef = useRef<HTMLAudioElement | null>(null);
  const spreadAudioInputRef = useRef<HTMLInputElement>(null);
  
  const [showPreview, setShowPreview] = useState(false);
  const [previewPage, setPreviewPage] = useState(0);
  const [autoLockPanels, setAutoLockPanels] = useState(true);
  const [showNarratorPanel, setShowNarratorPanel] = useState(false);
  const [narratorEditingSide, setNarratorEditingSide] = useState<"left" | "right">("left");
  const [comicMeta, setComicMeta] = useState({
    frontCover: "",
    backCover: "",
    bonusCards: [] as string[],
    credits: "Created with Press Start CoMixx"
  });
  const [showCoverPrompt, setShowCoverPrompt] = useState(false);
  const [coverDismissed, setCoverDismissed] = useState(false);
  
  const [inlineDrawingPanelId, setInlineDrawingPanelId] = useState<string | null>(null);
  const [inlineDrawingPage, setInlineDrawingPage] = useState<"left" | "right">("left");
  const [isInlineDrawing, setIsInlineDrawing] = useState(false);
  const [inlineEraserMode, setInlineEraserMode] = useState(false);
  // Panel-shape sub-mode (rectangle drag, circle drag, polygon click-to-add).
  const [panelShape, setPanelShape] = useState<"rectangle" | "circle" | "polygon">("rectangle");
  const [polygonPoints, setPolygonPoints] = useState<{ x: number; y: number }[]>([]);
  const [polygonHover, setPolygonHover] = useState<{ x: number; y: number } | null>(null);
  const [polygonPage, setPolygonPage] = useState<"left" | "right" | null>(null);
  // INKBLADE brush state — lifted so the popout panel can edit it and the
  // existing inline drawing handlers read live values from it.
  const [inkbladeBrush, setInkbladeBrush] = useState<BrushProfile>(() => getBrush("core"));
  // Bridge: keep the legacy brushColor/brushSize state in sync with INKBLADE
  // so the existing inline draw handlers honor the popout's settings.
  useEffect(() => {
    setBrushColor(inkbladeBrush.color);
    setBrushSize(inkbladeBrush.size);
  }, [inkbladeBrush.color, inkbladeBrush.size]);
  // INKBLADE handle for the vector-based inline drawing surface.
  const inkbladeHandleRef = useRef<InkbladeCanvasHandle>(null);
  const inlineDrawingRef = useRef<{ lastX: number; lastY: number } | null>(null);

  const leftPageRef = useRef<HTMLDivElement>(null);
  const rightPageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const creationAttempted = useRef(false);

  const effectiveProjectId = projectId || createdProjectId;
  const currentSpread = spreads[currentSpreadIndex];

  useEffect(() => {
    if (!fxStudio.isOpen) return;

    if (selectedContentId === "cover-price") {
      fxStudio.setActiveTarget({ type: "priceTag" });
      return;
    }

    if (!selectedPanelId || !currentSpread) {
      fxStudio.setActiveTarget(null);
      return;
    }
    const allPanels = [...currentSpread.leftPage, ...currentSpread.rightPage];
    const panel = allPanels.find(p => p.id === selectedPanelId);
    if (!panel) {
      fxStudio.setActiveTarget(null);
      return;
    }
    if (panel.coverRole === "front-cover") {
      fxStudio.setActiveTarget({ type: "cover" });
    } else if (panel.coverRole === "back-cover") {
      fxStudio.setActiveTarget({ type: "backCover" });
    } else {
      const page = currentSpread.leftPage.some(p => p.id === selectedPanelId) ? "left" as const : "right" as const;
      fxStudio.setActiveTarget({ type: "panel", panelId: selectedPanelId, spreadIndex: currentSpreadIndex, page });
    }
  }, [selectedPanelId, selectedContentId, currentSpreadIndex, currentSpread, fxStudio.isOpen]);

  const { syncAsset, isSyncing: isSyncingToCoMiXX } = useSyncToCoMiXX({
    defaultTag: "interior-page",
    sourceMode: "/creator/comic",
    projectId: effectiveProjectId || undefined,
  });

  const handleSyncCurrentPage = async () => {
    if (!hasFeature("export") && !isAdmin) { showUpgrade("Export"); return; }
    try {
      toast.info("Syncing page to CoMiXX...");
      const panels = selectedPage === "left" ? currentSpread.leftPage : currentSpread.rightPage;
      const narr = selectedPage === "left" ? currentSpread.leftNarration : currentSpread.rightNarration;
      const canvas = await exportPageToCanvas(panels, 1988, 3075, narr);
      const dataUrl = canvas.toDataURL("image/png");
      const pageNum = currentSpreadIndex * 2 + (selectedPage === "left" ? 1 : 2);
      const hasCover = panels.some(p => p.coverRole);
      const tag: AssetTag = panels.some(p => p.coverRole === "front-cover") ? "cover"
        : panels.some(p => p.coverRole === "back-cover") ? "back-cover"
        : "interior-page";
      await syncAsset({ name: `${title} - Page ${pageNum}`, dataUrl, tag, targetPage: pageNum });
    } catch { toast.error("Failed to sync page"); }
  };

  const handleSyncAllPages = async () => {
    if (!hasFeature("export") && !isAdmin) { showUpgrade("Export"); return; }
    try {
      toast.info("Syncing full comic to CoMiXX...");
      let pageNum = 0;
      if (effectiveFrontCover) {
        pageNum++;
        await syncAsset({ name: `${title} - Cover`, dataUrl: effectiveFrontCover, tag: "cover", targetPage: 0 });
      }
      for (let i = 0; i < spreads.length; i++) {
        const spread = spreads[i];
        if (spread.leftPage.length > 0) {
          pageNum++;
          const leftCanvas = await exportPageToCanvas(spread.leftPage, 1988, 3075, spread.leftNarration);
          await syncAsset({ name: `${title} - Page ${pageNum}`, dataUrl: leftCanvas.toDataURL("image/png"), tag: "interior-page", targetPage: pageNum });
        }
        if (spread.rightPage.length > 0) {
          pageNum++;
          const rightCanvas = await exportPageToCanvas(spread.rightPage, 1988, 3075, spread.rightNarration);
          await syncAsset({ name: `${title} - Page ${pageNum}`, dataUrl: rightCanvas.toDataURL("image/png"), tag: "interior-page", targetPage: pageNum });
        }
      }
      if (effectiveBackCover) {
        pageNum++;
        await syncAsset({ name: `${title} - Back Cover`, dataUrl: effectiveBackCover, tag: "back-cover", targetPage: pageNum });
      }
      toast.success(`Synced ${pageNum} pages to CoMiXX`);
    } catch { toast.error("Failed to sync comic"); }
  };

  const projectNotFound = projectId && projectFetchError && !createdProjectId;

  useEffect(() => {
    if (projectNotFound) {
      toast.error("Project not found — loading your most recent comic...");
      creationAttempted.current = false;
      navigate("/creator/comic", { replace: true });
      return;
    }
  }, [projectNotFound]);

  const findOrCreateProject = useCallback(() => {
    if (createdProjectId || creationAttempted.current) return;

    creationAttempted.current = true;
    setIsCreating(true);

    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      setIsCreating(false);
      toast.error("Project creation timed out - please try again");
    }, 30000);

    fetch("/api/projects?fields=meta", { credentials: "include" })
      .then(res => res.ok ? res.json() : Promise.reject(new Error("Failed to fetch projects")))
      .then((allProjects: any[]) => {
        if (cancelled) return;
        const existing = allProjects
          .filter((p: any) => p.type === "comic")
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
          navigate(`/creator/comic?id=${existing[0].id}`, { replace: true });
          return;
        }
        return createProject.mutateAsync({
          title: "Untitled Comic",
          type: "comic",
          status: "draft",
          data: { spreads: [] },
        }).then((newProject) => {
          if (cancelled) return;
          clearTimeout(timeoutId);
          setCreatedProjectId(newProject.id);
          setIsCreating(false);
          navigate(`/creator/comic?id=${newProject.id}`, { replace: true });
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
  }, [createdProjectId]);

  useEffect(() => {
    if (projectId) {
      setIsCreating(false);
      return;
    }
    return findOrCreateProject();
  }, [projectId]);

  const [coverDesignData, setCoverDesignData] = useState<Partial<CoverData> | undefined>(undefined);

  useEffect(() => {
    if (project) {
      setTitle(project.title);
      const data = project.data as any;
      if (data?.spreads?.length > 0) {
        setSpreadsRaw(data.spreads);
        undoStackRef.current = [];
        redoStackRef.current = [];
      }
      if (data?.comicMeta) {
        setComicMeta(prev => ({
          ...prev,
          ...data.comicMeta,
          bonusCards: data.comicMeta.bonusCards || prev.bonusCards || [],
        }));
      }
      if (data?.coverDesign) {
        const cd = data.coverDesign;
        const validIds = new Set<string>();
        const masterIds = ["master-title", "master-subtitle", "master-author", "master-banner", "master-price", "master-issue", "master-tagline", "master-isbn", "master-blurb", "master-back-title", "master-back-author", "master-back-publisher", "master-publisher", "bg-front", "bg-back"];
        masterIds.forEach(id => validIds.add(id));
        for (const l of cd.frontLayers || []) validIds.add(l.id);
        for (const l of cd.backLayers || []) validIds.add(l.id);
        for (const l of cd.spineLayers || []) validIds.add(l.id);
        for (const l of cd.frontImageLayers || []) validIds.add(l.id);
        for (const l of cd.backImageLayers || []) validIds.add(l.id);
        for (const l of cd.spineImageLayers || []) validIds.add(l.id);
        if (cd.elementZOrder) {
          cd.elementZOrder = cd.elementZOrder.filter((id: string) => validIds.has(id));
        }
        if (cd.hiddenElements) {
          cd.hiddenElements = cd.hiddenElements.filter((id: string) => validIds.has(id));
        }
        setCoverDesignData(cd);
      } else {
        setCoverDesignData(undefined);
      }
      if (!data?.comicMeta?.frontCover && !coverDismissed) {
        setShowCoverPrompt(true);
      }
      // Restore the unified-engine mode if previously saved.
      if (data?.activeMode && ["layout","ink","color","motion","fx","text"].includes(data.activeMode)) {
        setActiveMode(data.activeMode as ModeId);
      }
    }
  }, [project]);

  useEffect(() => {
    const fromScript = searchParams.get('fromScript');
    if (!fromScript) return;
    fxStudioApi.getEffect(fromScript).then((effect: any) => {
      const eff = Array.isArray(effect) ? effect[0] : effect;
      if (!eff) return;
      const metadata = eff.metadata || {};
      const raw = metadata.script_data || { title: eff.name || "Untitled", pages: metadata.pages || [], assets: metadata.assets || [] };
      const sd = normalizeScriptData(raw);
      const importedSpreads = scriptToComic(sd);
      if (importedSpreads.length > 0) {
        setSpreadsRaw(importedSpreads);
        undoStackRef.current = [];
        redoStackRef.current = [];
      }
      setTitle(sd.title || "Imported Script");
      toast.success("Script imported to Comic Creator");
    }).catch(() => toast.error("Failed to load script"));
  }, []);

  useEffect(() => {
    const fromLayout = searchParams.get('fromLayout');
    if (!fromLayout) return;
    fxStudioApi.getEffect(fromLayout).then((effect: any) => {
      const eff = Array.isArray(effect) ? effect[0] : effect;
      if (!eff) return;
      const metadata = eff.metadata || {};

      if (metadata.layout_data) {
        const raw: LayoutData = metadata.layout_data;
        const importedSpreads = layoutToSpreads(raw);
        if (importedSpreads.length > 0) {
          setSpreadsRaw(importedSpreads);
          undoStackRef.current = [];
          redoStackRef.current = [];
        }
        setTitle(raw.title || eff.name || "Imported Layout");
        toast.success("Layout imported from FX Studio");
      } else if (eff.preview_data_url) {
        const targetPage = eff.target_page || metadata.target_page || 1;
        const spreadIdx = Math.max(0, Math.floor((targetPage - 1) / 2));
        const side: "left" | "right" = targetPage % 2 === 1 ? "left" : "right";

        setSpreadsRaw(prev => {
          const newSpreads = [...prev];
          while (newSpreads.length <= spreadIdx) {
            newSpreads.push({
              id: `spread_${newSpreads.length}`,
              leftPage: [],
              rightPage: [],
            });
          }
          const key = side === "left" ? "leftPage" : "rightPage";
          const panel = {
            id: `panel_layout_img_${Date.now()}`,
            x: 0, y: 0, width: 100, height: 100,
            rotation: 0,
            type: "rectangle" as const,
            contents: [{
              id: `content_layout_img_${Date.now()}`,
              type: "image" as const,
              transform: { x: 0, y: 0, width: 400, height: 600, rotation: 0, scaleX: 1, scaleY: 1 },
              data: { url: eff.preview_data_url },
              zIndex: 0,
              locked: false,
            }],
            zIndex: 0,
            locked: false,
            backgroundColor: "#ffffff",
            borderColor: "#000000",
            borderWidth: 0,
          };
          newSpreads[spreadIdx] = {
            ...newSpreads[spreadIdx],
            [key]: [panel],
          };
          return newSpreads;
        });
        undoStackRef.current = [];
        redoStackRef.current = [];
        setTitle(eff.name || "Imported Layout");
        toast.success(`Layout image placed on page ${targetPage}`);
      }
    }).catch(() => toast.error("Failed to load layout"));
  }, []);

  const isValidCoverSrc = (src: string | undefined | null): src is string =>
    !!src && (src.startsWith("data:") || src.startsWith("http") || src.startsWith("blob:") || src.startsWith("/"));

  const hasUsableCoverDesign = (cd: any): boolean =>
    !!cd && (cd.title || cd.frontImage || cd.backImage || cd.author || cd.subtitle || cd.bannerText ||
      (cd.frontImageLayers?.length > 0) || (cd.backImageLayers?.length > 0) ||
      (cd.frontLayers?.length > 0) || (cd.backLayers?.length > 0) ||
      cd.frontBgColor !== defaultCover.frontBgColor || cd.backBgColor !== defaultCover.backBgColor);

  const projectData = project?.data as any;
  const effectiveFrontCover = isValidCoverSrc(comicMeta.frontCover) ? comicMeta.frontCover
    : isValidCoverSrc(projectData?.comicMeta?.frontCover) ? projectData.comicMeta.frontCover : "";
  const effectiveBackCover = isValidCoverSrc(comicMeta.backCover) ? comicMeta.backCover
    : isValidCoverSrc(projectData?.comicMeta?.backCover) ? projectData.comicMeta.backCover : "";

  // Auto-save system: debounced save + flush on unmount/beforeunload
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userEditCountRef = useRef(0);
  const initialLoadDoneRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const latestDataRef = useRef({ title, spreads, comicMeta, coverDesignData, projectId: effectiveProjectId });
  latestDataRef.current = { title, spreads, comicMeta, coverDesignData, projectId: effectiveProjectId };

  const projectConfirmedRef = useRef(false);
  const saveDisabledRef = useRef(false);
  const dataLoadedFromServerRef = useRef(false);
  useEffect(() => {
    projectConfirmedRef.current = !!project;
    if (project) {
      saveDisabledRef.current = false;
      dataLoadedFromServerRef.current = true;
    }
  }, [project]);
  useEffect(() => {
    projectConfirmedRef.current = false;
    saveDisabledRef.current = false;
    dataLoadedFromServerRef.current = false;
  }, [projectId]);

  const spreadsHaveContent = (s: Spread[]) => s.some(sp => sp.leftPage.some(p => p.contents.length > 0) || sp.rightPage.some(p => p.contents.length > 0));

  const flushSave = useCallback(async () => {
    const { projectId, title: t, spreads: s, comicMeta: cm, coverDesignData: cd } = latestDataRef.current;
    if (!projectId || !pendingSaveRef.current || !projectConfirmedRef.current || saveDisabledRef.current || !dataLoadedFromServerRef.current) return;
    pendingSaveRef.current = false;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    const { frontCover, backCover, coverProjectId, ...comicMetaSafe } = cm as any;
    const result = await saveProjectWithOfflineFallback(projectId, { title: t, data: { spreads: s, comicMeta: comicMetaSafe, ...(cd ? { coverDesign: cd } : {}) } }, 'comic');
    if (result === 'not_found') {
      saveDisabledRef.current = true;
      toast.error("Project no longer exists. Redirecting to a new project...");
      creationAttempted.current = false;
      navigate("/creator/comic", { replace: true });
    }
  }, []);

  useEffect(() => {
    if (project && !initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true;
      userEditCountRef.current = 0;
    }
  }, [project]);

  useEffect(() => {
    if (!effectiveProjectId || !initialLoadDoneRef.current || !projectConfirmedRef.current) return;
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
  }, [spreads, title, coverDesignData, effectiveProjectId, flushSave]);

  useEffect(() => {
    return () => {
      if (pendingSaveRef.current && projectConfirmedRef.current && !saveDisabledRef.current && dataLoadedFromServerRef.current) {
        const { projectId, title: t, spreads: s, comicMeta: cm, coverDesignData: cd } = latestDataRef.current;
        if (projectId) {
          const { frontCover: _fc, backCover: _bc, coverProjectId: _cp, ...cmSafe } = cm as any;
          navigator.sendBeacon(
            `/api/projects/${projectId}/autosave`,
            new Blob([JSON.stringify({ title: t, data: { spreads: s, comicMeta: cmSafe, ...(cd ? { coverDesign: cd } : {}) } })], { type: "application/json" })
          );
        }
      }
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingSaveRef.current && projectConfirmedRef.current && !saveDisabledRef.current && dataLoadedFromServerRef.current) {
        const { projectId, title: t, spreads: s, comicMeta: cm, coverDesignData: cd } = latestDataRef.current;
        if (projectId) {
          const { frontCover: _fc, backCover: _bc, coverProjectId: _cp, ...cmSafe } = cm as any;
          navigator.sendBeacon(
            `/api/projects/${projectId}/autosave`,
            new Blob([JSON.stringify({ title: t, data: { spreads: s, comicMeta: cmSafe, ...(cd ? { coverDesign: cd } : {}) } })], { type: "application/json" })
          );
        }
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const mod = e.ctrlKey || e.metaKey;
      switch(e.key.toLowerCase()) {
        case 'v': {
          if (mod) {
            e.preventDefault();
            if (clipboardRef.current) {
              const clip = clipboardRef.current;
              if (clip.type === "panel") {
                const newPanel: Panel = { ...JSON.parse(JSON.stringify(clip.data)), id: `panel_${Date.now()}`, x: clip.data.x + 5, y: clip.data.y + 5, contents: clip.data.contents.map((c: PanelContent) => ({ ...c, id: `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` })) };
                const panels = selectedPage === "left" ? currentSpread.leftPage : currentSpread.rightPage;
                newPanel.zIndex = panels.length;
                setSpreads(prev => prev.map((spread, i) => i !== currentSpreadIndex ? spread : { ...spread, [selectedPage === "left" ? "leftPage" : "rightPage"]: [...spread[selectedPage === "left" ? "leftPage" : "rightPage"], newPanel] }));
                setSelectedPanelId(newPanel.id);
                setSelectedContentId(null);
                toast.success("Panel pasted");
              } else if (clip.type === "content" && selectedPanelId) {
                const newContent: PanelContent = { ...JSON.parse(JSON.stringify(clip.data)), id: `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, transform: { ...clip.data.transform, x: clip.data.transform.x + 10, y: clip.data.transform.y + 10 } };
                addContentToPanel(selectedPage, selectedPanelId, newContent, newContent.id);
                setSelectedContentId(newContent.id);
                toast.success("Content pasted");
              }
            }
          } else {
            setActiveTool('select');
          }
          break;
        }
        case 'c': {
          if (mod && !editingTextId) {
            e.preventDefault();
            const panels = selectedPage === "left" ? currentSpread.leftPage : currentSpread.rightPage;
            if (selectedContentId && selectedPanelId) {
              const panel = panels.find(p => p.id === selectedPanelId);
              const content = panel?.contents.find(c => c.id === selectedContentId);
              if (content) { clipboardRef.current = { type: "content", data: JSON.parse(JSON.stringify(content)), panelId: selectedPanelId, page: selectedPage }; toast.success("Content copied"); }
            } else if (selectedPanelId) {
              const panel = panels.find(p => p.id === selectedPanelId);
              if (panel) { clipboardRef.current = { type: "panel", data: JSON.parse(JSON.stringify(panel)), page: selectedPage }; toast.success("Panel copied"); }
            }
          }
          break;
        }
        case 'p': setActiveTool('panel'); break;
        case 'b': setActiveTool('draw'); break;
        case 'e': setActiveTool('erase'); break;
        case 't': setActiveTool('text'); break;
        case 'g': openAIGen(); break;
        case 'delete': case 'backspace': {
          const isInInput = document.activeElement instanceof HTMLTextAreaElement || document.activeElement instanceof HTMLInputElement || (document.activeElement as HTMLElement)?.isContentEditable;
          if (!editingTextId && !isInInput) { handleDeleteSelected(); e.preventDefault(); }
          break;
        }
        case 'escape': setSelectedPanelId(null); setSelectedContentId(null); break;
        case 'z': if (mod) { e.preventDefault(); if (e.shiftKey) { handleRedo(); } else { handleUndo(); } } break;
        case 'y': if (mod) { e.preventDefault(); handleRedo(); } break;
        case 's': if (mod) { e.preventDefault(); handleSave(); } break;
        case 'f': if (mod) { e.preventDefault(); setIsFullscreen(!isFullscreen); } break;
        case 'r': if (mod) { e.preventDefault(); setPreviewPage(0); setShowPreview(true); refetchProject(); } break;
        case '[': setInkbladeBrush(b => ({ ...b, size: Math.max(1, b.size - 2) })); break;
        case ']': setInkbladeBrush(b => ({ ...b, size: Math.min(100, b.size + 2) })); break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPanelId, selectedContentId, editingTextId, selectedPage, currentSpread, currentSpreadIndex]);

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
      const res = await apiRequest("POST", `/api/projects/${effectiveProjectId}/submit-review`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", effectiveProjectId] });
      toast.success("Submitted for review!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to submit for review"),
  });

  const sendToPortfolio = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/pslms/send-to-portfolio", {
        projectId: effectiveProjectId,
        title: title,
        imageUrl: project?.thumbnail || "",
      });
      return res.json();
    },
    onSuccess: () => {
      toast.success("Sent to PSLMS portfolio!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to send to portfolio"),
  });

  const [liveResult, setLiveResult] = useState<PublishResult | null>(null);

  const publishProject = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${effectiveProjectId}/publish`, { visibility: "public" });
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["project", effectiveProjectId] });
      if (data.streamingUrl) {
        setLiveResult(data);
      } else {
        toast.success("Publishing started!");
      }
    },
    onError: (err: any) => toast.error(err.message || "Failed to publish"),
  });

  const handleSave = async () => {
    if (!effectiveProjectId) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/projects/${effectiveProjectId}/autosave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, data: { spreads, comicMeta, activeMode, ...(coverDesignData ? { coverDesign: coverDesignData } : {}) } }),
      });
      if (!res.ok) throw new Error("Save failed");
      qc.invalidateQueries({ queryKey: ["project", effectiveProjectId] });
      toast.success("Comic saved");
      fireXpAction("save");
    } catch (error: any) {
      toast.error(error.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCoverSave = async (coverDesign: CoverData, coverImages: { frontCover: string; backCover: string }) => {
    if (!effectiveProjectId) throw new Error("No project to save cover to");
    const res = await fetch(`/api/projects/${effectiveProjectId}/autosave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        data: {
          coverDesign,
          comicMeta: {
            frontCover: coverImages.frontCover,
            backCover: coverImages.backCover,
          }
        },
        thumbnail: coverImages.frontCover || undefined,
      }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || "Failed to save cover");
    }
    setComicMeta(prev => ({
      ...prev,
      frontCover: coverImages.frontCover || prev.frontCover,
      backCover: coverImages.backCover || prev.backCover,
    }));
    qc.invalidateQueries({ queryKey: ["project", effectiveProjectId] });
  };

  const setCoverRole = useCallback((page: "left" | "right", panelId: string, role: "front-cover" | "back-cover" | null) => {
    let targetPanel: Panel | undefined;
    setSpreads(prev => prev.map(spread => {
      const updated = {
        ...spread,
        leftPage: spread.leftPage.map(p => {
          if (p.id === panelId && page === "left") {
            targetPanel = p;
            if (role) return { ...p, coverRole: role, x: 0, y: 0, width: 100, height: 100, rotation: 0 };
            return { ...p, coverRole: undefined };
          }
          if (role && p.coverRole === role) return { ...p, coverRole: undefined };
          return p;
        }),
        rightPage: spread.rightPage.map(p => {
          if (p.id === panelId && page === "right") {
            targetPanel = p;
            if (role) return { ...p, coverRole: role, x: 0, y: 0, width: 100, height: 100, rotation: 0 };
            return { ...p, coverRole: undefined };
          }
          if (role && p.coverRole === role) return { ...p, coverRole: undefined };
          return p;
        }),
      };
      return updated;
    }));
    if (role) {
      const bgImageKey = role === "front-cover" ? "frontImage" : "backImage";
      const bgTransformKey = role === "front-cover" ? "frontBgTransform" : "backBgTransform";
      let panelImage: string | null = null;
      if (targetPanel) {
        const imgContent = targetPanel.contents
          .sort((a, b) => b.zIndex - a.zIndex)
          .find(c => c.type === "image" && c.data.url);
        if (imgContent?.data.url) {
          panelImage = imgContent.data.url;
        } else {
          const drawContent = targetPanel.contents
            .sort((a, b) => b.zIndex - a.zIndex)
            .find(c => c.type === "drawing" && c.data.drawingData);
          if (drawContent?.data.drawingData) {
            panelImage = drawContent.data.drawingData;
          }
        }
      }
      setCoverDesignData(prev => {
        const base = (prev && prev.title) ? prev : {
          ...defaultCover,
          title: title || defaultCover.title,
          spineText: title || defaultCover.spineText,
          author: user?.name || defaultCover.author,
        };
        if (panelImage) {
          return { ...base, [bgImageKey]: panelImage, [bgTransformKey]: { x: 0, y: 0, width: 100, height: 100, rotation: 0, scaleX: 1, scaleY: 1 } };
        }
        return base;
      });
      setShowLayers(true);
      setSelectedPanelId(panelId);
      setSelectedContentId(null);
      toast.success(`Panel set as ${role === "front-cover" ? "Front Cover" : "Back Cover"} — edit cover properties in the sidebar`);
    } else {
      toast.success("Cover role removed");
    }
  }, [setSpreads, title, user?.name]);

  const updateCoverData = useCallback((updates: Partial<CoverData>) => {
    setCoverDesignData(prev => {
      const base = prev || { ...defaultCover };
      return { ...base, ...updates };
    });
  }, []);

  const [coverSelectedLayerId, setCoverSelectedLayerId] = useState<string | null>(null);

  const handleGenerateThumbnail = async () => {
    if (!effectiveProjectId) return;
    try {
      const firstSpread = spreads[0];
      if (!firstSpread) {
        toast.error("No spreads to generate thumbnail from");
        return;
      }
      const panels = [...(firstSpread.leftPage || []), ...(firstSpread.rightPage || [])];

      if (effectiveFrontCover) {
        const res = await fetch(`/api/projects/${effectiveProjectId}/generate-thumbnail`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ thumbnail: effectiveFrontCover }),
        });
        if (res.ok) {
          qc.invalidateQueries({ queryKey: ["project", effectiveProjectId] });
          toast.success("Thumbnail generated from front cover!");
          return;
        }
      }

      const thumbWidth = 600;
      const thumbHeight = 900;
      const canvas = document.createElement("canvas");
      canvas.width = thumbWidth;
      canvas.height = thumbHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { toast.error("Could not create canvas"); return; }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, thumbWidth, thumbHeight);

      const loadImg = (src: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });

      const editorDims = getEditorPageDimensions();
      for (const panel of panels.sort((a, b) => a.zIndex - b.zIndex)) {
        const px = (panel.x / 100) * thumbWidth;
        const py = (panel.y / 100) * thumbHeight;
        const pw = (panel.width / 100) * thumbWidth;
        const ph = (panel.height / 100) * thumbHeight;
        const edPanelW = (panel.width / 100) * editorDims.w;
        const edPanelH = (panel.height / 100) * editorDims.h;
        ctx.save();
        ctx.beginPath();
        ctx.rect(px, py, pw, ph);
        ctx.clip();
        ctx.fillStyle = panel.backgroundColor || "#ffffff";
        ctx.fillRect(px, py, pw, ph);
        for (const content of (panel.contents || []).sort((a, b) => a.zIndex - b.zIndex)) {
          if ((content.type === "image" || content.type === "gif") && content.data?.url) {
            try {
              const img = await loadImg(content.data.url);
              const cx = px + (content.transform.x / edPanelW) * pw;
              const cy = py + (content.transform.y / edPanelH) * ph;
              const cw = (content.transform.width / edPanelW) * pw;
              const ch = (content.transform.height / edPanelH) * ph;
              ctx.drawImage(img, cx, cy, cw, ch);
            } catch {}
          } else if (content.type === "drawing" && content.data?.drawingData) {
            try {
              const img = await loadImg(content.data.drawingData);
              const cx = px + (content.transform.x / edPanelW) * pw;
              const cy = py + (content.transform.y / edPanelH) * ph;
              const cw = (content.transform.width / edPanelW) * pw;
              const ch = (content.transform.height / edPanelH) * ph;
              ctx.drawImage(img, cx, cy, cw, ch);
            } catch {}
          }
        }
        ctx.restore();
        ctx.strokeStyle = panel.borderColor || "#000000";
        ctx.lineWidth = panel.borderWidth || 2;
        ctx.strokeRect(px, py, pw, ph);
      }

      const dataUrl = canvas.toDataURL("image/png");
      const res = await fetch(`/api/projects/${effectiveProjectId}/generate-thumbnail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ thumbnail: dataUrl }),
      });
      if (res.ok) {
        qc.invalidateQueries({ queryKey: ["project", effectiveProjectId] });
        toast.success("Thumbnail generated from first page!");
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to generate thumbnail");
      }
    } catch (error: any) {
      toast.error("Failed to generate thumbnail");
    }
  };

  const handleUploadThumbnail = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!effectiveProjectId || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch(`/api/projects/${effectiveProjectId}/generate-thumbnail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ thumbnail: dataUrl }),
      });
      if (res.ok) {
        qc.invalidateQueries({ queryKey: ["project", effectiveProjectId] });
        toast.success("Thumbnail uploaded!");
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to upload thumbnail");
      }
    } catch {
      toast.error("Failed to upload thumbnail");
    }
    e.target.value = "";
  };

  const handleOpenReaderPreview = () => {
    if (!effectiveProjectId) {
      toast.error("Save the project first to preview as reader");
      return;
    }
    window.open(`/creator/comic/preview?id=${effectiveProjectId}`, "_blank");
  };

  const getEditorPageDimensions = (): { w: number; h: number } => {
    const ref = leftPageRef.current || rightPageRef.current;
    if (ref) {
      const rect = ref.getBoundingClientRect();
      const zoomScale = zoom / 100;
      return { w: rect.width / zoomScale, h: rect.height / zoomScale };
    }
    return { w: isFullscreen ? 800 : 650, h: isFullscreen ? 1130 : 920 };
  };

  const exportPageToCanvas = async (panels: Panel[], pageWidth: number, pageHeight: number, narration?: NarrationBox): Promise<HTMLCanvasElement> => {
    await document.fonts.ready;

    const canvas = document.createElement("canvas");
    canvas.width = pageWidth;
    canvas.height = pageHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageWidth, pageHeight);

    const editorDims = getEditorPageDimensions();

    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };

    const drawImageCover = (ctx2: CanvasRenderingContext2D, img: HTMLImageElement, dx: number, dy: number, dw: number, dh: number) => {
      if (!img.naturalWidth || !img.naturalHeight || !dw || !dh) {
        ctx2.drawImage(img, dx, dy, dw, dh);
        return;
      }
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const destRatio = dw / dh;
      let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
      if (imgRatio > destRatio) {
        sw = img.naturalHeight * destRatio;
        sx = (img.naturalWidth - sw) / 2;
      } else {
        sh = img.naturalWidth / destRatio;
        sy = (img.naturalHeight - sh) / 2;
      }
      ctx2.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    };

    for (const panel of panels.filter(p => !p.hidden).sort((a, b) => a.zIndex - b.zIndex)) {
      const panelX = (panel.x / 100) * pageWidth;
      const panelY = (panel.y / 100) * pageHeight;
      const panelW = (panel.width / 100) * pageWidth;
      const panelH = (panel.height / 100) * pageHeight;

      const editorPanelW = (panel.width / 100) * editorDims.w;
      const editorPanelH = (panel.height / 100) * editorDims.h;

      ctx.save();
      
      if (panel.type === "circle") {
        ctx.beginPath();
        ctx.ellipse(panelX + panelW / 2, panelY + panelH / 2, panelW / 2, panelH / 2, 0, 0, Math.PI * 2);
        ctx.clip();
      } else {
        ctx.beginPath();
        ctx.rect(panelX, panelY, panelW, panelH);
        ctx.clip();
      }

      ctx.fillStyle = panel.backgroundColor || "#ffffff";
      ctx.fillRect(panelX, panelY, panelW, panelH);

      if (panel.coverRole && coverDesignData) {
        const cd = { ...defaultCover, ...coverDesignData } as CoverData;
        const hiddenEls = new Set(cd.hiddenElements || []);
        const isFront = panel.coverRole === "front-cover";
        const bgColor = isFront ? cd.frontBgColor : cd.backBgColor;
        const bgImage = isFront ? cd.frontImage : cd.backImage;

        ctx.fillStyle = bgColor;
        ctx.fillRect(panelX, panelY, panelW, panelH);

        if (bgImage) {
          try {
            const bgImg = await loadImage(bgImage);
            drawImageCover(ctx, bgImg, panelX, panelY, panelW, panelH);
          } catch {}
        }

        const drawCenterText = (text: string, y: number, font: string, color: string, size: number, opts?: { bold?: boolean; uppercase?: boolean; stroke?: string; strokeW?: number }) => {
          ctx.save();
          ctx.fillStyle = color;
          const weight = opts?.bold ? 'bold ' : '';
          ctx.font = `${weight}${size}px ${font.replace(/'/g, '"')}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          const displayText = opts?.uppercase ? text.toUpperCase() : text;
          if (opts?.stroke && opts?.strokeW) {
            ctx.strokeStyle = opts.stroke;
            ctx.lineWidth = opts.strokeW;
            ctx.strokeText(displayText, panelX + panelW / 2, y);
          }
          ctx.fillText(displayText, panelX + panelW / 2, y);
          ctx.restore();
        };

        const scaleFont = (baseSize: number) => Math.round(baseSize * (panelW / 600));

        if (isFront) {
          const drawLeftText = (text: string, x: number, y: number, font: string, color: string, size: number, opts?: { bold?: boolean; uppercase?: boolean }) => {
            ctx.save();
            ctx.fillStyle = color;
            const weight = opts?.bold ? 'bold ' : '';
            ctx.font = `${weight}${size}px ${font.replace(/'/g, '"')}`;
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillText(opts?.uppercase ? text.toUpperCase() : text, x, y);
            ctx.restore();
          };

          const drawRightText = (text: string, x: number, y: number, font: string, color: string, size: number, opts?: { bold?: boolean; uppercase?: boolean }) => {
            ctx.save();
            ctx.fillStyle = color;
            const weight = opts?.bold ? 'bold ' : '';
            ctx.font = `${weight}${size}px ${font.replace(/'/g, '"')}`;
            ctx.textAlign = "right";
            ctx.textBaseline = "top";
            ctx.fillText(opts?.uppercase ? text.toUpperCase() : text, x, y);
            ctx.restore();
          };

          const bannerH = scaleFont(28);
          if (cd.bannerText && !hiddenEls.has("master-banner")) {
            ctx.fillStyle = cd.bannerBgColor || '#c0392b';
            ctx.fillRect(panelX + panelW * 0.18, panelY, panelW * 0.82, bannerH);
            const publisherLine = cd.publisherName ? `${cd.publisherName} ${cd.bannerText}` : cd.bannerText;
            drawCenterText(publisherLine, panelY + bannerH * 0.2, "Inter, sans-serif", '#FFFFFF', scaleFont(11), { bold: true, uppercase: true });
          }

          if (cd.showPriceBox && cd.priceText && !hiddenEls.has("master-price")) {
            const boxW = scaleFont(46);
            const boxH = scaleFont(44);
            const bx = panelX + scaleFont(6);
            const by = panelY + scaleFont(4);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(bx, by, boxW, boxH);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.strokeRect(bx, by, boxW, boxH);
            ctx.fillStyle = '#000';
            ctx.font = `bold ${scaleFont(12)}px Inter`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText(cd.priceText, bx + boxW / 2, by + scaleFont(4));
            if (cd.issueNumber && !hiddenEls.has("master-issue")) {
              ctx.font = `bold ${scaleFont(14)}px Inter`;
              ctx.fillText(cd.issueNumber.replace('#', ''), bx + boxW / 2, by + scaleFont(18));
            }
            if (cd.issueDate) {
              ctx.font = `${scaleFont(8)}px Inter`;
              ctx.fillText(cd.issueDate, bx + boxW / 2, by + scaleFont(34));
            }
          }

          const subtitleY = panelY + bannerH + scaleFont(20);
          if (cd.subtitle && !hiddenEls.has("master-subtitle")) {
            drawCenterText(cd.subtitle, subtitleY, cd.subtitleFont, cd.subtitleColor, scaleFont(cd.subtitleSize), { bold: true, uppercase: true });
          }

          const titleY = subtitleY + scaleFont(cd.subtitleSize + 6);
          if (!hiddenEls.has("master-title")) {
            drawCenterText(cd.title || "TITLE", titleY, cd.titleFont, cd.titleColor, scaleFont(cd.titleSize), { bold: true, uppercase: true, stroke: cd.titleStrokeColor, strokeW: cd.titleStrokeWidth });
          }

          if (cd.tagline && !hiddenEls.has("master-tagline")) {
            drawCenterText(cd.tagline, panelY + panelH - scaleFont(50), "Inter, sans-serif", cd.subtitleColor, scaleFont(11), { uppercase: true });
          }
          if (!hiddenEls.has("master-author")) {
            drawCenterText(cd.author || "Author", panelY + panelH - scaleFont(30), cd.authorFont, cd.authorColor, scaleFont(cd.authorSize));
          }
          if (false && cd.showPriceBox && cd.priceText && !hiddenEls.has("master-price") && ctx) {
            const boxS = scaleFont(36);
            const bx = panelX + panelW - boxS - scaleFont(10);
            const by = panelY + scaleFont(10);
            const bcx = bx + boxS / 2;
            const bcy = by + boxS / 2;
            const g = ctx!;
            g.fillStyle = cd.priceBoxColor || cd.bannerBgColor || '#FFD700';
            if (cd.priceBoxShape === 'circle') {
              g.beginPath();
              g.arc(bcx, bcy, boxS / 2, 0, Math.PI * 2);
              g.fill();
              g.strokeStyle = '#000';
              g.lineWidth = 1;
              g.stroke();
            } else if (cd.priceBoxShape === 'diamond') {
              g.save();
              g.translate(bcx, bcy);
              g.rotate(Math.PI / 4);
              g.fillRect(-boxS / 2, -boxS / 2, boxS, boxS);
              g.strokeStyle = '#000';
              g.lineWidth = 1;
              g.strokeRect(-boxS / 2, -boxS / 2, boxS, boxS);
              g.restore();
            } else {
              g.fillRect(bx, by, boxS, boxS);
              g.strokeStyle = '#000';
              g.lineWidth = 1;
              g.strokeRect(bx, by, boxS, boxS);
            }
            g.fillStyle = cd.priceBoxTextColor || '#000';
            g.font = `bold ${scaleFont(14)}px Inter`;
            g.textAlign = "center";
            g.textBaseline = "middle";
            g.fillText(cd.priceText, bcx, bcy);
          }
        } else {
          if (!hiddenEls.has("master-back-title")) {
            drawCenterText(cd.title || "TITLE", panelY + panelH * 0.08, cd.titleFont, cd.titleColor, scaleFont(Math.max(cd.titleSize * 0.6, 20)), { bold: true, uppercase: true });
          }
          if (cd.backBlurb && !hiddenEls.has("master-blurb")) {
            ctx.save();
            ctx.fillStyle = cd.backBlurbColor || cd.authorColor;
            ctx.font = `${scaleFont(cd.backBlurbSize)}px ${(cd.backBlurbFont || "Georgia").replace(/'/g, '"')}`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            const words = cd.backBlurb.split(' ');
            let line = '';
            let y = panelY + panelH * 0.18;
            const maxW = panelW * 0.75;
            for (const word of words) {
              const testLine = line + word + ' ';
              if (ctx.measureText(testLine).width > maxW && line) {
                ctx.fillText(line.trim(), panelX + panelW / 2, y);
                line = word + ' ';
                y += scaleFont(cd.backBlurbSize + 6);
              } else {
                line = testLine;
              }
            }
            if (line) ctx.fillText(line.trim(), panelX + panelW / 2, y);
            ctx.restore();
          }
          if (!hiddenEls.has("master-back-author")) {
            drawCenterText(`by ${cd.author || "Author"}`, panelY + panelH * 0.55, cd.authorFont, cd.authorColor, scaleFont(cd.authorSize));
          }
          if (cd.publisherName && !hiddenEls.has("master-back-publisher")) {
            drawCenterText(cd.publisherName, panelY + panelH * 0.62, "Inter, sans-serif", cd.subtitleColor, scaleFont(12), { bold: true, uppercase: true });
          }
          if (cd.isbn && !hiddenEls.has("master-isbn")) {
            if (cd.showBarcode !== false) {
              const barcodeW = scaleFont(80);
              const barcodeH = scaleFont(40);
              const barcodeX = panelX + (panelW - barcodeW) / 2;
              const barcodeY = panelY + panelH - scaleFont(55);
              ctx.fillStyle = '#fff';
              ctx.fillRect(barcodeX, barcodeY, barcodeW, barcodeH);
              ctx.strokeStyle = '#000';
              ctx.lineWidth = 0.5;
              ctx.strokeRect(barcodeX, barcodeY, barcodeW, barcodeH);
              const digits = cd.isbn.replace(/[^0-9]/g, '');
              const barCount = Math.max(digits.length, 13);
              const barW = (barcodeW - scaleFont(8)) / barCount;
              for (let i = 0; i < barCount; i++) {
                const d = parseInt(digits[i] || '5', 10);
                const h = barcodeH * (0.4 + (d / 10) * 0.4);
                ctx.fillStyle = '#000';
                ctx.fillRect(barcodeX + scaleFont(4) + i * barW, barcodeY + scaleFont(2), Math.max(barW * 0.6, 0.5), h);
              }
              ctx.fillStyle = '#000';
              ctx.font = `${scaleFont(7)}px monospace`;
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              ctx.fillText(`ISBN ${cd.isbn}`, panelX + panelW / 2, barcodeY + barcodeH + scaleFont(2));
            } else {
              drawCenterText(`ISBN ${cd.isbn}`, panelY + panelH - scaleFont(30), "monospace", cd.authorColor, scaleFont(10));
            }
          }
        }

        const coverElZOrder = cd.elementZOrder || [];
        const textLayers = isFront ? (cd.frontLayers || []) : (cd.backLayers || []);
        const imageLayers = isFront ? (cd.frontImageLayers || []) : (cd.backImageLayers || []);
        const allUserLayers = [...textLayers.map(l => ({ ...l, _kind: "text" as const })), ...imageLayers.map(l => ({ ...l, _kind: "image" as const }))];
        allUserLayers.sort((a, b) => {
          const ai = coverElZOrder.indexOf(a.id);
          const bi = coverElZOrder.indexOf(b.id);
          return (ai >= 0 ? ai : 999) - (bi >= 0 ? bi : 999);
        });
        for (const layer of allUserLayers) {
          if (hiddenEls.has(layer.id)) continue;
          const t = (layer as any).transform || { x: 0, y: 0, width: 200, height: 50, rotation: 0, scaleX: 1, scaleY: 1 };
          const lx = panelX + (t.x / 600) * panelW;
          const ly = panelY + (t.y / 900) * panelH;
          const lw = (t.width / 600) * panelW;
          const lh = (t.height / 900) * panelH;
          ctx.save();
          ctx.translate(lx + lw / 2, ly + lh / 2);
          ctx.rotate(((t.rotation || 0) * Math.PI) / 180);
          ctx.scale(t.scaleX || 1, t.scaleY || 1);
          ctx.translate(-lw / 2, -lh / 2);
          if (layer._kind === "image" && (layer as any).src) {
            try {
              const lImg = await loadImage((layer as any).src);
              drawImageCover(ctx, lImg, 0, 0, lw, lh);
            } catch {}
          } else if (layer._kind === "text") {
            const tl = layer as any;
            ctx.fillStyle = tl.color || "#ffffff";
            const weight = tl.bold ? "bold " : "";
            const italic = tl.italic ? "italic " : "";
            const fontSize = Math.round((tl.fontSize || 24) * (panelW / 600));
            ctx.font = `${italic}${weight}${fontSize}px ${(tl.fontFamily || "Inter").replace(/'/g, '"')}`;
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            const displayText = tl.uppercase ? (tl.text || "").toUpperCase() : (tl.text || "");
            if (tl.strokeColor && tl.strokeWidth) {
              ctx.strokeStyle = tl.strokeColor;
              ctx.lineWidth = tl.strokeWidth;
              ctx.strokeText(displayText, 0, 0);
            }
            ctx.fillText(displayText, 0, 0);
          }
          ctx.restore();
        }
      }

      for (const content of panel.contents.filter(c => !c.hidden).sort((a, b) => a.zIndex - b.zIndex)) {
        const { transform, data, type } = content;
        const contentX = panelX + (transform.x / editorPanelW) * panelW;
        const contentY = panelY + (transform.y / editorPanelH) * panelH;
        const contentW = (transform.width / editorPanelW) * panelW;
        const contentH = (transform.height / editorPanelH) * panelH;

        ctx.save();
        ctx.translate(contentX + contentW / 2, contentY + contentH / 2);
        ctx.rotate((transform.rotation * Math.PI) / 180);
        ctx.scale(transform.scaleX || 1, transform.scaleY || 1);
        ctx.translate(-contentW / 2, -contentH / 2);

        if ((type === "image" || type === "gif") && data.url) {
          try {
            const img = await loadImage(data.url);
            drawImageCover(ctx, img, 0, 0, contentW, contentH);
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
          const fontScale = Math.min(panelW / editorPanelW, panelH / editorPanelH);
          const scaledFontSize = (data.fontSize || 16) * fontScale;
          const fontName = (data.fontFamily || "Inter").replace(/'/g, '"');
          ctx.font = `${scaledFontSize}px ${fontName}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(data.text, contentW / 2, contentH / 2);
        } else if (type === "video") {
          ctx.fillStyle = "#1a1a2e";
          ctx.fillRect(0, 0, contentW, contentH);
          ctx.fillStyle = "#ffffff";
          const fontScale = Math.min(panelW / editorPanelW, panelH / editorPanelH);
          ctx.font = `${Math.round(14 * fontScale)}px Inter`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("[Video Frame]", contentW / 2, contentH / 2);
        }

        ctx.restore();
      }

      ctx.restore();

      ctx.save();
      ctx.strokeStyle = panel.borderColor || "#000000";
      ctx.lineWidth = panel.borderWidth || 3;
      if (panel.type === "circle") {
        ctx.beginPath();
        ctx.ellipse(panelX + panelW / 2, panelY + panelH / 2, panelW / 2, panelH / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.strokeRect(panelX, panelY, panelW, panelH);
      }
      ctx.restore();
    }

    if (narration?.text) {
      const styleMap: Record<string, { bg: string; color: string; border: string; ff: string }> = {
        caption: { bg: narration.bgColor || "#1a1a1a", color: narration.color || "#f5deb3", border: "#8b7355", ff: narration.fontFamily || "Georgia, serif" },
        thought: { bg: narration.bgColor || "#0a0a2e", color: narration.color || "#a8c8ff", border: "#4a6fa5", ff: narration.fontFamily || "'Space Grotesk', sans-serif" },
        editorial: { bg: narration.bgColor || "#2a0a0a", color: narration.color || "#ff9999", border: "#8b3a3a", ff: narration.fontFamily || "'JetBrains Mono', monospace" },
      };
      const ns = styleMap[narration.style] || styleMap.caption;
      const fontSize = Math.round((narration.fontSize || 14) * (pageWidth / 650));
      const pad = Math.round(pageWidth * 0.015);
      const margin = Math.round(pageWidth * 0.02);
      const borderW = Math.round(pageWidth * 0.005);
      const boxW = pageWidth - margin * 2;

      ctx.save();
      ctx.font = `${fontSize}px ${ns.ff.replace(/'/g, '"')}`;
      const words = narration.text.split(' ');
      const lines: string[] = [];
      let line = '';
      for (const word of words) {
        const test = line + word + ' ';
        if (ctx.measureText(test).width > boxW - pad * 2 - borderW && line) {
          lines.push(line.trim());
          line = word + ' ';
        } else {
          line = test;
        }
      }
      if (line) lines.push(line.trim());
      const lineH = fontSize * 1.5;
      const editorialExtra = narration.style === "editorial" ? fontSize * 0.9 : 0;
      const boxH = lines.length * lineH + pad * 2 + editorialExtra;
      const boxX = margin;
      const boxY = narration.position === "top" ? margin : pageHeight - boxH - margin;

      ctx.globalAlpha = 0.95;
      ctx.fillStyle = ns.bg;
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.fillStyle = ns.border;
      ctx.fillRect(boxX, boxY, borderW, boxH);
      ctx.globalAlpha = 1;

      ctx.fillStyle = ns.color;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      let textY = boxY + pad;
      if (narration.style === "editorial") {
        ctx.font = `${Math.round(fontSize * 0.65)}px ${ns.ff.replace(/'/g, '"')}`;
        ctx.globalAlpha = 0.6;
        ctx.fillText("EDITOR'S NOTE", boxX + borderW + pad, textY);
        ctx.globalAlpha = 1;
        textY += fontSize * 0.9;
        ctx.font = `${fontSize}px ${ns.ff.replace(/'/g, '"')}`;
      }
      for (const l of lines) {
        ctx.fillText(l, boxX + borderW + pad, textY);
        textY += lineH;
      }
      ctx.restore();
    }

    return canvas;
  };

  const handleExportCurrentPagePNG = async () => {
    if (!hasFeature("export") && !isAdmin) {
      showUpgrade("Export");
      return;
    }
    try {
      const trackRes = await fetch("/api/usage/track-export", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include" });
      if (!trackRes.ok) {
        const err = await trackRes.json();
        if (err.code === "EXPORT_LIMIT_REACHED") {
          toast.error(err.message);
          showUpgrade("Export", { used: err.used || 0, limit: err.limit || 0 });
          return;
        }
      }
    } catch {}
    try {
      toast.info("Exporting print-ready page (300 DPI)...");
      const panels = selectedPage === "left" ? currentSpread.leftPage : currentSpread.rightPage;
      const narr = selectedPage === "left" ? currentSpread.leftNarration : currentSpread.rightNarration;
      const canvas = await exportPageToCanvas(panels, 1988, 3075, narr);
      
      const link = document.createElement("a");
      link.download = `${title.replace(/\s+/g, "_")}_page_${currentSpreadIndex * 2 + (selectedPage === "left" ? 1 : 2)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      toast.success(`Page exported at ${canvas.width}x${canvas.height}px (print-ready 300 DPI)`);
      if (tier === "free" || tier === "creator") {
        setShowWatermarkBanner(true);
      }
      fireXpAction("export");
      showWhatsNext();
    } catch (error) {
      toast.error("Failed to export page");
    }
  };

  const handleExportAllPagesPNG = async () => {
    if (!hasFeature("export") && !isAdmin) {
      const shown = showDiscovery("batch_export");
      if (!shown) {
        showUpgrade("Batch Export");
      }
      return;
    }
    try {
      const trackRes = await fetch("/api/usage/track-export", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include" });
      if (!trackRes.ok) {
        const err = await trackRes.json();
        if (err.code === "EXPORT_LIMIT_REACHED") {
          toast.error(err.message);
          showUpgrade("Export", { used: err.used || 0, limit: err.limit || 0 });
          return;
        }
      }
    } catch {}
    try {
      toast.info("Exporting full comic (cover + all pages)...");
      let pageNum = 0;

      if (effectiveFrontCover) {
        pageNum++;
        const coverLink = document.createElement("a");
        coverLink.download = `${title.replace(/\s+/g, "_")}_00_cover.png`;
        coverLink.href = effectiveFrontCover;
        coverLink.click();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      for (let i = 0; i < spreads.length; i++) {
        const spread = spreads[i];
        
        if (spread.leftPage.length > 0) {
          pageNum++;
          const leftCanvas = await exportPageToCanvas(spread.leftPage, 1988, 3075, spread.leftNarration);
          const leftLink = document.createElement("a");
          leftLink.download = `${title.replace(/\s+/g, "_")}_page_${String(pageNum).padStart(2, "0")}.png`;
          leftLink.href = leftCanvas.toDataURL("image/png");
          leftLink.click();
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        if (spread.rightPage.length > 0) {
          pageNum++;
          const rightCanvas = await exportPageToCanvas(spread.rightPage, 1988, 3075, spread.rightNarration);
          const rightLink = document.createElement("a");
          rightLink.download = `${title.replace(/\s+/g, "_")}_page_${String(pageNum).padStart(2, "0")}.png`;
          rightLink.href = rightCanvas.toDataURL("image/png");
          rightLink.click();
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (effectiveBackCover) {
        const backLink = document.createElement("a");
        backLink.download = `${title.replace(/\s+/g, "_")}_${String(pageNum + 1).padStart(2, "0")}_back_cover.png`;
        backLink.href = effectiveBackCover;
        backLink.click();
      }
      
      toast.success(`Full comic exported! ${pageNum} pages at print-ready 300 DPI`);
      fireXpAction("export");
      showWhatsNext();
    } catch (error) {
      toast.error("Failed to export pages");
    }
  };

  const handleCompileComic = async () => {
    if (!effectiveProjectId) {
      toast.error("Save your project first before compiling");
      return;
    }
    setIsCompiling(true);
    setCompileResult(null);
    const messages: string[] = [];
    let hasWarning = false;

    try {
      toast.info("Compiling comic — rendering covers and validating pages...");

      let compiledFrontCover = "";
      let compiledBackCover = "";
      let hasFrontPanel = false;
      let hasBackPanel = false;

      for (const spread of spreads) {
        for (const panels of [spread.leftPage, spread.rightPage]) {
          for (const panel of panels) {
            if (panel.coverRole === "front-cover") {
              hasFrontPanel = true;
              try {
                const coverCanvas = await exportPageToCanvas([panel], 1988, 3075);
                compiledFrontCover = coverCanvas.toDataURL("image/png");
                messages.push("Front cover rendered from panel design");
              } catch {
                messages.push("Warning: Failed to render front cover panel");
                hasWarning = true;
              }
            }
            if (panel.coverRole === "back-cover") {
              hasBackPanel = true;
              try {
                const coverCanvas = await exportPageToCanvas([panel], 1988, 3075);
                compiledBackCover = coverCanvas.toDataURL("image/png");
                messages.push("Back cover rendered from panel design");
              } catch {
                messages.push("Warning: Failed to render back cover panel");
                hasWarning = true;
              }
            }
          }
        }
      }

      if (!hasFrontPanel && coverDesignData) {
        try {
          const cd = { ...defaultCover, ...coverDesignData };
          const coverPanel: Panel = {
            id: "compile-front-cover",
            x: 0, y: 0, width: 100, height: 100,
            backgroundColor: cd.frontBgColor || "#000",
            shape: "rectangle" as const,
            contents: [],
            zIndex: 0,
            rotation: 0,
            coverRole: "front-cover",
          };
          const coverCanvas = await exportPageToCanvas([coverPanel], 1988, 3075);
          compiledFrontCover = coverCanvas.toDataURL("image/png");
          messages.push("Front cover rendered from cover design data");
        } catch {
          messages.push("Warning: Could not generate front cover from design data");
          hasWarning = true;
        }
      }

      if (!hasBackPanel && coverDesignData) {
        try {
          const cd = { ...defaultCover, ...coverDesignData };
          const coverPanel: Panel = {
            id: "compile-back-cover",
            x: 0, y: 0, width: 100, height: 100,
            backgroundColor: cd.backBgColor || "#000",
            shape: "rectangle" as const,
            contents: [],
            zIndex: 0,
            rotation: 0,
            coverRole: "back-cover",
          };
          const coverCanvas = await exportPageToCanvas([coverPanel], 1988, 3075);
          compiledBackCover = coverCanvas.toDataURL("image/png");
          messages.push("Back cover rendered from cover design data");
        } catch {
          messages.push("Warning: Could not generate back cover from design data");
          hasWarning = true;
        }
      }

      if (!compiledFrontCover) {
        messages.push("Warning: No front cover — add one via Cover Editor or set a panel as Front Cover");
        hasWarning = true;
      }
      if (!compiledBackCover) {
        messages.push("Warning: No back cover — add one via Cover Editor or set a panel as Back Cover");
        hasWarning = true;
      }

      let totalPages = 0;
      let emptyPages = 0;
      for (const spread of spreads) {
        if (spread.leftPage.length > 0) totalPages++;
        else emptyPages++;
        if (spread.rightPage.length > 0) totalPages++;
        else emptyPages++;
      }
      messages.push(`${totalPages} interior page${totalPages !== 1 ? "s" : ""} found`);
      if (emptyPages > 0) {
        messages.push(`Warning: ${emptyPages} empty page${emptyPages !== 1 ? "s" : ""} detected`);
        hasWarning = true;
      }

      const updatedMeta = { ...comicMeta };
      if (compiledFrontCover) updatedMeta.frontCover = compiledFrontCover;
      if (compiledBackCover) updatedMeta.backCover = compiledBackCover;
      setComicMeta(updatedMeta);

      try {
        const saveRes = await fetch(`/api/projects/${effectiveProjectId}/autosave`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            data: {
              spreads,
              title,
              coverDesign: coverDesignData,
              comicMeta: updatedMeta,
            },
            thumbnail: compiledFrontCover || undefined,
          }),
        });
        if (saveRes.ok) {
          messages.push("Project saved with compiled covers");
        } else if (saveRes.status === 404) {
          messages.push("Warning: Project not found on server — covers rendered locally only");
          hasWarning = true;
        } else if (saveRes.status === 401 || saveRes.status === 403) {
          messages.push("Warning: Session expired — covers rendered but not saved");
          hasWarning = true;
        } else {
          messages.push("Warning: Save returned an error — covers may not be persisted");
          hasWarning = true;
        }
      } catch {
        messages.push("Warning: Auto-save failed — covers rendered but not persisted");
        hasWarning = true;
      }

      if (compiledFrontCover) {
        try {
          await fetch(`/api/projects/${effectiveProjectId}/generate-thumbnail`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ thumbnail: compiledFrontCover }),
          });
        } catch {}
      }

      setCompileResult({ status: hasWarning ? "warning" : "success", messages });
      if (hasWarning) {
        toast.warning("Comic compiled with warnings — check the status panel");
      } else {
        toast.success("Comic compiled successfully — ready for export or submission!");
      }

      qc.invalidateQueries({ queryKey: ["project", effectiveProjectId] });
    } catch (error) {
      toast.error("Compilation failed — see console for details");
      setCompileResult({ status: "warning", messages: [...messages, "Fatal: Compilation encountered an unexpected error"] });
    } finally {
      setIsCompiling(false);
    }
  };

  const handleExportFullPDF = async () => {
    if (!hasFeature("export") && !isAdmin) {
      const shown = showDiscovery("batch_export");
      if (!shown) {
        showUpgrade("Batch Export");
      }
      return;
    }
    try {
      const trackRes = await fetch("/api/usage/track-export", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include" });
      if (!trackRes.ok) {
        const err = await trackRes.json();
        if (err.code === "EXPORT_LIMIT_REACHED") {
          toast.error(err.message);
          showUpgrade("Export", { used: err.used || 0, limit: err.limit || 0 });
          return;
        }
      }
    } catch {}
    try {
      toast.info("Building print-ready PDF (this may take a moment)...");
      const { default: jsPDF } = await import("jspdf");

      const pageWidthIn = 6.625;
      const pageHeightIn = 10.25;
      const dpi = 300;
      const canvasW = Math.round(pageWidthIn * dpi);
      const canvasH = Math.round(pageHeightIn * dpi);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "in",
        format: [pageWidthIn, pageHeightIn],
      });

      let isFirstPage = true;

      const addImageToPDF = (dataUrl: string) => {
        if (!isFirstPage) pdf.addPage([pageWidthIn, pageHeightIn], "portrait");
        isFirstPage = false;
        pdf.addImage(dataUrl, "JPEG", 0, 0, pageWidthIn, pageHeightIn);
      };

      const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });
      };

      const imageToCanvas = async (src: string): Promise<HTMLCanvasElement> => {
        const img = await loadImage(src);
        const canvas = document.createElement("canvas");
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx2 = canvas.getContext("2d")!;
        ctx2.fillStyle = "#ffffff";
        ctx2.fillRect(0, 0, canvasW, canvasH);
        if (!img.naturalWidth || !img.naturalHeight || !canvasW || !canvasH) {
          ctx2.drawImage(img, 0, 0, canvasW, canvasH);
        } else {
          const imgRatio = img.naturalWidth / img.naturalHeight;
          const destRatio = canvasW / canvasH;
          let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
          if (imgRatio > destRatio) {
            sw = img.naturalHeight * destRatio;
            sx = (img.naturalWidth - sw) / 2;
          } else {
            sh = img.naturalWidth / destRatio;
            sy = (img.naturalHeight - sh) / 2;
          }
          ctx2.drawImage(img, sx, sy, sw, sh, 0, 0, canvasW, canvasH);
        }
        return canvas;
      };

      if (effectiveFrontCover) {
        try {
          const coverCanvas = await imageToCanvas(effectiveFrontCover);
          addImageToPDF(coverCanvas.toDataURL("image/jpeg", 0.92));
          toast.info("Front cover added...");
        } catch (e) {
          console.error("Failed to add cover to PDF:", e);
          toast.error("Cover image could not be loaded. Try re-saving it from Cover Creator.");
        }
      }

      for (let i = 0; i < spreads.length; i++) {
        const spread = spreads[i];
        if (spread.leftPage.length > 0) {
          const canvas = await exportPageToCanvas(spread.leftPage, canvasW, canvasH, spread.leftNarration);
          addImageToPDF(canvas.toDataURL("image/jpeg", 0.92));
        }
        if (spread.rightPage.length > 0) {
          const canvas = await exportPageToCanvas(spread.rightPage, canvasW, canvasH, spread.rightNarration);
          addImageToPDF(canvas.toDataURL("image/jpeg", 0.92));
        }
        if (spreads.length > 3) {
          toast.info(`Processing spread ${i + 1} of ${spreads.length}...`);
        }
      }

      if (effectiveBackCover) {
        try {
          const backCanvas = await imageToCanvas(effectiveBackCover);
          addImageToPDF(backCanvas.toDataURL("image/jpeg", 0.92));
        } catch (e) {
          console.error("Failed to add back cover to PDF:", e);
          toast.error("Back cover image could not be loaded. Try re-saving it from Cover Creator.");
        }
      }

      pdf.save(`${title.replace(/\s+/g, "_")}_print_ready.pdf`);

      const totalPages = (effectiveFrontCover ? 1 : 0)
        + spreads.reduce((n, s) => n + (s.leftPage.length > 0 ? 1 : 0) + (s.rightPage.length > 0 ? 1 : 0), 0)
        + (effectiveBackCover ? 1 : 0);
      toast.success(`PDF exported! ${totalPages} pages at ${pageWidthIn}"×${pageHeightIn}" (300 DPI print-ready)`);
      fireXpAction("export");
      showWhatsNext();
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export PDF");
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
      fireXpAction("export");
      showWhatsNext();
    } catch (error) {
      toast.error("Failed to export project data");
    }
  };

  const addSpread = () => {
    setSpreads([...spreads, { id: `spread_${Date.now()}`, leftPage: [], rightPage: [] }]);
    setCurrentSpreadIndex(spreads.length);
  };

  const handleDeleteCurrentSpread = useCallback(() => {
    if (spreads.length <= 1) { toast.error("Cannot delete the only spread"); return; }
    const idx = currentSpreadIndex;
    const newLen = spreads.length - 1;
    setSpreads(prev => prev.filter((_, i) => i !== idx));
    setCurrentSpreadIndex(Math.min(idx, newLen - 1));
    toast.success(`Deleted spread ${idx + 1}`);
  }, [spreads, currentSpreadIndex, setSpreads]);

  const toggleLastPage = useCallback((spreadIndex: number) => {
    setSpreads(prev => {
      const wasLastPage = prev[spreadIndex]?.isLastPage;
      const updated = prev.map((s, i) => ({
        ...s,
        isLastPage: i === spreadIndex ? !wasLastPage : false,
      }));

      if (!wasLastPage) {
        const hasExplicitBackCover = updated.some(s =>
          s.leftPage.some(p => p.coverRole === "back-cover") ||
          s.rightPage.some(p => p.coverRole === "back-cover")
        );
        if (!hasExplicitBackCover) {
          const backCoverPanel: Panel = {
            id: `auto-back-cover-${Date.now()}`,
            x: 0, y: 0, width: 100, height: 100,
            backgroundColor: "#111111",
            shape: "rectangle" as const,
            contents: [],
            zIndex: 0,
            rotation: 0,
            coverRole: "back-cover",
          };
          const targetSpread = updated[spreadIndex];
          if (targetSpread.rightPage.length === 0) {
            updated[spreadIndex] = { ...targetSpread, rightPage: [backCoverPanel] };
          } else {
            const newSpread = {
              id: `spread_bc_${Date.now()}`,
              leftPage: [backCoverPanel],
              rightPage: [] as Panel[],
              isLastPage: false,
            };
            updated.splice(spreadIndex + 1, 0, newSpread);
          }
          toast.success("Back cover auto-added after last page");
        }
      } else {
        for (let i = 0; i < updated.length; i++) {
          const cleaned = {
            ...updated[i],
            leftPage: updated[i].leftPage.filter(p => !p.id.startsWith("auto-back-cover-")),
            rightPage: updated[i].rightPage.filter(p => !p.id.startsWith("auto-back-cover-")),
          };
          if (cleaned.leftPage.length === 0 && cleaned.rightPage.length === 0 && i !== spreadIndex) {
            updated.splice(i, 1);
            i--;
          } else {
            updated[i] = cleaned;
          }
        }
        toast.info("Last page unmarked — auto back cover removed");
      }

      return updated;
    });
  }, [setSpreads]);

  const lastPageIndex = useMemo(() => spreads.findIndex(s => s.isLastPage), [spreads]);

  const getPageRef = (page: "left" | "right") => page === "left" ? leftPageRef : rightPageRef;

  const getPanelPixelSize = (page: "left" | "right", panelId: string): { w: number; h: number } => {
    const panels = page === "left" ? currentSpread.leftPage : currentSpread.rightPage;
    const panel = panels.find(p => p.id === panelId);
    const pageEl = (page === "left" ? leftPageRef : rightPageRef)?.current;
    if (panel && pageEl) {
      return {
        w: (panel.width / 100) * pageEl.clientWidth,
        h: (panel.height / 100) * pageEl.clientHeight,
      };
    }
    return { w: 400, h: 300 };
  };

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
      // Polygon mode: click adds a vertex; double-click closes (handled below).
      if (panelShape === "polygon") {
        if (polygonPage && polygonPage !== page) {
          // switched pages mid-polygon → reset to avoid mixed-page polygons
          setPolygonPoints([]);
        }
        setPolygonPage(page);
        setPolygonPoints(prev => [...prev, coords]);
        setSelectedPanelId(null);
        setSelectedContentId(null);
        return;
      }
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
    } else if (activeTool === "panel" && panelShape === "polygon" && polygonPoints.length > 0) {
      setPolygonHover(getCoords(e, pageRef));
    }
  };

  const finalizePolygon = useCallback((page: "left" | "right") => {
    if (polygonPoints.length < 3) {
      setPolygonPoints([]);
      setPolygonHover(null);
      setPolygonPage(null);
      return;
    }
    // Compute bounding box in page-percent space.
    const minX = Math.min(...polygonPoints.map(p => p.x));
    const minY = Math.min(...polygonPoints.map(p => p.y));
    const maxX = Math.max(...polygonPoints.map(p => p.x));
    const maxY = Math.max(...polygonPoints.map(p => p.y));
    const width = maxX - minX;
    const height = maxY - minY;
    if (width < 3 || height < 3) {
      setPolygonPoints([]); setPolygonHover(null); setPolygonPage(null);
      return;
    }
    // Re-express each vertex as % within the panel's own bounds (0..100).
    const localPoints = polygonPoints.map(p => ({
      x: ((p.x - minX) / width) * 100,
      y: ((p.y - minY) / height) * 100,
    }));
    addPanel(page, { x: minX, y: minY, width, height, type: "polygon", points: localPoints });
    setPolygonPoints([]); setPolygonHover(null); setPolygonPage(null);
    // addPanel is intentionally omitted — it captures spread state via setSpreads
    // updater fns and re-creating it each render does not change behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polygonPoints]);

  // Cancel polygon with Escape; close with Enter.
  useEffect(() => {
    if (activeTool !== "panel" || panelShape !== "polygon") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPolygonPoints([]); setPolygonHover(null); setPolygonPage(null);
      } else if (e.key === "Enter" && polygonPage) {
        finalizePolygon(polygonPage);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeTool, panelShape, polygonPage, finalizePolygon]);

  const handlePageMouseUp = (page: "left" | "right") => {
    if (isDrawingPanel) {
      let x = Math.min(drawStart.x, drawCurrent.x);
      let y = Math.min(drawStart.y, drawCurrent.y);
      let width = Math.abs(drawCurrent.x - drawStart.x);
      let height = Math.abs(drawCurrent.y - drawStart.y);

      if (width > 5 && height > 5) {
        // Circles must be ACTUAL circles in pixel space — pages are 1:1.4
        // aspect, so width% and height% are not equivalent on screen. Snap
        // to the smaller pixel diameter and re-center inside the drawn box.
        if (panelShape === "circle") {
          const pageEl = getPageRef(page).current;
          if (pageEl) {
            const r = pageEl.getBoundingClientRect();
            const pxW = (width / 100) * r.width;
            const pxH = (height / 100) * r.height;
            const diameterPx = Math.min(pxW, pxH);
            const newWidthPct = (diameterPx / r.width) * 100;
            const newHeightPct = (diameterPx / r.height) * 100;
            x = x + (width - newWidthPct) / 2;
            y = y + (height - newHeightPct) / 2;
            width = newWidthPct;
            height = newHeightPct;
          }
        }
        addPanel(page, { x, y, width, height, type: panelShape === "circle" ? "circle" : "rectangle" });
      }
      setIsDrawingPanel(false);
    }
  };

  const addPanel = (page: "left" | "right", panelData: { x: number; y: number; width: number; height: number; type: "rectangle" | "circle" | "polygon"; points?: { x: number; y: number }[] }) => {
    const newPanel: Panel = {
      id: `panel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...panelData,
      rotation: 0,
      contents: [],
      zIndex: page === "left" ? currentSpread.leftPage.length : currentSpread.rightPage.length,
      locked: autoLockPanels,
      borderWidth: 3,
      borderColor: "#000000",
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

  const [renamingLayerId, setRenamingLayerId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const reorderPanels = (page: "left" | "right", fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    setSpreads(prev => prev.map((spread, i) => {
      if (i !== currentSpreadIndex) return spread;
      const key = page === "left" ? "leftPage" : "rightPage";
      const panels = [...spread[key]].map(p => ({ ...p }));
      const [moved] = panels.splice(fromIdx, 1);
      panels.splice(toIdx, 0, moved);
      panels.forEach((p, pi) => { p.zIndex = pi; });
      return { ...spread, [key]: panels };
    }));
  };

  const reorderContents = (page: "left" | "right", panelId: string, fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    setSpreads(prev => prev.map((spread, i) => {
      if (i !== currentSpreadIndex) return spread;
      const key = page === "left" ? "leftPage" : "rightPage";
      return {
        ...spread,
        [key]: spread[key].map(p => {
          if (p.id !== panelId) return p;
          const contents = [...p.contents].map(c => ({ ...c }));
          const [moved] = contents.splice(fromIdx, 1);
          contents.splice(toIdx, 0, moved);
          contents.forEach((c, ci) => { c.zIndex = ci; });
          return { ...p, contents };
        })
      };
    }));
  };

  const togglePanelVisibility = (page: "left" | "right", panelId: string) => {
    setSpreads(prev => prev.map((spread, i) => {
      if (i !== currentSpreadIndex) return spread;
      const key = page === "left" ? "leftPage" : "rightPage";
      return {
        ...spread,
        [key]: spread[key].map(p => 
          p.id === panelId ? { ...p, hidden: !p.hidden } : p
        )
      };
    }));
  };

  const toggleContentVisibility = (page: "left" | "right", panelId: string, contentId: string) => {
    setSpreads(prev => prev.map((spread, i) => {
      if (i !== currentSpreadIndex) return spread;
      const key = page === "left" ? "leftPage" : "rightPage";
      return {
        ...spread,
        [key]: spread[key].map(p => {
          if (p.id !== panelId) return p;
          return { ...p, contents: p.contents.map(c => c.id === contentId ? { ...c, hidden: !c.hidden } : c) };
        })
      };
    }));
  };

  const renamePanel = (page: "left" | "right", panelId: string, newName: string) => {
    setSpreads(prev => prev.map((spread, i) => {
      if (i !== currentSpreadIndex) return spread;
      const key = page === "left" ? "leftPage" : "rightPage";
      return {
        ...spread,
        [key]: spread[key].map(p => 
          p.id === panelId ? { ...p, name: newName } : p
        )
      };
    }));
  };

  const renameContent = (page: "left" | "right", panelId: string, contentId: string, newName: string) => {
    setSpreads(prev => prev.map((spread, i) => {
      if (i !== currentSpreadIndex) return spread;
      const key = page === "left" ? "leftPage" : "rightPage";
      return {
        ...spread,
        [key]: spread[key].map(p => {
          if (p.id !== panelId) return p;
          return { ...p, contents: p.contents.map(c => c.id === contentId ? { ...c, name: newName } : c) };
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
    
    if ((activeTool === "draw" || activeTool === "erase") && inlineDrawingPanelId !== panelId) {
      startInlineDrawing(page, panelId);
    }
  };

  const handlePanelDoubleClick = (e: React.MouseEvent, panelId: string, page: "left" | "right") => {
    e.stopPropagation();
    setSelectedPage(page);
    setSelectedPanelId(panelId);
    
    const target = e.target as HTMLElement;
    const contentTools = ["text", "bubble", "draw", "erase"];
    
    if (!contentTools.includes(activeTool)) {
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

      const panels = page === "left" ? currentSpread.leftPage : currentSpread.rightPage;
      const panel = panels.find(p => p.id === panelId);
      if (panel && panel.contents.length > 0) {
        const topContent = panel.contents.reduce((top, c) => c.zIndex > top.zIndex ? c : top, panel.contents[0]);
        setSelectedContentId(topContent.id);
        setActiveTool("select");
        return;
      }
    }
    
    if (activeTool === "text") {
      addTextToPanel(page, panelId);
    } else if (activeTool === "bubble") {
      addBubbleToPanel(page, panelId);
    } else if (activeTool === "draw" || activeTool === "erase") {
      startInlineDrawing(page, panelId);
    } else {
      fileInputRef.current?.click();
    }
  };
  
  const handlePageDoubleClick = (e: React.MouseEvent, page: "left" | "right") => {
    // Polygon mode: double-click closes the in-progress polygon panel.
    if (activeTool === "panel" && panelShape === "polygon" && polygonPage === page && polygonPoints.length >= 3) {
      finalizePolygon(page);
      return;
    }
    // Only trigger if not clicking on a panel (clicking on empty page area)
    if ((e.target as HTMLElement).closest('[data-testid^="panel-"]')) return;
    // Switch to panel tool on double-click on empty page
    setActiveTool("panel");
    setSelectedPage(page);
    toast.success("Panel tool selected - draw to create panels");
  };
  
  const addContentToPanel = (page: "left" | "right", panelId: string, content: Omit<PanelContent, "id" | "zIndex">, contentId?: string) => {
    const id = contentId || `content_${Date.now()}`;
    setSpreads(prev => prev.map((spread, i) => {
      if (i !== currentSpreadIndex) return spread;
      const key = page === "left" ? "leftPage" : "rightPage";
      return {
        ...spread,
        [key]: spread[key].map(panel => {
          if (panel.id !== panelId) return panel;
          const newContent: PanelContent = {
            ...content,
            id,
            zIndex: panel.contents.length,
          };
          return { ...panel, contents: [...panel.contents, newContent] };
        })
      };
    }));
    return id;
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
    const newId = addContentToPanel(page, panelId, {
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
    setEditingTextId(newId);
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

  const addTextPanelToPanel = (page: "left" | "right", panelId: string) => {
    const spread = spreads[currentSpreadIndex];
    const key = page === "left" ? "leftPage" : "rightPage";
    const panel = spread[key].find(p => p.id === panelId);
    const pw = panel ? panel.width * 4 : 380;
    const ph = panel ? panel.height * 4 : 500;
    const newId = addContentToPanel(page, panelId, {
      type: "text",
      transform: { x: 0, y: 0, width: pw, height: ph, rotation: 0, scaleX: 1, scaleY: 1 },
      data: {
        text: "Start writing your story here...",
        textPanel: true,
        fontFamily: "'Georgia', 'Times New Roman', serif",
        fontSize: 16,
        color: "#1a1a1a",
        backgroundColor: "#ffffff",
        padding: 32,
        lineHeight: 1.8,
        textAlign: "left",
        textEffect: "none",
      },
      locked: false,
    });
    setEditingTextId(newId);
    toast.success("Text page added - double-click to edit");
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


  const addSidebarAssetToPanel = (asset: { url: string; name: string }) => {
    if (!selectedPanelId) {
      toast.error("Please select a panel first");
      return;
    }
    const panels = selectedPage === "left" ? currentSpread.leftPage : currentSpread.rightPage;
    const targetPanel = panels.find(p => p.id === selectedPanelId);
    if (targetPanel?.coverRole && coverDesignData) {
      const view = targetPanel.coverRole === "front-cover" ? "front" : "back";
      const newLayer: CoverImageLayer = {
        id: `img_${Date.now()}`,
        url: asset.url,
        name: asset.name || "Asset",
        transform: { x: 50, y: 50, width: 150, height: 150, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1,
        locked: false,
      };
      const layerKey = `${view}ImageLayers` as keyof CoverData;
      const existing = (coverDesignData[layerKey] as CoverImageLayer[]) || [];
      const newOrder = [...(coverDesignData.elementZOrder || []), newLayer.id];
      updateCoverData({ [layerKey]: [...existing, newLayer], elementZOrder: newOrder });
      toast.success(`${asset.name} added to ${view} cover`);
    } else {
      const { w, h } = getPanelPixelSize(selectedPage, selectedPanelId);
      addContentToPanel(selectedPage, selectedPanelId, {
        type: "image",
        transform: { x: 0, y: 0, width: w, height: h, rotation: 0, scaleX: 1, scaleY: 1 },
        data: { url: asset.url },
        locked: false,
      });
      toast.success(`${asset.name} added`);
    }
  };

  const exportPanelToFxStudio = async (page: "left" | "right", panelId: string) => {
    const panels = page === "left" ? currentSpread.leftPage : currentSpread.rightPage;
    const panel = panels.find(p => p.id === panelId);
    if (!panel) {
      toast.error("Panel not found");
      return;
    }

    const toastId = toast.loading("Capturing panel for FX Studio...");
    try {
      const exportW = 1200;
      const exportH = 1600;
      const panelW = (panel.width / 100) * exportW;
      const panelH = (panel.height / 100) * exportH;

      const singlePanelForExport: Panel[] = [{
        ...panel,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      }];

      const canvas = await exportPageToCanvas(singlePanelForExport, Math.round(panelW), Math.round(panelH));
      const dataUrl = canvas.toDataURL("image/png");

      const spreadLabel = `Spread ${currentSpreadIndex + 1}`;
      const panelLabel = `${page === "left" ? "L" : "R"}-Panel`;

      const exportTag = panel.coverRole === "back-cover" ? "back-cover" : panel.coverRole === "front-cover" ? "cover" : "interior-page";

      const result = await fxStudioApi.pushTaggedAsset({
        name: `${title || "Untitled"} — ${spreadLabel} ${panelLabel}`,
        asset_tag: exportTag,
        preview_data_url: dataUrl,
        target_page: currentSpreadIndex,
        project_id: effectiveProjectId || undefined,
        source_mode: "/creator/comic",
        source_panel_id: panelId,
        type: "comixx-panel-export",
        metadata: {
          panel_id: panelId,
          page_side: page,
          spread_index: currentSpreadIndex,
          panel_type: panel.type,
          cover_role: panel.coverRole || null,
        },
      });

      toast.success("Panel sent to FX Studio", {
        id: toastId,
        action: {
          label: "Open FX Studio",
          onClick: () => { fxStudio.openFxStudio({ mode: "fx" }); },
        },
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to send panel to FX Studio", { id: toastId });
    }
  };

  const sendPanelToHop = async (page: "left" | "right", panelId: string) => {
    const panels = page === "left" ? currentSpread.leftPage : currentSpread.rightPage;
    const panel = panels.find(p => p.id === panelId);
    if (!panel) {
      toast.error("Panel not found");
      return;
    }

    const toastId = toast.loading("Capturing panel for HOP Builder...");
    try {
      const exportW = 1200;
      const exportH = 1600;
      const panelW = (panel.width / 100) * exportW;
      const panelH = (panel.height / 100) * exportH;

      const singlePanelForExport: Panel[] = [{
        ...panel,
        x: 0, y: 0, width: 100, height: 100,
      }];

      const canvas = await exportPageToCanvas(singlePanelForExport, Math.round(panelW), Math.round(panelH));
      const dataUrl = canvas.toDataURL("image/png");

      const spreadLabel = `Spread ${currentSpreadIndex + 1}`;
      const panelLabel = `${page === "left" ? "L" : "R"}-Panel`;

      const result = await fxStudioApi.pushTaggedAsset({
        name: `${title || "Untitled"} — ${spreadLabel} ${panelLabel}`,
        asset_tag: "hop-scene",
        preview_data_url: dataUrl,
        target_page: currentSpreadIndex,
        project_id: effectiveProjectId || undefined,
        source_mode: "/creator/comic",
        source_panel_id: panelId,
        type: "hop-asset",
        metadata: {
          panel_id: panelId,
          page_side: page,
          spread_index: currentSpreadIndex,
        },
        mode_hints: {
          hop: {
            suggestedDuration: 5,
            assetType: "image",
            transition: "fade",
          },
        },
      });

      fetch("/api/xp/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "hop_asset_sent" }),
      }).catch(() => {});

      toast.success("Panel sent — opening HOP Builder", { id: toastId });

      fxStudio.openFxStudio({
        mode: "hops",
        effectId: result?.id,
        panelId,
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to send panel to HOP Builder", { id: toastId });
    }
  };

  const convertComicToHop = async () => {
    if (spreads.length === 0) {
      toast.error("No spreads to convert");
      return;
    }

    const toastId = toast.loading(`Converting ${spreads.length} spreads to HOP scenes...`);
    try {
      let sceneOrder = 0;
      for (let si = 0; si < spreads.length; si++) {
        const spread = spreads[si];
        for (const side of ["leftPage", "rightPage"] as const) {
          const panels = spread[side];
          if (!panels || panels.length === 0) continue;

          const exportW = 1200;
          const exportH = 1600;
          const canvas = await exportPageToCanvas(panels, exportW, exportH);
          const dataUrl = canvas.toDataURL("image/png");

          await fxStudioApi.pushTaggedAsset({
            name: `${title || "Untitled"} — Page ${sceneOrder + 1}`,
            asset_tag: "hop-scene",
            preview_data_url: dataUrl,
            target_page: si,
            project_id: effectiveProjectId || undefined,
            source_mode: "/creator/comic",
            type: "hop-asset",
            metadata: {
              spread_index: si,
              page_side: side === "leftPage" ? "left" : "right",
            },
            mode_hints: {
              hop: {
                sceneOrder,
                suggestedDuration: 5,
                assetType: "image",
                transition: "fade",
                caption: `Page ${sceneOrder + 1}`,
              },
            },
          });
          sceneOrder++;
        }
      }

      fetch("/api/xp/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "hop_comic_converted" }),
      }).catch(() => {});

      toast.success(`${sceneOrder} pages sent to HOP Builder`, {
        id: toastId,
        action: {
          label: "Open HOP Builder",
          onClick: () => { fxStudio.openFxStudio({ mode: "hops" }); },
        },
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to convert comic to HOP", { id: toastId });
    }
  };

  const applyFxToPanel = (effect: FxEffect) => {
    if (!selectedPanelId) {
      toast.error("Select a panel first");
      return;
    }
    if (!effect.preview_data_url) {
      toast.error("This effect has no preview image");
      return;
    }
    addSidebarAssetToPanel({ url: effect.preview_data_url, name: effect.name });
  };

  const returnFxToPanel = (effect: FxEffect, panelId: string, pageSide: string) => {
    if (!effect.preview_data_url) {
      toast.error("This effect has no preview image");
      return;
    }
    const resolvedPanelId = effect.source_panel_id || panelId;
    const page = pageSide as "left" | "right";

    const targetSpreadIndex = effect.metadata?.spread_index ?? effect.target_page;
    if (typeof targetSpreadIndex === "number" && targetSpreadIndex !== currentSpreadIndex) {
      if (targetSpreadIndex >= 0 && targetSpreadIndex < spreads.length) {
        setCurrentSpreadIndex(targetSpreadIndex);
        toast.info(`Navigated to spread ${targetSpreadIndex + 1}`);
        setTimeout(() => {
          const targetSpread = spreads[targetSpreadIndex];
          const targetPanels = page === "left" ? targetSpread.leftPage : targetSpread.rightPage;
          const panel = targetPanels.find(p => p.id === resolvedPanelId);
          if (!panel) {
            toast.error("Target panel not found on that spread");
            return;
          }
          insertFxIntoPanel(effect, panel, page, resolvedPanelId, targetSpreadIndex);
        }, 100);
        return;
      }
    }

    const panels = page === "left" ? currentSpread.leftPage : currentSpread.rightPage;
    const panel = panels.find(p => p.id === resolvedPanelId);
    if (!panel) {
      toast.error("Target panel not found on current spread. Navigate to the correct spread first.");
      return;
    }
    insertFxIntoPanel(effect, panel, page, resolvedPanelId, currentSpreadIndex);
  };

  const insertFxIntoPanel = (effect: FxEffect, panel: Panel, page: "left" | "right", panelId: string, _spreadIdx: number) => {
    if (panel.coverRole && coverDesignData) {
      const view = panel.coverRole === "front-cover" ? "front" : "back";
      const newLayer: CoverImageLayer = {
        id: `img_${Date.now()}`,
        url: effect.preview_data_url,
        name: effect.name || "FX Return",
        transform: { x: 0, y: 0, width: 600, height: 800, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1,
        locked: false,
      };
      const layerKey = `${view}ImageLayers` as keyof CoverData;
      const existing = (coverDesignData[layerKey] as CoverImageLayer[]) || [];
      const newOrder = [...(coverDesignData.elementZOrder || []), newLayer.id];
      updateCoverData({ [layerKey]: [...existing, newLayer], elementZOrder: newOrder });
      toast.success(`FX applied to ${view} cover`);
    } else {
      const { w, h } = getPanelPixelSize(page, panelId);
      addContentToPanel(page, panelId, {
        type: "image",
        transform: { x: 0, y: 0, width: w, height: h, rotation: 0, scaleX: 1, scaleY: 1 },
        data: { url: effect.preview_data_url },
        locked: false,
      });
      toast.success(`FX applied back to ${page} panel`);
    }
  };

  const startInlineDrawing = (page: "left" | "right", panelId: string) => {
    setInlineDrawingPanelId(panelId);
    setInlineDrawingPage(page);
    setSelectedPanelId(panelId);
    setSelectedPage(page);
    setInlineEraserMode(false);
  };

  const finishInlineDrawing = useCallback(() => {
    if (!inlineDrawingPanelId) return;
    const handle = inkbladeHandleRef.current;
    const dataUrl = handle?.toDataURL() ?? null;
    if (dataUrl && handle?.hasContent()) {
      const { width: panelW, height: panelH } = handle.getSize();
      addContentToPanel(inlineDrawingPage, inlineDrawingPanelId, {
        type: "drawing",
        transform: { x: 0, y: 0, width: panelW, height: panelH, rotation: 0, scaleX: 1, scaleY: 1 },
        data: { drawingData: dataUrl },
        locked: false,
      });
      toast.success("Drawing saved to panel");
    }
    setInlineDrawingPanelId(null);
    setIsInlineDrawing(false);
    inlineDrawingRef.current = null;
    setActiveTool("select");
  }, [inlineDrawingPanelId, inlineDrawingPage]);

  const clearInlineDrawing = useCallback(() => {
    inkbladeHandleRef.current?.clear();
  }, []);

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
      
      const { w: panelW, h: panelH } = getPanelPixelSize(selectedPage, selectedPanelId);
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
          transform: { x: 0, y: 0, width: panelW, height: panelH, rotation: 0, scaleX: 1, scaleY: 1 },
          data: { videoUrl: url, autoplay: true, loop: true, muted: true },
          locked: false,
        });
        toast.success("Video added to panel and saved to library");
      } else if (fileType === 'image/gif' || fileName.endsWith('.gif')) {
        addContentToPanel(selectedPage, selectedPanelId, {
          type: "gif",
          transform: { x: 0, y: 0, width: panelW, height: panelH, rotation: 0, scaleX: 1, scaleY: 1 },
          data: { url },
          locked: false,
        });
        toast.success("GIF added to panel and saved to library");
      } else {
        addContentToPanel(selectedPage, selectedPanelId, {
          type: "image",
          transform: { x: 0, y: 0, width: panelW, height: panelH, rotation: 0, scaleX: 1, scaleY: 1 },
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
    const { w, h } = getPanelPixelSize(selectedPage, selectedPanelId);
    addContentToPanel(selectedPage, selectedPanelId, {
      type: "image",
      transform: { x: 0, y: 0, width: w, height: h, rotation: 0, scaleX: 1, scaleY: 1 },
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
        borderWidth: 3,
        borderColor: "#000000",
      }));
      return { ...spread, [key]: newPanels };
    }));
    setSelectedPanelId(null);
    setShowTemplates(false);
    toast.success(`Template "${template.name}" applied (replaced existing panels)`);
  };

  const renderNarratorOverlay = (narr: NarrationBox | undefined, isPreview = false) => {
    if (!narr || !narr.text) return null;
    const styleMap = {
      caption: { bg: narr.bgColor || "#1a1a1a", color: narr.color || "#f5deb3", border: "#8b7355", ff: narr.fontFamily || "Georgia, serif" },
      thought: { bg: narr.bgColor || "#0a0a2e", color: narr.color || "#a8c8ff", border: "#4a6fa5", ff: narr.fontFamily || "'Space Grotesk', sans-serif" },
      editorial: { bg: narr.bgColor || "#2a0a0a", color: narr.color || "#ff9999", border: "#8b3a3a", ff: narr.fontFamily || "'JetBrains Mono', monospace" },
    };
    const s = styleMap[narr.style] || styleMap.caption;
    const fs = narr.fontSize || (isPreview ? 13 : 14);
    return (
      <div
        className={`absolute left-2 right-2 z-[100] pointer-events-none ${narr.position === "top" ? "top-2" : "bottom-2"}`}
        data-testid="narrator-overlay"
      >
        <div
          className="px-3 py-2 shadow-lg"
          style={{
            backgroundColor: s.bg,
            color: s.color,
            fontFamily: s.ff,
            fontSize: `${fs}px`,
            lineHeight: 1.5,
            borderLeft: `3px solid ${s.border}`,
            opacity: 0.95,
          }}
        >
          {narr.style === "editorial" && <span className="text-[9px] uppercase tracking-widest opacity-60 block mb-1">Editor's Note</span>}
          {narr.text}
        </div>
      </div>
    );
  };

  const renderPanel = (panel: Panel, page: "left" | "right") => {
    if (panel.hidden) return null;
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
          // Polygon panels: border is drawn by the SVG outline below; suppress
          // the outer rectangular border to keep the silhouette clean.
          borderWidth: panel.type === "polygon" ? 0 : `${panel.borderWidth || 2}px`,
          borderStyle: 'solid',
          borderColor: panel.borderColor || 'black',
          // Vector clip — polygon contents are auto-masked to the shape.
          clipPath: panel.type === "polygon" && panel.points && panel.points.length >= 3
            ? `polygon(${panel.points.map(p => `${p.x}% ${p.y}%`).join(", ")})`
            : undefined,
          boxShadow: isSelected
            ? `0 0 0 3px white, 0 0 20px rgba(255,255,255,0.4), 0 8px 32px rgba(0,0,0,0.8)`
            : panel.type === "polygon" ? 'none' : '0 4px 16px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)',
        }}
        onClick={(e) => handlePanelClick(e, panel.id, page)}
        onDoubleClick={(e) => handlePanelDoubleClick(e, panel.id, page)}
        data-testid={`panel-${panel.id}`}
      >
        {/* Polygon outline — drawn at the clip boundary; stroke is doubled
            because the outer half gets clipped away. */}
        {panel.type === "polygon" && panel.points && panel.points.length >= 3 && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ zIndex: 25 }}
            aria-hidden
          >
            <polygon
              points={panel.points.map(p => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={panel.borderColor || "#000"}
              strokeWidth={(panel.borderWidth || 3) * 2}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}
        {panel.coverRole && (
          <div className={`absolute top-0 left-0 z-10 px-0.5 py-px text-[8px] font-bold text-white ${panel.coverRole === "front-cover" ? "bg-cyan-600" : "bg-purple-600"}`}>
            {panel.coverRole === "front-cover" ? "FRONT COVER" : "BACK COVER"}
          </div>
        )}
        <div className="absolute inset-0 overflow-hidden bg-white" style={{ filter: panel.filter || 'none' }}>
          {panel.coverRole && coverDesignData && (() => {
            const cd = { ...defaultCover, ...coverDesignData } as CoverData;
            const isFront = panel.coverRole === "front-cover";
            const bgColor = isFront ? cd.frontBgColor : cd.backBgColor;
            const bgImage = isFront ? cd.frontImage : cd.backImage;
            const textLayers = isFront ? (cd.frontLayers || []) : (cd.backLayers || []);
            const imageLayers = isFront ? (cd.frontImageLayers || []) : (cd.backImageLayers || []);
            const zoomScale = zoom / 100;
            const coverElZOrder = cd.elementZOrder || [];
            const hiddenEls = new Set(cd.hiddenElements || []);
            const bgViewKey0 = isFront ? "front" : "back";
            const coverBgIsSelected = selectedContentId === `cover-bg-${bgViewKey0}`;
            const coverElStyle = (baseZ: number): React.CSSProperties => ({
              zIndex: baseZ,
              ...(coverBgIsSelected ? { pointerEvents: 'none' as const } : {}),
            });

            return (
              <div className="absolute inset-0 z-[1] overflow-hidden" style={{ backgroundColor: bgColor, containerType: 'size' }}>
                {bgImage && !hiddenEls.has(`bg-${isFront ? "front" : "back"}`) && (() => {
                  const bgViewKey = isFront ? "front" : "back";
                  const bgTransform = (cd as any)[`${bgViewKey}BgTransform`] || { x: 0, y: 0, width: 600, height: 900, rotation: 0, scaleX: 1, scaleY: 1 };
                  const isBgSelected = selectedContentId === `cover-bg-${bgViewKey}`;
                  const bgZIdx = coverElZOrder.indexOf(`bg-${bgViewKey}`);
                  return (
                    <TransformableElement
                      id={`cover-bg-${bgViewKey}`}
                      initialTransform={bgTransform}
                      isSelected={isBgSelected}
                      onSelect={() => { setSelectedContentId(`cover-bg-${bgViewKey}`); setSelectedPanelId(panel.id); }}
                      onTransformChange={(_, t) => updateCoverData({ [`${bgViewKey}BgTransform`]: t })}
                      locked={false}
                      minWidth={20} minHeight={20}
                      style={{
                        zIndex: isBgSelected ? 999 : (bgZIdx >= 0 ? bgZIdx + 2 : 1),
                      }}
                    >
                      <img src={bgImage} alt="Cover background" className="w-full h-full object-cover pointer-events-none select-none" draggable={false} />
                    </TransformableElement>
                  );
                })()}

                {isFront ? (
                  <>
                    {cd.bannerText && !hiddenEls.has("master-banner") && (
                      <TransformableElement
                        id="cover-banner"
                        initialTransform={cd.bannerTransform || defaultCover.bannerTransform}
                        isSelected={selectedContentId === "cover-banner"}
                        onSelect={() => { setSelectedContentId("cover-banner"); setSelectedPanelId(panel.id); }}
                        onTransformChange={(_, t) => updateCoverData({ bannerTransform: t })}
                        locked={false}
                        minWidth={30} minHeight={12}
                        style={coverElStyle(Math.max(coverElZOrder.indexOf("master-banner"), 0) + 2)}
                      >
                        <div className="w-full h-full flex items-center justify-center text-center font-bold tracking-widest uppercase" style={{
                          backgroundColor: cd.bannerBgColor || '#000',
                          color: cd.titleColor,
                          fontSize: 'max(6px, 2.5cqi)',
                          letterSpacing: '0.15em',
                        }}>{cd.bannerText}</div>
                      </TransformableElement>
                    )}

                    {cd.publisherName && !hiddenEls.has("master-publisher") && (
                      <TransformableElement
                        id="cover-publisher"
                        initialTransform={cd.publisherTransform || defaultCover.publisherTransform}
                        isSelected={selectedContentId === "cover-publisher"}
                        onSelect={() => { setSelectedContentId("cover-publisher"); setSelectedPanelId(panel.id); }}
                        onTransformChange={(_, t) => updateCoverData({ publisherTransform: t })}
                        locked={false}
                        minWidth={20} minHeight={10}
                        style={coverElStyle(Math.max(coverElZOrder.indexOf("master-publisher"), 0) + 2)}
                      >
                        <div className="w-full h-full flex items-center justify-center font-bold uppercase tracking-wider opacity-80" style={{
                          color: cd.titleColor,
                          fontSize: 'max(5px, 2.5cqi)',
                        }}>{cd.publisherName}</div>
                      </TransformableElement>
                    )}

                    {cd.issueNumber && !hiddenEls.has("master-issue") && (
                      <TransformableElement
                        id="cover-issue"
                        initialTransform={cd.issueNumberTransform || defaultCover.issueNumberTransform}
                        isSelected={selectedContentId === "cover-issue"}
                        onSelect={() => { setSelectedContentId("cover-issue"); setSelectedPanelId(panel.id); }}
                        onTransformChange={(_, t) => updateCoverData({ issueNumberTransform: t })}
                        locked={false}
                        minWidth={20} minHeight={10}
                        style={coverElStyle(Math.max(coverElZOrder.indexOf("master-issue"), 0) + 2)}
                      >
                        <div className="w-full h-full flex flex-col items-center justify-center font-bold" style={{
                          color: cd.titleColor,
                          fontSize: 'max(6px, 3cqi)',
                        }}>
                          <span>{cd.issueNumber}</span>
                          {cd.issueDate && <span style={{ fontSize: 'max(4px, 1.8cqi)', fontWeight: 'normal', opacity: 0.7 }}>{cd.issueDate}</span>}
                        </div>
                      </TransformableElement>
                    )}

                    {!hiddenEls.has("master-title") && <TransformableElement
                      id="cover-title"
                      initialTransform={cd.titleTransform || defaultCover.titleTransform}
                      isSelected={selectedContentId === "cover-title"}
                      onSelect={() => { setSelectedContentId("cover-title"); setSelectedPanelId(panel.id); }}
                      onTransformChange={(_, t) => updateCoverData({ titleTransform: t })}
                      locked={false}
                      minWidth={30} minHeight={15}
                      style={coverElStyle(Math.max(coverElZOrder.indexOf("master-title"), 0) + 2)}
                    >
                      <div className="w-full h-full flex items-center justify-center text-center leading-none break-words" style={{
                        fontFamily: cd.titleFont,
                        color: cd.titleColor,
                        fontSize: 'max(12px, 8cqi)',
                        fontWeight: cd.titleBold !== false ? 'bold' : 'normal',
                        fontStyle: cd.titleItalic ? 'italic' : 'normal',
                        textTransform: cd.titleUppercase !== false ? 'uppercase' : 'none',
                        WebkitTextStroke: cd.titleStrokeWidth ? `${Math.max(0.5, cd.titleStrokeWidth * 0.4)}px ${cd.titleStrokeColor || '#000'}` : undefined,
                        textShadow: '2px 2px 4px rgba(0,0,0,0.6)',
                      }}>{cd.title || "TITLE"}</div>
                    </TransformableElement>}

                    {cd.subtitle && !hiddenEls.has("master-subtitle") && (
                      <TransformableElement
                        id="cover-subtitle"
                        initialTransform={cd.subtitleTransform || defaultCover.subtitleTransform}
                        isSelected={selectedContentId === "cover-subtitle"}
                        onSelect={() => { setSelectedContentId("cover-subtitle"); setSelectedPanelId(panel.id); }}
                        onTransformChange={(_, t) => updateCoverData({ subtitleTransform: t })}
                        locked={false}
                        minWidth={20} minHeight={10}
                        style={coverElStyle(Math.max(coverElZOrder.indexOf("master-subtitle"), 0) + 2)}
                      >
                        <div className="w-full h-full flex items-center justify-center text-center break-words" style={{
                          fontFamily: cd.subtitleFont,
                          color: cd.subtitleColor,
                          fontSize: 'max(5px, 3cqi)',
                          fontWeight: cd.subtitleBold ? 'bold' : 'normal',
                          fontStyle: cd.subtitleItalic ? 'italic' : 'normal',
                          textTransform: cd.subtitleUppercase ? 'uppercase' : 'none',
                        }}>{cd.subtitle}</div>
                      </TransformableElement>
                    )}

                    {cd.tagline && !hiddenEls.has("master-tagline") && (
                      <TransformableElement
                        id="cover-tagline"
                        initialTransform={cd.taglineTransform || defaultCover.taglineTransform}
                        isSelected={selectedContentId === "cover-tagline"}
                        onSelect={() => { setSelectedContentId("cover-tagline"); setSelectedPanelId(panel.id); }}
                        onTransformChange={(_, t) => updateCoverData({ taglineTransform: t })}
                        locked={false}
                        minWidth={20} minHeight={10}
                        style={coverElStyle(Math.max(coverElZOrder.indexOf("master-tagline"), 0) + 2)}
                      >
                        <div className="w-full h-full flex items-center justify-center italic opacity-80 text-center" style={{
                          color: cd.subtitleColor,
                          fontSize: 'max(4px, 2cqi)',
                        }}>{cd.tagline}</div>
                      </TransformableElement>
                    )}

                    {!hiddenEls.has("master-author") && <TransformableElement
                      id="cover-author"
                      initialTransform={cd.authorTransform || defaultCover.authorTransform}
                      isSelected={selectedContentId === "cover-author"}
                      onSelect={() => { setSelectedContentId("cover-author"); setSelectedPanelId(panel.id); }}
                      onTransformChange={(_, t) => updateCoverData({ authorTransform: t })}
                      locked={false}
                      minWidth={20} minHeight={10}
                      style={coverElStyle(Math.max(coverElZOrder.indexOf("master-author"), 0) + 2)}
                    >
                      <div className="w-full h-full flex items-center justify-center text-center" style={{
                        fontFamily: cd.authorFont,
                        color: cd.authorColor,
                        fontSize: 'max(6px, 3.5cqi)',
                        fontWeight: cd.authorBold ? 'bold' : 'normal',
                        fontStyle: cd.authorItalic ? 'italic' : 'normal',
                        textTransform: cd.authorUppercase ? 'uppercase' : 'none',
                      }}>{cd.author || "Author"}</div>
                    </TransformableElement>}

                    {cd.showPriceBox && cd.priceText && !hiddenEls.has("master-price") && (
                      <TransformableElement
                        id="cover-price"
                        initialTransform={cd.priceBoxTransform || defaultCover.priceBoxTransform}
                        isSelected={selectedContentId === "cover-price"}
                        onSelect={() => { setSelectedContentId("cover-price"); setSelectedPanelId(panel.id); }}
                        onTransformChange={(_, t) => updateCoverData({ priceBoxTransform: t })}
                        locked={false}
                        minWidth={15} minHeight={15}
                        style={coverElStyle(Math.max(coverElZOrder.indexOf("master-price"), 0) + 2)}
                      >
                        <div className="w-full h-full flex items-center justify-center" style={{
                          backgroundColor: cd.priceBoxColor || cd.bannerBgColor || '#FFD700',
                          color: cd.priceBoxTextColor || '#000',
                          fontSize: 'max(6px, 3cqi)',
                          fontWeight: 'bold',
                          border: '1px solid #000',
                          borderRadius: cd.priceBoxShape === 'circle' ? '50%' : undefined,
                          transform: cd.priceBoxShape === 'diamond' ? 'rotate(45deg)' : undefined,
                        }}>
                          <span style={{ transform: cd.priceBoxShape === 'diamond' ? 'rotate(-45deg)' : undefined, display: 'block' }}>
                            {cd.priceText}
                          </span>
                        </div>
                      </TransformableElement>
                    )}
                  </>
                ) : (
                  <>
                    {!hiddenEls.has("master-back-title") && <TransformableElement
                      id="cover-back-title"
                      initialTransform={cd.backTitleTransform || defaultCover.backTitleTransform}
                      isSelected={selectedContentId === "cover-back-title"}
                      onSelect={() => { setSelectedContentId("cover-back-title"); setSelectedPanelId(panel.id); }}
                      onTransformChange={(_, t) => updateCoverData({ backTitleTransform: t })}
                      locked={false}
                      minWidth={30} minHeight={15}
                      style={coverElStyle(Math.max(coverElZOrder.indexOf("master-back-title"), 0) + 2)}
                    >
                      <div className="w-full h-full flex items-center justify-center text-center break-words font-bold uppercase" style={{
                        fontFamily: cd.titleFont,
                        color: cd.titleColor,
                        fontSize: 'max(8px, 5cqi)',
                        textShadow: '1px 1px 3px rgba(0,0,0,0.5)',
                      }}>{cd.title || "TITLE"}</div>
                    </TransformableElement>}

                    {cd.backBlurb && !hiddenEls.has("master-blurb") && (
                      <TransformableElement
                        id="cover-blurb"
                        initialTransform={cd.backBlurbTransform || defaultCover.backBlurbTransform}
                        isSelected={selectedContentId === "cover-blurb"}
                        onSelect={() => { setSelectedContentId("cover-blurb"); setSelectedPanelId(panel.id); }}
                        onTransformChange={(_, t) => updateCoverData({ backBlurbTransform: t })}
                        locked={false}
                        minWidth={30} minHeight={20}
                        style={coverElStyle(Math.max(coverElZOrder.indexOf("master-blurb"), 0) + 2)}
                      >
                        <div className="w-full h-full flex items-start justify-center leading-relaxed break-words text-center overflow-hidden p-[4%]" style={{
                          fontFamily: cd.backBlurbFont || 'Georgia, serif',
                          color: cd.backBlurbColor || cd.authorColor,
                          fontSize: 'max(4px, 2.2cqi)',
                          lineHeight: '1.5',
                          fontWeight: cd.backBlurbBold ? 'bold' : 'normal',
                          fontStyle: cd.backBlurbItalic ? 'italic' : 'normal',
                        }}>{cd.backBlurb}</div>
                      </TransformableElement>
                    )}

                    {!hiddenEls.has("master-back-author") && <TransformableElement
                      id="cover-back-author"
                      initialTransform={cd.backAuthorTransform || defaultCover.backAuthorTransform}
                      isSelected={selectedContentId === "cover-back-author"}
                      onSelect={() => { setSelectedContentId("cover-back-author"); setSelectedPanelId(panel.id); }}
                      onTransformChange={(_, t) => updateCoverData({ backAuthorTransform: t })}
                      locked={false}
                      minWidth={20} minHeight={10}
                      style={coverElStyle(Math.max(coverElZOrder.indexOf("master-back-author"), 0) + 2)}
                    >
                      <div className="w-full h-full flex items-center justify-center text-center" style={{
                        fontFamily: cd.authorFont,
                        color: cd.authorColor,
                        fontSize: 'max(5px, 2.5cqi)',
                      }}>by {cd.author || "Author"}</div>
                    </TransformableElement>}

                    {cd.isbn && !hiddenEls.has("master-isbn") && (
                      <TransformableElement
                        id="cover-isbn"
                        initialTransform={cd.isbnTransform || defaultCover.isbnTransform}
                        isSelected={selectedContentId === "cover-isbn"}
                        onSelect={() => { setSelectedContentId("cover-isbn"); setSelectedPanelId(panel.id); }}
                        onTransformChange={(_, t) => updateCoverData({ isbnTransform: t })}
                        locked={false}
                        minWidth={20} minHeight={10}
                        style={coverElStyle(Math.max(coverElZOrder.indexOf("master-isbn"), 0) + 2)}
                      >
                        <div className="w-full h-full flex flex-col items-center justify-center" style={{ backgroundColor: cd.showBarcode !== false ? '#fff' : 'transparent', padding: cd.showBarcode !== false ? '2px' : 0 }}>
                          {cd.showBarcode !== false && (
                            <div style={{ display: 'flex', gap: '0.5px', height: '60%', alignItems: 'flex-end', marginBottom: '1px' }}>
                              {cd.isbn.split('').map((ch, i) => {
                                const w = ((parseInt(ch, 10) || 1) % 3) + 1;
                                return <div key={i} style={{ width: `${w}px`, height: `${60 + ((parseInt(ch, 10) || 0) * 3)}%`, backgroundColor: '#000', minWidth: '0.5px' }} />;
                              })}
                              {Array.from({ length: 8 }).map((_, i) => (
                                <div key={`pad-${i}`} style={{ width: '1px', height: `${70 + (i * 3)}%`, backgroundColor: '#000', minWidth: '0.5px' }} />
                              ))}
                            </div>
                          )}
                          <div className="text-center font-mono" style={{
                            color: cd.showBarcode !== false ? '#000' : (cd.authorColor || '#fff'),
                            fontSize: 'max(4px, 1.5cqi)',
                            lineHeight: 1,
                          }}>ISBN {cd.isbn}</div>
                        </div>
                      </TransformableElement>
                    )}

                    {cd.publisherName && !hiddenEls.has("master-back-publisher") && (
                      <TransformableElement
                        id="cover-back-publisher"
                        initialTransform={cd.backPublisherTransform || defaultCover.backPublisherTransform}
                        isSelected={selectedContentId === "cover-back-publisher"}
                        onSelect={() => { setSelectedContentId("cover-back-publisher"); setSelectedPanelId(panel.id); }}
                        onTransformChange={(_, t) => updateCoverData({ backPublisherTransform: t })}
                        locked={false}
                        minWidth={20} minHeight={10}
                        style={coverElStyle(Math.max(coverElZOrder.indexOf("master-back-publisher"), 0) + 2)}
                      >
                        <div className="w-full h-full flex items-center justify-center font-bold uppercase tracking-wider opacity-60" style={{
                          color: cd.authorColor,
                          fontSize: 'max(4px, 1.8cqi)',
                        }}>{cd.publisherName}</div>
                      </TransformableElement>
                    )}
                  </>
                )}

                {(() => {
                  const allUserIds = new Set([...imageLayers.map(il => il.id), ...textLayers.map(tl => tl.id)]);
                  const orderedUserIds = [...coverElZOrder.filter(id => allUserIds.has(id))];
                  allUserIds.forEach(id => { if (!orderedUserIds.includes(id)) orderedUserIds.push(id); });
                  const imgMap = new Map(imageLayers.map(il => [il.id, il]));
                  const txtMap = new Map(textLayers.map(tl => [tl.id, tl]));

                  return orderedUserIds.filter(id => !hiddenEls.has(id)).map((id) => {
                    const zIdx = Math.max(coverElZOrder.indexOf(id), 0) + 2;
                    const il = imgMap.get(id);
                    if (il) {
                      return (
                        <TransformableElement
                          key={il.id}
                          id={`cover-img-${il.id}`}
                          initialTransform={il.transform}
                          isSelected={selectedContentId === `cover-img-${il.id}`}
                          onSelect={() => { setSelectedContentId(`cover-img-${il.id}`); setSelectedPanelId(panel.id); }}
                          onTransformChange={(_, t) => {
                            const layerKey = `${isFront ? 'front' : 'back'}ImageLayers` as keyof CoverData;
                            const layers = (cd[layerKey] as CoverImageLayer[]) || [];
                            updateCoverData({ [layerKey]: layers.map(l => l.id === il.id ? { ...l, transform: t } : l) });
                          }}
                          locked={il.locked}
                          minWidth={15} minHeight={15}
                          style={coverElStyle(zIdx)}
                        >
                          <img src={il.url} alt={il.name}
                            className="w-full h-full object-contain"
                            style={{ opacity: il.opacity ?? 1, mixBlendMode: (il.blendMode || 'normal') as any }}
                            draggable={false}
                          />
                        </TransformableElement>
                      );
                    }
                    const tl = txtMap.get(id);
                    if (tl) {
                      return (
                        <TransformableElement
                          key={tl.id}
                          id={`cover-txt-${tl.id}`}
                          initialTransform={tl.transform}
                          isSelected={selectedContentId === `cover-txt-${tl.id}`}
                          onSelect={() => { setSelectedContentId(`cover-txt-${tl.id}`); setSelectedPanelId(panel.id); }}
                          onTransformChange={(_, t) => {
                            const layerKey = `${isFront ? 'front' : 'back'}Layers` as keyof CoverData;
                            const layers = (cd[layerKey] as CoverTextLayer[]) || [];
                            updateCoverData({ [layerKey]: layers.map(l => l.id === tl.id ? { ...l, transform: t } : l) });
                          }}
                          locked={tl.locked}
                          minWidth={15} minHeight={10}
                          style={coverElStyle(zIdx)}
                        >
                          <div className="w-full h-full flex items-center justify-center"
                            style={{
                              fontSize: `${Math.max(6, tl.fontSize * 0.3)}px`,
                              fontFamily: tl.fontFamily,
                              color: tl.color,
                              fontWeight: tl.fontWeight || 'normal',
                              fontStyle: tl.fontStyle || 'normal',
                              textTransform: (tl.textTransform as any) || 'none',
                              WebkitTextStroke: tl.strokeWidth ? `${tl.strokeWidth * 0.5}px ${tl.strokeColor || '#000'}` : undefined,
                            }}>
                            {tl.text}
                          </div>
                        </TransformableElement>
                      );
                    }
                    return null;
                  });
                })()}
              </div>
            );
          })()}
          {[...panel.contents].filter(c => !c.hidden).sort((a, b) => a.zIndex - b.zIndex).map(content => (
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
              style={{ zIndex: content.zIndex }}
            >
              {(content.type === "image" || content.type === "gif") && content.data.url && (
                <div className="w-full h-full relative">
                  <img 
                    src={content.data.url} 
                    alt="Panel content" 
                    className="w-full h-full object-cover"
                    style={{ filter: content.data.filter || 'none' }}
                    draggable={false}
                  />
                  {content.data.filterOverlay && (
                    <div className="absolute inset-0 pointer-events-none" style={getOverlayStyle(content.data.filterOverlay)} />
                  )}
                </div>
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
                  className="w-full h-full object-fill"
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
                  fontWeight={content.data.fontWeight}
                  fontStyle={content.data.fontStyle}
                  textAlign={content.data.textAlign}
                  textTransform={content.data.textTransform}
                  letterSpacing={content.data.letterSpacing}
                  lineHeight={content.data.lineHeight}
                  textArch={content.data.textArch}
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

          {isSelected && panel.contents.length === 0 && !inlineDrawingPanelId && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
              <div className="text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-mono">Double-click to add content</p>
              </div>
            </div>
          )}

          {inlineDrawingPanelId === panel.id && (
            <>
              <InkbladeCanvas
                ref={inkbladeHandleRef}
                fill
                brush={inkbladeBrush}
                className="absolute inset-0 z-30"
              />
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full z-40 flex items-center gap-1 bg-zinc-900 border border-zinc-600 px-2 py-1 rounded-t shadow-lg"
                style={{ pointerEvents: 'auto' }}
                onClick={(e) => e.stopPropagation()}
                data-testid="inline-drawing-toolbar"
              >
                <button
                  onClick={(e) => { e.stopPropagation(); setInlineEraserMode(false); }}
                  className={`p-1.5 rounded ${!inlineEraserMode ? 'bg-white text-black' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                  title="Pen"
                  data-testid="inline-draw-pen"
                >
                  <Pen className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled
                  className="p-1.5 rounded text-zinc-600 cursor-not-allowed"
                  title="Eraser — coming with INKBLADE layer model"
                  data-testid="inline-draw-eraser"
                >
                  <Eraser className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-5 bg-zinc-700 mx-0.5" />
                <input
                  type="color"
                  value={inkbladeBrush.color}
                  onChange={(e) => { e.stopPropagation(); setInkbladeBrush(b => ({ ...b, color: e.target.value })); }}
                  className="w-6 h-6 cursor-pointer bg-transparent border border-zinc-600 rounded"
                  title="Color"
                  data-testid="inline-draw-color"
                />
                <input
                  type="range"
                  min="1"
                  max="80"
                  value={inkbladeBrush.size}
                  onChange={(e) => { e.stopPropagation(); setInkbladeBrush(b => ({ ...b, size: Number(e.target.value) })); }}
                  className="w-16 h-2 accent-cyan-500"
                  title={`Size: ${inkbladeBrush.size}px`}
                  data-testid="inline-draw-size"
                />
                <span className="text-[10px] text-zinc-400 w-6 text-center">{inkbladeBrush.size}px</span>
                <div className="w-px h-5 bg-zinc-700 mx-0.5" />
                <button
                  onClick={(e) => { e.stopPropagation(); clearInlineDrawing(); }}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded"
                  title="Clear"
                  data-testid="inline-draw-clear"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setInlineDrawingPanelId(null); setIsInlineDrawing(false); inlineDrawingRef.current = null; }}
                  className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded"
                  title="Cancel"
                  data-testid="inline-draw-cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); finishInlineDrawing(); }}
                  className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold rounded"
                  title="Save Drawing"
                  data-testid="inline-draw-save"
                >
                  Done
                </button>
              </div>
            </>
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

                    // Lock circles to a true pixel-square so they stay
                    // actual circles (pages are 1:1.4, so width% != height%
                    // visually). Pick the larger pixel delta as the driver
                    // so the cursor still feels like it's controlling size.
                    if (panel.type === "circle") {
                      const pxW = (newWidth / 100) * pageRect.width;
                      const pxH = (newHeight / 100) * pageRect.height;
                      const diameterPx = Math.max(pxW, pxH);
                      const widthPct = (diameterPx / pageRect.width) * 100;
                      const heightPct = (diameterPx / pageRect.height) * 100;
                      // Re-anchor so the opposite corner stays fixed.
                      if (handle.position.includes('w')) newX = (startPanel.x + startPanel.width) - widthPct;
                      if (handle.position.includes('n')) newY = (startPanel.y + startPanel.height) - heightPct;
                      newWidth = widthPct;
                      newHeight = heightPct;
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
          style={{ pointerEvents: panel.coverRole && isSelected ? 'none' : 'auto' }}
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

  const renderPolygonOverlay = (page: "left" | "right") => {
    if (activeTool !== "panel" || panelShape !== "polygon") return null;
    if (polygonPage !== page || polygonPoints.length === 0) return null;
    const pts = [...polygonPoints, ...(polygonHover ? [polygonHover] : [])];
    return (
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-30"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
        data-testid={`polygon-overlay-${page}`}
      >
        <polyline
          points={pts.map(p => `${p.x},${p.y}`).join(" ")}
          fill="rgba(0,229,255,0.10)"
          stroke="#00e5ff"
          strokeWidth={0.5}
          strokeDasharray="1.5 1"
          vectorEffect="non-scaling-stroke"
        />
        {polygonPoints.length >= 3 && (
          <line
            x1={polygonPoints[polygonPoints.length - 1].x}
            y1={polygonPoints[polygonPoints.length - 1].y}
            x2={polygonPoints[0].x}
            y2={polygonPoints[0].y}
            stroke="#00e5ff"
            strokeWidth={0.4}
            strokeDasharray="0.6 0.8"
            opacity={0.6}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {polygonPoints.map((p, i) => {
          const isFirst = i === 0;
          const canClose = polygonPoints.length >= 3;
          return (
            <g key={i}>
              {/* Outer halo so vertex pops against any background */}
              <circle cx={p.x} cy={p.y} r={2.2} fill="rgba(0,0,0,0.55)" vectorEffect="non-scaling-stroke" />
              {/* Vertex disc — first point glows green when closeable */}
              <circle
                cx={p.x}
                cy={p.y}
                r={1.6}
                fill={isFirst && canClose ? "#22c55e" : "#fff"}
                stroke={isFirst && canClose ? "#022c0f" : "#0a0a0a"}
                strokeWidth={0.4}
                vectorEffect="non-scaling-stroke"
              />
              {/* Vertex number badge */}
              <text
                x={p.x}
                y={p.y + 0.7}
                fontSize={1.6}
                fontWeight={700}
                textAnchor="middle"
                fill={isFirst && canClose ? "#fff" : "#000"}
                style={{ fontFamily: "system-ui, -apple-system, sans-serif", userSelect: "none" }}
              >
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>
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
        <header className="h-12 border-b border-zinc-800/50 flex items-center justify-between px-4" style={{ background: '#2d2d2d' }}>
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
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <button onClick={handleUndo} className="p-2 hover:bg-zinc-800" data-testid="button-undo" aria-label="Undo">
                  <Undo className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-black border border-white text-white font-mono text-xs z-[200]">
                <p>Undo <span className="text-zinc-400 ml-1">(Ctrl+Z)</span></p>
              </TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <button onClick={handleRedo} className="p-2 hover:bg-zinc-800" data-testid="button-redo" aria-label="Redo">
                  <Redo className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-black border border-white text-white font-mono text-xs z-[200]">
                <p>Redo <span className="text-zinc-400 ml-1">(Ctrl+Shift+Z)</span></p>
              </TooltipContent>
            </Tooltip>
            <div className="w-px h-6 bg-zinc-700 mx-2" />
            <ModeSwitcher active={activeMode} onChange={handleModeChange} />
            <div className="w-px h-6 bg-zinc-700 mx-2" />
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <button
                  onClick={async () => {
                    try {
                      const p = await createProject.mutateAsync({ title: "Untitled Comic", type: "comic", status: "draft", data: {}, forceNew: true } as any);
                      navigate(`/creator/comic?id=${p.id}`, { replace: true });
                      window.location.reload();
                    } catch { toast.error("Failed to create new project"); }
                  }}
                  className="px-3 py-1.5 text-sm flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700"
                  data-testid="button-new-comic"
                >
                  <Plus className="w-4 h-4" /> New
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-black border border-white text-white font-mono text-xs z-[200]">
                <p>Start a fresh comic project</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => { setShowTemplates(!showTemplates); if (!showTemplates) setTemplateFilter("all"); }}
                  className={`px-3 py-1.5 text-sm flex items-center gap-2 ${showTemplates ? 'bg-white text-black' : 'bg-zinc-800 hover:bg-zinc-700'}`}
                >
                  <LayoutGrid className="w-4 h-4" /> Templates
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-black border border-white text-white font-mono text-xs z-[200]">
                <p>Choose from pre-made layouts and styles</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !effectiveProjectId}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-save"
                >
                  <Save className="w-4 h-4" /> {isSaving ? "Saving..." : !effectiveProjectId ? "Creating..." : "Save"}
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-black border border-white text-white font-mono text-xs z-[200]">
                <p>Save project <span className="text-zinc-400 ml-1">(Ctrl+S)</span></p>
              </TooltipContent>
            </Tooltip>
            <VersionHistory projectId={effectiveProjectId ?? undefined} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-medium flex items-center gap-2"
                  data-testid="button-preview"
                >
                  <Eye className="w-4 h-4" /> Preview
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-zinc-900 border-zinc-700 text-white">
                <DropdownMenuItem onClick={() => { setPreviewPage(0); setShowPreview(true); refetchProject(); }} className="hover:bg-zinc-800 cursor-pointer" data-testid="button-preview-inline">
                  <Eye className="w-4 h-4 mr-2" /> Quick Preview (Ctrl+R)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleOpenReaderPreview} className="hover:bg-zinc-800 cursor-pointer" data-testid="button-preview-reader">
                  <BookOpen className="w-4 h-4 mr-2" /> Preview as Reader
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-700" />
                <DropdownMenuItem onClick={handleGenerateThumbnail} disabled={!effectiveProjectId} className="hover:bg-zinc-800 cursor-pointer" data-testid="button-generate-thumbnail">
                  <ImageIcon className="w-4 h-4 mr-2" /> Auto-Generate Thumbnail
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => thumbnailInputRef.current?.click()} disabled={!effectiveProjectId} className="hover:bg-zinc-800 cursor-pointer" data-testid="button-upload-thumbnail">
                  <Upload className="w-4 h-4 mr-2" /> Upload Thumbnail
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="px-4 py-2 bg-white text-black text-sm font-bold flex items-center gap-2 hover:bg-zinc-200" data-testid="button-export">
                  <Download className="w-4 h-4" /> Export
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-zinc-900 border-zinc-700 text-white w-72">
                <div className="px-2 py-1.5">
                  <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Download</p>
                </div>
                <DropdownMenuItem onClick={handleExportCurrentPagePNG} className="hover:bg-zinc-800 cursor-pointer" data-testid="button-export-page-png">
                  <ImageIcon className="w-4 h-4 mr-2" />
                  <div>
                    <span>Current Page as PNG</span>
                    <p className="text-[10px] text-zinc-500 mt-0.5">High-res image of the selected page</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportAllPagesPNG} className="hover:bg-zinc-800 cursor-pointer" data-testid="button-export-all-png">
                  <Layers className="w-4 h-4 mr-2" />
                  <div>
                    <span>Full Comic as PNGs</span>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Every page as a separate image file</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportFullPDF} className="hover:bg-zinc-800 cursor-pointer" data-testid="button-export-pdf">
                  <FileText className="w-4 h-4 mr-2" />
                  <div>
                    <span>Full Comic as PDF</span>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Print-ready 300 DPI with covers</p>
                  </div>
                </DropdownMenuItem>
                {tier === "free" || tier === "creator" ? (
                  <>
                    <DropdownMenuSeparator className="bg-zinc-700" />
                    <DropdownMenuItem
                      onClick={() => navigate("/pricing")}
                      className="hover:bg-zinc-800 cursor-pointer text-amber-400"
                      data-testid="link-remove-watermark"
                    >
                      <Crown className="w-4 h-4 mr-2" /> Remove watermark — Upgrade
                    </DropdownMenuItem>
                  </>
                ) : null}
                <DropdownMenuSeparator className="bg-zinc-700" />
                <div className="px-2 py-1.5">
                  <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Publish</p>
                </div>
                <DropdownMenuItem onClick={handleSyncCurrentPage} disabled={isSyncingToCoMiXX} className="hover:bg-zinc-800 cursor-pointer text-cyan-400" data-testid="button-sync-page">
                  <Share2 className="w-4 h-4 mr-2" />
                  <div>
                    <span>Sync Page to CoMiXX</span>
                    <p className="text-[10px] text-zinc-600 mt-0.5">Upload current page to asset library</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSyncAllPages} disabled={isSyncingToCoMiXX} className="hover:bg-zinc-800 cursor-pointer text-cyan-400" data-testid="button-sync-all">
                  <Share2 className="w-4 h-4 mr-2" />
                  <div>
                    <span>Sync All Pages to CoMiXX</span>
                    <p className="text-[10px] text-zinc-600 mt-0.5">Upload entire comic to asset library</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-700" />
                <div className="px-2 py-1.5">
                  <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Convert</p>
                </div>
                <DropdownMenuItem onClick={convertComicToHop} className="hover:bg-zinc-800 cursor-pointer text-pink-400" data-testid="button-convert-to-hop">
                  <Film className="w-4 h-4 mr-2" />
                  <div>
                    <span>Convert to HOP</span>
                    <p className="text-[10px] text-zinc-600 mt-0.5">Turn pages into a viral short-form clip</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-700" />
                <div className="px-2 py-1.5">
                  <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Data</p>
                </div>
                <DropdownMenuItem onClick={handleExportProjectJSON} className="hover:bg-zinc-800 cursor-pointer" data-testid="button-export-json">
                  <Save className="w-4 h-4 mr-2" />
                  <div>
                    <span>Project Data (JSON)</span>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Backup project structure and content</p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {effectiveProjectId && (
              <button
                onClick={handleCompileComic}
                disabled={isCompiling}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 border border-amber-500 text-sm font-bold flex items-center gap-2 text-white disabled:opacity-50"
                data-testid="button-compile-comic"
              >
                <Package className="w-4 h-4" /> {isCompiling ? "Compiling..." : "Compile"}
              </button>
            )}
            {effectiveProjectId && project && (project.status === "draft" || project.status === "rejected") && (
              <button
                onClick={() => submitForReview.mutate()}
                disabled={submitForReview.isPending}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 border border-cyan-500 text-sm font-bold flex items-center gap-2 text-white disabled:opacity-50"
                data-testid="button-submit-review"
              >
                <SendHorizonal className="w-4 h-4" /> Submit for Review
              </button>
            )}
            {effectiveProjectId && project && project.status === "approved" && (
              <button
                onClick={() => publishProject.mutate()}
                disabled={publishProject.isPending}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 border border-green-500 text-sm font-bold flex items-center gap-2 text-white disabled:opacity-50"
                data-testid="button-publish"
              >
                <Rocket className="w-4 h-4" /> Publish
              </button>
            )}
            {effectiveProjectId && (
              <PostComposer
                projectId={effectiveProjectId}
                projectType="comic"
                projectTitle={title}
                trigger={
                  <button className="px-4 py-2 bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 border border-zinc-600 text-sm font-bold flex items-center gap-2" data-testid="button-share">
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                }
              />
            )}
            {effectiveProjectId && isStudent && (
              <button
                onClick={() => sendToPortfolio.mutate()}
                disabled={sendToPortfolio.isPending}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 border border-purple-500 text-sm font-bold flex items-center gap-2 text-white disabled:opacity-50"
                data-testid="button-send-portfolio"
              >
                <Briefcase className="w-4 h-4" /> {sendToPortfolio.isPending ? "Sending..." : "Send to Portfolio"}
              </button>
            )}
          </div>
        </header>

        {compileResult && (
          <div className={`px-4 py-2 flex items-start gap-3 text-xs border-b ${compileResult.status === "success" ? "bg-green-950 border-green-800 text-green-300" : "bg-amber-950 border-amber-800 text-amber-300"}`}>
            <div className="flex-1">
              <span className="font-bold uppercase text-[10px] tracking-wider">
                {compileResult.status === "success" ? "COMPILED — READY" : "COMPILED WITH WARNINGS"}
              </span>
              <div className="mt-1 space-y-0.5">
                {compileResult.messages.map((msg, i) => (
                  <div key={i} className={msg.startsWith("Warning") ? "text-amber-400" : "opacity-80"}>{msg}</div>
                ))}
              </div>
            </div>
            <button onClick={() => setCompileResult(null)} className="p-1 hover:bg-white/10 shrink-0"><X className="w-3 h-3" /></button>
          </div>
        )}

        {/* MODE BANNER — explains the active mode and offers a real action.
            Layout & Text already drive the side toolbar; Color/Motion/FX get
            their first-class affordances right here so the buttons aren't
            silent. */}
        {(() => {
          const allPanels = currentSpread ? [...currentSpread.leftPage, ...currentSpread.rightPage] : [];
          const selectedPanel = allPanels.find(p => p.id === selectedPanelId) || null;
          const panelPage: "left" | "right" | null = selectedPanel
            ? (currentSpread?.leftPage.some(p => p.id === selectedPanel.id) ? "left" : "right")
            : null;
          const FX_PRESETS: { id: string; label: string; filter: string }[] = [
            { id: "none", label: "None", filter: "none" },
            { id: "noir", label: "Noir", filter: "grayscale(100%) contrast(1.2)" },
            { id: "sepia", label: "Sepia", filter: "sepia(85%) saturate(1.1)" },
            { id: "comic", label: "Comic", filter: "contrast(1.3) saturate(1.4)" },
            { id: "dream", label: "Dream", filter: "blur(0.6px) brightness(1.1) saturate(1.2)" },
            { id: "ghost", label: "Ghost", filter: "invert(100%) hue-rotate(180deg)" },
          ];
          const meta: Record<ModeId, { tag: string; tagColor: string; hint: string }> = {
            layout: { tag: "LAYOUT", tagColor: "bg-cyan-500", hint: "Build & arrange panels. Pick a shape from the left toolbar." },
            ink:    { tag: "INK",    tagColor: "bg-cyan-500", hint: "INKBLADE pen — pressure & tilt active. Pick a brush from the side panel." },
            color:  { tag: "COLOR",  tagColor: "bg-pink-500", hint: selectedPanel ? "Pick a color to fill the selected panel's background." : "Select a panel, then choose a fill color." },
            motion: { tag: "MOTION", tagColor: "bg-amber-500", hint: selectedPanel ? "Send this panel into Motion Studio to animate it." : "Select a panel to send into Motion Studio." },
            fx:     { tag: "FX",     tagColor: "bg-violet-500", hint: selectedPanel ? "Apply a visual effect to the selected panel." : "Select a panel to apply an effect." },
            text:   { tag: "TEXT",   tagColor: "bg-emerald-500", hint: "Text & speech-bubble tools are active in the left toolbar." },
          };
          const m = meta[activeMode];
          return (
            <div
              className="flex items-center gap-3 px-4 py-1.5 border-b border-zinc-800 text-xs"
              style={{ background: '#1a1a1a' }}
              data-testid={`mode-banner-${activeMode}`}
            >
              <span className={`px-2 py-0.5 text-[10px] font-bold tracking-widest text-white ${m.tagColor}`}>{m.tag}</span>
              <span className="text-zinc-300 flex-1 truncate">{m.hint}</span>

              {activeMode === "color" && selectedPanel && panelPage && (
                <div className="flex items-center gap-1" data-testid="mode-color-actions">
                  {["#000000","#ffffff","#ef4444","#f59e0b","#22c55e","#3b82f6","#a855f7","#ec4899"].map(c => (
                    <button
                      key={c}
                      onClick={() => updatePanelStyle(panelPage, selectedPanel.id, { backgroundColor: c })}
                      className={`w-5 h-5 border ${selectedPanel.backgroundColor === c ? "border-white scale-110" : "border-zinc-700 hover:border-zinc-400"}`}
                      style={{ backgroundColor: c }}
                      title={`Fill with ${c}`}
                      data-testid={`mode-color-swatch-${c}`}
                    />
                  ))}
                  <input
                    type="color"
                    value={selectedPanel.backgroundColor && selectedPanel.backgroundColor !== "transparent" ? selectedPanel.backgroundColor : "#ffffff"}
                    onChange={(e) => updatePanelStyle(panelPage, selectedPanel.id, { backgroundColor: e.target.value })}
                    className="w-5 h-5 cursor-pointer border-0 bg-transparent"
                    title="Custom color"
                    data-testid="mode-color-custom"
                  />
                  <button
                    onClick={() => updatePanelStyle(panelPage, selectedPanel.id, { backgroundColor: "transparent" })}
                    className="px-2 py-0.5 text-[10px] border border-zinc-700 hover:border-zinc-400 text-zinc-300 ml-1"
                    data-testid="mode-color-clear"
                  >
                    Clear
                  </button>
                </div>
              )}

              {activeMode === "motion" && selectedPanel && panelPage && (
                <button
                  onClick={() => {
                    sessionStorage.setItem('panel_edit_data', JSON.stringify({
                      panelId: selectedPanel.id,
                      contents: selectedPanel.contents,
                      page: panelPage,
                      spreadIndex: currentSpreadIndex,
                      projectId: effectiveProjectId
                    }));
                    navigate(`/creator/motion?panel=${selectedPanel.id}&return=${encodeURIComponent(location)}`);
                  }}
                  className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-black hover:bg-amber-400"
                  data-testid="mode-motion-send"
                >
                  Send to Motion Studio →
                </button>
              )}

              {activeMode === "fx" && selectedPanel && panelPage && (
                <div className="flex items-center gap-1" data-testid="mode-fx-actions">
                  {FX_PRESETS.map(p => {
                    const active = (selectedPanel.filter || "none") === p.filter;
                    return (
                      <button
                        key={p.id}
                        onClick={() => updatePanelStyle(panelPage, selectedPanel.id, { filter: p.filter })}
                        className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider border ${active ? "bg-violet-500 text-white border-violet-400" : "border-zinc-700 text-zinc-300 hover:border-violet-500 hover:text-white"}`}
                        title={p.label}
                        data-testid={`mode-fx-${p.id}`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        <div className="flex-1 flex overflow-hidden">
          {!canvasOverview && (
          <aside className="w-14 border-r border-zinc-800/50 flex flex-col items-center py-3 gap-0.5 relative" style={{ background: '#252525' }}>
            {/* PANEL-SHAPE popout — appears next to the toolbar when Panel tool is active. */}
            {activeTool === "panel" && (
              <div
                className="absolute left-14 top-3 z-50 bg-zinc-900 border border-zinc-700 shadow-2xl p-2 flex flex-col gap-1 font-mono"
                onClick={(e) => e.stopPropagation()}
                data-testid="panel-shape-popout"
              >
                <div className="text-[9px] uppercase tracking-wider text-zinc-500 px-1 mb-0.5">Shape</div>
                {([
                  { id: "rectangle", label: "Rect", Icon: SquareIcon, hint: "Click & drag" },
                  { id: "circle",    label: "Circle", Icon: CircleIcon, hint: "Click & drag" },
                  { id: "polygon",   label: "Polygon", Icon: Hexagon, hint: "Click points · double-click to close · Esc cancels" },
                ] as const).map(s => (
                  <button
                    key={s.id}
                    onClick={() => setPanelShape(s.id)}
                    title={s.hint}
                    data-testid={`panel-shape-${s.id}`}
                    className={`flex items-center gap-2 px-2 py-1.5 text-[10px] uppercase border ${panelShape === s.id ? "bg-white text-black border-white" : "border-zinc-700 text-zinc-300 hover:border-zinc-500"}`}
                  >
                    <s.Icon className="w-3.5 h-3.5" /> {s.label}
                  </button>
                ))}
                {panelShape === "polygon" && (
                  <div className="text-[9px] text-zinc-500 px-1 mt-1 border-t border-zinc-800 pt-1.5 leading-tight">
                    {polygonPoints.length === 0
                      ? "Click on a page to start"
                      : `${polygonPoints.length} pts · dbl-click or Enter to close · Esc cancels`}
                  </div>
                )}
              </div>
            )}

            {/* INKBLADE brush popout — appears next to the toolbar when Draw/Erase is active. */}
            {(activeTool === "draw" || activeTool === "erase") && (
              <div
                className="absolute left-14 top-3 z-50"
                onClick={(e) => e.stopPropagation()}
                data-testid="brush-popout"
              >
                <BrushSettingsPanel brush={inkbladeBrush} onChange={setInkbladeBrush} />
              </div>
            )}


            {tools.map((tool) => (
              <Tooltip key={tool.id} delayDuration={100}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      if (tool.id === "ai") {
                        openAIGen();
                      } else {
                        setActiveTool(tool.id);
                      }
                    }}
                    className={`p-2.5 w-10 h-10 flex items-center justify-center transition-all rounded-lg ${
                      activeTool === tool.id ? 'bg-white text-black shadow-md' : 'hover:bg-white/10 text-zinc-400 hover:text-white'
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
            <div className="w-8 border-t border-zinc-700 my-1" />
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    setAssetLibraryTab("library");
                    setShowAssetLibrary(true);
                  }}
                  className="p-3 w-12 h-12 flex items-center justify-center transition-all hover:bg-zinc-800 text-zinc-400 hover:text-white"
                  data-testid="tool-asset-library"
                >
                  <FolderOpen className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-black border border-white text-white font-mono text-xs z-[200]">
                <p>Asset Library</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    fxStudio.openFxStudio({ mode: "fx" });
                  }}
                  className="p-2.5 w-10 h-10 flex items-center justify-center transition-all hover:bg-purple-900/50 text-purple-400 hover:text-purple-300 rounded-lg"
                  data-testid="tool-fx-studio"
                >
                  <Sparkles className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-black border border-purple-500 text-purple-300 font-mono text-xs z-[200]">
                <p>FX Studio</p>
              </TooltipContent>
            </Tooltip>
          </aside>
          )}

          <main className={`flex-1 overflow-auto flex flex-col items-center justify-center relative ${canvasOverview ? 'p-0' : 'p-4'}`} style={{ background: '#1e1e1e' }}>
            {canvasOverview ? (
              <ComicCanvasOverview
                spreads={spreads}
                currentSpreadIndex={currentSpreadIndex}
                onSelectSpread={(idx) => { setCurrentSpreadIndex(idx); }}
                onEditSpread={(idx) => { setCurrentSpreadIndex(idx); setCanvasOverview(false); }}
                onClose={() => setCanvasOverview(false)}
                setSpreads={setSpreads}
                coverDesignData={coverDesignData}
                effectiveFrontCover={effectiveFrontCover}
                effectiveBackCover={effectiveBackCover}
              />
            ) : (
            <>
            <div className="absolute inset-0 pointer-events-none"
                 style={{
                   backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)",
                   backgroundSize: "24px 24px",
                 }} />

            <div className={`text-white text-sm mb-4 font-mono flex items-center gap-4 relative z-10 bg-zinc-900/90 backdrop-blur-sm px-4 py-2 rounded-xl border border-zinc-700/50 shadow-lg ${showPreview ? 'hidden' : ''}`}>
              <span className="flex items-center gap-2">
                {currentSpread?.tag && SPREAD_TAG_CONFIG[currentSpread.tag as SpreadTag] && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{
                    backgroundColor: SPREAD_TAG_CONFIG[currentSpread.tag as SpreadTag].color,
                    color: "#fff"
                  }}>{SPREAD_TAG_CONFIG[currentSpread.tag as SpreadTag].label}</span>
                )}
                {!currentSpread?.tag && currentSpreadIndex === 0 && currentSpread?.leftPage.some(p => p.coverRole === "front-cover") && (
                  <span className="text-[9px] font-bold bg-cyan-600 text-white px-1.5 py-0.5 rounded">COVER</span>
                )}
                {currentSpread?.isLastPage && (
                  <span className="text-[9px] font-bold bg-amber-600 text-white px-1.5 py-0.5 rounded">LAST PAGE</span>
                )}
                Spread {currentSpreadIndex + 1} of {spreads.length} · {2 + spreads.length * 2 + comicMeta.bonusCards.length} pages total
              </span>
              <button 
                onClick={() => { 
                  if (currentSpreadIndex > 0) {
                    setCurrentSpreadIndex(currentSpreadIndex - 1);
                  }
                }}
                className="px-2 py-1 hover:bg-white/10 rounded"
                disabled={currentSpreadIndex === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => {
                  if (currentSpreadIndex < spreads.length - 1) {
                    setCurrentSpreadIndex(currentSpreadIndex + 1);
                  }
                }}
                className="px-2 py-1 hover:bg-white/10 rounded"
                disabled={currentSpreadIndex === spreads.length - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => toggleLastPage(currentSpreadIndex)}
                className={`px-2 py-1 text-[10px] font-bold border transition-colors ${
                  currentSpread?.isLastPage
                    ? "bg-amber-600 text-white border-amber-500"
                    : "bg-zinc-800 text-zinc-400 border-zinc-600 hover:border-amber-500 hover:text-amber-400"
                }`}
                title={currentSpread?.isLastPage ? "Unmark as last page" : "Mark this spread as the last page (auto-adds back cover)"}
                data-testid="button-toggle-last-page"
              >
                {currentSpread?.isLastPage ? "✓ Last Page" : "Mark Last"}
              </button>
              <button
                onClick={handleDeleteCurrentSpread}
                disabled={spreads.length <= 1}
                className="px-2 py-1 text-[10px] font-bold border border-zinc-600 bg-zinc-800 text-zinc-400 hover:border-red-500 hover:text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Delete this spread"
                data-testid="button-delete-current-spread"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-1 ml-4 bg-zinc-800/50 rounded-lg px-1 py-0.5">
                <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="p-1 hover:bg-white/10 rounded">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="w-12 text-center text-[11px] text-zinc-400">{zoom}%</span>
                <button onClick={() => setZoom(z => Math.min(150, z + 10))} className="p-1 hover:bg-white/10 rounded">
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-zinc-700 mx-0.5" />
                <button
                  onClick={() => setCanvasOverview(true)}
                  className="p-1 hover:bg-white/10 text-zinc-400 hover:text-cyan-400 rounded"
                  title="Canvas Overview — see all spreads"
                  data-testid="button-canvas-overview"
                >
                  <MapIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-1 ml-2 border-l border-white/10 pl-2">
                <input
                  ref={spreadAudioInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file || !file.type.startsWith("audio/")) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      setSpreads(prev => prev.map((sp, i) =>
                        i === currentSpreadIndex
                          ? { ...sp, themeMusic: { src: reader.result as string, name: file.name.replace(/\.[^.]+$/, ""), volume: 0.5, loop: true, autoplay: true } }
                          : sp
                      ));
                      toast.success(`Theme music added: ${file.name}`);
                    };
                    reader.readAsDataURL(file);
                    e.target.value = "";
                  }}
                />
                {currentSpread?.themeMusic ? (
                  <>
                    <Music className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] text-emerald-300 max-w-20 truncate">{currentSpread.themeMusic.name}</span>
                    <button
                      onClick={() => {
                        if (spreadAudioRef.current) {
                          if (spreadAudioRef.current.paused) {
                            spreadAudioRef.current.volume = currentSpread.themeMusic!.volume;
                            spreadAudioRef.current.loop = currentSpread.themeMusic!.loop;
                            spreadAudioRef.current.play().catch(() => {});
                          } else {
                            spreadAudioRef.current.pause();
                          }
                        }
                      }}
                      className="p-0.5 hover:bg-white/10"
                      title="Play/Pause theme music"
                      data-testid="button-spread-audio-play"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setSpreads(prev => prev.map((sp, i) => i === currentSpreadIndex ? { ...sp, themeMusic: undefined } : sp))}
                      className="p-0.5 hover:bg-white/10 text-red-400"
                      title="Remove theme music"
                      data-testid="button-spread-audio-remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => spreadAudioInputRef.current?.click()}
                    className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-white/10 text-zinc-400 hover:text-emerald-400 transition text-[10px]"
                    title="Add theme music to this spread"
                    data-testid="button-spread-audio-add"
                  >
                    <Music className="w-3 h-3" /> Theme
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1 ml-2 border-l border-white/10 pl-2">
                <button
                  onClick={() => setShowNarratorPanel(p => !p)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 hover:bg-white/10 transition text-[10px] ${
                    showNarratorPanel ? 'text-amber-400' : (currentSpread?.leftNarration || currentSpread?.rightNarration) ? 'text-amber-300' : 'text-zinc-400 hover:text-amber-400'
                  }`}
                  title="Add narrator caption boxes"
                  data-testid="button-narrator-toggle"
                >
                  <MessageSquareText className="w-3.5 h-3.5" /> Narrator
                </button>
              </div>
            </div>

            {showNarratorPanel && currentSpread && (
              <div className="bg-zinc-900 border border-zinc-700 p-3 mb-2 flex gap-4 items-start" data-testid="narrator-edit-panel">
                <div className="flex gap-2 text-[10px] font-mono mr-2">
                  <button
                    onClick={() => setNarratorEditingSide("left")}
                    className={`px-2 py-1 border ${narratorEditingSide === "left" ? "border-amber-500 text-amber-400 bg-amber-500/10" : "border-zinc-600 text-zinc-400 hover:border-zinc-500"}`}
                    data-testid="button-narrator-left"
                  >LEFT PAGE</button>
                  <button
                    onClick={() => setNarratorEditingSide("right")}
                    className={`px-2 py-1 border ${narratorEditingSide === "right" ? "border-amber-500 text-amber-400 bg-amber-500/10" : "border-zinc-600 text-zinc-400 hover:border-zinc-500"}`}
                    data-testid="button-narrator-right"
                  >RIGHT PAGE</button>
                </div>
                {(() => {
                  const narr = narratorEditingSide === "left" ? currentSpread.leftNarration : currentSpread.rightNarration;
                  const updateNarr = (updates: Partial<NarrationBox>) => {
                    setSpreads(prev => prev.map((sp, i) => {
                      if (i !== currentSpreadIndex) return sp;
                      const key = narratorEditingSide === "left" ? "leftNarration" : "rightNarration";
                      const existing = sp[key] || { text: "", position: "top" as const, style: "caption" as const };
                      return { ...sp, [key]: { ...existing, ...updates } };
                    }));
                  };
                  const clearNarr = () => {
                    setSpreads(prev => prev.map((sp, i) => {
                      if (i !== currentSpreadIndex) return sp;
                      const key = narratorEditingSide === "left" ? "leftNarration" : "rightNarration";
                      return { ...sp, [key]: undefined };
                    }));
                  };
                  return (
                    <div className="flex-1 flex items-start gap-3">
                      <textarea
                        value={narr?.text || ""}
                        onChange={e => updateNarr({ text: e.target.value })}
                        placeholder="Enter narrator text..."
                        className="flex-1 bg-black border border-zinc-600 text-white p-2 text-xs font-mono resize-none h-14 focus:border-amber-500 focus:outline-none"
                        data-testid="input-narrator-text"
                      />
                      <div className="flex flex-col gap-1">
                        <select
                          value={narr?.position || "top"}
                          onChange={e => updateNarr({ position: e.target.value as "top" | "bottom" })}
                          className="bg-black border border-zinc-600 text-white text-[10px] px-1 py-0.5"
                          data-testid="select-narrator-position"
                        >
                          <option value="top">Top</option>
                          <option value="bottom">Bottom</option>
                        </select>
                        <select
                          value={narr?.style || "caption"}
                          onChange={e => updateNarr({ style: e.target.value as "caption" | "thought" | "editorial" })}
                          className="bg-black border border-zinc-600 text-white text-[10px] px-1 py-0.5"
                          data-testid="select-narrator-style"
                        >
                          <option value="caption">Caption</option>
                          <option value="thought">Thought</option>
                          <option value="editorial">Editorial</option>
                        </select>
                        {narr?.text && (
                          <button
                            onClick={clearNarr}
                            className="text-[10px] text-red-400 hover:text-red-300 border border-red-800 px-1 py-0.5"
                            data-testid="button-narrator-clear"
                          >Clear</button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className={`relative ${showPreview ? 'hidden' : ''}`}>
              <div className="text-[11px] font-mono text-zinc-500 mb-3 flex items-center gap-2">
                <span className="text-cyan-400/70">◆</span>
                <span>Spread {currentSpreadIndex + 1}{currentSpreadIndex === 0 && currentSpread?.leftPage.some(p => p.coverRole === "front-cover") ? " — Front Cover" : currentSpread?.isLastPage ? " — Last Page" : ""}</span>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-600">{currentSpread?.leftPage.length || 0}L / {currentSpread?.rightPage.length || 0}R panels</span>
              </div>
            </div>
            <div 
              className={`flex ${isFullscreen ? "gap-1" : "gap-6"} ${showPreview ? 'hidden' : ''}`}
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', filter: 'drop-shadow(0 8px 30px rgba(0,0,0,0.5))' }}
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

                  >
                    {currentSpread.leftPage.map(panel => renderPanel(panel, "left"))}
                    {isDrawingPanel && selectedPage === "left" && renderDrawingPreview()}
                    {renderPolygonOverlay("left")}
                    {renderNarratorOverlay(currentSpread.leftNarration)}
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
                  {selectedPanelId && (
                    <ContextMenuItem onClick={() => addCaptionToPanel("left", selectedPanelId)} className="hover:bg-zinc-800 cursor-pointer">
                      <Square className="w-4 h-4 mr-2" /> Add Caption Box
                    </ContextMenuItem>
                  )}
                  {selectedPanelId && (
                    <ContextMenuItem onClick={() => addTextPanelToPanel("left", selectedPanelId)} className="hover:bg-zinc-800 cursor-pointer" data-testid="menu-add-text-page-left">
                      <AlignJustify className="w-4 h-4 mr-2" /> Add Text Page
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
                  <ContextMenuItem onClick={() => openAIGen()} className="hover:bg-zinc-800 cursor-pointer">
                    <Wand2 className="w-4 h-4 mr-2" /> AI Generate
                  </ContextMenuItem>
                  <ContextMenuSub>
                    <ContextMenuSubTrigger className="hover:bg-zinc-800 cursor-pointer">
                      <Layers className="w-4 h-4 mr-2" /> Asset Library
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="w-48 bg-zinc-900 border-zinc-700 text-white">
                      {assets.slice(0, 6).map(asset => (
                        <ContextMenuItem
                          key={asset.id}
                          onClick={async () => {
                            if (selectedPanelId) {
                              const url = await resolveAssetUrl(asset);
                              const { w, h } = getPanelPixelSize("left", selectedPanelId);
                              addContentToPanel("left", selectedPanelId, {
                                type: "image",
                                transform: { x: 0, y: 0, width: w, height: h, rotation: 0, scaleX: 1, scaleY: 1 },
                                data: { url },
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
                      {assets.length === 0 && (
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
                              projectId: effectiveProjectId
                            }));
                            navigate(`/creator/motion?panel=${panel.id}&return=${encodeURIComponent(location)}`);
                          }
                        }} 
                        className="hover:bg-zinc-800 cursor-pointer"
                      >
                        <Film className="w-4 h-4 mr-2" /> Edit in Motion Studio
                      </ContextMenuItem>
                      <ContextMenuItem 
                        onClick={() => exportPanelToFxStudio("left", selectedPanelId)}
                        className="hover:bg-zinc-800 cursor-pointer"
                        data-testid="button-send-panel-fx-left"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" /> Send to FX Studio
                      </ContextMenuItem>
                      <ContextMenuItem 
                        onClick={() => sendPanelToHop("left", selectedPanelId)}
                        className="hover:bg-zinc-800 cursor-pointer"
                        data-testid="button-send-panel-hop-left"
                      >
                        <Film className="w-4 h-4 mr-2" /> Send to HOP
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
                      <ContextMenuSub>
                        <ContextMenuSubTrigger className="hover:bg-zinc-800 cursor-pointer">
                          <Sparkles className="w-4 h-4 mr-2" /> Panel Filters
                        </ContextMenuSubTrigger>
                        <ContextMenuSubContent className="w-48 bg-zinc-900 border-zinc-700 text-white">
                          {[
                            { name: "None", value: "none" },
                            { name: "Grayscale", value: "grayscale(100%)" },
                            { name: "Sepia", value: "sepia(100%)" },
                            { name: "Vintage", value: "sepia(40%) contrast(110%) brightness(90%)" },
                            { name: "High Contrast", value: "contrast(150%)" },
                            { name: "Low Contrast", value: "contrast(75%)" },
                            { name: "Bright", value: "brightness(130%)" },
                            { name: "Dark", value: "brightness(70%)" },
                            { name: "Saturated", value: "saturate(200%)" },
                            { name: "Desaturated", value: "saturate(50%)" },
                            { name: "Blur", value: "blur(2px)" },
                            { name: "Invert", value: "invert(100%)" },
                            { name: "Warm", value: "sepia(20%) saturate(120%) brightness(105%)" },
                            { name: "Cool", value: "hue-rotate(180deg) saturate(80%)" },
                            { name: "Noir", value: "grayscale(100%) contrast(140%) brightness(90%)" },
                            { name: "Dreamy", value: "blur(1px) brightness(110%) saturate(130%)" },
                          ].map(f => (
                            <ContextMenuItem
                              key={f.value}
                              onClick={() => updatePanelStyle("left", selectedPanelId, { filter: f.value })}
                              className="hover:bg-zinc-800 cursor-pointer"
                            >
                              {f.name}
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

                  >
                    {currentSpread.rightPage.map(panel => renderPanel(panel, "right"))}
                    {isDrawingPanel && selectedPage === "right" && renderDrawingPreview()}
                    {renderPolygonOverlay("right")}
                    {renderNarratorOverlay(currentSpread.rightNarration)}
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
                  {selectedPanelId && (
                    <ContextMenuItem onClick={() => addCaptionToPanel("right", selectedPanelId)} className="hover:bg-zinc-800 cursor-pointer">
                      <Square className="w-4 h-4 mr-2" /> Add Caption Box
                    </ContextMenuItem>
                  )}
                  {selectedPanelId && (
                    <ContextMenuItem onClick={() => addTextPanelToPanel("right", selectedPanelId)} className="hover:bg-zinc-800 cursor-pointer" data-testid="menu-add-text-page-right">
                      <AlignJustify className="w-4 h-4 mr-2" /> Add Text Page
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
                  <ContextMenuItem onClick={() => openAIGen()} className="hover:bg-zinc-800 cursor-pointer">
                    <Wand2 className="w-4 h-4 mr-2" /> AI Generate
                  </ContextMenuItem>
                  <ContextMenuSub>
                    <ContextMenuSubTrigger className="hover:bg-zinc-800 cursor-pointer">
                      <Layers className="w-4 h-4 mr-2" /> Asset Library
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="w-48 bg-zinc-900 border-zinc-700 text-white">
                      {assets.slice(0, 6).map(asset => (
                        <ContextMenuItem
                          key={asset.id}
                          onClick={async () => {
                            if (selectedPanelId) {
                              const url = await resolveAssetUrl(asset);
                              const ctxPanels = selectedPage === "left" ? currentSpread.leftPage : currentSpread.rightPage;
                              const ctxPanel = ctxPanels.find(p => p.id === selectedPanelId);
                              if (ctxPanel?.coverRole && coverDesignData) {
                                const view = ctxPanel.coverRole === "front-cover" ? "front" : "back";
                                const newLayer: CoverImageLayer = {
                                  id: `img_${Date.now()}`,
                                  url,
                                  name: asset.name || "Asset",
                                  transform: { x: 50, y: 50, width: 150, height: 150, rotation: 0, scaleX: 1, scaleY: 1 },
                                  opacity: 1,
                                  locked: false,
                                };
                                const layerKey = `${view}ImageLayers` as keyof CoverData;
                                const existing = (coverDesignData[layerKey] as CoverImageLayer[]) || [];
                                const newOrder = [...(coverDesignData.elementZOrder || []), newLayer.id];
                                updateCoverData({ [layerKey]: [...existing, newLayer], elementZOrder: newOrder });
                                toast.success(`Asset added to ${view} cover`);
                              } else {
                                const { w, h } = getPanelPixelSize(selectedPage, selectedPanelId);
                                addContentToPanel(selectedPage, selectedPanelId, {
                                  type: "image",
                                  transform: { x: 0, y: 0, width: w, height: h, rotation: 0, scaleX: 1, scaleY: 1 },
                                  data: { url },
                                  locked: false,
                                });
                                toast.success("Asset added to panel");
                              }
                            } else {
                              toast.error("Select a panel first");
                            }
                          }}
                          className="hover:bg-zinc-800 cursor-pointer"
                        >
                          {asset.name}
                        </ContextMenuItem>
                      ))}
                      {assets.length === 0 && (
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
                              projectId: effectiveProjectId
                            }));
                            navigate(`/creator/motion?panel=${panel.id}&return=${encodeURIComponent(location)}`);
                          }
                        }} 
                        className="hover:bg-zinc-800 cursor-pointer"
                      >
                        <Film className="w-4 h-4 mr-2" /> Edit in Motion Studio
                      </ContextMenuItem>
                      <ContextMenuItem 
                        onClick={() => exportPanelToFxStudio("right", selectedPanelId)}
                        className="hover:bg-zinc-800 cursor-pointer"
                        data-testid="button-send-panel-fx-right"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" /> Send to FX Studio
                      </ContextMenuItem>
                      <ContextMenuItem 
                        onClick={() => sendPanelToHop("right", selectedPanelId)}
                        className="hover:bg-zinc-800 cursor-pointer"
                        data-testid="button-send-panel-hop-right"
                      >
                        <Film className="w-4 h-4 mr-2" /> Send to HOP
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
                      <ContextMenuSub>
                        <ContextMenuSubTrigger className="hover:bg-zinc-800 cursor-pointer">
                          <Sparkles className="w-4 h-4 mr-2" /> Panel Filters
                        </ContextMenuSubTrigger>
                        <ContextMenuSubContent className="w-48 bg-zinc-900 border-zinc-700 text-white">
                          {[
                            { name: "None", value: "none" },
                            { name: "Grayscale", value: "grayscale(100%)" },
                            { name: "Sepia", value: "sepia(100%)" },
                            { name: "Vintage", value: "sepia(40%) contrast(110%) brightness(90%)" },
                            { name: "High Contrast", value: "contrast(150%)" },
                            { name: "Low Contrast", value: "contrast(75%)" },
                            { name: "Bright", value: "brightness(130%)" },
                            { name: "Dark", value: "brightness(70%)" },
                            { name: "Saturated", value: "saturate(200%)" },
                            { name: "Desaturated", value: "saturate(50%)" },
                            { name: "Blur", value: "blur(2px)" },
                            { name: "Invert", value: "invert(100%)" },
                            { name: "Warm", value: "sepia(20%) saturate(120%) brightness(105%)" },
                            { name: "Cool", value: "hue-rotate(180deg) saturate(80%)" },
                            { name: "Noir", value: "grayscale(100%) contrast(140%) brightness(90%)" },
                            { name: "Dreamy", value: "blur(1px) brightness(110%) saturate(130%)" },
                          ].map(f => (
                            <ContextMenuItem
                              key={f.value}
                              onClick={() => updatePanelStyle("right", selectedPanelId, { filter: f.value })}
                              className="hover:bg-zinc-800 cursor-pointer"
                            >
                              {f.name}
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
                onClick={handleDeleteCurrentSpread}
                disabled={spreads.length <= 1}
                className="px-4 py-2 bg-zinc-800 text-white text-sm flex items-center gap-2 hover:bg-red-900/50 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                data-testid="button-delete-spread-bottom"
              >
                <Trash2 className="w-4 h-4" /> Delete Spread
              </button>
              <button 
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="px-4 py-2 bg-zinc-800 text-white text-sm flex items-center gap-2 hover:bg-zinc-700"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                {isFullscreen ? "Exit Full" : "Full Screen"}
              </button>
            </div>
            </>
            )}
          </main>

          {showLayers && !canvasOverview && (
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
              <div className="flex-1 overflow-auto p-2 space-y-0.5" data-testid="unified-layer-panel">
                {(() => {
                  const pagePanels = selectedPage === "left" ? currentSpread.leftPage : currentSpread.rightPage;
                  const sortedPanels = [...pagePanels].sort((a, b) => b.zIndex - a.zIndex);
                  const layerRowClass = (active: boolean, dragOver: boolean, dimmed?: boolean) =>
                    `px-2 py-1 text-xs cursor-pointer flex items-center gap-1 group/row transition-colors ${
                      active ? 'bg-zinc-600 text-white' : dimmed ? 'bg-zinc-850 text-zinc-500' : 'hover:bg-zinc-800'
                    } ${dragOver ? 'border-t-2 border-cyan-400' : 'border-t-2 border-transparent'}`;
                  const reorderPanels = (fromVisual: number, toVisual: number) => {
                    const fromPanel = sortedPanels[fromVisual];
                    const toPanel = sortedPanels[toVisual];
                    if (!fromPanel || !toPanel) return;
                    const fromArrayIdx = pagePanels.findIndex(p => p.id === fromPanel.id);
                    setSpreads(prev => prev.map((spread, si) => {
                      if (si !== currentSpreadIndex) return spread;
                      const key = selectedPage === "left" ? "leftPage" : "rightPage";
                      const panels = [...spread[key]].map(p => ({ ...p }));
                      const [moved] = panels.splice(fromArrayIdx, 1);
                      const newToIdx = panels.findIndex(p => p.id === toPanel.id);
                      panels.splice(fromVisual < toVisual ? newToIdx + 1 : newToIdx, 0, moved);
                      panels.forEach((p, pi) => { p.zIndex = pi; });
                      return { ...spread, [key]: panels };
                    }));
                  };
                  const panelById = new Map(sortedPanels.map(p => [p.id, p] as const));
                  return (
                    <SortableLayerList
                      ids={sortedPanels.map(p => p.id)}
                      onReorder={reorderPanels}
                      className="space-y-0.5"
                      renderRow={(panelId, { dragHandleProps }) => {
                        const panel = panelById.get(panelId);
                        if (!panel) return null;
                        const isActive = selectedPanelId === panel.id;
                        const originalIdx = pagePanels.findIndex(p => p.id === panel.id);
                        const isCover = !!panel.coverRole;
                        return (
                  <div key={panel.id} data-testid={`layer-group-${panel.id}`}>
                    <div
                      className={`px-2 py-1.5 text-xs cursor-pointer flex items-center gap-1 group ${
                        isActive ? 'bg-white text-black' : panel.hidden ? 'bg-zinc-850 text-zinc-500' : 'bg-zinc-800 hover:bg-zinc-700'
                      }`}
                      onClick={() => { setSelectedPanelId(panel.id); setSelectedContentId(null); }}
                    >
                      <LayerDragHandle dragHandleProps={dragHandleProps} className="flex-shrink-0" />
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePanelVisibility(selectedPage, panel.id); }}
                        className={`p-0.5 flex-shrink-0 ${isActive ? 'hover:bg-zinc-200' : 'hover:bg-zinc-600'} ${panel.hidden ? 'opacity-40' : ''}`}
                        title={panel.hidden ? "Show" : "Hide"}
                        data-testid={`layer-eye-${panel.id}`}
                      >
                        {panel.hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                      {renamingLayerId === panel.id ? (
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => { renamePanel(selectedPage, panel.id, renameValue); setRenamingLayerId(null); }}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') { renamePanel(selectedPage, panel.id, renameValue); setRenamingLayerId(null); }
                            if (e.key === 'Escape') setRenamingLayerId(null);
                          }}
                          className="flex-1 min-w-0 bg-zinc-700 text-white text-xs px-1 py-0.5 border border-cyan-500 outline-none"
                          data-testid={`input-rename-panel-${panel.id}`}
                        />
                      ) : (
                        <span
                          className="flex-1 truncate font-medium"
                          onDoubleClick={(e) => { e.stopPropagation(); setRenamingLayerId(panel.id); setRenameValue(panel.name || (isCover ? (panel.coverRole === "front-cover" ? "Front Cover" : "Back Cover") : `Panel ${originalIdx + 1}`)); }}
                          title="Double-click to rename"
                        >
                          {panel.name || (isCover ? (panel.coverRole === "front-cover" ? "Front Cover" : "Back Cover") : `Panel ${originalIdx + 1}`)}
                        </span>
                      )}
                      {isCover && (
                        <span className={`text-[8px] px-1 py-0.5 font-bold ${panel.coverRole === "front-cover" ? "bg-cyan-600 text-white" : "bg-purple-600 text-white"}`}>
                          {panel.coverRole === "front-cover" ? "FC" : "BC"}
                        </span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePanelLock(selectedPage, panel.id); }}
                        className={`p-0.5 flex-shrink-0 ${isActive ? 'hover:bg-zinc-200' : 'hover:bg-zinc-600'}`}
                        title={panel.locked ? "Unlock" : "Lock"}
                      >
                        {panel.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3 opacity-40 group-hover:opacity-100" />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deletePanel(selectedPage, panel.id); if (isActive) setSelectedPanelId(null); }}
                        className={`p-0.5 flex-shrink-0 ${isActive ? 'hover:bg-red-200 text-red-600' : 'opacity-0 group-hover:opacity-100 hover:bg-red-900 text-red-400'}`}
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    {isActive && showPanelContents && (() => {
                      if (isCover && coverDesignData) {
                        const cd = { ...defaultCover, ...coverDesignData } as CoverData;
                        const isFr = panel.coverRole === "front-cover";
                        const clearFieldMap: Record<string, Partial<CoverData>> = {
                          "cover-banner": { bannerText: "" }, "cover-publisher": { publisherName: "" },
                          "cover-issue": { issueNumber: "", issueDate: "" }, "cover-title": { title: "" },
                          "cover-subtitle": { subtitle: "" }, "cover-tagline": { tagline: "" },
                          "cover-author": { author: "" }, "cover-price": { showPriceBox: false, priceText: "" },
                          "cover-back-title": { title: "" }, "cover-blurb": { backBlurb: "" },
                          "cover-back-author": { author: "" }, "cover-isbn": { isbn: "" }, "cover-back-publisher": { publisherName: "" },
                        };
                        const elToMaster: Record<string, string> = {
                          "cover-banner": "master-banner", "cover-publisher": "master-publisher", "cover-issue": "master-issue",
                          "cover-title": "master-title", "cover-subtitle": "master-subtitle", "cover-tagline": "master-tagline",
                          "cover-author": "master-author", "cover-price": "master-price",
                          "cover-back-title": "master-back-title", "cover-blurb": "master-blurb", "cover-back-author": "master-back-author",
                          "cover-isbn": "master-isbn", "cover-back-publisher": "master-back-publisher",
                        };
                        const frontElements = [
                          { id: "cover-banner", label: "Banner", visible: !!cd.bannerText, icon: "▬" },
                          { id: "cover-publisher", label: "Publisher", visible: !!cd.publisherName, icon: "◈" },
                          { id: "cover-issue", label: "Issue #", visible: !!cd.issueNumber, icon: "#" },
                          { id: "cover-title", label: "Title", visible: !!cd.title, icon: "T" },
                          { id: "cover-subtitle", label: "Subtitle", visible: !!cd.subtitle, icon: "t" },
                          { id: "cover-tagline", label: "Tagline", visible: !!cd.tagline, icon: "✦" },
                          { id: "cover-author", label: "Author", visible: !!cd.author, icon: "A" },
                          { id: "cover-price", label: "Price Box", visible: cd.showPriceBox && !!cd.priceText, icon: "$" },
                        ];
                        const backElements = [
                          { id: "cover-back-title", label: "Title", visible: !!cd.title, icon: "T" },
                          { id: "cover-blurb", label: "Blurb", visible: !!cd.backBlurb, icon: "¶" },
                          { id: "cover-back-author", label: "Author", visible: !!cd.author, icon: "A" },
                          { id: "cover-isbn", label: "ISBN", visible: !!cd.isbn, icon: "▯" },
                          { id: "cover-back-publisher", label: "Publisher", visible: !!cd.publisherName, icon: "◈" },
                        ];
                        const currentOrder = cd.elementZOrder || [];
                        const allElements = isFr ? frontElements : backElements;
                        const visibleEls = allElements.filter(el => el.visible);
                        const sortedEls = [...visibleEls].sort((a, b) => {
                          const aIdx = currentOrder.indexOf(elToMaster[a.id] || "");
                          const bIdx = currentOrder.indexOf(elToMaster[b.id] || "");
                          return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
                        });
                        const textLayers = isFr ? (cd.frontLayers || []) : (cd.backLayers || []);
                        const imageLayers = isFr ? (cd.frontImageLayers || []) : (cd.backImageLayers || []);
                        const deleteCoverEl = (elId: string) => {
                          const updates = clearFieldMap[elId];
                          if (updates) { updateCoverData(updates as any); if (selectedContentId === elId) setSelectedContentId(null); }
                        };
                        const deleteImageLayer = (layerId: string) => {
                          const layerKey = `${isFr ? 'front' : 'back'}ImageLayers` as keyof CoverData;
                          const layers = (cd[layerKey] as CoverImageLayer[]) || [];
                          const newOrder = (cd.elementZOrder || []).filter(id => id !== layerId);
                          updateCoverData({ [layerKey]: layers.filter(l => l.id !== layerId), elementZOrder: newOrder } as any);
                        };
                        const deleteTextLayer = (layerId: string) => {
                          const layerKey = `${isFr ? 'front' : 'back'}Layers` as keyof CoverData;
                          const layers = (cd[layerKey] as CoverTextLayer[]) || [];
                          const newOrder = (cd.elementZOrder || []).filter(id => id !== layerId);
                          updateCoverData({ [layerKey]: layers.filter(l => l.id !== layerId), elementZOrder: newOrder } as any);
                        };
                        const hiddenSet = new Set(cd.hiddenElements || []);
                        const toggleVisibility = (elId: string) => {
                          const next = new Set(hiddenSet);
                          if (next.has(elId)) next.delete(elId); else next.add(elId);
                          updateCoverData({ hiddenElements: Array.from(next) });
                        };
                        const masterMap = new Map(sortedEls.map(el => [elToMaster[el.id] || el.id, el]));
                        const imgMap = new Map(imageLayers.map(il => [il.id, il]));
                        const txtMap = new Map(textLayers.map(tl => [tl.id, tl]));
                        const bgKey = isFr ? "frontImage" : "backImage";
                        const hasBgImage = !!(cd as any)[bgKey];
                        const bgId = `bg-${isFr ? "front" : "back"}`;
                        const allIds = new Set([
                          ...(hasBgImage ? [bgId] : []),
                          ...sortedEls.map(el => elToMaster[el.id] || el.id),
                          ...imageLayers.map(il => il.id),
                          ...textLayers.map(tl => tl.id),
                        ]);
                        const unified = [...currentOrder.filter(id => allIds.has(id))];
                        allIds.forEach(id => { if (!unified.includes(id)) unified.push(id); });
                        const reversedUnified = [...unified].reverse();
                        const reorderCoverElements = (fromIdx: number, toIdx: number) => {
                          if (fromIdx === toIdx) return;
                          const reordered = [...reversedUnified];
                          const [moved] = reordered.splice(fromIdx, 1);
                          reordered.splice(toIdx, 0, moved);
                          const newOrder = [...reordered].reverse();
                          currentOrder.forEach(id => { if (!newOrder.includes(id)) newOrder.push(id); });
                          updateCoverData({ elementZOrder: newOrder });
                        };
                        return (
                          <SortableLayerList
                            ids={reversedUnified}
                            onReorder={reorderCoverElements}
                            className="ml-4 border-l border-zinc-700 space-y-0.5 py-0.5"
                            renderRow={(zId, { dragHandleProps }) => {
                              const isHidden = hiddenSet.has(zId);
                              const masterEl = masterMap.get(zId);
                              if (masterEl) {
                                return (
                                  <div
                                    className={layerRowClass(selectedContentId === masterEl.id, false, isHidden)}
                                    onClick={(e) => { e.stopPropagation(); setSelectedContentId(masterEl.id); }}>
                                    <LayerDragHandle dragHandleProps={dragHandleProps} className="flex-shrink-0" />
                                    <button onClick={(e) => { e.stopPropagation(); toggleVisibility(zId); }}
                                      className="p-0.5 flex-shrink-0 hover:bg-zinc-500" title={isHidden ? "Show" : "Hide"}>
                                      {isHidden ? <EyeOff className="w-2.5 h-2.5 opacity-40" /> : <Eye className="w-2.5 h-2.5" />}
                                    </button>
                                    <span className="w-3 text-center text-[10px] opacity-60">{masterEl.icon}</span>
                                    <span className="flex-1 truncate text-[10px]">{masterEl.label}</span>
                                    <button onClick={(e) => { e.stopPropagation(); deleteCoverEl(masterEl.id); }}
                                      className="p-0.5 opacity-0 group-hover/row:opacity-100 hover:bg-red-900 text-red-400" title="Delete">
                                      <Trash2 className="w-2.5 h-2.5" /></button>
                                  </div>
                                );
                              }
                              const il = imgMap.get(zId);
                              if (il) {
                                return (
                                  <div
                                    className={layerRowClass(selectedContentId === `cover-img-${il.id}`, false, isHidden)}
                                    onClick={(e) => { e.stopPropagation(); setSelectedContentId(`cover-img-${il.id}`); }}>
                                    <LayerDragHandle dragHandleProps={dragHandleProps} className="flex-shrink-0" />
                                    <button onClick={(e) => { e.stopPropagation(); toggleVisibility(zId); }}
                                      className="p-0.5 flex-shrink-0 hover:bg-zinc-500" title={isHidden ? "Show" : "Hide"}>
                                      {isHidden ? <EyeOff className="w-2.5 h-2.5 opacity-40" /> : <Eye className="w-2.5 h-2.5" />}
                                    </button>
                                    <ImageIcon className="w-3 h-3 text-violet-400 opacity-60 shrink-0" />
                                    <span className="flex-1 truncate text-[10px]">{il.name || "Image"}</span>
                                    <button onClick={(e) => { e.stopPropagation(); deleteImageLayer(il.id); }}
                                      className="p-0.5 opacity-0 group-hover/row:opacity-100 hover:bg-red-900 text-red-400" title="Delete">
                                      <Trash2 className="w-2.5 h-2.5" /></button>
                                  </div>
                                );
                              }
                              const tl = txtMap.get(zId);
                              if (tl) {
                                return (
                                  <div
                                    className={layerRowClass(selectedContentId === `cover-txt-${tl.id}`, false, isHidden)}
                                    onClick={(e) => { e.stopPropagation(); setSelectedContentId(`cover-txt-${tl.id}`); }}>
                                    <LayerDragHandle dragHandleProps={dragHandleProps} className="flex-shrink-0" />
                                    <button onClick={(e) => { e.stopPropagation(); toggleVisibility(zId); }}
                                      className="p-0.5 flex-shrink-0 hover:bg-zinc-500" title={isHidden ? "Show" : "Hide"}>
                                      {isHidden ? <EyeOff className="w-2.5 h-2.5 opacity-40" /> : <Eye className="w-2.5 h-2.5" />}
                                    </button>
                                    <Type className="w-3 h-3 text-amber-400 opacity-60 shrink-0" />
                                    <span className="flex-1 truncate text-[10px]" style={{ color: tl.color }}>{tl.text || "Text"}</span>
                                    <button onClick={(e) => { e.stopPropagation(); deleteTextLayer(tl.id); }}
                                      className="p-0.5 opacity-0 group-hover/row:opacity-100 hover:bg-red-900 text-red-400" title="Delete">
                                      <Trash2 className="w-2.5 h-2.5" /></button>
                                  </div>
                                );
                              }
                              if (zId === bgId && hasBgImage) {
                                const bgViewKey = isFr ? "front" : "back";
                                return (
                                  <div
                                    className={layerRowClass(selectedContentId === `cover-bg-${bgViewKey}`, false, isHidden)}
                                    onClick={(e) => { e.stopPropagation(); setSelectedContentId(`cover-bg-${bgViewKey}`); }}
                                    data-testid={`layer-stack-item-${bgId}`}>
                                    <LayerDragHandle dragHandleProps={dragHandleProps} className="flex-shrink-0" />
                                    <button onClick={(e) => { e.stopPropagation(); toggleVisibility(zId); }}
                                      className="p-0.5 flex-shrink-0 hover:bg-zinc-500" title={isHidden ? "Show" : "Hide"}>
                                      {isHidden ? <EyeOff className="w-2.5 h-2.5 opacity-40" /> : <Eye className="w-2.5 h-2.5" />}
                                    </button>
                                    <ImageIcon className="w-3 h-3 text-green-400 opacity-60 shrink-0" />
                                    <span className="flex-1 truncate text-[10px]">{isFr ? "Front" : "Back"} BG</span>
                                    <button onClick={(e) => {
                                        e.stopPropagation();
                                        updateCoverData({ [bgKey]: null, [`${bgViewKey}BgTransform`]: undefined });
                                        if (selectedContentId === `cover-bg-${bgViewKey}`) setSelectedContentId(null);
                                      }}
                                      className="p-0.5 opacity-0 group-hover/row:opacity-100 hover:bg-red-900 text-red-400" title="Delete">
                                      <Trash2 className="w-2.5 h-2.5" /></button>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        );
                      }
                      if (panel.contents.length > 0) {
                        const sortedContents = [...panel.contents].sort((a, b) => b.zIndex - a.zIndex);
                        const contentById = new Map(sortedContents.map(c => [c.id, c] as const));
                        const reorderContents = (fromVisual: number, toVisual: number) => {
                          const fromContent = sortedContents[fromVisual];
                          const toContent = sortedContents[toVisual];
                          if (!fromContent || !toContent) return;
                          const fromArrayIdx = panel.contents.findIndex(c => c.id === fromContent.id);
                          setSpreads(prev => prev.map((spread, si) => {
                            if (si !== currentSpreadIndex) return spread;
                            const key = selectedPage === "left" ? "leftPage" : "rightPage";
                            return {
                              ...spread,
                              [key]: spread[key].map(p => {
                                if (p.id !== panel.id) return p;
                                const contents = [...p.contents].map(c => ({ ...c }));
                                const [moved] = contents.splice(fromArrayIdx, 1);
                                const targetIdx = contents.findIndex(c => c.id === toContent.id);
                                contents.splice(fromVisual < toVisual ? targetIdx + 1 : targetIdx, 0, moved);
                                contents.forEach((c, ci) => { c.zIndex = ci; });
                                return { ...p, contents };
                              })
                            };
                          }));
                        };
                        return (
                          <SortableLayerList
                            ids={sortedContents.map(c => c.id)}
                            onReorder={reorderContents}
                            className="ml-4 border-l border-zinc-700 space-y-0.5 py-0.5"
                            renderRow={(contentId, { dragHandleProps }) => {
                              const content = contentById.get(contentId);
                              if (!content) return null;
                              const isContentActive = selectedContentId === content.id;
                              const typeLabel = content.type === "image" ? "Image" : content.type === "text" ? (content.data?.textPanel ? "Text Page" : "Text") : content.type === "bubble" ? "Bubble" : content.type === "drawing" ? "Drawing" : content.type === "video" ? "Video" : content.type === "audio" ? "Audio" : content.type === "gif" ? "GIF" : content.type;
                              const typeIcon = content.type === "image" || content.type === "gif" ? <ImageIcon className="w-3 h-3 text-violet-400 opacity-60 shrink-0" /> :
                                content.type === "text" || content.type === "bubble" ? <Type className="w-3 h-3 text-amber-400 opacity-60 shrink-0" /> :
                                content.type === "drawing" ? <Pen className="w-3 h-3 text-green-400 opacity-60 shrink-0" /> :
                                content.type === "video" ? <Film className="w-3 h-3 text-blue-400 opacity-60 shrink-0" /> :
                                content.type === "audio" ? <Volume2 className="w-3 h-3 text-emerald-400 opacity-60 shrink-0" /> :
                                <Square className="w-3 h-3 text-zinc-400 opacity-60 shrink-0" />;
                              return (
                              <div
                                className={layerRowClass(isContentActive, false, content.hidden)}
                                onClick={(e) => { e.stopPropagation(); setSelectedContentId(content.id); }}
                              >
                                <LayerDragHandle dragHandleProps={dragHandleProps} className="flex-shrink-0" />
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleContentVisibility(selectedPage, panel.id, content.id); }}
                                  className="p-0.5 flex-shrink-0 hover:bg-zinc-500"
                                  title={content.hidden ? "Show" : "Hide"}
                                >
                                  {content.hidden ? <EyeOff className="w-2.5 h-2.5 opacity-40" /> : <Eye className="w-2.5 h-2.5" />}
                                </button>
                                {typeIcon}
                                {renamingLayerId === content.id ? (
                                  <input
                                    autoFocus
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onBlur={() => { renameContent(selectedPage, panel.id, content.id, renameValue); setRenamingLayerId(null); }}
                                    onKeyDown={(e) => {
                                      e.stopPropagation();
                                      if (e.key === 'Enter') { renameContent(selectedPage, panel.id, content.id, renameValue); setRenamingLayerId(null); }
                                      if (e.key === 'Escape') setRenamingLayerId(null);
                                    }}
                                    className="flex-1 min-w-0 bg-zinc-700 text-white text-[10px] px-1 py-0.5 border border-cyan-500 outline-none"
                                    data-testid={`input-rename-content-${content.id}`}
                                  />
                                ) : (
                                  <span
                                    className="flex-1 truncate text-[10px]"
                                    onDoubleClick={(e) => { e.stopPropagation(); setRenamingLayerId(content.id); setRenameValue(content.name || typeLabel); }}
                                    title="Double-click to rename"
                                  >
                                    {content.name || typeLabel}
                                  </span>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteContentFromPanel(selectedPage, panel.id, content.id); if (isContentActive) setSelectedContentId(null); }}
                                  className="p-0.5 opacity-0 group-hover/row:opacity-100 hover:bg-red-900 text-red-400"
                                  title="Delete"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                              );
                            }}
                          />
                        );
                      }
                      return null;
                    })()}
                    {isActive && (
                      <div className="ml-4 px-2 py-1 flex gap-1 border-l border-zinc-700">
                        <button
                          onClick={(e) => { e.stopPropagation(); setCoverRole(selectedPage, panel.id, panel.coverRole === "front-cover" ? null : "front-cover"); }}
                          className={`flex-1 py-1 text-[9px] font-bold border ${panel.coverRole === "front-cover" ? "bg-cyan-600 text-white border-cyan-500" : "bg-zinc-800 text-zinc-400 border-zinc-600 hover:border-cyan-500 hover:text-cyan-400"}`}
                          data-testid={`cover-set-front-${panel.id}`}
                        >
                          {panel.coverRole === "front-cover" ? "Front Cover" : "Set Front Cover"}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setCoverRole(selectedPage, panel.id, panel.coverRole === "back-cover" ? null : "back-cover"); }}
                          className={`flex-1 py-1 text-[9px] font-bold border ${panel.coverRole === "back-cover" ? "bg-purple-600 text-white border-purple-500" : "bg-zinc-800 text-zinc-400 border-zinc-600 hover:border-purple-500 hover:text-purple-400"}`}
                          data-testid={`cover-set-back-${panel.id}`}
                        >
                          {panel.coverRole === "back-cover" ? "Back Cover" : "Set Back Cover"}
                        </button>
                      </div>
                    )}
                  </div>
                        );
                      }}
                    />
                  );
                })()}
              </div>
              
              {(() => {
                const allPanels = currentSpread ? [...currentSpread.leftPage, ...currentSpread.rightPage] : [];
                const activePanel = allPanels.find(p => p.id === selectedPanelId);
                if (activePanel?.coverRole && coverDesignData) {
                  const fullCoverData = { ...defaultCover, ...coverDesignData } as CoverData;
                  return (
                    <div className="flex-1 overflow-hidden border-t border-zinc-800 flex flex-col">
                      <CoverPropertiesPanel
                        coverData={fullCoverData}
                        updateCover={updateCoverData}
                        coverView={activePanel.coverRole === "front-cover" ? "front" : "back"}
                        selectedLayerId={coverSelectedLayerId}
                        setSelectedLayerId={setCoverSelectedLayerId}
                      />
                      {(() => {
                        const bgViewKey = activePanel.coverRole === "front-cover" ? "front" : "back";
                        const isBgSelected = selectedContentId === `cover-bg-${bgViewKey}`;
                        if (!isBgSelected) return null;
                        const bgTransform = (fullCoverData as any)[`${bgViewKey}BgTransform`] || { x: 0, y: 0, width: 600, height: 900, rotation: 0, scaleX: 1, scaleY: 1 };
                        return (
                          <div className="p-2 border-t border-zinc-700 space-y-2" data-testid="cover-bg-transform">
                            <label className="text-[10px] font-bold uppercase text-green-400">{bgViewKey} Cover Image Transform</label>
                            <div className="grid grid-cols-2 gap-1.5">
                              <div>
                                <label className="text-[9px] text-zinc-500">X %</label>
                                <input type="number" value={Math.round(bgTransform.x)} min={-100} max={200}
                                  onChange={(e) => updateCoverData({ [`${bgViewKey}BgTransform`]: { ...bgTransform, x: Number(e.target.value) } })}
                                  className="w-full bg-zinc-800 border border-zinc-600 text-xs p-1 text-center" />
                              </div>
                              <div>
                                <label className="text-[9px] text-zinc-500">Y %</label>
                                <input type="number" value={Math.round(bgTransform.y)} min={-100} max={200}
                                  onChange={(e) => updateCoverData({ [`${bgViewKey}BgTransform`]: { ...bgTransform, y: Number(e.target.value) } })}
                                  className="w-full bg-zinc-800 border border-zinc-600 text-xs p-1 text-center" />
                              </div>
                              <div>
                                <label className="text-[9px] text-zinc-500">W %</label>
                                <input type="number" value={Math.round(bgTransform.width)} min={10} max={300}
                                  onChange={(e) => updateCoverData({ [`${bgViewKey}BgTransform`]: { ...bgTransform, width: Number(e.target.value) } })}
                                  className="w-full bg-zinc-800 border border-zinc-600 text-xs p-1 text-center" />
                              </div>
                              <div>
                                <label className="text-[9px] text-zinc-500">H %</label>
                                <input type="number" value={Math.round(bgTransform.height)} min={10} max={300}
                                  onChange={(e) => updateCoverData({ [`${bgViewKey}BgTransform`]: { ...bgTransform, height: Number(e.target.value) } })}
                                  className="w-full bg-zinc-800 border border-zinc-600 text-xs p-1 text-center" />
                              </div>
                            </div>
                            <div>
                              <label className="text-[9px] text-zinc-500 flex justify-between"><span>Rotation</span><span>{bgTransform.rotation || 0}°</span></label>
                              <input type="range" min="0" max="360" step="1" value={bgTransform.rotation || 0}
                                onChange={(e) => updateCoverData({ [`${bgViewKey}BgTransform`]: { ...bgTransform, rotation: Number(e.target.value) } })}
                                className="w-full h-1 accent-green-500" />
                            </div>
                            <button onClick={() => updateCoverData({ [`${bgViewKey}BgTransform`]: { x: 0, y: 0, width: 600, height: 900, rotation: 0, scaleX: 1, scaleY: 1 } })}
                              className="w-full py-1 text-[10px] bg-zinc-800 hover:bg-zinc-700 border border-zinc-600">
                              Reset to Fill
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  );
                }
                return null;
              })()}

              {selectedContent && (selectedContent.type === 'text' || selectedContent.type === 'bubble') && selectedPanelId && !(() => {
                const allPanels = currentSpread ? [...currentSpread.leftPage, ...currentSpread.rightPage] : [];
                const activePanel = allPanels.find(p => p.id === selectedPanelId);
                return activePanel?.coverRole;
              })() && (
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
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Formatting</label>
                      <div className="flex gap-1 flex-wrap">
                        <button
                          onClick={() => updateContentStyle(selectedPage, selectedPanelId, selectedContentId!, { 
                            fontWeight: selectedContent.data.fontWeight === "bold" || selectedContent.data.fontWeight === "900" ? "normal" : "bold" 
                          })}
                          className={`p-1.5 border text-xs ${selectedContent.data.fontWeight === "bold" || selectedContent.data.fontWeight === "900" || !selectedContent.data.fontWeight ? "bg-white text-black border-white" : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-500"}`}
                          title="Bold"
                          data-testid="button-bold"
                        >
                          <Bold className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => updateContentStyle(selectedPage, selectedPanelId, selectedContentId!, { 
                            fontStyle: selectedContent.data.fontStyle === "italic" ? "normal" : "italic" 
                          })}
                          className={`p-1.5 border text-xs ${selectedContent.data.fontStyle === "italic" ? "bg-white text-black border-white" : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-500"}`}
                          title="Italic"
                          data-testid="button-italic"
                        >
                          <Italic className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-px bg-zinc-700 mx-0.5" />
                        <button
                          onClick={() => updateContentStyle(selectedPage, selectedPanelId, selectedContentId!, { textAlign: "left" })}
                          className={`p-1.5 border text-xs ${selectedContent.data.textAlign === "left" ? "bg-white text-black border-white" : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-500"}`}
                          title="Align Left"
                          data-testid="button-align-left"
                        >
                          <AlignLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => updateContentStyle(selectedPage, selectedPanelId, selectedContentId!, { textAlign: "center" })}
                          className={`p-1.5 border text-xs ${(!selectedContent.data.textAlign || selectedContent.data.textAlign === "center") ? "bg-white text-black border-white" : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-500"}`}
                          title="Align Center"
                          data-testid="button-align-center"
                        >
                          <AlignCenter className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => updateContentStyle(selectedPage, selectedPanelId, selectedContentId!, { textAlign: "right" })}
                          className={`p-1.5 border text-xs ${selectedContent.data.textAlign === "right" ? "bg-white text-black border-white" : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-500"}`}
                          title="Align Right"
                          data-testid="button-align-right"
                        >
                          <AlignRight className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-px bg-zinc-700 mx-0.5" />
                        <button
                          onClick={() => updateContentStyle(selectedPage, selectedPanelId, selectedContentId!, { 
                            textTransform: selectedContent.data.textTransform === "uppercase" ? "none" : "uppercase" 
                          })}
                          className={`p-1.5 border text-xs ${selectedContent.data.textTransform === "uppercase" ? "bg-white text-black border-white" : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-500"}`}
                          title="UPPERCASE"
                          data-testid="button-uppercase"
                        >
                          <CaseSensitive className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-zinc-400 block mb-1">Line Height</label>
                        <input
                          type="number"
                          min="0.8"
                          max="3"
                          step="0.1"
                          value={selectedContent.data.lineHeight || 1.3}
                          onChange={(e) => updateContentStyle(selectedPage, selectedPanelId, selectedContentId!, { lineHeight: Number(e.target.value) })}
                          className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs p-1.5"
                          data-testid="input-line-height"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-zinc-400 block mb-1">Letter Spacing</label>
                        <input
                          type="number"
                          min="-0.1"
                          max="0.5"
                          step="0.01"
                          value={selectedContent.data.letterSpacing || 0.02}
                          onChange={(e) => updateContentStyle(selectedPage, selectedPanelId, selectedContentId!, { letterSpacing: Number(e.target.value) })}
                          className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs p-1.5"
                          data-testid="input-letter-spacing"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">
                        Text Arch
                        <span className="ml-1 text-zinc-500">({selectedContent.data.textArch || 0})</span>
                      </label>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        step="5"
                        value={selectedContent.data.textArch || 0}
                        onChange={(e) => updateContentStyle(selectedPage, selectedPanelId, selectedContentId!, { textArch: Number(e.target.value) })}
                        className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        data-testid="input-text-arch"
                      />
                      <div className="flex justify-between text-[9px] text-zinc-500 mt-0.5">
                        <span>⌢ Down</span>
                        <button
                          onClick={() => updateContentStyle(selectedPage, selectedPanelId, selectedContentId!, { textArch: 0 })}
                          className="text-zinc-400 hover:text-white"
                          data-testid="button-reset-arch"
                        >
                          Reset
                        </button>
                        <span>⌣ Up</span>
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
                                      </div>
                </div>
              )}

              {selectedContent && (selectedContent.type === 'image' || selectedContent.type === 'gif') && selectedPanelId && (
                <div className="border-t border-zinc-800 p-3">
                  <h4 className="font-bold text-xs mb-3 flex items-center gap-2">
                    <Sparkles className="w-3 h-3" /> Comic Filters
                  </h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    {COMIC_IMAGE_FILTERS.map((f) => {
                      const isActive = (selectedContent.data.filter || "none") === f.filter && 
                        (selectedContent.data.filterOverlay || "") === f.overlay;
                      return (
                        <button
                          key={f.name}
                          onClick={() => updateContentStyle(selectedPage, selectedPanelId, selectedContentId!, { 
                            filter: f.filter, 
                            filterOverlay: f.overlay 
                          })}
                          className={`px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide border transition-colors ${
                            isActive 
                              ? 'bg-white text-black border-white' 
                              : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:border-zinc-500'
                          }`}
                          data-testid={`button-filter-${f.name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {f.name}
                        </button>
                      );
                    })}
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
        <input
          ref={thumbnailInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={handleUploadThumbnail}
        />


        {showTemplates && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-zinc-900 border-2 border-white p-6 w-[700px] max-h-[85vh] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg font-space-grotesk">PANEL TEMPLATES</h3>
                <button onClick={() => setShowTemplates(false)} className="p-2 hover:bg-zinc-800" data-testid="button-close-templates">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-1 flex-wrap mb-4 border-b border-zinc-700 pb-3">
                <button
                  onClick={() => setTemplateFilter("all")}
                  className={`px-3 py-1 text-xs font-bold uppercase ${templateFilter === "all" ? "bg-white text-black" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"}`}
                  data-testid="button-template-filter-all"
                >
                  All
                </button>
                {templateCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setTemplateFilter(cat.id)}
                    className={`px-3 py-1 text-xs font-bold uppercase ${templateFilter === cat.id ? "bg-white text-black" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"}`}
                    data-testid={`button-template-filter-${cat.id}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3 overflow-y-auto flex-1">
                {panelTemplates
                  .filter(t => templateFilter === "all" || t.category === templateFilter)
                  .map(template => (
                  <div key={template.id} className="border border-zinc-700 p-3 hover:border-white cursor-pointer group" data-testid={`template-${template.id}`}>
                    <div className="aspect-[3/4] bg-white mb-2 relative">
                      {template.panels.map((p, i) => (
                        <div key={i} className="absolute bg-zinc-200 border border-zinc-400" 
                             style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.width}%`, height: `${p.height}%` }} />
                      ))}
                    </div>
                    <p className="text-xs font-bold">{template.name}</p>
                    <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100">
                      <button onClick={() => applyTemplate(template, "left")} className="flex-1 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold" data-testid={`button-apply-left-${template.id}`}>Left</button>
                      <button onClick={() => applyTemplate(template, "right")} className="flex-1 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold" data-testid={`button-apply-right-${template.id}`}>Right</button>
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
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-lg"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setPreviewPage(p => Math.min(1 + spreads.length * 2 + comicMeta.bonusCards.length, p + 1))}
                    disabled={previewPage >= 1 + spreads.length * 2 + comicMeta.bonusCards.length}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-lg"
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
                    {hasUsableCoverDesign(coverDesignData) ? (() => {
                      const cd = { ...defaultCover, ...coverDesignData } as CoverData;
                      return (
                        <div className="absolute inset-0" style={{ backgroundColor: cd.frontBgColor }}>
                          {cd.frontImage && <img src={cd.frontImage} className="absolute inset-0 w-full h-full object-cover" />}
                          <div className="relative z-10 w-full h-full flex flex-col">
                            {cd.bannerText && (
                              <div className="w-full py-2 text-center font-bold tracking-widest uppercase text-sm" style={{
                                backgroundColor: cd.bannerBgColor || '#000', color: cd.titleColor, letterSpacing: '0.15em',
                              }}>{cd.bannerText}</div>
                            )}
                            <div className="flex-1 flex flex-col items-center justify-between p-8">
                              <div className="w-full text-center space-y-1">
                                {cd.publisherName && <div className="text-sm font-bold uppercase tracking-wider opacity-80" style={{ color: cd.titleColor }}>{cd.publisherName}</div>}
                                {cd.issueNumber && <div className="text-base font-bold" style={{ color: cd.titleColor }}>{cd.issueNumber}{cd.issueDate && <span className="block text-xs font-normal opacity-70">{cd.issueDate}</span>}</div>}
                              </div>
                              <div className="w-full text-center flex-1 flex flex-col items-center justify-center py-4">
                                <div className="text-center leading-none break-words w-full" style={{
                                  fontFamily: cd.titleFont, color: cd.titleColor, fontSize: `${Math.min(72, cd.titleSize * 1.2)}px`,
                                  fontWeight: cd.titleBold !== false ? 'bold' : 'normal', fontStyle: cd.titleItalic ? 'italic' : 'normal', textTransform: cd.titleUppercase !== false ? 'uppercase' : 'none',
                                  WebkitTextStroke: cd.titleStrokeWidth ? `${cd.titleStrokeWidth}px ${cd.titleStrokeColor || '#000'}` : undefined,
                                  textShadow: '3px 3px 6px rgba(0,0,0,0.6)',
                                }}>{cd.title || "TITLE"}</div>
                                {cd.subtitle && <div className="text-center break-words w-full mt-3" style={{ fontFamily: cd.subtitleFont, color: cd.subtitleColor, fontSize: `${cd.subtitleSize}px`, fontWeight: cd.subtitleBold ? 'bold' : 'normal', fontStyle: cd.subtitleItalic ? 'italic' : 'normal', textTransform: cd.subtitleUppercase ? 'uppercase' : 'none' }}>{cd.subtitle}</div>}
                                {cd.tagline && <div className="italic opacity-80 mt-2 text-center text-sm" style={{ color: cd.subtitleColor }}>{cd.tagline}</div>}
                              </div>
                              <div className="w-full text-center" style={{ fontFamily: cd.authorFont, color: cd.authorColor, fontSize: `${cd.authorSize}px`, fontWeight: cd.authorBold ? 'bold' : 'normal', fontStyle: cd.authorItalic ? 'italic' : 'normal', textTransform: cd.authorUppercase ? 'uppercase' : 'none' }}>{cd.author || "Author"}</div>
                            </div>
                            {cd.showPriceBox && cd.priceText && (
                              <div className="absolute top-4 right-4 w-12 h-12 flex items-center justify-center font-bold text-lg" style={{
                                backgroundColor: cd.priceBoxColor || cd.bannerBgColor || '#FFD700', color: cd.priceBoxTextColor || '#000', border: '2px solid #000',
                                borderRadius: cd.priceBoxShape === 'circle' ? '50%' : undefined,
                                transform: cd.priceBoxShape === 'diamond' ? 'rotate(45deg)' : undefined,
                              }}>
                                <span style={{ transform: cd.priceBoxShape === 'diamond' ? 'rotate(-45deg)' : undefined, display: 'block' }}>
                                  {cd.priceText}
                                </span>
                              </div>
                            )}
                          </div>
                          {(cd.frontImageLayers || []).map(il => (
                            <img key={il.id} src={il.url} alt={il.name} className="absolute pointer-events-none" draggable={false}
                              style={{ left: il.transform.x, top: il.transform.y, width: il.transform.width, height: il.transform.height, opacity: il.opacity ?? 1, mixBlendMode: (il.blendMode || 'normal') as any, transform: `rotate(${il.transform.rotation || 0}deg)` }} />
                          ))}
                          {(cd.frontLayers || []).map(tl => (
                            <div key={tl.id} className="absolute pointer-events-none" style={{
                              left: tl.transform.x, top: tl.transform.y, fontSize: `${tl.fontSize}px`, fontFamily: tl.fontFamily, color: tl.color,
                              fontWeight: tl.fontWeight || 'normal', fontStyle: tl.fontStyle || 'normal', textTransform: (tl.textTransform as any) || 'none',
                            }}>{tl.text}</div>
                          ))}
                        </div>
                      );
                    })() : effectiveFrontCover ? (
                      <img src={effectiveFrontCover} className="absolute inset-0 w-full h-full object-cover" />
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
                  const editorDims = { w: isFullscreen ? 800 : 650, h: isFullscreen ? 1130 : 920 };
                  const PREVIEW_W = 500;
                  const PREVIEW_H = 750;
                  
                  return (
                    <div className="bg-white border-4 border-zinc-800 shadow-2xl relative overflow-hidden" style={{ width: PREVIEW_W, height: PREVIEW_H }}>
                      {panels?.filter(p => !p.hidden).map(panel => {
                        const editorPanelW = (panel.width / 100) * editorDims.w;
                        const editorPanelH = (panel.height / 100) * editorDims.h;
                        return (
                        <div 
                          key={panel.id}
                          className="absolute bg-white overflow-hidden"
                          style={{
                            left: `${panel.x}%`,
                            top: `${panel.y}%`,
                            width: `${panel.width}%`,
                            height: `${panel.height}%`,
                            backgroundColor: panel.backgroundColor || 'white',
                            borderWidth: `${panel.borderWidth || 2}px`,
                            borderColor: panel.borderColor || 'black',
                            borderStyle: 'solid',
                            borderRadius: panel.type === 'circle' ? '50%' : undefined,
                            transform: `rotate(${panel.rotation || 0}deg)`,
                          }}
                        >
                          {panel.coverRole && coverDesignData && (() => {
                            const cd = { ...defaultCover, ...coverDesignData } as CoverData;
                            const isFr = panel.coverRole === "front-cover";
                            const bgC = isFr ? cd.frontBgColor : cd.backBgColor;
                            const bgI = isFr ? cd.frontImage : cd.backImage;
                            return (
                              <div className="absolute inset-0 z-[1]" style={{ backgroundColor: bgC, containerType: 'size' }}>
                                {bgI && <img src={bgI} className="absolute inset-0 w-full h-full object-cover" />}
                                <div className="relative z-10 w-full h-full flex flex-col items-center justify-between p-[5%]">
                                  {isFr ? (
                                    <>
                                      {cd.bannerText && <div className="w-full py-[2%] text-center font-bold tracking-widest uppercase" style={{ backgroundColor: cd.bannerBgColor || '#000', color: cd.titleColor, fontSize: 'max(6px, 2.5cqi)' }}>{cd.bannerText}</div>}
                                      <div className="text-center leading-none break-words w-full" style={{ fontFamily: cd.titleFont, color: cd.titleColor, fontSize: 'max(12px, 8cqi)', textShadow: '2px 2px 4px rgba(0,0,0,0.6)', fontWeight: cd.titleBold !== false ? 'bold' : 'normal', fontStyle: cd.titleItalic ? 'italic' : 'normal', textTransform: cd.titleUppercase !== false ? 'uppercase' : 'none' }}>{cd.title || "TITLE"}</div>
                                      {cd.subtitle && <div className="text-center" style={{ fontFamily: cd.subtitleFont, color: cd.subtitleColor, fontSize: 'max(5px, 3cqi)', fontWeight: cd.subtitleBold ? 'bold' : 'normal', fontStyle: cd.subtitleItalic ? 'italic' : 'normal', textTransform: cd.subtitleUppercase ? 'uppercase' : 'none' }}>{cd.subtitle}</div>}
                                      <div className="text-center" style={{ fontFamily: cd.authorFont, color: cd.authorColor, fontSize: 'max(6px, 3.5cqi)', fontWeight: cd.authorBold ? 'bold' : 'normal', fontStyle: cd.authorItalic ? 'italic' : 'normal', textTransform: cd.authorUppercase ? 'uppercase' : 'none' }}>{cd.author || "Author"}</div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="text-center" style={{ fontFamily: cd.titleFont, color: cd.titleColor, fontSize: 'max(8px, 5cqi)', fontWeight: cd.titleBold !== false ? 'bold' : 'normal', textTransform: cd.titleUppercase !== false ? 'uppercase' : 'none' }}>{cd.title || "TITLE"}</div>
                                      {cd.backBlurb && <div className="leading-relaxed break-words text-center flex-1 overflow-hidden" style={{ fontFamily: cd.backBlurbFont, color: cd.backBlurbColor || cd.authorColor, fontSize: 'max(4px, 2.2cqi)', fontWeight: cd.backBlurbBold ? 'bold' : 'normal', fontStyle: cd.backBlurbItalic ? 'italic' : 'normal' }}>{cd.backBlurb}</div>}
                                      <div className="text-center" style={{ fontFamily: cd.authorFont, color: cd.authorColor, fontSize: 'max(5px, 2.5cqi)', fontWeight: cd.authorBold ? 'bold' : 'normal', fontStyle: cd.authorItalic ? 'italic' : 'normal' }}>by {cd.author || "Author"}</div>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                          {panel.contents.filter(c => !c.hidden).map(content => {
                          const leftPct = editorPanelW > 0 ? (content.transform.x / editorPanelW) * 100 : 0;
                          const topPct = editorPanelH > 0 ? (content.transform.y / editorPanelH) * 100 : 0;
                          const widthPct = editorPanelW > 0 ? (content.transform.width / editorPanelW) * 100 : 100;
                          const heightPct = editorPanelH > 0 ? (content.transform.height / editorPanelH) * 100 : 100;
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
                                <img src={content.data.url} className="w-full h-full object-cover" style={{ filter: content.data.filter || 'none' }} />
                              )}
                              {content.type === "gif" && content.data.url && (
                                <img src={content.data.url} className="w-full h-full object-cover" />
                              )}
                              {content.type === "drawing" && content.data.drawingData && (
                                <img src={content.data.drawingData} className="w-full h-full object-fill" />
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
                      );
                      })}
                      {(!panels || panels.length === 0) && (
                        <div className="absolute inset-0 flex items-center justify-center text-zinc-300">
                          <p className="text-lg">Empty Page</p>
                        </div>
                      )}
                      {renderNarratorOverlay(isLeftPage ? spread?.leftNarration : spread?.rightNarration, true)}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-zinc-400 font-mono">
                        Page {previewPage}
                      </div>
                    </div>
                  );
                })()}

                {previewPage === spreads.length * 2 + 1 && (
                  <div className="w-[500px] h-[750px] bg-black border-4 border-zinc-800 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
                    {hasUsableCoverDesign(coverDesignData) ? (() => {
                      const cd = { ...defaultCover, ...coverDesignData } as CoverData;
                      return (
                        <div className="absolute inset-0" style={{ backgroundColor: cd.backBgColor }}>
                          {cd.backImage && <img src={cd.backImage} className="absolute inset-0 w-full h-full object-cover" />}
                          <div className="relative z-10 w-full h-full flex flex-col items-center p-8">
                            <div className="text-center break-words w-full" style={{
                              fontFamily: cd.titleFont, color: cd.titleColor, fontSize: `${Math.min(36, cd.titleSize * 0.6)}px`,
                              fontWeight: cd.titleBold !== false ? 'bold' : 'normal', textTransform: cd.titleUppercase !== false ? 'uppercase' : 'none',
                              textShadow: '1px 1px 3px rgba(0,0,0,0.5)',
                            }}>{cd.title || "TITLE"}</div>
                            {cd.backBlurb && (
                              <div className="mt-6 leading-relaxed break-words w-full text-center flex-1 overflow-hidden" style={{
                                fontFamily: cd.backBlurbFont || 'Georgia, serif', color: cd.backBlurbColor || cd.authorColor,
                                fontSize: `${cd.backBlurbSize || 14}px`, lineHeight: '1.6',
                                fontWeight: cd.backBlurbBold ? 'bold' : 'normal', fontStyle: cd.backBlurbItalic ? 'italic' : 'normal',
                              }}>{cd.backBlurb}</div>
                            )}
                            <div className="w-full mt-auto pt-4 text-center" style={{ fontFamily: cd.authorFont, color: cd.authorColor, fontSize: `${cd.authorSize}px`, fontWeight: cd.authorBold ? 'bold' : 'normal', fontStyle: cd.authorItalic ? 'italic' : 'normal', textTransform: cd.authorUppercase ? 'uppercase' : 'none' }}>by {cd.author || "Author"}</div>
                            {cd.isbn && (
                              <div className="w-full mt-3 pt-3 text-center" style={{ borderTop: `1px solid ${cd.authorColor}40` }}>
                                {cd.showBarcode !== false && (
                                  <div className="inline-block bg-white p-2 mb-1">
                                    <div style={{ display: 'flex', gap: '1px', height: '30px', alignItems: 'flex-end' }}>
                                      {cd.isbn.split('').map((ch, i) => {
                                        const w = ((parseInt(ch, 10) || 1) % 3) + 1;
                                        return <div key={i} style={{ width: `${w}px`, height: `${60 + ((parseInt(ch, 10) || 0) * 3)}%`, backgroundColor: '#000' }} />;
                                      })}
                                      {Array.from({ length: 8 }).map((_, i) => (
                                        <div key={`p${i}`} style={{ width: '1px', height: `${70 + (i * 3)}%`, backgroundColor: '#000' }} />
                                      ))}
                                    </div>
                                    <div className="font-mono text-[10px] text-black mt-0.5">ISBN {cd.isbn}</div>
                                  </div>
                                )}
                                {cd.showBarcode === false && (
                                  <div className="font-mono opacity-60 text-sm" style={{ color: cd.authorColor }}>ISBN {cd.isbn}</div>
                                )}
                              </div>
                            )}
                            {cd.publisherName && <div className="mt-2 font-bold uppercase tracking-wider opacity-60 text-sm" style={{ color: cd.authorColor }}>{cd.publisherName}</div>}
                          </div>
                          {(cd.backImageLayers || []).map(il => (
                            <img key={il.id} src={il.url} alt={il.name} className="absolute pointer-events-none" draggable={false}
                              style={{ left: il.transform.x, top: il.transform.y, width: il.transform.width, height: il.transform.height, opacity: il.opacity ?? 1, mixBlendMode: (il.blendMode || 'normal') as any, transform: `rotate(${il.transform.rotation || 0}deg)` }} />
                          ))}
                          {(cd.backLayers || []).map(tl => (
                            <div key={tl.id} className="absolute pointer-events-none" style={{
                              left: tl.transform.x, top: tl.transform.y, fontSize: `${tl.fontSize}px`, fontFamily: tl.fontFamily, color: tl.color,
                              fontWeight: tl.fontWeight || 'normal', fontStyle: tl.fontStyle || 'normal', textTransform: (tl.textTransform as any) || 'none',
                            }}>{tl.text}</div>
                          ))}
                        </div>
                      );
                    })() : effectiveBackCover ? (
                      <img src={effectiveBackCover} className="absolute inset-0 w-full h-full object-cover" />
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
      
      <FxStudioStatusBar
        isOpen={fxStudio.isOpen}
        connected={fxStudio.connected}
        activeTarget={fxStudio.activeTarget}
        onFocus={() => fxStudio.openFxStudio()}
        onClose={() => fxStudio.closeFxStudio()}
      />

      <div className="fixed bottom-2 right-2 z-50">
        <div className="relative">
          <button
            onClick={() => setShowSendTo(!showSendTo)}
            className="px-3 py-1.5 text-[10px] font-bold tracking-wider bg-black border border-white/20 text-zinc-400 hover:text-white transition rounded"
            data-testid="button-send-to-comic"
          >
            SEND TO ▸
          </button>
          {showSendTo && (
            <div className="absolute right-0 bottom-full mb-1">
              <SendToMenu projectId={projectId || undefined} contentType="comic" onClose={() => setShowSendTo(false)} />
            </div>
          )}
        </div>
      </div>

      {showAssetLibrary && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border-2 border-white w-[700px] max-h-[80vh] h-[500px] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-zinc-700">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Layers className="w-5 h-5" /> Asset Library
              </h3>
              <div className="flex items-center gap-2">
                <div className="flex bg-zinc-800 rounded-lg p-0.5">
                  <button
                    onClick={() => setAssetLibraryTab("library")}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition ${assetLibraryTab === "library" ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
                    data-testid="button-asset-tab-library"
                  >
                    My Library
                  </button>
                  <button
                    onClick={() => setAssetLibraryTab("fx-studio")}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition flex items-center gap-1 ${assetLibraryTab === "fx-studio" ? "bg-purple-600 text-white" : "text-purple-400 hover:text-purple-300"}`}
                    data-testid="button-asset-tab-fx"
                  >
                    <Sparkles className="w-3 h-3" /> FX Studio
                  </button>
                </div>
                <button 
                  onClick={() => setShowAssetLibrary(false)}
                  className="p-1 hover:bg-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {assetLibraryTab === "library" ? (
              <>
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
                          onClick={async () => {
                            if (selectedPanelId) {
                              const url = await resolveAssetUrl(asset);
                              const panels = selectedPage === "left" ? currentSpread.leftPage : currentSpread.rightPage;
                              const targetPanel = panels.find(p => p.id === selectedPanelId);
                              if (targetPanel?.coverRole && coverDesignData) {
                                const view = targetPanel.coverRole === "front-cover" ? "front" : "back";
                                const newLayer: CoverImageLayer = {
                                  id: `img_${Date.now()}`,
                                  url,
                                  name: asset.name || "Asset",
                                  transform: { x: 50, y: 50, width: 150, height: 150, rotation: 0, scaleX: 1, scaleY: 1 },
                                  opacity: 1,
                                  locked: false,
                                };
                                const layerKey = `${view}ImageLayers` as keyof CoverData;
                                const existing = (coverDesignData[layerKey] as CoverImageLayer[]) || [];
                                const newOrder = [...(coverDesignData.elementZOrder || []), newLayer.id];
                                updateCoverData({ [layerKey]: [...existing, newLayer], elementZOrder: newOrder });
                                toast.success(`Asset added to ${view} cover`);
                              } else {
                                const { w, h } = getPanelPixelSize(selectedPage, selectedPanelId);
                                addContentToPanel(selectedPage, selectedPanelId, {
                                  type: "image",
                                  transform: { x: 0, y: 0, width: w, height: h, rotation: 0, scaleX: 1, scaleY: 1 },
                                  data: { url },
                                  locked: false,
                                });
                                toast.success("Asset added to panel");
                              }
                              setShowAssetLibrary(false);
                            } else {
                              toast.error("Select a panel first");
                            }
                          }}
                          className={`group relative aspect-square bg-zinc-800 border border-zinc-700 hover:border-white overflow-hidden cursor-grab active:cursor-grabbing ${draggedAssetId === asset.id ? 'opacity-50' : ''}`}
                        >
                          {(asset.thumbnail || asset.url) ? (
                            <img src={asset.thumbnail || asset.url} loading="lazy" className="w-full h-full object-cover pointer-events-none" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {asset.type === "effect" ? (
                                <Sparkles className="w-8 h-8 text-purple-500/50" />
                              ) : (
                                <ImageIcon className="w-8 h-8 text-zinc-600" />
                              )}
                            </div>
                          )}
                          {asset.type === "effect" && (
                            <div className="absolute top-1 right-1 bg-purple-600/80 rounded px-1 py-0.5">
                              <Sparkles className="w-2.5 h-2.5 text-white" />
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
                          <p className="text-xs mt-1">Import images or browse FX Studio effects</p>
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
              </>
            ) : (
              <FxBrowserPanel
                onClose={() => setAssetLibraryTab("library")}
                onApplyToPanel={applyFxToPanel}
                onReturnToPanel={returnFxToPanel}
                onOpenEmbedded={(mode) => {
                  setShowAssetLibrary(false);
                  fxStudio.openFxStudio({ mode: mode || "fx" });
                }}
                projectId={effectiveProjectId || undefined}
              />
            )}
          </div>
        </div>
      )}

      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => { setShowUpgradeModal(false); setUpgradeUsageInfo(undefined); }} 
        feature={upgradeFeature}
        requiredTier={upgradeFeature === "AI Generation" ? "creator" : "pro"}
        usageInfo={upgradeUsageInfo}
      />

      <ProFeatureDiscovery
        isOpen={discoveryOpen}
        onClose={closeDiscovery}
        featureKey={discoveryFeature}
      />

      {showWatermarkBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-amber-500/95 text-black px-4 py-3 flex items-center justify-between" data-testid="banner-watermark">
          <div className="flex items-center gap-3">
            <Crown className="w-5 h-5" />
            <span className="text-sm font-black">Your export includes a watermark</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/pricing")}
              className="px-4 py-1.5 bg-black text-white font-black text-xs uppercase hover:bg-zinc-800 transition-colors"
              data-testid="button-watermark-upgrade"
            >
              Upgrade to Pro — Remove watermark
            </button>
            <button
              onClick={() => setShowWatermarkBanner(false)}
              className="p-1 hover:bg-amber-600 transition-colors"
              data-testid="button-watermark-dismiss"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {currentSpread?.themeMusic && (
        <audio
          ref={spreadAudioRef}
          src={currentSpread.themeMusic.src}
          loop={currentSpread.themeMusic.loop}
          autoPlay={currentSpread.themeMusic.autoplay}
          className="hidden"
        />
      )}

      {liveResult && (
        <YouAreLiveModal
          publishResult={liveResult}
          onClose={() => setLiveResult(null)}
        />
      )}

      <FirstProjectGuide editorType="comic" userId={user?.id} />
    </Layout>
  );
}
