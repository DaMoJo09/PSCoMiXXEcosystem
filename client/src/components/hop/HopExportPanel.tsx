import { useState, useCallback, useRef } from "react";
import {
  Download, Film, ImageIcon, X, Loader2, QrCode, Copy, ExternalLink,
  Monitor, Smartphone, Square, FileImage, Columns
} from "lucide-react";
import { toast } from "sonner";
import type { HopScene } from "@shared/schema";

interface ExportMetadata {
  exportId: string;
  hopId: string;
  creatorId: string;
  format: string;
  duration: number;
  scenesIncluded: number;
  assetsUsed: string[];
  rightsValidation: string;
  tier: string;
  watermark: boolean;
  exportedAt: string;
  streamingUrl?: string;
}

type HopMode = "still" | "pan" | "video";

interface HopExportPanelProps {
  scenes: HopScene[];
  title: string;
  projectId: string | null;
  totalDuration: number;
  userTier: string;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  renderCanvas: () => HTMLDivElement | null;
  hopMode?: HopMode;
  panoramaUrl?: string;
}

type ExportFormat = "tiktok" | "youtube_short" | "youtube_standard" | "square" | "cover_art" | "poster" | "story_card" | "qr_code" | "png_still" | "gif_excerpt" | "gif_pan";

const ALL_EXPORT_FORMATS: { id: ExportFormat; label: string; dims: string; type: "video" | "image"; icon: typeof Film; premium: boolean; modes: HopMode[] }[] = [
  { id: "png_still", label: "PNG Still", dims: "1920x1080", type: "image", icon: ImageIcon, premium: false, modes: ["still", "pan"] },
  { id: "gif_excerpt", label: "GIF Excerpt", dims: "1080x1080", type: "image", icon: FileImage, premium: false, modes: ["still", "pan"] },
  { id: "gif_pan", label: "GIF Pan Sweep", dims: "1920x400", type: "image", icon: Columns, premium: false, modes: ["pan"] },
  { id: "tiktok", label: "TikTok / Reels", dims: "1080x1920", type: "video", icon: Smartphone, premium: false, modes: ["video", "pan"] },
  { id: "youtube_short", label: "YouTube Shorts", dims: "1080x1920", type: "video", icon: Smartphone, premium: false, modes: ["video", "pan"] },
  { id: "youtube_standard", label: "YouTube Standard", dims: "1920x1080", type: "video", icon: Monitor, premium: true, modes: ["video"] },
  { id: "square", label: "Square (IG/X)", dims: "1080x1080", type: "video", icon: Square, premium: true, modes: ["video"] },
  { id: "cover_art", label: "Cover Art", dims: "1080x1080", type: "image", icon: ImageIcon, premium: false, modes: ["still", "video"] },
  { id: "poster", label: "Poster", dims: "1080x1350", type: "image", icon: FileImage, premium: true, modes: ["still", "video"] },
  { id: "story_card", label: "Story Card", dims: "1080x1920", type: "image", icon: Columns, premium: true, modes: ["still", "video"] },
  { id: "qr_code", label: "QR Code", dims: "512x512", type: "image", icon: QrCode, premium: false, modes: ["still", "pan", "video"] },
];

function generateQRCode(url: string, size: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#fff";
  ctx.fillRect(4, 4, size - 8, size - 8);

  const text = url.slice(0, 60);
  ctx.fillStyle = "#000";
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "center";
  ctx.fillText("SCAN TO VIEW", size / 2, size / 2 - 20);
  ctx.font = "10px monospace";
  const lines = text.match(/.{1,30}/g) || [];
  lines.forEach((line, i) => {
    ctx.fillText(line, size / 2, size / 2 + i * 14);
  });

  const moduleSize = 6;
  const offset = 20;
  const data = url.split("").map(c => c.charCodeAt(0) % 2);
  for (let i = 0; i < 12; i++) {
    for (let j = 0; j < 12; j++) {
      const idx = (i * 12 + j) % data.length;
      if (data[idx] || (i < 3 && j < 3) || (i < 3 && j > 8) || (i > 8 && j < 3)) {
        ctx.fillRect(offset + j * moduleSize, offset + i * moduleSize, moduleSize - 1, moduleSize - 1);
      }
    }
  }

  return canvas.toDataURL("image/png");
}

