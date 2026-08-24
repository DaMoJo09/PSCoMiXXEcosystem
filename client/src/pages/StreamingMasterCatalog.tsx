import { FormEvent, ReactNode, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useRoute } from "wouter";
import { ArrowLeft, BookOpen, Film, Gamepad2, Headphones, Search } from "lucide-react";
import {
  fetchMasterStreamingCatalog,
  MasterStreamingItem,
  streamingGroupLabel,
  streamingItemHref,
  streamingKindLabel,
} from "@/lib/streamingMasterCatalog";

interface Bookmark {
  id: string;
  projectId: string;
  lastSpreadIndex: number;
  comicTitle: string;
  comicThumbnail: string | null;
  comicStatus: string;
  updatedAt: string;
}

function iconFor(item: MasterStreamingItem) {
  if (item.group === "listen") return Headphones;
  if (item.group === "read") return BookOpen;
  if (item.group === "experience") return Gamepad2;
  return Film;
}

function Card({ item }: { item: MasterStreamingItem }) {
  const Icon = iconFor(item);
  return (
    <Link href={streamingItemHref(item)} className="group block">
      <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#101010] transition duration-300 group-hover:-translate-y-1 group-hover:border-[#f0ae2e]/45">
        <div className="aspect-[3/4] bg-[#171717]">
          {item.image ? (
            <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center"><Icon className="h-10 w-10 text-zinc-700" /></div>
          )}
        </div>
        <div className="border-t border-white/[0.07] p-3.5">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-black tracking-[0.14em] text-[#f0ae2e]">
            <Icon className="h-3.5 w-3.5" /> {streamingKindLabel(item.kind)}
          </div>
          <h2 className="truncate text-sm font-bold text-white">{item.title}</h2>
          <p className="mt-1 truncate text-xs text-zinc-500">{item.creator}</p>
        </div>
      </article>
    </Link>
  );
}

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1680px] items-center gap-4 px-5 sm:px-8">
          <Link href="/streaming" className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-zinc-400 transition hover:border-[#f0ae2e]/45 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="text-[10px] font-black tracking-[0.2em] text-[#f0ae2e]">PRESS START STREAMING</div>
            <div className="text-sm font-black text-white">{title}</div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1680px] px-5 py-10 sm:px-8">
        <h1 className="text-4xl font-black tracking-[-0.035em] sm:text-5xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500 sm:text-base">{subtitle}</p>
        <div className="mt-9">{children}</div>
      </main>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-3xl border border-dashed border-white/10 p-12 text-center text-sm text-zinc-600">{message}</div>;
}

export default function StreamingMasterCatalog() {
  const [location, navigate] = useLocation();
  const [, browseParams] = useRoute("/streaming/browse/:type");
  const browseType = (browseParams?.type || "all").toLowerCase();
  const isSearch = location.startsWith("/streaming/search");
  const isContinue = location.startsWith("/streaming/continue");
  const urlQuery = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("q") || "" : "";
  const [search, setSearch] = useState(urlQuery);

  const catalog = useQuery({
    queryKey: ["ps-streaming", "master-catalog"],
    queryFn: fetchMasterStreamingCatalog,
    staleTime: 60_000,
    retry: 1,
    enabled: !isContinue,
  });

  const bookmarks = useQuery<Bookmark[]>({
    queryKey: ["ps-streaming", "continue-page"],
    queryFn: async () => {
      const res = await fetch("/api/bookmarks", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isContinue,
  });

  const continueItems = useMemo<MasterStreamingItem[]>(() => (bookmarks.data || [])
    .filter((bookmark) => bookmark.comicStatus === "published" || bookmark.comicStatus === "approved")
    .map((bookmark) => ({
      id: `community:${bookmark.projectId}`,
      sourceId: bookmark.projectId,
      source: "community",
      group: "read",
      kind: "comic",
      title: bookmark.comicTitle,
      synopsis: `Resume at page ${bookmark.lastSpreadIndex + 1}.`,
      creator: "Continue reading",
      image: bookmark.comicThumbnail,
      backdrop: bookmark.comicThumbnail,
      rating: null,
      durationSeconds: null,
      meta: `Page ${bookmark.lastSpreadIndex + 1}`,
      deepLink: `/community/read/${bookmark.projectId}`,
      streamUrl: null,
      streamType: null,
      featured: false,
      createdAt: bookmark.updatedAt,
    })), [bookmarks.data]);

  const filteredItems = useMemo(() => {
    const items = catalog.data?.items || [];
    if (isSearch) {
      const needle = urlQuery.trim().toLowerCase();
      if (!needle) return items;
      return items.filter((item) => [item.title, item.creator, item.synopsis, item.kind, item.group]
        .some((value) => value.toLowerCase().includes(needle)));
    }
    if (browseType === "all") return items;
    if (["watch", "listen", "experience", "read"].includes(browseType)) {
      return items.filter((item) => item.group === browseType);
    }
    if (browseType === "community") return items.filter((item) => item.source === "community");
    return items.filter((item) => item.kind === browseType);
  }, [catalog.data?.items, isSearch, urlQuery, browseType]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    navigate(`/streaming/search?q=${encodeURIComponent(search.trim())}`);
  };

  if (isContinue) {
    return (
      <Shell title="Continue" subtitle="Resume published Press Start work from your existing reading history.">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {continueItems.map((item) => <Card key={item.id} item={item} />)}
        </div>
        {!bookmarks.isLoading && !continueItems.length && <EmptyState message="Nothing to resume yet." />}
      </Shell>
    );
  }

  if (isSearch) {
    return (
      <Shell title="Search" subtitle="Search films, music, HOP experiences, comics, visual novels, and creator releases from one catalog.">
        <form onSubmit={submitSearch} className="relative mb-9 max-w-2xl">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-600" />
          <input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search titles and creators…"
            className="h-14 w-full rounded-full border border-white/10 bg-[#101010] pl-12 pr-5 text-white outline-none placeholder:text-zinc-600 focus:border-[#f0ae2e]/55"
          />
        </form>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {filteredItems.map((item) => <Card key={item.id} item={item} />)}
        </div>
        {!catalog.isLoading && !filteredItems.length && <EmptyState message="No Press Start releases matched that search." />}
      </Shell>
    );
  }

  const browseLabels: Record<string, string> = {
    all: "ALL",
    watch: "WATCH",
    listen: "LISTEN",
    experience: "EXPERIENCE",
    read: "READ",
    community: "CREATOR COMMUNITY",
  };
  const title = browseLabels[browseType] || streamingGroupLabel(browseType as any);

  return (
    <Shell title={title} subtitle="Browse the unified Press Start catalog by destination.">
      <div className="mb-8 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {Object.entries(browseLabels).map(([key, label]) => (
          <Link
            key={key}
            href={`/streaming/browse/${key}`}
            className={`shrink-0 rounded-full border px-4 py-2.5 text-[10px] font-black tracking-[0.14em] ${browseType === key ? "border-[#f0ae2e] bg-[#f0ae2e] text-black" : "border-white/10 text-zinc-500 hover:text-white"}`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {filteredItems.map((item) => <Card key={item.id} item={item} />)}
      </div>
      {!catalog.isLoading && !filteredItems.length && <EmptyState message="Nothing is published in this section yet." />}
    </Shell>
  );
}
