import { Layout } from "@/components/layout/Layout";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Heart, User, BookOpen, Eye } from "lucide-react";
import { useState } from "react";

interface PanelContentItem {
  type: "image" | "text" | "bubble";
  src?: string;
  text?: string;
  [key: string]: any;
}

interface Panel {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: PanelContentItem[];
  borderColor?: string;
  borderWidth?: number;
  backgroundColor?: string;
  filter?: string;
}

interface Spread {
  id: string;
  leftPage: Panel[];
  rightPage: Panel[];
}

interface ComicData {
  id: string;
  title: string;
  thumbnail: string;
  data: {
    spreads: Spread[];
    coverFront?: string;
    coverBack?: string;
  };
  creatorName: string;
  creatorAvatar: string;
  userId: string;
  createdAt: string;
}

export default function ComicReader() {
  const [match, params] = useRoute("/community/read/:id");
  const [liked, setLiked] = useState(false);

  const { data: comic, isLoading, isError } = useQuery<ComicData>({
    queryKey: ["community-comic", params?.id],
    queryFn: async () => {
      const res = await fetch(`/api/community/comic/${params?.id}`);
      if (!res.ok) throw new Error("Comic not found");
      return res.json();
    },
    enabled: !!params?.id,
  });

  const handleLike = async () => {
    if (!params?.id) return;
    setLiked(!liked);
    try {
      await fetch(`/api/community/comic/${params.id}/like`, { method: "POST", credentials: "include" });
    } catch {}
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center" data-testid="loading-spinner">
          <div className="animate-spin h-12 w-12 border-t-2 border-b-2 border-cyan-500" />
        </div>
      </Layout>
    );
  }

  if (isError || !comic) {
    return (
      <Layout>
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4" data-testid="error-state">
          <BookOpen className="w-16 h-16 text-zinc-600" />
          <h2 className="text-xl font-bold text-zinc-300" data-testid="text-error">Comic not found</h2>
          <Link href="/community" data-testid="link-back-community">
            <span className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
              Back to Community
            </span>
          </Link>
        </div>
      </Layout>
    );
  }

  const spreads = comic.data?.spreads || [];

  return (
    <Layout>
      <div className="min-h-screen bg-zinc-950">
        <div className="fixed top-0 left-0 right-0 z-40 bg-zinc-900/95 backdrop-blur-sm border-b-2 border-cyan-500" style={{ paddingLeft: "3rem" }}>
          <div className="max-w-4xl mx-auto flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-3">
              <Link href="/community" data-testid="link-back">
                <span className="text-zinc-400 hover:text-white transition-colors cursor-pointer">
                  <ArrowLeft className="w-5 h-5" />
                </span>
              </Link>
              <div>
                <h1 className="text-white font-bold text-sm truncate max-w-[200px] sm:max-w-none" data-testid="text-comic-title">{comic.title}</h1>
                <p className="text-zinc-400 text-xs" data-testid="text-creator-name">by {comic.creatorName}</p>
              </div>
            </div>
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-3 py-1.5 border-2 text-sm font-bold transition-colors ${
                liked ? "bg-pink-500/20 text-pink-400 border-pink-500" : "border-zinc-700 text-zinc-400 hover:text-pink-400 hover:border-pink-500"
              }`}
              data-testid="button-like"
            >
              <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
              <span>{liked ? "Liked" : "Like"}</span>
            </button>
          </div>
        </div>

        <div className="pt-20 pb-16 px-4 max-w-4xl mx-auto">
          {comic.data?.coverFront && (
            <div className="mb-8 overflow-hidden border-2 border-zinc-800" data-testid="img-cover-front">
              <img src={comic.data.coverFront} alt="Front Cover" className="w-full object-contain" />
            </div>
          )}

          {spreads.map((spread, index) => (
            <div key={spread.id} className="mb-10" data-testid={`spread-section-${index}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-zinc-800" />
                <span className="text-zinc-600 text-xs font-bold uppercase tracking-wider" data-testid={`text-spread-number-${index}`}>
                  Spread {index + 1}
                </span>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>

              <div className="flex gap-2">
                <div className="flex-1 flex flex-wrap gap-2">
                  {spread.leftPage?.map((panel) => (
                    <PanelRenderer key={panel.id} panel={panel} />
                  ))}
                </div>
                <div className="flex-1 flex flex-wrap gap-2">
                  {spread.rightPage?.map((panel) => (
                    <PanelRenderer key={panel.id} panel={panel} />
                  ))}
                </div>
              </div>
            </div>
          ))}

          {comic.data?.coverBack && (
            <div className="mb-8 overflow-hidden border-2 border-zinc-800" data-testid="img-cover-back">
              <img src={comic.data.coverBack} alt="Back Cover" className="w-full object-contain" />
            </div>
          )}

          <div className="mt-12 p-6 bg-zinc-900 border-2 border-zinc-800" data-testid="card-creator-info">
            <div className="flex items-center gap-4">
              {comic.creatorAvatar ? (
                <img
                  src={comic.creatorAvatar}
                  alt={comic.creatorName}
                  className="w-14 h-14 rounded-full object-cover border-2 border-zinc-700"
                  data-testid="img-creator-avatar"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center border-2 border-zinc-700">
                  <User className="w-6 h-6 text-zinc-500" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-white font-bold" data-testid="text-creator-card-name">{comic.creatorName}</p>
                <p className="text-zinc-400 text-sm">Comic Creator</p>
              </div>
              <Link href={`/portfolio/${comic.userId}`} data-testid="link-view-portfolio">
                <span className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer">
                  <Eye className="w-4 h-4" />
                  View Portfolio
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function PanelRenderer({ panel }: { panel: Panel }) {
  const hasContent = panel.content && panel.content.length > 0;
  const hasImage = hasContent && panel.content.some((c) => c.type === "image" && c.src);

  return (
    <div
      className="overflow-hidden min-h-[120px] flex-1 min-w-[45%]"
      style={{
        backgroundColor: panel.backgroundColor || "#1a1a2e",
        border: `${panel.borderWidth || 2}px solid ${panel.borderColor || "#333"}`,
        filter: panel.filter || undefined,
      }}
      data-testid={`panel-${panel.id}`}
    >
      {hasContent ? (
        <div className="w-full h-full">
          {panel.content.map((item, idx) => {
            if (item.type === "image" && item.src) {
              return (
                <img
                  key={idx}
                  src={item.src}
                  alt=""
                  className="w-full h-auto object-contain"
                  data-testid={`img-panel-content-${panel.id}-${idx}`}
                />
              );
            }
            if (item.type === "text" || item.type === "bubble") {
              return (
                <div
                  key={idx}
                  className="p-3 text-white text-sm"
                  data-testid={`text-panel-content-${panel.id}-${idx}`}
                >
                  {item.text || ""}
                </div>
              );
            }
            return null;
          })}
        </div>
      ) : (
        <div className="w-full h-full min-h-[120px] flex items-center justify-center">
          <BookOpen className="w-8 h-8 text-zinc-700" />
        </div>
      )}
    </div>
  );
}
