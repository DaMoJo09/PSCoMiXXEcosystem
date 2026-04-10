import { Layout } from "@/components/layout/Layout";
import { Plus, ArrowRight, Clock, Star, Trash2, LogOut, Folder, Wrench, Wand2, BookOpen, Sparkles, Zap, Megaphone, Camera, Globe, GraduationCap, Tv, Building2, Award, Lock, CheckCircle2, Trophy, Shield, Gamepad2, Film, CreditCard, Printer, User, Users, ShoppingBag, Upload, ImagePlus, Share2, Palette, ChevronDown, ChevronUp, GitBranch, Crown, Eye, Heart, Monitor, Rocket } from "lucide-react";
import { AppIcon } from "@/components/ui/app-icon";
import { ThumbnailPicker } from "@/components/ThumbnailPicker";
import { useLocation } from "wouter";
import { useProjects, useDeleteProject, useCreateProject, useUpdateProject } from "@/hooks/useProjects";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { useState, useCallback } from "react";
import { EventCarousel } from "@/components/EventCarousel";
import { OnboardingWizard, useOnboarding } from "@/components/OnboardingWizard";
import { XPWidget } from "@/components/XPWidget";
import { useSubscription } from "@/hooks/use-subscription";
import { UpgradeModal } from "@/components/UpgradeModal";
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

