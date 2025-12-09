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
  Link2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

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
];

const galleryTools = [
  { icon: GalleryHorizontal, label: "Portfolio", href: "/portfolio" },
  { icon: ShoppingBag, label: "Shop", href: "/shop" },
  { icon: User, label: "Artist", href: "/artist" },
  { icon: Calendar, label: "Exhibitions", href: "/exhibitions" },
  { icon: Newspaper, label: "Blog", href: "/blog" },
  { icon: Mail, label: "Contact", href: "/contact" },
];

const ecosystemTools = [
  { icon: Globe, label: "Ecosystem Hub", href: "/ecosystem" },
  { icon: GraduationCap, label: "Learn", href: "/ecosystem/learn" },
  { icon: Rocket, label: "Publish", href: "/ecosystem/publish" },
  { icon: Users, label: "Collaborate", href: "/ecosystem/collaborate" },
  { icon: DollarSign, label: "Earn", href: "/ecosystem/earn" },
  { icon: Trophy, label: "Events", href: "/ecosystem/events" },
];

const socialTools = [
  { icon: MessageCircle, label: "Social Feed", href: "/social" },
  { icon: Handshake, label: "Collab Hub", href: "/social/collab" },
  { icon: Link2, label: "Community Chains", href: "/social/chains" },
  { icon: Bell, label: "Notifications", href: "/social/notifications" },
  { icon: Search, label: "Find Creators", href: "/social/search" },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="w-64 h-screen bg-background border-r border-border flex flex-col fixed left-0 top-0 z-50" aria-label="Main navigation">
      <div className="p-4 border-b border-border">
        <img 
          src="/logo-dark.png" 
          alt="Press Start CoMixx logo" 
          className="h-16 w-auto mx-auto dark:block hidden"
        />
        <img 
          src="/logo-light.png" 
          alt="Press Start CoMixx logo" 
          className="h-16 w-auto mx-auto dark:hidden block"
        />
        <p className="text-xs text-muted-foreground mt-2 text-center font-mono">CREATOR STUDIO</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto" role="navigation" aria-label="Site navigation">
        <div className="text-[10px] font-bold uppercase text-muted-foreground px-4 py-2">Creator Tools</div>
        {creatorTools.map((item) => (
          <Link 
            key={item.href} 
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all hover:translate-x-1 border border-transparent",
              location === item.href 
                ? "bg-primary text-primary-foreground shadow-hard-sm border-primary" 
                : "hover:bg-muted hover:border-border"
            )}
            data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}
        
        <div className="text-[10px] font-bold uppercase text-muted-foreground px-4 py-2 mt-4">AI Tools</div>
        {aiTools.map((item) => (
          <Link 
            key={item.href} 
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all hover:translate-x-1 border border-transparent",
              location === item.href 
                ? "bg-primary text-primary-foreground shadow-hard-sm border-primary" 
                : "hover:bg-muted hover:border-border"
            )}
            data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}

        <div className="text-[10px] font-bold uppercase text-muted-foreground px-4 py-2 mt-4">Gallery</div>
        {galleryTools.map((item) => (
          <Link 
            key={item.href} 
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all hover:translate-x-1 border border-transparent",
              location === item.href 
                ? "bg-primary text-primary-foreground shadow-hard-sm border-primary" 
                : "hover:bg-muted hover:border-border"
            )}
            data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}

        <div className="text-[10px] font-bold uppercase text-muted-foreground px-4 py-2 mt-4" id="community-nav-label">Community</div>
        {ecosystemTools.map((item) => (
          <Link 
            key={item.href} 
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all hover:translate-x-1 border border-transparent",
              location === item.href || location.startsWith(item.href + "/")
                ? "bg-primary text-primary-foreground shadow-hard-sm border-primary" 
                : "hover:bg-muted hover:border-border"
            )}
            data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
            aria-current={location === item.href ? "page" : undefined}
          >
            <item.icon className="w-4 h-4" aria-hidden="true" />
            {item.label}
          </Link>
        ))}

        <div className="text-[10px] font-bold uppercase text-muted-foreground px-4 py-2 mt-4" id="social-nav-label">Social</div>
        {socialTools.map((item) => (
          <Link 
            key={item.href} 
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all hover:translate-x-1 border border-transparent",
              location === item.href || location.startsWith(item.href + "/")
                ? "bg-primary text-primary-foreground shadow-hard-sm border-primary" 
                : "hover:bg-muted hover:border-border"
            )}
            data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
            aria-current={location === item.href ? "page" : undefined}
          >
            <item.icon className="w-4 h-4" aria-hidden="true" />
            {item.label}
          </Link>
        ))}
        
        <div className="pt-4 mt-4 border-t border-border space-y-1">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all hover:translate-x-1 border border-transparent text-muted-foreground hover:text-foreground hover:bg-muted hover:border-border w-full text-left"
            data-testid="button-theme-toggle"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>
          <Link 
            href="/settings"
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all hover:translate-x-1 border border-transparent text-muted-foreground hover:text-foreground",
              location === "/settings" && "text-foreground bg-muted border-border"
            )}
            data-testid="nav-settings"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
          {user?.role === "admin" && (
            <Link 
              href="/admin"
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all hover:translate-x-1 border border-transparent text-muted-foreground hover:text-foreground",
                location === "/admin" && "text-foreground bg-muted border-border"
              )}
              data-testid="nav-admin"
            >
              <ShieldAlert className="w-4 h-4" />
              Admin Console
            </Link>
          )}
        </div>
      </nav>

      <div className="p-4 border-t border-border bg-background z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 bg-black text-white dark:bg-white dark:text-black rounded-full flex items-center justify-center font-bold font-mono text-xs">
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
        </div>
      </div>
    </aside>
  );
}
