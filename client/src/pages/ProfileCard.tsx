import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, Camera, Zap, Sword, Palette, BookOpen, Users,
  Edit3, Save, X, Star, Trophy, Sparkles, ExternalLink, Twitter, Instagram, Globe
} from "lucide-react";
import { toast } from "sonner";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  coverImage: string | null;
  tagline: string | null;
  bio: string | null;
  creatorClass: string;
  xp: number;
  level: number;
  statCreativity: number;
  statStorytelling: number;
  statArtistry: number;
  statCollaboration: number;
  socialLinks: { twitter?: string; instagram?: string; website?: string } | null;
  createdAt: string;
  followers: number;
  following: number;
  postCount: number;
  projectCount: number;
}

const CREATOR_CLASSES = [
  { value: "Rookie", label: "ROOKIE", icon: Star },
  { value: "Artist", label: "ARTIST", icon: Palette },
  { value: "Writer", label: "WRITER", icon: BookOpen },
  { value: "Storyteller", label: "STORYTELLER", icon: Sparkles },
  { value: "Legend", label: "LEGEND", icon: Trophy },
];

export default function ProfileCard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [editForm, setEditForm] = useState<{
    name: string;
    tagline: string;
    bio: string;
    creatorClass: string;
    socialLinks: { twitter?: string; instagram?: string; website?: string };
  }>({
    name: "",
    tagline: "",
    bio: "",
    creatorClass: "Rookie",
    socialLinks: { twitter: "", instagram: "", website: "" },
  });

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<UserProfile>) => {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setIsEditing(false);
      toast.success("Profile updated!");
    },
    onError: () => {
      toast.error("Failed to update profile");
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: "avatar" | "cover" }) => {
      const reader = new FileReader();
      return new Promise<string>((resolve, reject) => {
        reader.onload = async (e) => {
          const dataUrl = e.target?.result as string;
          const res = await fetch("/api/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(type === "avatar" ? { avatar: dataUrl } : { coverImage: dataUrl }),
          });
          if (!res.ok) reject(new Error("Upload failed"));
          resolve(dataUrl);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast.success("Image uploaded!");
    },
    onError: () => {
      toast.error("Failed to upload image");
    },
  });

  const handleStartEdit = () => {
    if (profile) {
      setEditForm({
        name: profile.name,
        tagline: profile.tagline || "",
        bio: profile.bio || "",
        creatorClass: profile.creatorClass || "Rookie",
        socialLinks: profile.socialLinks || { twitter: "", instagram: "", website: "" },
      });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    updateProfileMutation.mutate(editForm);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "cover") => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImageMutation.mutate({ file, type });
    }
    e.target.value = "";
  };

  const getClassInfo = (className: string) => {
    return CREATOR_CLASSES.find(c => c.value === className) || CREATOR_CLASSES[0];
  };

  const xpToNextLevel = (profile?.level || 1) * 100;
  const xpProgress = ((profile?.xp || 0) % xpToNextLevel) / xpToNextLevel * 100;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-red-600 border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <p className="text-white/70">Please log in to view your profile</p>
        <Button onClick={() => navigate("/login")} className="mt-4 bg-red-600 text-white border-2 border-black">
          Login
        </Button>
      </div>
    );
  }

  const ClassInfo = getClassInfo(profile.creatorClass);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 8px, white 8px, white 9px)`
        }} />
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-red-600/10 to-transparent" />
        <div className="absolute bottom-0 left-0 w-2/3 h-1/2 bg-gradient-to-tr from-red-600/5 to-transparent" />
      </div>

      <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-sm border-b-4 border-red-600 p-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => window.history.back()}
            className="text-white hover:bg-red-600/20 hover:text-red-500"
            data-testid="back-button"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="font-black text-xl tracking-[0.3em] text-white uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            PROFILE CARD
          </h1>
          {isEditing ? (
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsEditing(false)}
                className="text-white hover:bg-white/10"
                data-testid="cancel-edit"
              >
                <X className="w-5 h-5" />
              </Button>
              <Button 
                size="icon"
                onClick={handleSave}
                className="bg-red-600 hover:bg-red-700 border-2 border-black"
                disabled={updateProfileMutation.isPending}
                data-testid="save-profile"
              >
                <Save className="w-5 h-5" />
              </Button>
            </div>
          ) : (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleStartEdit}
              className="text-white hover:bg-red-600/20 hover:text-red-500"
              data-testid="edit-profile"
            >
              <Edit3 className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 pb-24 relative">
        <div className="relative" style={{ perspective: "1000px" }}>
          <div 
            className="relative bg-black border-4 border-white overflow-hidden transform transition-transform duration-300 hover:scale-[1.02]"
            style={{
              clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)",
              boxShadow: "8px 8px 0 0 rgba(220,38,38,0.8), 12px 12px 0 0 rgba(0,0,0,1)"
            }}
          >
            <div className="absolute top-0 right-0 w-40 h-full bg-red-600 transform skew-x-[-12deg] translate-x-20 z-0" />
            <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-black via-black/80 to-transparent z-10" />
            
            <div className="absolute inset-0 opacity-20 pointer-events-none z-20" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: "8px 8px"
            }} />

            <div className="relative aspect-[3/4]">
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-900">
                {profile.avatar ? (
                  <img 
                    src={profile.avatar} 
                    alt={profile.name} 
                    className="w-full h-full object-cover"
                    style={{ filter: "contrast(1.1) saturate(0.9)" }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-black">
                    <span className="text-[12rem] font-black text-white/10" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {profile.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-red-600/30" />
                <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-black to-transparent" />
              </div>
              
              {isEditing && (
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute top-4 left-4 p-3 bg-red-600 text-white hover:bg-red-700 transition-colors border-2 border-white z-30"
                  data-testid="upload-avatar"
                >
                  <Camera className="w-5 h-5" />
                </button>
              )}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageUpload(e, "avatar")}
              />

              <div className="absolute top-4 right-4 z-30 flex flex-col items-end gap-2">
                <div className="bg-red-600 text-white px-4 py-2 font-black text-3xl border-2 border-white transform -skew-x-6 shadow-lg">
                  LV.{profile.level}
                </div>
                {isEditing ? (
                  <Select
                    value={editForm.creatorClass}
                    onValueChange={(val) => setEditForm({ ...editForm, creatorClass: val })}
                  >
                    <SelectTrigger className="w-36 bg-white text-black border-2 border-black font-black text-xs" data-testid="select-class">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-2 border-white">
                      {CREATOR_CLASSES.map((cls) => (
                        <SelectItem key={cls.value} value={cls.value} className="text-white hover:bg-red-600">
                          <span className="flex items-center gap-2 font-bold">
                            <cls.icon className="w-4 h-4" />
                            {cls.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="bg-white text-black px-3 py-1 font-black text-xs uppercase tracking-wider transform -skew-x-6 flex items-center gap-2">
                    <ClassInfo.icon className="w-4 h-4" />
                    {profile.creatorClass}
                  </div>
                )}
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                {isEditing ? (
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="font-black text-3xl bg-zinc-900/80 border-2 border-white h-auto py-2 px-3 text-white mb-2"
                    data-testid="input-name"
                  />
                ) : (
                  <div className="mb-2">
                    <h2 
                      className="font-black text-4xl md:text-5xl tracking-tight uppercase text-white leading-none"
                      style={{ 
                        fontFamily: "'Space Grotesk', sans-serif",
                        textShadow: "3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000"
                      }}
                    >
                      {profile.name}
                    </h2>
                    <div className="h-1 w-32 bg-red-600 mt-2 transform -skew-x-12" />
                  </div>
                )}

                {isEditing ? (
                  <Input
                    value={editForm.tagline}
                    onChange={(e) => setEditForm({ ...editForm, tagline: e.target.value })}
                    placeholder="Your epic tagline..."
                    className="bg-zinc-900/80 border border-white/50 text-white italic text-sm"
                    data-testid="input-tagline"
                  />
                ) : profile.tagline ? (
                  <p className="text-white/80 italic text-sm font-medium">"{profile.tagline}"</p>
                ) : null}
              </div>
            </div>

            <div className="relative z-10 bg-black border-t-4 border-white">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-red-500 tracking-widest flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    EXP
                  </span>
                  <span className="text-xs font-mono text-white/70">{profile.xp} / {xpToNextLevel}</span>
                </div>
                <div className="h-4 bg-zinc-900 border-2 border-white overflow-hidden transform -skew-x-6">
                  <div 
                    className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-500"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 border-t-2 border-white/30">
                {[
                  { label: "CR", value: profile.statCreativity, color: "text-red-500" },
                  { label: "ST", value: profile.statStorytelling, color: "text-white" },
                  { label: "AR", value: profile.statArtistry, color: "text-red-500" },
                  { label: "CO", value: profile.statCollaboration, color: "text-white" },
                ].map((stat, i) => (
                  <div 
                    key={stat.label} 
                    className={`text-center py-3 ${i > 0 ? "border-l-2 border-white/30" : ""}`}
                  >
                    <p className={`font-black text-2xl ${stat.color}`}>{stat.value}</p>
                    <p className="text-[10px] font-black text-white/50 tracking-widest">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 border-t-4 border-white">
                {[
                  { label: "POSTS", value: profile.postCount },
                  { label: "FOLLOWERS", value: profile.followers },
                  { label: "PROJECTS", value: profile.projectCount },
                ].map((stat, i) => (
                  <div 
                    key={stat.label} 
                    className={`text-center py-4 bg-zinc-900 ${i > 0 ? "border-l-2 border-white/30" : ""}`}
                  >
                    <p className="font-black text-3xl text-white">{stat.value}</p>
                    <p className="text-[9px] font-black text-red-500 tracking-widest">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute bottom-0 right-0 w-0 h-0 border-l-[30px] border-l-transparent border-b-[30px] border-b-red-600" />
          </div>
        </div>

        <div className="mt-6 bg-black border-4 border-white p-6" style={{
          clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)"
        }}>
          <h3 className="text-xs font-black uppercase tracking-widest text-red-500 mb-3 flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 transform rotate-45" />
            BIO
          </h3>
          {isEditing ? (
            <Textarea
              value={editForm.bio}
              onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              placeholder="Tell the world about your creative journey..."
              className="bg-zinc-900 border-2 border-white/50 min-h-[100px] resize-none text-white"
              data-testid="input-bio"
            />
          ) : profile.bio ? (
            <p className="text-white/80 text-sm leading-relaxed">{profile.bio}</p>
          ) : (
            <p className="text-white/40 text-sm italic">No bio yet...</p>
          )}
        </div>

        <div className="mt-4 bg-black border-4 border-white p-6" style={{
          clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)"
        }}>
          <h3 className="text-xs font-black uppercase tracking-widest text-red-500 mb-4 flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 transform rotate-45" />
            LINKS
          </h3>
          {isEditing ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-zinc-900 border-2 border-white flex items-center justify-center">
                  <Twitter className="w-5 h-5 text-white" />
                </div>
                <Input
                  value={editForm.socialLinks.twitter || ""}
                  onChange={(e) => setEditForm({ 
                    ...editForm, 
                    socialLinks: { ...editForm.socialLinks, twitter: e.target.value }
                  })}
                  placeholder="Twitter username"
                  className="bg-zinc-900 border-2 border-white/50 text-white flex-1"
                  data-testid="input-twitter"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-zinc-900 border-2 border-white flex items-center justify-center">
                  <Instagram className="w-5 h-5 text-white" />
                </div>
                <Input
                  value={editForm.socialLinks.instagram || ""}
                  onChange={(e) => setEditForm({ 
                    ...editForm, 
                    socialLinks: { ...editForm.socialLinks, instagram: e.target.value }
                  })}
                  placeholder="Instagram username"
                  className="bg-zinc-900 border-2 border-white/50 text-white flex-1"
                  data-testid="input-instagram"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-zinc-900 border-2 border-white flex items-center justify-center">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <Input
                  value={editForm.socialLinks.website || ""}
                  onChange={(e) => setEditForm({ 
                    ...editForm, 
                    socialLinks: { ...editForm.socialLinks, website: e.target.value }
                  })}
                  placeholder="Website URL"
                  className="bg-zinc-900 border-2 border-white/50 text-white flex-1"
                  data-testid="input-website"
                />
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              {profile.socialLinks?.twitter && (
                <a 
                  href={`https://twitter.com/${profile.socialLinks.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-zinc-900 hover:bg-red-600 transition-all border-2 border-white flex items-center justify-center transform -skew-x-6 hover:skew-x-0"
                  data-testid="link-twitter"
                >
                  <Twitter className="w-5 h-5 text-white" />
                </a>
              )}
              {profile.socialLinks?.instagram && (
                <a 
                  href={`https://instagram.com/${profile.socialLinks.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-zinc-900 hover:bg-red-600 transition-all border-2 border-white flex items-center justify-center transform -skew-x-6 hover:skew-x-0"
                  data-testid="link-instagram"
                >
                  <Instagram className="w-5 h-5 text-white" />
                </a>
              )}
              {profile.socialLinks?.website && (
                <a 
                  href={profile.socialLinks.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-zinc-900 hover:bg-red-600 transition-all border-2 border-white flex items-center justify-center transform -skew-x-6 hover:skew-x-0"
                  data-testid="link-website"
                >
                  <Globe className="w-5 h-5 text-white" />
                </a>
              )}
              {!profile.socialLinks?.twitter && !profile.socialLinks?.instagram && !profile.socialLinks?.website && (
                <p className="text-white/40 text-sm italic">No links added yet</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <Button
            onClick={() => navigate(`/social/profile/${profile.id}`)}
            className="bg-white text-black border-4 border-black font-black uppercase tracking-wider hover:bg-red-600 hover:text-white hover:border-red-600 transition-all transform -skew-x-6 px-10 py-6 text-lg"
            data-testid="view-public-profile"
          >
            <ExternalLink className="w-5 h-5 mr-2" />
            VIEW PUBLIC PROFILE
          </Button>
        </div>

        <div className="absolute bottom-20 left-0 w-40 h-1 bg-red-600 transform -skew-x-12" />
        <div className="absolute bottom-16 left-0 w-24 h-1 bg-white transform -skew-x-12" />
        <div className="absolute bottom-12 left-4 w-16 h-1 bg-red-600/50 transform -skew-x-12" />
      </div>
    </div>
  );
}
