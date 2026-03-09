import { Layout } from "@/components/layout/Layout";
import { useState } from "react";
import { useLocation } from "wouter";
import {
  Book, CreditCard, Shirt, Image as ImageIcon, Sticker,
  Download, AlertTriangle, CheckCircle, Ruler, Printer,
  FileDown, ArrowRight, Settings, ChevronDown, ChevronUp,
  Monitor, Scissors, Grid, Eye
} from "lucide-react";

type AssetType = "comic" | "card" | "shirt" | "poster" | "sticker";

interface ExportPreset {
  label: string;
  width: string;
  height: string;
  dpi: number;
  bleed: string;
}

interface AssetConfig {
  id: AssetType;
  name: string;
  icon: typeof Book;
  description: string;
  creatorLink: string;
  creatorLabel: string;
  presets: ExportPreset[];
  notes: string[];
}

const assetTypes: AssetConfig[] = [
  {
    id: "comic",
    name: "Comic Book",
    icon: Book,
    description: "Standard comic book pages ready for offset or digital printing. Includes cover and interior pages.",
    creatorLink: "/creator/comic",
    creatorLabel: "Open Comic Creator",
    presets: [
      { label: "Standard Comic", width: "6.625\"", height: "10.25\"", dpi: 300, bleed: "0.125\"" },
      { label: "Digest Size", width: "5.5\"", height: "8.5\"", dpi: 300, bleed: "0.125\"" },
      { label: "Magazine Size", width: "8.5\"", height: "11\"", dpi: 300, bleed: "0.125\"" },
      { label: "Manga (JIS B6)", width: "5\"", height: "7.125\"", dpi: 300, bleed: "0.125\"" },
    ],
    notes: [
      "Export at 300 DPI minimum for print",
      "Include 0.125\" bleed on all sides",
      "Keep text within 0.25\" safe margin",
      "CMYK color mode recommended for offset printing",
    ],
  },
  {
    id: "card",
    name: "Trading Card",
    icon: CreditCard,
    description: "Trading cards, character cards, and collectible card sets. Standard poker size with bleed.",
    creatorLink: "/creator/card",
    creatorLabel: "Open Card Creator",
    presets: [
      { label: "Poker Size (Standard)", width: "2.5\"", height: "3.5\"", dpi: 300, bleed: "0.0625\"" },
      { label: "Bridge Size", width: "2.25\"", height: "3.5\"", dpi: 300, bleed: "0.0625\"" },
      { label: "Tarot Size", width: "2.75\"", height: "4.75\"", dpi: 300, bleed: "0.0625\"" },
      { label: "Mini Card", width: "1.75\"", height: "2.5\"", dpi: 300, bleed: "0.0625\"" },
    ],
    notes: [
      "Export front and back separately",
      "300 DPI required for sharp text and details",
      "Include 1/16\" bleed for card cutting",
      "Round corners are applied during cutting",
    ],
  },
  {
    id: "shirt",
    name: "T-Shirt Graphic",
    icon: Shirt,
    description: "High-resolution artwork sized for screen printing and DTG (direct-to-garment) printing.",
    creatorLink: "/creator/comic",
    creatorLabel: "Create in Comic Studio",
    presets: [
      { label: "Full Front (Adult)", width: "12\"", height: "16\"", dpi: 300, bleed: "0\"" },
      { label: "Left Chest", width: "4\"", height: "4\"", dpi: 300, bleed: "0\"" },
      { label: "Full Back (Adult)", width: "12\"", height: "14\"", dpi: 300, bleed: "0\"" },
      { label: "Youth Front", width: "10\"", height: "12\"", dpi: 300, bleed: "0\"" },
      { label: "Sleeve Print", width: "4\"", height: "12\"", dpi: 300, bleed: "0\"" },
    ],
    notes: [
      "Export as PNG with transparent background",
      "300 DPI at actual print size",
      "Limit to 6-8 colors for screen printing",
      "DTG allows unlimited colors but needs white underbase for dark shirts",
    ],
  },
  {
    id: "poster",
    name: "Poster",
    icon: ImageIcon,
    description: "Large format prints for wall art, event promotion, and classroom display.",
    creatorLink: "/creator/comic",
    creatorLabel: "Create in Comic Studio",
    presets: [
      { label: "Tabloid (11×17)", width: "11\"", height: "17\"", dpi: 300, bleed: "0.125\"" },
      { label: "Architectural (18×24)", width: "18\"", height: "24\"", dpi: 300, bleed: "0.125\"" },
      { label: "Movie Poster (24×36)", width: "24\"", height: "36\"", dpi: 150, bleed: "0.25\"" },
      { label: "A3 (International)", width: "11.7\"", height: "16.5\"", dpi: 300, bleed: "0.125\"" },
    ],
    notes: [
      "300 DPI for sizes up to 18×24\"",
      "150 DPI acceptable for 24×36\" and larger",
      "Add bleed for full-bleed edge-to-edge prints",
      "RGB is fine for digital/inkjet posters",
    ],
  },
  {
    id: "sticker",
    name: "Sticker Sheet",
    icon: Sticker,
    description: "Die-cut stickers, sticker sheets, and vinyl decals for merch and promotional use.",
    creatorLink: "/creator/comic",
    creatorLabel: "Create in Comic Studio",
    presets: [
      { label: "2\" Circle", width: "2\"", height: "2\"", dpi: 300, bleed: "0.0625\"" },
      { label: "3\" Circle", width: "3\"", height: "3\"", dpi: 300, bleed: "0.0625\"" },
      { label: "3×4\" Rectangle", width: "3\"", height: "4\"", dpi: 300, bleed: "0.0625\"" },
      { label: "Sheet (8.5×11\")", width: "8.5\"", height: "11\"", dpi: 300, bleed: "0.125\"" },
      { label: "Custom Die-Cut", width: "Varies", height: "Varies", dpi: 300, bleed: "0.0625\"" },
    ],
    notes: [
      "Export as PNG with transparent background for die-cut",
      "300 DPI required for crisp edges",
      "Include 1/16\" bleed beyond die-cut line",
      "Vinyl stickers need vector outlines (SVG) for cutting",
    ],
  },
];

