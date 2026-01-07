import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, Camera, Upload, Zap, Sword, Palette, BookOpen, Users,
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

const StatBlock = ({ label, value, abbrev }: { label: string; value: number; abbrev: string }) => (
  <div className="flex items-center gap-1">
    <span className="text-red-500 font-black text-xs">{abbrev}</span>
    <span className="text-white font-mono font-bold text-sm">{value}</span>
  </div>
);

export default function ProfileCard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

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
        <div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full" />
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
      {/* Diagonal background pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 10px,
            white 10px,
            white 11px
          )`
        }} />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-50 bg-black border-b-4 border-red-600 p-4">
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
          <h1 className="font-black text-xl tracking-widest text-white uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            PROFILE
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

      <div className="max-w-2xl mx-auto p-4 pb-24 relative">
        {/* PERSONA CARD */}
        <div className="relative bg-black border-4 border-white overflow-hidden" style={{
          clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)"
        }}>
          
          {/* Red accent slash */}
          <div className="absolute top-0 right-0 w-32 h-full bg-red-600 transform skew-x-[-12deg] translate-x-16 z-0" />
          
          {/* Grungy overlay pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
          }} />

          {/* Main content area */}
          <div className="relative z-10 flex flex-col md:flex-row">
            
            {/* Left side - Avatar */}
            <div className="relative w-full md:w-2/5 aspect-square md:aspect-auto">
              <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-black">
                {profile.avatar ? (
                  <img 
                    src={profile.avatar} 
                    alt={profile.name} 
                    className="w-full h-full object-cover mix-blend-luminosity hover:mix-blend-normal transition-all duration-300"
                    style={{ filter: "contrast(1.2)" }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                    <span className="text-8xl font-black text-white/20">{profile.name.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                {/* Dramatic shadow overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/80" />
              </div>
              
              {isEditing && (
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-4 left-4 p-3 bg-red-600 text-white hover:bg-red-700 transition-colors border-2 border-black"
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
              
              {/* Level badge - angular style */}
              <div className="absolute top-4 left-4">
                <div className="relative">
                  <div className="bg-red-600 text-white px-4 py-2 font-black text-2xl border-2 border-black transform -skew-x-6">
                    LV.{profile.level}
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Info */}
            <div className="flex-1 p-6 relative">
              {/* Name with angular underline */}
              <div className="mb-4">
                {isEditing ? (
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="font-black text-3xl bg-zinc-900 border-2 border-white h-auto py-2 px-3 text-white"
                    data-testid="input-name"
                  />
                ) : (
                  <>
                    <h2 className="font-black text-3xl md:text-4xl tracking-tight uppercase text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {profile.name}
                    </h2>
                    <div className="h-1 w-24 bg-red-600 mt-2 transform -skew-x-12" />
                  </>
                )}
              </div>

              {/* Class badge */}
              <div className="mb-4">
                {isEditing ? (
                  <Select
                    value={editForm.creatorClass}
                    onValueChange={(val) => setEditForm({ ...editForm, creatorClass: val })}
                  >
                    <SelectTrigger className="w-48 bg-zinc-900 border-2 border-white text-white" data-testid="select-class">
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
                  <div className="inline-flex items-center gap-2 bg-white text-black px-3 py-1 font-black text-sm uppercase tracking-wider transform -skew-x-6">
                    <ClassInfo.icon className="w-4 h-4" />
                    {profile.creatorClass}
                  </div>
                )}
              </div>

              {/* Tagline */}
              <div className="mb-6">
                {isEditing ? (
                  <Input
                    value={editForm.tagline}
                    onChange={(e) => setEditForm({ ...editForm, tagline: e.target.value })}
                    placeholder="Your epic tagline..."
                    className="bg-zinc-900 border-2 border-white/50 text-white italic"
                    data-testid="input-tagline"
                  />
                ) : profile.tagline ? (
                  <p className="text-white/70 italic text-lg">"{profile.tagline}"</p>
                ) : null}
              </div>

              {/* XP Bar - Persona style */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-red-500 tracking-widest flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    EXPERIENCE
                  </span>
                  <span className="text-xs font-mono text-white/70">{profile.xp} / {xpToNextLevel}</span>
                </div>
                <div className="h-4 bg-zinc-900 border-2 border-white overflow-hidden transform -skew-x-6">
                  <div 
                    className="h-full bg-red-600 transition-all duration-500"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
              </div>

              {/* Stats row - card game style */}
              <div className="flex items-center gap-4 p-3 bg-zinc-900 border-2 border-white mb-6 transform -skew-x-3">
                <StatBlock label="Creativity" value={profile.statCreativity} abbrev="CR" />
                <div className="w-px h-6 bg-white/30" />
                <StatBlock label="Story" value={profile.statStorytelling} abbrev="ST" />
                <div className="w-px h-6 bg-white/30" />
                <StatBlock label="Art" value={profile.statArtistry} abbrev="AR" />
                <div className="w-px h-6 bg-white/30" />
                <StatBlock label="Collab" value={profile.statCollaboration} abbrev="CO" />
              </div>

              {/* Social stats */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                <div className="text-center p-2 bg-zinc-900 border border-white/30">
                  <p className="font-black text-2xl text-white">{profile.postCount}</p>
                  <p className="text-[10px] uppercase tracking-wider text-red-500 font-bold">POSTS</p>
                </div>
                <div className="text-center p-2 bg-zinc-900 border border-white/30">
                  <p className="font-black text-2xl text-white">{profile.followers}</p>
                  <p className="text-[10px] uppercase tracking-wider text-red-500 font-bold">FOLLOWERS</p>
                </div>
                <div className="text-center p-2 bg-zinc-900 border border-white/30">
                  <p className="font-black text-2xl text-white">{profile.projectCount}</p>
                  <p className="text-[10px] uppercase tracking-wider text-red-500 font-bold">PROJECTS</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bio Section */}
          <div className="relative z-10 px-6 py-4 border-t-2 border-white/20 bg-zinc-900/50">
            <h3 className="text-xs font-black uppercase tracking-widest text-red-500 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500" />
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

          {/* Social Links */}
          <div className="relative z-10 px-6 py-4 border-t-2 border-white/20">
            <h3 className="text-xs font-black uppercase tracking-widest text-red-500 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500" />
              LINKS
            </h3>
            {isEditing ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Twitter className="w-4 h-4 text-white" />
                  <Input
                    value={editForm.socialLinks.twitter || ""}
                    onChange={(e) => setEditForm({ 
                      ...editForm, 
                      socialLinks: { ...editForm.socialLinks, twitter: e.target.value }
                    })}
                    placeholder="Twitter username"
                    className="bg-zinc-900 border border-white/30 h-8 text-sm text-white"
                    data-testid="input-twitter"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Instagram className="w-4 h-4 text-white" />
                  <Input
                    value={editForm.socialLinks.instagram || ""}
                    onChange={(e) => setEditForm({ 
                      ...editForm, 
                      socialLinks: { ...editForm.socialLinks, instagram: e.target.value }
                    })}
                    placeholder="Instagram username"
                    className="bg-zinc-900 border border-white/30 h-8 text-sm text-white"
                    data-testid="input-instagram"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-white" />
                  <Input
                    value={editForm.socialLinks.website || ""}
                    onChange={(e) => setEditForm({ 
                      ...editForm, 
                      socialLinks: { ...editForm.socialLinks, website: e.target.value }
                    })}
                    placeholder="Website URL"
                    className="bg-zinc-900 border border-white/30 h-8 text-sm text-white"
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
                    className="p-3 bg-zinc-900 hover:bg-red-600 transition-colors border-2 border-white transform -skew-x-6"
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
                    className="p-3 bg-zinc-900 hover:bg-red-600 transition-colors border-2 border-white transform -skew-x-6"
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
                    className="p-3 bg-zinc-900 hover:bg-red-600 transition-colors border-2 border-white transform -skew-x-6"
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

          {/* Corner cut decoration */}
          <div className="absolute bottom-0 right-0 w-0 h-0 border-l-[20px] border-l-transparent border-b-[20px] border-b-red-600" />
        </div>

        {/* View Public Profile Button */}
        <div className="mt-6 text-center">
          <Button
            onClick={() => navigate(`/social/profile/${profile.id}`)}
            className="bg-white text-black border-4 border-black font-black uppercase tracking-wider hover:bg-red-600 hover:text-white hover:border-red-600 transition-all transform -skew-x-6 px-8"
            data-testid="view-public-profile"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            VIEW PUBLIC PROFILE
          </Button>
        </div>

        {/* Decorative elements */}
        <div className="absolute bottom-10 left-0 w-32 h-1 bg-red-600 transform -skew-x-12" />
        <div className="absolute bottom-6 left-0 w-20 h-1 bg-white transform -skew-x-12" />
      </div>
    </div>
  );
}
