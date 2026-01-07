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
  { value: "Rookie", label: "Rookie", icon: Star, color: "text-gray-400" },
  { value: "Artist", label: "Artist", icon: Palette, color: "text-pink-500" },
  { value: "Writer", label: "Writer", icon: BookOpen, color: "text-blue-500" },
  { value: "Storyteller", label: "Storyteller", icon: Sparkles, color: "text-purple-500" },
  { value: "Legend", label: "Legend", icon: Trophy, color: "text-yellow-500" },
];

const StatBar = ({ label, value, max = 100, icon: Icon, color }: { 
  label: string; 
  value: number; 
  max?: number; 
  icon: any; 
  color: string;
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 ${color}`} />
          <span className="font-bold uppercase tracking-wider">{label}</span>
        </div>
        <span className="font-mono font-bold">{value}</span>
      </div>
      <div className="h-2 bg-black/50 border border-white/20 overflow-hidden">
        <div 
          className={`h-full ${color.replace('text-', 'bg-')} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

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

  const getClassIcon = (className: string) => {
    const cls = CREATOR_CLASSES.find(c => c.value === className);
    return cls || CREATOR_CLASSES[0];
  };

  const xpToNextLevel = (profile?.level || 1) * 100;
  const xpProgress = ((profile?.xp || 0) % xpToNextLevel) / xpToNextLevel * 100;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <p className="text-white/70">Please log in to view your profile</p>
        <Button onClick={() => navigate("/login")} className="mt-4 bg-white text-black">
          Login
        </Button>
      </div>
    );
  }

  const CreatorClassInfo = getClassIcon(profile.creatorClass);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-sm border-b-2 border-white/20 p-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => window.history.back()}
            className="text-white hover:bg-white/10"
            data-testid="back-button"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="font-black text-lg tracking-tight bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            CREATOR PROFILE
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
                className="bg-green-500 hover:bg-green-600"
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
              className="text-white hover:bg-white/10"
              data-testid="edit-profile"
            >
              <Edit3 className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 pb-24">
        {/* PERSONA CARD */}
        <div className="relative bg-gradient-to-br from-zinc-900 to-zinc-950 border-4 border-white shadow-[8px_8px_0px_0px_rgba(0,255,255,0.3)] overflow-hidden">
          
          {/* Cover Image */}
          <div className="relative h-32 sm:h-40 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600">
            {profile.coverImage && (
              <img 
                src={profile.coverImage} 
                alt="Cover" 
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            {isEditing && (
              <button
                onClick={() => coverInputRef.current?.click()}
                className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                data-testid="upload-cover"
              >
                <Camera className="w-5 h-5" />
              </button>
            )}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageUpload(e, "cover")}
            />
          </div>

          {/* Avatar & Level Badge */}
          <div className="relative px-4 -mt-12 sm:-mt-16">
            <div className="relative inline-block">
              <div className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-white bg-zinc-900 overflow-hidden shadow-[4px_4px_0px_0px_rgba(255,0,255,0.5)]">
                {profile.avatar ? (
                  <img 
                    src={profile.avatar} 
                    alt={profile.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-500 to-purple-600 text-4xl sm:text-5xl font-black">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {isEditing && (
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-white text-black hover:bg-white/90 transition-colors border-2 border-black"
                  data-testid="upload-avatar"
                >
                  <Upload className="w-4 h-4" />
                </button>
              )}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageUpload(e, "avatar")}
              />
              {/* Level Badge */}
              <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 border-2 border-black flex items-center justify-center font-black text-black text-lg shadow-brutal">
                {profile.level}
              </div>
            </div>
          </div>

          {/* Name & Class */}
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {isEditing ? (
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="font-black text-2xl bg-white/10 border-2 border-white h-auto py-1 px-2"
                    data-testid="input-name"
                  />
                ) : (
                  <h2 className="font-black text-2xl sm:text-3xl tracking-tight">{profile.name}</h2>
                )}
                
                <div className="flex items-center gap-2 mt-1">
                  {isEditing ? (
                    <Select
                      value={editForm.creatorClass}
                      onValueChange={(val) => setEditForm({ ...editForm, creatorClass: val })}
                    >
                      <SelectTrigger className="w-40 h-8 bg-white/10 border-2 border-white/50" data-testid="select-class">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CREATOR_CLASSES.map((cls) => (
                          <SelectItem key={cls.value} value={cls.value}>
                            <span className="flex items-center gap-2">
                              <cls.icon className={`w-4 h-4 ${cls.color}`} />
                              {cls.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className={`flex items-center gap-1.5 text-sm font-bold ${CreatorClassInfo.color}`}>
                      <CreatorClassInfo.icon className="w-4 h-4" />
                      {profile.creatorClass}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Tagline */}
            <div className="mt-3">
              {isEditing ? (
                <Input
                  value={editForm.tagline}
                  onChange={(e) => setEditForm({ ...editForm, tagline: e.target.value })}
                  placeholder="Your epic tagline..."
                  className="bg-white/10 border-2 border-white/50 italic"
                  data-testid="input-tagline"
                />
              ) : profile.tagline ? (
                <p className="text-white/70 italic">"{profile.tagline}"</p>
              ) : null}
            </div>
          </div>

          {/* XP Bar */}
          <div className="px-4 py-3 border-t-2 border-white/10">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                EXPERIENCE
              </span>
              <span className="text-xs font-mono">{profile.xp} / {xpToNextLevel} XP</span>
            </div>
            <div className="h-3 bg-black border-2 border-cyan-500/50 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="px-4 py-4 border-t-2 border-white/10 grid grid-cols-2 gap-3">
            <StatBar 
              label="Creativity" 
              value={profile.statCreativity} 
              icon={Sparkles} 
              color="text-pink-500"
            />
            <StatBar 
              label="Storytelling" 
              value={profile.statStorytelling} 
              icon={BookOpen} 
              color="text-blue-500"
            />
            <StatBar 
              label="Artistry" 
              value={profile.statArtistry} 
              icon={Palette} 
              color="text-purple-500"
            />
            <StatBar 
              label="Collab" 
              value={profile.statCollaboration} 
              icon={Users} 
              color="text-green-500"
            />
          </div>

          {/* Bio Section */}
          <div className="px-4 py-4 border-t-2 border-white/10">
            <h3 className="text-xs font-black uppercase tracking-wider text-white/50 mb-2">BIO</h3>
            {isEditing ? (
              <Textarea
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                placeholder="Tell the world about your creative journey..."
                className="bg-white/10 border-2 border-white/50 min-h-[100px] resize-none"
                data-testid="input-bio"
              />
            ) : profile.bio ? (
              <p className="text-white/80 text-sm leading-relaxed">{profile.bio}</p>
            ) : (
              <p className="text-white/40 text-sm italic">No bio yet...</p>
            )}
          </div>

          {/* Social Links */}
          <div className="px-4 py-4 border-t-2 border-white/10">
            <h3 className="text-xs font-black uppercase tracking-wider text-white/50 mb-3">LINKS</h3>
            {isEditing ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Twitter className="w-4 h-4 text-[#1DA1F2]" />
                  <Input
                    value={editForm.socialLinks.twitter || ""}
                    onChange={(e) => setEditForm({ 
                      ...editForm, 
                      socialLinks: { ...editForm.socialLinks, twitter: e.target.value }
                    })}
                    placeholder="Twitter username"
                    className="bg-white/10 border border-white/30 h-8 text-sm"
                    data-testid="input-twitter"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Instagram className="w-4 h-4 text-[#E4405F]" />
                  <Input
                    value={editForm.socialLinks.instagram || ""}
                    onChange={(e) => setEditForm({ 
                      ...editForm, 
                      socialLinks: { ...editForm.socialLinks, instagram: e.target.value }
                    })}
                    placeholder="Instagram username"
                    className="bg-white/10 border border-white/30 h-8 text-sm"
                    data-testid="input-instagram"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <Input
                    value={editForm.socialLinks.website || ""}
                    onChange={(e) => setEditForm({ 
                      ...editForm, 
                      socialLinks: { ...editForm.socialLinks, website: e.target.value }
                    })}
                    placeholder="Website URL"
                    className="bg-white/10 border border-white/30 h-8 text-sm"
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
                    className="p-2 bg-white/10 hover:bg-[#1DA1F2]/20 transition-colors border border-white/20"
                    data-testid="link-twitter"
                  >
                    <Twitter className="w-5 h-5 text-[#1DA1F2]" />
                  </a>
                )}
                {profile.socialLinks?.instagram && (
                  <a 
                    href={`https://instagram.com/${profile.socialLinks.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-white/10 hover:bg-[#E4405F]/20 transition-colors border border-white/20"
                    data-testid="link-instagram"
                  >
                    <Instagram className="w-5 h-5 text-[#E4405F]" />
                  </a>
                )}
                {profile.socialLinks?.website && (
                  <a 
                    href={profile.socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-white/10 hover:bg-cyan-500/20 transition-colors border border-white/20"
                    data-testid="link-website"
                  >
                    <Globe className="w-5 h-5 text-cyan-400" />
                  </a>
                )}
                {!profile.socialLinks?.twitter && !profile.socialLinks?.instagram && !profile.socialLinks?.website && (
                  <p className="text-white/40 text-sm italic">No links added yet</p>
                )}
              </div>
            )}
          </div>

          {/* Quick Stats Footer */}
          <div className="grid grid-cols-3 divide-x-2 divide-white/10 border-t-2 border-white/10 bg-white/5">
            <div className="py-3 text-center">
              <p className="font-black text-xl">{profile.postCount}</p>
              <p className="text-[10px] uppercase tracking-wider text-white/50">Posts</p>
            </div>
            <div className="py-3 text-center">
              <p className="font-black text-xl">{profile.followers}</p>
              <p className="text-[10px] uppercase tracking-wider text-white/50">Followers</p>
            </div>
            <div className="py-3 text-center">
              <p className="font-black text-xl">{profile.projectCount}</p>
              <p className="text-[10px] uppercase tracking-wider text-white/50">Projects</p>
            </div>
          </div>

          {/* Card Border Decorations */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-cyan-400" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-purple-500" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-pink-500" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-yellow-400" />
        </div>

        {/* View Public Profile */}
        <div className="mt-6 text-center">
          <Button
            variant="outline"
            onClick={() => navigate(`/social/profile/${profile.id}`)}
            className="border-2 border-white/30 text-white/70 hover:bg-white/10"
            data-testid="view-public-profile"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Public Profile
          </Button>
        </div>
      </div>
    </div>
  );
}
