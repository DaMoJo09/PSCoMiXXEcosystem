import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Share2, Globe, Users, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PostComposerProps {
  projectId?: string;
  projectType: "comic" | "card" | "vn" | "cyoa" | "cover" | "motion";
  projectTitle?: string;
  projectThumbnail?: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function PostComposer({ 
  projectId, 
  projectType, 
  projectTitle, 
  projectThumbnail,
  trigger,
  onSuccess 
}: PostComposerProps) {
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState("public");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const postMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          type: projectType,
          caption,
          visibility,
          mediaUrls: projectThumbnail ? [projectThumbnail] : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to post");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/feed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/social/explore"] });
      toast({ 
        title: "Posted to Timeline!", 
        description: "Your creation is now visible to your followers." 
      });
      setCaption("");
      setOpen(false);
      onSuccess?.();
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to post. Please try again.", 
        variant: "destructive" 
      });
    },
  });

  const getTypeLabel = () => {
    switch (projectType) {
      case "comic": return "Comic";
      case "card": return "Trading Card";
      case "vn": return "Visual Novel";
      case "cyoa": return "CYOA Story";
      case "cover": return "Cover Art";
      case "motion": return "Motion Comic";
      default: return "Creation";
    }
  };

  const defaultTrigger = (
    <Button 
      variant="outline"
      className="border-2 border-black bg-white/10 text-white hover:bg-white/20 font-bold"
      data-testid="post-to-timeline-button"
    >
      <Share2 className="w-4 h-4 mr-2" />
      POST TO TIMELINE
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="bg-neutral-900 border-4 border-black text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="font-black text-xl">SHARE {getTypeLabel().toUpperCase()}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {projectThumbnail && (
            <div className="border-4 border-black overflow-hidden">
              <img 
                src={projectThumbnail} 
                alt={projectTitle || "Preview"} 
                className="w-full aspect-video object-cover"
              />
            </div>
          )}

          {projectTitle && (
            <div className="bg-white/5 border-2 border-black p-3">
              <p className="font-bold">{projectTitle}</p>
              <p className="text-white/50 text-sm">{getTypeLabel()}</p>
            </div>
          )}

          <div>
            <Label className="font-bold mb-2 block">Caption</Label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={`Share your ${getTypeLabel().toLowerCase()} with the community...`}
              className="bg-white/10 border-2 border-black text-white placeholder:text-white/50 min-h-[100px]"
              data-testid="post-caption-input"
            />
          </div>

          <div>
            <Label className="font-bold mb-2 block">Visibility</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger className="bg-white/10 border-2 border-black text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-2 border-black">
                <SelectItem value="public" className="text-white">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <span>Public - Everyone can see</span>
                  </div>
                </SelectItem>
                <SelectItem value="followers" className="text-white">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>Followers Only</span>
                  </div>
                </SelectItem>
                <SelectItem value="private" className="text-white">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    <span>Private - Only you</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={() => postMutation.mutate()}
            disabled={postMutation.isPending}
            className="w-full bg-white text-black border-4 border-black font-bold hover:bg-white/90 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
            data-testid="submit-post-button"
          >
            {postMutation.isPending ? "POSTING..." : "POST TO TIMELINE"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
