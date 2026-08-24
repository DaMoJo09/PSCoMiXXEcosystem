import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Gamepad2,
  Loader2,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import type { MasterStreamingItem } from "@/lib/streamingMasterCatalog";

type UnknownRecord = Record<string, unknown>;

type ReadPage = {
  id: string;
  imageUrl: string;
  holdMs: number;
  startMs: number | null;
  endMs: number | null;
};

type ExperienceLayer = {
  id: string;
  url: string;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  parallax: number;
};

type ExperienceFocus = {
  id: string;
  label: string | null;
  x: number;
  y: number;
  zoom: number;
};

type CameraStep = {
  targetFocusId: string;
  durationMs: number;
  easing: string;
};

type DialogueLine = {
  speaker: string | null;
  text: string;
  startMs: number;
  durationMs: number;
};

type ExperienceHotspot = {
  label: string;
  actionType: string;
  targetSceneId: string | null;
  focusId: string | null;
};

type ExperienceChoice = {
  label: string;
  targetSceneId: string | null;
};

type ExperiencePanel = {
  id: string;
  baseUrl: string | null;
  durationMs: number;
  layers: ExperienceLayer[];
  focusPoints: ExperienceFocus[];
  cameraSequence: CameraStep[];
  dialogue: DialogueLine[];
  hotspots: ExperienceHotspot[];
};

type ExperienceScene = {
  id: string;
  type: string;
  title: string | null;
  panel: ExperiencePanel | null;
  choicePrompt: string | null;
  choices: ExperienceChoice[];
  nextSceneId: string | null;
  endingLabel: string | null;
};

type CameraState = {
  x: number;
  y: number;
  zoom: number;
  label: string | null;
};

const CATALOG_FEED_URL =
  import.meta.env.VITE_PS_CATALOG_FEED_URL ||
  "https://upivslgwjtvqymonliib.supabase.co/functions/v1/catalog-feed";

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : null;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function optionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function firstString(record: UnknownRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = asString(record[key]);
    if (value) return value;
  }
  return null;
}

function unwrapManifest(root: UnknownRecord, mode: "read" | "experience"): UnknownRecord {
  let source = root;
  const keys = mode === "read"
    ? ["data", "manifest", "read_manifest"]
    : ["data", "manifest", "experience_manifest"];

  for (const key of keys) {
    const nested = asRecord(source[key]);
    if (nested) source = nested;
  }
  return source;
}

function resolveAsset(value: unknown): string | null {
  if (typeof value === "string") return asString(value);
  const record = asRecord(value);
  if (!record) return null;

  const direct = firstString(record, ["asset_url", "image_url", "url", "uri", "src"]);
  if (direct) return direct;

  const nestedAsset = record.asset;
  if (typeof nestedAsset === "string") return asString(nestedAsset);
  const nested = asRecord(nestedAsset);
  if (nested) return firstString(nested, ["url", "asset_url", "image_url"]);
  return null;
}

function normalizeReadPages(source: UnknownRecord): ReadPage[] {
  if (!Array.isArray(source.pages)) return [];

  return source.pages.flatMap((page, index) => {
    const imageUrl = typeof page === "string"
      ? asString(page)
      : resolveAsset(page);
    if (!imageUrl) return [];

    const record = asRecord(page);
    const id = record
      ? firstString(record, ["page_id", "scene_id", "id"]) || `page-${index + 1}`
      : `page-${index + 1}`;
    const holdMs = record ? Math.max(250, asNumber(record.hold_ms, 8500)) : 8500;
    const startMs = record
      ? optionalNumber(record.timeline_start_ms) ?? optionalNumber(record.start_ms)
      : null;
    const endMs = record
      ? optionalNumber(record.timeline_end_ms) ?? optionalNumber(record.end_ms)
      : null;

    return [{ id, imageUrl, holdMs, startMs, endMs }];
  });
}

