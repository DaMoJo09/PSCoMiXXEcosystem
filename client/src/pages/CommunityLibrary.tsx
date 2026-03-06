import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Link } from "wouter";
import { Search, BookOpen, Users, ChevronLeft, ChevronRight } from "lucide-react";

interface CommunityComic {
  id: string;
  title: string;
  thumbnail: string | null;
  creatorName: string;
  creatorAvatar: string | null;
  pageCount: number;
  status: string;
  createdAt: string;
  userId: string;
}

interface CommunityLibraryResponse {
  comics: CommunityComic[];
  total: number;
  page: number;
  totalPages: number;
}

export default function CommunityLibrary() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "popular">("newest");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isError } = useQuery<CommunityLibraryResponse>({
    queryKey: ["community-library", search, sort, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        search,
        sort,
        page: String(page),
        limit: String(limit),
      });
      const res = await fetch(`/api/community/library?${params}`);
      if (!res.ok) throw new Error("Failed to load community library");
      return res.json();
    },
  });

  const comics = data?.comics ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <Layout>
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="bg-zinc-900 border-b-2 border-cyan-500 py-12 px-6">
          <div className="max-w-7xl mx-auto text-center">
            <h1
              className="text-4xl md:text-5xl font-black tracking-tight mb-3"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              data-testid="text-community-library-title"
            >
              COMMUNITY LIBRARY
            </h1>
            <p className="text-zinc-400 text-lg mb-8" data-testid="text-community-subtitle">
              Discover comics from creators around the world
            </p>
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search comics..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-12 pr-4 py-3 bg-zinc-950 border-2 border-zinc-700 text-white placeholder-zinc-500 focus:border-cyan-500 outline-none font-bold text-sm"
                data-testid="input-community-search"
              />
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-8">
            <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Sort by:</span>
            <button
              onClick={() => { setSort("newest"); setPage(1); }}
              className={`px-4 py-2 text-xs font-bold border-2 transition-colors ${
                sort === "newest"
                  ? "bg-cyan-500 text-black border-cyan-500"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
              data-testid="btn-sort-newest"
            >
              NEWEST
            </button>
            <button
              onClick={() => { setSort("popular"); setPage(1); }}
              className={`px-4 py-2 text-xs font-bold border-2 transition-colors ${
                sort === "popular"
                  ? "bg-cyan-500 text-black border-cyan-500"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
              data-testid="btn-sort-popular"
            >
              POPULAR
            </button>
          </div>

          {isError ? (
            <div className="text-center py-24 border-2 border-dashed border-red-800/50" data-testid="error-state">
              <BookOpen className="w-16 h-16 mx-auto text-red-700 mb-4" />
              <p className="text-red-400 text-lg font-bold mb-2">Failed to load comics</p>
              <p className="text-zinc-600">Please try again later.</p>
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-testid="skeleton-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[2/3] bg-zinc-800 mb-3" />
                  <div className="h-4 bg-zinc-800 w-3/4 mb-2" />
                  <div className="h-3 bg-zinc-800 w-1/2" />
                </div>
              ))}
            </div>
          ) : comics.length === 0 ? (
            <div className="text-center py-24 border-2 border-dashed border-zinc-800" data-testid="empty-state">
              <BookOpen className="w-16 h-16 mx-auto text-zinc-700 mb-4" />
              <p className="text-zinc-400 text-lg font-bold mb-2">No comics published yet.</p>
              <p className="text-zinc-600">Be the first to publish!</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-testid="comics-grid">
                {comics.map((comic) => (
                  <Link
                    key={comic.id}
                    href={`/community/read/${comic.id}`}
                    data-testid={`card-comic-${comic.id}`}
                  >
                    <div className="group border-2 border-zinc-800 bg-zinc-900 hover:border-cyan-500 transition-all cursor-pointer hover:shadow-lg hover:shadow-cyan-500/10">
                      <div className="aspect-[2/3] relative overflow-hidden">
                        {comic.thumbnail ? (
                          <img
                            src={comic.thumbnail}
                            alt={comic.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            data-testid={`img-thumbnail-${comic.id}`}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-cyan-900/30 via-zinc-900 to-purple-900/30 flex items-center justify-center">
                            <BookOpen className="w-12 h-12 text-zinc-700" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <span className="px-2 py-1 text-xs font-bold bg-black/80 border border-zinc-600 text-zinc-300">
                            {comic.pageCount} pg
                          </span>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      <div className="p-3 border-t border-zinc-800">
                        <h3
                          className="font-bold text-white text-sm truncate mb-2"
                          data-testid={`text-comic-title-${comic.id}`}
                        >
                          {comic.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          {comic.creatorAvatar ? (
                            <img
                              src={comic.creatorAvatar}
                              alt={comic.creatorName}
                              className="w-5 h-5 rounded-full object-cover border border-zinc-700"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center">
                              <Users className="w-3 h-3 text-zinc-500" />
                            </div>
                          )}
                          <span
                            className="text-zinc-400 text-xs truncate"
                            data-testid={`text-creator-${comic.id}`}
                          >
                            {comic.creatorName}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10" data-testid="pagination">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-2 border-2 border-zinc-700 text-zinc-400 hover:border-cyan-500 hover:text-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    data-testid="btn-page-prev"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1];
                      const showEllipsis = prev !== undefined && p - prev > 1;
                      return (
                        <span key={p} className="flex items-center gap-2">
                          {showEllipsis && <span className="text-zinc-600 px-1">…</span>}
                          <button
                            onClick={() => setPage(p)}
                            className={`w-9 h-9 text-xs font-bold border-2 transition-colors ${
                              p === page
                                ? "bg-cyan-500 text-black border-cyan-500"
                                : "border-zinc-700 text-zinc-400 hover:border-cyan-500"
                            }`}
                            data-testid={`btn-page-${p}`}
                          >
                            {p}
                          </button>
                        </span>
                      );
                    })}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-2 border-2 border-zinc-700 text-zinc-400 hover:border-cyan-500 hover:text-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    data-testid="btn-page-next"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
