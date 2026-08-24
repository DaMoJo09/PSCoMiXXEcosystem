import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, ExternalLink, Gamepad2, Loader2, RotateCcw } from "lucide-react";
import type { MasterStreamingItem } from "@/lib/streamingMasterCatalog";

type UnknownRecord = Record<string, unknown>;

type RuntimeChoice = {
  label: string;
  targetId: string | null;
  url: string | null;
};

type RuntimeEntry = {
  id: string;
  title: string | null;
  text: string | null;
  image: string | null;
  video: string | null;
  audio: string | null;
  durationMs: number | null;
  choices: RuntimeChoice[];
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

function asNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function firstString(record: UnknownRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = asString(record[key]);
    if (value) return value;
  }
  return null;
}

function nestedRecords(root: UnknownRecord): UnknownRecord[] {
  const records: UnknownRecord[] = [root];
  for (const key of ["manifest", "data", "content", "reader", "experience", "runtime", "payload", "story"]) {
    const child = asRecord(root[key]);
    if (child) records.push(child);
  }
  return records;
}

function findArray(root: UnknownRecord, keys: string[]): unknown[] {
  for (const record of nestedRecords(root)) {
    for (const key of keys) {
      const value = record[key];
      if (Array.isArray(value)) return value;
    }
  }
  return [];
}

function looksLikeVideo(url: string | null): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov|m3u8)(?:$|\?)/i.test(url) || /videodelivery\.net|cloudflarestream\.com|stream\.mux\.com/i.test(url);
}

function normalizeChoices(raw: UnknownRecord): RuntimeChoice[] {
  const choices = ["choices", "actions", "options", "hotspots", "branches"]
    .map((key) => raw[key])
    .find(Array.isArray) as unknown[] | undefined;

  if (!choices) return [];

  return choices.flatMap((choice, index) => {
    if (typeof choice === "string") {
      return [{ label: choice, targetId: null, url: null }];
    }
    const record = asRecord(choice);
    if (!record) return [];
    const label = firstString(record, ["label", "title", "text", "name", "copy"]) || `Choice ${index + 1}`;
    const targetId = firstString(record, ["target_scene_id", "target_id", "next_scene_id", "to", "scene_id", "node_id", "target"]);
    const url = firstString(record, ["url", "href", "deep_link", "play_deep_link"]);
    return [{ label, targetId, url }];
  });
}

function normalizeEntry(value: unknown, index: number): RuntimeEntry | null {
  if (typeof value === "string") {
    const url = value.trim();
    if (!url) return null;
    return {
      id: `entry-${index}`,
      title: null,
      text: null,
      image: looksLikeVideo(url) ? null : url,
      video: looksLikeVideo(url) ? url : null,
      audio: null,
      durationMs: null,
      choices: [],
    };
  }

  const raw = asRecord(value);
  if (!raw) return null;

  const id = firstString(raw, ["id", "scene_id", "page_id", "slide_id", "frame_id", "node_id"]) || `entry-${index}`;
  const title = firstString(raw, ["title", "name", "speaker", "label"]);
  const text = firstString(raw, ["text", "caption", "body", "dialogue", "description", "narration", "copy"]);
  const explicitVideo = firstString(raw, ["video_url", "stream_url", "video", "movie_url"]);
  const media = firstString(raw, ["media_url", "asset_url", "src", "url"]);
  const explicitImage = firstString(raw, ["image_url", "image", "background_url", "backdrop_url", "artwork_url", "thumbnail_url", "poster_url"]);
  const video = explicitVideo || (looksLikeVideo(media) ? media : null);
  const image = explicitImage || (!looksLikeVideo(media) ? media : null);
  const audio = firstString(raw, ["audio_url", "music_url", "sound_url", "audio"]);

  const durationMsDirect = asNumber(raw.duration_ms) ?? asNumber(raw.durationMs);
  const durationSeconds = asNumber(raw.duration_seconds) ?? asNumber(raw.durationSeconds);
  const durationMs = durationMsDirect ?? (durationSeconds !== null ? durationSeconds * 1000 : null);

  return {
    id,
    title,
    text,
    image,
    video,
    audio,
    durationMs,
    choices: normalizeChoices(raw),
  };
}

