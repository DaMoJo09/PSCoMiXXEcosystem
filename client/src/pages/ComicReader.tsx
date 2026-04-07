import { Layout } from "@/components/layout/Layout";
import { useRoute, useSearch, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Heart, User, BookOpen, Eye, ChevronLeft, ChevronRight, Bookmark, BookmarkCheck, MessageCircle, Send, Trash2, UserPlus, UserCheck, Clock } from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";

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
    audioName?: string;
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
    bubbleStyle?: string;
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    backgroundColor?: string;
    padding?: number;
    borderRadius?: number;
    src?: string;
    textEffect?: string;
    strokeColor?: string;
    strokeWidth?: number;
    shadowColor?: string;
    shadowBlur?: number;
    fontWeight?: string;
    fontStyle?: string;
    textAlign?: string;
    textTransform?: string;
    letterSpacing?: number;
    lineHeight?: number;
    textArch?: number;
    filter?: string;
    filterOverlay?: string;
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
  locked?: boolean;
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
      frontCover?: string;
      backCover?: string;
      genre?: string;
      description?: string;
      credits?: string;
    };
  };
  creatorName: string;
  creatorAvatar: string;
  userId: string;
  createdAt: string;
  viewCount?: number;
  seriesId?: string;
  seriesOrder?: number;
}

interface Comment {
  id: string;
  comicId: string;
  authorId: string;
  text: string;
  parentId?: string;
  createdAt: string;
  authorName: string;
  authorAvatar?: string;
}

interface SeriesData {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  comics: Array<{
    id: string;
    title: string;
    thumbnail?: string;
    seriesOrder?: number;
  }>;
}

