import { Layout } from "@/components/layout/Layout";
import { Plus, ArrowRight, Clock, Star, Trash2, LogOut, Folder, Wrench, Wand2, BookOpen, Sparkles, Zap, Megaphone, Camera, Globe, GraduationCap, Tv, Building2, Award, Lock, CheckCircle2, Trophy, Shield, Gamepad2, Film, CreditCard, Printer, User, Users, ShoppingBag, Upload, ImagePlus, Share2, Palette, ChevronDown, ChevronUp, GitBranch, Crown } from "lucide-react";
import { ThumbnailPicker } from "@/components/ThumbnailPicker";
import { useLocation } from "wouter";
import { useProjects, useDeleteProject, useCreateProject } from "@/hooks/useProjects";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { useState } from "react";
import { EventCarousel } from "@/components/EventCarousel";
import { OnboardingWizard, useOnboarding } from "@/components/OnboardingWizard";
import { XPWidget } from "@/components/XPWidget";
import { useSubscription } from "@/hooks/use-subscription";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import noirComic from "@assets/generated_images/noir_comic_panel.png";
import cardArt from "@assets/generated_images/cyberpunk_trading_card_art.png";
import vnBg from "@assets/generated_images/visual_novel_background.png";
import coverArt from "@assets/generated_images/comic_cover_art.png";
import motionThumb from "@assets/generated_images/motion_timeline_interface.png";

const typeImages: Record<string, string> = {
  comic: noirComic,
  card: cardArt,
  vn: vnBg,
  cover: coverArt,
  motion: motionThumb,
  cyoa: vnBg,
};

const typeLabels: Record<string, string> = {
  comic: "Comic",
  card: "Card Set",
  vn: "Visual Novel",
  cover: "Cover Art",
  motion: "Motion",
  cyoa: "CYOA",
  hop: "HOP",
};

const CERT_ICON_MAP: Record<string, any> = {
  BookOpen, Gamepad2, Globe, Film, CreditCard, Award, Trophy, Star, Shield,
};

const CERT_ACCENT_COLORS = [
  { border: "border-green-500", bg: "bg-green-500/10", text: "text-green-400", bar: "bg-green-500" },
  { border: "border-orange-500", bg: "bg-orange-500/10", text: "text-orange-400", bar: "bg-orange-500" },
  { border: "border-pink-500", bg: "bg-pink-500/10", text: "text-pink-400", bar: "bg-pink-500" },
  { border: "border-purple-500", bg: "bg-purple-500/10", text: "text-purple-400", bar: "bg-purple-500" },
  { border: "border-cyan-500", bg: "bg-cyan-500/10", text: "text-cyan-400", bar: "bg-cyan-500" },
  { border: "border-yellow-500", bg: "bg-yellow-500/10", text: "text-yellow-400", bar: "bg-yellow-500" },
];

const primaryModes = [
  {
    title: "New Comic",
    href: "/creator/comic",
    type: "comic",
    desc: "Sequential art builder with panels, bubbles, and AI tools",
    icon: Palette,
    color: "border-l-cyan-500",
  },
  {
    title: "New Card",
    href: "/creator/card",
    type: "card",
    desc: "Design trading cards with stats, art, and collectible effects",
    icon: CreditCard,
    color: "border-l-green-500",
  },
  {
    title: "New Motion",
    href: "/creator/motion",
    type: "motion",
    desc: "Animate frames on a timeline with audio and keyframes",
    icon: Film,
    color: "border-l-amber-500",
  },
];

const moreModes = [
  { title: "Visual Novel", href: "/creator/vn", type: "vn", desc: "Interactive fiction engine", icon: BookOpen },
  { title: "CYOA Story", href: "/creator/cyoa", type: "cyoa", desc: "Branching narrative builder", icon: GitBranch },
  { title: "HOP", href: "/creator/hop", type: "hop", desc: "Hot One-Page Stories", icon: Zap },
  { title: "FX Studio", href: "/fx-studio", type: "fx", desc: "Visual effects library", icon: Sparkles },
];

