import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Film, Headphones, Loader2, Music2, RotateCcw, X } from "lucide-react";
import type { MasterStreamingItem } from "@/lib/streamingMasterCatalog";
import StreamingGameRuntime from "@/components/streaming/StreamingGameRuntime";
import StreamingManifestRuntime from "@/components/streaming/StreamingManifestRuntime";

interface AudioQueueItem {
  index?: number;
  content_id: string;
  audio_id?: string;
  title: string;
  artist_name?: string;
  artwork_url?: string;
  audio_url: string;
  stream_type?: string;
  mime_type?: string;
  duration_seconds?: number;
  track_number?: number;
  is_loop?: boolean;
  loop_start_ms?: number;
  loop_end_ms?: number;
  loop_master_url?: string;
  loop_master_mime?: string;
  bpm?: number;
  bars?: number;
  playback_mode?: string;
  seamless?: boolean;
  has_visual?: boolean;
  primary_visual_type?: string;
}

interface AudioManifest {
  status?: string;
  content_id?: string;
  audio_id?: string;
  title?: string;
  artist_name?: string;
  artwork_url?: string;
  audio_url?: string;
  stream_type?: string;
  mime_type?: string;
  duration_seconds?: number;
  queue?: AudioQueueItem[];
  queue_index?: number;
}

const CATALOG_FEED_URL =
  import.meta.env.VITE_PS_CATALOG_FEED_URL ||
  "https://upivslgwjtvqymonliib.supabase.co/functions/v1/catalog-feed";
const REQUEST_TIMEOUT_MS = 8_000;

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

function cloudflareEmbedUrl(streamUrl: string): string | null {
  try {
    const url = new URL(streamUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    const uid = parts[0];
    if (!uid) return null;

    if (url.hostname === "videodelivery.net" || url.hostname.endsWith(".videodelivery.net")) {
      return `https://iframe.videodelivery.net/${encodeURIComponent(uid)}`;
    }

    if (url.hostname.endsWith(".cloudflarestream.com")) {
      return `${url.origin}/${encodeURIComponent(uid)}/iframe`;
    }
  } catch {
    return null;
  }
  return null;
}

function muxEmbedUrl(streamUrl: string): string | null {
  try {
    const url = new URL(streamUrl);
    if (url.hostname !== "stream.mux.com") return null;
    const filename = url.pathname.split("/").filter(Boolean).pop() || "";
    const playbackId = filename.replace(/\.m3u8$/i, "");
    return playbackId ? `https://player.mux.com/${encodeURIComponent(playbackId)}` : null;
  } catch {
    return null;
  }
}

export function videoEmbedUrl(streamUrl: string | null): string | null {
  if (!streamUrl) return null;
  return cloudflareEmbedUrl(streamUrl) || muxEmbedUrl(streamUrl);
}

function VideoPlayer({ item }: { item: MasterStreamingItem }) {
  const embedUrl = videoEmbedUrl(item.streamUrl);

  if (embedUrl) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
        <iframe
          src={embedUrl}
          title={item.title}
          className="h-full w-full border-0"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }

  if (item.streamUrl) {
    return (
      <video
        src={item.streamUrl}
        poster={item.image || undefined}
        controls
        playsInline
        className="aspect-video w-full rounded-2xl bg-black object-contain"
      />
    );
  }

  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black px-6 text-center text-zinc-600">
      <Film className="mb-3 h-10 w-10" />
      <span className="text-xs font-bold tracking-[0.15em]">PLAYBACK SOURCE UNAVAILABLE</span>
      <span className="mt-2 max-w-lg text-[11px] leading-5 text-zinc-700">This title stays inside the Press Start master player while its stream source is unavailable.</span>
    </div>
  );
}

