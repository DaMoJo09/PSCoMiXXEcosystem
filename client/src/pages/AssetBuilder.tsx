import { Layout } from "@/components/layout/Layout";
import { 
  ArrowLeft, Save, Download, Plus, Trash2, Copy, Wand2, Type, Circle, Square,
  Cloud, Star, Zap, MessageSquare, MessageCircle, Hexagon, Triangle, Palette,
  Move, RotateCcw, Maximize2, Layers, FolderOpen, Search, Grid, List, Filter
} from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useAssetLibrary } from "@/contexts/AssetLibraryContext";
import { TransformableElement, TransformState } from "@/components/tools/TransformableElement";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";

type BubbleShape = "oval" | "rounded" | "cloud" | "thought" | "shout" | "starburst" | "rectangle" | "hexagon" | "triangle";
type EffectType = "pow" | "boom" | "zap" | "bang" | "crash" | "wham" | "custom";

interface BubbleElement {
  id: string;
  type: "bubble" | "effect" | "text";
  shape?: BubbleShape;
  effectType?: EffectType;
  text: string;
  transform: TransformState;
  style: {
    fillColor: string;
    strokeColor: string;
    strokeWidth: number;
    tailDirection: "none" | "left" | "right" | "bottom" | "top";
    tailSize: number;
    font: string;
    fontSize: number;
    fontWeight: string;
    textColor: string;
    shadowEnabled: boolean;
    shadowColor: string;
    shadowBlur: number;
    outlineEnabled: boolean;
    outlineColor: string;
    outlineWidth: number;
    spikes?: number;
    innerRadius?: number;
  };
}

interface SavedAsset {
  id: string;
  name: string;
  type: "bubble" | "effect";
  thumbnail: string;
  elements: BubbleElement[];
  createdAt: Date;
}

const bubbleShapes: { id: BubbleShape; name: string; icon: React.ElementType }[] = [
  { id: "oval", name: "Oval", icon: Circle },
  { id: "rounded", name: "Rounded", icon: Square },
  { id: "cloud", name: "Cloud", icon: Cloud },
  { id: "thought", name: "Thought", icon: MessageCircle },
  { id: "shout", name: "Shout", icon: Star },
  { id: "starburst", name: "Starburst", icon: Zap },
  { id: "rectangle", name: "Rectangle", icon: Square },
  { id: "hexagon", name: "Hexagon", icon: Hexagon },
  { id: "triangle", name: "Triangle", icon: Triangle },
];

const effectPresets: { id: EffectType; name: string; text: string; colors: { fill: string; stroke: string; text: string } }[] = [
  { id: "pow", name: "POW!", text: "POW!", colors: { fill: "#ffffff", stroke: "#000000", text: "#000000" } },
  { id: "boom", name: "BOOM!", text: "BOOM!", colors: { fill: "#ffffff", stroke: "#000000", text: "#000000" } },
  { id: "zap", name: "ZAP!", text: "ZAP!", colors: { fill: "#ffffff", stroke: "#000000", text: "#000000" } },
  { id: "bang", name: "BANG!", text: "BANG!", colors: { fill: "#ffffff", stroke: "#000000", text: "#000000" } },
  { id: "crash", name: "CRASH!", text: "CRASH!", colors: { fill: "#ffffff", stroke: "#000000", text: "#000000" } },
  { id: "wham", name: "WHAM!", text: "WHAM!", colors: { fill: "#ffffff", stroke: "#000000", text: "#000000" } },
  { id: "custom", name: "Custom", text: "WOW!", colors: { fill: "#ffffff", stroke: "#000000", text: "#000000" } },
];

const fontOptions = [
  "Bangers",
  "Permanent Marker",
  "Luckiest Guy",
  "Londrina Solid",
  "Londrina Sketch",
  "Kranky",
  "Gloria Hallelujah",
  "Caveat",
  "Rock Salt",
  "Bungee",
  "Black Ops One",
  "Russo One",
  "Righteous",
  "Bebas Neue",
  "Anton",
  "Oswald",
  "Titan One",
  "Alfa Slab One",
  "Sigmar One",
  "Ultra",
  "Archivo Black",
  "Carter One",
  "Passion One",
  "Lilita One",
  "Dela Gothic One",
  "Audiowide",
  "Orbitron",
  "Press Start 2P",
  "Silkscreen",
  "VT323",
  "Share Tech Mono",
  "Rubik Mono One",
  "Fugaz One",
  "Racing Sans One",
  "Faster One",
  "Rampart One",
  "Creepster",
  "Nosifer",
  "Metal Mania",
  "Butcherman",
  "Eater",
  "Special Elite",
  "Rye",
  "Fascinate Inline",
  "Monoton",
  "Satisfy",
  "Pacifico",
  "Lobster",
  "Shadows Into Light",
  "Amatic SC",
  "Fredoka",
  "Bowlby One SC",
  "Jua",
  "Impact",
  "Arial Black",
  "Georgia",
  "Courier New",
  "JetBrains Mono",
  "Inter",
  "Space Grotesk",
];