interface ExportSettings {
  trimMarks: boolean;
  bleedVisible: boolean;
  safeMargin: boolean;
  resolution: number;
  colorMode: "rgb" | "cmyk";
}

export default function ExportDashboard() {
  const [, navigate] = useLocation();
  const [selectedType, setSelectedType] = useState<AssetType>("comic");
  const [expandedPreset, setExpandedPreset] = useState<number>(0);
  const [settings, setSettings] = useState<ExportSettings>({
    trimMarks: true,
    bleedVisible: true,
    safeMargin: true,
    resolution: 300,
    colorMode: "cmyk",
  });

  const activeAsset = assetTypes.find(a => a.id === selectedType)!;

  const resolutionStatus = settings.resolution >= 300 ? "good" : settings.resolution >= 150 ? "warning" : "bad";

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white" data-testid="page-export-dashboard">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-10" data-testid="section-header">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.3em] block mb-2">PRINT STUDIO</span>
            <h1
              className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-3"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              data-testid="text-page-title"
            >
              EXPORT DASHBOARD
            </h1>
            <div className="w-24 h-1 bg-white mb-4" />
            <p className="text-sm sm:text-base text-zinc-400 font-mono max-w-2xl" data-testid="text-page-description">
              Prepare your creations for professional printing. Select your asset type, configure export settings, and download print-ready files.
            </p>
          </div>

          <div className="mb-10" data-testid="section-asset-selector">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.2em] block mb-4">SELECT ASSET TYPE</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {assetTypes.map((asset) => (
                <button
                  key={asset.id}
                  data-testid={`button-asset-${asset.id}`}
                  onClick={() => {
                    setSelectedType(asset.id);
                    setExpandedPreset(0);
                  }}
                  className={`p-4 border transition-all text-left group cursor-pointer ${
                    selectedType === asset.id
                      ? "border-white bg-white/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className={`w-10 h-10 border flex items-center justify-center mb-3 transition-colors ${
                    selectedType === asset.id ? "border-white" : "border-white/20 group-hover:border-white/40"
                  }`}>
                    <asset.icon className={`w-5 h-5 transition-colors ${
                      selectedType === asset.id ? "text-white" : "text-zinc-400 group-hover:text-white"
                    }`} />
                  </div>
                  <span className={`text-sm font-black uppercase tracking-wider block ${
                    selectedType === asset.id ? "text-white" : "text-zinc-400"
                  }`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {asset.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="border border-white/10 bg-white/[0.02] p-6" data-testid="section-asset-details">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-14 h-14 border-2 border-white/20 flex items-center justify-center shrink-0">
                    <activeAsset.icon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2
                      className="text-xl font-black uppercase tracking-wider mb-1"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      data-testid="text-asset-name"
                    >
                      {activeAsset.name}
                    </h2>
                    <p className="text-sm text-zinc-400 font-mono" data-testid="text-asset-description">
                      {activeAsset.description}
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.2em] block mb-3">SIZE PRESETS</span>
                  <div className="space-y-2">
                    {activeAsset.presets.map((preset, i) => (
                      <button
                        key={i}
                        data-testid={`button-preset-${i}`}
                        onClick={() => setExpandedPreset(i)}
                        className={`w-full text-left border transition-all cursor-pointer ${
                          expandedPreset === i
                            ? "border-white/30 bg-white/[0.05]"
                            : "border-white/10 bg-white/[0.01] hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-3">
                            <Ruler className="w-4 h-4 text-zinc-500" />
                            <span className="text-sm font-bold uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                              {preset.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-mono text-zinc-400">
                              {preset.width} × {preset.height}
                            </span>
                            <span className="text-xs font-mono text-zinc-500">
                              {preset.dpi} DPI
                            </span>
                            {expandedPreset === i ? (
                              <ChevronUp className="w-4 h-4 text-zinc-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-zinc-500" />
                            )}
                          </div>
                        </div>
                        {expandedPreset === i && (
                          <div className="px-3 pb-3 border-t border-white/5 pt-3">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div>
                                <span className="text-[10px] font-mono text-zinc-600 uppercase block mb-1">Width</span>
                                <span className="text-sm font-mono text-white" data-testid={`text-preset-width-${i}`}>{preset.width}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-mono text-zinc-600 uppercase block mb-1">Height</span>
                                <span className="text-sm font-mono text-white" data-testid={`text-preset-height-${i}`}>{preset.height}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-mono text-zinc-600 uppercase block mb-1">Resolution</span>
                                <span className="text-sm font-mono text-white" data-testid={`text-preset-dpi-${i}`}>{preset.dpi} DPI</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-mono text-zinc-600 uppercase block mb-1">Bleed</span>
                                <span className="text-sm font-mono text-white" data-testid={`text-preset-bleed-${i}`}>{preset.bleed}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.2em] block mb-3">PRINT NOTES</span>
                  <div className="space-y-2">
                    {activeAsset.notes.map((note, i) => (
                      <div key={i} className="flex items-start gap-2" data-testid={`text-note-${i}`}>
                        <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 mt-0.5 shrink-0" />
                        <span className="text-xs font-mono text-zinc-400">{note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border border-white/10 bg-white/[0.02] p-6" data-testid="section-export-action">
                <h3
                  className="text-lg font-black uppercase tracking-wider mb-4"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  EXPORT WORKFLOW
                </h3>
                <p className="text-sm text-zinc-400 font-mono mb-6">
                  Open the {activeAsset.name} creator tool to design and export your print-ready file with the settings configured above.
                </p>
                <button
                  data-testid="button-open-creator"
                  onClick={() => navigate(activeAsset.creatorLink)}
                  className="group inline-flex items-center gap-3 px-6 py-3 bg-white text-black font-bold text-sm uppercase tracking-wider hover:bg-zinc-200 transition-all relative border-none cursor-pointer"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {activeAsset.creatorLabel}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  <div className="absolute inset-0 border-2 border-white translate-x-1.5 translate-y-1.5 -z-10 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform" />
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="border border-white/10 bg-white/[0.02] p-6" data-testid="section-export-settings">
                <div className="flex items-center gap-2 mb-5">
                  <Settings className="w-5 h-5 text-zinc-400" />
                  <h3
                    className="text-base font-black uppercase tracking-wider"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    EXPORT SETTINGS
                  </h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="flex items-center justify-between cursor-pointer group">
                      <div className="flex items-center gap-2">
                        <Scissors className="w-4 h-4 text-zinc-500" />
                        <span className="text-xs font-mono text-zinc-300 uppercase tracking-wider">Trim Marks</span>
                      </div>
                      <button
                        data-testid="toggle-trim-marks"
                        onClick={() => setSettings(s => ({ ...s, trimMarks: !s.trimMarks }))}
                        className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer border-none ${
                          settings.trimMarks ? "bg-white" : "bg-zinc-700"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full absolute top-0.5 transition-all ${
                          settings.trimMarks ? "left-5.5 bg-black left-[22px]" : "left-0.5 bg-zinc-400"
                        }`} />
                      </button>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center justify-between cursor-pointer group">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-zinc-500" />
                        <span className="text-xs font-mono text-zinc-300 uppercase tracking-wider">Show Bleed</span>
                      </div>
                      <button
                        data-testid="toggle-bleed"
                        onClick={() => setSettings(s => ({ ...s, bleedVisible: !s.bleedVisible }))}
                        className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer border-none ${
                          settings.bleedVisible ? "bg-white" : "bg-zinc-700"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full absolute top-0.5 transition-all ${
                          settings.bleedVisible ? "bg-black left-[22px]" : "left-0.5 bg-zinc-400"
                        }`} />
                      </button>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center justify-between cursor-pointer group">
                      <div className="flex items-center gap-2">
                        <Grid className="w-4 h-4 text-zinc-500" />
                        <span className="text-xs font-mono text-zinc-300 uppercase tracking-wider">Safe Margin</span>
                      </div>
                      <button
                        data-testid="toggle-safe-margin"
                        onClick={() => setSettings(s => ({ ...s, safeMargin: !s.safeMargin }))}
                        className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer border-none ${
                          settings.safeMargin ? "bg-white" : "bg-zinc-700"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full absolute top-0.5 transition-all ${
                          settings.safeMargin ? "bg-black left-[22px]" : "left-0.5 bg-zinc-400"
                        }`} />
                      </button>
                    </label>
                  </div>

                  <div className="border-t border-white/5 pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Monitor className="w-4 h-4 text-zinc-500" />
                      <span className="text-xs font-mono text-zinc-300 uppercase tracking-wider">Resolution</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        data-testid="input-resolution"
                        min={72}
                        max={600}
                        step={1}
                        value={settings.resolution}
                        onChange={(e) => setSettings(s => ({ ...s, resolution: Number(e.target.value) }))}
                        className="flex-1 accent-white"
                      />
                      <span className="text-sm font-mono text-white w-16 text-right" data-testid="text-resolution-value">
                        {settings.resolution}
                      </span>
                    </div>
                    <div className={`flex items-center gap-1.5 mt-2 ${
                      resolutionStatus === "good" ? "text-green-400" : resolutionStatus === "warning" ? "text-yellow-400" : "text-red-400"
                    }`}>
                      {resolutionStatus === "good" ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                      <span className="text-[10px] font-mono uppercase" data-testid="text-resolution-status">
                        {resolutionStatus === "good"
                          ? "Print-ready resolution"
                          : resolutionStatus === "warning"
                            ? "Acceptable for large formats only"
                            : "Too low for print — increase to 300+"}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Printer className="w-4 h-4 text-zinc-500" />
                      <span className="text-xs font-mono text-zinc-300 uppercase tracking-wider">Color Mode</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        data-testid="button-color-rgb"
                        onClick={() => setSettings(s => ({ ...s, colorMode: "rgb" }))}
                        className={`px-3 py-2 text-xs font-mono uppercase tracking-wider border transition-all cursor-pointer ${
                          settings.colorMode === "rgb"
                            ? "border-white bg-white/10 text-white"
                            : "border-white/10 text-zinc-500 hover:border-white/30"
                        }`}
                      >
                        RGB
                      </button>
                      <button
                        data-testid="button-color-cmyk"
                        onClick={() => setSettings(s => ({ ...s, colorMode: "cmyk" }))}
                        className={`px-3 py-2 text-xs font-mono uppercase tracking-wider border transition-all cursor-pointer ${
                          settings.colorMode === "cmyk"
                            ? "border-white bg-white/10 text-white"
                            : "border-white/10 text-zinc-500 hover:border-white/30"
                        }`}
                      >
                        CMYK
                      </button>
                    </div>
                    <p className="text-[10px] font-mono text-zinc-600 mt-2">
                      {settings.colorMode === "cmyk"
                        ? "CMYK recommended for offset printing. Colors may appear slightly different on screen."
                        : "RGB suitable for digital prints and inkjet. Not recommended for offset."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-white/10 bg-white/[0.02] p-6" data-testid="section-guide-preview">
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.2em] block mb-3">GUIDE PREVIEW</span>
                <div className="relative w-full aspect-[3/4] border border-white/20 bg-zinc-900 overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-mono text-zinc-600">ARTWORK AREA</span>
                  </div>

                  {settings.bleedVisible && (
                    <div className="absolute inset-0 border-4 border-dashed border-red-500/30 pointer-events-none" data-testid="guide-bleed">
                      <span className="absolute top-1 right-1 text-[8px] font-mono text-red-500/50">BLEED</span>
                    </div>
                  )}

                  {settings.trimMarks && (
                    <>
                      <div className="absolute top-0 left-3 w-px h-3 bg-white/40" />
                      <div className="absolute top-3 left-0 w-3 h-px bg-white/40" />
                      <div className="absolute top-0 right-3 w-px h-3 bg-white/40" />
                      <div className="absolute top-3 right-0 w-3 h-px bg-white/40" />
                      <div className="absolute bottom-0 left-3 w-px h-3 bg-white/40" />
                      <div className="absolute bottom-3 left-0 w-3 h-px bg-white/40" />
                      <div className="absolute bottom-0 right-3 w-px h-3 bg-white/40" />
                      <div className="absolute bottom-3 right-0 w-3 h-px bg-white/40" />
                      <span className="absolute bottom-1 left-1 text-[8px] font-mono text-white/30">TRIM</span>
                    </>
                  )}

                  {settings.safeMargin && (
                    <div className="absolute inset-4 border border-dashed border-cyan-500/30 pointer-events-none" data-testid="guide-safe-margin">
                      <span className="absolute bottom-1 right-1 text-[8px] font-mono text-cyan-500/50">SAFE</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 mt-3">
                  {settings.bleedVisible && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-0.5 border border-dashed border-red-500/50" />
                      <span className="text-[9px] font-mono text-zinc-500">Bleed</span>
                    </div>
                  )}
                  {settings.trimMarks && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-0.5 bg-white/40" />
                      <span className="text-[9px] font-mono text-zinc-500">Trim</span>
                    </div>
                  )}
                  {settings.safeMargin && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-0.5 border border-dashed border-cyan-500/50" />
                      <span className="text-[9px] font-mono text-zinc-500">Safe</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 border-t border-white/10 pt-10" data-testid="section-cta">
            <div className="text-center mb-8">
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.3em] block mb-3">READY TO PRINT?</span>
              <h3
                className="text-2xl sm:text-4xl font-black uppercase tracking-tight mb-3"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                FROM SCREEN TO PRINT
              </h3>
              <div className="w-16 h-1 bg-white mx-auto mb-4" />
              <p className="text-sm text-zinc-400 font-mono max-w-xl mx-auto">
                Export your print-ready file from the creator tool, then request a print quote or order directly through Press Start.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
              <button
                data-testid="button-cta-download"
                onClick={() => navigate(activeAsset.creatorLink)}
                className="group p-5 border border-white/10 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.05] transition-all text-left cursor-pointer"
              >
                <FileDown className="w-6 h-6 text-zinc-400 group-hover:text-white mb-3 transition-colors" />
                <span className="text-sm font-black uppercase tracking-wider block mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Download Print-Ready File
                </span>
                <span className="text-xs font-mono text-zinc-500">
                  Export from the creator tool
                </span>
              </button>

              <button
                data-testid="button-cta-quote"
                onClick={() => navigate("/print-studio/quote")}
                className="group p-5 border border-white/10 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.05] transition-all text-left cursor-pointer"
              >
                <Printer className="w-6 h-6 text-zinc-400 group-hover:text-white mb-3 transition-colors" />
                <span className="text-sm font-black uppercase tracking-wider block mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Request Print Quote
                </span>
                <span className="text-xs font-mono text-zinc-500">
                  Get pricing for your project
                </span>
              </button>

              <button
                data-testid="button-cta-order"
                onClick={() => navigate("/print-studio/packages")}
                className="group p-5 border border-white bg-white/10 hover:bg-white/20 transition-all text-left cursor-pointer"
              >
                <Download className="w-6 h-6 text-white mb-3" />
                <span className="text-sm font-black uppercase tracking-wider block mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Order Through Press Start
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  View packages & bundles
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