function extractEntries(root: UnknownRecord, mode: "read" | "experience"): RuntimeEntry[] {
  const keys = mode === "read"
    ? ["pages", "page_images", "reader_pages", "spreads", "items", "frames"]
    : ["scenes", "slides", "panels", "frames", "steps", "items", "nodes"];

  const rawEntries = findArray(root, keys);
  const normalized = rawEntries
    .map((entry, index) => normalizeEntry(entry, index))
    .filter((entry): entry is RuntimeEntry => !!entry);

  if (normalized.length) return normalized;

  const direct = normalizeEntry(root, 0);
  if (direct && (direct.image || direct.video || direct.text)) return [direct];
  return [];
}

function manifestTitle(root: UnknownRecord, fallback: string): string {
  for (const record of nestedRecords(root)) {
    const value = firstString(record, ["title", "name", "content_title"]);
    if (value) return value;
  }
  return fallback;
}

function safeLegacyUrl(item: MasterStreamingItem): string | null {
  if (!item.deepLink) return null;
  if (/^https?:\/\//i.test(item.deepLink)) return item.deepLink;
  if (item.deepLink.startsWith("/tv/")) return `https://pscomixx.online${item.deepLink}`;
  return item.deepLink;
}

export default function StreamingManifestRuntime({ item }: { item: MasterStreamingItem }) {
  const mode: "read" | "experience" = item.group === "read" ? "read" : "experience";
  const [manifest, setManifest] = useState<UnknownRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      setIndex(0);
      setZoom(1);
      try {
        const url = new URL(CATALOG_FEED_URL);
        url.searchParams.set("format", mode === "read" ? "read-manifest" : "experience-manifest");
        url.searchParams.set("content_id", item.sourceId);
        const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`${mode === "read" ? "READ" : "EXPERIENCE"} manifest returned ${res.status}`);
        const data = await res.json();
        const record = asRecord(data);
        if (!record) throw new Error("Manifest payload was not an object");
        if (!cancelled) setManifest(record);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load manifest");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [item.sourceId, mode]);

  const entries = useMemo(() => manifest ? extractEntries(manifest, mode) : [], [manifest, mode]);
  const safeIndex = entries.length ? Math.min(index, entries.length - 1) : 0;
  const current = entries[safeIndex];
  const title = manifest ? manifestTitle(manifest, item.title) : item.title;
  const legacyUrl = safeLegacyUrl(item);

  const idIndex = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach((entry, entryIndex) => map.set(entry.id, entryIndex));
    return map;
  }, [entries]);

  const go = (next: number) => {
    if (!entries.length) return;
    setIndex(Math.max(0, Math.min(next, entries.length - 1)));
    setZoom(1);
  };

  useEffect(() => {
    if (mode !== "experience" || !current?.durationMs || current.choices.length) return;
    if (safeIndex >= entries.length - 1) return;
    const timeout = window.setTimeout(() => go(safeIndex + 1), Math.max(500, current.durationMs));
    return () => window.clearTimeout(timeout);
  }, [mode, current?.id, current?.durationMs, current?.choices.length, safeIndex, entries.length]);

  const choose = (choice: RuntimeChoice) => {
    if (choice.targetId && idIndex.has(choice.targetId)) {
      go(idIndex.get(choice.targetId)!);
      return;
    }
    if (choice.url) {
      if (/^https?:\/\//i.test(choice.url)) window.location.assign(choice.url);
      else window.location.assign(choice.url);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[440px] items-center justify-center rounded-2xl border border-white/10 bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-[#f0ae2e]" />
      </div>
    );
  }

  if (error || !current) {
    const Icon = mode === "read" ? BookOpen : Gamepad2;
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

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#080808]">
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="text-[9px] font-black tracking-[0.18em] text-[#f0ae2e]">{mode === "read" ? "PRESS START READER" : "PRESS START EXPERIENCE"}</div>
          <h3 className="truncate text-sm font-bold text-white">{title}</h3>
        </div>
        <div className="shrink-0 text-[10px] font-black tracking-[0.14em] text-zinc-600">{safeIndex + 1} / {entries.length}</div>
      </div>

      <div className={`relative flex min-h-[500px] items-center justify-center overflow-hidden bg-black ${mode === "read" ? "p-4 sm:p-8" : ""}`}>
        {current.video ? (
          <video
            key={current.video}
            src={current.video}
            poster={current.image || item.image || undefined}
            autoPlay={mode === "experience"}
            controls
            playsInline
            className="max-h-[72vh] w-full object-contain"
          />
        ) : current.image ? (
          <img
            src={current.image}
            alt={current.title || `${title} ${safeIndex + 1}`}
            className={`max-h-[72vh] max-w-full object-contain transition-transform duration-200 ${mode === "experience" ? "h-full w-full max-h-none object-cover" : ""}`}
            style={mode === "read" ? { transform: `scale(${zoom})` } : undefined}
          />
        ) : (
          <div className="flex min-h-[420px] w-full items-center justify-center px-8 text-center">
            <p className="max-w-3xl text-xl font-semibold leading-9 text-zinc-200 sm:text-3xl">{current.text || current.title || "Interactive scene"}</p>
          </div>
        )}

        {mode === "experience" && (current.title || current.text) && (current.image || current.video) && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent px-5 pb-8 pt-24 sm:px-8">
            {current.title && <div className="text-lg font-black text-white sm:text-2xl">{current.title}</div>}
            {current.text && <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-300 sm:text-base">{current.text}</p>}
          </div>
        )}

        {current.audio && <audio key={current.audio} src={current.audio} autoPlay={mode === "experience"} controls className="absolute bottom-4 right-4 z-20 max-w-[280px]" />}
      </div>

      {current.choices.length > 0 && (
        <div className="border-t border-white/[0.07] p-4 sm:p-5">
          <div className="mb-3 text-[9px] font-black tracking-[0.18em] text-zinc-600">CHOOSE</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {current.choices.map((choice, choiceIndex) => (
              <button
                key={`${choice.label}-${choiceIndex}`}
                type="button"
                onClick={() => choose(choice)}
                className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-left text-sm font-bold text-zinc-200 transition hover:border-[#f0ae2e]/50 hover:bg-[#f0ae2e]/10"
              >
                {choice.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] px-4 py-4 sm:px-5">
        <button
          type="button"
          onClick={() => go(safeIndex - 1)}
          disabled={safeIndex === 0}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-xs font-bold text-zinc-400 transition hover:border-[#f0ae2e]/45 hover:text-white disabled:opacity-25"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </button>

        {mode === "read" ? (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setZoom((value) => Math.max(0.7, value - 0.15))} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-sm font-black text-zinc-400 hover:text-white" aria-label="Zoom out">−</button>
            <button type="button" onClick={() => setZoom(1)} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-zinc-400 hover:text-white" aria-label="Reset zoom"><RotateCcw className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => setZoom((value) => Math.min(2.25, value + 0.15))} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-sm font-black text-zinc-400 hover:text-white" aria-label="Zoom in">+</button>
          </div>
        ) : (
          <div className="h-1.5 min-w-[120px] flex-1 overflow-hidden rounded-full bg-white/[0.06] sm:max-w-sm">
            <div className="h-full bg-[#f0ae2e] transition-all" style={{ width: `${((safeIndex + 1) / entries.length) * 100}%` }} />
          </div>
        )}

        <button
          type="button"
          onClick={() => go(safeIndex + 1)}
          disabled={safeIndex >= entries.length - 1}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-xs font-bold text-zinc-400 transition hover:border-[#f0ae2e]/45 hover:text-white disabled:opacity-25"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
