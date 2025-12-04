import { Layout } from "@/components/layout/Layout";
import { 
  Save, Download, ArrowLeft, Type, ImageIcon, Wand2, X, Upload, Eye, 
  RotateCw, Palette, Settings, Layers, Plus, Trash2
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { AIGenerator } from "@/components/tools/AIGenerator";
import { TransformableElement, TransformState } from "@/components/tools/TransformableElement";
import { TextElement } from "@/components/tools/TextElement";
import { useProject, useUpdateProject, useCreateProject } from "@/hooks/useProjects";
import { toast } from "sonner";

const FONT_OPTIONS = [
  { value: "Inter, sans-serif", label: "Inter" },
  { value: "'Space Grotesk', sans-serif", label: "Space Grotesk" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "'Impact', sans-serif", label: "Impact" },
  { value: "'Courier New', monospace", label: "Courier" },
  { value: "'Palatino Linotype', serif", label: "Palatino" },
  { value: "'Trebuchet MS', sans-serif", label: "Trebuchet" },
];

const GENRE_TEMPLATES = [
  { id: "sci-fi", name: "Sci-Fi", colors: ["#0a0a20", "#00ffcc", "#9945FF"] },
  { id: "romance", name: "Romance", colors: ["#2D0A31", "#FF4D8D", "#FFD6E8"] },
  { id: "thriller", name: "Thriller", colors: ["#0D0D0D", "#8B0000", "#FFD700"] },
  { id: "fantasy", name: "Fantasy", colors: ["#1A1A2E", "#D4AF37", "#7B68EE"] },
  { id: "horror", name: "Horror", colors: ["#000000", "#8B0000", "#1A1A1A"] },
  { id: "mystery", name: "Mystery", colors: ["#1C1C2D", "#2E8B57", "#C0C0C0"] },
];

interface TextLayer {
  id: string;
  text: string;
  transform: TransformState;
  fontSize: number;
  fontFamily: string;
  color: string;
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
};

export default function CoverCreator() {
  const [location, navigate] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const projectId = searchParams.get('id');
  
  const { data: project } = useProject(projectId || '');
  const updateProject = useUpdateProject();
  const createProject = useCreateProject();

  const [coverData, setCoverData] = useState<CoverData>(defaultCover);
  const [activeView, setActiveView] = useState<"front" | "back" | "spine" | "spread">("front");
  const [activeSection, setActiveSection] = useState<"content" | "style" | "images">("content");
  const [showAIGen, setShowAIGen] = useState(false);
  const [aiTarget, setAiTarget] = useState<"front" | "back" | "spine">("front");
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const spineInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const creatingFlag = sessionStorage.getItem('cover_creating');
    if (!projectId && !creatingFlag && !createProject.isPending) {
      sessionStorage.setItem('cover_creating', 'true');
      setIsCreating(true);
      createProject.mutateAsync({
        title: "Untitled Cover",
        type: "cover",
        status: "draft",
        data: defaultCover,
      }).then((newProject) => {
        sessionStorage.removeItem('cover_creating');
        setIsCreating(false);
        navigate(`/creator/cover?id=${newProject.id}`, { replace: true });
      }).catch(() => {
        toast.error("Failed to create project");
        sessionStorage.removeItem('cover_creating');
        setIsCreating(false);
      });
    } else if (projectId) {
      sessionStorage.removeItem('cover_creating');
      setIsCreating(false);
    }
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
      }
      toast.success("Cover saved");
    } catch (error: any) {
      toast.error(error.message || "Save failed");
    } finally {
      setIsSaving(false);
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
    if (selectedLayerId === layerId) setSelectedLayerId(null);
    toast.success("Layer deleted");
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

    return (
      <div 
        className="relative overflow-hidden border-2 border-black shadow-xl"
        style={{ width, height, backgroundColor: bgColor }}
        onClick={() => { setSelectedLayerId(null); setActiveView(view); }}
      >
        {bgImage && (
          <img src={bgImage} className="absolute inset-0 w-full h-full object-cover" />
        )}
        
        {view === "front" && (
          <div className="absolute inset-0 flex flex-col items-center justify-between p-8 text-center z-10">
            <div className="mt-12">
              <h1 
                style={{ fontFamily: coverData.titleFont, color: coverData.titleColor, fontSize: `${coverData.titleSize}px` }}
                className="font-bold uppercase tracking-tight leading-none"
              >
                {coverData.title}
              </h1>
              <p 
                style={{ fontFamily: coverData.subtitleFont, color: coverData.subtitleColor, fontSize: `${coverData.subtitleSize}px` }}
                className="mt-2 italic"
              >
                {coverData.subtitle}
              </p>
            </div>
            <p 
              style={{ fontFamily: coverData.authorFont, color: coverData.authorColor, fontSize: `${coverData.authorSize}px` }}
              className="mb-8 font-medium tracking-widest uppercase"
            >
              {coverData.author}
            </p>
          </div>
        )}

        {view === "back" && (
          <div className="absolute inset-0 flex flex-col p-8 z-10">
            <div className="flex-1 flex items-center justify-center">
              <p 
                style={{ fontFamily: coverData.backBlurbFont, color: coverData.backBlurbColor, fontSize: `${coverData.backBlurbSize}px` }}
                className="max-w-[80%] text-center leading-relaxed"
              >
                {coverData.backBlurb}
              </p>
            </div>
            <div className="flex justify-center mt-4">
              <div className="w-32 h-10 bg-white/10 flex items-center justify-center text-xs text-white/50 font-mono">
                ISBN
              </div>
            </div>
          </div>
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
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save"}
            </button>
            <button className="px-4 py-2 bg-white text-black text-sm font-bold flex items-center gap-2 hover:bg-zinc-200">
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
                  <label className="text-xs font-bold uppercase text-zinc-400 mb-2 block">Genre Templates</label>
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
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>
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
              </div>
            )}
          </div>

          <div ref={canvasRef} className="flex-1 bg-zinc-950 flex items-center justify-center p-8 relative">
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none" 
                 style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
            
            {activeView === "spread" ? (
              <div className="flex items-center shadow-2xl" style={{ perspective: "1000px" }}>
                {renderCoverSection("back", "400px", "600px")}
                {renderCoverSection("spine", "50px", "600px")}
                {renderCoverSection("front", "400px", "600px")}
              </div>
            ) : activeView === "front" ? (
              renderCoverSection("front", "450px", "675px")
            ) : activeView === "back" ? (
              renderCoverSection("back", "450px", "675px")
            ) : (
              renderCoverSection("spine", "60px", "675px")
            )}
            
            <p className="absolute bottom-8 font-mono text-xs text-zinc-500">
              {activeView.toUpperCase()} VIEW • 300 DPI PRINT READY
            </p>
          </div>
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
      </div>
    </Layout>
  );
}