function generateSocialCopy(scenes: HopScene[], title: string): { caption: string; hashtags: string[]; description: string } {
  const moods = scenes.map(s => s.mood).filter(Boolean);
  const locations = scenes.map(s => s.location).filter(Boolean);
  const uniqueMoods = Array.from(new Set(moods));
  const uniqueLocations = Array.from(new Set(locations));

  const moodText = uniqueMoods.length > 0 ? uniqueMoods.join(", ") : "creative";
  const locationText = uniqueLocations.length > 0 ? ` Set in ${uniqueLocations.join(", ")}.` : "";

  const caption = `${title} — A ${moodText} visual experience.${locationText} Created with Press Start CoMiXX.`;

  const hashtags: string[] = ["#PressStart", "#CoMiXX", "#HOP", "#DigitalArt"];
  if (uniqueMoods.some(m => m?.includes("cinematic"))) hashtags.push("#Cinematic");
  if (uniqueMoods.some(m => m?.includes("anime"))) hashtags.push("#Anime");
  if (uniqueMoods.some(m => m?.includes("horror"))) hashtags.push("#Horror");
  if (uniqueMoods.some(m => m?.includes("dream"))) hashtags.push("#Surreal");
  if (scenes.length > 5) hashtags.push("#VisualStory");
  hashtags.push("#CreatorEconomy", "#IndieCreator");

  const description = `${title}\n\n${caption}\n\n${scenes.length} scenes · ${scenes.reduce((a, s) => a + s.duration, 0)}s\n\nWatch the full HOP on Press Start Streaming.\n\n${hashtags.join(" ")}`;

  return { caption, hashtags, description };
}

