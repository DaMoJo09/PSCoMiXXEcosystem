import { FormEvent, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useRoute } from "wouter";
import { ArrowLeft, BookOpen, Film, GitBranch, Layers, Search, Users } from "lucide-react";

interface Item {
  id: string;
  title: string;
  thumbnail: string | null;
  creatorName: string;
  creatorAvatar: string | null;
  pageCount: number;
  status: string;
  createdAt: string;
  userId: string;
  projectType?: string;
}
interface LibraryResponse { comics: Item[]; total: number; page: number; totalPages: number }
interface Series { id: string; title: string; description: string | null; coverImage: string | null; creatorName: string; creatorAvatar: string | null; comicCount: number; subscriberCount?: number }
interface Bookmark { id: string; projectId: string; lastSpreadIndex: number; comicTitle: string; comicThumbnail: string | null; comicStatus: string; updatedAt: string }

const labels: Record<string, string> = { all: "ALL", comic: "COMICS", vn: "VISUAL NOVELS", cyoa: "CYOA", hop: "HOPS", card: "CARDS", motion: "MOTION" };
const icons: Record<string, typeof BookOpen> = { comic: BookOpen, vn: Film, cyoa: GitBranch, hop: Film, card: Layers, motion: Film };

function Card({ item }: { item: Item }) {
  const Icon = icons[item.projectType || ""] || Film;
  return (
    <Link href={`/streaming/title/${item.id}`} className="group block">
      <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#101010] transition duration-300 group-hover:-translate-y-1 group-hover:border-[#f0ae2e]/45">
        <div className="aspect-[3/4] bg-[#171717]">
          {item.thumbnail ? <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Icon className="h-10 w-10 text-zinc-700" /></div>}
        </div>
        <div className="border-t border-white/[0.07] p-3.5">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-black tracking-[0.14em] text-[#f0ae2e]"><Icon className="h-3.5 w-3.5" />{labels[item.projectType || ""] || "PRESS START"}</div>
          <h2 className="truncate text-sm font-bold text-white">{item.title}</h2>
          <p className="mt-1 truncate text-xs text-zinc-500">{item.creatorName || "Press Start Creator"}</p>
        </div>
      </article>
    </Link>
  );
}

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1680px] items-center gap-4 px-5 sm:px-8">
          <Link href="/streaming" className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-zinc-400 transition hover:border-[#f0ae2e]/45 hover:text-white"><ArrowLeft className="h-4 w-4" /></Link>
          <div><div className="text-[10px] font-black tracking-[0.2em] text-[#f0ae2e]">PRESS START STREAMING</div><div className="text-sm font-black text-white">{title}</div></div>
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

export default function StreamingCatalog() {
  const [location, navigate] = useLocation();
  const [, browseParams] = useRoute("/streaming/browse/:type");
  const browseType = browseParams?.type || "all";
  const isSearch = location.startsWith("/streaming/search");
  const isChannels = location.startsWith("/streaming/channels");
  const isContinue = location.startsWith("/streaming/continue");
  const urlQuery = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("q") || "" : "";
  const [search, setSearch] = useState(urlQuery);

  const library = useQuery<LibraryResponse>({
    queryKey: ["ps-streaming", "catalog", browseType, urlQuery, isSearch],
    queryFn: async () => {
      const qs = new URLSearchParams({ page: "1", limit: "60", sort: "newest" });
      if (!isSearch && browseType !== "all") qs.set("type", browseType);
      if (isSearch && urlQuery.trim()) qs.set("search", urlQuery.trim());
      const res = await fetch(`/api/community/library?${qs.toString()}`);
      if (!res.ok) throw new Error("Failed to load catalog");
      return res.json();
    },
    enabled: !isChannels && !isContinue,
  });

  const series = useQuery<Series[]>({
    queryKey: ["ps-streaming", "all-channels"],
    queryFn: async () => {
      const res = await fetch("/api/community/series");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isChannels,
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

  const continueItems = useMemo<Item[]>(() => (bookmarks.data || []).filter(b => b.comicStatus === "published" || b.comicStatus === "approved").map(b => ({ id: b.projectId, title: b.comicTitle, thumbnail: b.comicThumbnail, creatorName: `Page ${b.lastSpreadIndex + 1}`, creatorAvatar: null, pageCount: b.lastSpreadIndex + 1, status: b.comicStatus, createdAt: b.updatedAt, userId: "", projectType: "comic" })), [bookmarks.data]);

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/streaming/search?q=${encodeURIComponent(search.trim())}`);
  };

  if (isChannels) return (
    <Shell title="Channels" subtitle="Creator channels and series from the PSCoMiXX ecosystem.">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {(series.data || []).map(s => <Link key={s.id} href={`/community/series/${s.id}`} className="group overflow-hidden rounded-3xl border border-white/10 bg-[#101010] transition hover:border-[#f0ae2e]/45"><div className="aspect-video bg-[#171717]">{s.coverImage ? <img src={s.coverImage} alt={s.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Users className="h-12 w-12 text-zinc-700" /></div>}</div><div className="p-5"><div className="text-[10px] font-black tracking-[0.18em] text-[#f0ae2e]">CHANNEL</div><h2 className="mt-2 text-xl font-black">{s.title}</h2><p className="mt-2 text-sm text-zinc-500">{s.creatorName} · {s.comicCount} releases</p>{s.description && <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-400">{s.description}</p>}</div></Link>)}
      </div>
    </Shell>
  );

  if (isContinue) return <Shell title="Continue" subtitle="Resume where you left off using the existing PSCoMiXX bookmark connection."><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{continueItems.map(i => <Card key={i.id} item={i} />)}</div>{!continueItems.length && <div className="rounded-3xl border border-dashed border-white/10 p-12 text-center text-zinc-600">Nothing to resume yet.</div>}</Shell>;

  if (isSearch) return (
    <Shell title="Search" subtitle="Search the same published PSCoMiXX catalog that powers the ecosystem.">
      <form onSubmit={submitSearch} className="relative mb-9 max-w-2xl"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-600" /><input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search titles and creators…" className="h-14 w-full rounded-full border border-white/10 bg-[#101010] pl-12 pr-5 text-white outline-none placeholder:text-zinc-600 focus:border-[#f0ae2e]/55" /></form>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{(library.data?.comics || []).map(i => <Card key={i.id} item={i} />)}</div>
    </Shell>
  );

  return (
    <Shell title={labels[browseType] || "Browse"} subtitle="Browse Press Start creator releases by format.">
      <div className="mb-8 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{Object.entries(labels).filter(([key]) => key !== "motion").map(([key, label]) => <Link key={key} href={`/streaming/browse/${key}`} className={`shrink-0 rounded-full border px-4 py-2.5 text-[10px] font-black tracking-[0.14em] ${browseType === key ? "border-[#f0ae2e] bg-[#f0ae2e] text-black" : "border-white/10 text-zinc-500 hover:text-white"}`}>{label}</Link>)}</div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{(library.data?.comics || []).map(i => <Card key={i.id} item={i} />)}</div>
    </Shell>
  );
}
