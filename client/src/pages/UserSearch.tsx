import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { 
  ArrowLeft, Search, UserPlus, UserMinus, Users, 
  Sparkles, TrendingUp, Star, MessageCircle, UserCheck
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  postCount?: number;
  followerCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
}

function UserCard({ profile, onFollowChange }: { profile: UserProfile; onFollowChange: () => void }) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const isOwnProfile = user?.id === profile.id;

  const followMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/social/follow/${profile.id}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to follow");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Following!", description: `You're now following ${profile.name}` });
      onFollowChange();
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      await fetch(`/api/social/follow/${profile.id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({ title: "Unfollowed", description: `You've unfollowed ${profile.name}` });
      onFollowChange();
    },
  });

  const startDmMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/dm/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id }),
      });
      if (!res.ok) throw new Error("Failed to start conversation");
      return res.json();
    },
    onSuccess: (thread) => {
      navigate(`/social/messages/${thread.id}`);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to start conversation", variant: "destructive" });
    },
  });

  return (
    <div 
      className="bg-white/5 border-4 border-black p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
      data-testid={`user-card-${profile.id}`}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/social/profile/${profile.id}`)}
          className="w-14 h-14 bg-white/20 border-2 border-black flex items-center justify-center font-bold text-xl shrink-0"
        >
          {profile.name.charAt(0).toUpperCase()}
        </button>
        
        <div className="flex-1 min-w-0">
          <button
            onClick={() => navigate(`/social/profile/${profile.id}`)}
            className="font-bold text-white hover:underline text-left block truncate"
          >
            {profile.name}
          </button>
          <div className="flex items-center gap-3 text-xs text-white/50 mt-1">
            <span>{profile.followerCount || 0} followers</span>
            <span>{profile.postCount || 0} posts</span>
          </div>
          {profile.role === "admin" && (
            <span className="inline-block mt-1 text-xs font-bold bg-yellow-500/20 text-yellow-400 px-2 py-0.5 border border-yellow-500/50">
              STAFF
            </span>
          )}
        </div>

        {!isOwnProfile && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => startDmMutation.mutate()}
              disabled={startDmMutation.isPending}
              className="border-2 border-cyan-500 text-cyan-400 hover:bg-cyan-500/10"
              data-testid={`message-${profile.id}`}
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
            {profile.isFollowing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => unfollowMutation.mutate()}
                disabled={unfollowMutation.isPending}
                className="border-2 border-white text-white hover:bg-white/10"
                data-testid={`unfollow-${profile.id}`}
              >
                <UserMinus className="w-4 h-4 mr-1" />
                Following
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => followMutation.mutate()}
                disabled={followMutation.isPending}
                className="bg-white text-black border-2 border-black font-bold hover:bg-white/90"
                data-testid={`follow-${profile.id}`}
              >
                <UserPlus className="w-4 h-4 mr-1" />
                Follow
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function UserSearch() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("newest");

  const { data: suggestedUsers = [], isLoading: loadingSuggested } = useQuery<UserProfile[]>({
    queryKey: ["/api/social/suggested-users"],
    queryFn: async () => {
      const res = await fetch("/api/social/suggested-users");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: newestMembers = [], isLoading: loadingNewest } = useQuery<UserProfile[]>({
    queryKey: ["/api/social/newest-members"],
    queryFn: async () => {
      const res = await fetch("/api/social/newest-members");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: searchResults = [], isLoading: loadingSearch } = useQuery<UserProfile[]>({
    queryKey: ["/api/social/search-users", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const res = await fetch(`/api/social/search-users?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error("Failed to search");
      return res.json();
    },
    enabled: searchQuery.length >= 2,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/social/suggested-users"] });
    queryClient.invalidateQueries({ queryKey: ["/api/social/newest-members"] });
    if (searchQuery) {
      queryClient.invalidateQueries({ queryKey: ["/api/social/search-users", searchQuery] });
    }
  };

  const getDisplayUsers = () => {
    if (searchQuery.length >= 2) return searchResults;
    return activeTab === "newest" ? newestMembers : suggestedUsers;
  };
  
  const getIsLoading = () => {
    if (searchQuery.length >= 2) return loadingSearch;
    return activeTab === "newest" ? loadingNewest : loadingSuggested;
  };
  
  const displayUsers = getDisplayUsers();
  const isLoading = getIsLoading();

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
          <h1 className="font-black text-xl tracking-tight flex items-center gap-2">
            <Search className="w-5 h-5" />
            FIND CREATORS
          </h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4">
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name..."
            className="bg-white/10 border-4 border-black text-white placeholder:text-white/50 pl-12 py-6 text-lg"
            data-testid="user-search-input"
          />
        </div>

        {searchQuery.length >= 2 ? (
          <div className="mb-4">
            <h2 className="font-bold text-sm text-white/50 mb-3 flex items-center gap-2">
              <Search className="w-4 h-4" />
              SEARCH RESULTS
            </h2>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
            <TabsList className="w-full grid grid-cols-2 bg-white/5 border-4 border-black rounded-none h-12">
              <TabsTrigger 
                value="newest" 
                className="data-[state=active]:bg-cyan-500 data-[state=active]:text-black font-bold"
                data-testid="tab-newest"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                NEWEST
              </TabsTrigger>
              <TabsTrigger 
                value="suggested" 
                className="data-[state=active]:bg-white data-[state=active]:text-black font-bold"
                data-testid="tab-suggested"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                SUGGESTED
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto" />
          </div>
        ) : displayUsers.length === 0 ? (
          <div className="text-center py-12">
            {searchQuery.length >= 2 ? (
              <>
                <Users className="w-12 h-12 mx-auto text-white/30 mb-4" />
                <p className="text-white/70">No users found</p>
                <p className="text-white/50 text-sm">Try a different search term</p>
              </>
            ) : activeTab === "newest" ? (
              <>
                <UserCheck className="w-12 h-12 mx-auto text-white/30 mb-4" />
                <p className="text-white/70">No members yet</p>
                <p className="text-white/50 text-sm">Be the first to invite friends!</p>
              </>
            ) : (
              <>
                <Sparkles className="w-12 h-12 mx-auto text-white/30 mb-4" />
                <p className="text-white/70">No suggestions yet</p>
                <p className="text-white/50 text-sm">Start following creators to get personalized suggestions!</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayUsers.map((profile) => (
              <UserCard 
                key={profile.id} 
                profile={profile}
                onFollowChange={handleRefresh}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
