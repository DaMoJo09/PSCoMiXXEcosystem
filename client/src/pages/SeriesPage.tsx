import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { BookOpen, ChevronRight, ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SeriesComic {
  id: string;
  title: string;
  thumbnail: string | null;
  status: string;
  seriesOrder: number | null;
  creatorName?: string;
  creatorAvatar?: string | null;
  data?: any;
}

interface SeriesDetail {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  createdAt: string;
  updatedAt: string;
  comics: SeriesComic[];
}

export default function SeriesPage() {
  const { id } = useParams<{ id: string }>();

  const { data: series, isLoading, isError } = useQuery<SeriesDetail>({
    queryKey: ["community-series", id],
    queryFn: async () => {
      const res = await fetch(`/api/community/series/${id}`);
      if (!res.ok) throw new Error("Failed to load series");
      return res.json();
    },
    enabled: !!id,
  });

  const comics = series?.comics ?? [];

  return (
    <Layout>
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="bg-zinc-900 border-b-2 border-cyan-500 py-8 sm:py-12 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <Link href="/community">
              <button className="flex items-center gap-2 text-zinc-400 hover:text-cyan-400 text-sm font-bold mb-6 transition-colors" data-testid="btn-back-community">
                <ArrowLeft className="w-4 h-4" /> BACK TO COMMUNITY
              </button>
            </Link>

            <div className="flex items-start gap-6">
              {series?.coverImage ? (
                <img
                  src={series.coverImage}
                  alt={series.title}
                  className="w-24 h-32 sm:w-32 sm:h-44 object-cover border-2 border-zinc-700 flex-shrink-0"
                  data-testid="img-series-cover"
                />
              ) : (
                <div className="w-24 h-32 sm:w-32 sm:h-44 bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-10 h-10 text-zinc-600" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-cyan-400 tracking-wider mb-1" data-testid="text-series-label">SERIES</p>
                <h1
                  className="text-2xl sm:text-4xl font-black tracking-tight mb-2"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  data-testid="text-series-title"
                >
                  {isLoading ? "Loading..." : series?.title ?? "Series Not Found"}
                </h1>
                {series?.description && (
                  <p className="text-zinc-400 text-sm sm:text-base mb-3" data-testid="text-series-description">
                    {series.description}
                  </p>
                )}
                <p className="text-zinc-500 text-xs font-bold" data-testid="text-series-count">
                  {comics.length} CHAPTER{comics.length !== 1 ? "S" : ""}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          {isError ? (
            <div className="text-center py-20 border-2 border-dashed border-red-800/50" data-testid="error-state">
              <BookOpen className="w-16 h-16 mx-auto text-red-700 mb-4" />
              <p className="text-red-400 text-lg font-bold mb-2">Failed to load series</p>
              <p className="text-zinc-600">Please try again later.</p>
            </div>
          ) : isLoading ? (
            <div className="space-y-4" data-testid="skeleton-list">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse flex gap-4 p-4 border-2 border-zinc-800">
                  <div className="w-20 h-28 bg-zinc-800 flex-shrink-0" />
                  <div className="flex-1 space-y-3 py-2">
                    <div className="h-5 bg-zinc-800 w-3/4" />
                    <div className="h-3 bg-zinc-800 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : comics.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-zinc-800" data-testid="empty-state">
              <BookOpen className="w-16 h-16 mx-auto text-zinc-700 mb-4" />
              <p className="text-zinc-400 text-lg font-bold mb-2">No chapters yet</p>
              <p className="text-zinc-600">This series doesn't have any published comics.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {comics
                .sort((a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0))
                .map((comic, index) => {
                  const pageCount = (comic.data as any)?.spreads?.length || 0;
                  return (
                    <Link
                      key={comic.id}
                      href={`/community/read/${comic.id}`}
                      data-testid={`series-chapter-${comic.id}`}
                    >
                      <div className="group flex items-center gap-4 p-4 border-2 border-zinc-800 bg-zinc-900 hover:border-cyan-500 transition-all cursor-pointer hover:shadow-lg hover:shadow-cyan-500/10">
                        <span className="text-zinc-600 text-sm font-bold w-8 text-center flex-shrink-0">
                          {index + 1}
                        </span>

                        <div className="w-16 h-22 sm:w-20 sm:h-28 relative overflow-hidden flex-shrink-0">
                          {comic.thumbnail ? (
                            <img
                              src={comic.thumbnail}
                              alt={comic.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                              <BookOpen className="w-6 h-6 text-zinc-700" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3
                            className="font-bold text-white text-sm sm:text-base truncate group-hover:text-cyan-400 transition-colors"
                            data-testid={`text-chapter-title-${comic.id}`}
                          >
                            {comic.title}
                          </h3>
                          {pageCount > 0 && (
                            <p className="text-zinc-500 text-xs mt-1">{pageCount} pages</p>
                          )}
                        </div>

                        <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
                      </div>
                    </Link>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