function normalizeFocusPoints(panel: UnknownRecord): ExperienceFocus[] {
  if (!Array.isArray(panel.focus_points)) return [];
  return panel.focus_points.flatMap((value, index) => {
    const focus = asRecord(value);
    if (!focus) return [];
    const id = firstString(focus, ["focus_id", "id"]) || `focus-${index + 1}`;
    return [{
      id,
      label: firstString(focus, ["label", "title", "name"]),
      x: asNumber(focus.x, 0.5),
      y: asNumber(focus.y, 0.5),
      zoom: Math.max(0.25, asNumber(focus.zoom, 1)),
    }];
  });
}

function normalizeCamera(panel: UnknownRecord): CameraStep[] {
  if (!Array.isArray(panel.camera_sequence)) return [];
  return panel.camera_sequence.flatMap((value) => {
    const step = asRecord(value);
    if (!step) return [];
    const targetFocusId = firstString(step, ["target_focus_id", "focus_id"]);
    if (!targetFocusId) return [];
    return [{
      targetFocusId,
      durationMs: Math.max(100, asNumber(step.duration_ms, 100)),
      easing: firstString(step, ["easing"]) || "linear",
    }];
  });
}

function normalizeDialogue(panel: UnknownRecord): DialogueLine[] {
  if (!Array.isArray(panel.dialogue)) return [];
  return panel.dialogue.flatMap((value) => {
    const line = asRecord(value);
    if (!line) return [];
    const text = firstString(line, ["text", "dialogue", "caption"]);
    if (!text) return [];
    return [{
      speaker: firstString(line, ["speaker", "name"]),
      text,
      startMs: Math.max(0, asNumber(line.start_ms, 0)),
      durationMs: Math.max(100, asNumber(line.duration_ms, 2000)),
    }];
  });
}

function normalizeHotspots(panel: UnknownRecord): ExperienceHotspot[] {
  if (!Array.isArray(panel.hotspots)) return [];
  return panel.hotspots.flatMap((value, index) => {
    const hotspot = asRecord(value);
    if (!hotspot) return [];
    const action = asRecord(hotspot.action);
    return [{
      label: firstString(hotspot, ["label", "title", "name"]) || `Hotspot ${index + 1}`,
      actionType: (action ? firstString(action, ["type"]) : null)?.toUpperCase() || "",
      targetSceneId: action ? firstString(action, ["scene_id", "next_scene_id", "target_scene_id"]) : null,
      focusId: action ? firstString(action, ["focus_id", "target_focus_id"]) : null,
    }];
  });
}

function normalizeLayers(panel: UnknownRecord): ExperienceLayer[] {
  if (!Array.isArray(panel.layers)) return [];
  return panel.layers.slice(0, 6).flatMap((value, index) => {
    const layer = asRecord(value);
    const url = resolveAsset(value);
    if (!layer || !url) return [];
    return [{
      id: firstString(layer, ["layer_id", "id", "name"]) || `layer-${index + 1}`,
      url,
      x: asNumber(layer.x, 0),
      y: asNumber(layer.y, 0),
      scale: Math.max(0.05, asNumber(layer.scale, 1)),
      opacity: Math.max(0, Math.min(1, asNumber(layer.opacity, 1))),
      parallax: asNumber(layer.parallax, 0),
    }];
  });
}

function normalizePanel(value: unknown, fallbackId: string): ExperiencePanel | null {
  const panel = asRecord(value);
  if (!panel) return null;
  return {
    id: firstString(panel, ["panel_id", "id"]) || fallbackId,
    baseUrl: resolveAsset(panel),
    durationMs: Math.max(250, asNumber(panel.duration_ms, 4000)),
    layers: normalizeLayers(panel),
    focusPoints: normalizeFocusPoints(panel),
    cameraSequence: normalizeCamera(panel),
    dialogue: normalizeDialogue(panel),
    hotspots: normalizeHotspots(panel),
  };
}

