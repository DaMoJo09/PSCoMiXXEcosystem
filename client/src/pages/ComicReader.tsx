import { Layout } from "@/components/layout/Layout";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Heart, User, BookOpen, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";

interface PanelContentItem {
  id?: string;
  type: "image" | "text" | "bubble" | "drawing" | "shape" | "video" | "gif" | "audio";
  data?: {
    url?: string;
    text?: string;
    drawingData?: string;
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
    bubbleStyle?: string;
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    backgroundColor?: string;
    padding?: number;
    borderRadius?: number;
    src?: string;
  };
  src?: string;
  text?: string;
  transform?: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
    flipX?: boolean;
    flipY?: boolean;
  };
  zIndex?: number;
  [key: string]: any;
}

interface Panel {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  type?: string;
  contents?: PanelContentItem[];
  content?: PanelContentItem[];
  zIndex?: number;
  locked?: boolean;
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
    comicMeta?: {
      genre?: string;
      description?: string;
    };
  };
  creatorName: string;
  creatorAvatar: string;
  userId: string;
  createdAt: string;
}

export default function ComicReader() {
  const [match, params] = useRoute("/community/read/:id");
  const [liked, setLiked] = useState(false);
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"scroll" | "page">("scroll");

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

  const spreads = useMemo(() => comic?.data?.spreads || [], [comic]);

  const goToSpread = (index: number) => {
    if (index >= 0 && index < spreads.length) {
      setCurrentSpreadIndex(index);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
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
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex border border-zinc-700 overflow-hidden">
                <button
                  onClick={() => setViewMode("scroll")}
                  className={`px-3 py-1 text-xs font-bold transition-colors ${viewMode === "scroll" ? "bg-cyan-500 text-black" : "text-zinc-400 hover:text-white"}`}
                  data-testid="button-scroll-mode"
                >
                  Scroll
                </button>
                <button
                  onClick={() => setViewMode("page")}
                  className={`px-3 py-1 text-xs font-bold transition-colors ${viewMode === "page" ? "bg-cyan-500 text-black" : "text-zinc-400 hover:text-white"}`}
                  data-testid="button-page-mode"
                >
                  Page
                </button>
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
        </div>

        <div className="pt-20 pb-16 px-4 max-w-4xl mx-auto">
          {comic.data?.coverFront && (
            <div className="mb-8 overflow-hidden border-2 border-zinc-800" data-testid="img-cover-front">
              <img src={comic.data.coverFront} alt="Front Cover" className="w-full object-contain" />
            </div>
          )}

          {viewMode === "scroll" ? (
            spreads.map((spread, index) => (
              <SpreadRenderer key={spread.id} spread={spread} index={index} />
            ))
          ) : (
            <>
              {spreads.length > 0 && (
                <SpreadRenderer spread={spreads[currentSpreadIndex]} index={currentSpreadIndex} />
              )}
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={() => goToSpread(currentSpreadIndex - 1)}
                  disabled={currentSpreadIndex === 0}
                  className="px-4 py-2 border-2 border-zinc-700 text-zinc-400 hover:text-white hover:border-cyan-500 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-sm flex items-center gap-1 transition-colors"
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <span className="text-zinc-400 text-sm font-bold" data-testid="text-page-indicator">
                  {currentSpreadIndex + 1} / {spreads.length}
                </span>
                <button
                  onClick={() => goToSpread(currentSpreadIndex + 1)}
                  disabled={currentSpreadIndex >= spreads.length - 1}
                  className="px-4 py-2 border-2 border-zinc-700 text-zinc-400 hover:text-white hover:border-cyan-500 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-sm flex items-center gap-1 transition-colors"
                  data-testid="button-next-page"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

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

function SpreadRenderer({ spread, index }: { spread: Spread; index: number }) {
  return (
    <div className="mb-10" data-testid={`spread-section-${index}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bg-zinc-800" />
        <span className="text-zinc-600 text-xs font-bold uppercase tracking-wider" data-testid={`text-spread-number-${index}`}>
          Page {index + 1}
        </span>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      <div className="flex gap-2">
        <PageRenderer panels={spread.leftPage} side="left" />
        <PageRenderer panels={spread.rightPage} side="right" />
      </div>
    </div>
  );
}

function PageRenderer({ panels, side }: { panels?: Panel[]; side: string }) {
  if (!panels || panels.length === 0) return null;

  return (
    <div className="flex-1 relative bg-zinc-900 border border-zinc-800 min-h-[200px]" data-testid={`page-${side}`}>
      <div className="relative w-full" style={{ paddingBottom: "141.4%" }}>
        {panels.map((panel) => (
          <PanelRenderer key={panel.id} panel={panel} />
        ))}
      </div>
    </div>
  );
}

function PanelRenderer({ panel }: { panel: Panel }) {
  const contentItems = panel.contents || panel.content || [];
  const hasContent = contentItems.length > 0;

  return (
    <div
      className="absolute overflow-hidden"
      style={{
        left: `${panel.x}%`,
        top: `${panel.y}%`,
        width: `${panel.width}%`,
        height: `${panel.height}%`,
        backgroundColor: panel.backgroundColor || "#1a1a2e",
        border: `${panel.borderWidth || 2}px solid ${panel.borderColor || "#444"}`,
        filter: panel.filter || undefined,
        transform: panel.rotation ? `rotate(${panel.rotation}deg)` : undefined,
        zIndex: panel.zIndex || 0,
      }}
      data-testid={`panel-${panel.id}`}
    >
      {hasContent ? (
        <div className="w-full h-full relative">
          {contentItems.map((item, idx) => (
            <ContentRenderer key={item.id || idx} item={item} />
          ))}
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-full h-full bg-zinc-800/50" />
        </div>
      )}
    </div>
  );
}

function ContentRenderer({ item }: { item: PanelContentItem }) {
  const imgSrc = item.data?.url || item.data?.imageUrl || item.data?.src || item.src || "";
  const textContent = item.data?.text || item.text || "";
  const drawingData = item.data?.drawingData || "";

  const transform = item.transform;
  const positionStyle: React.CSSProperties = transform ? {
    position: "absolute",
    left: `${transform.x}%`,
    top: `${transform.y}%`,
    width: `${transform.width}%`,
    height: `${transform.height}%`,
    transform: [
      transform.rotation ? `rotate(${transform.rotation}deg)` : "",
      transform.scaleX !== undefined && transform.scaleX !== 1 ? `scaleX(${transform.flipX ? -transform.scaleX : transform.scaleX})` : (transform.flipX ? "scaleX(-1)" : ""),
      transform.scaleY !== undefined && transform.scaleY !== 1 ? `scaleY(${transform.flipY ? -transform.scaleY : transform.scaleY})` : (transform.flipY ? "scaleY(-1)" : ""),
    ].filter(Boolean).join(" ") || undefined,
    zIndex: item.zIndex || 0,
  } : {
    width: "100%",
    height: "100%",
    zIndex: item.zIndex || 0,
  };

  if ((item.type === "image" || item.type === "gif") && imgSrc) {
    return (
      <img
        src={imgSrc}
        alt=""
        className="object-contain"
        style={{ ...positionStyle, objectFit: "contain" }}
        data-testid={`img-content-${item.id}`}
      />
    );
  }

  if (item.type === "drawing" && drawingData) {
    return (
      <img
        src={drawingData}
        alt=""
        className="object-contain"
        style={{ ...positionStyle, objectFit: "contain" }}
        data-testid={`drawing-content-${item.id}`}
      />
    );
  }

  if (item.type === "text" || item.type === "bubble") {
    const bubbleStyle = item.data?.bubbleStyle || "none";
    const fontSize = item.data?.fontSize || 14;
    const fontFamily = item.data?.fontFamily || "inherit";
    const color = item.data?.color || "#ffffff";
    const bgColor = item.data?.backgroundColor;
    const padding = item.data?.padding || 8;
    const borderRadius = item.data?.borderRadius || 0;

    const bubbleClasses: Record<string, string> = {
      none: "",
      speech: "border-2 border-white rounded-xl",
      thought: "border-2 border-white/60 rounded-full",
      shout: "border-3 border-yellow-400 font-black",
      whisper: "opacity-70 italic",
      caption: "bg-black/80",
    };

    return (
      <div
        className={`flex items-center justify-center overflow-hidden ${bubbleClasses[bubbleStyle] || ""}`}
        style={{
          ...positionStyle,
          fontSize: `${fontSize}px`,
          fontFamily,
          color,
          backgroundColor: bgColor || (bubbleStyle !== "none" ? "rgba(0,0,0,0.7)" : "transparent"),
          padding: `${padding}px`,
          borderRadius: `${borderRadius}px`,
          textAlign: "center",
          wordBreak: "break-word",
        }}
        data-testid={`text-content-${item.id}`}
      >
        {textContent}
      </div>
    );
  }

  return null;
}
