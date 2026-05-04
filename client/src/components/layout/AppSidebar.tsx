import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  PenTool, 
  CreditCard, 
  BookOpen, 
  Image as ImageIcon, 
  Settings, 
  LogOut,
  ShieldAlert,
  Film,
  GitBranch,
  Wand2,
  Sparkles,
  Sun,
  Moon,
  GalleryHorizontal,
  Calendar,
  Newspaper,
  Mail,
  ShoppingBag,
  User,
  Globe,
  GraduationCap,
  Users,
  DollarSign,
  Trophy,
  Rocket,
  MessageCircle,
  Bell,
  Search,
  Handshake,
  Link2,
  Download,
  Library,
  Zap,
  Star,
  Layers,
  Shield,
  Briefcase,
  Package,
  Pin,
  PinOff,
  ChevronRight,
  Monitor,
  Wifi,
  RefreshCw,
  WifiOff,
  Printer,
  FileDown,
  Gift,
  Target,
  Award,
  Flame,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppIconInline } from "@/components/ui/app-icon";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { shouldBlockDirectPayments } from "@/lib/platform";
import { isOnline, onOnlineStatusChange, syncPendingChanges, getPendingSyncCount, getLastSyncTime, startBackgroundSync, subscribeSyncStatus, type SyncStatus, type ConflictInfo, resolveConflict } from "@/lib/offlineStorage";

interface AppSidebarProps {
  isExpanded: boolean;
  isPinned: boolean;
  onTogglePin: () => void;
  onMobileClose?: () => void;
}

const creatorTools = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Sparkles, label: "Get Started", href: "/get-started" },
  { icon: PenTool, label: "Comic Builder", href: "/creator/comic" },
  { icon: Film, label: "Motion Studio", href: "/creator/motion" },
  { icon: CreditCard, label: "Card Creator", href: "/creator/card" },
  { icon: BookOpen, label: "Visual Novel", href: "/creator/vn" },
  { icon: GitBranch, label: "CYOA Builder", href: "/creator/cyoa" },
  { icon: Zap, label: "HOP Creator", href: "/creator/hop" },
];

const aiTools = [
  { icon: Wand2, label: "Prompt Factory", href: "/tools/prompt" },
  { icon: Sparkles, label: "Story Forge", href: "/tools/story" },
  { icon: Download, label: "Import Center", href: "/tools/import" },
  { icon: Zap, label: "FX Studio", href: "/fx-studio" },
];

const galleryTools = [
  { icon: Layers, label: "My Library", href: "/library" },
  { icon: GalleryHorizontal, label: "My Portfolio", href: "/portfolio" },
];

const communityTools = [
  { icon: Library, label: "Community Library", href: "/community", studentOk: true },
];

const marketplaceTools = [
  { icon: ShoppingBag, label: "Browse Marketplace", href: "/marketplace", studentOk: true },
  { icon: DollarSign, label: "Sell Content", href: "/marketplace/sell", studentOk: false },
  { icon: Layers, label: "My Purchases", href: "/marketplace/purchases", studentOk: true },
];

const printStudioTools = [
  { icon: Printer, label: "Print Studio", href: "/print-studio" },
  { icon: FileDown, label: "Export Dashboard", href: "/print-studio/export" },
  { icon: Package, label: "Packages", href: "/print-studio/packages" },
  { icon: Mail, label: "Request Quote", href: "/print-studio/quote" },
];

