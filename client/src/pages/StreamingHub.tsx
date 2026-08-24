import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  BookOpen,
  ChevronRight,
  Clock3,
  Film,
  Gamepad2,
  GitBranch,
  Home,
  Layers,
  Library,
  ListPlus,
  Play,
  Search,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";

interface StreamingItem {
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

interface LibraryResponse {
  comics: StreamingItem[];
  total: number;
  page: number;
  totalPages: number;
}

interface StreamingSeries {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  creatorName: string;
  creatorAvatar: string | null;
  comicCount: number;
  subscriberCount?: number;
}

interface Bookmark {
  id: string;
  projectId: string;
  lastSpreadIndex: number;
  comicTitle: string;
  comicThumbnail: string | null;
  comicStatus: string;
  updatedAt: string;
}

const GOLD = "#f0ae2e";
const RAIL_IDLE_MS = 2400;

const typeLabels: Record<string, string> = {
  comic: "COMIC",
  vn: "VISUAL NOVEL",
  cyoa: "CYOA",
  card: "CARDS",
  hop: "HOP",
  motion: "MOTION",
};

const typeIcons: Record<string, typeof BookOpen> = {
  comic: BookOpen,
  vn: Film,
  cyoa: GitBranch,
  card: Layers,
  hop: Film,
  motion: Film,
};

function openUrl(item: StreamingItem) {
  return item.projectType === "comic"
    ? `/community/read/${item.id}`
    : `/community/view/${item.id}`;
}

async function fetchLibrary(params: Record<string, string>): Promise<LibraryResponse> {
  const query = new URLSearchParams({ page: "1", limit: "24", ...params });
  const res = await fetch(`/api/community/library?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to load PS Streaming library");
  return res.json();
}

function Rail() {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };

  const expand = () => {
    clearClose();
    setOpen(true);
  };

  const scheduleClose = () => {
    clearClose();
    closeTimer.current = setTimeout(() => setOpen(false), RAIL_IDLE_MS);
  };

  useEffect(() => () => clearClose(), []);

  const destinations = [
    { label: "Home", href: "/streaming", icon: Home },
    { label: "Discover", href: "/streaming#discover", icon: Sparkles },
    { label: "Search", href: "/streaming#search", icon: Search },
    { label: "Channels", href: "/streaming#channels", icon: Users },
    { label: "Continue", href: "/streaming#continue", icon: Clock3 },
    { label: "Library", href: "/community", icon: Library },
  ];

  return (
    <div className="fixed left-4 top-4 bottom-4 z-50 hidden lg:block w-[52px]">
      <aside
        className="absolute left-0 top-0 h-full overflow-hidden rounded-3xl border border-white/10 bg-black/80 shadow-2xl backdrop-blur-xl transition-[width] duration-200"
        style={{ width: open ? 68 : 52 }}
        onMouseEnter={expand}
        onMouseLeave={scheduleClose}
        onFocusCapture={expand}
        onBlurCapture={scheduleClose}
        aria-label="Streaming destinations"
      >
        <div className="flex h-full flex-col items-center py-4">
          <Link href="/streaming" className="mb-7 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-xs font-black tracking-widest text-white hover:border-[#f0ae2e]/60">
            PS
          </Link>

          <nav className="flex flex-col items-center gap-2">
            {destinations.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                title={label}
                aria-label={label}
                className="grid h-10 w-10 place-items-center rounded-full border border-transparent text-zinc-500 transition hover:border-white/10 hover:bg-white/[0.05] hover:text-white focus:border-[#f0ae2e]/70 focus:bg-[#f0ae2e]/10 focus:text-[#f0ae2e] focus:outline-none"
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
              </a>
            ))}
          </nav>

          <Link
            href="/settings"
            title="Settings"
            aria-label="Settings"
            className="mt-auto grid h-10 w-10 place-items-center rounded-full text-zinc-600 transition hover:bg-white/[0.05] hover:text-white focus:text-[#f0ae2e] focus:outline-none"
          >
            <Settings className="h-[18px] w-[18px]" strokeWidth={1.7} />
          </Link>
        </div>
      </aside>
    </div>
  );
}

function StreamingCard({ item, wide = false }: { item: StreamingItem; wide?: boolean }) {
  const TypeIcon = typeIcons[item.projectType || ""] || Film;
  return (
    <Link
      href={`/streaming/title/${item.id}`}
      className={`group block shrink-0 ${wide ? "w-[300px] sm:w-[350px]" : "w-[170px] sm:w-[205px]"}`}
    >
      <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#101010] transition duration-300 group-hover:-translate-y-1 group-hover:border-[#f0ae2e]/45 group-hover:shadow-[0_18px_45px_rgba(0,0,0,.45)]">
        <div className={wide ? "aspect-video" : "aspect-[3/4]"}>
          {item.thumbnail ? (
            <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#171717]">
              <TypeIcon className="h-12 w-12 text-zinc-700" />
            </div>
          )}
        </div>
        <div className="border-t border-white/[0.07] p-3.5">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold tracking-[0.16em] text-[#f0ae2e]">
            <TypeIcon className="h-3.5 w-3.5" />
            {typeLabels[item.projectType || ""] || "PRESS START"}
          </div>
          <h3 className="truncate text-sm font-bold text-white">{item.title}</h3>
          <p className="mt-1 truncate text-xs text-zinc-500">{item.creatorName || "Press Start Creator"}</p>
        </div>
      </article>
    </Link>
  );
}

function RailRow({ title, items, wide = false }: { title: string; items: StreamingItem[]; wide?: boolean }) {
  if (!items.length) return null;
  return (
    <section className="mb-11">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">{title}</h2>
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-600">PS Streaming</span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => <StreamingCard key={item.id} item={item} wide={wide} />)}
      </div>
    </section>
  );
}

function ChannelRow({ channels }: { channels: StreamingSeries[] }) {
  if (!channels.length) return null;
  return (
    <section id="channels" className="mb-11 scroll-mt-24">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">Channels & Series</h2>
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-600">Creator channels</span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {channels.map((channel) => (
          <Link key={channel.id} href={`/community/series/${channel.id}`} className="group block w-[310px] shrink-0 sm:w-[380px]">
            <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#101010] transition group-hover:border-[#f0ae2e]/45">
              <div className="aspect-video bg-[#171717]">
                {channel.coverImage ? (
                  <img src={channel.coverImage} alt={channel.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" />
                ) : (
                  <div className="flex h-full items-center justify-center"><Users className="h-12 w-12 text-zinc-700" /></div>
                )}
              </div>
              <div className="p-4">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#f0ae2e]">Channel</div>
                <h3 className="truncate text-base font-black text-white">{channel.title}</h3>
                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-zinc-500">
                  <span className="truncate">{channel.creatorName}</span>
                  <span>{channel.comicCount} releases</span>
                </div>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function StreamingHub() {
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState("all");

  const popular = useQuery<LibraryResponse>({
    queryKey: ["ps-streaming", "popular"],
    queryFn: () => fetchLibrary({ sort: "popular" }),
  });

  const newest = useQuery<LibraryResponse>({
    queryKey: ["ps-streaming", "newest"],
    queryFn: () => fetchLibrary({ sort: "newest" }),
  });

  const filtered = useQuery<LibraryResponse>({
    queryKey: ["ps-streaming", "filter", activeType, search],
    queryFn: () => fetchLibrary({
      sort: "newest",
      ...(activeType !== "all" ? { type: activeType } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
    }),
  });

  const channels = useQuery<StreamingSeries[]>({
    queryKey: ["ps-streaming", "channels"],
    queryFn: async () => {
      const res = await fetch("/api/community/series");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const bookmarks = useQuery<Bookmark[]>({
    queryKey: ["ps-streaming", "bookmarks"],
    queryFn: async () => {
      const res = await fetch("/api/bookmarks", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const popularItems = popular.data?.comics ?? [];
  const newestItems = newest.data?.comics ?? [];
  const hero = popularItems[0] || newestItems[0];

  const continueItems = useMemo<StreamingItem[]>(() => {
    return (bookmarks.data || [])
      .filter((b) => b.comicStatus === "published" || b.comicStatus === "approved")
      .slice(0, 12)
      .map((b) => ({
        id: b.projectId,
        title: b.comicTitle,
        thumbnail: b.comicThumbnail,
        creatorName: "Continue reading",
        creatorAvatar: null,
        pageCount: Math.max(1, b.lastSpreadIndex + 1),
        status: b.comicStatus,
        createdAt: b.updatedAt,
        userId: "",
        projectType: "comic",
      }));
  }, [bookmarks.data]);

  const types = [
    ["all", "ALL"],
    ["comic", "COMICS"],
    ["vn", "VISUAL NOVELS"],
    ["cyoa", "CYOA"],
    ["hop", "HOPS"],
    ["card", "CARDS"],
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Rail />

      <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/[0.06] bg-black/70 backdrop-blur-xl lg:left-[84px]">
        <div className="mx-auto flex h-16 max-w-[1680px] items-center justify-between gap-5 px-5 sm:px-8">
          <Link href="/streaming" className="flex items-center gap-3">
            <span className="text-sm font-black tracking-[0.22em] text-white">PRESS START</span>
            <span className="hidden text-[10px] font-bold tracking-[0.2em] text-[#f0ae2e] sm:inline">STREAMING</span>
          </Link>
          <div className="hidden items-center gap-5 text-xs font-bold text-zinc-500 md:flex">
            <a href="#discover" className="hover:text-white">Discover</a>
            <a href="#channels" className="hover:text-white">Channels</a>
            <Link href="/community" className="hover:text-white">Library</Link>
          </div>
        </div>
      </header>

      <main className="lg:pl-[84px]">
        {hero ? (
          <section className="relative min-h-[690px] overflow-hidden pt-16 lg:min-h-[78vh]">
            <div className="absolute inset-0">
              {hero.thumbnail && <img src={hero.thumbnail} alt="" className="h-full w-full object-cover opacity-60" />}
              <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/85 to-[#050505]/15" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-black/25" />
            </div>
            <div className="relative mx-auto flex min-h-[690px] max-w-[1680px] items-end px-5 pb-24 pt-32 sm:px-8 lg:min-h-[78vh] lg:items-center lg:pb-20">
              <div className="max-w-3xl">
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#f0ae2e]/45 bg-[#f0ae2e]/10 px-3 py-1 text-[10px] font-black tracking-[0.18em] text-[#f0ae2e]">FEATURED</span>
                  <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-bold tracking-[0.15em] text-zinc-300">{typeLabels[hero.projectType || ""] || "PRESS START ORIGINAL"}</span>
                </div>
                <h1 className="max-w-3xl text-5xl font-black leading-[0.9] tracking-[-0.045em] text-white sm:text-6xl lg:text-8xl">{hero.title}</h1>
                <p className="mt-5 text-sm font-medium text-zinc-400 sm:text-base">A Press Start creator release by <span className="text-white">{hero.creatorName || "Press Start Creator"}</span>.</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href={openUrl(hero)} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-black text-black transition hover:bg-[#f0ae2e]">
                    <Play className="h-4 w-4" fill="currentColor" /> OPEN
                  </Link>
                  <Link href={`/streaming/title/${hero.id}`} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-6 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:border-[#f0ae2e]/50 hover:bg-[#f0ae2e]/10">
                    MORE INFO <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="flex min-h-[60vh] items-center justify-center pt-16 text-zinc-500">Loading PS Streaming…</section>
        )}

        <div id="discover" className="relative z-10 mx-auto -mt-12 max-w-[1680px] scroll-mt-20 px-5 pb-24 sm:px-8">
          <section id="search" className="mb-10 rounded-3xl border border-white/[0.08] bg-[#0d0d0d]/95 p-4 shadow-2xl backdrop-blur-xl sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search Press Start Streaming…"
                  className="h-12 w-full rounded-full border border-white/10 bg-black/50 pl-11 pr-5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#f0ae2e]/55"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {types.map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setActiveType(key)}
                    className={`shrink-0 rounded-full border px-4 py-2.5 text-[10px] font-black tracking-[0.14em] transition ${activeType === key ? "border-[#f0ae2e] bg-[#f0ae2e] text-black" : "border-white/10 bg-black/30 text-zinc-500 hover:border-white/20 hover:text-white"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {(search.trim() || activeType !== "all") && (
            <RailRow title={search.trim() ? `Search: ${search}` : typeLabels[activeType] || "Browse"} items={filtered.data?.comics ?? []} />
          )}

          <div id="continue" className="scroll-mt-24">
            <RailRow title="Continue" items={continueItems} wide />
          </div>
          <RailRow title="Trending Now" items={popularItems} />
          <RailRow title="New Arrivals" items={newestItems} />
          <ChannelRow channels={channels.data || []} />

          <section className="grid gap-4 md:grid-cols-3">
            <Link href="/community" className="group rounded-3xl border border-white/[0.08] bg-[#0d0d0d] p-6 transition hover:border-[#f0ae2e]/40">
              <Library className="h-6 w-6 text-[#f0ae2e]" />
              <h3 className="mt-5 text-lg font-black">Full Community Library</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">Browse every published PSCoMiXX creation with the ecosystem’s existing filters and readers.</p>
            </Link>
            <Link href="/ecosystem/publish" className="group rounded-3xl border border-white/[0.08] bg-[#0d0d0d] p-6 transition hover:border-[#f0ae2e]/40">
              <ListPlus className="h-6 w-6 text-[#f0ae2e]" />
              <h3 className="mt-5 text-lg font-black">Publish to Streaming</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">Creator publishing stays powered by PSCoMiXX. Streaming is the audience-facing window, not a second backend.</p>
            </Link>
            <Link href="/battle" className="group rounded-3xl border border-white/[0.08] bg-[#0d0d0d] p-6 transition hover:border-[#f0ae2e]/40">
              <Gamepad2 className="h-6 w-6 text-[#f0ae2e]" />
              <h3 className="mt-5 text-lg font-black">Play</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">Games and interactive releases remain inside the same ecosystem and can surface as streaming rails.</p>
            </Link>
          </section>
        </div>
      </main>

      <style>{`
        :root { --ps-stream-gold: ${GOLD}; }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
}