function AudioPlayer({ item }: { item: MasterStreamingItem }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [manifest, setManifest] = useState<AudioManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queueIndex, setQueueIndex] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = new URL(CATALOG_FEED_URL);
        url.searchParams.set("format", "audio-manifest");
        url.searchParams.set("content_id", item.sourceId);
        const res = await fetchWithTimeout(url, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`Audio manifest returned ${res.status}`);
        const data = (await res.json()) as AudioManifest;
        if (cancelled) return;
        setManifest(data);
        setQueueIndex(typeof data.queue_index === "number" ? Math.max(0, data.queue_index) : 0);
      } catch (err) {
        if (!cancelled) {
          const timedOut = err instanceof DOMException && err.name === "AbortError";
          setError(timedOut ? "Audio request timed out." : err instanceof Error ? err.message : "Unable to load audio");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
      audioRef.current?.pause();
    };
  }, [item.sourceId, reloadToken]);

  const queue = useMemo<AudioQueueItem[]>(() => {
    if (manifest?.queue?.length) return manifest.queue;
    if (manifest?.audio_url) {
      return [{
        content_id: manifest.content_id || item.sourceId,
        audio_id: manifest.audio_id,
        title: manifest.title || item.title,
        artist_name: manifest.artist_name || item.creator,
        artwork_url: manifest.artwork_url || item.image || undefined,
        audio_url: manifest.audio_url,
        stream_type: manifest.stream_type,
        mime_type: manifest.mime_type,
        duration_seconds: manifest.duration_seconds,
      }];
    }
    return [];
  }, [manifest, item.sourceId, item.title, item.creator, item.image]);

  const safeIndex = queue.length ? Math.min(queueIndex, queue.length - 1) : 0;
  const current = queue[safeIndex];

  const playAt = (nextIndex: number) => {
    if (!queue.length) return;
    const normalized = (nextIndex + queue.length) % queue.length;
    setQueueIndex(normalized);
    const track = queue[normalized];
    const audio = audioRef.current;
    if (audio && track?.audio_url) {
      audio.src = track.audio_url;
      audio.load();
      audio.play().catch(() => {});
    }
  };

  if (loading) {
    return <div className="flex min-h-[320px] items-center justify-center rounded-2xl bg-black"><Loader2 className="h-7 w-7 animate-spin text-[#f0ae2e]" /></div>;
  }

  if (error || !current) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black px-6 text-center text-zinc-600">
        <Headphones className="mb-3 h-10 w-10" />
        <span className="text-xs font-bold tracking-[0.15em]">AUDIO UNAVAILABLE</span>
        {error && <span className="mt-2 text-[11px] text-zinc-700">{error}</span>}
        <button
          type="button"
          onClick={() => setReloadToken((value) => value + 1)}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-black text-black transition hover:bg-[#f0ae2e]"
        >
          <RotateCcw className="h-3.5 w-3.5" /> RETRY AUDIO
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0b]">
      <div className="grid gap-0 md:grid-cols-[minmax(260px,420px)_1fr]">
        <div className="relative aspect-square bg-[#111] md:aspect-auto">
          {(current.artwork_url || item.image) ? (
            <img src={current.artwork_url || item.image || ""} alt={current.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full min-h-[320px] items-center justify-center"><Music2 className="h-16 w-16 text-zinc-800" /></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-5 left-5 right-5">
            <div className="text-[10px] font-black tracking-[0.18em] text-[#f0ae2e]">NOW PLAYING</div>
            <h3 className="mt-1 text-2xl font-black text-white">{current.title}</h3>
            <p className="mt-1 text-sm text-zinc-400">{current.artist_name || item.creator}</p>
          </div>
        </div>

        <div className="flex min-h-[320px] flex-col p-5 sm:p-7">
          <audio
            ref={audioRef}
            src={current.audio_url}
            controls
            preload="metadata"
            className="w-full"
            onEnded={() => {
              if (queue.length > 1) playAt(safeIndex + 1);
            }}
          />

          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => playAt(safeIndex - 1)}
              disabled={queue.length < 2}
              className="grid h-11 w-11 place-items-center rounded-full border border-white/10 text-zinc-400 transition hover:border-[#f0ae2e]/45 hover:text-white disabled:opacity-30"
              aria-label="Previous track"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-center text-[10px] font-black tracking-[0.16em] text-zinc-600">{safeIndex + 1} / {queue.length}</div>
            <button
              type="button"
              onClick={() => playAt(safeIndex + 1)}
              disabled={queue.length < 2}
              className="grid h-11 w-11 place-items-center rounded-full border border-white/10 text-zinc-400 transition hover:border-[#f0ae2e]/45 hover:text-white disabled:opacity-30"
              aria-label="Next track"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {queue.length > 1 && (
            <div className="mt-6 flex-1 overflow-y-auto border-t border-white/[0.07] pt-4">
              <div className="mb-3 text-[10px] font-black tracking-[0.17em] text-zinc-600">QUEUE</div>
              <div className="space-y-1">
                {queue.map((track, index) => (
                  <button
                    key={`${track.content_id}-${track.audio_id || index}`}
                    type="button"
                    onClick={() => playAt(index)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${index === safeIndex ? "bg-[#f0ae2e]/10 text-white" : "text-zinc-500 hover:bg-white/[0.04] hover:text-white"}`}
                  >
                    <span className="w-6 text-center text-[10px] font-black">{track.track_number || index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{track.title}</span>
                      <span className="block truncate text-[11px] text-zinc-600">{track.artist_name || item.creator}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StreamingMasterPlayer({ item, onClose }: { item: MasterStreamingItem; onClose: () => void }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const player = item.group === "listen"
    ? <AudioPlayer item={item} />
    : item.group === "read" || item.group === "experience"
      ? <StreamingManifestRuntime item={item} />
      : item.group === "play"
        ? <StreamingGameRuntime item={item} />
        : <VideoPlayer item={item} />;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/95 p-4 backdrop-blur-xl sm:p-7" role="dialog" aria-modal="true" aria-label={`${item.title} player`}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] font-black tracking-[0.18em] text-[#f0ae2e]">PRESS START PLAYER</div>
            <h2 className="truncate text-lg font-black text-white sm:text-xl">{item.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 text-zinc-400 transition hover:border-[#f0ae2e]/45 hover:text-white focus:outline-none focus:shadow-[inset_0_0_0_3px_#F0AE2E]"
            aria-label="Back and stop playback"
            title="Back · Esc"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {player}
      </div>
    </div>
  );
}
