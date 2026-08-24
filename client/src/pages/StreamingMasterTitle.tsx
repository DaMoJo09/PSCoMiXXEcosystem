import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { ArrowLeft, BookOpen, Check, Film, Gamepad2, Headphones, Play, Plus, RotateCcw, Sparkles, UserRound } from "lucide-react";
import StreamingMasterPlayer from "@/components/streaming/StreamingMasterPlayer";
import {
  fetchMasterStreamingCatalog,
  fetchMasterStreamingItem,
  formatRuntime,
  MasterStreamingItem,
  streamingGroupLabel,
  streamingItemDestination,
  streamingItemHref,
  streamingKindLabel,
} from "@/lib/streamingMasterCatalog";
import {
  isStreamingItemSaved,
  setStreamingItemSaved,
  STREAMING_MY_LIST_EVENT,
} from "@/lib/streamingMyList";

function iconFor(item: MasterStreamingItem) {
  if (item.group === "listen") return Headphones;
  if (item.group === "read") return BookOpen;
  if (item.group === "experience") return Sparkles;
  if (item.group === "play") return Gamepad2;
  return Film;
}

function actionLabel(item: MasterStreamingItem) {
  if (item.group === "listen") return "LISTEN NOW";
  if (item.group === "read") return "READ NOW";
  if (item.group === "experience") return "ENTER EXPERIENCE";
  if (item.group === "play") return "PLAY NOW";
  if (item.kind === "film" || item.kind === "short" || item.kind === "episode" || item.kind === "music_video") return "WATCH NOW";
  return "OPEN TITLE";
}

function creatorLabel(item: MasterStreamingItem) {
  return item.title.trim().toLowerCase() === "a mysterious murder"
    ? "A Keyvon Adams Production"
    : item.creator;
}

function DestinationButton({ item, onPlay }: { item: MasterStreamingItem; onPlay: () => void }) {
  const className = "inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-black text-black transition hover:bg-[#f0ae2e]";
  const content = <><Play className="h-4 w-4" fill="currentColor" /> {actionLabel(item)}</>;

  // Every live Press Start title stays inside the master player. A missing or
  // temporarily unavailable runtime is handled by that runtime's own state;
  // it must not silently kick the viewer back to a legacy /tv route.
  if (item.source === "live") {
    return <button type="button" onClick={onPlay} className={className}>{content}</button>;
  }

  const destination = streamingItemDestination(item);
  if (!destination) {
    return <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-zinc-800 px-7 py-3.5 text-sm font-black text-zinc-500"><Play className="h-4 w-4" /> NOT AVAILABLE YET</span>;
  }

  if (/^https?:\/\//i.test(destination)) {
    return <a href={destination} className={className}>{content}</a>;
  }
  return <Link href={destination} className={className}>{content}</Link>;
}

