import { useState, useRef } from "react";
import { 
  Type, ImageIcon, Wand2, X, Upload, Plus, Trash2,
  Palette, Layers, Sparkles, ExternalLink
} from "lucide-react";
import { AIGenerator } from "@/components/tools/AIGenerator";
import { AssetBrowser } from "@/components/tools/AssetBrowser";
import type { AssetItem } from "@/components/tools/AssetBrowser";
import { toast } from "sonner";
import {
  CoverData, defaultCover, FONT_OPTIONS, GENRE_TEMPLATES, COVER_TEMPLATES,
  FILTER_PRESETS, TextLayer, ImageLayer
} from "@/components/tools/CoverEditorPanel";

interface CoverPropertiesPanelProps {
  coverData: CoverData;
  updateCover: (updates: Partial<CoverData>) => void;
  coverView: "front" | "back";
  selectedLayerId: string | null;
  setSelectedLayerId: (id: string | null) => void;
}

export function CoverPropertiesPanel({
  coverData, updateCover, coverView, selectedLayerId, setSelectedLayerId,
}: CoverPropertiesPanelProps) {
  const [activeSection, setActiveSection] = useState<"content" | "style" | "images">("content");
  const [showAIGen, setShowAIGen] = useState(false);
  const [showAssetBrowser, setShowAssetBrowser] = useState(false);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: "front" | "back") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const bgKey = target === "front" ? "frontImage" : "backImage";
      updateCover({ [bgKey]: url });
      toast.success(`${target} image updated`);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleAIGenerated = (url: string) => {
    const bgKey = coverView === "front" ? "frontImage" : "backImage";
    updateCover({ [bgKey]: url });
    setShowAIGen(false);
    toast.success("AI image applied to cover");
  };

  const addTextLayer = () => {
    const newLayer: TextLayer = {
      id: `layer_${Date.now()}`,
      text: "New Text",
      transform: { x: 50, y: 50, width: 200, height: 60, rotation: 0, scaleX: 1, scaleY: 1 },
      fontSize: 24,
      fontFamily: "Inter, sans-serif",
      color: "#FFFFFF",
      locked: false,
    };
    const layerKey = `${coverView}Layers` as keyof CoverData;
    const newOrder = [...(coverData.elementZOrder || []), newLayer.id];
    updateCover({ [layerKey]: [...(coverData[layerKey] as TextLayer[]), newLayer], elementZOrder: newOrder });
  };

  const updateTextLayer = (layerId: string, updates: Partial<TextLayer>) => {
    const layerKey = `${coverView}Layers` as keyof CoverData;
    const layers = coverData[layerKey] as TextLayer[];
    updateCover({ [layerKey]: layers.map(l => l.id === layerId ? { ...l, ...updates } : l) });
  };

  const deleteTextLayer = (layerId: string) => {
    const layerKey = `${coverView}Layers` as keyof CoverData;
    const layers = coverData[layerKey] as TextLayer[];
    const newOrder = (coverData.elementZOrder || []).filter(id => id !== layerId);
    updateCover({ [layerKey]: layers.filter(l => l.id !== layerId), elementZOrder: newOrder });
  };

  const addImageLayer = (asset: AssetItem) => {
    const newLayer: ImageLayer = {
      id: `img_${Date.now()}`,
      url: asset.url,
      name: asset.name,
      transform: { x: 50, y: 50, width: 150, height: 150, rotation: 0, scaleX: 1, scaleY: 1 },
      opacity: 1,
      locked: false,
    };
    const layerKey = `${coverView}ImageLayers` as keyof CoverData;
    const existing = (coverData[layerKey] as ImageLayer[]) || [];
    const newOrder = [...(coverData.elementZOrder || []), newLayer.id];
    updateCover({ [layerKey]: [...existing, newLayer], elementZOrder: newOrder });
    setSelectedLayerId(newLayer.id);
    setShowAssetBrowser(false);
    toast.success(`"${asset.name}" added to ${coverView} cover`);
  };

  const deleteImageLayer = (layerId: string) => {
    const layerKey = `${coverView}ImageLayers` as keyof CoverData;
    const layers = (coverData[layerKey] as ImageLayer[]) || [];
    const newOrder = (coverData.elementZOrder || []).filter(id => id !== layerId);
    updateCover({ [layerKey]: layers.filter(l => l.id !== layerId), elementZOrder: newOrder });
  };

  const updateImageLayer = (layerId: string, updates: Partial<ImageLayer>) => {
    const layerKey = `${coverView}ImageLayers` as keyof CoverData;
    const layers = (coverData[layerKey] as ImageLayer[]) || [];
    updateCover({ [layerKey]: layers.map(l => l.id === layerId ? { ...l, ...updates } : l) });
  };

  const applyTemplate = (templateId: string) => {
    const template = COVER_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;
    updateCover({ templateId, frontBgColor: template.bgColor, titleFont: template.titleFont, titleColor: template.titleColor, bannerBgColor: template.bannerBg, showPriceBox: template.priceBox });
    toast.success(`Applied ${template.name}`);
  };

  const applyGenreTemplate = (template: typeof GENRE_TEMPLATES[0]) => {
    updateCover({ frontBgColor: template.colors[0], backBgColor: template.colors[0], spineBgColor: template.colors[0], titleColor: template.colors[1], authorColor: template.colors[2] });
    toast.success(`${template.name} theme applied`);
  };

  const updateFilter = (key: keyof typeof FILTER_PRESETS, value: any) => {
    updateCover({ filters: { ...coverData.filters, [key]: value } });
  };

  const viewLayers = coverData[`${coverView}Layers` as keyof CoverData] as TextLayer[];
  const viewImageLayers = (coverData[`${coverView}ImageLayers` as keyof CoverData] as ImageLayer[]) || [];

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-zinc-800">
        <div className="flex items-center gap-1 mb-2">
          <Palette className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-bold text-cyan-400 uppercase">{coverView === "front" ? "Front Cover" : "Back Cover"}</span>
        </div>
        <div className="flex bg-zinc-800">
          {(["content", "style", "images"] as const).map(section => (
            <button key={section} onClick={() => setActiveSection(section)}
              className={`flex-1 py-1.5 text-[10px] font-bold uppercase ${activeSection === section ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
              data-testid={`cover-tab-${section}`}>
              {section}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2 space-y-3">
        {activeSection === "content" && (
          <>
            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500 block mb-1">Title</label>
              <input type="text" value={coverData.title}
                onChange={(e) => updateCover({ title: e.target.value, spineText: e.target.value })}
                onKeyDown={(e) => e.stopPropagation()}
                className="w-full bg-zinc-800 border border-zinc-700 p-1.5 text-xs" data-testid="cover-input-title" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500 block mb-1">Subtitle</label>
              <input type="text" value={coverData.subtitle}
                onChange={(e) => updateCover({ subtitle: e.target.value })}
                onKeyDown={(e) => e.stopPropagation()}
                className="w-full bg-zinc-800 border border-zinc-700 p-1.5 text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500 block mb-1">Author</label>
              <input type="text" value={coverData.author}
                onChange={(e) => updateCover({ author: e.target.value })}
                onKeyDown={(e) => e.stopPropagation()}
                className="w-full bg-zinc-800 border border-zinc-700 p-1.5 text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500 block mb-1">Banner Text</label>
              <div className="flex gap-1.5">
                <input type="text" value={coverData.bannerText}
                  onChange={(e) => updateCover({ bannerText: e.target.value })}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="flex-1 bg-zinc-800 border border-zinc-700 p-1.5 text-xs" />
                <input type="color" value={coverData.bannerBgColor || '#000000'}
                  onChange={(e) => updateCover({ bannerBgColor: e.target.value })}
                  className="w-8 h-8 bg-zinc-800 border border-zinc-700 cursor-pointer" title="Banner BG" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500 block mb-1">Back Cover Blurb</label>
              <textarea value={coverData.backBlurb}
                onChange={(e) => updateCover({ backBlurb: e.target.value })}
                onKeyDown={(e) => e.stopPropagation()}
                className="w-full h-24 bg-zinc-800 border border-zinc-700 p-1.5 text-xs resize-none" />
            </div>
            <div className="pt-2 border-t border-zinc-700">
              <label className="text-[10px] font-bold uppercase text-zinc-500 block mb-1">Cover Templates</label>
              <select value={coverData.templateId}
                onChange={(e) => applyTemplate(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 p-1.5 text-xs" data-testid="cover-select-template">
                {COVER_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="pt-2 border-t border-zinc-700">
              <label className="text-[10px] font-bold uppercase text-zinc-500 block mb-1">Comic Details</label>
              <div className="space-y-1.5">
                <input type="text" placeholder="Issue # (e.g., #1)" value={coverData.issueNumber}
                  onChange={(e) => updateCover({ issueNumber: e.target.value })}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="w-full bg-zinc-800 border border-zinc-700 p-1.5 text-xs" />
                <input type="text" placeholder="Publisher Name" value={coverData.publisherName}
                  onChange={(e) => updateCover({ publisherName: e.target.value })}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="w-full bg-zinc-800 border border-zinc-700 p-1.5 text-xs" />
                <input type="text" placeholder="Tagline" value={coverData.tagline}
                  onChange={(e) => updateCover({ tagline: e.target.value })}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="w-full bg-zinc-800 border border-zinc-700 p-1.5 text-xs" />
                <input type="text" placeholder="Issue Date (e.g., MAR 2026)" value={coverData.issueDate || ""}
                  onChange={(e) => updateCover({ issueDate: e.target.value })}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="w-full bg-zinc-800 border border-zinc-700 p-1.5 text-xs" />
                <div className="flex gap-1.5">
                  <input type="text" placeholder="Price (e.g., 40¢)" value={coverData.priceText}
                    onChange={(e) => updateCover({ priceText: e.target.value })}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="flex-1 bg-zinc-800 border border-zinc-700 p-1.5 text-xs" />
                  <label className="flex items-center gap-1 text-[10px] text-zinc-400 whitespace-nowrap">
                    <input type="checkbox" checked={coverData.showPriceBox}
                      onChange={(e) => updateCover({ showPriceBox: e.target.checked })}
                      className="w-3 h-3" />Show
                  </label>
                </div>
                {coverData.showPriceBox && (
                  <div className="flex gap-1.5">
                    <select value={coverData.priceBoxShape || "rectangle"}
                      onChange={(e) => updateCover({ priceBoxShape: e.target.value as any })}
                      className="flex-1 bg-zinc-800 border border-zinc-700 p-1 text-[10px]">
                      <option value="rectangle">Rectangle</option>
                      <option value="circle">Circle</option>
                      <option value="diamond">Diamond</option>
                    </select>
                    <input type="color" value={coverData.priceBoxColor || coverData.bannerBgColor || '#FFD700'}
                      onChange={(e) => updateCover({ priceBoxColor: e.target.value })}
                      className="w-6 h-6 bg-zinc-800 border border-zinc-700 cursor-pointer" title="Box Color" />
                    <input type="color" value={coverData.priceBoxTextColor || '#000000'}
                      onChange={(e) => updateCover({ priceBoxTextColor: e.target.value })}
                      className="w-6 h-6 bg-zinc-800 border border-zinc-700 cursor-pointer" title="Text Color" />
                  </div>
                )}
                <input type="text" placeholder="ISBN (13 digits for barcode)" value={coverData.isbn}
                  onChange={(e) => updateCover({ isbn: e.target.value })}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="w-full bg-zinc-800 border border-zinc-700 p-1.5 text-xs" data-testid="cover-input-isbn" />
                <label className="flex items-center gap-2 text-[10px] text-zinc-400">
                  <input type="checkbox" checked={coverData.showBarcode ?? true}
                    onChange={(e) => updateCover({ showBarcode: e.target.checked })}
                    className="w-3 h-3" />Show Barcode Area (Back Cover)
                </label>
              </div>
            </div>
            <div className="pt-2 border-t border-zinc-700">
              <label className="text-[10px] font-bold uppercase text-zinc-500 block mb-1">Color Themes</label>
              <div className="grid grid-cols-3 gap-1">
                {GENRE_TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => applyGenreTemplate(t)}
                    className="p-1.5 text-[10px] font-medium bg-zinc-800 hover:bg-zinc-700 border border-zinc-600"
                    style={{ borderLeftColor: t.colors[1], borderLeftWidth: 3 }}>{t.name}</button>
                ))}
              </div>
            </div>
          </>
        )}

        {activeSection === "style" && (
          <>
            {(["title", "subtitle", "author", "backBlurb"] as const).map(field => {
              const fontKey = `${field}Font` as keyof CoverData;
              const colorKey = `${field}Color` as keyof CoverData;
              const sizeKey = `${field}Size` as keyof CoverData;
              const boldKey = `${field}Bold` as keyof CoverData;
              const italicKey = `${field}Italic` as keyof CoverData;
              const uppercaseKey = `${field}Uppercase` as keyof CoverData;
              const label = field === "backBlurb" ? "Back Blurb" : field.charAt(0).toUpperCase() + field.slice(1);
              return (
                <div key={field} className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-zinc-500">{label} Font</label>
                  <select value={coverData[fontKey] as string}
                    onChange={(e) => updateCover({ [fontKey]: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 p-1 text-xs">
                    {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                  <div className="flex gap-1.5">
                    <input type="color" value={coverData[colorKey] as string}
                      onChange={(e) => updateCover({ [colorKey]: e.target.value })}
                      className="w-8 h-6 bg-zinc-800 border border-zinc-700 cursor-pointer" />
                    <input type="number" value={coverData[sizeKey] as number}
                      onChange={(e) => updateCover({ [sizeKey]: Number(e.target.value) })}
                      className="flex-1 bg-zinc-800 border border-zinc-700 p-1 text-xs text-center" min="8" max="120" />
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => updateCover({ [boldKey]: !coverData[boldKey] })}
                      className={`px-2 py-0.5 text-[10px] font-bold border ${coverData[boldKey] ? "bg-white text-black border-white" : "border-zinc-600 hover:border-zinc-400 text-zinc-400"}`}
                      data-testid={`button-${field}-bold`}>B</button>
                    <button onClick={() => updateCover({ [italicKey]: !coverData[italicKey] })}
                      className={`px-2 py-0.5 text-[10px] italic border ${coverData[italicKey] ? "bg-white text-black border-white" : "border-zinc-600 hover:border-zinc-400 text-zinc-400"}`}
                      data-testid={`button-${field}-italic`}>I</button>
                    {field !== "backBlurb" && (
                      <button onClick={() => updateCover({ [uppercaseKey]: !coverData[uppercaseKey] })}
                        className={`px-2 py-0.5 text-[10px] border ${coverData[uppercaseKey] ? "bg-white text-black border-white" : "border-zinc-600 hover:border-zinc-400 text-zinc-400"}`}
                        data-testid={`button-${field}-uppercase`}>AA</button>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="pt-2 border-t border-zinc-700">
              <label className="text-[10px] font-bold uppercase text-zinc-500 block mb-1">Text Effects</label>
              {(["title", "subtitle", "author"] as const).map(field => {
                const effectKey = `${field}Effect` as keyof CoverData;
                const archKey = `${field}Arch` as keyof CoverData;
                const strokeColorKey = `${field}StrokeColor` as keyof CoverData;
                const strokeWidthKey = `${field}StrokeWidth` as keyof CoverData;
                const label = field.charAt(0).toUpperCase() + field.slice(1);
                return (
                  <div key={field} className="space-y-1 mb-2">
                    <span className="text-[9px] text-zinc-500">{label}</span>
                    <select value={(coverData[effectKey] as string) || "none"}
                      onChange={(e) => updateCover({ [effectKey]: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-600 p-1 text-[10px]">
                      {["none", "comic", "outline", "3d", "retro", "glow", "neon", "fire", "ice"].map(e => (
                        <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
                      ))}
                    </select>
                    {["outline", "comic", "3d", "retro"].includes((coverData[effectKey] as string) || "none") && (
                      <div className="flex gap-1.5">
                        <input type="color" value={(coverData[strokeColorKey] as string) || "#000000"}
                          onChange={(e) => updateCover({ [strokeColorKey]: e.target.value })}
                          className="w-6 h-5 bg-zinc-900 border border-zinc-600 cursor-pointer" />
                        <input type="number" value={(coverData[strokeWidthKey] as number) || 2}
                          onChange={(e) => updateCover({ [strokeWidthKey]: Number(e.target.value) })}
                          className="flex-1 bg-zinc-900 border border-zinc-600 p-0.5 text-[10px] text-center" min="0" max="10" step="0.5" />
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] text-zinc-600">Arch</span>
                      <input type="range" min="-100" max="100" step="5"
                        value={(coverData[archKey] as number) || 0}
                        onChange={(e) => updateCover({ [archKey]: Number(e.target.value) })}
                        className="flex-1 h-1 accent-cyan-500" />
                      <span className="text-[8px] text-zinc-600 w-5 text-right">{(coverData[archKey] as number) || 0}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="pt-2 border-t border-zinc-700">
              <label className="text-[10px] font-bold uppercase text-zinc-500 block mb-1">Background Colors</label>
              <div className="grid grid-cols-3 gap-1.5">
                <div className="text-center">
                  <input type="color" value={coverData.frontBgColor}
                    onChange={(e) => updateCover({ frontBgColor: e.target.value })}
                    className="w-full h-8 bg-zinc-800 border border-zinc-700 cursor-pointer" />
                  <span className="text-[8px] text-zinc-500">Front</span>
                </div>
                <div className="text-center">
                  <input type="color" value={coverData.spineBgColor}
                    onChange={(e) => updateCover({ spineBgColor: e.target.value })}
                    className="w-full h-8 bg-zinc-800 border border-zinc-700 cursor-pointer" />
                  <span className="text-[8px] text-zinc-500">Spine</span>
                </div>
                <div className="text-center">
                  <input type="color" value={coverData.backBgColor}
                    onChange={(e) => updateCover({ backBgColor: e.target.value })}
                    className="w-full h-8 bg-zinc-800 border border-zinc-700 cursor-pointer" />
                  <span className="text-[8px] text-zinc-500">Back</span>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-zinc-700">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold uppercase text-zinc-500">Text Layers</label>
                <button onClick={addTextLayer}
                  className="p-0.5 bg-white text-black text-[10px] flex items-center gap-0.5 px-1.5"
                  data-testid="cover-add-text-layer">
                  <Plus className="w-2.5 h-2.5" /> Add
                </button>
              </div>
              {viewLayers.length > 0 && (
                <div className="space-y-1">
                  {viewLayers.map(layer => (
                    <div key={layer.id} onClick={() => setSelectedLayerId(layer.id)}
                      className={`p-1.5 border cursor-pointer ${selectedLayerId === layer.id ? "border-cyan-500 bg-zinc-800" : "border-zinc-700 hover:border-zinc-500"}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-medium truncate flex-1" style={{ fontFamily: layer.fontFamily, color: layer.color }}>{layer.text || "Empty"}</span>
                        <button onClick={(e) => { e.stopPropagation(); deleteTextLayer(layer.id); }} className="p-0.5 hover:text-red-500"><Trash2 className="w-2.5 h-2.5" /></button>
                      </div>
                      {selectedLayerId === layer.id && (
                        <div className="space-y-1.5 pt-1.5 border-t border-zinc-700 mt-1" onClick={(e) => e.stopPropagation()}>
                          <input type="text" value={layer.text}
                            onChange={(e) => updateTextLayer(layer.id, { text: e.target.value })}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="w-full bg-zinc-900 border border-zinc-600 p-1 text-[10px]" />
                          <select value={layer.fontFamily}
                            onChange={(e) => updateTextLayer(layer.id, { fontFamily: e.target.value })}
                            className="w-full bg-zinc-900 border border-zinc-600 p-1 text-[10px]">
                            {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                          </select>
                          <div className="flex gap-1">
                            <input type="color" value={layer.color}
                              onChange={(e) => updateTextLayer(layer.id, { color: e.target.value })}
                              className="w-6 h-5 bg-zinc-900 border border-zinc-600 cursor-pointer" />
                            <input type="number" value={layer.fontSize}
                              onChange={(e) => updateTextLayer(layer.id, { fontSize: Number(e.target.value) })}
                              className="flex-1 bg-zinc-900 border border-zinc-600 p-0.5 text-[10px] text-center" min="8" max="200" />
                          </div>
                          <div className="flex gap-0.5">
                            <button onClick={() => updateTextLayer(layer.id, { fontWeight: layer.fontWeight === "bold" ? "normal" : "bold" })}
                              className={`px-1.5 py-0.5 text-[10px] font-bold border ${layer.fontWeight === "bold" ? "bg-white text-black" : "border-zinc-600"}`}>B</button>
                            <button onClick={() => updateTextLayer(layer.id, { fontStyle: layer.fontStyle === "italic" ? "normal" : "italic" })}
                              className={`px-1.5 py-0.5 text-[10px] italic border ${layer.fontStyle === "italic" ? "bg-white text-black" : "border-zinc-600"}`}>I</button>
                            <button onClick={() => updateTextLayer(layer.id, { textTransform: layer.textTransform === "uppercase" ? "none" : "uppercase" })}
                              className={`px-1.5 py-0.5 text-[10px] border ${layer.textTransform === "uppercase" ? "bg-white text-black" : "border-zinc-600"}`}>AA</button>
                          </div>
                          <div>
                            <span className="text-[8px] text-zinc-500">Effect</span>
                            <select value={layer.textEffect || "none"}
                              onChange={(e) => updateTextLayer(layer.id, { textEffect: e.target.value })}
                              className="w-full bg-zinc-900 border border-zinc-600 p-0.5 text-[10px]">
                              {["none", "comic", "outline", "3d", "retro", "glow", "neon", "fire", "ice"].map(e => (
                                <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
                              ))}
                            </select>
                          </div>
                          {["outline", "comic", "3d", "retro"].includes(layer.textEffect || "none") && (
                            <div className="flex gap-1">
                              <input type="color" value={layer.strokeColor || "#000000"}
                                onChange={(e) => updateTextLayer(layer.id, { strokeColor: e.target.value })}
                                className="w-6 h-5 bg-zinc-900 border border-zinc-600 cursor-pointer" />
                              <input type="number" value={layer.strokeWidth || 2}
                                onChange={(e) => updateTextLayer(layer.id, { strokeWidth: Number(e.target.value) })}
                                className="flex-1 bg-zinc-900 border border-zinc-600 p-0.5 text-[10px] text-center" min="0" max="10" step="0.5" />
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <span className="text-[8px] text-zinc-600">Arch</span>
                            <input type="range" min="-100" max="100" step="5"
                              value={layer.textArch || 0}
                              onChange={(e) => updateTextLayer(layer.id, { textArch: Number(e.target.value) })}
                              className="flex-1 h-1 accent-cyan-500" />
                            <span className="text-[8px] text-zinc-600 w-5 text-right">{layer.textArch || 0}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="pt-2 border-t border-zinc-700">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold uppercase text-zinc-500">Image Layers</label>
                <button onClick={() => setShowAssetBrowser(true)}
                  className="p-0.5 bg-violet-600 text-white text-[10px] flex items-center gap-0.5 px-1.5"
                  data-testid="cover-add-image-layer">
                  <Plus className="w-2.5 h-2.5" /> Add
                </button>
              </div>
              {viewImageLayers.length > 0 && (
                <div className="space-y-1">
                  {viewImageLayers.map(il => (
                    <div key={il.id} onClick={() => setSelectedLayerId(il.id)}
                      className={`p-1.5 border cursor-pointer ${selectedLayerId === il.id ? "border-violet-500 bg-zinc-800" : "border-zinc-700 hover:border-zinc-500"}`}>
                      <div className="flex items-center gap-1.5">
                        <img src={il.url} alt={il.name} className="w-5 h-5 object-contain bg-zinc-900 border border-zinc-700" />
                        <span className="text-[10px] truncate flex-1">{il.name}</span>
                        <button onClick={(e) => { e.stopPropagation(); deleteImageLayer(il.id); }} className="p-0.5 hover:text-red-500"><Trash2 className="w-2.5 h-2.5" /></button>
                      </div>
                      {selectedLayerId === il.id && (
                        <div className="pt-1.5 border-t border-zinc-700 mt-1" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <span className="text-[8px] text-zinc-500">Opacity</span>
                            <input type="range" min="0" max="1" step="0.05" value={il.opacity ?? 1}
                              onChange={(e) => updateImageLayer(il.id, { opacity: Number(e.target.value) })}
                              className="flex-1 h-1 accent-violet-500" />
                            <span className="text-[8px] text-zinc-600 w-7 text-right">{Math.round((il.opacity ?? 1) * 100)}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeSection === "images" && (
          <>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-zinc-500 flex justify-between">
                <span>Front Cover Image</span>
                <button onClick={() => setShowAIGen(true)}
                  className="text-[9px] bg-white text-black px-1.5 py-0.5 flex items-center gap-0.5">
                  <Wand2 className="w-2.5 h-2.5" /> AI
                </button>
              </label>
              <div onClick={() => frontInputRef.current?.click()}
                className="aspect-[2/3] bg-zinc-800 border border-zinc-700 flex items-center justify-center cursor-pointer hover:border-white relative overflow-hidden">
                {coverData.frontImage ? (
                  <img src={coverData.frontImage} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-zinc-500 text-[10px] flex flex-col items-center"><Upload className="w-3 h-3 mb-0.5" /> Upload</span>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-zinc-500 flex justify-between">
                <span>Back Cover Image</span>
                <button onClick={() => setShowAIGen(true)}
                  className="text-[9px] bg-white text-black px-1.5 py-0.5 flex items-center gap-0.5">
                  <Wand2 className="w-2.5 h-2.5" /> AI
                </button>
              </label>
              <div onClick={() => backInputRef.current?.click()}
                className="aspect-[2/3] bg-zinc-800 border border-zinc-700 flex items-center justify-center cursor-pointer hover:border-white relative overflow-hidden">
                {coverData.backImage ? (
                  <img src={coverData.backImage} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-zinc-500 text-[10px] flex flex-col items-center"><Upload className="w-3 h-3 mb-0.5" /> Upload</span>
                )}
              </div>
            </div>
            <div className="pt-2 border-t border-zinc-700 space-y-2">
              <label className="text-[10px] font-bold uppercase text-zinc-500 block">Filters</label>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center"><span className="text-[10px] text-zinc-400">Contrast</span><span className="text-[9px] text-zinc-500">{coverData.filters.contrast}%</span></div>
                <input type="range" min="0" max="100" value={coverData.filters.contrast} onChange={(e) => updateFilter('contrast', Number(e.target.value))} className="w-full accent-white h-1" />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center"><span className="text-[10px] text-zinc-400">Brightness</span><span className="text-[9px] text-zinc-500">{coverData.filters.brightness}%</span></div>
                <input type="range" min="0" max="100" value={coverData.filters.brightness} onChange={(e) => updateFilter('brightness', Number(e.target.value))} className="w-full accent-white h-1" />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center"><span className="text-[10px] text-zinc-400">Saturation</span><span className="text-[9px] text-zinc-500">{coverData.filters.saturation}%</span></div>
                <input type="range" min="0" max="200" value={coverData.filters.saturation} onChange={(e) => updateFilter('saturation', Number(e.target.value))} className="w-full accent-white h-1" />
              </div>
              <div className="grid grid-cols-2 gap-1 pt-1">
                {([ ["grayscale", "Gray"], ["sepia", "Sepia"], ["invert", "Invert"], ["blur", "Blur"], ["halftone", "Halftone"], ["grain", "Grain"], ["vignette", "Vignette"] ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-1 text-[10px] text-zinc-400 cursor-pointer">
                    <input type="checkbox" checked={coverData.filters[key as keyof typeof FILTER_PRESETS] as boolean}
                      onChange={(e) => updateFilter(key as keyof typeof FILTER_PRESETS, e.target.checked)}
                      className="w-2.5 h-2.5" />{label}
                  </label>
                ))}
              </div>
              <button onClick={() => updateCover({ filters: { ...FILTER_PRESETS } })}
                className="w-full py-1 text-[10px] bg-zinc-800 hover:bg-zinc-700 border border-zinc-600">Reset Filters</button>
            </div>
            <div className="pt-2 border-t border-zinc-700 space-y-2">
              <label className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-400" /> FX Studio Effects
              </label>
              <p className="text-[9px] text-zinc-500">
                Browse visual effects from FX Studio and apply them as overlay layers on your {coverView} cover.
              </p>
              <button
                onClick={() => {
                  window.open("https://www.pscomixx.online", "_blank", "noopener,noreferrer");
                }}
                className="w-full py-2 text-xs font-bold bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/50 text-purple-300 flex items-center justify-center gap-2 transition-colors"
                data-testid="button-cover-fx-studio"
              >
                <Sparkles className="w-3.5 h-3.5" /> Browse FX Studio
                <ExternalLink className="w-3 h-3 opacity-60" />
              </button>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400">Paste FX image URL</label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    placeholder="https://..."
                    className="flex-1 bg-zinc-800 border border-zinc-700 text-white text-[10px] px-2 py-1.5"
                    data-testid="input-fx-url"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const url = (e.target as HTMLInputElement).value.trim();
                        if (url) {
                          const newLayer: ImageLayer = {
                            id: `fx_${Date.now()}`,
                            url,
                            name: "FX Effect",
                            transform: { x: 0, y: 0, width: 300, height: 400, rotation: 0, scaleX: 1, scaleY: 1 },
                            opacity: 0.7,
                            locked: false,
                            blendMode: "screen",
                          };
                          const layerKey = `${coverView}ImageLayers` as keyof CoverData;
                          const existing = (coverData[layerKey] as ImageLayer[]) || [];
                          updateCover({ [layerKey]: [...existing, newLayer] });
                          (e.target as HTMLInputElement).value = "";
                          toast.success("FX effect applied as overlay layer");
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.querySelector('[data-testid="input-fx-url"]') as HTMLInputElement;
                      const url = input?.value.trim();
                      if (url) {
                        const newLayer: ImageLayer = {
                          id: `fx_${Date.now()}`,
                          url,
                          name: "FX Effect",
                          transform: { x: 0, y: 0, width: 300, height: 400, rotation: 0, scaleX: 1, scaleY: 1 },
                          opacity: 0.7,
                          locked: false,
                          blendMode: "screen",
                        };
                        const layerKey = `${coverView}ImageLayers` as keyof CoverData;
                        const existing = (coverData[layerKey] as ImageLayer[]) || [];
                        updateCover({ [layerKey]: [...existing, newLayer] });
                        input.value = "";
                        toast.success("FX effect applied as overlay layer");
                      }
                    }}
                    className="px-2 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold border border-purple-500"
                    data-testid="button-apply-fx"
                  >
                    Apply
                  </button>
                </div>
                <p className="text-[8px] text-zinc-600">FX layers are added with screen blend mode at 70% opacity</p>
              </div>
              <button
                onClick={() => {
                  const fxInput = document.createElement("input");
                  fxInput.type = "file";
                  fxInput.accept = "image/*";
                  fxInput.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const dataUrl = ev.target?.result as string;
                      const newLayer: ImageLayer = {
                        id: `fx_${Date.now()}`,
                        url: dataUrl,
                        name: "FX Effect Upload",
                        transform: { x: 0, y: 0, width: 300, height: 400, rotation: 0, scaleX: 1, scaleY: 1 },
                        opacity: 0.7,
                        locked: false,
                        blendMode: "screen",
                      };
                      const layerKey = `${coverView}ImageLayers` as keyof CoverData;
                      const existing = (coverData[layerKey] as ImageLayer[]) || [];
                      updateCover({ [layerKey]: [...existing, newLayer] });
                      toast.success("FX effect uploaded and applied");
                    };
                    reader.readAsDataURL(file);
                  };
                  fxInput.click();
                }}
                className="w-full py-1.5 text-[10px] bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 flex items-center justify-center gap-1.5"
                data-testid="button-upload-fx"
              >
                <Upload className="w-3 h-3" /> Upload FX Image
              </button>
            </div>
          </>
        )}
      </div>

      <input ref={frontInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "front")} />
      <input ref={backInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "back")} />

      {showAIGen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
          <div className="bg-zinc-900 border border-zinc-700 p-4 w-[450px]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm flex items-center gap-2"><Wand2 className="w-4 h-4" /> AI Generate {coverView} cover</h3>
              <button onClick={() => setShowAIGen(false)} className="p-1 hover:bg-zinc-800"><X className="w-4 h-4" /></button>
            </div>
            <AIGenerator type="cover" onImageGenerated={handleAIGenerated} />
          </div>
        </div>
      )}

      <AssetBrowser isOpen={showAssetBrowser} onClose={() => setShowAssetBrowser(false)} onSelectAsset={addImageLayer} mode="insert" />
    </div>
  );
}