const ecosystemToolsBase = [
  { icon: Globe, label: "Ecosystem Hub", href: "/ecosystem", studentOk: true },
  { icon: Rocket, label: "Publish", href: "/ecosystem/publish", studentOk: true },
  { icon: Users, label: "Collaborate", href: "/ecosystem/collaborate", studentOk: true },
  { icon: Trophy, label: "Events", href: "/ecosystem/events", studentOk: true },
  { icon: Target, label: "Achievements", href: "/achievements", studentOk: true },
  { icon: Award, label: "Certifications", href: "/certifications", studentOk: true },
  { icon: Gift, label: "Rewards", href: "/rewards", studentOk: true },
  { icon: DollarSign, label: "Pricing", href: "/pricing", studentOk: false },
  { icon: GraduationCap, label: "Learn", href: "/ecosystem/learn", studentOk: true },
  { icon: BookOpen, label: "Pathways", href: "/ecosystem/pathways", studentOk: true },
  { icon: Shield, label: "Skill Passport", href: "/ecosystem/passport", studentOk: true },
  { icon: Briefcase, label: "Apprenticeships", href: "/ecosystem/apprenticeship", studentOk: false },
  { icon: Package, label: "External Tools", href: "/ecosystem/external-tools", studentOk: true },
  { icon: Monitor, label: "PS Streaming", href: "https://psstreaming.com", external: true, ssoTarget: "streaming", studentOk: false },
  { icon: GraduationCap, label: "Press Start LMS", href: "https://pressstart.tech", external: true, ssoTarget: "lms", studentOk: true },
];

const socialTools = [
  { icon: MessageCircle, label: "Social Feed", href: "/social" },
  { icon: User, label: "My Profile", href: "/profile" },
  { icon: Mail, label: "Messages", href: "/social/messages" },
  { icon: Handshake, label: "Collab Hub", href: "/social/collab" },
  { icon: Link2, label: "Community Chains", href: "/social/chains" },
  { icon: Bell, label: "Notifications", href: "/social/notifications" },
  { icon: Search, label: "Find Creators", href: "/social/search" },
];

function useStageStats() {
  const [stats, setStats] = useState<{ publishedCount: number; totalViews: number } | null>(null);

  useEffect(() => {
    fetch("/api/community/my-stage-stats", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(setStats)
      .catch(() => {});
  }, []);

  return stats;
}

function useXpStatus() {
  const [xpData, setXpData] = useState<{
    xp: number; level: number; levelTitle: string;
    xpInCurrentLevel: number; xpForNextLevel: number; xpProgress: number;
    currentStreak?: number;
    nextUnlock?: { title: string; level?: number } | null;
  } | null>(null);

  useEffect(() => {
    fetch("/api/progression/summary", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(setXpData)
      .catch(() => {});
  }, []);

  return xpData;
}

function useUsageStatus() {
  const [usage, setUsage] = useState<{
    tier: string;
    ai: { used: number; limit: number; remaining: number };
    export: { used: number; limit: number; remaining: number };
  } | null>(null);

  useEffect(() => {
    fetch("/api/usage/status", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(setUsage)
      .catch(() => {});
  }, []);

  return usage;
}

function useInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    const installedHandler = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setIsInstalled(true);
    }
    setInstallPrompt(null);
  };

  return { canInstall: !!installPrompt && !isInstalled, isInstalled, install };
}

function useOnlineStatus() {
  const [online, setOnline] = useState(isOnline());
  const [pendingSync, setPendingSync] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(getLastSyncTime());
  const [isSyncing, setIsSyncing] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);

  useEffect(() => {
    const cleanupOnline = onOnlineStatusChange((status) => {
      setOnline(status);
    });

    const cleanupSync = subscribeSyncStatus((status: SyncStatus) => {
      setPendingSync(status.pendingCount);
      setLastSyncTime(status.lastSyncTime);
      setIsSyncing(status.isSyncing);
    });

    const cleanupBackground = startBackgroundSync();

    return () => {
      cleanupOnline();
      cleanupSync();
      cleanupBackground();
    };
  }, []);

  const handleResolveConflict = async (projectId: string, resolution: 'keep-local' | 'keep-server' | 'keep-both') => {
    await resolveConflict(projectId, resolution);
    setConflicts(prev => prev.filter(c => c.projectId !== projectId));
  };

  return { online, pendingSync, lastSyncTime, isSyncing, conflicts, handleResolveConflict };
}