function normalizeChoice(scene: UnknownRecord): { prompt: string | null; options: ExperienceChoice[] } {
  if (!Array.isArray(scene.choices) || !scene.choices.length) return { prompt: null, options: [] };
  const choice = asRecord(scene.choices[0]);
  if (!choice) return { prompt: null, options: [] };

  const options = Array.isArray(choice.options)
    ? choice.options.flatMap((value, index) => {
        const option = asRecord(value);
        if (!option) return [];
        return [{
          label: firstString(option, ["label", "title", "text"]) || `Choice ${index + 1}`,
          targetSceneId: firstString(option, ["next_scene_id", "scene_id", "target_scene_id"]),
        }];
      })
    : [];

  return {
    prompt: firstString(choice, ["prompt", "title", "text"]),
    options,
  };
}

function normalizeExperienceScenes(source: UnknownRecord): ExperienceScene[] {
  if (!Array.isArray(source.scenes)) return [];

  return source.scenes.flatMap((value, index) => {
    const scene = asRecord(value);
    if (!scene) return [];
    const id = firstString(scene, ["scene_id", "id"]) || `scene-${index + 1}`;
    const firstPanel = Array.isArray(scene.panels) && scene.panels.length ? scene.panels[0] : null;
    const choice = normalizeChoice(scene);
    const ending = asRecord(scene.ending);

    return [{
      id,
      type: (firstString(scene, ["type"]) || "CINEMATIC").toUpperCase(),
      title: firstString(scene, ["title", "name"]),
      panel: normalizePanel(firstPanel, `${id}-panel`),
      choicePrompt: choice.prompt,
      choices: choice.options,
      nextSceneId: firstString(scene, ["next_scene_id"]),
      endingLabel: ending ? firstString(ending, ["label", "title", "text"]) : null,
    }];
  });
}

function eased(value: number, easing: string): number {
  const clamped = Math.max(0, Math.min(1, value));
  switch (easing.toLowerCase()) {
    case "ease_in": return clamped * clamped;
    case "ease_out": {
      const inverse = 1 - clamped;
      return 1 - inverse * inverse;
    }
    case "snap": return clamped < 0.5 ? 0 : 1;
    case "cinematic": return clamped * clamped * (3 - 2 * clamped);
    default: return clamped;
  }
}

function focusCamera(focus: ExperienceFocus | null): CameraState {
  if (!focus) return { x: 0, y: 0, zoom: 1, label: null };
  return {
    x: (0.5 - focus.x) * 100,
    y: (0.5 - focus.y) * 100,
    zoom: focus.zoom,
    label: focus.label,
  };
}

function cameraAt(panel: ExperiencePanel, elapsedMs: number, manualFocusId: string | null): CameraState {
  const byId = new Map(panel.focusPoints.map((focus) => [focus.id, focus]));
  if (manualFocusId) return focusCamera(byId.get(manualFocusId) || null);
  if (!panel.cameraSequence.length) return { x: 0, y: 0, zoom: 1, label: null };

  let cursor = 0;
  let previous: CameraState = { x: 0, y: 0, zoom: 1, label: null };

  for (const step of panel.cameraSequence) {
    const target = focusCamera(byId.get(step.targetFocusId) || null);
    const end = cursor + step.durationMs;
    if (elapsedMs >= end) {
      previous = target;
      cursor = end;
      continue;
    }

    if (elapsedMs < cursor) return previous;
    const fraction = eased((elapsedMs - cursor) / step.durationMs, step.easing);
    return {
      x: previous.x + (target.x - previous.x) * fraction,
      y: previous.y + (target.y - previous.y) * fraction,
      zoom: previous.zoom + (target.zoom - previous.zoom) * fraction,
      label: target.label || previous.label,
    };
  }

  return previous;
}

