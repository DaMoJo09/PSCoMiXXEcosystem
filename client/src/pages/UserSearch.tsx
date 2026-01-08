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
  Sparkles, TrendingUp, Star, MessageCircle, UserCheck, Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  creatorClass?: string;
  level?: number;
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
      className="group relative bg-black border-4 border-white overflow-hidden transform transition-all duration-200 hover:bg-zinc-900"
      data-testid={`user-card-${profile.id}`}
    >
      <div className="relative z-10 flex items-center gap-4 p-4">
        <button
          onClick={() => navigate(`/social/profile/${profile.id}`)}
          className="relative w-16 h-16 shrink-0 overflow-hidden border-2 border-white"
        >
          {profile.avatar ? (
            <img 
              src={profile.avatar} 
              alt={profile.name}
              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
            />
          ) : (
            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
              <span className="text-2xl font-black text-white/50">{profile.name.charAt(0).toUpperCase()}</span>
            </div>
          )}
          {profile.level && profile.level > 1 && (
            <div className="absolute bottom-0 right-0 bg-white text-black text-[10px] font-black px-1 border border-black">
              {profile.level}
            </div>
          )}
        </button>
        
        <div className="flex-1 min-w-0">
          <button
            onClick={() => navigate(`/social/profile/${profile.id}`)}
            className="font-black text-white uppercase tracking-wide hover:text-zinc-300 text-left block truncate transition-colors"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {profile.name}
          </button>
          
          <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1 font-mono">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {profile.followerCount || 0}
            </span>
            <span className="text-zinc-600">|</span>
            <span>{profile.postCount || 0} posts</span>
          </div>
          
          {profile.creatorClass && profile.creatorClass !== "Rookie" && (
            <div className="inline-flex items-center gap-1 mt-2 bg-white text-black px-2 py-0.5 text-[10px] font-black uppercase">
              <Zap className="w-3 h-3" />
              {profile.creatorClass}
            </div>
          )}
          
          {profile.role === "admin" && (
            <span className="inline-block ml-2 mt-2 text-[10px] font-black bg-white text-black px-2 py-0.5 border border-white">
              STAFF
            </span>
          )}
        </div>

        {!isOwnProfile && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => startDmMutation.mutate()}
              disabled={startDmMutation.isPending}
              className="w-10 h-10 border-2 border-white text-white hover:bg-white hover:text-black transition-all"
              data-testid={`message-${profile.id}`}
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
            {profile.isFollowing ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => unfollowMutation.mutate()}
                disabled={unfollowMutation.isPending}
                className="border-2 border-white text-white hover:bg-white hover:text-black font-bold uppercase text-xs tracking-wider"
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
                className="bg-white text-black border-2 border-white font-black uppercase text-xs tracking-wider hover:bg-zinc-200 transition-all"
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
            className="text-white hover:bg-zinc-900 border-2 border-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="font-black text-xl tracking-widest uppercase flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <Search className="w-5 h-5" />
            FIND CREATORS
          </h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 relative">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name..."
            className="bg-zinc-900 border-4 border-white text-white placeholder:text-zinc-500 pl-12 py-6 text-lg font-bold focus:border-zinc-400 transition-colors"
            data-testid="user-search-input"
          />
        </div>

        {searchQuery.length >= 2 ? (
          <div className="mb-4">
            <h2 className="font-black text-xs text-zinc-400 mb-3 flex items-center gap-2 uppercase tracking-widest">
              <div className="w-2 h-2 bg-white" />
              SEARCH RESULTS
            </h2>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="w-full grid grid-cols-2 bg-zinc-900 border-4 border-white rounded-none h-14">
              <TabsTrigger 
                value="newest" 
                className="data-[state=active]:bg-white data-[state=active]:text-black font-black uppercase tracking-wider text-zinc-500 data-[state=active]:border-none rounded-none"
                data-testid="tab-newest"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                NEWEST
              </TabsTrigger>
              <TabsTrigger 
                value="suggested" 
                className="data-[state=active]:bg-white data-[state=active]:text-black font-black uppercase tracking-wider text-zinc-500 data-[state=active]:border-none rounded-none"
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
            <div className="animate-spin w-10 h-10 border-4 border-white border-t-transparent mx-auto" />
            <p className="text-zinc-500 mt-4 font-mono text-sm">LOADING...</p>
          </div>
        ) : displayUsers.length === 0 ? (
          <div className="text-center py-12 border-4 border-zinc-700 bg-zinc-900">
            {searchQuery.length >= 2 ? (
              <>
                <Users className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
                <p className="text-zinc-400 font-bold uppercase">No users found</p>
                <p className="text-zinc-500 text-sm mt-1">Try a different search term</p>
              </>
            ) : activeTab === "newest" ? (
              <>
                <UserCheck className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
                <p className="text-zinc-400 font-bold uppercase">No members yet</p>
                <p className="text-zinc-500 text-sm mt-1">Be the first to invite friends!</p>
              </>
            ) : (
              <>
                <Sparkles className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
                <p className="text-zinc-400 font-bold uppercase">No suggestions yet</p>
                <p className="text-zinc-500 text-sm mt-1">Start following creators to get personalized suggestions!</p>
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
