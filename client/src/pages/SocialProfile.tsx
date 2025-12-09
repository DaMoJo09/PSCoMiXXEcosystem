import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { 
  ArrowLeft, Grid, Bookmark, Settings, UserPlus, UserMinus,
  MessageSquare, Heart
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  followers: number;
  following: number;
  postCount: number;
  isFollowing: boolean;
  posts: Post[];
}

interface Post {
  id: string;
  authorId: string;
  projectId: string | null;
  type: string;
  caption: string;
  mediaUrls: string[] | null;
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

export default function SocialProfile() {
  const [, navigate] = useLocation();
  const params = useParams<{ userId: string }>();
  const userId = params.userId;
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isOwnProfile = user?.id === userId;

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["/api/social/profile", userId],
    queryFn: async () => {
      const res = await fetch(`/api/social/profile/${userId}`);
      return res.json();
    },
    enabled: !!userId,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/social/follow/${userId}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to follow");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/profile", userId] });
      toast({ title: "Following!", description: `You're now following ${profile?.name}` });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/social/follow/${userId}`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/profile", userId] });
      toast({ title: "Unfollowed", description: `You've unfollowed ${profile?.name}` });
    },
  });

  const startDmMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/dm/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      return res.json();
    },
    onSuccess: (thread) => {
      navigate(`/social/messages/${thread.id}`);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <p className="text-white/70">User not found</p>
        <Button onClick={() => navigate("/social")} className="mt-4 bg-white text-black border-4 border-black">
          Back to Feed
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 z-40 bg-black border-b-4 border-white p-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/social")}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="font-black text-lg tracking-tight">{profile.name}</h1>
          {isOwnProfile ? (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/settings")}
              className="text-white hover:bg-white/10"
            >
              <Settings className="w-6 h-6" />
            </Button>
          ) : (
            <div className="w-10" />
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-start gap-6 mb-6">
          <div className="w-20 h-20 bg-white/20 border-4 border-black flex items-center justify-center font-black text-3xl">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex gap-8 mb-4">
              <div className="text-center">
                <p className="font-black text-xl">{profile.postCount}</p>
                <p className="text-xs text-white/50">POSTS</p>
              </div>
              <div className="text-center">
                <p className="font-black text-xl">{profile.followers}</p>
                <p className="text-xs text-white/50">FOLLOWERS</p>
              </div>
              <div className="text-center">
                <p className="font-black text-xl">{profile.following}</p>
                <p className="text-xs text-white/50">FOLLOWING</p>
              </div>
            </div>
          </div>
        </div>

        <p className="font-bold mb-1">{profile.name}</p>
        <p className="text-white/50 text-sm mb-4">
          Joined {formatDistanceToNow(new Date(profile.createdAt), { addSuffix: true })}
        </p>

        {!isOwnProfile && (
          <div className="flex gap-2 mb-6">
            {profile.isFollowing ? (
              <Button 
                onClick={() => unfollowMutation.mutate()}
                className="flex-1 bg-white/10 text-white border-4 border-white font-bold hover:bg-white/20"
                disabled={unfollowMutation.isPending}
                data-testid="unfollow-button"
              >
                <UserMinus className="w-4 h-4 mr-2" />
                FOLLOWING
              </Button>
            ) : (
              <Button 
                onClick={() => followMutation.mutate()}
                className="flex-1 bg-white text-black border-4 border-black font-bold hover:bg-white/90"
                disabled={followMutation.isPending}
                data-testid="follow-button"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                FOLLOW
              </Button>
            )}
            <Button 
              onClick={() => startDmMutation.mutate()}
              variant="outline"
              className="border-4 border-white text-white hover:bg-white/10"
              disabled={startDmMutation.isPending}
              data-testid="message-button"
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
          </div>
        )}

        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="w-full grid grid-cols-2 bg-white/5 border-4 border-black rounded-none h-12">
            <TabsTrigger 
              value="posts" 
              className="data-[state=active]:bg-white data-[state=active]:text-black font-bold"
            >
              <Grid className="w-4 h-4 mr-2" />
              POSTS
            </TabsTrigger>
            <TabsTrigger 
              value="saved" 
              className="data-[state=active]:bg-white data-[state=active]:text-black font-bold"
            >
              <Bookmark className="w-4 h-4 mr-2" />
              SAVED
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-4">
            {profile.posts.length === 0 ? (
              <div className="text-center py-12">
                <Grid className="w-12 h-12 mx-auto text-white/30 mb-4" />
                <p className="text-white/50">No posts yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {profile.posts.map((post) => (
                  <button
                    key={post.id}
                    onClick={() => navigate(`/social/post/${post.id}`)}
                    className="aspect-square bg-white/10 border-2 border-black relative group overflow-hidden"
                    data-testid={`profile-post-${post.id}`}
                  >
                    {post.mediaUrls && post.mediaUrls[0] ? (
                      <img 
                        src={post.mediaUrls[0]} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-2">
                        <p className="text-white/70 text-xs line-clamp-3">{post.caption}</p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <span className="flex items-center gap-1 text-white font-bold text-sm">
                        <Heart className="w-4 h-4" />
                        {post.likeCount}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="saved" className="mt-4">
            <div className="text-center py-12">
              <Bookmark className="w-12 h-12 mx-auto text-white/30 mb-4" />
              <p className="text-white/50">No saved posts</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
