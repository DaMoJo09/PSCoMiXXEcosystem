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
  GitBranch
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: PenTool, label: "Comic Builder", href: "/creator/comic" },
  { icon: Film, label: "Motion Studio", href: "/creator/motion" },
  { icon: CreditCard, label: "Card Creator", href: "/creator/card" },
  { icon: BookOpen, label: "Visual Novel", href: "/creator/vn" },
  { icon: GitBranch, label: "CYOA Builder", href: "/creator/cyoa" },
  { icon: ImageIcon, label: "Cover Architect", href: "/creator/cover" },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 h-screen bg-background border-r border-border flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-display font-bold tracking-tighter uppercase">
          PSCoMiXX
        </h1>
        <p className="text-xs text-muted-foreground mt-1 font-mono">CREATOR STUDIO v2.1</p>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <a className={cn(
              "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all hover:translate-x-1 border border-transparent",
              location === item.href 
                ? "bg-primary text-primary-foreground shadow-hard-sm border-primary" 
                : "hover:bg-muted hover:border-border"
            )}>
              <item.icon className="w-4 h-4" />
              {item.label}
            </a>
          </Link>
        ))}
        
        <div className="pt-4 mt-4 border-t border-border">
          <Link href="/admin">
            <a className={cn(
              "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all hover:translate-x-1 border border-transparent text-muted-foreground hover:text-foreground",
              location === "/admin" && "text-foreground font-bold"
            )}>
              <ShieldAlert className="w-4 h-4" />
              Admin Console
            </a>
          </Link>
        </div>
      </nav>

      <div className="p-4 border-t border-border bg-background z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-bold font-mono text-xs">
            ME
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">Creator Account</p>
            <p className="text-xs text-muted-foreground truncate">pro@pscomixx.com</p>
          </div>
          <button className="text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