function FeaturedOnStage() {
  const [, navigate] = useLocation();
  const { data: featured = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/community/featured-on-stage"],
    queryFn: async () => {
      const res = await fetch("/api/community/featured-on-stage");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60000,
  });

  if (isLoading || featured.length === 0) return null;

  return (
    <section data-testid="featured-on-stage-section">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <Monitor className="w-5 h-5" /> Featured on Stage
        </h2>
        <a
          href="https://psstreaming.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-cyan-400 hover:underline font-mono flex items-center gap-1"
          data-testid="link-go-to-stage"
        >
          Go to PS Streaming <ArrowRight className="w-3 h-3" />
        </a>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {featured.slice(0, 6).map((item: any) => (
          <div
            key={item.id}
            onClick={() => navigate(`/community/read/${item.id}`)}
            className="group border-2 border-zinc-800 hover:border-white bg-card cursor-pointer transition-all hover:shadow-hard"
            data-testid={`card-featured-${item.id}`}
          >
            <div className="aspect-[3/4] overflow-hidden border-b border-zinc-800 relative">
              <img
                src={item.thumbnail}
                alt={item.title}
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
              />
              <div className="absolute top-1 right-1 bg-black/80 border border-zinc-700 px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase">
                {item.type}
              </div>
            </div>
            <div className="p-2">
              <h3 className="text-xs font-bold truncate" data-testid={`text-featured-title-${item.id}`}>
                {item.title}
              </h3>
              <p className="text-[10px] text-zinc-500 truncate">{item.creator_name}</p>
              <div className="flex items-center gap-2 mt-1 text-[9px] text-zinc-600">
                <span className="flex items-center gap-0.5">
                  <Eye className="w-2.5 h-2.5" /> {item.views || 0}
                </span>
                <span className="flex items-center gap-0.5">
                  <Heart className="w-2.5 h-2.5" /> {item.likes || 0}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const { data: projects, isLoading } = useProjects();
  const deleteProject = useDeleteProject();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { completed: onboardingComplete, markComplete: markOnboardingComplete } = useOnboarding(user?.id);
  const { getMaxProjects, tier, getTierName } = useSubscription();
  const maxProjects = getMaxProjects();
  const projectCount = projects?.length || 0;

  const { data: usageData } = useQuery<{
    tier: string;
    ai: { used: number; limit: number; remaining: number };
    export: { used: number; limit: number; remaining: number };
    projects: { used: number; limit: number; remaining: number };
  }>({
    queryKey: ["/api/usage/status"],
    enabled: !!user,
  });

  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectType, setNewProjectType] = useState("comic");
  const [moreToolsOpen, setMoreToolsOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const checkProjectLimit = useCallback(() => {
    if (projectCount >= maxProjects && maxProjects > 0) {
      setShowUpgradeModal(true);
      return true;
    }
    return false;
  }, [projectCount, maxProjects]);

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

  const handlePublish = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "published" ? "draft" : "published";
    try {
      await updateProject.mutateAsync({ id, data: { status: newStatus } as any });
      toast.success(newStatus === "published" ? "Published to Community Library!" : "Unpublished — back to draft");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectTitle.trim()) {
      toast.error("Please enter a project title");
      return;
    }
    if (checkProjectLimit()) return;

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

  const handleRemix = async (type: string, href: string, title: string, templateData: Record<string, any>) => {
    if (checkProjectLimit()) return;
    try {
      const project = await createProject.mutateAsync({
        title,
        type,
        status: "draft",
        data: templateData,
        forceNew: true,
      });
      toast.success("Remixed! Start customizing it.");
      navigate(`${href}?id=${project.id}`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleQuickCreate = async (type: string, href: string) => {
    if (type === "fx") {
      navigate(href);
      return;
    }
    if (checkProjectLimit()) return;
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

        <div className="border border-zinc-800 rounded-xl bg-zinc-900/30 p-4 backdrop-blur-sm" data-testid="creator-flow-bar">
          <div className="flex items-center justify-center gap-2 sm:gap-4">
            {[
              { step: "Create", desc: "Pick a tool and make something", icon: Palette, active: true, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/30" },
              { step: "Enhance", desc: "Add effects, AI art, and polish", icon: Sparkles, active: projectCount > 0, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30" },
              { step: "Publish", desc: "Share with the world and earn XP", icon: Rocket, active: projects?.some((p: any) => p.status === "published"), color: "text-green-400", bg: "bg-green-500/10 border-green-500/30" },
            ].map((s, i) => {
              const SIcon = s.icon;
              return (
                <div key={s.step} className="flex items-center gap-2 sm:gap-4">
                  {i > 0 && <div className={`hidden sm:block w-8 h-px ${s.active ? "bg-zinc-600" : "bg-zinc-800"}`} />}
                  {i > 0 && <span className="sm:hidden text-zinc-700 text-xs">&rarr;</span>}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${s.active ? s.bg : "bg-zinc-900/50 border-zinc-800 opacity-50"}`}>
                    <SIcon className={`w-4 h-4 ${s.active ? s.color : "text-zinc-600"}`} />
                    <div className="hidden sm:block">
                      <div className={`text-xs font-bold uppercase tracking-wider ${s.active ? "text-white" : "text-zinc-600"}`}>{s.step}</div>
                      <div className="text-[9px] text-zinc-500 font-mono">{s.desc}</div>
                    </div>
                    <span className={`sm:hidden text-xs font-bold uppercase ${s.active ? "text-white" : "text-zinc-600"}`}>{s.step}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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

        {usageData && usageData.ai.limit > 0 && usageData.ai.remaining <= 0 && (
          <div className="p-4 border-2 border-red-500 bg-red-500/10 flex items-center justify-between" data-testid="banner-ai-limit">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-red-400" />
              <div>
                <p className="text-sm font-black uppercase text-white">
                  You've used {usageData.ai.used}/{usageData.ai.limit} AI generations today
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">Upgrade for more daily AI generations</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/pricing")}
              className="px-4 py-2 bg-white text-black font-black uppercase text-xs hover:bg-zinc-200 transition-colors shrink-0"
              data-testid="button-ai-limit-upgrade"
            >
              Upgrade Now
            </button>
          </div>
        )}

        {usageData && usageData.ai.limit > 0 && usageData.ai.remaining > 0 && usageData.ai.used > 0 && (
          <div className="p-3 border border-zinc-700 bg-zinc-900 flex items-center justify-between" data-testid="banner-ai-usage">
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-zinc-400" />
              <span className="text-xs font-mono text-zinc-400">
                AI: {usageData.ai.used}/{usageData.ai.limit} today
              </span>
              <div className="w-24 h-1.5 bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    (usageData.ai.used / usageData.ai.limit) >= 0.9 ? "bg-red-500" :
                    (usageData.ai.used / usageData.ai.limit) >= 0.75 ? "bg-amber-500" : "bg-zinc-400"
                  }`}
                  style={{ width: `${Math.min((usageData.ai.used / usageData.ai.limit) * 100, 100)}%` }}
                />
              </div>
            </div>
            {(usageData.ai.used / usageData.ai.limit) >= 0.75 && (
              <button
                onClick={() => navigate("/pricing")}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-bold uppercase"
                data-testid="button-ai-usage-upgrade"
              >
                Get more
              </button>
            )}
          </div>
        )}

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

        <section data-testid="section-examples">
          <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5" /> See What's Possible
          </h2>
          <p className="text-sm text-zinc-500 mb-4">Get inspired — click "Remix" to start with any of these as a template.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { title: "Space Opera Comic", type: "comic", emoji: "\uD83D\uDE80", desc: "3-page sci-fi comic with AI panels and cover art", href: "/creator/comic", accent: "border-cyan-500/40 hover:border-cyan-500", template: { spreads: [{ title: "Cover", panels: [{ x: 0, y: 0, width: 800, height: 1200, content: "Deep space — a lone ship approaches a nebula" }] }, { title: "Page 1", panels: [{ x: 0, y: 0, width: 400, height: 600, content: "Captain on the bridge, stars through viewport" }, { x: 400, y: 0, width: 400, height: 600, content: "Alert klaxons — enemy fleet detected" }] }, { title: "Page 2", panels: [{ x: 0, y: 0, width: 800, height: 600, content: "Space battle — lasers and explosions" }] }] } },
              { title: "Mystery Detective CYOA", type: "cyoa", emoji: "\uD83D\uDD0D", desc: "Branching detective story with 8 endings", href: "/creator/cyoa", accent: "border-red-500/40 hover:border-red-500", template: { nodes: [{ id: "start", title: "The Case Begins", text: "A mysterious letter arrives at your detective agency...", choices: [{ label: "Open it carefully", target: "letter" }, { label: "Check for traps first", target: "traps" }], color: "blue" }, { id: "letter", title: "The Letter", text: "Inside is a plea for help from a wealthy collector.", choices: [{ label: "Visit the collector", target: "mansion" }, { label: "Research their background", target: "research" }], color: "green" }, { id: "traps", title: "Checking for Traps", text: "Smart move — you notice a faint powder on the seal.", choices: [{ label: "Analyze the powder", target: "lab" }], color: "red" }] } },
              { title: "Magic Academy VN", type: "vn", emoji: "\u2728", desc: "Visual novel with 3 characters and branching dialogue", href: "/creator/vn", accent: "border-purple-500/40 hover:border-purple-500", template: { scenes: [{ id: "intro", title: "Arrival", dialogue: [{ speaker: "Narrator", text: "You step through the shimmering gates of Arcanum Academy..." }, { speaker: "Professor Elm", text: "Ah, a new student! Welcome to our humble school of magic." }], characters: ["Professor Elm", "Student"] }, { id: "first_class", title: "First Class", dialogue: [{ speaker: "Professor Elm", text: "Today we learn the fundamentals — focus your will..." }], characters: ["Professor Elm"] }] } },
              { title: "Hero Trading Card", type: "card", emoji: "\u2694\uFE0F", desc: "Legendary card with custom stats and abilities", href: "/creator/card", accent: "border-green-500/40 hover:border-green-500", template: { cardName: "Starblade Champion", rarity: "legendary", stats: { hp: 3200, attack: 280, defense: 190, speed: 95 }, abilities: [{ name: "Cosmic Slash", description: "Deal 450 damage to all enemies", cost: 3 }, { name: "Star Shield", description: "Block 300 damage for 2 turns", cost: 2 }], type: "Warrior", element: "Light" } },
            ].map((example) => (
              <button
                key={example.type}
                onClick={() => handleRemix(example.type, example.href, example.title, example.template)}
                className={`group p-4 border-2 ${example.accent} bg-zinc-900/50 text-left transition-all rounded-xl hover:shadow-lg`}
                data-testid={`button-remix-${example.type}`}
              >
                <span className="text-2xl block mb-2">{example.emoji}</span>
                <h3 className="text-sm font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{example.title}</h3>
                <p className="text-[10px] text-zinc-500 leading-relaxed mb-3">{example.desc}</p>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-white bg-white/10 px-2 py-1 rounded-lg group-hover:bg-white/20 transition-colors">
                  <Sparkles className="w-3 h-3" /> Remix This
                </span>
              </button>
            ))}
          </div>
        </section>

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
                  <AppIcon icon={Icon} size="lg" className="mb-3 group-hover:shadow-[0_2px_12px_rgba(255,255,255,0.1)]" />
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
                      <AppIcon icon={Icon} size="md" className="mb-2" />
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

        <FeaturedOnStage />

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
              <span className={`text-sm font-mono ml-2 ${projectCount >= maxProjects ? "text-red-400" : "text-zinc-400"}`}>
                {projectCount}/{maxProjects} used
              </span>
            </h2>
            <div className="flex gap-3 flex-wrap">
              {Array.from({ length: maxProjects }).map((_, i) => {
                const project = projects?.[i];
                if (project) {
                  return (
                    <div
                      key={project.id}
                      onClick={() => navigate(`/creator/${project.type}?id=${project.id}`)}
                      className="w-24 h-24 border-2 border-zinc-700 bg-card flex flex-col items-center justify-center cursor-pointer hover:border-white transition-colors"
                      title={project.title}
                      data-testid={`slot-filled-${i}`}
                    >
                      <Folder className="w-5 h-5 text-zinc-400 mb-1" />
                      <span className="text-[8px] font-mono text-zinc-500 truncate max-w-[80px] text-center">{project.title}</span>
                      <span className="text-[7px] font-mono text-zinc-600 uppercase mt-0.5">{typeLabels[project.type] || project.type}</span>
                    </div>
                  );
                }
                return (
                  <div
                    key={`empty-${i}`}
                    onClick={() => setNewProjectOpen(true)}
                    className="w-24 h-24 border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center cursor-pointer hover:border-zinc-500 transition-colors"
                    data-testid={`slot-empty-${i}`}
                  >
                    <Plus className="w-5 h-5 text-zinc-600 mb-1" />
                    <span className="text-[8px] font-bold text-zinc-600 uppercase">Available</span>
                  </div>
                );
              })}
              <div
                onClick={() => navigate("/pricing")}
                className="w-24 h-24 border-2 border-dashed border-amber-500/40 bg-amber-500/5 flex flex-col items-center justify-center cursor-pointer hover:border-amber-500 transition-colors group"
                data-testid="slot-upgrade"
              >
                <Lock className="w-4 h-4 text-amber-500 mb-1" />
                <span className="text-[8px] font-bold text-amber-500 uppercase">
                  {tier === "free" ? "Creator: 20" : tier === "creator" ? "Pro: 100" : "Studio: Unlimited"}
                </span>
                <span className="text-[7px] text-amber-500/60 font-mono mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Upgrade</span>
              </div>
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
                      <div className="flex gap-2 shrink-0">
                        <button
                          className={`transition-colors ${project.status === "published" ? "text-green-400 hover:text-yellow-500" : "text-muted-foreground hover:text-green-400"}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePublish(project.id, project.status);
                          }}
                          title={project.status === "published" ? "Unpublish" : "Publish to Community"}
                          data-testid={`button-publish-${project.id}`}
                        >
                          <Globe className="w-4 h-4" />
                        </button>
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
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mb-4">
                      Edited {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-2 border-cyan-500/40 bg-zinc-900 p-8 text-center" data-testid="empty-state-quickstart">
              <div className="w-16 h-16 border-2 border-cyan-500 flex items-center justify-center mx-auto mb-4">
                <Rocket className="w-8 h-8 text-cyan-400" />
              </div>
              <h3
                className="text-xl font-black uppercase tracking-tight mb-2 text-white"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Create your first project in 60 seconds
              </h3>
              <p className="text-sm text-zinc-500 font-mono mb-6 max-w-md mx-auto">
                Pick a starter template below and jump right in. No setup required.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                {[
                  { label: "Comic Starter", type: "comic", href: "/creator/comic", icon: Palette, accent: "border-cyan-500 hover:bg-cyan-500/10" },
                  { label: "Viral HOP", type: "hop", href: "/creator/hop", icon: Zap, accent: "border-amber-500 hover:bg-amber-500/10" },
                  { label: "Card Drop", type: "card", href: "/creator/card", icon: CreditCard, accent: "border-green-500 hover:bg-green-500/10" },
                  { label: "Quick Story", type: "cyoa", href: "/creator/cyoa", icon: GitBranch, accent: "border-red-500 hover:bg-red-500/10" },
                ].map((tpl) => {
                  const TplIcon = tpl.icon;
                  return (
                    <button
                      key={tpl.type}
                      onClick={() => handleQuickCreate(tpl.type, tpl.href)}
                      className={`p-4 border-2 ${tpl.accent} bg-zinc-950 text-left transition-all group`}
                      data-testid={`button-template-${tpl.type}`}
                    >
                      <AppIcon icon={TplIcon} size="md" className="mb-2 group-hover:shadow-[0_2px_12px_rgba(255,255,255,0.1)]" />
                      <span className="text-sm font-black uppercase tracking-tight text-white block" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {tpl.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="Project Limit"
        requiredTier={tier === "free" ? "creator" : tier === "creator" ? "pro" : "studio"}
        usageInfo={{ used: projectCount, limit: maxProjects }}
      />
    </Layout>
  );
}