export default function AssetBuilder() {
  const { addAsset } = useAssetLibrary();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [activeTab, setActiveTab] = useState<"bubbles" | "effects" | "library">("bubbles");
  const [elements, setElements] = useState<BubbleElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedAssets, setSavedAssets] = useState<SavedAsset[]>([]);
  const [assetName, setAssetName] = useState("Untitled Asset");
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 300 });
  const [showGrid, setShowGrid] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  const selectedElement = elements.find(e => e.id === selectedId);

  const addBubble = (shape: BubbleShape) => {
    const newElement: BubbleElement = {
      id: `bubble_${Date.now()}`,
      type: "bubble",
      shape,
      text: "Text here...",
      transform: {
        x: canvasSize.width / 2 - 80,
        y: canvasSize.height / 2 - 50,
        width: 160,
        height: 100,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      },
      style: {
        fillColor: "#ffffff",
        strokeColor: "#000000",
        strokeWidth: 3,
        tailDirection: "bottom",
        tailSize: 20,
        font: "Impact",
        fontSize: 18,
        fontWeight: "bold",
        textColor: "#000000",
        shadowEnabled: false,
        shadowColor: "#000000",
        shadowBlur: 4,
        outlineEnabled: true,
        outlineColor: "#000000",
        outlineWidth: 2,
      },
    };
    setElements(prev => [...prev, newElement]);
    setSelectedId(newElement.id);
    toast.success(`${shape} bubble added`);
  };

  const addEffect = (preset: typeof effectPresets[0]) => {
    const newElement: BubbleElement = {
      id: `effect_${Date.now()}`,
      type: "effect",
      effectType: preset.id,
      text: preset.text,
      transform: {
        x: canvasSize.width / 2 - 100,
        y: canvasSize.height / 2 - 60,
        width: 200,
        height: 120,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      },
      style: {
        fillColor: preset.colors.fill,
        strokeColor: preset.colors.stroke,
        strokeWidth: 4,
        tailDirection: "none",
        tailSize: 0,
        font: "Impact",
        fontSize: 48,
        fontWeight: "bold",
        textColor: preset.colors.text,
        shadowEnabled: true,
        shadowColor: "#000000",
        shadowBlur: 0,
        outlineEnabled: true,
        outlineColor: "#000000",
        outlineWidth: 4,
        spikes: 12,
        innerRadius: 0.5,
      },
    };
    setElements(prev => [...prev, newElement]);
    setSelectedId(newElement.id);
    toast.success(`${preset.name} effect added`);
  };

  const updateElement = (id: string, updates: Partial<BubbleElement>) => {
    setElements(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const updateElementStyle = (id: string, styleUpdates: Partial<BubbleElement["style"]>) => {
    setElements(prev => prev.map(e => 
      e.id === id ? { ...e, style: { ...e.style, ...styleUpdates } } : e
    ));
  };

  const deleteElement = (id: string) => {
    setElements(prev => prev.filter(e => e.id !== id));
    if (selectedId === id) setSelectedId(null);
    toast.success("Element deleted");
  };

  const duplicateElement = (id: string) => {
    const original = elements.find(e => e.id === id);
    if (!original) return;
    const newElement: BubbleElement = {
      ...original,
      id: `${original.type}_${Date.now()}`,
      transform: {
        ...original.transform,
        x: original.transform.x + 20,
        y: original.transform.y + 20,
      },
    };
    setElements(prev => [...prev, newElement]);
    setSelectedId(newElement.id);
    toast.success("Element duplicated");
  };

  const renderBubbleSVG = (element: BubbleElement) => {
    const { shape, style, transform } = element;
    const { width, height } = transform;
    const { strokeWidth, fillColor, strokeColor, tailDirection, tailSize } = style;
    
    let path = "";
    
    switch (shape) {
      case "oval":
        path = `M ${width/2} ${strokeWidth} 
                A ${width/2 - strokeWidth} ${height/2 - strokeWidth - (tailDirection === "bottom" ? tailSize/2 : 0)} 0 1 1 ${width/2} ${height - strokeWidth - (tailDirection === "bottom" ? tailSize : 0)}
                A ${width/2 - strokeWidth} ${height/2 - strokeWidth - (tailDirection === "bottom" ? tailSize/2 : 0)} 0 1 1 ${width/2} ${strokeWidth}`;
        break;
      case "rounded":
        const r = 15;
        const h = height - (tailDirection === "bottom" ? tailSize : 0);
        path = `M ${r + strokeWidth} ${strokeWidth}
                H ${width - r - strokeWidth}
                A ${r} ${r} 0 0 1 ${width - strokeWidth} ${r + strokeWidth}
                V ${h - r - strokeWidth}
                A ${r} ${r} 0 0 1 ${width - r - strokeWidth} ${h - strokeWidth}
                H ${r + strokeWidth}
                A ${r} ${r} 0 0 1 ${strokeWidth} ${h - r - strokeWidth}
                V ${r + strokeWidth}
                A ${r} ${r} 0 0 1 ${r + strokeWidth} ${strokeWidth}`;
        break;
      case "cloud":
        const cloudH = height - (tailDirection === "bottom" ? tailSize : 0);
        const bumps = 8;
        const bumpRadius = width / bumps * 0.8;
        let cloudPath = `M ${strokeWidth + bumpRadius} ${cloudH - strokeWidth}`;
        for (let i = 0; i < bumps; i++) {
          const x = strokeWidth + bumpRadius + (i * (width - 2*strokeWidth - 2*bumpRadius) / (bumps - 1));
          const y = i % 2 === 0 ? strokeWidth + bumpRadius/2 : strokeWidth + bumpRadius;
          cloudPath += ` Q ${x} ${y} ${x + bumpRadius/2} ${cloudH/2}`;
        }
        cloudPath += ` Q ${width - strokeWidth} ${cloudH/2} ${width - strokeWidth - bumpRadius} ${cloudH - strokeWidth}`;
        path = cloudPath;
        break;
      case "thought":
        const thoughtH = height - tailSize;
        path = `M ${width/2} ${strokeWidth} 
                Q ${width - strokeWidth} ${strokeWidth} ${width - strokeWidth} ${thoughtH/2}
                Q ${width - strokeWidth} ${thoughtH - strokeWidth} ${width/2} ${thoughtH - strokeWidth}
                Q ${strokeWidth} ${thoughtH - strokeWidth} ${strokeWidth} ${thoughtH/2}
                Q ${strokeWidth} ${strokeWidth} ${width/2} ${strokeWidth}`;
        break;
      case "starburst":
      case "shout":
        const spikes = style.spikes || 12;
        const cx = width / 2;
        const cy = (height - (tailDirection === "bottom" ? tailSize : 0)) / 2;
        const outerR = Math.min(cx, cy) - strokeWidth;
        const innerR = outerR * (style.innerRadius || 0.6);
        let starPath = "";
        for (let i = 0; i < spikes * 2; i++) {
          const r = i % 2 === 0 ? outerR : innerR;
          const angle = (i * Math.PI / spikes) - Math.PI / 2;
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          starPath += (i === 0 ? "M" : "L") + ` ${x} ${y}`;
        }
        starPath += " Z";
        path = starPath;
        break;
      case "rectangle":
        const rectH = height - (tailDirection === "bottom" ? tailSize : 0);
        path = `M ${strokeWidth} ${strokeWidth}
                H ${width - strokeWidth}
                V ${rectH - strokeWidth}
                H ${strokeWidth}
                Z`;
        break;
      case "hexagon":
        const hexH = height - (tailDirection === "bottom" ? tailSize : 0);
        const hexW = width;
        path = `M ${hexW/4} ${strokeWidth}
                L ${hexW*3/4} ${strokeWidth}
                L ${hexW - strokeWidth} ${hexH/2}
                L ${hexW*3/4} ${hexH - strokeWidth}
                L ${hexW/4} ${hexH - strokeWidth}
                L ${strokeWidth} ${hexH/2}
                Z`;
        break;
      case "triangle":
        const triH = height - (tailDirection === "bottom" ? tailSize : 0);
        path = `M ${width/2} ${strokeWidth}
                L ${width - strokeWidth} ${triH - strokeWidth}
                L ${strokeWidth} ${triH - strokeWidth}
                Z`;
        break;
    }

    let tailPath = "";
    if (tailDirection !== "none" && tailSize > 0) {
      const baseH = height - tailSize;
      switch (tailDirection) {
        case "bottom":
          tailPath = `M ${width/2 - 10} ${baseH} L ${width/2} ${height} L ${width/2 + 10} ${baseH}`;
          break;
        case "left":
          tailPath = `M ${strokeWidth} ${height/2 - 10} L ${-tailSize} ${height/2} L ${strokeWidth} ${height/2 + 10}`;
          break;
        case "right":
          tailPath = `M ${width - strokeWidth} ${height/2 - 10} L ${width + tailSize} ${height/2} L ${width - strokeWidth} ${height/2 + 10}`;
          break;
        case "top":
          tailPath = `M ${width/2 - 10} ${strokeWidth} L ${width/2} ${-tailSize} L ${width/2 + 10} ${strokeWidth}`;
          break;
      }
    }

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
        <defs>
          {style.shadowEnabled && (
            <filter id={`shadow-${element.id}`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="2" dy="2" stdDeviation={style.shadowBlur} floodColor={style.shadowColor} />
            </filter>
          )}
        </defs>
        <g filter={style.shadowEnabled ? `url(#shadow-${element.id})` : undefined}>
          <path 
            d={path} 
            fill={fillColor} 
            stroke={strokeColor} 
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {tailPath && (
            <path 
              d={tailPath} 
              fill={fillColor} 
              stroke={strokeColor} 
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
            />
          )}
        </g>
      </svg>
    );
  };

  const renderEffectSVG = (element: BubbleElement) => {
    const { style, transform } = element;
    const { width, height } = transform;
    const spikes = style.spikes || 12;
    const cx = width / 2;
    const cy = height / 2;
    const outerR = Math.min(cx, cy) - style.strokeWidth;
    const innerR = outerR * (style.innerRadius || 0.5);
    
    let path = "";
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI / spikes) - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      path += (i === 0 ? "M" : "L") + ` ${x} ${y}`;
    }
    path += " Z";

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
        <defs>
          {style.shadowEnabled && (
            <filter id={`effect-shadow-${element.id}`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="3" dy="3" stdDeviation={style.shadowBlur} floodColor={style.shadowColor} />
            </filter>
          )}
        </defs>
        <g filter={style.shadowEnabled ? `url(#effect-shadow-${element.id})` : undefined}>
          <path 
            d={path} 
            fill={style.fillColor} 
            stroke={style.strokeColor} 
            strokeWidth={style.strokeWidth}
            strokeLinejoin="round"
          />
        </g>
      </svg>
    );
  };

  const saveAsset = async () => {
    if (elements.length === 0) {
      toast.error("Add some elements first");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = canvasSize.width * 2;
    canvas.height = canvasSize.height * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(2, 2);
    ctx.fillStyle = "transparent";
    
    const thumbnail = canvas.toDataURL("image/png");
    
    const newAsset: SavedAsset = {
      id: `asset_${Date.now()}`,
      name: assetName,
      type: elements.some(e => e.type === "effect") ? "effect" : "bubble",
      thumbnail,
      elements: [...elements],
      createdAt: new Date(),
    };
    
    setSavedAssets(prev => [...prev, newAsset]);
    
    addAsset({
      name: assetName,
      type: "sprite",
      url: thumbnail,
      folderId: "effects",
      tags: [elements[0]?.type || "bubble"],
    });
    
    toast.success("Asset saved to library!");
  };

  const loadAsset = (asset: SavedAsset) => {
    setElements([...asset.elements]);
    setAssetName(asset.name);
    setActiveTab(asset.type === "effect" ? "effects" : "bubbles");
    toast.success(`Loaded: ${asset.name}`);
  };

  const deleteAsset = (assetId: string) => {
    setSavedAssets(prev => prev.filter(a => a.id !== assetId));
    toast.success("Asset deleted");
  };

  const filteredAssets = savedAssets.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              className="font-display font-bold text-lg bg-transparent border-none outline-none hover:bg-zinc-800 px-2 py-1"
              data-testid="input-asset-name"
            />
            <span className="text-xs font-mono text-zinc-500">Asset Builder</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2 ${showGrid ? 'bg-white text-black' : 'hover:bg-zinc-800'}`}
              title="Toggle Grid"
            >
              <Grid className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-zinc-700 mx-2" />
            <button
              onClick={saveAsset}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-medium flex items-center gap-2"
              data-testid="button-save-asset"
            >
              <Save className="w-4 h-4" /> Save to Library
            </button>
            <button className="px-4 py-2 bg-white text-black text-sm font-bold flex items-center gap-2 hover:bg-zinc-200">
              <Download className="w-4 h-4" /> Export PNG
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <aside className="w-72 border-r border-zinc-800 flex flex-col bg-zinc-900">
            <div className="border-b border-zinc-800">
              <div className="flex">
                {(["bubbles", "effects", "library"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 text-sm font-medium capitalize ${
                      activeTab === tab ? 'bg-white text-black' : 'hover:bg-zinc-800'
                    }`}
                    data-testid={`tab-${tab}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === "bubbles" && (
                <div className="space-y-4">
                  <h3 className="text-xs font-mono text-zinc-500 uppercase">Bubble Shapes</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {bubbleShapes.map(shape => (
                      <button
                        key={shape.id}
                        onClick={() => addBubble(shape.id)}
                        className="p-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex flex-col items-center gap-1 aspect-square"
                        data-testid={`bubble-${shape.id}`}
                      >
                        <shape.icon className="w-6 h-6" />
                        <span className="text-[10px] font-mono">{shape.name}</span>
                      </button>
                    ))}
                  </div>

                  <h3 className="text-xs font-mono text-zinc-500 uppercase mt-6">Tail Direction</h3>
                  <div className="flex gap-2">
                    {["none", "left", "right", "bottom", "top"].map(dir => (
                      <button
                        key={dir}
                        onClick={() => selectedId && updateElementStyle(selectedId, { tailDirection: dir as any })}
                        className={`flex-1 py-2 text-xs font-mono ${
                          selectedElement?.style.tailDirection === dir 
                            ? 'bg-white text-black' 
                            : 'bg-zinc-800 hover:bg-zinc-700'
                        }`}
                        disabled={!selectedId}
                      >
                        {dir}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "effects" && (
                <div className="space-y-4">
                  <h3 className="text-xs font-mono text-zinc-500 uppercase">Effect Presets</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {effectPresets.map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => addEffect(preset)}
                        className="p-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex flex-col items-center gap-1"
                        data-testid={`effect-${preset.id}`}
                      >
                        <Zap className="w-5 h-5" />
                        <span className="text-sm font-bold">{preset.text}</span>
                      </button>
                    ))}
                  </div>

                  {selectedElement?.type === "effect" && (
                    <>
                      <h3 className="text-xs font-mono text-zinc-500 uppercase mt-6">Spikes</h3>
                      <input
                        type="range"
                        min="4"
                        max="24"
                        value={selectedElement.style.spikes || 12}
                        onChange={(e) => updateElementStyle(selectedId!, { spikes: parseInt(e.target.value) })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-zinc-500">
                        <span>4</span>
                        <span>{selectedElement.style.spikes || 12}</span>
                        <span>24</span>
                      </div>

                      <h3 className="text-xs font-mono text-zinc-500 uppercase mt-4">Inner Radius</h3>
                      <input
                        type="range"
                        min="20"
                        max="80"
                        value={(selectedElement.style.innerRadius || 0.5) * 100}
                        onChange={(e) => updateElementStyle(selectedId!, { innerRadius: parseInt(e.target.value) / 100 })}
                        className="w-full"
                      />
                    </>
                  )}
                </div>
              )}

              {activeTab === "library" && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search assets..."
                        className="w-full pl-8 pr-3 py-2 bg-zinc-800 border border-zinc-700 text-sm"
                        data-testid="input-search-assets"
                      />
                    </div>
                    <button
                      onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                      className="p-2 bg-zinc-800 hover:bg-zinc-700"
                    >
                      {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
                    </button>
                  </div>

                  {filteredAssets.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500">
                      <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No saved assets yet</p>
                      <p className="text-xs">Create bubbles or effects and save them here</p>
                    </div>
                  ) : (
                    <div className={viewMode === "grid" ? "grid grid-cols-2 gap-2" : "space-y-2"}>
                      {filteredAssets.map(asset => (
                        <div
                          key={asset.id}
                          className="bg-zinc-800 border border-zinc-700 overflow-hidden hover:border-zinc-500 cursor-pointer group"
                          onClick={() => loadAsset(asset)}
                          data-testid={`asset-${asset.id}`}
                        >
                          <div className="aspect-video bg-zinc-700 flex items-center justify-center">
                            {asset.type === "bubble" ? (
                              <MessageSquare className="w-8 h-8 text-zinc-500" />
                            ) : (
                              <Zap className="w-8 h-8 text-zinc-500" />
                            )}
                          </div>
                          <div className="p-2 flex justify-between items-center">
                            <span className="text-xs font-mono truncate">{asset.name}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteAsset(asset.id); }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 text-red-400"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>

          <main className="flex-1 flex flex-col bg-zinc-900">
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div 
                  ref={canvasRef}
                  className="flex-1 overflow-auto p-8 flex items-center justify-center"
                  onClick={() => setSelectedId(null)}
                >
                  <div 
                    className="relative bg-white border-2 border-zinc-600"
                    style={{ 
                      width: canvasSize.width, 
                      height: canvasSize.height,
                      backgroundImage: showGrid 
                        ? 'linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)' 
                        : 'none',
                      backgroundSize: '20px 20px',
                    }}
                    data-testid="asset-canvas"
                  >
                    {elements.map(element => (
                      <TransformableElement
                        key={element.id}
                        id={element.id}
                        initialTransform={element.transform}
                        isSelected={selectedId === element.id}
                        onSelect={setSelectedId}
                        onTransformChange={(id, transform) => updateElement(id, { transform })}
                        onDelete={deleteElement}
                        onDuplicate={duplicateElement}
                        minWidth={60}
                        minHeight={40}
                      >
                        <div className="w-full h-full relative">
                          {element.type === "bubble" && renderBubbleSVG(element)}
                          {element.type === "effect" && renderEffectSVG(element)}
                          
                          <div 
                            className="absolute inset-0 flex items-center justify-center pointer-events-none p-4"
                            style={{
                              paddingBottom: element.style.tailDirection === "bottom" ? element.style.tailSize + 8 : 8,
                            }}
                          >
                            <span
                              className="text-center leading-tight select-none"
                              style={{
                                fontFamily: element.style.font,
                                fontSize: element.style.fontSize,
                                fontWeight: element.style.fontWeight,
                                color: element.style.textColor,
                                textShadow: element.style.outlineEnabled 
                                  ? `
                                    -${element.style.outlineWidth}px -${element.style.outlineWidth}px 0 ${element.style.outlineColor},
                                    ${element.style.outlineWidth}px -${element.style.outlineWidth}px 0 ${element.style.outlineColor},
                                    -${element.style.outlineWidth}px ${element.style.outlineWidth}px 0 ${element.style.outlineColor},
                                    ${element.style.outlineWidth}px ${element.style.outlineWidth}px 0 ${element.style.outlineColor}
                                  `
                                  : 'none',
                              }}
                            >
                              {element.text}
                            </span>
                          </div>
                        </div>
                      </TransformableElement>
                    ))}
                  </div>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="bg-zinc-900 border-zinc-700 text-white min-w-48">
                <ContextMenuItem 
                  onClick={() => addBubble("oval")} 
                  className="hover:bg-zinc-800 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 mr-2" /> Add Speech Bubble
                </ContextMenuItem>
                <ContextMenuItem 
                  onClick={() => addEffect(effectPresets[0])} 
                  className="hover:bg-zinc-800 cursor-pointer"
                >
                  <Zap className="w-4 h-4 mr-2" /> Add Effect
                </ContextMenuItem>
                <ContextMenuSeparator className="bg-zinc-700" />
                <ContextMenuItem 
                  onClick={() => setElements([])} 
                  className="hover:bg-zinc-800 cursor-pointer text-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Clear Canvas
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          </main>

          {selectedElement && (
            <aside className="w-72 border-l border-zinc-800 bg-zinc-900 overflow-y-auto">
              <div className="p-4 border-b border-zinc-800">
                <h3 className="text-sm font-bold">Properties</h3>
                <p className="text-xs text-zinc-500 capitalize">{selectedElement.type} - {selectedElement.shape || selectedElement.effectType}</p>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="text-xs font-mono text-zinc-500 block mb-2">Text</label>
                  <input
                    type="text"
                    value={selectedElement.text}
                    onChange={(e) => updateElement(selectedId!, { text: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-sm"
                    data-testid="input-element-text"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-zinc-500 block mb-2">Font</label>
                  <select
                    value={selectedElement.style.font}
                    onChange={(e) => updateElementStyle(selectedId!, { font: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-sm"
                  >
                    {fontOptions.map(font => (
                      <option key={font} value={font}>{font}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono text-zinc-500 block mb-2">Font Size: {selectedElement.style.fontSize}px</label>
                  <input
                    type="range"
                    min="12"
                    max="72"
                    value={selectedElement.style.fontSize}
                    onChange={(e) => updateElementStyle(selectedId!, { fontSize: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-mono text-zinc-500 block mb-2">Fill</label>
                    <input
                      type="color"
                      value={selectedElement.style.fillColor}
                      onChange={(e) => updateElementStyle(selectedId!, { fillColor: e.target.value })}
                      className="w-full h-8 bg-zinc-800 border border-zinc-700 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-mono text-zinc-500 block mb-2">Stroke</label>
                    <input
                      type="color"
                      value={selectedElement.style.strokeColor}
                      onChange={(e) => updateElementStyle(selectedId!, { strokeColor: e.target.value })}
                      className="w-full h-8 bg-zinc-800 border border-zinc-700 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-mono text-zinc-500 block mb-2">Text Color</label>
                    <input
                      type="color"
                      value={selectedElement.style.textColor}
                      onChange={(e) => updateElementStyle(selectedId!, { textColor: e.target.value })}
                      className="w-full h-8 bg-zinc-800 border border-zinc-700 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-mono text-zinc-500 block mb-2">Outline</label>
                    <input
                      type="color"
                      value={selectedElement.style.outlineColor}
                      onChange={(e) => updateElementStyle(selectedId!, { outlineColor: e.target.value })}
                      className="w-full h-8 bg-zinc-800 border border-zinc-700 cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-mono text-zinc-500 block mb-2">Stroke Width: {selectedElement.style.strokeWidth}px</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={selectedElement.style.strokeWidth}
                    onChange={(e) => updateElementStyle(selectedId!, { strokeWidth: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-zinc-500 block mb-2">Outline Width: {selectedElement.style.outlineWidth}px</label>
                  <input
                    type="range"
                    min="0"
                    max="8"
                    value={selectedElement.style.outlineWidth}
                    onChange={(e) => updateElementStyle(selectedId!, { outlineWidth: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>

                {selectedElement.type === "bubble" && (
                  <div>
                    <label className="text-xs font-mono text-zinc-500 block mb-2">Tail Size: {selectedElement.style.tailSize}px</label>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={selectedElement.style.tailSize}
                      onChange={(e) => updateElementStyle(selectedId!, { tailSize: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-zinc-500">Shadow</label>
                  <button
                    onClick={() => updateElementStyle(selectedId!, { shadowEnabled: !selectedElement.style.shadowEnabled })}
                    className={`px-3 py-1 text-xs ${selectedElement.style.shadowEnabled ? 'bg-white text-black' : 'bg-zinc-800'}`}
                  >
                    {selectedElement.style.shadowEnabled ? "ON" : "OFF"}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-zinc-500">Text Outline</label>
                  <button
                    onClick={() => updateElementStyle(selectedId!, { outlineEnabled: !selectedElement.style.outlineEnabled })}
                    className={`px-3 py-1 text-xs ${selectedElement.style.outlineEnabled ? 'bg-white text-black' : 'bg-zinc-800'}`}
                  >
                    {selectedElement.style.outlineEnabled ? "ON" : "OFF"}
                  </button>
                </div>

                <div className="pt-4 border-t border-zinc-800 flex gap-2">
                  <button
                    onClick={() => duplicateElement(selectedId!)}
                    className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" /> Duplicate
                  </button>
                  <button
                    onClick={() => deleteElement(selectedId!)}
                    className="flex-1 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </Layout>
  );
}
