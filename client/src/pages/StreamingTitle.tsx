import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { ArrowLeft, BookOpen, Eye, Film, GitBranch, Layers, Play, UserRound } from "lucide-react";

interface StreamingProject {
  id: string;
  title: string;
  type: string;
  thumbnail?: string | null;
  creatorName?: string | null;
  creatorAvatar?: string | null;
  viewCount?: number;
  createdAt?: string;
  status?: string;
  data?: Record<string, any>;
}

interface LibraryResponse {
  comics: Array<{
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
  }>;
}

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

function playUrl(project: StreamingProject) {
  return project.type === "comic"
    ? `/community/read/${project.id}`
    : `/community/view/${project.id}`;
}

export default function StreamingTitle() {
  const [match, params] = useRoute("/streaming/title/:id");
  const id = params?.id;

  const projectQuery = useQuery<StreamingProject>({
    queryKey: ["ps-streaming", "title", id],
    queryFn: async () => {
      const res = await fetch(`/api/community/comic/${id}`);
      if (!res.ok) throw new Error("Title not found");
      return res.json();
    },
    enabled: !!id,
  });

  const relatedQuery = useQuery<LibraryResponse>({
    queryKey: ["ps-streaming", "related", projectQuery.data?.type],
    queryFn: async () => {
      const query = new URLSearchParams({
        page: "1",
        limit: "12",
        sort: "popular",
        ...(projectQuery.data?.type ? { type: projectQuery.data.type } : {}),
      });
      const res = await fetch(`/api/community/library?${query.toString()}`);
      if (!res.ok) return { comics: [] } as LibraryResponse;
      return res.json();
    },
    enabled: !!projectQuery.data?.type,
  });

  useEffect(() => {
    if (projectQuery.data?.id) {
      fetch(`/api/community/comic/${projectQuery.data.id}/view`, { method: "POST" }).catch(() => {});
    }
  }, [projectQuery.data?.id]);

  if (!match) return null;

  if (projectQuery.isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#050505] text-zinc-500">Loading title…</div>;
  }

  const project = projectQuery.data;
  if (!project || projectQuery.isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#050505] text-white">
        <Film className="h-12 w-12 text-zinc-700" />
        <p className="font-bold text-zinc-400">This title is not available.</p>
        <Link href="/streaming" className="rounded-full border border-white/10 px-5 py-3 text-sm font-bold hover:border-[#f0ae2e]/50">Back to Streaming</Link>
      </div>
    );
  }

  const TypeIcon = typeIcons[project.type] || Film;
  const related = (relatedQuery.data?.comics || []).filter((item) => item.id !== project.id);
  const description =
    project.data?.description ||
    project.data?.synopsis ||
    project.data?.summary ||
    "A creator release from the Press Start ecosystem.";

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <section className="relative min-h-[76vh] overflow-hidden">
        <div className="absolute inset-0">
          {project.thumbnail ? (
            <img src={project.thumbnail} alt="" className="h-full w-full object-cover opacity-55" />
          ) : (
            <div className="h-full w-full bg-[#111]" />
          )}
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
                <TypeIcon className="h-3.5 w-3.5" /> {typeLabels[project.type] || "PRESS START"}
              </span>
              <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[10px] font-bold tracking-[0.13em] text-zinc-400">PS STREAMING</span>
            </div>

            <h1 className="text-5xl font-black leading-[0.9] tracking-[-0.045em] sm:text-6xl lg:text-8xl">{project.title}</h1>

            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-zinc-400">
              <span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4" /> {project.creatorName || "Press Start Creator"}</span>
              {(project.viewCount || 0) > 0 && <span className="inline-flex items-center gap-2"><Eye className="h-4 w-4" /> {project.viewCount} views</span>}
              {project.createdAt && <span>{new Date(project.createdAt).getFullYear()}</span>}
            </div>

            <p className="mt-6 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">{description}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={playUrl(project)} className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-black text-black transition hover:bg-[#f0ae2e]">
                <Play className="h-4 w-4" fill="currentColor" /> {project.type === "comic" ? "READ NOW" : "ENTER THE EXPERIENCE"}
              </Link>
              <Link href="/streaming" className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.06] px-7 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:border-[#f0ae2e]/45 hover:bg-[#f0ae2e]/10">MORE FROM PRESS START</Link>
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mx-auto max-w-[1680px] px-5 pb-24 pt-3 sm:px-8">
          <h2 className="mb-5 text-xl font-black sm:text-2xl">More Like This</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {related.map((item) => (
              <Link key={item.id} href={`/streaming/title/${item.id}`} className="group block w-[190px] shrink-0 sm:w-[220px]">
                <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#101010] transition group-hover:-translate-y-1 group-hover:border-[#f0ae2e]/45">
                  <div className="aspect-[3/4] bg-[#171717]">
                    {item.thumbnail ? <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Film className="h-10 w-10 text-zinc-700" /></div>}
                  </div>
                  <div className="border-t border-white/[0.07] p-3">
                    <h3 className="truncate text-sm font-bold">{item.title}</h3>
                    <p className="mt-1 truncate text-xs text-zinc-500">{item.creatorName}</p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