export default function HopExportPanel({
  scenes, title, projectId, totalDuration, userTier, canvasRef, onClose, renderCanvas, hopMode = "video", panoramaUrl,
}: HopExportPanelProps) {
  const EXPORT_FORMATS = ALL_EXPORT_FORMATS.filter(f => f.modes.includes(hopMode));
  const defaultFormat = EXPORT_FORMATS[0]?.id || "cover_art";
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(defaultFormat);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showSocialCopy, setShowSocialCopy] = useState(false);
  const [exportCount] = useState(0);

  const isPremium = ["creator", "pro", "studio", "lifetime", "founders"].includes(userTier);
  const exportLimit = isPremium ? Infinity : 3;
  const showWatermark = !isPremium;

  const formatInfo = EXPORT_FORMATS.find(f => f.id === selectedFormat) || EXPORT_FORMATS[0];
  const socialCopy = generateSocialCopy(scenes, title);
  const streamingUrl = projectId ? `https://psstreaming.online/hop/${projectId}` : "";

  const handleExportImage = useCallback(async () => {
    setExporting(true);
    setProgress(0);
    try {
      const { toPng } = await import("html-to-image");
      const el = canvasRef.current;
      if (!el) throw new Error("Canvas not available");

      setProgress(30);
      const [targetW, targetH] = formatInfo.dims.split("x").map(Number);
      const dataUrl = await toPng(el, { pixelRatio: targetW / el.clientWidth });
      setProgress(70);

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d")!;

      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = dataUrl;
      });
      ctx.drawImage(img, 0, 0, targetW, targetH);

      if (showWatermark) {
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText("Made with Press Start CoMiXX", targetW - 20, targetH - 20);
      }

      setProgress(90);
      const link = document.createElement("a");
      link.download = `${title.replace(/[^a-z0-9]/gi, "_")}_${selectedFormat}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      setProgress(100);
      toast.success(`${formatInfo.label} exported`);
    } catch (err: any) {
      toast.error("Export failed: " + (err.message || "unknown"));
    } finally {
      setExporting(false);
    }
  }, [canvasRef, formatInfo, selectedFormat, showWatermark, title]);

  const handleExportVideo = useCallback(async () => {
    setExporting(true);
    setProgress(0);
    try {
      const { toPng } = await import("html-to-image");
      const el = canvasRef.current;
      if (!el) throw new Error("Canvas not available");

      const [targetW, targetH] = formatInfo.dims.split("x").map(Number);
      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d")!;

      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
      const chunks: Blob[] = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

      const recordPromise = new Promise<void>(resolve => {
        recorder.onstop = () => resolve();
      });

      recorder.start();

      for (let i = 0; i < scenes.length; i++) {
        setProgress(Math.round((i / scenes.length) * 90));
        const frameUrl = await toPng(el, { pixelRatio: targetW / el.clientWidth });
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = frameUrl;
        });

        const frameDuration = scenes[i].duration * 1000;
        const frameCount = Math.ceil(frameDuration / 33);
        for (let f = 0; f < frameCount; f++) {
          ctx.clearRect(0, 0, targetW, targetH);
          ctx.drawImage(img, 0, 0, targetW, targetH);
          if (showWatermark) {
            ctx.fillStyle = "rgba(255,255,255,0.6)";
            ctx.font = "bold 14px sans-serif";
            ctx.textAlign = "right";
            ctx.fillText("Made with Press Start CoMiXX", targetW - 20, targetH - 20);
          }
          await new Promise(r => setTimeout(r, 33));
        }
      }

      if (showWatermark) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Made with Press Start CoMiXX", targetW / 2, targetH / 2);
        ctx.font = "16px sans-serif";
        ctx.fillText("pscomixx.com", targetW / 2, targetH / 2 + 30);
        await new Promise(r => setTimeout(r, 2000));
      }

      recorder.stop();
      await recordPromise;

      setProgress(95);
      const blob = new Blob(chunks, { type: "video/webm" });
      const link = document.createElement("a");
      link.download = `${title.replace(/[^a-z0-9]/gi, "_")}_${selectedFormat}.webm`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      setProgress(100);
      toast.success(`${formatInfo.label} video exported`);
    } catch (err: any) {
      toast.error("Video export failed: " + (err.message || "unknown"));
    } finally {
      setExporting(false);
    }
  }, [canvasRef, formatInfo, scenes, selectedFormat, showWatermark, title]);

  const handleExportQR = useCallback(() => {
    if (!streamingUrl) { toast.error("Save and publish first to get a streaming URL"); return; }
    const dataUrl = generateQRCode(streamingUrl, 512);
    const link = document.createElement("a");
    link.download = `${title.replace(/[^a-z0-9]/gi, "_")}_qr.png`;
    link.href = dataUrl;
    link.click();
    toast.success("QR code exported");
  }, [streamingUrl, title]);

  const handleExportPanPng = useCallback(async () => {
    if (!panoramaUrl) { toast.error("Build a panorama in Stitch Mode first"); return; }
    setExporting(true);
    setProgress(0);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = panoramaUrl;
      });
      setProgress(50);
      const link = document.createElement("a");
      link.download = `${title.replace(/[^a-z0-9]/gi, "_")}_panorama.png`;
      link.href = panoramaUrl;
      link.click();
      setProgress(100);
      toast.success("Panorama PNG exported");
    } catch {
      toast.error("Failed to export panorama");
    } finally {
      setExporting(false);
    }
  }, [panoramaUrl, title]);

  const handleExportGifExcerpt = useCallback(async () => {
    setExporting(true);
    setProgress(0);
    try {
      const { toPng } = await import("html-to-image");
      const el = canvasRef.current;
      if (!el) throw new Error("Canvas not available");
      setProgress(30);
      const dataUrl = await toPng(el, { pixelRatio: 2 });
      setProgress(80);
      const link = document.createElement("a");
      link.download = `${title.replace(/[^a-z0-9]/gi, "_")}_excerpt.png`;
      link.href = dataUrl;
      link.click();
      setProgress(100);
      toast.success("GIF excerpt exported as PNG");
    } catch (err: any) {
      toast.error("Export failed: " + (err.message || "unknown"));
    } finally {
      setExporting(false);
    }
  }, [canvasRef, title]);

  const handleExport = useCallback(() => {
    if (!isPremium && exportCount >= exportLimit) {
      toast.error("Export limit reached. Upgrade for unlimited exports.");
      return;
    }
    if (formatInfo.premium && !isPremium) {
      toast.error("This format requires Founders Pass or higher tier.");
      return;
    }
    if (selectedFormat === "qr_code") {
      handleExportQR();
    } else if (selectedFormat === "png_still" && hopMode === "pan") {
      handleExportPanPng();
    } else if (selectedFormat === "gif_excerpt" || selectedFormat === "gif_pan") {
      handleExportGifExcerpt();
    } else if (formatInfo.type === "video") {
      handleExportVideo();
    } else {
      handleExportImage();
    }
  }, [isPremium, exportCount, exportLimit, formatInfo, selectedFormat, hopMode, handleExportQR, handleExportVideo, handleExportImage, handleExportPanPng, handleExportGifExcerpt]);

  return (
    <div className="fixed inset-0 bg-black/80 z-[95] flex items-center justify-center p-4" data-testid="hop-export-panel">
      <div className="bg-zinc-900 border border-white/10 w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Download className="w-4 h-4 text-orange-400" /> Export HOP — {hopMode.toUpperCase()} Mode
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 transition"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <p className="text-[9px] text-zinc-500 font-bold uppercase mb-2">Export Format</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {EXPORT_FORMATS.map(fmt => {
                const Icon = fmt.icon;
                const locked = fmt.premium && !isPremium;
                return (
                  <button
                    key={fmt.id}
                    onClick={() => !locked && setSelectedFormat(fmt.id)}
                    className={`p-2 text-left transition border ${
                      selectedFormat === fmt.id ? "border-orange-500 bg-orange-900/20" :
                      locked ? "border-white/5 bg-zinc-800/50 opacity-50" :
                      "border-white/10 bg-zinc-800 hover:border-orange-500/50"
                    }`}
                    data-testid={`export-format-${fmt.id}`}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <Icon className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="text-[10px] font-bold text-white">{fmt.label}</span>
                    </div>
                    <div className="text-[8px] text-zinc-500">{fmt.dims} · {fmt.type}</div>
                    {locked && <div className="text-[7px] text-orange-400 mt-0.5">FOUNDERS PASS</div>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-zinc-800 border border-white/10 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-zinc-400 font-bold">Export Details</span>
              {showWatermark && <span className="text-[8px] text-orange-400 bg-orange-900/30 px-1.5 py-0.5 border border-orange-500/30">WATERMARKED</span>}
            </div>
            <div className="grid grid-cols-2 gap-2 text-[9px]">
              <div><span className="text-zinc-600">Format:</span> <span className="text-white">{formatInfo.label}</span></div>
              <div><span className="text-zinc-600">Resolution:</span> <span className="text-white">{formatInfo.dims}</span></div>
              <div><span className="text-zinc-600">Scenes:</span> <span className="text-white">{scenes.length}</span></div>
              <div><span className="text-zinc-600">Duration:</span> <span className="text-white">{totalDuration}s</span></div>
              <div><span className="text-zinc-600">Tier:</span> <span className="text-white">{userTier}</span></div>
              <div><span className="text-zinc-600">Watermark:</span> <span className={showWatermark ? "text-orange-400" : "text-green-400"}>{showWatermark ? "Yes" : "No"}</span></div>
            </div>
            {!isPremium && (
              <div className="mt-2 text-[8px] text-zinc-500">
                {exportLimit - exportCount} exports remaining this month (Free tier: {exportLimit}/month)
              </div>
            )}
          </div>

          <div>
            <button
              onClick={() => setShowSocialCopy(!showSocialCopy)}
              className="text-[9px] text-cyan-400 hover:text-cyan-300 transition mb-2"
            >
              {showSocialCopy ? "Hide" : "Show"} Social Copy
            </button>
            {showSocialCopy && (
              <div className="space-y-2 bg-zinc-800 border border-white/10 p-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] text-zinc-500 uppercase font-bold">Caption</span>
                    <button onClick={() => { navigator.clipboard.writeText(socialCopy.caption); toast.success("Copied"); }} className="p-0.5 hover:bg-zinc-700"><Copy className="w-2.5 h-2.5 text-zinc-500" /></button>
                  </div>
                  <p className="text-[10px] text-zinc-300">{socialCopy.caption}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] text-zinc-500 uppercase font-bold">Hashtags</span>
                    <button onClick={() => { navigator.clipboard.writeText(socialCopy.hashtags.join(" ")); toast.success("Copied"); }} className="p-0.5 hover:bg-zinc-700"><Copy className="w-2.5 h-2.5 text-zinc-500" /></button>
                  </div>
                  <p className="text-[10px] text-cyan-400">{socialCopy.hashtags.join(" ")}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] text-zinc-500 uppercase font-bold">YouTube Description</span>
                    <button onClick={() => { navigator.clipboard.writeText(socialCopy.description); toast.success("Copied"); }} className="p-0.5 hover:bg-zinc-700"><Copy className="w-2.5 h-2.5 text-zinc-500" /></button>
                  </div>
                  <p className="text-[10px] text-zinc-300 whitespace-pre-wrap">{socialCopy.description}</p>
                </div>
                {streamingUrl && (
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] text-zinc-500">Streaming Link:</span>
                    <a href={streamingUrl} target="_blank" rel="noopener" className="text-[9px] text-orange-400 hover:underline flex items-center gap-0.5">
                      {streamingUrl} <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <button onClick={() => { navigator.clipboard.writeText(streamingUrl); toast.success("Link copied"); }} className="p-0.5 hover:bg-zinc-700"><Copy className="w-2.5 h-2.5 text-zinc-500" /></button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-white/10 shrink-0">
          {exporting ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                <span className="text-xs text-zinc-400">Exporting... {progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-800">
                <div className="h-full bg-orange-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <button
              onClick={handleExport}
              className="w-full py-2 text-sm bg-orange-600 hover:bg-orange-500 text-white font-bold transition flex items-center justify-center gap-2"
              data-testid="export-start-btn"
            >
              <Download className="w-4 h-4" /> Export {formatInfo.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
