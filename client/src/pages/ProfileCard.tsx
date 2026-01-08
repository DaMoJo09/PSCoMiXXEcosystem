import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, Camera, Zap, Palette, BookOpen, Users,
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
      return new Promise<any>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const dataUrl = e.target?.result as string;
            const res = await fetch("/api/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(type === "avatar" ? { avatar: dataUrl } : { coverImage: dataUrl }),
            });
            if (!res.ok) {
              reject(new Error("Upload failed"));
              return;
            }
            const updatedProfile = await res.json();
            resolve(updatedProfile);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/profile"], data);
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
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 8px, white 8px, white 9px)`
        }} />
        <div className="absolute top-0 right-0 w-1/2 h-full">
          <div className="absolute inset-0 bg-gradient-to-l from-red-600/30 via-red-600/10 to-transparent" />
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black to-transparent" />
      </div>

      <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-sm p-4 border-b-2 border-red-600">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => window.history.back()}
            className="text-white hover:bg-red-600/20 hover:text-red-500 border-2 border-white/30"
            data-testid="back-button"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-black tracking-[0.5em] text-white/50 uppercase">
              CONFIDANT
            </span>
          </div>

          {isEditing ? (
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsEditing(false)}
                className="text-white hover:bg-white/10 border-2 border-white/30"
                data-testid="cancel-edit"
              >
                <X className="w-5 h-5" />
              </Button>
              <Button 
                size="icon"
                onClick={handleSave}
                className="bg-red-600 hover:bg-red-700 border-2 border-white"
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
              className="text-white hover:bg-red-600/20 hover:text-red-500 border-2 border-white/30"
              data-testid="edit-profile"
            >
              <Edit3 className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      <div className="relative flex flex-col md:flex-row min-h-[calc(100vh-65px)]">
        <div className="flex-1 relative flex items-end justify-center p-4 md:p-8 order-1 md:order-1">
          <div className="relative w-full max-w-md h-[50vh] md:h-[85vh]">
            {profile.avatar ? (
              <div className="absolute inset-0 flex items-end justify-center">
                <img 
                  src={profile.avatar} 
                  alt={profile.name} 
                  className="max-h-full max-w-full object-contain"
                  style={{ 
                    filter: "contrast(1.3) saturate(0.7) brightness(0.9)",
                    mixBlendMode: "luminosity"
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span 
                  className="text-[30rem] font-black text-white/5 leading-none select-none"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {profile.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {isEditing && (
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-red-600 text-white hover:bg-red-700 transition-colors border-2 border-white font-bold flex items-center gap-2 z-30"
                data-testid="upload-avatar"
              >
                <Camera className="w-5 h-5" />
                CHANGE PHOTO
              </button>
            )}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageUpload(e, "avatar")}
            />

            <div className="absolute bottom-0 left-0 right-0 z-20">
              {isEditing ? (
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="font-black text-5xl bg-transparent border-b-4 border-white h-auto py-2 text-white uppercase tracking-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  data-testid="input-name"
                />
              ) : (
                <h1 
                  className="text-5xl md:text-7xl font-black uppercase tracking-tight text-white leading-none"
                  style={{ 
                    fontFamily: "'Space Grotesk', sans-serif",
                    textShadow: "4px 4px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 0 20px rgba(220,38,38,0.5)"
                  }}
                >
                  {profile.name}
                </h1>
              )}
              
              {isEditing ? (
                <Input
                  value={editForm.tagline}
                  onChange={(e) => setEditForm({ ...editForm, tagline: e.target.value })}
                  placeholder="Your tagline..."
                  className="mt-2 bg-black/50 border border-white/30 text-white italic text-lg"
                  data-testid="input-tagline"
                />
              ) : profile.tagline ? (
                <p className="text-white/70 italic text-lg mt-2 max-w-xs">{profile.tagline}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="w-full md:w-96 flex flex-col gap-4 p-4 md:p-6 pb-8 order-2 md:order-2 overflow-y-auto relative z-10">
          <div 
            className="bg-black border-4 border-white p-4"
            style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <Select
                    value={editForm.creatorClass}
                    onValueChange={(val) => setEditForm({ ...editForm, creatorClass: val })}
                  >
                    <SelectTrigger className="w-32 bg-zinc-900 border border-white text-white font-bold text-xs" data-testid="select-class">
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
                  <div className="flex items-center gap-2">
                    <ClassInfo.icon className="w-5 h-5 text-red-500" />
                    <span className="font-black text-sm uppercase tracking-wide">{profile.creatorClass}</span>
                  </div>
                )}
              </div>
              <div className="bg-red-600 text-white px-3 py-1 font-black text-xl transform -skew-x-6 border-2 border-white">
                {profile.level}
              </div>
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-red-500" />
              <span className="text-xs font-bold text-white/70">RANK</span>
            </div>
            <div className="flex gap-1 mb-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div 
                  key={i} 
                  className={`w-full h-3 border border-white/50 ${i < profile.level ? 'bg-red-600' : 'bg-transparent'}`}
                />
              ))}
            </div>
            <p className="text-xs text-white/50 text-right">{profile.xp} XP</p>
          </div>

          <div 
            className="bg-black border-4 border-white p-4"
            style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)" }}
          >
            <h3 className="text-xs font-black text-red-500 mb-3 tracking-widest">STATS</h3>
            <div className="space-y-3">
              {[
                { label: "CREATIVITY", value: profile.statCreativity, icon: Sparkles },
                { label: "STORYTELLING", value: profile.statStorytelling, icon: BookOpen },
                { label: "ARTISTRY", value: profile.statArtistry, icon: Palette },
                { label: "COLLAB", value: profile.statCollaboration, icon: Users },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-3">
                  <stat.icon className="w-4 h-4 text-white/50" />
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-bold text-white/70">{stat.label}</span>
                      <span className="font-black text-red-500">{stat.value}</span>
                    </div>
                    <div className="h-2 bg-zinc-800 border border-white/30">
                      <div className="h-full bg-red-600" style={{ width: `${stat.value}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "POSTS", value: profile.postCount },
              { label: "FOLLOWERS", value: profile.followers },
              { label: "PROJECTS", value: profile.projectCount },
            ].map((stat) => (
              <div 
                key={stat.label}
                className="bg-black border-2 border-white p-3 text-center"
              >
                <p className="font-black text-2xl text-white">{stat.value}</p>
                <p className="text-[8px] font-bold text-red-500 tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>

          <div 
            className="bg-black border-4 border-white p-4"
            style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)" }}
          >
            <h3 className="text-xs font-black text-red-500 mb-2 tracking-widest">BIO</h3>
            {isEditing ? (
              <Textarea
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                placeholder="Tell your story..."
                className="bg-zinc-900 border border-white/30 min-h-[80px] resize-none text-white text-sm"
                data-testid="input-bio"
              />
            ) : profile.bio ? (
              <p className="text-white/70 text-sm leading-relaxed">{profile.bio}</p>
            ) : (
              <p className="text-white/30 text-sm italic">No bio yet...</p>
            )}
          </div>

          <div className="bg-black border-4 border-white p-4">
            <h3 className="text-xs font-black text-red-500 mb-3 tracking-widest">LINKS</h3>
            {isEditing ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Twitter className="w-4 h-4 text-white/50" />
                  <Input
                    value={editForm.socialLinks.twitter || ""}
                    onChange={(e) => setEditForm({ 
                      ...editForm, 
                      socialLinks: { ...editForm.socialLinks, twitter: e.target.value }
                    })}
                    placeholder="@username"
                    className="bg-zinc-900 border border-white/30 text-white text-sm h-8"
                    data-testid="input-twitter"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Instagram className="w-4 h-4 text-white/50" />
                  <Input
                    value={editForm.socialLinks.instagram || ""}
                    onChange={(e) => setEditForm({ 
                      ...editForm, 
                      socialLinks: { ...editForm.socialLinks, instagram: e.target.value }
                    })}
                    placeholder="@username"
                    className="bg-zinc-900 border border-white/30 text-white text-sm h-8"
                    data-testid="input-instagram"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-white/50" />
                  <Input
                    value={editForm.socialLinks.website || ""}
                    onChange={(e) => setEditForm({ 
                      ...editForm, 
                      socialLinks: { ...editForm.socialLinks, website: e.target.value }
                    })}
                    placeholder="https://..."
                    className="bg-zinc-900 border border-white/30 text-white text-sm h-8"
                    data-testid="input-website"
                  />
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                {profile.socialLinks?.twitter && (
                  <a 
                    href={`https://twitter.com/${profile.socialLinks.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-zinc-900 hover:bg-red-600 transition-all border-2 border-white flex items-center justify-center"
                    data-testid="link-twitter"
                  >
                    <Twitter className="w-5 h-5" />
                  </a>
                )}
                {profile.socialLinks?.instagram && (
                  <a 
                    href={`https://instagram.com/${profile.socialLinks.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-zinc-900 hover:bg-red-600 transition-all border-2 border-white flex items-center justify-center"
                    data-testid="link-instagram"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {profile.socialLinks?.website && (
                  <a 
                    href={profile.socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-zinc-900 hover:bg-red-600 transition-all border-2 border-white flex items-center justify-center"
                    data-testid="link-website"
                  >
                    <Globe className="w-5 h-5" />
                  </a>
                )}
                {!profile.socialLinks?.twitter && !profile.socialLinks?.instagram && !profile.socialLinks?.website && (
                  <p className="text-white/30 text-xs italic">No links yet</p>
                )}
              </div>
            )}
          </div>

          <Button
            onClick={() => navigate(`/social/profile/${profile.id}`)}
            className="w-full bg-white text-black border-4 border-black font-black uppercase tracking-wider hover:bg-red-600 hover:text-white hover:border-red-600 transition-all py-6"
            data-testid="view-public-profile"
          >
            <ExternalLink className="w-5 h-5 mr-2" />
            VIEW PUBLIC PROFILE
          </Button>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-white to-red-600 z-50" />
      <div className="hidden md:block fixed top-1/2 left-0 w-1 h-40 bg-red-600 transform -translate-y-1/2" />
    </div>
  );
}
