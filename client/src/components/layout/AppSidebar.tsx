import React, { useState, useEffect } from "react";
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
  Pin,
  PinOff,
  ChevronRight,
  Monitor
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

interface AppSidebarProps {
  isExpanded: boolean;
  isPinned: boolean;
  onTogglePin: () => void;
}

const creatorTools = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: PenTool, label: "Comic Builder", href: "/creator/comic" },
  { icon: Film, label: "Motion Studio", href: "/creator/motion" },
  { icon: CreditCard, label: "Card Creator", href: "/creator/card" },
  { icon: BookOpen, label: "Visual Novel", href: "/creator/vn" },
  { icon: GitBranch, label: "CYOA Builder", href: "/creator/cyoa" },
  { icon: ImageIcon, label: "Cover Architect", href: "/creator/cover" },
];

const aiTools = [
  { icon: Wand2, label: "Prompt Factory", href: "/tools/prompt" },
  { icon: Sparkles, label: "Story Forge", href: "/tools/story" },
  { icon: Download, label: "Import Center", href: "/tools/import" },
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

const ecosystemToolsBase = [
  { icon: Globe, label: "Ecosystem Hub", href: "/ecosystem", studentOk: true },
  { icon: Rocket, label: "Publish", href: "/ecosystem/publish", studentOk: true },
  { icon: Users, label: "Collaborate", href: "/ecosystem/collaborate", studentOk: true },
  { icon: Trophy, label: "Events", href: "/ecosystem/events", studentOk: true },
  { icon: DollarSign, label: "Pricing", href: "/pricing", studentOk: false },
  { icon: GraduationCap, label: "Learn", href: "/ecosystem/learn", studentOk: true },
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

const XP_PER_LEVEL = 1000;

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

export function AppSidebar({ isExpanded, isPinned, onTogglePin }: AppSidebarProps) {
  const [location] = useLocation();
  const { user, logout, isStudent, isCreator } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { canInstall, isInstalled, install } = useInstallPrompt();
  const xp = user?.xp || 0;
  const level = user?.level || 1;
  const xpInLevel = xp - (level - 1) * XP_PER_LEVEL;
  const xpProgress = Math.min((xpInLevel / XP_PER_LEVEL) * 100, 100);

  const renderNavLink = (item: { icon: any; label: string; href: string }, matchPrefix = false) => {
    const isActive = matchPrefix
      ? location === item.href || location.startsWith(item.href + "/")
      : location === item.href;
    return (
      <Link 
        key={item.href} 
        href={item.href}
        className={cn(
          "flex items-center gap-3 py-2.5 text-sm font-medium transition-all border border-transparent",
          isExpanded ? "px-4 hover:translate-x-1" : "px-0 justify-center",
          isActive 
            ? "bg-primary text-primary-foreground shadow-hard-sm border-primary" 
            : "hover:bg-muted hover:border-border"
        )}
        data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
        title={!isExpanded ? item.label : undefined}
      >
        <item.icon className="w-4 h-4 shrink-0" />
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
        {creatorTools.map((item) => renderNavLink(item))}
        
        {renderSectionLabel("AI Tools")}
        {aiTools.map((item) => renderNavLink(item))}

        {renderSectionLabel("My Work")}
        {galleryTools.map((item) => renderNavLink(item))}

        {renderSectionLabel("Marketplace")}
        {marketplaceTools.filter(item => !isStudent || item.studentOk).map((item) => renderNavLink(item, true))}

        {renderSectionLabel("Community", "community-nav-label")}
        {communityTools.filter(item => !isStudent || item.studentOk).map((item) => renderNavLink(item, true))}
        {ecosystemToolsBase.filter(item => !isStudent || item.studentOk).map((item) => renderNavLink(item, true))}

        {renderSectionLabel("Social", "social-nav-label")}
        {socialTools.map((item) => renderNavLink(item, true))}
        
        <div className="pt-4 mt-4 border-t border-border space-y-1">
          <button
            onClick={toggleTheme}
            className={cn(
              "flex items-center gap-3 py-2.5 text-sm font-medium transition-all border border-transparent text-muted-foreground hover:text-foreground hover:bg-muted hover:border-border w-full text-left",
              isExpanded ? "px-4 hover:translate-x-1" : "px-0 justify-center"
            )}
            data-testid="button-theme-toggle"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={!isExpanded ? (theme === "dark" ? "Light Mode" : "Dark Mode") : undefined}
          >
            {theme === "dark" ? <Sun className="w-4 h-4 shrink-0" aria-hidden="true" /> : <Moon className="w-4 h-4 shrink-0" aria-hidden="true" />}
            {isExpanded && (theme === "dark" ? "Light Mode" : "Dark Mode")}
          </button>
          <Link 
            href="/settings"
            className={cn(
              "flex items-center gap-3 py-2.5 text-sm font-medium transition-all border border-transparent text-muted-foreground hover:text-foreground",
              isExpanded ? "px-4 hover:translate-x-1" : "px-0 justify-center",
              location === "/settings" && "text-foreground bg-muted border-border"
            )}
            data-testid="nav-settings"
            title={!isExpanded ? "Settings" : undefined}
          >
            <Settings className="w-4 h-4 shrink-0" />
            {isExpanded && "Settings"}
          </Link>
          {user?.role === "admin" && (
            <Link 
              href="/admin"
              className={cn(
                "flex items-center gap-3 py-2.5 text-sm font-medium transition-all border border-transparent text-muted-foreground hover:text-foreground",
                isExpanded ? "px-4 hover:translate-x-1" : "px-0 justify-center",
                location === "/admin" && "text-foreground bg-muted border-border"
              )}
              data-testid="nav-admin"
              title={!isExpanded ? "Admin Console" : undefined}
            >
              <ShieldAlert className="w-4 h-4 shrink-0" />
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
                <Star className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-xs font-bold">LVL {level}</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">{xpInLevel}/{XP_PER_LEVEL} XP</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden border border-border">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-yellow-400 transition-all duration-500"
                style={{ width: `${xpProgress}%` }}
                data-testid="xp-progress-bar"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                isStudent 
                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" 
                  : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
              }`} data-testid="text-account-type">
                {isStudent ? "STUDENT" : "CREATOR"}
              </span>
              <span className="text-[10px] text-muted-foreground">{user.totalMinutes || 0} min</span>
            </div>
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
                <p className="text-xs text-muted-foreground truncate">{user?.email || "guest@pressstart.space"}</p>
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