export default function Dashboard() {
  const { data: projects, isLoading } = useProjects();
  const deleteProject = useDeleteProject();
  const createProject = useCreateProject();
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { completed: onboardingComplete, markComplete: markOnboardingComplete } = useOnboarding(user?.id);
  const { getMaxProjects, tier, getTierName } = useSubscription();
  const maxProjects = getMaxProjects();
  const projectCount = projects?.length || 0;
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectType, setNewProjectType] = useState("comic");
  const [moreToolsOpen, setMoreToolsOpen] = useState(false);

  const { data: certs = [] } = useQuery<any[]>({
    queryKey: ["/api/certifications"],
    queryFn: async () => {
      const res = await fetch("/api/certifications", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  const handleDelete = async (id: string) => {
    try {
      await deleteProject.mutateAsync(id);
      toast.success("Project deleted");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectTitle.trim()) {
      toast.error("Please enter a project title");
      return;
    }

    try {
      const project = await createProject.mutateAsync({
        title: newProjectTitle,
        type: newProjectType,
        status: "draft",
        data: {},
        forceNew: true,
      });
      toast.success("Project created");
      setNewProjectOpen(false);
      setNewProjectTitle("");
      navigate(`/creator/${newProjectType}?id=${project.id}`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleQuickCreate = async (type: string, href: string) => {
    if (type === "fx") {
      navigate(href);
      return;
    }
    try {
      const project = await createProject.mutateAsync({
        title: `Untitled ${typeLabels[type] || type}`,
        type,
        status: "draft",
        data: {},
        forceNew: true,
      });
      navigate(`${href}?id=${project.id}`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <Layout>
      {!onboardingComplete && <OnboardingWizard onComplete={markOnboardingComplete} />}
      <div className="p-8 max-w-7xl mx-auto space-y-12">
        <EventCarousel className="mb-4" variant="dark" />

        <div className="flex items-end justify-between border-b border-border pb-6">
          <div>
            <h1
              className="text-2xl sm:text-3xl font-black uppercase tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              data-testid="text-dashboard-title"
            >
              Create. Publish. Get seen. Level up.
            </h1>
            <p className="text-muted-foreground mt-2 font-mono text-sm" data-testid="text-welcome">
              Welcome back, {user?.name}.
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={logout}
              className="px-4 py-2 bg-secondary hover:bg-border transition-colors font-medium text-sm border border-border flex items-center gap-2"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
            <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
              <DialogTrigger asChild>
                <button
                  className="px-4 py-2 bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium text-sm flex items-center gap-2 shadow-hard-sm"
                  data-testid="button-new-project"
                >
                  <Plus className="w-4 h-4" />
                  New Project
                </button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-950 border-white/20">
                <DialogHeader>
                  <DialogTitle className="text-white">Create New Project</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label className="text-white">Project Title</Label>
                    <Input
                      value={newProjectTitle}
                      onChange={(e) => setNewProjectTitle(e.target.value)}
                      placeholder="My Awesome Project"
                      className="bg-zinc-900 border-white/20 text-white"
                      data-testid="input-project-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Project Type</Label>
                    <select
                      value={newProjectType}
                      onChange={(e) => setNewProjectType(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/20 text-white p-2 rounded"
                      data-testid="select-project-type"
                    >
                      <option value="comic">Comic</option>
                      <option value="card">Trading Card</option>
                      <option value="vn">Visual Novel</option>
                      <option value="cyoa">CYOA</option>
                      <option value="motion">Motion Graphics</option>
                      <option value="hop">HOP</option>
                    </select>
                  </div>
                  <Button
                    onClick={handleCreateProject}
                    className="w-full bg-white text-black hover:bg-zinc-200"
                    disabled={createProject.isPending}
                    data-testid="button-create-project"
                  >
                    {createProject.isPending ? "Creating..." : "Create Project"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <XPWidget />

        {certs.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-bold flex items-center gap-2">
                <Award className="w-5 h-5" /> Certifications
              </h2>
              <button
                onClick={() => navigate("/certifications")}
                className="text-sm text-cyan-400 hover:underline font-mono flex items-center gap-1"
                data-testid="link-view-all-certs"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {certs.map((cert: any, i: number) => {
                const accent = CERT_ACCENT_COLORS[i % CERT_ACCENT_COLORS.length];
                const IconComp = CERT_ICON_MAP[cert.icon] || Award;
                const xpPct = cert.progress?.xp?.required > 0 ? Math.min((cert.progress.xp.current / cert.progress.xp.required) * 100, 100) : 0;
                const projPct = cert.requiredProjectCount > 0 ? Math.min((cert.progress?.projects?.current / cert.requiredProjectCount) * 100, 100) : 0;
                const pubPct = cert.requiredPublished > 0 ? Math.min((cert.progress?.published?.current / cert.requiredPublished) * 100, 100) : 0;

                return (
                  <div
                    key={cert.id}
                    className={`border-2 ${cert.earned ? "border-green-500" : "border-zinc-700"} bg-card p-5 relative overflow-hidden`}
                    style={{ borderTopWidth: "4px", borderTopColor: cert.earned ? undefined : undefined }}
                    data-testid={`hub-cert-${cert.slug}`}
                  >
                    <div className={`absolute top-0 left-0 right-0 h-1 ${cert.earned ? "bg-green-500" : accent.bar}`} />

                    <div className="flex items-start gap-3 mb-4">
                      <div className={`p-2 border ${cert.earned ? "border-green-500 bg-green-500/10" : `${accent.border} ${accent.bg}`}`}>
                        <IconComp className={`w-6 h-6 ${cert.earned ? "text-green-400" : accent.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-black uppercase tracking-tight truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                          {cert.title}
                        </h3>
                        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                          {cert.description}
                        </p>
                      </div>
                      {cert.earned ? (
                        <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold text-green-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> EARNED
                        </span>
                      ) : (
                        <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold text-zinc-500">
                          <Lock className="w-3.5 h-3.5" /> LOCKED
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-[10px] font-bold mb-0.5">
                          <span className="text-zinc-400">XP</span>
                          <span className={cert.progress?.xp?.met ? "text-green-400" : accent.text}>
                            {(cert.progress?.xp?.current || 0).toLocaleString()} / {(cert.progress?.xp?.required || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 overflow-hidden">
                          <div className={`h-full transition-all ${cert.progress?.xp?.met ? "bg-green-500" : accent.bar}`} style={{ width: `${xpPct}%` }} />
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between text-[10px] font-bold mb-0.5">
                            <span className="text-zinc-400">Projects</span>
                            <span className={cert.progress?.projects?.met ? "text-green-400" : "text-zinc-500"}>
                              {cert.progress?.projects?.current || 0} / {cert.requiredProjectCount}
                            </span>
                          </div>
                          <div className="h-1.5 bg-zinc-800 overflow-hidden">
                            <div className={`h-full transition-all ${cert.progress?.projects?.met ? "bg-green-500" : accent.bar}`} style={{ width: `${projPct}%` }} />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between text-[10px] font-bold mb-0.5">
                            <span className="text-zinc-400">Published</span>
                            <span className={cert.progress?.published?.met ? "text-green-400" : "text-zinc-500"}>
                              {cert.progress?.published?.current || 0} / {cert.requiredPublished}
                            </span>
                          </div>
                          <div className="h-1.5 bg-zinc-800 overflow-hidden">
                            <div className={`h-full transition-all ${cert.progress?.published?.met ? "bg-green-500" : accent.bar}`} style={{ width: `${pubPct}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xl font-display font-bold mb-6 flex items-center gap-2" data-testid="text-start-creating">
            <Star className="w-5 h-5" /> Start Creating
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {primaryModes.map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.type}
                  onClick={() => handleQuickCreate(mode.type, mode.href)}
                  className={`group p-6 border-2 border-zinc-800 border-l-4 ${mode.color} hover:border-white hover:shadow-hard transition-all bg-card text-left`}
                  data-testid={`button-quick-${mode.type}`}
                >
                  <Icon className="w-8 h-8 mb-3 text-zinc-400 group-hover:text-white transition-colors" />
                  <h3
                    className="text-lg font-black uppercase tracking-tight group-hover:underline decoration-2 underline-offset-4"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {mode.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {mode.desc}
                  </p>
                  <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            <button
              onClick={() => setMoreToolsOpen(!moreToolsOpen)}
              className="flex items-center gap-2 text-sm text-zinc-500 hover:text-white font-mono uppercase tracking-wider transition-colors"
              data-testid="button-toggle-more-tools"
            >
              {moreToolsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              More Creator Tools
            </button>
            {moreToolsOpen && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                {moreModes.map((mode) => {
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.type}
                      onClick={() => handleQuickCreate(mode.type, mode.href)}
                      className="group p-4 border border-zinc-800 hover:border-zinc-600 hover:shadow-hard transition-all bg-card text-left"
                      data-testid={`button-more-${mode.type}`}
                    >
                      <Icon className="w-5 h-5 mb-2 text-zinc-500" />
                      <h3 className="text-sm font-bold font-display uppercase group-hover:underline decoration-2 underline-offset-4">
                        {mode.title}
                      </h3>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {mode.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold mb-6 flex items-center gap-2">
            <Wrench className="w-5 h-5" /> Tools & Utilities
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <button
              onClick={() => navigate("/tools/prompt")}
              className="group block p-4 border border-border hover:border-primary hover:shadow-hard transition-all bg-card text-left"
              data-testid="button-tool-prompt"
            >
              <Wand2 className="w-6 h-6 mb-2" />
              <h3 className="text-sm font-bold font-display uppercase group-hover:underline decoration-2 underline-offset-4">
                Prompt Factory
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1">
                AI prompt generator
              </p>
            </button>
            <button
              onClick={() => navigate("/tools/story")}
              className="group block p-4 border border-border hover:border-primary hover:shadow-hard transition-all bg-card text-left"
              data-testid="button-tool-story"
            >
              <BookOpen className="w-6 h-6 mb-2" />
              <h3 className="text-sm font-bold font-display uppercase group-hover:underline decoration-2 underline-offset-4">
                Story Forge
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1">
                Plot & narrative tools
              </p>
            </button>
            <button
              onClick={() => navigate("/tools/import")}
              className="group block p-4 border border-border hover:border-primary hover:shadow-hard transition-all bg-card text-left"
              data-testid="button-tool-import"
            >
              <Upload className="w-6 h-6 mb-2" />
              <h3 className="text-sm font-bold font-display uppercase group-hover:underline decoration-2 underline-offset-4">
                Import
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1">
                Photos, scripts & assets
              </p>
            </button>
            <button
              onClick={() => navigate("/creator/cover")}
              className="group block p-4 border border-border hover:border-primary hover:shadow-hard transition-all bg-card text-left"
              data-testid="button-tool-cover"
            >
              <ImagePlus className="w-6 h-6 mb-2" />
              <h3 className="text-sm font-bold font-display uppercase group-hover:underline decoration-2 underline-offset-4">
                Cover Creator
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1">
                Design book & comic covers
              </p>
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="group block p-4 border border-border hover:border-primary hover:shadow-hard transition-all bg-card text-left"
              data-testid="button-tool-settings"
            >
              <Wrench className="w-6 h-6 mb-2" />
              <h3 className="text-sm font-bold font-display uppercase group-hover:underline decoration-2 underline-offset-4">
                Settings
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1">
                App preferences
              </p>
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold mb-6 flex items-center gap-2">
            <Share2 className="w-5 h-5" /> Publish & Share
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <button
              onClick={() => navigate("/print-studio")}
              className="group block p-4 border border-border hover:border-primary hover:shadow-hard transition-all bg-card text-left"
              data-testid="button-publish-print"
            >
              <Printer className="w-6 h-6 mb-2" />
              <h3 className="text-sm font-bold font-display uppercase group-hover:underline decoration-2 underline-offset-4">
                Print Studio
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1">
                PDF export & print-ready output
              </p>
            </button>
            <button
              onClick={() => navigate(`/portfolio${user?.id ? `/${user.id}` : ""}`)}
              className="group block p-4 border border-border hover:border-primary hover:shadow-hard transition-all bg-card text-left"
              data-testid="button-publish-portfolio"
            >
              <User className="w-6 h-6 mb-2" />
              <h3 className="text-sm font-bold font-display uppercase group-hover:underline decoration-2 underline-offset-4">
                Portfolio
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1">
                Your digital portfolio & QR links
              </p>
            </button>
            <button
              onClick={() => navigate("/community")}
              className="group block p-4 border border-border hover:border-primary hover:shadow-hard transition-all bg-card text-left"
              data-testid="button-publish-gallery"
            >
              <Users className="w-6 h-6 mb-2" />
              <h3 className="text-sm font-bold font-display uppercase group-hover:underline decoration-2 underline-offset-4">
                Community Gallery
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1">
                Browse & showcase work
              </p>
            </button>
            <button
              onClick={() => navigate("/marketplace")}
              className="group block p-4 border border-border hover:border-primary hover:shadow-hard transition-all bg-card text-left"
              data-testid="button-publish-marketplace"
            >
              <ShoppingBag className="w-6 h-6 mb-2" />
              <h3 className="text-sm font-bold font-display uppercase group-hover:underline decoration-2 underline-offset-4">
                Marketplace
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1">
                Sell & buy creator content
              </p>
            </button>
            <button
              onClick={() => navigate("/print-studio/export")}
              className="group block p-4 border border-border hover:border-primary hover:shadow-hard transition-all bg-card text-left"
              data-testid="button-publish-export"
            >
              <Camera className="w-6 h-6 mb-2" />
              <h3 className="text-sm font-bold font-display uppercase group-hover:underline decoration-2 underline-offset-4">
                Export Dashboard
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1">
                High-res & web-ready exports
              </p>
            </button>
            <button
              onClick={() => navigate("/certifications")}
              className="group block p-4 border border-border hover:border-primary hover:shadow-hard transition-all bg-card text-left"
              data-testid="button-publish-certs"
            >
              <Award className="w-6 h-6 mb-2" />
              <h3 className="text-sm font-bold font-display uppercase group-hover:underline decoration-2 underline-offset-4">
                Certifications
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1">
                Earn & verify creator certs
              </p>
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5" /> Ecosystem
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <a
              href="https://pressstart.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-4 border border-border hover:border-primary hover:shadow-hard transition-all bg-card text-left"
              data-testid="link-ecosystem-lms"
            >
              <GraduationCap className="w-6 h-6 mb-2" />
              <h3 className="text-sm font-bold font-display uppercase group-hover:underline decoration-2 underline-offset-4">
                Press Start LMS
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1">
                Courses, assignments & learning
              </p>
            </a>
            <a
              href="https://psstreaming.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-4 border border-border hover:border-primary hover:shadow-hard transition-all bg-card text-left"
              data-testid="link-ecosystem-streaming"
            >
              <Tv className="w-6 h-6 mb-2" />
              <h3 className="text-sm font-bold font-display uppercase group-hover:underline decoration-2 underline-offset-4">
                PS Streaming
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1">
                Watch & stream creator content
              </p>
            </a>
            <a
              href="https://madmixedmedia.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-4 border border-border hover:border-primary hover:shadow-hard transition-all bg-card text-left"
              data-testid="link-ecosystem-madmixed"
            >
              <Building2 className="w-6 h-6 mb-2" />
              <h3 className="text-sm font-bold font-display uppercase group-hover:underline decoration-2 underline-offset-4">
                Mad Mixed Media
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1">
                The parent company & network
              </p>
            </a>
          </div>
        </section>

        {maxProjects > 0 && (
          <section data-testid="project-slots-section">
            <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
              <Folder className="w-5 h-5" /> Project Slots
              <span className="text-sm font-mono text-zinc-400 ml-2">{projectCount}/{maxProjects}</span>
            </h2>
            <div className="flex gap-3 flex-wrap">
              {Array.from({ length: Math.min(maxProjects, 6) }).map((_, i) => {
                const project = projects?.[i];
                if (project) {
                  return (
                    <div
                      key={project.id}
                      onClick={() => navigate(`/creator/${project.type}?id=${project.id}`)}
                      className="w-20 h-20 border-2 border-zinc-700 bg-card flex flex-col items-center justify-center cursor-pointer hover:border-white transition-colors"
                      title={project.title}
                      data-testid={`slot-filled-${i}`}
                    >
                      <Folder className="w-5 h-5 text-zinc-400 mb-1" />
                      <span className="text-[8px] font-mono text-zinc-500 truncate max-w-[70px] text-center">{project.title}</span>
                    </div>
                  );
                }
                if (i < maxProjects) {
                  return (
                    <div
                      key={`empty-${i}`}
                      onClick={() => setNewProjectOpen(true)}
                      className="w-20 h-20 border-2 border-dashed border-zinc-700 flex items-center justify-center cursor-pointer hover:border-zinc-500 transition-colors"
                      data-testid={`slot-empty-${i}`}
                    >
                      <Plus className="w-5 h-5 text-zinc-600" />
                    </div>
                  );
                }
                return null;
              })}
              {maxProjects <= 6 && (
                <div
                  onClick={() => navigate("/pricing")}
                  className="w-20 h-20 border-2 border-dashed border-amber-500/40 bg-amber-500/5 flex flex-col items-center justify-center cursor-pointer hover:border-amber-500 transition-colors"
                  data-testid="slot-upgrade"
                >
                  <Lock className="w-4 h-4 text-amber-500 mb-1" />
                  <span className="text-[8px] font-bold text-amber-500 uppercase">Upgrade</span>
                </div>
              )}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold flex items-center gap-2">
              <Clock className="w-5 h-5" /> Recent Projects
            </h2>
            {projects && projects.length > 0 && (
              <button
                onClick={() => navigate("/library")}
                className="text-sm text-cyan-400 hover:underline font-mono flex items-center gap-1"
                data-testid="link-view-all-projects"
              >
                View all {projects.length} projects <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner className="size-8" />
            </div>
          ) : projects && projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {projects.slice(0, 4).map((project) => (
                <div
                  key={project.id}
                  onClick={() => navigate(`/creator/${project.type}?id=${project.id}`)}
                  className="group border border-border bg-card hover:shadow-hard transition-all cursor-pointer"
                  data-testid={`card-project-${project.id}`}
                >
                  <div className="aspect-[4/3] overflow-hidden border-b border-border relative">
                    <img
                      src={project.thumbnail || typeImages[project.type] || noirComic}
                      alt={project.title}
                      className="w-full h-full object-contain bg-black/50 grayscale group-hover:grayscale-0 transition-all duration-500"
                    />
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ThumbnailPicker
                        projectId={project.id}
                        currentThumbnail={project.thumbnail}
                      />
                    </div>
                    <div className="absolute top-2 right-2 bg-background border border-border px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider">
                      {typeLabels[project.type] || project.type}
                    </div>
                    <div className={`absolute top-2 left-2 px-2 py-1 text-[10px] font-mono font-bold uppercase ${
                      project.status === "published" ? "bg-green-500 text-white" :
                      project.status === "review" ? "bg-cyan-500 text-black" :
                      project.status === "approved" ? "bg-blue-500 text-white" :
                      project.status === "rejected" ? "bg-red-500 text-white" :
                      "bg-yellow-500 text-black"
                    }`}>
                      {project.status}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold font-display truncate pr-2" data-testid={`text-project-title-${project.id}`}>
                        {project.title}
                      </h3>
                      <button
                        className="text-muted-foreground hover:text-red-500 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(project.id);
                        }}
                        data-testid={`button-delete-${project.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mb-4">
                      Edited {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-border bg-card">
              <Folder className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground font-mono">No projects yet. Create your first one!</p>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