function formatSyncTime(time: number | null): string {
  if (!time) return 'Never';
  const diff = Date.now() - time;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(time).toLocaleDateString();
}

export function AppSidebar({ isExpanded, isPinned, onTogglePin, onMobileClose }: AppSidebarProps) {
  const [location] = useLocation();
  const { user, logout, isStudent, isCreator } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { canInstall, isInstalled, install } = useInstallPrompt();
  const { online, pendingSync, lastSyncTime, isSyncing, conflicts, handleResolveConflict } = useOnlineStatus();
  const { enabled: marketplaceEnabled } = useFeatureFlag("marketplace_enabled");
  const { enabled: printStudioEnabled } = useFeatureFlag("print_studio_enabled");
  const { enabled: socialEnabled } = useFeatureFlag("social_enabled");
  const { enabled: aiToolsEnabled } = useFeatureFlag("ai_tools_enabled");
  const { enabled: communityEnabled } = useFeatureFlag("community_enabled");
  const { enabled: motionStudioEnabled } = useFeatureFlag("motion_studio_enabled");
  const xpStatus = useXpStatus();
  const usageStatus = useUsageStatus();
  const stageStats = useStageStats();
  const xp = xpStatus?.xp ?? (user?.xp || 0);
  const level = xpStatus?.level ?? (user?.level || 1);
  const levelTitle = xpStatus?.levelTitle ?? "";
  const xpInLevel = xpStatus?.xpInCurrentLevel ?? 0;
  const xpNeeded = xpStatus?.xpForNextLevel ?? 1000;
  const xpProgress = xpStatus ? Math.round(xpStatus.xpProgress * 100) : 0;
  const [xpSyncing, setXpSyncing] = useState(false);
  const handleForceSync = async () => {
    setXpSyncing(true);
    try {
      const res = await fetch("/api/xp/force-sync", { method: "POST", credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        const results = d.results || [];
        const succeeded = results.filter((r: any) => r.status === "ok");
        const failed = results.filter((r: any) => r.status !== "ok");
        if (succeeded.length === results.length && results.length > 0) {
          toast.success(`XP synced to ${succeeded.map((r: any) => r.name).join(", ")}`);
        } else if (succeeded.length > 0) {
          toast.success(`Synced to ${succeeded.map((r: any) => r.name).join(", ")}. ${failed.map((r: any) => `${r.name}: ${r.code || r.status}`).join(", ")} failed.`);
        } else {
          toast.error(`Sync failed — endpoints not reachable: ${failed.map((r: any) => `${r.name} (${r.code || r.status})`).join(", ")}`);
        }
      } else {
        toast.error("Force sync failed");
      }
    } catch {
      toast.error("Network error during sync");
    }
    setTimeout(() => setXpSyncing(false), 2000);
  };

  const handleSSORedirect = async (target: string) => {
    try {
      const res = await fetch(`/api/auth/sso/redirect?target=${target}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        window.open(data.redirectUrl, "_blank", "noopener,noreferrer");
      } else {
        toast.error("Could not generate SSO link");
      }
    } catch {
      toast.error("Connection error");
    }
  };

  const renderNavLink = (item: { icon: any; label: string; href: string; external?: boolean; ssoTarget?: string }, matchPrefix = false) => {
    const isExternal = (item as any).external;
    const ssoTarget = (item as any).ssoTarget;
    const isActive = !isExternal && (matchPrefix
      ? location === item.href || location.startsWith(item.href + "/")
      : location === item.href);
    const className = cn(
      "flex items-center gap-3 py-1.5 text-sm font-medium transition-all",
      isExpanded ? "px-3 hover:translate-x-0.5" : "px-0 justify-center",
      isActive 
        ? "text-foreground" 
        : "text-muted-foreground hover:text-foreground"
    );
    const testId = `nav-${item.label.toLowerCase().replace(/\s/g, '-')}`;
    const iconEl = isExpanded
      ? <AppIconInline icon={item.icon} active={isActive} />
      : <AppIconInline icon={item.icon} active={isActive} />;

    if (isExternal && ssoTarget) {
      return (
        <button
          key={item.href}
          onClick={() => handleSSORedirect(ssoTarget)}
          className={cn(className, "w-full text-left cursor-pointer")}
          data-testid={testId}
          title={!isExpanded ? item.label : undefined}
          aria-label={!isExpanded ? item.label : undefined}
        >
          {iconEl}
          {isExpanded && <span className="truncate">{item.label}</span>}
        </button>
      );
    }

    if (isExternal) {
      return (
        <a
          key={item.href}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
          data-testid={testId}
          title={!isExpanded ? item.label : undefined}
          aria-label={!isExpanded ? item.label : undefined}
        >
          {iconEl}
          {isExpanded && <span className="truncate">{item.label}</span>}
        </a>
      );
    }

    return (
      <Link 
        key={item.href} 
        href={item.href}
        className={className}
        data-testid={testId}
        title={!isExpanded ? item.label : undefined}
        aria-label={!isExpanded ? item.label : undefined}
        onClick={() => onMobileClose?.()}
      >
        {iconEl}
        {isExpanded && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  const renderSectionLabel = (label: string, id?: string) => {
    if (!isExpanded) {
      return <div className="w-6 h-px bg-border mx-auto my-2" />;
    }
    return (
      <div
        className="text-[10px] font-bold uppercase text-muted-foreground px-4 py-2 mt-4"
        id={id}
      >
        {label}
      </div>
    );
  };

  return (
    <aside
      className={cn(
        "h-screen bg-background border-r border-border flex flex-col transition-all duration-300 ease-in-out overflow-hidden",
        isExpanded ? "w-64" : "w-12"
      )}
      aria-label="Main navigation"
    >
      <div className={cn(
        "border-b border-border flex items-center",
        isExpanded ? "p-4 justify-between" : "p-2 justify-center"
      )}>
        {isExpanded ? (
          <>
            <div className="flex-1">
              <img 
                src="/logo.png" 
                alt="Press Start CoMixx logo" 
                className="h-12 w-auto mx-auto"
              />
              <p className="text-xs text-muted-foreground mt-1 text-center font-mono">CREATOR STUDIO</p>
            </div>
            <button
              onClick={onTogglePin}
              className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
              title={isPinned ? "Unpin sidebar" : "Pin sidebar open"}
              data-testid="button-pin-sidebar"
            >
              {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
      </div>

      <nav className={cn(
        "flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden",
        isExpanded ? "p-4" : "p-1"
      )} role="navigation" aria-label="Site navigation">
        {isExpanded && <div className="text-[10px] font-bold uppercase text-muted-foreground px-4 py-2">Creator Tools</div>}
        {!isExpanded && <div className="h-2" />}
        {creatorTools.filter(item => item.href !== "/creator/motion" || motionStudioEnabled).map((item) => renderNavLink(item))}

        {communityEnabled && !isStudent && (
          isExpanded ? (
            <div className="mt-2 mx-2 border border-cyan-500/30 bg-cyan-500/5 p-3" data-testid="sidebar-your-stage">
              <div className="text-[10px] font-bold uppercase text-cyan-400 mb-2 flex items-center gap-1.5">
                <Monitor className="w-3 h-3" /> Your Stage
              </div>
              {stageStats && (
                <div className="flex items-center gap-3 mb-2 text-[11px] font-mono text-zinc-400" data-testid="stage-stats">
                  <span data-testid="stage-published-count">{stageStats.publishedCount} published</span>
                  <span className="text-zinc-600">|</span>
                  <span data-testid="stage-total-views">{stageStats.totalViews} views</span>
                </div>
              )}
              <button
                onClick={() => handleSSORedirect("streaming")}
                className="w-full text-left text-sm font-medium text-foreground hover:text-cyan-400 transition-colors flex items-center justify-between py-1"
                data-testid="button-go-to-stage"
              >
                <span>Go to Stage</span>
                <ArrowRight className="w-3 h-3" />
              </button>
              <Link
                href="/ecosystem/publish"
                className="w-full text-left text-sm font-medium text-foreground hover:text-cyan-400 transition-colors flex items-center justify-between py-1"
                data-testid="nav-publish-from-stage"
                onClick={() => onMobileClose?.()}
              >
                <span>Publish Now</span>
                <Rocket className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <button
              onClick={() => handleSSORedirect("streaming")}
              className="flex items-center justify-center gap-3 py-1.5 px-0 w-full text-muted-foreground hover:text-foreground transition-all"
              title={`Your Stage${stageStats ? ` (${stageStats.publishedCount} published)` : ""}`}
              aria-label="Your Stage"
              data-testid="button-go-to-stage-collapsed"
            >
              <AppIconInline icon={Monitor} className="border-cyan-500/40 text-cyan-400" />
            </button>
          )
        )}
        
        {aiToolsEnabled && (
          <>
            {renderSectionLabel("AI Tools")}
            {aiTools.map((item) => renderNavLink(item))}
          </>
        )}

        {renderSectionLabel("My Work")}
        {galleryTools.map((item) => renderNavLink(item))}

        {marketplaceEnabled && (
          <>
            {renderSectionLabel("Marketplace")}
            {marketplaceTools.filter(item => !isStudent || item.studentOk).map((item) => renderNavLink(item, true))}
          </>
        )}

        {printStudioEnabled && (
          <>
            {renderSectionLabel("Print Studio")}
            {printStudioTools.map((item) => renderNavLink(item))}
          </>
        )}

        {communityEnabled && (
          <>
            {renderSectionLabel("Community", "community-nav-label")}
            {communityTools.filter(item => !isStudent || item.studentOk).map((item) => renderNavLink(item, true))}
            {ecosystemToolsBase
              .filter(item => !isStudent || item.studentOk)
              // Apple guideline 3.1.1: hide Pricing nav inside the iOS app —
              // subscriptions are managed externally on pscomixx.com.
              .filter(item => !(shouldBlockDirectPayments() && item.href === "/pricing"))
              .map((item) => renderNavLink(item, true))}
          </>
        )}

        {socialEnabled && (
          <>
            {renderSectionLabel("Social", "social-nav-label")}
            {socialTools.map((item) => renderNavLink(item, true))}
          </>
        )}
        
        <div className="pt-4 mt-4 border-t border-border space-y-1">
          <button
            onClick={toggleTheme}
            className={cn(
              "flex items-center gap-3 py-1.5 text-sm font-medium transition-all text-muted-foreground hover:text-foreground w-full text-left",
              isExpanded ? "px-3 hover:translate-x-0.5" : "px-0 justify-center"
            )}
            data-testid="button-theme-toggle"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={!isExpanded ? (theme === "dark" ? "Light Mode" : "Dark Mode") : undefined}
          >
            <AppIconInline icon={theme === "dark" ? Sun : Moon} />
            {isExpanded && (theme === "dark" ? "Light Mode" : "Dark Mode")}
          </button>
          <Link 
            href="/settings"
            className={cn(
              "flex items-center gap-3 py-1.5 text-sm font-medium transition-all text-muted-foreground hover:text-foreground",
              isExpanded ? "px-3 hover:translate-x-0.5" : "px-0 justify-center",
              location === "/settings" && "text-foreground"
            )}
            data-testid="nav-settings"
            title={!isExpanded ? "Settings" : undefined}
          >
            <AppIconInline icon={Settings} active={location === "/settings"} />
            {isExpanded && "Settings"}
          </Link>
          {renderNavLink({ icon: Download, label: "Desktop App", href: "/download" })}
          {user?.role === "admin" && (
            <Link 
              href="/admin"
              className={cn(
                "flex items-center gap-3 py-1.5 text-sm font-medium transition-all text-muted-foreground hover:text-foreground",
                isExpanded ? "px-3 hover:translate-x-0.5" : "px-0 justify-center",
                location === "/admin" && "text-foreground"
              )}
              data-testid="nav-admin"
              title={!isExpanded ? "Admin Console" : undefined}
            >
              <AppIconInline icon={ShieldAlert} active={location === "/admin"} />
              {isExpanded && "Admin Console"}
            </Link>
          )}
        </div>
      </nav>

      <div className="border-t border-border bg-background z-10 space-y-2">
        {user && isExpanded && (
          <div className="px-4 py-2 space-y-2" data-testid="xp-bar-section">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Star className={`w-3.5 h-3.5 text-yellow-400 ${xpProgress >= 90 ? "animate-pulse" : ""}`} />
                <span className="text-xs font-bold">LVL {level}</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">{xpInLevel}/{xpNeeded} XP</span>
            </div>
            <div className={`w-full h-2 bg-muted rounded-full overflow-hidden border ${xpProgress >= 90 ? "border-yellow-500/50 shadow-[0_0_8px_rgba(234,179,8,0.3)]" : "border-border"}`}>
              <div 
                className={`h-full transition-all duration-500 ${xpProgress >= 90 ? "bg-yellow-400" : "bg-white"}`}
                style={{ width: `${xpProgress}%` }}
                data-testid="xp-progress-bar"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30 uppercase" data-testid="text-level-title">
                {levelTitle || (isStudent ? "STUDENT" : "CREATOR")}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">
                  {(user.totalMinutes || 0) >= 60 
                    ? `${Math.floor((user.totalMinutes || 0) / 60)}h ${(user.totalMinutes || 0) % 60}m`
                    : `${user.totalMinutes || 0} min`
                  }
                </span>
                <button
                  onClick={handleForceSync}
                  disabled={xpSyncing}
                  className="text-[9px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-0.5 disabled:opacity-50"
                  title="Sync XP to ecosystem apps"
                  data-testid="btn-force-xp-sync"
                >
                  <RefreshCw className={`w-3 h-3 ${xpSyncing ? "animate-spin" : ""}`} />
                  {xpSyncing ? "SYNCING" : "SYNC"}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <div className={`flex items-center gap-1 ${(xpStatus?.currentStreak || 0) > 0 ? "text-orange-400" : "text-zinc-600"}`} data-testid="sidebar-streak">
                <Flame className={`w-3 h-3 ${(xpStatus?.currentStreak || 0) >= 3 ? "animate-pulse" : ""}`} />
                <span className="text-[10px] font-black">{xpStatus?.currentStreak || 0}d</span>
                {(xpStatus?.currentStreak || 0) < 3 && (
                  <span className="text-[9px] text-zinc-500 font-mono">3d: +50 XP</span>
                )}
                {(xpStatus?.currentStreak || 0) >= 3 && (xpStatus?.currentStreak || 0) < 7 && (
                  <span className="text-[9px] text-zinc-500 font-mono">7d: +150 XP</span>
                )}
                {(xpStatus?.currentStreak || 0) >= 7 && (xpStatus?.currentStreak || 0) < 30 && (
                  <span className="text-[9px] text-zinc-500 font-mono">30d: +500 XP</span>
                )}
              </div>
              {xpStatus?.nextUnlock && (
                <div className="flex items-center gap-1 text-cyan-400 flex-1 min-w-0" data-testid="sidebar-next-unlock">
                  <ArrowRight className="w-3 h-3 shrink-0" />
                  <span className="text-[10px] font-bold truncate">
                    {xpStatus.nextUnlock.level ? `Lv${xpStatus.nextUnlock.level}: ` : ""}{xpStatus.nextUnlock.title}
                  </span>
                </div>
              )}
            </div>
            {usageStatus && usageStatus.tier !== "studio" && usageStatus.tier !== "lifetime" && (
              <div className="pt-2 mt-1 border-t border-zinc-800 space-y-1.5" data-testid="sidebar-usage-counters">
                <UsageBar label="AI" used={usageStatus.ai.used} limit={usageStatus.ai.limit} unit="/day" />
                <UsageBar label="Exports" used={usageStatus.export.used} limit={usageStatus.export.limit} unit="/mo" />
                {/* Hide the upgrade CTA inside the iOS app — Apple guideline 3.1.1. */}
                {!shouldBlockDirectPayments() && (
                  <Link href="/pricing" className="block text-[9px] text-cyan-400 hover:text-cyan-300 font-bold uppercase mt-1" data-testid="link-sidebar-upgrade">
                    View plans
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
        {user && !isExpanded && (
          <div className="flex justify-center py-2" data-testid="xp-bar-section">
            <div className="flex flex-col items-center gap-0.5">
              <Star className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-[9px] font-bold">{level}</span>
            </div>
          </div>
        )}
        {canInstall && (
          <div className={cn("border-t border-border", isExpanded ? "px-4 py-2" : "px-1 py-2 flex justify-center")}>
            <button
              onClick={install}
              className={cn(
                "flex items-center gap-2 text-sm font-bold transition-all",
                "bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white",
                "hover:from-cyan-400 hover:to-fuchsia-400",
                isExpanded ? "w-full px-3 py-2 justify-center" : "p-2"
              )}
              data-testid="button-install-app"
              title="Install App"
            >
              <Monitor className="w-4 h-4 shrink-0" />
              {isExpanded && <span>INSTALL APP</span>}
            </button>
          </div>
        )}
        {isInstalled && isExpanded && (
          <div className="px-4 py-1.5 border-t border-border">
            <div className="flex items-center gap-2 text-[10px] text-green-400 font-mono">
              <Monitor className="w-3 h-3" />
              <span>APP INSTALLED</span>
            </div>
          </div>
        )}
        <div className={cn(
          "border-t border-border",
          isExpanded ? "px-4 py-1.5" : "px-1 py-1.5 flex justify-center"
        )} data-testid="status-online">
          {online ? (
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-[10px] text-green-400 font-mono">
                <Wifi className="w-3 h-3 shrink-0" />
                {isExpanded && (
                  <span>{isSyncing ? "SYNCING..." : "ONLINE"}</span>
                )}
                {isExpanded && pendingSync > 0 && (
                  <span className="ml-auto text-amber-400" data-testid="text-pending-sync">{pendingSync} pending</span>
                )}
              </div>
              {isExpanded && (
                <div className="text-[9px] text-muted-foreground font-mono pl-5" data-testid="text-last-sync">
                  Last sync: {formatSyncTime(lastSyncTime)}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-[10px] text-amber-400 font-mono">
                <WifiOff className="w-3 h-3 shrink-0 animate-pulse" />
                {isExpanded && (
                  <span>OFFLINE{pendingSync > 0 ? ` (${pendingSync} pending)` : ""}</span>
                )}
              </div>
              {isExpanded && (
                <div className="text-[9px] text-muted-foreground font-mono pl-5" data-testid="text-last-sync">
                  Last sync: {formatSyncTime(lastSyncTime)}
                </div>
              )}
            </div>
          )}
        </div>
        {conflicts.length > 0 && isExpanded && (
          <div className="border-t border-border px-4 py-2 space-y-2" data-testid="conflict-resolution-panel">
            <div className="text-[10px] font-bold text-amber-400 uppercase">Sync Conflicts</div>
            {conflicts.map(conflict => (
              <div key={conflict.projectId} className="bg-amber-500/10 border border-amber-500/30 rounded p-2 space-y-1.5" data-testid={`conflict-${conflict.projectId}`}>
                <div className="text-[10px] text-foreground font-mono">Project #{conflict.projectId}</div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleResolveConflict(conflict.projectId, 'keep-local')}
                    className="text-[9px] px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded hover:bg-cyan-500/30"
                    data-testid={`button-keep-local-${conflict.projectId}`}
                  >
                    Keep Local
                  </button>
                  <button
                    onClick={() => handleResolveConflict(conflict.projectId, 'keep-server')}
                    className="text-[9px] px-1.5 py-0.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded hover:bg-green-500/30"
                    data-testid={`button-keep-server-${conflict.projectId}`}
                  >
                    Keep Server
                  </button>
                  <button
                    onClick={() => handleResolveConflict(conflict.projectId, 'keep-both')}
                    className="text-[9px] px-1.5 py-0.5 bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 rounded hover:bg-fuchsia-500/30"
                    data-testid={`button-keep-both-${conflict.projectId}`}
                  >
                    Keep Both
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {isExpanded && <EcosystemStatus />}
        <div className={cn(
          "flex items-center gap-3 py-3",
          isExpanded ? "px-4" : "px-1 justify-center"
        )}>
          {isExpanded ? (
            <>
              <div className="w-8 h-8 bg-black text-white dark:bg-white dark:text-black rounded-full flex items-center justify-center font-bold font-mono text-xs shrink-0">
                {user?.name?.substring(0, 2).toUpperCase() || "ME"}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{user?.name || "Creator"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email || "guest@pscomixx.com"}</p>
              </div>
              <button 
                onClick={logout}
                className="text-muted-foreground hover:text-foreground"
                data-testid="button-sidebar-logout"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
              </button>
            </>
          ) : (
            <button 
              onClick={logout}
              className="text-muted-foreground hover:text-foreground p-1"
              data-testid="button-sidebar-logout"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

function UsageBar({ label, used, limit, unit }: { label: string; used: number; limit: number; unit: string }) {
  if (limit === -1) return null;
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isAmber = pct >= 75 && pct < 90;
  const isRed = pct >= 90;
  const barColor = isRed ? "bg-red-500" : isAmber ? "bg-amber-500" : "bg-zinc-400";
  const textColor = isRed ? "text-red-400" : isAmber ? "text-amber-400" : "text-zinc-400";

  return (
    <div data-testid={`usage-${label.toLowerCase()}`}>
      <div className="flex justify-between items-center mb-0.5">
        <span className={`text-[10px] font-bold ${textColor}`}>{label}</span>
        <span className={`text-[10px] font-mono ${textColor}`}>{used}/{limit}{unit}</span>
      </div>
      <div className="w-full h-1.5 bg-zinc-800 overflow-hidden">
        <div className={`h-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function EcosystemStatus() {
  const [connections, setConnections] = React.useState<{ name: string; configured: boolean; status: string }[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const { user } = useAuth();

  React.useEffect(() => {
    if (!user) return;
    fetch("/api/ecosystem/status", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data.connections) {
          setConnections(data.connections);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [user]);

  if (!loaded || connections.length === 0) return null;

  const allConnected = connections.every(c => c.configured);

  return (
    <div className="px-4 py-2 border-t border-border" data-testid="ecosystem-status">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Globe className="w-3 h-3 text-muted-foreground" />
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ecosystem</span>
        <div className={`w-2 h-2 rounded-full ml-auto ${allConnected ? "bg-green-500" : "bg-yellow-500"}`} />
      </div>
      <div className="space-y-1">
        {connections.map(c => (
          <div key={c.name} className="flex items-center gap-1.5" data-testid={`ecosystem-${c.name.replace(/\s+/g, "-").toLowerCase()}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${c.configured ? "bg-green-500" : "bg-zinc-500"}`} />
            <span className="text-[10px] text-muted-foreground">{c.name}</span>
            <span className={`text-[9px] ml-auto font-mono ${c.configured ? "text-green-400" : "text-zinc-500"}`}>
              {c.configured ? "LIVE" : "OFF"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