function safeLegacyUrl(item: MasterStreamingItem): string | null {
  if (!item.deepLink) return null;
  if (/^https?:\/\//i.test(item.deepLink)) return item.deepLink;
  if (item.deepLink.startsWith("/tv/")) return `https://pscomixx.online${item.deepLink}`;
  return item.deepLink;
}

function RuntimeFallback({ item, mode, error }: { item: MasterStreamingItem; mode: "read" | "experience"; error: string | null }) {
  const Icon = mode === "read" ? BookOpen : Gamepad2;
  const legacyUrl = safeLegacyUrl(item);
  return (
    <div className="flex min-h-[440px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black px-6 text-center">
      <Icon className="h-12 w-12 text-zinc-700" />
      <div className="mt-4 text-xs font-black tracking-[0.16em] text-zinc-500">{mode === "read" ? "READ" : "EXPERIENCE"} RUNTIME UNAVAILABLE</div>
      {error && <p className="mt-2 max-w-xl text-xs leading-5 text-zinc-700">{error}</p>}
      {legacyUrl && (
        <a href={legacyUrl} className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-xs font-bold text-zinc-300 transition hover:border-[#f0ae2e]/45 hover:text-white">
          Open verified fallback <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

function ReadRuntime({ item, source }: { item: MasterStreamingItem; source: UnknownRecord }) {
  const pages = useMemo(() => normalizeReadPages(source), [source]);
  const storageKey = `ps-streaming-read:${firstString(source, ["content_id"]) || item.sourceId}`;
  const [pageIndex, setPageIndex] = useState(() => {
    try {
      const saved = Number(window.localStorage.getItem(storageKey));
      return Number.isInteger(saved) && saved >= 0 ? saved : 0;
    } catch {
      return 0;
    }
  });
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [zoom, setZoom] = useState(1);

  const safeIndex = pages.length ? Math.min(pageIndex, pages.length - 1) : 0;
  const page = pages[safeIndex];

  useEffect(() => {
    if (!pages.length) return;
    try {
      window.localStorage.setItem(storageKey, String(safeIndex));
    } catch {
      // Device-local progress is best effort.
    }
  }, [safeIndex, storageKey, pages.length]);

  useEffect(() => {
    if (!autoAdvance || !page || pages.length < 2) return;
    const timer = window.setTimeout(() => {
      setPageIndex((current) => (Math.min(current, pages.length - 1) + 1) % pages.length);
      setZoom(1);
    }, page.holdMs);
    return () => window.clearTimeout(timer);
  }, [autoAdvance, page?.id, page?.holdMs, pages.length]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        setPageIndex((current) => Math.max(0, current - 1));
        setZoom(1);
      } else if (event.key === "ArrowRight") {
        setPageIndex((current) => Math.min(pages.length - 1, current + 1));
        setZoom(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pages.length]);

  if (!page) return <RuntimeFallback item={item} mode="read" error="The READ manifest returned no pages." />;

  const title = firstString(source, ["title"]) || item.title;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#080808]">
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="text-[9px] font-black tracking-[0.18em] text-[#f0ae2e]">PRESS START READER</div>
          <h3 className="truncate text-sm font-bold text-white">{title}</h3>
        </div>
        <div className="shrink-0 text-[10px] font-black tracking-[0.14em] text-zinc-600">{safeIndex + 1} / {pages.length}</div>
      </div>

      <div className="relative flex min-h-[520px] items-center justify-center overflow-auto bg-black p-4 sm:p-8">
        <img
          src={page.imageUrl}
          alt={`${title} page ${safeIndex + 1}`}
          className="max-h-[74vh] max-w-full origin-center object-contain transition-transform duration-200"
          style={{ transform: `scale(${zoom})` }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] px-4 py-4 sm:px-5">
        <button
          type="button"
          onClick={() => { setPageIndex((current) => Math.max(0, current - 1)); setZoom(1); }}
          disabled={safeIndex === 0}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-xs font-bold text-zinc-400 transition hover:border-[#f0ae2e]/45 hover:text-white disabled:opacity-25"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoAdvance((value) => !value)}
            className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[10px] font-black tracking-[0.12em] transition ${autoAdvance ? "border-[#f0ae2e]/60 bg-[#f0ae2e]/10 text-[#f0ae2e]" : "border-white/10 text-zinc-500 hover:text-white"}`}
          >
            {autoAdvance ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            AUTO {autoAdvance ? "ON" : "OFF"}
          </button>
          <button type="button" onClick={() => setZoom((value) => Math.max(0.7, value - 0.15))} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-sm font-black text-zinc-400 hover:text-white" aria-label="Zoom out">−</button>
          <button type="button" onClick={() => setZoom(1)} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-zinc-400 hover:text-white" aria-label="Reset zoom"><RotateCcw className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={() => setZoom((value) => Math.min(2.25, value + 0.15))} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-sm font-black text-zinc-400 hover:text-white" aria-label="Zoom in">+</button>
        </div>

        <button
          type="button"
          onClick={() => { setPageIndex((current) => Math.min(pages.length - 1, current + 1)); setZoom(1); }}
          disabled={safeIndex >= pages.length - 1}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-xs font-bold text-zinc-400 transition hover:border-[#f0ae2e]/45 hover:text-white disabled:opacity-25"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ExperienceRuntime({ item, source }: { item: MasterStreamingItem; source: UnknownRecord }) {
  const scenes = useMemo(() => normalizeExperienceScenes(source), [source]);
  const sceneMap = useMemo(() => new Map(scenes.map((scene) => [scene.id, scene])), [scenes]);
  const startSceneId = firstString(source, ["start_scene_id"]) || scenes[0]?.id || null;
  const interactionType = (firstString(source, ["interaction_type"]) || "").toUpperCase();
  const passiveStream = firstString(source, ["stream_url"]);
  const passivePoster = firstString(source, ["poster_url", "backdrop_url"]) || item.image || undefined;
  const isPassive = interactionType === "PASSIVE" && !!passiveStream;

  const [sceneId, setSceneId] = useState<string | null>(startSceneId);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [waitingForInteraction, setWaitingForInteraction] = useState(false);
  const [endedLabel, setEndedLabel] = useState<string | null>(null);
  const [manualFocusId, setManualFocusId] = useState<string | null>(null);

  const scene = sceneId ? sceneMap.get(sceneId) || null : null;
  const panel = scene?.panel || null;

  useEffect(() => {
    setSceneId(startSceneId);
    setElapsedMs(0);
    setWaitingForInteraction(false);
    setEndedLabel(null);
    setManualFocusId(null);
  }, [startSceneId, item.sourceId]);

  const enterScene = (nextId: string | null) => {
    if (!nextId || !sceneMap.has(nextId)) {
      setEndedLabel("EXPERIENCE COMPLETE");
      setWaitingForInteraction(true);
      return;
    }
    setSceneId(nextId);
    setElapsedMs(0);
    setWaitingForInteraction(false);
    setEndedLabel(null);
    setManualFocusId(null);
  };

  const completeScene = (current: ExperienceScene) => {
    if (current.type === "CHOICE" && current.choices.length) {
      setWaitingForInteraction(true);
      return;
    }
    if (current.type === "EXPLORATION" && current.panel?.hotspots.length) {
      setWaitingForInteraction(true);
      return;
    }
    if (current.type === "END") {
      setEndedLabel(current.endingLabel || current.title || "EXPERIENCE COMPLETE");
      setWaitingForInteraction(true);
      return;
    }
    if (current.nextSceneId) {
      enterScene(current.nextSceneId);
      return;
    }
    setEndedLabel("EXPERIENCE COMPLETE");
    setWaitingForInteraction(true);
  };

  useEffect(() => {
    if (isPassive || !scene || !panel || waitingForInteraction || endedLabel) return;
    const tick = window.setInterval(() => {
      setElapsedMs((value) => Math.min(panel.durationMs, value + 100));
    }, 100);
    const done = window.setTimeout(() => completeScene(scene), panel.durationMs);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(done);
    };
  }, [isPassive, scene?.id, panel?.id, panel?.durationMs, waitingForInteraction, endedLabel]);

  if (isPassive && passiveStream) {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
        <div className="border-b border-white/[0.07] px-4 py-3 sm:px-5">
          <div className="text-[9px] font-black tracking-[0.18em] text-[#f0ae2e]">PASSIVE HOP · NO INPUT REQUIRED</div>
          <h3 className="mt-1 text-sm font-bold text-white">{firstString(source, ["title"]) || item.title}</h3>
        </div>
        <video
          src={passiveStream}
          poster={passivePoster}
          autoPlay
          controls
          playsInline
          className="aspect-video w-full bg-black object-contain"
        />
        {firstString(source, ["synopsis"]) && (
          <p className="border-t border-white/[0.07] px-5 py-4 text-sm leading-6 text-zinc-400">{firstString(source, ["synopsis"])}</p>
        )}
      </div>
    );
  }

  if (!scene || !panel) return <RuntimeFallback item={item} mode="experience" error="The EXPERIENCE manifest returned no playable scene panels." />;

  const activeDialogue = panel.dialogue.find((line) => elapsedMs >= line.startMs && elapsedMs < line.startMs + line.durationMs) || null;
  const camera = cameraAt(panel, elapsedMs, manualFocusId);
  const title = firstString(source, ["title"]) || item.title;
  const progress = panel.durationMs > 0 ? Math.max(0, Math.min(1, elapsedMs / panel.durationMs)) : 0;
  const showChoices = waitingForInteraction && scene.type === "CHOICE" && scene.choices.length > 0 && !endedLabel;
  const showHotspots = waitingForInteraction && scene.type === "EXPLORATION" && panel.hotspots.length > 0 && !endedLabel;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#080808]">
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="text-[9px] font-black tracking-[0.18em] text-[#f0ae2e]">PRESS START EXPERIENCE · {scene.type}</div>
          <h3 className="truncate text-sm font-bold text-white">{title}</h3>
        </div>
        <div className="shrink-0 text-[10px] font-black tracking-[0.14em] text-zinc-600">{scenes.findIndex((candidate) => candidate.id === scene.id) + 1} / {scenes.length}</div>
      </div>

      <div className="relative aspect-video min-h-[460px] overflow-hidden bg-black">
        <div
          className="absolute inset-0 transition-transform duration-75 ease-linear"
          style={{ transform: `translate(${camera.x}%, ${camera.y}%) scale(${camera.zoom})`, transformOrigin: "center center" }}
        >
          {panel.baseUrl ? (
            <img src={panel.baseUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-[#111]" />
          )}

          {panel.layers.map((layer) => (
            <img
              key={layer.id}
              src={layer.url}
              alt=""
              className="absolute h-full w-full object-contain"
              style={{
                left: `${layer.x * 100}%`,
                top: `${layer.y * 100}%`,
                opacity: layer.opacity,
                transformOrigin: "center center",
                transform: `translate(${(-camera.x * layer.parallax) / Math.max(camera.zoom, 0.25)}%, ${(-camera.y * layer.parallax) / Math.max(camera.zoom, 0.25)}%) scale(${layer.scale})`,
              }}
            />
          ))}
        </div>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />

        <div className="absolute left-5 top-5 max-w-xl sm:left-7 sm:top-7">
          {scene.title && <h4 className="text-xl font-black tracking-tight text-white drop-shadow-lg sm:text-3xl">{scene.title}</h4>}
          {camera.label && <div className="mt-2 inline-flex rounded-full border border-[#f0ae2e]/35 bg-black/60 px-3 py-1.5 text-[10px] font-black tracking-[0.12em] text-[#f0ae2e] backdrop-blur">{camera.label}</div>}
        </div>

        {activeDialogue && (
          <div className="absolute bottom-8 left-5 right-5 rounded-2xl border border-white/10 bg-black/80 p-4 backdrop-blur sm:bottom-10 sm:left-8 sm:right-auto sm:max-w-2xl sm:p-5">
            {activeDialogue.speaker && <div className="mb-1 text-[10px] font-black tracking-[0.15em] text-[#f0ae2e]">{activeDialogue.speaker}</div>}
            <p className="text-sm leading-6 text-white sm:text-base">{activeDialogue.text}</p>
          </div>
        )}

        {endedLabel && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/78 p-6 text-center backdrop-blur-sm">
            <div>
              <div className="text-[10px] font-black tracking-[0.18em] text-[#f0ae2e]">PRESS START EXPERIENCE</div>
              <h4 className="mt-3 text-3xl font-black text-white sm:text-5xl">{endedLabel}</h4>
              <button
                type="button"
                onClick={() => enterScene(startSceneId)}
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-black transition hover:bg-[#f0ae2e]"
              >
                <RotateCcw className="h-4 w-4" /> RESTART
              </button>
            </div>
          </div>
        )}
      </div>

      {showChoices && (
        <div className="border-t border-white/[0.07] p-4 sm:p-5">
          <div className="mb-3 text-[10px] font-black tracking-[0.16em] text-zinc-500">{scene.choicePrompt || "CHOOSE"}</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {scene.choices.map((choice, index) => (
              <button
                key={`${choice.label}-${index}`}
                type="button"
                onClick={() => enterScene(choice.targetSceneId)}
                className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-left text-sm font-bold text-zinc-200 transition hover:border-[#f0ae2e]/50 hover:bg-[#f0ae2e]/10"
              >
                {choice.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {showHotspots && (
        <div className="border-t border-white/[0.07] p-4 sm:p-5">
          <div className="mb-3 text-[10px] font-black tracking-[0.16em] text-zinc-500">EXPLORE</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {panel.hotspots.map((hotspot, index) => (
              <button
                key={`${hotspot.label}-${index}`}
                type="button"
                onClick={() => {
                  if (hotspot.actionType === "GOTO_SCENE") enterScene(hotspot.targetSceneId);
                  else if (hotspot.actionType === "FOCUS" && hotspot.focusId) setManualFocusId(hotspot.focusId);
                }}
                className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-left text-sm font-bold text-zinc-200 transition hover:border-[#f0ae2e]/50 hover:bg-[#f0ae2e]/10"
              >
                {hotspot.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-white/[0.07] px-4 py-4 sm:px-5">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full bg-[#f0ae2e] transition-[width] duration-100" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

export default function StreamingManifestRuntime({ item }: { item: MasterStreamingItem }) {
  const mode: "read" | "experience" = item.group === "read" ? "read" : "experience";
  const [manifest, setManifest] = useState<UnknownRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = new URL(CATALOG_FEED_URL);
        url.searchParams.set("format", mode === "read" ? "read-manifest" : "experience-manifest");
        url.searchParams.set("content_id", item.sourceId);
        const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`${mode === "read" ? "READ" : "EXPERIENCE"} manifest returned ${res.status}`);
        const payload = asRecord(await res.json());
        if (!payload) throw new Error("Manifest payload was not an object");
        const source = unwrapManifest(payload, mode);
        const state = (firstString(source, ["state"]) || "").toUpperCase();
        if (state === "ERROR" || state === "UNAVAILABLE") throw new Error(`${mode.toUpperCase()} ${state}`);
        if (!cancelled) setManifest(source);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load manifest");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [item.sourceId, mode]);

  if (loading) {
    return (
      <div className="flex min-h-[440px] items-center justify-center rounded-2xl border border-white/10 bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-[#f0ae2e]" />
      </div>
    );
  }

  if (error || !manifest) return <RuntimeFallback item={item} mode={mode} error={error} />;
  return mode === "read"
    ? <ReadRuntime item={item} source={manifest} />
    : <ExperienceRuntime item={item} source={manifest} />;
}