export default function StreamingMasterTitle() {
  const [match, params] = useRoute("/streaming/title/:id");
  const encodedId = params?.id || "";
  const [playerOpen, setPlayerOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const itemQuery = useQuery({
    queryKey: ["ps-streaming", "master-title", encodedId],
    queryFn: () => fetchMasterStreamingItem(encodedId),
    enabled: !!encodedId,
    staleTime: 60_000,
    retry: 1,
  });

  const catalog = useQuery({
    queryKey: ["ps-streaming", "master-catalog"],
    queryFn: fetchMasterStreamingCatalog,
    staleTime: 60_000,
    retry: 1,
  });

  const item = itemQuery.data || null;

  useEffect(() => {
    if (item?.source === "community" && item.sourceId) {
      fetch(`/api/community/comic/${encodeURIComponent(item.sourceId)}/view`, { method: "POST" }).catch(() => {});
    }
  }, [item?.source, item?.sourceId]);

  useEffect(() => {
    setPlayerOpen(false);
  }, [encodedId]);

  useEffect(() => {
    if (!item) return;
    const sync = () => setSaved(isStreamingItemSaved(item.id));
    sync();
    window.addEventListener(STREAMING_MY_LIST_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(STREAMING_MY_LIST_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [item?.id]);

  const related = useMemo(() => {
    if (!item) return [];
    return (catalog.data?.items || [])
      .filter((candidate) => candidate.id !== item.id && candidate.group === item.group)
      .slice(0, 12);
  }, [catalog.data?.items, item]);

  if (!match) return null;

  if (itemQuery.isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#050505] text-sm font-bold tracking-[0.16em] text-zinc-600">LOADING TITLE…</div>;
  }

  if (!item || itemQuery.isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#050505] px-6 text-center text-white">
        <Film className="h-12 w-12 text-zinc-700" />
        <p className="font-bold text-zinc-400">This title is not available right now.</p>
        <p className="max-w-lg text-sm leading-6 text-zinc-600">The title may be temporarily unavailable or the connection may have dropped. Press Start will keep you inside the master Streaming experience while it recovers.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => itemQuery.refetch()}
            disabled={itemQuery.isFetching}
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-[#f0ae2e] disabled:opacity-50"
          >
            <RotateCcw className={`h-4 w-4 ${itemQuery.isFetching ? "animate-spin" : ""}`} /> RETRY
          </button>
          <Link href="/streaming" className="rounded-full border border-white/10 px-5 py-3 text-sm font-bold text-zinc-300 hover:border-[#f0ae2e]/50 hover:text-white">Back to Streaming</Link>
        </div>
      </div>
    );
  }

  const Icon = iconFor(item);
  const runtime = formatRuntime(item.durationSeconds);
  const isMysteriousMurder = item.title.trim().toLowerCase() === "a mysterious murder";

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <section className="relative min-h-[76vh] overflow-hidden">
        <div className="absolute inset-0">
          {item.backdrop ? <img src={item.backdrop} alt="" className="h-full w-full object-cover opacity-55" /> : <div className="h-full w-full bg-[#111]" />}
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/88 to-[#050505]/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-black/45" />
        </div>

        <div className="relative mx-auto flex min-h-[76vh] max-w-[1680px] flex-col px-5 pb-20 pt-7 sm:px-8">
          <Link href="/streaming" className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2.5 text-xs font-bold text-zinc-300 backdrop-blur transition hover:border-[#f0ae2e]/45 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> BACK
          </Link>

          <div className="mt-auto max-w-3xl">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#f0ae2e]/45 bg-[#f0ae2e]/10 px-3 py-1.5 text-[10px] font-black tracking-[0.18em] text-[#f0ae2e]">
                <Icon className="h-3.5 w-3.5" /> {streamingKindLabel(item.kind)}
              </span>
              <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[10px] font-bold tracking-[0.13em] text-zinc-400">{streamingGroupLabel(item.group)}</span>
              {isMysteriousMurder && <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[10px] font-black tracking-[0.13em] text-white">FIRST FEATURE FILM ON PRESS START</span>}
            </div>

            <h1 className="text-5xl font-black leading-[0.9] tracking-[-0.045em] sm:text-6xl lg:text-8xl">{item.title}</h1>

            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-zinc-400">
              <span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4" /> {creatorLabel(item)}</span>
              {runtime && <span>{runtime}</span>}
              {item.rating && <span>{item.rating}</span>}
              {item.meta && <span>{item.meta}</span>}
            </div>

            <p className="mt-6 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">{item.synopsis}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <DestinationButton item={item} onPlay={() => setPlayerOpen(true)} />
              <Link href={`/streaming/browse/${item.group}`} className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.06] px-7 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:border-[#f0ae2e]/45 hover:bg-[#f0ae2e]/10">MORE {streamingGroupLabel(item.group)}</Link>
              <button
                type="button"
                onClick={() => {
                  setStreamingItemSaved(item.id, !saved);
                  setSaved(!saved);
                }}
                className={`inline-flex items-center gap-2 rounded-full border px-5 py-3.5 text-sm font-bold transition ${saved ? "border-white bg-white text-black" : "border-white/15 bg-white/[0.06] text-white hover:border-[#f0ae2e]/45 hover:bg-[#f0ae2e]/10"}`}
                aria-label={saved ? "Remove from My List" : "Add to My List"}
              >
                {saved ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {saved ? "IN MY LIST" : "MY LIST"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mx-auto max-w-[1680px] px-5 pb-24 pt-3 sm:px-8">
          <h2 className="mb-5 text-xl font-black sm:text-2xl">More Like This</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {related.map((candidate) => {
              const CandidateIcon = iconFor(candidate);
              return (
                <Link key={candidate.id} href={streamingItemHref(candidate)} className="group block w-[190px] shrink-0 sm:w-[220px]">
                  <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#101010] transition group-hover:-translate-y-1 group-hover:border-[#f0ae2e]/45">
                    <div className="aspect-[3/4] bg-[#171717]">
                      {candidate.image ? <img src={candidate.image} alt={candidate.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><CandidateIcon className="h-10 w-10 text-zinc-700" /></div>}
                    </div>
                    <div className="border-t border-white/[0.07] p-3">
                      <div className="mb-1 text-[9px] font-black tracking-[0.14em] text-[#f0ae2e]">{streamingKindLabel(candidate.kind)}</div>
                      <h3 className="truncate text-sm font-bold">{candidate.title}</h3>
                      <p className="mt-1 truncate text-xs text-zinc-500">{creatorLabel(candidate)}</p>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {playerOpen && <StreamingMasterPlayer item={item} onClose={() => setPlayerOpen(false)} />}
    </div>
  );
}
