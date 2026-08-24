import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  BookOpen,
  ChevronRight,
  Clock3,
  Film,
  Gamepad2,
  Headphones,
  Home,
  Library,
  Music2,
  Play,
  Search,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import {
  fetchMasterStreamingCatalog,
  formatRuntime,
  MasterStreamingItem,
  streamingGroupLabel,
  streamingItemHref,
  streamingKindLabel,
} from "@/lib/streamingMasterCatalog";

const GOLD = "#f0ae2e";
const RAIL_IDLE_MS = 2400;

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
    { label: "Watch", href: "/streaming/browse/watch", icon: Film },
    { label: "Listen", href: "/streaming/browse/listen", icon: Headphones },
    { label: "Experience", href: "/streaming/browse/experience", icon: Gamepad2 },
    { label: "Read", href: "/streaming/browse/read", icon: BookOpen },
    { label: "Search", href: "/streaming/search", icon: Search },
    { label: "Channels", href: "/streaming/channels", icon: Users },
    { label: "Continue", href: "/streaming/continue", icon: Clock3 },
  ];

  return (
    <div className="fixed bottom-4 left-4 top-4 z-50 hidden w-[52px] lg:block">
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
          <Link
            href="/streaming"
            className="mb-6 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-xs font-black tracking-widest text-white hover:border-[#f0ae2e]/60"
          >
            PS
          </Link>

          <nav className="flex flex-col items-center gap-1.5">
            {destinations.map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                title={label}
                aria-label={label}
                className="grid h-10 w-10 place-items-center rounded-full border border-transparent text-zinc-500 transition hover:border-white/10 hover:bg-white/[0.05] hover:text-white focus:border-[#f0ae2e]/70 focus:bg-[#f0ae2e]/10 focus:text-[#f0ae2e] focus:outline-none"
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
              </Link>
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

function Card({ item, wide = false }: { item: MasterStreamingItem; wide?: boolean }) {
  const runtime = formatRuntime(item.durationSeconds);
  const groupIcon = item.group === "listen" ? Music2 : item.group === "read" ? BookOpen : item.group === "experience" ? Gamepad2 : Film;
  const Icon = groupIcon;

  return (
    <Link href={streamingItemHref(item)} className={`group block shrink-0 ${wide ? "w-[300px] sm:w-[360px]" : "w-[170px] sm:w-[205px]"}`}>
      <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#101010] transition duration-300 group-hover:-translate-y-1 group-hover:border-[#f0ae2e]/45 group-hover:shadow-[0_18px_45px_rgba(0,0,0,.45)]">
        <div className={wide ? "aspect-video" : "aspect-[3/4]"}>
          {item.image ? (
            <img src={item.image} alt={item.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#171717]">
              <Icon className="h-12 w-12 text-zinc-700" />
            </div>
          )}
        </div>
        <div className="border-t border-white/[0.07] p-3.5">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-black tracking-[0.14em] text-[#f0ae2e]">
            <Icon className="h-3.5 w-3.5" />
            {streamingKindLabel(item.kind)}
          </div>
          <h3 className="truncate text-sm font-bold text-white">{item.title}</h3>
          <p className="mt-1 truncate text-xs text-zinc-500">
            {item.creator}{runtime ? ` · ${runtime}` : ""}
          </p>
        </div>
      </article>
    </Link>
  );
}

function RailRow({ title, items, wide = false, href }: { title: string; items: MasterStreamingItem[]; wide?: boolean; href: string }) {
  if (!items.length) return null;
  return (
    <section className="mb-11">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">{title}</h2>
        <Link href={href} className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600 transition hover:text-[#f0ae2e]">
          View all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => <Card key={item.id} item={item} wide={wide} />)}
      </div>
    </section>
  );
}

export default function StreamingMasterHub() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");

  const catalog = useQuery({
    queryKey: ["ps-streaming", "master-catalog"],
    queryFn: fetchMasterStreamingCatalog,
    staleTime: 60_000,
    retry: 1,
  });

  const items = catalog.data?.items || [];
  const rails = useMemo(() => ({
    watch: items.filter((item) => item.group === "watch").slice(0, 14),
    listen: items.filter((item) => item.group === "listen").slice(0, 14),
    experience: items.filter((item) => item.group === "experience").slice(0, 14),
    read: items.filter((item) => item.group === "read").slice(0, 14),
    community: items.filter((item) => item.source === "community").slice(0, 14),
  }), [items]);

  const hero = useMemo(() => {
    const mysteriousMurder = items.find((item) => item.title.trim().toLowerCase() === "a mysterious murder");
    return mysteriousMurder || items.find((item) => item.featured) || rails.watch[0] || items[0];
  }, [items, rails.watch]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const q = search.trim();
    if (q) navigate(`/streaming/search?q=${encodeURIComponent(q)}`);
  };

  const isMysteriousMurder = hero?.title.trim().toLowerCase() === "a mysterious murder";

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
            <Link href="/streaming/browse/watch" className="hover:text-white">Watch</Link>
            <Link href="/streaming/browse/listen" className="hover:text-white">Listen</Link>
            <Link href="/streaming/browse/experience" className="hover:text-white">Experience</Link>
            <Link href="/streaming/browse/read" className="hover:text-white">Read</Link>
          </div>
        </div>
      </header>

      <main className="lg:pl-[84px]">
        {catalog.isLoading ? (
          <div className="flex min-h-[72vh] items-center justify-center px-6 pt-16 text-sm font-bold tracking-[0.18em] text-zinc-600">LOADING PRESS START…</div>
        ) : hero ? (
          <section className="relative min-h-[690px] overflow-hidden pt-16 lg:min-h-[78vh]">
            <div className="absolute inset-0">
              {hero.backdrop && <img src={hero.backdrop} alt="" className="h-full w-full object-cover opacity-60" />}
              <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/88 to-[#050505]/15" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-black/25" />
            </div>

            <div className="relative mx-auto flex min-h-[690px] max-w-[1680px] items-end px-5 pb-24 pt-32 sm:px-8 lg:min-h-[78vh] lg:items-center lg:pb-20">
              <div className="max-w-3xl">
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#f0ae2e]/45 bg-[#f0ae2e]/10 px-3 py-1.5 text-[10px] font-black tracking-[0.18em] text-[#f0ae2e]">
                    {isMysteriousMurder ? "FIRST FEATURE FILM ON PRESS START" : hero.featured ? "FEATURED" : streamingGroupLabel(hero.group)}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-[10px] font-black tracking-[0.15em] text-zinc-300">
                    {streamingKindLabel(hero.kind)}
                  </span>
                </div>

                <h1 className="max-w-4xl text-5xl font-black leading-[0.9] tracking-[-0.045em] sm:text-6xl lg:text-8xl">{hero.title}</h1>
                <p className="mt-5 text-sm font-bold text-zinc-300 sm:text-base">{hero.creator}</p>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">{hero.synopsis}</p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href={streamingItemHref(hero)} className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-black text-black transition hover:bg-[#f0ae2e]">
                    <Play className="h-4 w-4" fill="currentColor" /> OPEN TITLE
                  </Link>
                  <Link href={`/streaming/browse/${hero.group}`} className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.06] px-7 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:border-[#f0ae2e]/45 hover:bg-[#f0ae2e]/10">
                    MORE {streamingGroupLabel(hero.group)}
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="flex min-h-[64vh] items-center justify-center px-6 pt-16 text-center">
            <div className="max-w-xl">
              <Sparkles className="mx-auto h-10 w-10 text-zinc-700" />
              <h1 className="mt-5 text-3xl font-black">Streaming is connected, but the catalog is empty.</h1>
              <p className="mt-3 text-sm leading-6 text-zinc-500">Published Press Start releases will appear here automatically.</p>
            </div>
          </section>
        )}

        <div className="mx-auto max-w-[1680px] px-5 pb-24 sm:px-8">
          <section className="mb-12 rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-7">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <div className="text-[10px] font-black tracking-[0.2em] text-[#f0ae2e]">CREATE · LEARN · EARN</div>
                <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">One ecosystem. Every kind of creator release.</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">Films, music, HOP experiences, comics, visual novels, creator channels, and community work all flow into the same Press Start destination.</p>
              </div>
              <form onSubmit={submitSearch} className="relative w-full lg:w-[360px]">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search Press Start…"
                  className="h-12 w-full rounded-full border border-white/10 bg-black/45 pl-11 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-[#f0ae2e]/60"
                />
              </form>
            </div>
          </section>

          <RailRow title="Watch" items={rails.watch} wide href="/streaming/browse/watch" />
          <RailRow title="Listen" items={rails.listen} wide href="/streaming/browse/listen" />
          <RailRow title="Experience" items={rails.experience} href="/streaming/browse/experience" />
          <RailRow title="Read" items={rails.read} href="/streaming/browse/read" />
          <RailRow title="From the Creator Community" items={rails.community} href="/streaming/browse/community" />

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-7 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-700">
            <span>Master catalog</span>
            <span>·</span>
            <span>{items.length} releases</span>
            <span>·</span>
            <span style={{ color: catalog.data?.sources.live ? GOLD : undefined }}>{catalog.data?.sources.live ? "Live media connected" : "Live media unavailable"}</span>
            <span>·</span>
            <Link href="/community" className="inline-flex items-center gap-1 hover:text-white"><Library className="h-3 w-3" /> Creator library</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