export default function ComicReader({ isPreview = false }: { isPreview?: boolean; params?: any } = {}) {
  const [match, params] = useRoute("/community/read/:id");
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const previewId = searchParams.get("id");
  const comicId = isPreview ? previewId : params?.id;
  const [liked, setLiked] = useState(false);
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"scroll" | "page">("scroll");
  const [commentText, setCommentText] = useState("");
  const viewTracked = useRef(false);
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: comic, isLoading, isError } = useQuery<ComicData>({
    queryKey: [isPreview ? "preview-comic" : "community-comic", comicId],
    queryFn: async () => {
      if (isPreview) {
        const res = await fetch(`/api/projects/${comicId}/preview`, { credentials: "include" });
        if (!res.ok) throw new Error("Comic not found");
        const data = await res.json();
        return {
          id: data.id,
          title: data.title,
          thumbnail: data.thumbnail || "",
          data: data.data,
          creatorName: data.creator?.name || "You",
          creatorAvatar: data.creator?.avatar || "",
          userId: data.userId,
          createdAt: data.createdAt,
        } as ComicData;
      }
      const res = await fetch(`/api/community/comic/${comicId}`);
      if (!res.ok) throw new Error("Comic not found");
      return res.json();
    },
    enabled: !!comicId,
  });

  useEffect(() => {
    if (comicId && !viewTracked.current && !isPreview) {
      viewTracked.current = true;
      fetch(`/api/community/comic/${comicId}/view`, { method: "POST", credentials: "include" }).catch(() => {});
    }
  }, [comicId, isPreview]);

  const { data: comments, isLoading: commentsLoading } = useQuery<{ comments: Comment[]; total: number }>({
    queryKey: ["comic-comments", comicId],
    queryFn: async () => {
      const res = await fetch(`/api/community/comic/${comicId}/comments`);
      if (!res.ok) throw new Error("Failed to load comments");
      return res.json();
    },
    enabled: !!comicId && !isPreview,
  });

  const { data: bookmark } = useQuery<any>({
    queryKey: ["bookmark", comicId],
    queryFn: async () => {
      const res = await fetch(`/api/bookmarks/${comicId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!comicId && isAuthenticated && !isPreview,
  });

  const { data: isFollowingData } = useQuery<{ isFollowing: boolean }>({
    queryKey: ["is-following", comic?.userId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${comic?.userId}/is-following`, { credentials: "include" });
      if (!res.ok) return { isFollowing: false };
      return res.json();
    },
    enabled: !!comic?.userId && isAuthenticated && comic?.userId !== user?.id,
  });

  const { data: seriesData } = useQuery<SeriesData>({
    queryKey: ["community-series", comic?.seriesId],
    queryFn: async () => {
      const res = await fetch(`/api/community/series/${comic?.seriesId}`);
      if (!res.ok) throw new Error("Series not found");
      return res.json();
    },
    enabled: !!comic?.seriesId,
  });

  useEffect(() => {
    if (bookmark?.lastSpreadIndex && bookmark.lastSpreadIndex > 0 && viewMode === "page") {
      setCurrentSpreadIndex(bookmark.lastSpreadIndex);
    }
  }, [bookmark]);

  const addCommentMutation = useMutation({
    mutationFn: async (text: string) => {
      await apiRequest("POST", `/api/community/comic/${comicId}/comments`, { text });
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["comic-comments", comicId] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await apiRequest("DELETE", `/api/community/comic/${comicId}/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comic-comments", comicId] });
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (bookmark) {
        await apiRequest("DELETE", `/api/bookmarks/${comicId}`);
      } else {
        await apiRequest("POST", "/api/bookmarks", { projectId: comicId, lastSpreadIndex: currentSpreadIndex });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmark", comicId] });
    },
  });

  const saveProgressMutation = useMutation({
    mutationFn: async (spreadIndex: number) => {
      await apiRequest("POST", "/api/bookmarks", { projectId: comicId, lastSpreadIndex: spreadIndex });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmark", comicId] });
    },
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowingData?.isFollowing) {
        await apiRequest("DELETE", `/api/users/${comic?.userId}/follow`);
      } else {
        await apiRequest("POST", `/api/users/${comic?.userId}/follow`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["is-following", comic?.userId] });
    },
  });

  const handleLike = async () => {
    if (!comicId || isPreview) return;
    setLiked(!liked);
    try {
      await fetch(`/api/community/comic/${comicId}/like`, { method: "POST", credentials: "include" });
    } catch {}
  };

  const spreads = useMemo(() => comic?.data?.spreads || [], [comic]);

  const allPages = useMemo(() => {
    const pages: { panels: Panel[]; spreadIndex: number }[] = [];
    spreads.forEach((spread, si) => {
      if (spread.leftPage && spread.leftPage.length > 0) {
        pages.push({ panels: spread.leftPage, spreadIndex: si });
      }
      if (spread.rightPage && spread.rightPage.length > 0) {
        pages.push({ panels: spread.rightPage, spreadIndex: si });
      }
    });
    return pages;
  }, [spreads]);

  const goToSpread = (index: number) => {
    if (index >= 0 && index < allPages.length) {
      setCurrentSpreadIndex(index);
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (isAuthenticated && bookmark) {
        saveProgressMutation.mutate(index);
      }
    }
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim()) {
      addCommentMutation.mutate(commentText.trim());
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString();
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
              {isPreview ? (
                <button onClick={() => window.close()} className="text-zinc-400 hover:text-white transition-colors cursor-pointer" data-testid="link-back">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              ) : (
                <Link href="/community" data-testid="link-back">
                  <span className="text-zinc-400 hover:text-white transition-colors cursor-pointer">
                    <ArrowLeft className="w-5 h-5" />
                  </span>
                </Link>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-white font-bold text-sm truncate max-w-[200px] sm:max-w-none" data-testid="text-comic-title">{comic.title}</h1>
                  {isPreview && (
                    <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 text-[10px] font-bold uppercase tracking-wider" data-testid="badge-preview">Preview</span>
                  )}
                </div>
                <p className="text-zinc-400 text-xs" data-testid="text-creator-name">by {comic.creatorName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 text-zinc-500 text-xs mr-2">
                <Eye className="w-3.5 h-3.5" />
                <span data-testid="text-view-count">{comic.viewCount || 0}</span>
              </div>
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
              {isAuthenticated && (
                <button
                  onClick={() => bookmarkMutation.mutate()}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border-2 text-sm font-bold transition-colors ${
                    bookmark ? "bg-yellow-500/20 text-yellow-400 border-yellow-500" : "border-zinc-700 text-zinc-400 hover:text-yellow-400 hover:border-yellow-500"
                  }`}
                  data-testid="button-bookmark"
                >
                  {bookmark ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                </button>
              )}
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
          {bookmark && bookmark.lastSpreadIndex > 0 && viewMode === "page" && currentSpreadIndex === 0 && (
            <div className="mb-6 p-4 bg-cyan-500/10 border-2 border-cyan-500/30 flex items-center justify-between" data-testid="continue-reading-banner">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-cyan-400" />
                <span className="text-cyan-300 text-sm font-bold">Continue where you left off (Page {bookmark.lastSpreadIndex + 1})</span>
              </div>
              <button
                onClick={() => goToSpread(bookmark.lastSpreadIndex)}
                className="px-4 py-1.5 bg-cyan-500 text-black text-sm font-bold hover:bg-cyan-400 transition-colors"
                data-testid="button-continue-reading"
              >
                Continue Reading
              </button>
            </div>
          )}

          {seriesData && (
            <div className="mb-6 p-4 bg-zinc-900 border-2 border-zinc-800" data-testid="series-info-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold text-sm">
                  Part of series: <span className="text-cyan-400">{seriesData.title}</span>
                </h3>
                <Link href={`/community/series/${seriesData.id}`} data-testid="link-view-series">
                  <span className="text-cyan-400 hover:text-cyan-300 text-xs font-bold cursor-pointer">View Series</span>
                </Link>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {seriesData.comics
                  .sort((a, b) => (a.seriesOrder || 0) - (b.seriesOrder || 0))
                  .map((seriesComic) => (
                    <Link key={seriesComic.id} href={`/community/read/${seriesComic.id}`} data-testid={`link-series-comic-${seriesComic.id}`}>
                      <div
                        className={`flex-shrink-0 w-20 cursor-pointer transition-all ${
                          seriesComic.id === comic.id ? "ring-2 ring-cyan-500" : "opacity-60 hover:opacity-100"
                        }`}
                      >
                        {seriesComic.thumbnail ? (
                          <img src={seriesComic.thumbnail} alt={seriesComic.title} className="w-20 h-28 object-cover bg-zinc-800" />
                        ) : (
                          <div className="w-20 h-28 bg-zinc-800 flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-zinc-600" />
                          </div>
                        )}
                        <p className="text-zinc-400 text-[10px] mt-1 truncate">{seriesComic.title}</p>
                      </div>
                    </Link>
                  ))}
              </div>
            </div>
          )}

          {(() => {
            const frontCoverUrl = comic.data?.coverFront || comic.data?.comicMeta?.frontCover || "";
            const isValidImage = frontCoverUrl.startsWith("data:image") || frontCoverUrl.startsWith("http") || frontCoverUrl.startsWith("blob:") || frontCoverUrl.startsWith("/");
            return isValidImage ? (
              <div className="mb-1 overflow-hidden max-w-2xl mx-auto" data-testid="img-cover-front">
                <img src={frontCoverUrl} alt="Front Cover" className="w-full object-contain" />
              </div>
            ) : null;
          })()}

          {viewMode === "scroll" ? (
            allPages.map((page, index) => (
              <div key={`page-${index}`} className="mb-1" data-testid={`page-section-${index}`}>
                <div className="max-w-2xl mx-auto">
                  <PageRenderer panels={page.panels} side={`${index}`} />
                </div>
              </div>
            ))
          ) : (
            <>
              {allPages.length > 0 && (
                <div className="max-w-2xl mx-auto">
                  <PageRenderer panels={allPages[currentSpreadIndex].panels} side={`${currentSpreadIndex}`} />
                </div>
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
                  {currentSpreadIndex + 1} / {allPages.length}
                </span>
                <button
                  onClick={() => goToSpread(currentSpreadIndex + 1)}
                  disabled={currentSpreadIndex >= allPages.length - 1}
                  className="px-4 py-2 border-2 border-zinc-700 text-zinc-400 hover:text-white hover:border-cyan-500 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-sm flex items-center gap-1 transition-colors"
                  data-testid="button-next-page"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {(() => {
            const backCoverUrl = comic.data?.coverBack || comic.data?.comicMeta?.backCover || "";
            const isValidImage = backCoverUrl.startsWith("data:image") || backCoverUrl.startsWith("http") || backCoverUrl.startsWith("blob:") || backCoverUrl.startsWith("/");
            return isValidImage ? (
              <div className="mt-1 overflow-hidden max-w-2xl mx-auto" data-testid="img-cover-back">
                <img src={backCoverUrl} alt="Back Cover" className="w-full object-contain" />
              </div>
            ) : null;
          })()}

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
              <div className="flex items-center gap-2">
                {isAuthenticated && comic.userId !== user?.id && (
                  <button
                    onClick={() => followMutation.mutate()}
                    disabled={followMutation.isPending}
                    className={`px-4 py-2 text-sm font-bold transition-colors flex items-center gap-2 ${
                      isFollowingData?.isFollowing
                        ? "bg-zinc-700 text-zinc-300 hover:bg-red-500/20 hover:text-red-400"
                        : "bg-purple-500 hover:bg-purple-400 text-white"
                    }`}
                    data-testid="button-follow-creator"
                  >
                    {isFollowingData?.isFollowing ? (
                      <>
                        <UserCheck className="w-4 h-4" />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Follow
                      </>
                    )}
                  </button>
                )}
                <Link href={`/portfolio/${comic.userId}`} data-testid="link-view-portfolio">
                  <span className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer">
                    <Eye className="w-4 h-4" />
                    View Portfolio
                  </span>
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-8" data-testid="comments-section">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="w-5 h-5 text-cyan-400" />
              <h3 className="text-white font-bold text-lg" data-testid="text-comments-title">
                Comments {comments?.total ? `(${comments.total})` : ""}
              </h3>
            </div>

            {isAuthenticated ? (
              <form onSubmit={handleSubmitComment} className="mb-6 flex gap-2" data-testid="form-add-comment">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-zinc-900 border-2 border-zinc-700 text-white px-4 py-2 text-sm focus:outline-none focus:border-cyan-500 transition-colors placeholder-zinc-500"
                  data-testid="input-comment"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim() || addCommentMutation.isPending}
                  className="px-4 py-2 bg-cyan-500 text-black font-bold text-sm hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                  data-testid="button-submit-comment"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="mb-6 p-4 bg-zinc-900 border-2 border-zinc-800 text-center" data-testid="comment-auth-gate">
                <p className="text-zinc-400 text-sm">
                  <Link href="/auth" data-testid="link-login-to-comment">
                    <span className="text-cyan-400 hover:text-cyan-300 cursor-pointer font-bold">Sign in</span>
                  </Link>
                  {" "}to leave a comment
                </p>
              </div>
            )}

            {commentsLoading ? (
              <div className="text-zinc-500 text-sm text-center py-8" data-testid="comments-loading">Loading comments...</div>
            ) : comments?.comments && comments.comments.length > 0 ? (
              <div className="space-y-4" data-testid="comments-list">
                {comments.comments.map((comment) => (
                  <div key={comment.id} className="p-4 bg-zinc-900 border border-zinc-800" data-testid={`comment-${comment.id}`}>
                    <div className="flex items-start gap-3">
                      {comment.authorAvatar ? (
                        <img
                          src={comment.authorAvatar}
                          alt={comment.authorName}
                          className="w-8 h-8 rounded-full object-cover border border-zinc-700 flex-shrink-0"
                          data-testid={`img-comment-avatar-${comment.id}`}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 flex-shrink-0">
                          <User className="w-4 h-4 text-zinc-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-bold" data-testid={`text-comment-author-${comment.id}`}>{comment.authorName}</span>
                          <span className="text-zinc-600 text-xs" data-testid={`text-comment-time-${comment.id}`}>{formatTimeAgo(comment.createdAt)}</span>
                        </div>
                        <p className="text-zinc-300 text-sm mt-1" data-testid={`text-comment-body-${comment.id}`}>{comment.text}</p>
                      </div>
                      {user?.id === comment.authorId && (
                        <button
                          onClick={() => deleteCommentMutation.mutate(comment.id)}
                          className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0"
                          data-testid={`button-delete-comment-${comment.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-zinc-500 text-sm text-center py-8" data-testid="text-no-comments">
                No comments yet. Be the first to comment!
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

const READER_TEXT_EFFECTS: Record<string, (color: string, strokeColor?: string, strokeWidth?: number) => React.CSSProperties> = {
  none: () => ({ textShadow: "none" }),
  outline: (_c: string, sc = "#000000", sw = 2) => ({
    textShadow: `
      -${sw}px -${sw}px 0 ${sc}, ${sw}px -${sw}px 0 ${sc},
      -${sw}px ${sw}px 0 ${sc}, ${sw}px ${sw}px 0 ${sc},
      0 -${sw}px 0 ${sc}, 0 ${sw}px 0 ${sc},
      -${sw}px 0 0 ${sc}, ${sw}px 0 0 ${sc}
    `,
  }),
  shadow: (_c: string, sc = "rgba(0,0,0,0.8)", sb = 4) => ({
    textShadow: `${sb}px ${sb}px ${(sb as number) * 2}px ${sc}`,
  }),
  glow: (_c: string, gc = "#ffffff") => ({
    textShadow: `0 0 10px ${gc}, 0 0 20px ${gc}, 0 0 30px ${gc}, 0 0 40px ${gc}`,
  }),
  "3d": (_c: string, sc = "#000000") => ({
    textShadow: `1px 1px 0 ${sc}, 2px 2px 0 ${sc}, 3px 3px 0 ${sc}, 4px 4px 0 ${sc}, 5px 5px 0 ${sc}, 6px 6px 8px rgba(0,0,0,0.5)`,
  }),
  emboss: () => ({
    textShadow: "-1px -1px 1px rgba(255,255,255,0.5), 1px 1px 1px rgba(0,0,0,0.5)",
  }),
  neon: (_c: string, gc = "#00ffff") => ({
    textShadow: `0 0 5px ${gc}, 0 0 10px ${gc}, 0 0 20px ${gc}, 0 0 40px ${gc}, 0 0 80px ${gc}`,
  }),
  comic: () => ({
    textShadow: "3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 4px 4px 0 rgba(0,0,0,0.3)",
    fontWeight: "900" as const,
  }),
  retro: () => ({
    textShadow: "3px 3px 0 #ff6b6b, 6px 6px 0 #4ecdc4, 9px 9px 0 rgba(0,0,0,0.2)",
  }),
  fire: () => ({
    textShadow: "0 0 10px #ff0, 0 0 20px #ff0, 0 0 30px #ff8c00, 0 0 40px #ff4500, 0 0 50px #ff0000, 0 0 60px #ff0000",
  }),
  ice: () => ({
    textShadow: "0 0 10px #fff, 0 0 20px #00bfff, 0 0 30px #00bfff, 0 0 40px #1e90ff, 0 0 50px #1e90ff",
  }),
  gold: () => ({
    background: "linear-gradient(180deg, #f9d423 0%, #ff4e00 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    filter: "drop-shadow(2px 2px 2px rgba(0,0,0,0.5))",
  }),
  chrome: () => ({
    background: "linear-gradient(180deg, #fff 0%, #aaa 50%, #fff 51%, #ccc 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    filter: "drop-shadow(1px 1px 1px rgba(0,0,0,0.3))",
  }),
};

const READER_BUBBLE_STYLES: Record<string, { bg: string; border: string; tail: boolean; clipPath?: string; textColor?: string; fontFamily?: string; boxShadow?: string; textShadow?: string; animation?: string }> = {
  none: { bg: "transparent", border: "none", tail: false },
  speech: { bg: "white", border: "2px solid black", tail: true, textColor: "#000" },
  thought: { bg: "white", border: "2px solid black", tail: true, textColor: "#000" },
  shout: { bg: "#ffeb3b", border: "3px solid #999", tail: true },
  whisper: { bg: "rgba(200,200,200,0.7)", border: "2px dashed #999", tail: true },
  burst: { bg: "#ff5722", border: "none", tail: false, clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)" },
  scream: { bg: "#ff1744", border: "4px solid #b71c1c", tail: true, textColor: "white" },
  robot: { bg: "#263238", border: "2px solid #4fc3f7", tail: true, textColor: "#4fc3f7", fontFamily: "'Courier New', monospace" },
  drip: { bg: "linear-gradient(180deg, #e040fb, #7c4dff)", border: "none", tail: true, textColor: "white" },
  glitch: { bg: "#000", border: "2px solid #0f0", tail: true, textColor: "#0f0", fontFamily: "'Courier New', monospace" },
  retro: { bg: "#f5e6d3", border: "3px solid #8d6e63", tail: true, textColor: "#5d4037", boxShadow: "4px 4px 0 #5d4037" },
  neon: { bg: "#0a0a1a", border: "2px solid #00ffff", tail: true, textColor: "white", boxShadow: "0 0 10px #00ffff, inset 0 0 10px rgba(0,255,255,0.1)", textShadow: "0 0 10px #00ffff" },
  graffiti: { bg: "linear-gradient(135deg, #ff6b35, #f7931e, #ffeb3b)", border: "3px solid #000", tail: false, textColor: "#000" },
  caption: { bg: "#fef3c7", border: "2px solid #000", tail: false, textColor: "#000", fontFamily: "'Special Elite', cursive", boxShadow: "2px 2px 0 #000" },
  starburst: { bg: "#ff9800", border: "none", tail: false, textColor: "#000", clipPath: "polygon(50% 0%, 61% 25%, 98% 15%, 75% 40%, 100% 50%, 75% 60%, 98% 85%, 61% 75%, 50% 100%, 39% 75%, 2% 85%, 25% 60%, 0% 50%, 25% 40%, 2% 15%, 39% 25%)" },
};

function PageRenderer({ panels, side }: { panels?: Panel[]; side: string }) {
  if (!panels || panels.length === 0) return null;

  return (
    <div className="flex-1 relative border border-zinc-300 min-h-[200px] bg-white shadow-md" data-testid={`page-${side}`}>
      <div className="relative w-full" style={{ paddingBottom: "141.4%" }}>
        {panels.map((panel) => (
          <PanelRenderer key={panel.id} panel={panel} />
        ))}
      </div>
    </div>
  );
}

function PanelRenderer({ panel }: { panel: Panel }) {
  const contentItems = (panel.contents || panel.content || []).slice().sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  const isCircle = panel.type === "circle";
  const EDITOR_W = 650;
  const EDITOR_H = 920;
  const panelPixelW = (panel.width / 100) * EDITOR_W;
  const panelPixelH = (panel.height / 100) * EDITOR_H;

  return (
    <div
      className={`absolute overflow-hidden ${isCircle ? "rounded-full" : ""}`}
      style={{
        left: `${panel.x}%`,
        top: `${panel.y}%`,
        width: `${panel.width}%`,
        height: `${panel.height}%`,
        borderWidth: `${panel.borderWidth || 2}px`,
        borderStyle: "solid",
        borderColor: panel.borderColor || "black",
        filter: panel.filter || undefined,
        transform: panel.rotation ? `rotate(${panel.rotation}deg)` : undefined,
        transformOrigin: "center center",
        zIndex: panel.zIndex || 0,
      }}
      data-testid={`panel-${panel.id}`}
    >
      <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: panel.backgroundColor || "white", filter: panel.filter || "none" }}>
        {contentItems.map((item, idx) => (
          <ContentRenderer key={item.id || idx} item={item} panelWidth={panelPixelW} panelHeight={panelPixelH} />
        ))}
      </div>
    </div>
  );
}

function getReaderOverlayStyle(overlayType: string): React.CSSProperties {
  switch (overlayType) {
    case "halftone":
      return { backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.15) 20%, transparent 20%)", backgroundSize: "4px 4px", mixBlendMode: "multiply" as const };
    case "halftone-fine":
      return { backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.12) 15%, transparent 15%)", backgroundSize: "3px 3px", mixBlendMode: "multiply" as const };
    case "halftone-bold":
      return { backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.2) 25%, transparent 25%)", backgroundSize: "6px 6px", mixBlendMode: "multiply" as const };
    case "screentone":
      return { backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.1) 10%, transparent 10%)", backgroundSize: "2px 2px", mixBlendMode: "multiply" as const };
    case "grain":
      return { backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' /%3E%3C/svg%3E")`, opacity: 0.15, mixBlendMode: "overlay" as const };
    case "paper":
      return { backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.5' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' /%3E%3C/svg%3E")`, opacity: 0.1, mixBlendMode: "overlay" as const };
    default:
      return {};
  }
}

function ContentRenderer({ item, panelWidth, panelHeight }: { item: PanelContentItem; panelWidth: number; panelHeight: number }) {
  const imgSrc = item.data?.url || item.data?.imageUrl || item.data?.src || item.src || "";
  const textContent = item.data?.text || item.text || "";
  const drawingData = item.data?.drawingData || "";

  const transform = item.transform;
  const hasFullTransform = transform && transform.width && transform.height;
  const leftPct = hasFullTransform && panelWidth > 0 ? (transform.x / panelWidth) * 100 : 0;
  const topPct = hasFullTransform && panelHeight > 0 ? (transform.y / panelHeight) * 100 : 0;
  const widthPct = hasFullTransform && panelWidth > 0 ? (transform.width / panelWidth) * 100 : 100;
  const heightPct = hasFullTransform && panelHeight > 0 ? (transform.height / panelHeight) * 100 : 100;

  const positionStyle: React.CSSProperties = transform ? {
    position: "absolute",
    left: `${leftPct}%`,
    top: `${topPct}%`,
    width: `${widthPct}%`,
    height: `${heightPct}%`,
    transform: [
      transform.rotation ? `rotate(${transform.rotation}deg)` : "",
      transform.scaleX !== undefined && transform.scaleX !== 1 ? `scaleX(${transform.flipX ? -transform.scaleX : transform.scaleX})` : (transform.flipX ? "scaleX(-1)" : ""),
      transform.scaleY !== undefined && transform.scaleY !== 1 ? `scaleY(${transform.flipY ? -transform.scaleY : transform.scaleY})` : (transform.flipY ? "scaleY(-1)" : ""),
    ].filter(Boolean).join(" ") || undefined,
    zIndex: item.zIndex || 0,
  } : {
    width: "100%",
    height: "100%",
    position: "relative" as const,
    zIndex: item.zIndex || 0,
  };

  if ((item.type === "image" || item.type === "gif") && imgSrc) {
    const imgFilter = item.data?.filter || "none";
    const imgOverlay = item.data?.filterOverlay || "";
    return (
      <div style={positionStyle}>
        <img
          src={imgSrc}
          alt=""
          className="w-full h-full object-contain"
          style={{ filter: imgFilter !== "none" ? imgFilter : undefined }}
          draggable={false}
          data-testid={`img-content-${item.id}`}
        />
        {imgOverlay && (
          <div className="absolute inset-0 pointer-events-none" style={getReaderOverlayStyle(imgOverlay)} />
        )}
      </div>
    );
  }

  if (item.type === "drawing" && drawingData) {
    return (
      <img
        src={drawingData}
        alt=""
        className="object-contain"
        style={{ ...positionStyle, objectFit: "contain" }}
        draggable={false}
        data-testid={`drawing-content-${item.id}`}
      />
    );
  }

  if (item.type === "video" && item.data?.videoUrl) {
    return (
      <video
        src={item.data.videoUrl}
        className="object-contain"
        style={{ ...positionStyle, objectFit: "contain" }}
        autoPlay={item.data.autoplay ?? true}
        loop={item.data.loop ?? true}
        muted={item.data.muted ?? true}
        playsInline
        draggable={false}
        data-testid={`video-content-${item.id}`}
      />
    );
  }

  if (item.type === "text" || item.type === "bubble") {
    const bStyle = item.data?.bubbleStyle || "none";
    const fontSize = item.data?.fontSize || 16;
    const fontFamily = item.data?.fontFamily || "'Bangers', cursive";
    const color = item.data?.color || "#ffffff";
    const bgColor = item.data?.backgroundColor || "transparent";
    const padding = item.data?.padding || 8;
    const borderRadius = item.data?.borderRadius || 0;
    const textEffect = item.data?.textEffect || "comic";
    const strokeColor = item.data?.strokeColor || "#000000";
    const strokeWidth = item.data?.strokeWidth || 2;
    const fontWeight = item.data?.fontWeight === "900" ? 900 : item.data?.fontWeight === "bold" ? 700 : 400;
    const fontStyle = item.data?.fontStyle || "normal";
    const textAlign = (item.data?.textAlign || "center") as React.CSSProperties["textAlign"];
    const textTransform = (item.data?.textTransform || "none") as React.CSSProperties["textTransform"];
    const letterSpacing = item.data?.letterSpacing || 0.02;
    const lineHeight = item.data?.lineHeight || 1.3;
    const textArch = item.data?.textArch || 0;

    const effectFn = READER_TEXT_EFFECTS[textEffect] || READER_TEXT_EFFECTS.comic;
    const effectStyles = effectFn(color, strokeColor, strokeWidth);

    const bubbleConfig = READER_BUBBLE_STYLES[bStyle] || READER_BUBBLE_STYLES.none;
    const bubbleBg = bubbleConfig.bg === "transparent" ? bgColor : bubbleConfig.bg;
    const resolvedColor = bubbleConfig.textColor || color;
    const resolvedFont = bubbleConfig.fontFamily || fontFamily;

    const textStyles: React.CSSProperties = {
      fontSize,
      fontFamily: resolvedFont,
      color: resolvedColor,
      lineHeight,
      letterSpacing: `${letterSpacing}em`,
      fontWeight,
      fontStyle,
      textAlign,
      textTransform,
      ...effectStyles,
    };

    if (bubbleConfig.textShadow) {
      textStyles.textShadow = bubbleConfig.textShadow;
    }

    const containerStyle: React.CSSProperties = {
      ...positionStyle,
      background: bubbleBg,
      border: bubbleConfig.border,
      borderRadius: bStyle === "thought" ? "50%" : borderRadius,
      padding,
      clipPath: bubbleConfig.clipPath || undefined,
      boxShadow: bubbleConfig.boxShadow || undefined,
    };

    const renderArchedText = () => {
      const displayText = textTransform === "uppercase" ? textContent.toUpperCase()
        : textTransform === "lowercase" ? textContent.toLowerCase()
        : textContent;
      const svgW = 400;
      const svgH = 200;
      const absArch = Math.abs(textArch);
      const curveDepth = absArch * 1.5;
      const isInverted = textArch < 0;
      const pathId = `reader-arch-${item.id || Math.random().toString(36).slice(2)}`;
      let pathD: string;
      if (isInverted) {
        const startY = svgH * 0.3;
        pathD = `M 10,${startY} Q ${svgW / 2},${startY + curveDepth} ${svgW - 10},${startY}`;
      } else {
        const startY = svgH * 0.7;
        pathD = `M 10,${startY} Q ${svgW / 2},${startY - curveDepth} ${svgW - 10},${startY}`;
      }
      const textAnchor = textAlign === "left" ? "start" : textAlign === "right" ? "end" : "middle";
      const startOffset = textAlign === "left" ? "0%" : textAlign === "right" ? "100%" : "50%";
      const scaledFontSize = fontSize * 2.5;
      const fWeight = fontWeight;
      const effect = textEffect || "comic";
      const needsOutline = ["outline", "comic", "3d", "retro"].includes(effect);

      return (
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          <defs><path id={pathId} d={pathD} fill="none" /></defs>
          {needsOutline && (
            <text fontSize={scaledFontSize} fontFamily={resolvedFont} fontWeight={fWeight} fontStyle={fontStyle} fill="none" stroke={strokeColor} strokeWidth={strokeWidth * 2} strokeLinejoin="round" textAnchor={textAnchor} letterSpacing={`${(letterSpacing || 0.02) * scaledFontSize}px`}>
              <textPath href={`#${pathId}`} startOffset={startOffset}>{displayText}</textPath>
            </text>
          )}
          <text fontSize={scaledFontSize} fontFamily={resolvedFont} fontWeight={fWeight} fontStyle={fontStyle} fill={resolvedColor} textAnchor={textAnchor} letterSpacing={`${(letterSpacing || 0.02) * scaledFontSize}px`}>
            <textPath href={`#${pathId}`} startOffset={startOffset}>{displayText}</textPath>
          </text>
        </svg>
      );
    };

    return (
      <div
        className={`flex items-center justify-center overflow-hidden ${bStyle === "whisper" ? "opacity-80 italic" : ""} ${bStyle === "scream" ? "font-black uppercase" : ""}`}
        style={containerStyle}
        data-testid={`text-content-${item.id}`}
      >
        {textArch !== 0 ? renderArchedText() : (
          <p className="w-full whitespace-pre-wrap break-words" style={textStyles}>
            {textContent}
          </p>
        )}
        {bubbleConfig.tail && bStyle === "speech" && (
          <>
            <div className="absolute -bottom-4 left-1/4 w-0 h-0" style={{ borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderTop: "16px solid black" }} />
            <div className="absolute -bottom-3 left-1/4 w-0 h-0" style={{ borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "14px solid white", marginLeft: "2px" }} />
          </>
        )}
        {bubbleConfig.tail && bStyle === "thought" && (
          <>
            <div className="absolute -bottom-2 left-1/4 w-3 h-3 bg-white border-2 border-black rounded-full" />
            <div className="absolute -bottom-5 left-1/5 w-2 h-2 bg-white border-2 border-black rounded-full" />
          </>
        )}
      </div>
    );
  }

  return null;
}
