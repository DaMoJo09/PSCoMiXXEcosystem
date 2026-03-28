import { Layout } from "@/components/layout/Layout";
import { Plus, ArrowRight, Clock, Star, Trash2, LogOut, Folder, Wrench, Wand2, BookOpen, Sparkles, Zap, Megaphone, Camera, Globe, GraduationCap, Tv, Building2, Award, Lock, CheckCircle2, Trophy, Shield, Gamepad2, Film, CreditCard, Printer, User, Users, ShoppingBag, Upload, ImagePlus, Share2 } from "lucide-react";
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

const quickActions = [
  { title: "New Comic", href: "/creator/comic", type: "comic", desc: "Sequential art builder" },
  { title: "New Motion", href: "/creator/motion", type: "motion", desc: "Motion comic studio" },
  { title: "New Card", href: "/creator/card", type: "card", desc: "TCG card forge" },
  { title: "New Visual Novel", href: "/creator/vn", type: "vn", desc: "Interactive fiction" },
  { title: "New CYOA", href: "/creator/cyoa", type: "cyoa", desc: "Branching story builder" },

];

export default function Dashboard() {
  const { data: projects, isLoading } = useProjects();
  const deleteProject = useDeleteProject();
  const createProject = useCreateProject();
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { completed: onboardingComplete, markComplete: markOnboardingComplete } = useOnboarding(user?.id);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectType, setNewProjectType] = useState("comic");

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
    try {
      const project = await createProject.mutateAsync({
        title: `Untitled ${typeLabels[type]}`,
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
            <h1 className="text-4xl font-display font-bold uppercase tracking-tighter" data-testid="text-dashboard-title">
              Creator Hub
            </h1>
            <p className="text-muted-foreground mt-2 font-mono" data-testid="text-welcome">
              Welcome back, {user?.name}. Ready to create?
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
          <h2 className="text-xl font-display font-bold mb-6 flex items-center gap-2">
            <Star className="w-5 h-5" /> Quick Start
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickActions.map((action) => (
              <button 
                key={action.title} 
                onClick={() => handleQuickCreate(action.type, action.href)}
                className="group block p-4 border border-border hover:border-primary hover:shadow-hard transition-all bg-card h-full text-left min-h-[140px]"
                data-testid={`button-quick-${action.type}`}
              >
                <div>
                  <h3 className="text-sm font-bold font-display uppercase group-hover:underline decoration-2 underline-offset-4 leading-tight">
                    {action.title}
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-2 leading-tight">
                    {action.desc}
                  </p>
                </div>
                <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-5px] group-hover:translate-x-0">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold mb-6 flex items-center gap-2">
            <Wrench className="w-5 h-5" /> Tools & Utilities
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <button 
              onClick={() => navigate("/fx-studio")}
              className="group block p-4 border border-border hover:border-primary hover:shadow-hard transition-all bg-card text-left"
              data-testid="button-tool-fx-studio"
            >
              <Sparkles className="w-6 h-6 mb-2" />
              <h3 className="text-sm font-bold font-display uppercase group-hover:underline decoration-2 underline-offset-4">
                FX Studio
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1">
                Visual effects library
              </p>
            </button>
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
