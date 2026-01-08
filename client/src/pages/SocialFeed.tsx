import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { 
  Heart, MessageCircle, Share2, Send, Plus, Home, Compass, Bell, 
  User, MessageSquare, Users, Zap, ArrowLeft, Image, Video, Link2, Search, MoreHorizontal
} from "lucide-react";
import { ReportButton } from "@/components/ReportButton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface Post {
  id: string;
  authorId: string;
  projectId: string | null;
  type: string;
  caption: string;
  mediaUrls: string[] | null;
  visibility: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
  isLiked: boolean;
  author: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
  };
  project: {
    id: string;
    title: string;
    thumbnail: string;
    type: string;
  } | null;
}

interface Comment {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatar?: string | null;
  };
}

function PostCard({ post, onLike, onUnlike, onComment }: { 
  post: Post; 
  onLike: (id: string) => void; 
  onUnlike: (id: string) => void;
  onComment: (id: string, body: string) => void;
}) {
  const [, navigate] = useLocation();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const queryClient = useQueryClient();

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ["/api/social/posts", post.id, "comments"],
    queryFn: async () => {
      const res = await fetch(`/api/social/posts/${post.id}/comments`);
      return res.json();
    },
    enabled: showComments,
  });

  const handleSubmitComment = () => {
    if (commentText.trim()) {
      onComment(post.id, commentText);
      setCommentText("");
    }
  };

  return (
    <div className="bg-white/5 border-4 border-black rounded-none p-0 mb-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)]" data-testid={`post-card-${post.id}`}>
      <div className="flex items-center gap-3 p-4 border-b-4 border-black">
        <button 
          onClick={() => navigate(`/social/profile/${post.author.id}`)}
          className="w-10 h-10 border-2 border-black flex items-center justify-center font-bold overflow-hidden bg-zinc-800"
          data-testid={`post-author-avatar-${post.id}`}
        >
          {post.author.avatar ? (
            <img src={post.author.avatar} alt={post.author.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white/70">{post.author.name.charAt(0).toUpperCase()}</span>
          )}
        </button>
        <div className="flex-1">
          <button 
            onClick={() => navigate(`/social/profile/${post.author.id}`)}
            className="font-bold text-white hover:underline"
            data-testid={`post-author-name-${post.id}`}
          >
            {post.author.name}
          </button>
          <p className="text-xs text-white/50">
            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          </p>
        </div>
        {post.type !== "post" && (
          <span className="px-2 py-1 text-xs font-bold bg-white text-black border-2 border-black">
            {post.type.toUpperCase()}
          </span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 text-white/50 hover:text-white" data-testid={`post-menu-${post.id}`}>
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-zinc-900 border-2 border-black">
            <DropdownMenuItem asChild className="cursor-pointer">
              <div>
                <ReportButton contentType="post" contentId={post.id} variant="text" />
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {post.project && (
        <div 
          className="border-b-4 border-black cursor-pointer hover:opacity-90"
          onClick={() => navigate(`/creator/${post.project!.type}?id=${post.project!.id}`)}
          data-testid={`post-project-${post.id}`}
        >
          {post.project.thumbnail ? (
            <img 
              src={post.project.thumbnail} 
              alt={post.project.title}
              className="w-full aspect-square object-cover"
            />
          ) : (
            <div className="w-full aspect-square bg-white/10 flex items-center justify-center">
              <span className="text-white/50 font-bold text-xl">{post.project.title}</span>
            </div>
          )}
        </div>
      )}

      {post.mediaUrls && post.mediaUrls.length > 0 && !post.project && (
        <div className="border-b-4 border-black">
          <img 
            src={post.mediaUrls[0]} 
            alt="Post media"
            className="w-full aspect-square object-cover"
          />
        </div>
      )}

      <div className="p-4">
        {post.caption && (
          <p className="text-white mb-4">{post.caption}</p>
        )}

        <div className="flex items-center gap-4">
          <button 
            onClick={() => post.isLiked ? onUnlike(post.id) : onLike(post.id)}
            className={`flex items-center gap-1 font-bold transition-colors ${
              post.isLiked ? "text-red-500" : "text-white/70 hover:text-red-500"
            }`}
            data-testid={`post-like-${post.id}`}
          >
            <Heart className={`w-5 h-5 ${post.isLiked ? "fill-current" : ""}`} />
            <span>{post.likeCount}</span>
          </button>

          <button 
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1 text-white/70 hover:text-white font-bold transition-colors"
            data-testid={`post-comments-toggle-${post.id}`}
          >
            <MessageCircle className="w-5 h-5" />
            <span>{post.commentCount}</span>
          </button>

          <button className="flex items-center gap-1 text-white/70 hover:text-white font-bold transition-colors">
            <Share2 className="w-5 h-5" />
            <span>{post.shareCount}</span>
          </button>
        </div>

        {showComments && (
          <div className="mt-4 pt-4 border-t-2 border-white/20">
            <div className="space-y-3 mb-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2" data-testid={`comment-${comment.id}`}>
                  <div className="w-6 h-6 bg-white/20 border border-black flex items-center justify-center text-xs font-bold">
                    {comment.author?.name?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-white text-sm">{comment.author?.name || "Unknown"}</span>
                    <p className="text-white/80 text-sm">{comment.body}</p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-white/50 text-sm">No comments yet. Be the first!</p>
              )}
            </div>

            <div className="flex gap-2">
              <Input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-white/10 border-2 border-black text-white placeholder:text-white/50"
                onKeyDown={(e) => e.key === "Enter" && handleSubmitComment()}
                data-testid={`post-comment-input-${post.id}`}
              />
              <Button 
                onClick={handleSubmitComment}
                className="bg-white text-black border-2 border-black hover:bg-white/90 font-bold"
                data-testid={`post-comment-submit-${post.id}`}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CreatePostDialog({ onPost }: { onPost: (caption: string, type: string) => void }) {
  const [caption, setCaption] = useState("");
  const [open, setOpen] = useState(false);

  const handlePost = () => {
    if (caption.trim()) {
      onPost(caption, "post");
      setCaption("");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-white text-black border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:bg-white/90 z-50"
          data-testid="create-post-button"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-neutral-900 border-4 border-black text-white">
        <DialogHeader>
          <DialogTitle className="font-black text-xl">CREATE POST</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="What's on your mind?"
            className="bg-white/10 border-2 border-black text-white placeholder:text-white/50 min-h-[120px]"
            data-testid="create-post-caption"
          />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 border-2 border-black">
              <Image className="w-4 h-4 mr-2" />
              Image
            </Button>
            <Button variant="outline" className="flex-1 border-2 border-black">
              <Video className="w-4 h-4 mr-2" />
              Video
            </Button>
          </div>
          <Button 
            onClick={handlePost}
            className="w-full bg-white text-black border-4 border-black font-bold hover:bg-white/90"
            data-testid="create-post-submit"
          >
            POST
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SocialFeed() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("feed");

  const { data: feedPosts = [], isLoading: feedLoading } = useQuery<Post[]>({
    queryKey: ["/api/social/feed"],
    enabled: isAuthenticated,
  });

  const { data: explorePosts = [], isLoading: exploreLoading } = useQuery<Post[]>({
    queryKey: ["/api/social/explore"],
  });

  const { data: notificationCount = { count: 0 } } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: isAuthenticated,
  });

  const createPostMutation = useMutation({
    mutationFn: async ({ caption, type }: { caption: string; type: string }) => {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption, type, visibility: "public" }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/feed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/social/explore"] });
      toast({ title: "Posted!", description: "Your post is now live." });
    },
  });

  const likeMutation = useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch(`/api/social/posts/${postId}/like`, { method: "POST" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/feed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/social/explore"] });
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch(`/api/social/posts/${postId}/like`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/feed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/social/explore"] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async ({ postId, body }: { postId: string; body: string }) => {
      const res = await fetch(`/api/social/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts", variables.postId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/social/feed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/social/explore"] });
    },
  });

  const posts = activeTab === "feed" ? feedPosts : explorePosts;
  const isLoading = activeTab === "feed" ? feedLoading : exploreLoading;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 z-40 bg-black border-b-4 border-white p-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/")}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="font-black text-xl tracking-tight">PSCOMIXX</h1>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/social/search")}
              className="text-white hover:bg-white/10"
              data-testid="search-button"
            >
              <Search className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/social/notifications")}
              className="text-white hover:bg-white/10 relative"
              data-testid="notifications-button"
            >
              <Bell className="w-6 h-6" />
              {notificationCount.count > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {notificationCount.count}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto pb-24">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2 bg-white/5 border-4 border-black rounded-none h-12">
            <TabsTrigger 
              value="feed" 
              className="data-[state=active]:bg-white data-[state=active]:text-black font-bold"
              data-testid="feed-tab"
            >
              <Home className="w-4 h-4 mr-2" />
              FEED
            </TabsTrigger>
            <TabsTrigger 
              value="explore" 
              className="data-[state=active]:bg-white data-[state=active]:text-black font-bold"
              data-testid="explore-tab"
            >
              <Compass className="w-4 h-4 mr-2" />
              EXPLORE
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="mt-0 p-4">
            {!isAuthenticated ? (
              <div className="text-center py-12">
                <p className="text-white/70 mb-4">Sign in to see your feed</p>
                <Button 
                  onClick={() => navigate("/login")}
                  className="bg-white text-black border-4 border-black font-bold"
                >
                  SIGN IN
                </Button>
              </div>
            ) : isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto" />
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-white/30 mb-4" />
                <p className="text-white/70 mb-2">Your feed is empty</p>
                <p className="text-white/50 text-sm">Follow some creators to see their posts here!</p>
              </div>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={(id) => likeMutation.mutate(id)}
                  onUnlike={(id) => unlikeMutation.mutate(id)}
                  onComment={(id, body) => commentMutation.mutate({ postId: id, body })}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="explore" className="mt-0 p-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto" />
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12">
                <Compass className="w-12 h-12 mx-auto text-white/30 mb-4" />
                <p className="text-white/70">No posts yet</p>
                <p className="text-white/50 text-sm">Be the first to share something!</p>
              </div>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={(id) => likeMutation.mutate(id)}
                  onUnlike={(id) => unlikeMutation.mutate(id)}
                  onComment={(id, body) => commentMutation.mutate({ postId: id, body })}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {isAuthenticated && (
        <CreatePostDialog 
          onPost={(caption, type) => createPostMutation.mutate({ caption, type })} 
        />
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-black border-t-4 border-white z-50">
        <div className="max-w-lg mx-auto flex justify-around py-3">
          <Button
            variant="ghost"
            onClick={() => navigate("/social")}
            className={`flex flex-col items-center gap-1 text-white hover:bg-white/10 ${activeTab === "feed" || activeTab === "explore" ? "text-white" : "text-white/50"}`}
            data-testid="nav-feed"
          >
            <Home className="w-6 h-6" />
            <span className="text-xs font-bold">FEED</span>
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate("/social/messages")}
            className="flex flex-col items-center gap-1 text-white/50 hover:bg-white/10"
            data-testid="nav-messages"
          >
            <MessageSquare className="w-6 h-6" />
            <span className="text-xs font-bold">DMs</span>
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate("/social/chains")}
            className="flex flex-col items-center gap-1 text-white/50 hover:bg-white/10"
            data-testid="nav-chains"
          >
            <Link2 className="w-6 h-6" />
            <span className="text-xs font-bold">CHAINS</span>
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate("/social/collab")}
            className="flex flex-col items-center gap-1 text-white/50 hover:bg-white/10"
            data-testid="nav-collab"
          >
            <Zap className="w-6 h-6" />
            <span className="text-xs font-bold">COLLAB</span>
          </Button>
          <Button
            variant="ghost"
            onClick={() => user && navigate(`/social/profile/${user.id}`)}
            className="flex flex-col items-center gap-1 text-white/50 hover:bg-white/10"
            data-testid="nav-profile"
          >
            <User className="w-6 h-6" />
            <span className="text-xs font-bold">ME</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
