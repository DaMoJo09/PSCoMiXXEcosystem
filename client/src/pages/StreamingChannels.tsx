import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, BadgeCheck, Radio, Users } from "lucide-react";

interface PublishChannel {
  id: string;
  ownerId: string;
  ownerType: string;
  name: string;
  slug: string;
  description: string | null;
  avatar: string | null;
  banner: string | null;
  subscriberCount: number;
  verified?: boolean;
  monetizationEnabled?: boolean;
}

interface Series {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  creatorName: string;
  creatorAvatar: string | null;
  comicCount: number;
  subscriberCount?: number;
}

export default function StreamingChannels() {
  const publishChannels = useQuery<PublishChannel[]>({
    queryKey: ["ps-streaming", "publish-channels"],
    queryFn: async () => {
      const res = await fetch("/api/ecosystem/channels");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const series = useQuery<Series[]>({
    queryKey: ["ps-streaming", "series-channels"],
    queryFn: async () => {
      const res = await fetch("/api/community/series");
      if (!res.ok) return [];
      return res.json();
    },
  });

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1680px] items-center gap-4 px-5 sm:px-8">
          <Link href="/streaming" className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-zinc-400 transition hover:border-[#f0ae2e]/45 hover:text-white"><ArrowLeft className="h-4 w-4" /></Link>
          <div><div className="text-[10px] font-black tracking-[0.2em] text-[#f0ae2e]">PRESS START STREAMING</div><div className="text-sm font-black">CHANNELS</div></div>
        </div>
      </header>

      <main className="mx-auto max-w-[1680px] px-5 py-10 sm:px-8">
        <h1 className="text-4xl font-black tracking-[-0.035em] sm:text-5xl">Channels</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-500 sm:text-base">The master channel directory combines PSCoMiXX publishing channels with creator series. One audience layer, one ecosystem connection.</p>

        {(publishChannels.data || []).length > 0 && (
          <section className="mt-10">
            <div className="mb-5 flex items-end justify-between"><h2 className="text-2xl font-black">Publishing Channels</h2><span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">PSCoMiXX native</span></div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {(publishChannels.data || []).map(channel => (
                <article key={channel.id} className="overflow-hidden rounded-3xl border border-white/10 bg-[#101010] transition hover:border-[#f0ae2e]/45">
                  <div className="relative aspect-[16/7] bg-[#171717]">
                    {channel.banner ? <img src={channel.banner} alt="" className="h-full w-full object-cover" /> : <div className="h-full bg-gradient-to-br from-[#171717] to-[#0b0b0b]" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#101010] via-transparent to-transparent" />
                    <div className="absolute -bottom-7 left-5 h-16 w-16 overflow-hidden rounded-2xl border-4 border-[#101010] bg-[#202020]">
                      {channel.avatar ? <img src={channel.avatar} alt={channel.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Radio className="h-6 w-6 text-[#f0ae2e]" /></div>}
                    </div>
                  </div>
                  <div className="p-5 pt-10">
                    <div className="flex items-center gap-2"><h3 className="truncate text-xl font-black">{channel.name}</h3>{channel.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-[#f0ae2e]" />}</div>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.15em] text-zinc-600">{channel.ownerType} channel</p>
                    {channel.description && <p className="mt-4 line-clamp-2 text-sm leading-6 text-zinc-400">{channel.description}</p>}
                    <div className="mt-5 flex items-center gap-2 text-xs text-zinc-500"><Users className="h-4 w-4" />{channel.subscriberCount || 0} subscribers</div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {(series.data || []).length > 0 && (
          <section className="mt-12">
            <div className="mb-5 flex items-end justify-between"><h2 className="text-2xl font-black">Creator Series</h2><span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">Series channels</span></div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {(series.data || []).map(s => (
                <Link key={s.id} href={`/community/series/${s.id}`} className="group overflow-hidden rounded-3xl border border-white/10 bg-[#101010] transition hover:border-[#f0ae2e]/45">
                  <div className="aspect-video bg-[#171717]">{s.coverImage ? <img src={s.coverImage} alt={s.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" /> : <div className="flex h-full items-center justify-center"><Users className="h-10 w-10 text-zinc-700" /></div>}</div>
                  <div className="p-5"><div className="text-[10px] font-black tracking-[0.18em] text-[#f0ae2e]">SERIES</div><h3 className="mt-2 truncate text-xl font-black">{s.title}</h3><p className="mt-2 text-sm text-zinc-500">{s.creatorName} · {s.comicCount} releases</p>{s.description && <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-400">{s.description}</p>}</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!publishChannels.isLoading && !series.isLoading && !(publishChannels.data || []).length && !(series.data || []).length && <div className="mt-10 rounded-3xl border border-dashed border-white/10 p-12 text-center text-zinc-600">No public channels yet.</div>}
      </main>
    </div>
  );
}
