import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatDistanceToNow } from "date-fns";
import { 
  ArrowLeft, Plus, Link2, Users, Globe, Shuffle, Sparkles,
  Heart, MessageCircle, Image, Video, Pencil, Play, ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CommunityChain {
  id: string;
  creatorId: string;
  title: string;
  description: string | null;
  visibility: string;
  status: string;
  maxContributions: number | null;
  contributionCount: number;
  thumbnail: string | null;
  tags: string[] | null;
  createdAt: string;
  updatedAt: string;
  creator?: { id: string; name: string };
  contributions?: ChainContribution[];
}

interface ChainContribution {
  id: string;
  chainId: string;
  userId: string;
  position: number;
  contentType: string;
  mediaUrl: string;
  caption: string | null;
  likesCount: number;
  createdAt: string;
  user?: { id: string; name: string };
}

function StartChainDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [mediaUrl, setMediaUrl] = useState("");
  const [contentType, setContentType] = useState("image");
  const [isGeneratingTheme, setIsGeneratingTheme] = useState(false);
  const { toast } = useToast();

  const generateRandomTheme = async () => {
    setIsGeneratingTheme(true);
    try {
      const res = await fetch("/api/chains/random-theme");
      const data = await res.json();
      setTitle(data.theme);
      toast({ title: "Theme Generated!", description: "Use this as your starting point" });
    } catch {
      toast({ title: "Error", description: "Failed to generate theme", variant: "destructive" });
    }
    setIsGeneratingTheme(false);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/chains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          description, 
          visibility, 
          mediaUrl: mediaUrl || `https://image.pollinations.ai/prompt/${encodeURIComponent(title)}?width=800&height=600&seed=${Date.now()}`,
          contentType,
        }),
      });
      if (!res.ok) throw new Error("Failed to create chain");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Chain started!", description: "Others can now add to your story" });
      onSuccess();
      setOpen(false);
      setTitle("");
      setDescription("");
      setMediaUrl("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to start chain", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-white text-black border-4 border-black font-bold hover:bg-white/90 shadow-[4px_4px_0_0_rgba(255,255,255,0.3)]">
          <Plus className="w-5 h-5 mr-2" />
          START A CHAIN
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-neutral-900 border-4 border-black text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="font-black text-xl">START COMMUNITY CHAIN</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="font-bold">Theme / Title</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={generateRandomTheme}
                disabled={isGeneratingTheme}
                className="border-2 border-white/50 text-white hover:bg-white/10 text-xs"
                data-testid="random-theme-btn"
              >
                <Shuffle className="w-3 h-3 mr-1" />
                {isGeneratingTheme ? "..." : "RANDOM THEME"}
              </Button>
            </div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="The adventure begins..."
              className="bg-white/10 border-2 border-black text-white placeholder:text-white/50"
              data-testid="chain-title-input"
            />
          </div>

          <div>
            <Label className="font-bold">Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Set the scene for others to continue..."
              className="bg-white/10 border-2 border-black text-white placeholder:text-white/50"
            />
          </div>

          <div>
            <Label className="font-bold">Who can contribute?</Label>
            <RadioGroup value={visibility} onValueChange={setVisibility} className="mt-2">
              <div className="flex items-center space-x-2 p-3 bg-white/5 border-2 border-black">
                <RadioGroupItem value="public" id="public" className="border-white" />
                <Label htmlFor="public" className="flex items-center gap-2 cursor-pointer">
                  <Globe className="w-4 h-4" />
                  <div>
                    <p className="font-bold">Open Community</p>
                    <p className="text-xs text-white/50">Anyone on PS can add</p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 bg-white/5 border-2 border-black">
                <RadioGroupItem value="mutuals" id="mutuals" className="border-white" />
                <Label htmlFor="mutuals" className="flex items-center gap-2 cursor-pointer">
                  <Users className="w-4 h-4" />
                  <div>
                    <p className="font-bold">Mutuals Only</p>
                    <p className="text-xs text-white/50">Only people you both follow</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="font-bold">First Panel Type</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[
                { id: "image", icon: Image, label: "Image" },
                { id: "video", icon: Video, label: "Video" },
                { id: "drawing", icon: Pencil, label: "Drawing" },
                { id: "animation", icon: Play, label: "Anim" },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setContentType(type.id)}
                  className={`p-2 border-2 ${
                    contentType === type.id 
                      ? "border-white bg-white/20" 
                      : "border-white/30 hover:border-white/60"
                  } flex flex-col items-center gap-1`}
                >
                  <type.icon className="w-5 h-5" />
                  <span className="text-xs">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="font-bold">Media URL (optional)</Label>
            <Input
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="Leave empty for AI-generated image"
              className="bg-white/10 border-2 border-black text-white placeholder:text-white/50 text-sm"
            />
            <p className="text-xs text-white/50 mt-1">Or we'll generate art based on your theme!</p>
          </div>

          <Button 
            onClick={() => createMutation.mutate()}
            disabled={!title.trim() || createMutation.isPending}
            className="w-full bg-white text-black border-4 border-black font-bold hover:bg-white/90"
            data-testid="start-chain-submit"
          >
            {createMutation.isPending ? "STARTING..." : "START CHAIN"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChainCard({ chain, onClick }: { chain: CommunityChain; onClick: () => void }) {
  const getContentIcon = (type: string) => {
    switch (type) {
      case "video": return Video;
      case "drawing": return Pencil;
      case "animation": return Play;
      default: return Image;
    }
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white/5 border-4 border-black overflow-hidden cursor-pointer hover:bg-white/10 transition-colors shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
      data-testid={`chain-card-${chain.id}`}
    >
      <div className="aspect-video bg-neutral-800 relative overflow-hidden">
        {chain.thumbnail ? (
          <img 
            src={chain.thumbnail} 
            alt={chain.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/30">
            <Sparkles className="w-12 h-12" />
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-1">
          <span className={`text-xs font-bold px-2 py-0.5 ${
            chain.visibility === "public" 
              ? "bg-green-500 text-black" 
              : "bg-purple-500 text-white"
          }`}>
            {chain.visibility === "public" ? "OPEN" : "MUTUALS"}
          </span>
        </div>
        <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 text-xs font-bold">
          {chain.contributionCount} panels
        </div>
      </div>
      
      <div className="p-3">
        <h3 className="font-bold text-sm line-clamp-2 mb-1">{chain.title}</h3>
        <div className="flex items-center justify-between text-xs text-white/50">
          <span>by {chain.creator?.name || "Unknown"}</span>
          <span>{formatDistanceToNow(new Date(chain.updatedAt), { addSuffix: true })}</span>
        </div>
      </div>
    </div>
  );
}

function ChainViewer({ chainId, onClose }: { chainId: string; onClose: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [contributionUrl, setContributionUrl] = useState("");
  const [contributionCaption, setContributionCaption] = useState("");
  const [showContribute, setShowContribute] = useState(false);

  const { data: chain, isLoading } = useQuery<CommunityChain>({
    queryKey: ["/api/chains", chainId],
    queryFn: async () => {
      const res = await fetch(`/api/chains/${chainId}`);
      if (!res.ok) throw new Error("Failed to fetch chain");
      return res.json();
    },
  });

  const contributeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/chains/${chainId}/contribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaUrl: contributionUrl || `https://image.pollinations.ai/prompt/${encodeURIComponent(contributionCaption || chain?.title || "continue the story")}?width=800&height=600&seed=${Date.now()}`,
          contentType: "image",
          caption: contributionCaption,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Added!", description: "Your contribution is now part of the chain" });
      queryClient.invalidateQueries({ queryKey: ["/api/chains", chainId] });
      setContributionUrl("");
      setContributionCaption("");
      setShowContribute(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!chain) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-auto">
      <div className="sticky top-0 z-10 bg-black border-b-4 border-white p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Button variant="ghost" onClick={onClose} className="text-white hover:bg-white/10">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <h1 className="font-black text-lg truncate max-w-md">{chain.title}</h1>
          <Button
            onClick={() => setShowContribute(!showContribute)}
            className="bg-white text-black font-bold hover:bg-white/90"
            data-testid="contribute-btn"
          >
            <Plus className="w-4 h-4 mr-1" />
            ADD
          </Button>
        </div>
      </div>

      {showContribute && (
        <div className="bg-neutral-900 border-b-4 border-white p-4">
          <div className="max-w-md mx-auto space-y-3">
            <p className="text-sm text-white/70 text-center">Continue the story with your art!</p>
            <Input
              value={contributionCaption}
              onChange={(e) => setContributionCaption(e.target.value)}
              placeholder="Describe your panel (AI will generate art)"
              className="bg-white/10 border-2 border-black text-white placeholder:text-white/50"
              data-testid="contribution-caption"
            />
            <Input
              value={contributionUrl}
              onChange={(e) => setContributionUrl(e.target.value)}
              placeholder="Or paste image/video URL (optional)"
              className="bg-white/10 border-2 border-black text-white placeholder:text-white/50 text-sm"
            />
            <Button
              onClick={() => contributeMutation.mutate()}
              disabled={contributeMutation.isPending || (!contributionUrl && !contributionCaption)}
              className="w-full bg-white text-black font-bold"
              data-testid="submit-contribution"
            >
              {contributeMutation.isPending ? "Adding..." : "Add to Chain"}
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4">
        <div className="flex flex-col gap-4">
          {chain.contributions?.map((contribution, index) => (
            <div key={contribution.id} className="relative">
              {index > 0 && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <ChevronRight className="w-8 h-8 rotate-90 text-white/30" />
                </div>
              )}
              <div className="bg-white/5 border-4 border-black overflow-hidden">
                <div className="aspect-video bg-neutral-800 relative">
                  {contribution.contentType === "video" ? (
                    <video 
                      src={contribution.mediaUrl} 
                      controls 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img 
                      src={contribution.mediaUrl} 
                      alt={`Panel ${contribution.position}`}
                      className="w-full h-full object-contain"
                    />
                  )}
                  <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 text-xs font-bold">
                    #{contribution.position}
                  </div>
                </div>
                <div className="p-3">
                  {contribution.caption && (
                    <p className="text-sm mb-2">{contribution.caption}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span>by {contribution.user?.name || "Unknown"}</span>
                    <div className="flex items-center gap-3">
                      <button className="flex items-center gap-1 hover:text-white">
                        <Heart className="w-4 h-4" />
                        {contribution.likesCount}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {(!chain.contributions || chain.contributions.length === 0) && (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 mx-auto text-white/30 mb-4" />
            <p className="text-white/50">No panels yet. Be the first to contribute!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CommunityChains() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("public");
  const [selectedChain, setSelectedChain] = useState<string | null>(null);

  const { data: publicChains = [], isLoading: loadingPublic } = useQuery<CommunityChain[]>({
    queryKey: ["/api/chains/public"],
    queryFn: async () => {
      const res = await fetch("/api/chains/public");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: mutualsChains = [], isLoading: loadingMutuals } = useQuery<CommunityChain[]>({
    queryKey: ["/api/chains/mutuals"],
    queryFn: async () => {
      const res = await fetch("/api/chains/mutuals");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: myChains = [], isLoading: loadingMine } = useQuery<CommunityChain[]>({
    queryKey: ["/api/chains/mine"],
    queryFn: async () => {
      const res = await fetch("/api/chains/mine");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/chains/public"] });
    queryClient.invalidateQueries({ queryKey: ["/api/chains/mutuals"] });
    queryClient.invalidateQueries({ queryKey: ["/api/chains/mine"] });
  };

  const renderChains = (chains: CommunityChain[], loading: boolean, emptyMessage: string) => {
    if (loading) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto" />
        </div>
      );
    }

    if (chains.length === 0) {
      return (
        <div className="text-center py-12">
          <Link2 className="w-12 h-12 mx-auto text-white/30 mb-4" />
          <p className="text-white/50">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-4">
        {chains.map((chain) => (
          <ChainCard 
            key={chain.id} 
            chain={chain} 
            onClick={() => setSelectedChain(chain.id)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {selectedChain && (
        <ChainViewer chainId={selectedChain} onClose={() => setSelectedChain(null)} />
      )}

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
            <Link2 className="w-5 h-5" />
            COMMUNITY CHAINS
          </h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4">
        <div className="bg-gradient-to-br from-white/10 to-white/5 border-4 border-black p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-white" />
            <div>
              <h2 className="font-black text-lg">COLLABORATIVE COMICS</h2>
              <p className="text-white/70 text-sm">Start a story, let others continue!</p>
            </div>
          </div>
          <StartChainDialog onSuccess={handleRefresh} />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 bg-white/5 border-4 border-black rounded-none h-12">
            <TabsTrigger 
              value="public" 
              className="data-[state=active]:bg-white data-[state=active]:text-black font-bold text-xs"
            >
              <Globe className="w-4 h-4 mr-1" />
              OPEN
            </TabsTrigger>
            <TabsTrigger 
              value="mutuals" 
              className="data-[state=active]:bg-white data-[state=active]:text-black font-bold text-xs"
            >
              <Users className="w-4 h-4 mr-1" />
              MUTUALS
            </TabsTrigger>
            <TabsTrigger 
              value="mine" 
              className="data-[state=active]:bg-white data-[state=active]:text-black font-bold text-xs"
            >
              <Sparkles className="w-4 h-4 mr-1" />
              MINE
            </TabsTrigger>
          </TabsList>

          <TabsContent value="public" className="mt-4">
            {renderChains(publicChains, loadingPublic, "No open chains yet. Start one!")}
          </TabsContent>

          <TabsContent value="mutuals" className="mt-4">
            {renderChains(mutualsChains, loadingMutuals, "No chains from your mutuals yet")}
          </TabsContent>

          <TabsContent value="mine" className="mt-4">
            {renderChains(myChains, loadingMine, "You haven't started any chains")}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
