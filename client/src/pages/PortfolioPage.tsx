import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import {
  Edit2, Save, X, ExternalLink, Plus, Trash2, Eye, EyeOff,
  BookOpen, Palette, Clock, Award, Users, Globe, Instagram,
  Twitter, Link2, ChevronRight, Layers, Sparkles, FileText,
  Image as ImageIcon, Film, Gamepad2, BookMarked, Pencil
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ImageUpload";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

interface Project {
  id: string;
  userId: string;
  title: string;
  type: string;
  status: string;
  data: any;
  thumbnail: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Artwork {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  category: string;
  medium: string | null;
  dimensions: { width: number; height: number; depth?: number; unit: string } | null;
  year: number | null;
  price: number | null;
  available: boolean | null;
  featured: boolean | null;
  images: string[];
  tags: string[] | null;
  createdAt: string;
  updatedAt: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  coverImage: string | null;
  tagline: string | null;
  bio: string | null;
  creatorClass: string | null;
  xp: number;
  level: number;
  totalMinutes: number;
  accountType: string;
  socialLinks: { twitter?: string; instagram?: string; website?: string; youtube?: string } | null;
  statCreativity: number;
  statStorytelling: number;
  statArtistry: number;
  statCollaboration: number;
}

const PROJECT_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  comic: { label: "Comic", icon: BookOpen, color: "text-cyan-400 border-cyan-400" },
  card: { label: "Trading Card", icon: Layers, color: "text-yellow-400 border-yellow-400" },
  vn: { label: "Visual Novel", icon: BookMarked, color: "text-purple-400 border-purple-400" },
  cyoa: { label: "CYOA", icon: Gamepad2, color: "text-green-400 border-green-400" },
  cover: { label: "Cover Art", icon: ImageIcon, color: "text-pink-400 border-pink-400" },
  motion: { label: "Motion Comic", icon: Film, color: "text-orange-400 border-orange-400" },
};

const ARTWORK_CATEGORIES = [
  { id: "all", name: "All" },
  { id: "digital", name: "Digital" },
  { id: "mixed-media", name: "Mixed Media" },
  { id: "paintings", name: "Paintings" },
  { id: "prints", name: "Prints" },
  { id: "sculptures", name: "Sculptures" }
];

export default function PortfolioPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [activeSection, setActiveSection] = useState<"published" | "wip" | "artwork">("published");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isAddArtworkOpen, setIsAddArtworkOpen] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<Artwork | null>(null);
  const [artworkCategory, setArtworkCategory] = useState("all");

  const [profileForm, setProfileForm] = useState({
    name: "",
    tagline: "",
    bio: "",
    avatar: "",
    coverImage: "",
    creatorClass: "",
    socialLinks: { twitter: "", instagram: "", website: "", youtube: "" }
  });

  const [artworkForm, setArtworkForm] = useState({
    title: "",
    description: "",
    category: "digital",
    medium: "",
    year: new Date().getFullYear(),
    price: 0,
    available: true,
    featured: false,
    images: [""],
    tags: ""
  });

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  const { data: artworks = [] } = useQuery<Artwork[]>({
    queryKey: ["/api/portfolio"],
    queryFn: async () => {
      const res = await fetch("/api/portfolio", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  const publishedProjects = useMemo(() =>
    projects.filter(p => p.status === "published" || p.status === "approved"),
    [projects]
  );

  const wipProjects = useMemo(() =>
    projects.filter(p => p.status === "draft" || p.status === "review" || p.status === "rejected"),
    [projects]
  );

  const filteredArtworks = useMemo(() =>
    artworkCategory === "all" ? artworks : artworks.filter((a: Artwork) => a.category === artworkCategory),
    [artworks, artworkCategory]
  );

  const profileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setEditMode(false);
      toast.success("Profile updated");
    },
    onError: () => toast.error("Failed to update profile"),
  });

  const createArtworkMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create artwork");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      setIsAddArtworkOpen(false);
      resetArtworkForm();
      toast.success("Artwork added");
    },
    onError: () => toast.error("Failed to add artwork"),
  });

  const updateArtworkMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/portfolio/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update artwork");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      setEditingArtwork(null);
      resetArtworkForm();
      toast.success("Artwork updated");
    },
    onError: () => toast.error("Failed to update artwork"),
  });

  const deleteArtworkMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/portfolio/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      toast.success("Artwork removed");
    },
    onError: () => toast.error("Failed to delete artwork"),
  });

  const startEditMode = () => {
    if (profile) {
      setProfileForm({
        name: profile.name || "",
        tagline: profile.tagline || "",
        bio: profile.bio || "",
        avatar: profile.avatar || "",
        coverImage: profile.coverImage || "",
        creatorClass: profile.creatorClass || "Rookie",
        socialLinks: {
          twitter: (profile.socialLinks as any)?.twitter || "",
          instagram: (profile.socialLinks as any)?.instagram || "",
          website: (profile.socialLinks as any)?.website || "",
          youtube: (profile.socialLinks as any)?.youtube || "",
        }
      });
    }
    setEditMode(true);
  };

  const saveProfile = () => {
    const updates: any = {};
    if (profileForm.name) updates.name = profileForm.name;
    if (profileForm.tagline !== undefined) updates.tagline = profileForm.tagline;
    if (profileForm.bio !== undefined) updates.bio = profileForm.bio;
    if (profileForm.avatar !== undefined) updates.avatar = profileForm.avatar;
    if (profileForm.coverImage !== undefined) updates.coverImage = profileForm.coverImage;
    if (profileForm.creatorClass) updates.creatorClass = profileForm.creatorClass;
    const links = profileForm.socialLinks;
    if (links.twitter || links.instagram || links.website || links.youtube) {
      updates.socialLinks = links;
    }
    profileMutation.mutate(updates);
  };

  const resetArtworkForm = () => {
    setArtworkForm({
      title: "", description: "", category: "digital", medium: "",
      year: new Date().getFullYear(), price: 0, available: true,
      featured: false, images: [""], tags: ""
    });
  };

  const openEditArtwork = (artwork: Artwork) => {
    setEditingArtwork(artwork);
    setArtworkForm({
      title: artwork.title,
      description: artwork.description || "",
      category: artwork.category,
      medium: artwork.medium || "",
      year: artwork.year || new Date().getFullYear(),
      price: artwork.price || 0,
      available: artwork.available ?? true,
      featured: artwork.featured ?? false,
      images: artwork.images?.length ? artwork.images : [""],
      tags: artwork.tags?.join(", ") || ""
    });
  };

  const submitArtwork = () => {
    const data = {
      title: artworkForm.title,
      description: artworkForm.description || null,
      category: artworkForm.category,
      medium: artworkForm.medium || null,
      dimensions: null,
      year: artworkForm.year,
      price: artworkForm.price,
      available: artworkForm.available,
      featured: artworkForm.featured,
      images: artworkForm.images.filter(img => img.trim()),
      tags: artworkForm.tags.split(",").map(t => t.trim()).filter(Boolean)
    };
    if (editingArtwork) {
      updateArtworkMutation.mutate({ id: editingArtwork.id, data });
    } else {
      createArtworkMutation.mutate(data);
    }
  };

  const getProjectTypeConfig = (type: string) =>
    PROJECT_TYPE_CONFIG[type] || { label: type, icon: FileText, color: "text-zinc-400 border-zinc-400" };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      published: "bg-green-500/20 text-green-400 border-green-500",
      approved: "bg-cyan-500/20 text-cyan-400 border-cyan-500",
      draft: "bg-zinc-700/50 text-zinc-400 border-zinc-600",
      review: "bg-yellow-500/20 text-yellow-400 border-yellow-500",
      rejected: "bg-red-500/20 text-red-400 border-red-500",
    };
    return styles[status] || "bg-zinc-700/50 text-zinc-400 border-zinc-600";
  };

  const navigateToProject = (project: Project) => {
    const routes: Record<string, string> = {
      comic: `/comic-creator/${project.id}`,
      card: `/card-creator/${project.id}`,
      vn: `/vn-creator/${project.id}`,
      cyoa: `/cyoa-builder/${project.id}`,
      cover: `/cover-creator/${project.id}`,
      motion: `/motion-studio/${project.id}`,
    };
    navigate(routes[project.type] || `/dashboard`);
  };

  const getThumbnail = (project: Project) => {
    if (project.thumbnail) return project.thumbnail;
    const data = project.data as any;
    if (data?.pages?.[0]?.panels?.[0]?.content) return data.pages[0].panels[0].content;
    if (data?.coverImage) return data.coverImage;
    if (data?.thumbnail) return data.thumbnail;
    return null;
  };

  if (!user) {
    return (
      <Layout>
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center space-y-4">
            <Palette className="w-16 h-16 mx-auto text-cyan-400" />
            <h1 className="text-3xl font-black" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              MY PORTFOLIO
            </h1>
            <p className="text-zinc-400">Sign in to view and edit your portfolio</p>
            <Button onClick={() => navigate("/auth")} className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold" data-testid="btn-sign-in">
              SIGN IN
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white">
        {/* HERO / COVER SECTION */}
        <div className="relative">
          <div
            className="h-56 md:h-72 bg-gradient-to-br from-zinc-900 via-zinc-800 to-black border-b-4 border-cyan-500 relative overflow-hidden"
            style={profile?.coverImage ? { backgroundImage: `url(${profile.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
          >
            <div className="absolute inset-0 bg-black/50" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

            {editMode && (
              <div className="absolute top-4 right-4 z-10">
                <ImageUpload
                  label="Cover Image"
                  value={profileForm.coverImage}
                  onChange={(v) => setProfileForm({ ...profileForm, coverImage: v })}
                />
              </div>
            )}
          </div>

          <div className="max-w-6xl mx-auto px-6 relative">
            <div className="flex items-end gap-6 -mt-16 relative z-10">
              <div className="relative">
                <div className="w-32 h-32 border-4 border-cyan-500 bg-zinc-900 overflow-hidden flex-shrink-0" style={{ boxShadow: '4px 4px 0 rgba(0,255,255,0.3)' }}>
                  {(editMode ? profileForm.avatar : profile?.avatar) ? (
                    <img
                      src={editMode ? profileForm.avatar : profile?.avatar || ""}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl font-black text-cyan-400">
                      {(profile?.name || "?")[0].toUpperCase()}
                    </div>
                  )}
                </div>
                {editMode && (
                  <div className="absolute -bottom-2 -right-2">
                    <ImageUpload
                      label=""
                      value={profileForm.avatar}
                      onChange={(v) => setProfileForm({ ...profileForm, avatar: v })}
                    />
                  </div>
                )}
              </div>

              <div className="flex-1 pb-2">
                {editMode ? (
                  <div className="space-y-2">
                    <Input
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="bg-zinc-900 border-cyan-500 text-white text-2xl font-black h-12"
                      placeholder="Your Name"
                      data-testid="input-profile-name"
                    />
                    <Input
                      value={profileForm.tagline}
                      onChange={(e) => setProfileForm({ ...profileForm, tagline: e.target.value })}
                      className="bg-zinc-900 border-zinc-700 text-zinc-300"
                      placeholder="Your tagline / catchphrase"
                      data-testid="input-profile-tagline"
                    />
                  </div>
                ) : (
                  <div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }} data-testid="text-profile-name">
                      {profile?.name || "Creator"}
                    </h1>
                    {profile?.tagline && (
                      <p className="text-cyan-400 text-lg mt-1" data-testid="text-profile-tagline">{profile.tagline}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="pb-2 flex gap-2">
                {editMode ? (
                  <>
                    <Button onClick={saveProfile} disabled={profileMutation.isPending} className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold" data-testid="btn-save-profile">
                      <Save className="w-4 h-4 mr-2" /> SAVE
                    </Button>
                    <Button onClick={() => setEditMode(false)} variant="outline" className="border-zinc-600 text-zinc-400" data-testid="btn-cancel-edit">
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <Button onClick={startEditMode} variant="outline" className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/10" data-testid="btn-edit-portfolio">
                    <Edit2 className="w-4 h-4 mr-2" /> EDIT PORTFOLIO
                  </Button>
                )}
              </div>
            </div>

            {/* STATS ROW */}
            <div className="flex flex-wrap items-center gap-4 mt-6 pb-6 border-b border-zinc-800">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-700">
                <Award className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-bold">LVL {profile?.level || 1}</span>
                <span className="text-xs text-zinc-500">{profile?.xp || 0} XP</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-700">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-bold">{profile?.creatorClass || "Rookie"}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-700">
                <BookOpen className="w-4 h-4 text-green-400" />
                <span className="text-sm">{publishedProjects.length} Published</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-700">
                <Clock className="w-4 h-4 text-orange-400" />
                <span className="text-sm">{wipProjects.length} In Progress</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-700">
                <Palette className="w-4 h-4 text-purple-400" />
                <span className="text-sm">{artworks.length} Artworks</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-700">
                <Clock className="w-4 h-4 text-zinc-400" />
                <span className="text-sm">{Math.round((profile?.totalMinutes || 0) / 60)}h studio time</span>
              </div>

              {/* Social Links */}
              {!editMode && profile?.socialLinks && (
                <div className="flex items-center gap-2 ml-auto">
                  {(profile.socialLinks as any)?.twitter && (
                    <a href={(profile.socialLinks as any).twitter.startsWith("http") ? (profile.socialLinks as any).twitter : `https://twitter.com/${(profile.socialLinks as any).twitter.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="p-2 text-zinc-400 hover:text-cyan-400 transition-colors" data-testid="link-twitter">
                      <Twitter className="w-4 h-4" />
                    </a>
                  )}
                  {(profile.socialLinks as any)?.instagram && (
                    <a href={(profile.socialLinks as any).instagram.startsWith("http") ? (profile.socialLinks as any).instagram : `https://instagram.com/${(profile.socialLinks as any).instagram.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="p-2 text-zinc-400 hover:text-pink-400 transition-colors" data-testid="link-instagram">
                      <Instagram className="w-4 h-4" />
                    </a>
                  )}
                  {(profile.socialLinks as any)?.website && (
                    <a href={(profile.socialLinks as any).website.startsWith("http") ? (profile.socialLinks as any).website : `https://${(profile.socialLinks as any).website}`} target="_blank" rel="noreferrer" className="p-2 text-zinc-400 hover:text-green-400 transition-colors" data-testid="link-website">
                      <Globe className="w-4 h-4" />
                    </a>
                  )}
                  {(profile.socialLinks as any)?.youtube && (
                    <a href={(profile.socialLinks as any).youtube.startsWith("http") ? (profile.socialLinks as any).youtube : `https://youtube.com/${(profile.socialLinks as any).youtube}`} target="_blank" rel="noreferrer" className="p-2 text-zinc-400 hover:text-red-400 transition-colors" data-testid="link-youtube">
                      <Link2 className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* ABOUT / BIO SECTION */}
          <section className="mb-10">
            {editMode ? (
              <div className="space-y-4 p-6 border-2 border-cyan-500/30 bg-zinc-900/50">
                <h2 className="text-xl font-black text-cyan-400">EDIT PROFILE</h2>
                <div>
                  <Label className="text-zinc-400">Bio</Label>
                  <Textarea
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    className="bg-zinc-900 border-zinc-700 text-white min-h-[100px]"
                    placeholder="Tell visitors about yourself, your creative journey, and what inspires you..."
                    data-testid="input-profile-bio"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-zinc-400">Creator Class</Label>
                    <Select value={profileForm.creatorClass} onValueChange={(v) => setProfileForm({ ...profileForm, creatorClass: v })}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        {["Rookie", "Artist", "Writer", "Storyteller", "Illustrator", "Animator", "Designer", "Visionary"].map(c => (
                          <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-zinc-400 flex items-center gap-1"><Twitter className="w-3 h-3" /> Twitter</Label>
                    <Input
                      value={profileForm.socialLinks.twitter}
                      onChange={(e) => setProfileForm({ ...profileForm, socialLinks: { ...profileForm.socialLinks, twitter: e.target.value } })}
                      className="bg-zinc-900 border-zinc-700 text-white"
                      placeholder="@handle"
                      data-testid="input-social-twitter"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400 flex items-center gap-1"><Instagram className="w-3 h-3" /> Instagram</Label>
                    <Input
                      value={profileForm.socialLinks.instagram}
                      onChange={(e) => setProfileForm({ ...profileForm, socialLinks: { ...profileForm.socialLinks, instagram: e.target.value } })}
                      className="bg-zinc-900 border-zinc-700 text-white"
                      placeholder="@handle"
                      data-testid="input-social-instagram"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400 flex items-center gap-1"><Globe className="w-3 h-3" /> Website</Label>
                    <Input
                      value={profileForm.socialLinks.website}
                      onChange={(e) => setProfileForm({ ...profileForm, socialLinks: { ...profileForm.socialLinks, website: e.target.value } })}
                      className="bg-zinc-900 border-zinc-700 text-white"
                      placeholder="https://yoursite.com"
                      data-testid="input-social-website"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400 flex items-center gap-1"><Link2 className="w-3 h-3" /> YouTube</Label>
                    <Input
                      value={profileForm.socialLinks.youtube}
                      onChange={(e) => setProfileForm({ ...profileForm, socialLinks: { ...profileForm.socialLinks, youtube: e.target.value } })}
                      className="bg-zinc-900 border-zinc-700 text-white"
                      placeholder="Channel URL"
                      data-testid="input-social-youtube"
                    />
                  </div>
                </div>
              </div>
            ) : profile?.bio ? (
              <div className="p-6 border-l-4 border-cyan-500 bg-zinc-900/30">
                <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap" data-testid="text-profile-bio">{profile.bio}</p>
              </div>
            ) : (
              <div className="p-6 border border-dashed border-zinc-700 text-center">
                <p className="text-zinc-500">No bio yet. Click "Edit Portfolio" to add one!</p>
              </div>
            )}
          </section>

          {/* SECTION TABS */}
          <div className="flex border-b-2 border-zinc-800 mb-8">
            <button
              onClick={() => setActiveSection("published")}
              className={`px-6 py-3 font-bold text-sm transition-colors relative ${
                activeSection === "published"
                  ? "text-cyan-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              data-testid="tab-published"
            >
              <span className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                PUBLISHED WORKS ({publishedProjects.length})
              </span>
              {activeSection === "published" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />}
            </button>
            <button
              onClick={() => setActiveSection("wip")}
              className={`px-6 py-3 font-bold text-sm transition-colors relative ${
                activeSection === "wip"
                  ? "text-yellow-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              data-testid="tab-wip"
            >
              <span className="flex items-center gap-2">
                <Pencil className="w-4 h-4" />
                WORKS IN PROGRESS ({wipProjects.length})
              </span>
              {activeSection === "wip" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400" />}
            </button>
            <button
              onClick={() => setActiveSection("artwork")}
              className={`px-6 py-3 font-bold text-sm transition-colors relative ${
                activeSection === "artwork"
                  ? "text-purple-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              data-testid="tab-artwork"
            >
              <span className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                ARTWORK ({artworks.length})
              </span>
              {activeSection === "artwork" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400" />}
            </button>
          </div>

          {/* PUBLISHED WORKS */}
          {activeSection === "published" && (
            <section>
              {publishedProjects.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-zinc-700">
                  <BookOpen className="w-12 h-12 mx-auto text-zinc-600 mb-4" />
                  <p className="text-zinc-500 mb-2">No published works yet</p>
                  <p className="text-zinc-600 text-sm">Finish and publish your projects to showcase them here</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {publishedProjects.map(project => {
                    const typeConfig = getProjectTypeConfig(project.type);
                    const TypeIcon = typeConfig.icon;
                    const thumb = getThumbnail(project);
                    return (
                      <div
                        key={project.id}
                        className="group border-2 border-zinc-700 hover:border-cyan-500 bg-zinc-900/50 cursor-pointer transition-all hover:shadow-[4px_4px_0_rgba(0,255,255,0.2)]"
                        onClick={() => setSelectedProject(project)}
                        data-testid={`project-card-${project.id}`}
                      >
                        <div className="aspect-[4/3] relative overflow-hidden bg-zinc-800">
                          {thumb ? (
                            <img src={thumb} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <TypeIcon className={`w-16 h-16 ${typeConfig.color.split(' ')[0]} opacity-30`} />
                            </div>
                          )}
                          <div className="absolute top-2 left-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-bold border ${typeConfig.color} bg-black/80`}>
                              <TypeIcon className="w-3 h-3" />
                              {typeConfig.label.toUpperCase()}
                            </span>
                          </div>
                          <div className="absolute top-2 right-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-bold border ${getStatusBadge(project.status)}`}>
                              {project.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="p-4 border-t border-zinc-700">
                          <h3 className="font-black text-lg mb-1 truncate" data-testid={`text-project-title-${project.id}`}>{project.title}</h3>
                          <p className="text-zinc-500 text-xs">
                            Updated {new Date(project.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* WORKS IN PROGRESS */}
          {activeSection === "wip" && (
            <section>
              {wipProjects.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-zinc-700">
                  <Pencil className="w-12 h-12 mx-auto text-zinc-600 mb-4" />
                  <p className="text-zinc-500 mb-2">No works in progress</p>
                  <p className="text-zinc-600 text-sm">Start a new project from the dashboard</p>
                  <Button onClick={() => navigate("/dashboard")} variant="outline" className="mt-4 border-yellow-500 text-yellow-400" data-testid="btn-go-dashboard">
                    GO TO DASHBOARD
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {wipProjects.map(project => {
                    const typeConfig = getProjectTypeConfig(project.type);
                    const TypeIcon = typeConfig.icon;
                    const thumb = getThumbnail(project);
                    return (
                      <div
                        key={project.id}
                        className="group border-2 border-zinc-800 hover:border-yellow-500 bg-zinc-900/30 cursor-pointer transition-all hover:shadow-[4px_4px_0_rgba(234,179,8,0.15)]"
                        onClick={() => navigateToProject(project)}
                        data-testid={`wip-card-${project.id}`}
                      >
                        <div className="aspect-[4/3] relative overflow-hidden bg-zinc-800/50">
                          {thumb ? (
                            <img src={thumb} alt={project.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <TypeIcon className={`w-16 h-16 ${typeConfig.color.split(' ')[0]} opacity-20`} />
                            </div>
                          )}
                          <div className="absolute top-2 left-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-bold border ${typeConfig.color} bg-black/80`}>
                              <TypeIcon className="w-3 h-3" />
                              {typeConfig.label.toUpperCase()}
                            </span>
                          </div>
                          <div className="absolute top-2 right-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-bold border ${getStatusBadge(project.status)}`}>
                              {project.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="flex items-center gap-1 px-3 py-1.5 bg-yellow-500 text-black text-xs font-bold">
                              CONTINUE <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                        <div className="p-4 border-t border-zinc-800">
                          <h3 className="font-black text-lg mb-1 truncate" data-testid={`text-wip-title-${project.id}`}>{project.title}</h3>
                          <p className="text-zinc-500 text-xs">
                            Last edited {new Date(project.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ADDITIONAL ARTWORK */}
          {activeSection === "artwork" && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex gap-2 flex-wrap">
                  {ARTWORK_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setArtworkCategory(cat.id)}
                      className={`px-3 py-1 text-xs font-bold border transition-colors ${
                        artworkCategory === cat.id
                          ? "bg-purple-500 text-black border-purple-500"
                          : "border-zinc-700 text-zinc-400 hover:border-purple-500"
                      }`}
                      data-testid={`artwork-cat-${cat.id}`}
                    >
                      {cat.name.toUpperCase()}
                    </button>
                  ))}
                </div>
                <Dialog open={isAddArtworkOpen || !!editingArtwork} onOpenChange={(open) => {
                  if (!open) { setIsAddArtworkOpen(false); setEditingArtwork(null); resetArtworkForm(); }
                }}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setIsAddArtworkOpen(true)} variant="outline" className="border-purple-500 text-purple-400 hover:bg-purple-500/10" data-testid="btn-add-artwork">
                      <Plus className="w-4 h-4 mr-2" /> ADD ARTWORK
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-zinc-900 border-2 border-purple-500 text-white max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-black text-purple-400">{editingArtwork ? "EDIT ARTWORK" : "ADD ARTWORK"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto pr-2">
                      <div>
                        <Label className="text-zinc-400">Title *</Label>
                        <Input value={artworkForm.title} onChange={(e) => setArtworkForm({ ...artworkForm, title: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white" data-testid="input-artwork-title" />
                      </div>
                      <div>
                        <Label className="text-zinc-400">Description</Label>
                        <Textarea value={artworkForm.description} onChange={(e) => setArtworkForm({ ...artworkForm, description: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white" data-testid="input-artwork-description" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-zinc-400">Category</Label>
                          <Select value={artworkForm.category} onValueChange={(v) => setArtworkForm({ ...artworkForm, category: v })}>
                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-700">
                              {ARTWORK_CATEGORIES.filter(c => c.id !== "all").map(cat => (
                                <SelectItem key={cat.id} value={cat.id} className="text-white">{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-zinc-400">Medium</Label>
                          <Input value={artworkForm.medium} onChange={(e) => setArtworkForm({ ...artworkForm, medium: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white" placeholder="e.g., Digital Painting" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-zinc-400">Year</Label>
                          <Input type="number" value={artworkForm.year} onChange={(e) => setArtworkForm({ ...artworkForm, year: parseInt(e.target.value) })} className="bg-zinc-800 border-zinc-700 text-white" />
                        </div>
                        <div>
                          <Label className="text-zinc-400">Price (cents)</Label>
                          <Input type="number" value={artworkForm.price} onChange={(e) => setArtworkForm({ ...artworkForm, price: parseInt(e.target.value) })} className="bg-zinc-800 border-zinc-700 text-white" />
                        </div>
                      </div>
                      <ImageUpload label="Artwork Image" value={artworkForm.images[0]} onChange={(value) => setArtworkForm({ ...artworkForm, images: [value] })} />
                      <div>
                        <Label className="text-zinc-400">Tags (comma-separated)</Label>
                        <Input value={artworkForm.tags} onChange={(e) => setArtworkForm({ ...artworkForm, tags: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white" placeholder="digital, portrait, noir" />
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                          <input type="checkbox" checked={artworkForm.available} onChange={(e) => setArtworkForm({ ...artworkForm, available: e.target.checked })} className="w-4 h-4" />
                          Available for Sale
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                          <input type="checkbox" checked={artworkForm.featured} onChange={(e) => setArtworkForm({ ...artworkForm, featured: e.target.checked })} className="w-4 h-4" />
                          Featured
                        </label>
                      </div>
                      <Button onClick={submitArtwork} disabled={!artworkForm.title || createArtworkMutation.isPending || updateArtworkMutation.isPending} className="w-full bg-purple-500 hover:bg-purple-600 text-black font-bold" data-testid="btn-save-artwork">
                        {editingArtwork ? "UPDATE" : "ADD TO PORTFOLIO"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {filteredArtworks.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-zinc-700">
                  <Palette className="w-12 h-12 mx-auto text-zinc-600 mb-4" />
                  <p className="text-zinc-500 mb-2">No artworks yet</p>
                  <p className="text-zinc-600 text-sm">Add your standalone artwork pieces here</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredArtworks.map((artwork: Artwork) => (
                    <div
                      key={artwork.id}
                      className="group border-2 border-zinc-800 hover:border-purple-500 bg-zinc-900/30 transition-all hover:shadow-[4px_4px_0_rgba(168,85,247,0.15)]"
                      data-testid={`artwork-card-${artwork.id}`}
                    >
                      <div className="aspect-[3/4] relative overflow-hidden bg-zinc-800/50">
                        {artwork.images?.[0] ? (
                          <img src={artwork.images[0]} alt={artwork.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600">
                            <ImageIcon className="w-12 h-12 opacity-30" />
                          </div>
                        )}
                        {artwork.featured && (
                          <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-400 text-black text-xs font-bold">FEATURED</div>
                        )}
                        <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditArtwork(artwork); }}
                            className="p-2 bg-black/80 border border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-black"
                            data-testid={`btn-edit-artwork-${artwork.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteArtworkMutation.mutate(artwork.id); }}
                            className="p-2 bg-black/80 border border-red-500 text-red-400 hover:bg-red-500 hover:text-black"
                            data-testid={`btn-delete-artwork-${artwork.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="p-4 border-t border-zinc-800">
                        <h3 className="font-bold truncate">{artwork.title}</h3>
                        <p className="text-zinc-500 text-sm">{artwork.medium || artwork.category} {artwork.year ? `• ${artwork.year}` : ""}</p>
                        {artwork.price ? (
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-bold text-green-400">${(artwork.price / 100).toFixed(2)}</span>
                            {artwork.available === false && <span className="text-xs text-red-400">SOLD</span>}
                          </div>
                        ) : null}
                        {artwork.tags && artwork.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(artwork.tags as string[]).slice(0, 3).map(tag => (
                              <span key={tag} className="px-1.5 py-0.5 bg-zinc-800 text-zinc-500 text-[10px]">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* PROJECT DETAIL MODAL */}
        {selectedProject && (
          <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
            <DialogContent className="max-w-3xl bg-zinc-900 border-2 border-cyan-500 p-0 text-white">
              <div className="relative">
                {getThumbnail(selectedProject) && (
                  <img src={getThumbnail(selectedProject)!} alt={selectedProject.title} className="w-full max-h-[50vh] object-contain bg-black" />
                )}
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-black" data-testid="text-modal-title">{selectedProject.title}</h2>
                    <div className="flex items-center gap-2 mt-2">
                      {(() => {
                        const tc = getProjectTypeConfig(selectedProject.type);
                        const TIcon = tc.icon;
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-bold border ${tc.color}`}>
                            <TIcon className="w-3 h-3" /> {tc.label.toUpperCase()}
                          </span>
                        );
                      })()}
                      <span className={`inline-flex px-2 py-1 text-xs font-bold border ${getStatusBadge(selectedProject.status)}`}>
                        {selectedProject.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-zinc-400 text-sm mb-4">
                  Created {new Date(selectedProject.createdAt).toLocaleDateString()} • Updated {new Date(selectedProject.updatedAt).toLocaleDateString()}
                </p>
                <div className="flex gap-3">
                  <Button onClick={() => { setSelectedProject(null); navigateToProject(selectedProject); }} className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold" data-testid="btn-open-project">
                    <ExternalLink className="w-4 h-4 mr-2" /> OPEN IN EDITOR
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Layout>
  );
}
