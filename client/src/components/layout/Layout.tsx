import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { AppSidebar } from "./AppSidebar";
import { Menu, X, Home, ShoppingBag, Users, User, Sparkles, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

const CREATOR_TOOL_PATHS = [
  "/creator/comic",
  "/creator/motion",
  "/creator/card",
  "/creator/vn",
  "/creator/cyoa",

  "/tools/prompt",
  "/tools/story",
];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopBannerDismissed, setDesktopBannerDismissed] = useState(false);
  const [location] = useLocation();
  const isMobile = useIsMobile();

  const isExpanded = sidebarHovered || sidebarPinned;
  const isCreatorTool = CREATOR_TOOL_PATHS.some(
    (p) => location === p || location.startsWith(p + "/")
  );

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-black focus:text-white focus:px-4 focus:py-2 focus:border-2 focus:border-white"
      >
        Skip to main content
      </a>

      {!isMobile && (
        <div
          className="fixed left-0 top-0 h-screen z-50 hidden md:block"
          onMouseEnter={() => setSidebarHovered(true)}
          onMouseLeave={() => setSidebarHovered(false)}
          style={{ width: isExpanded ? "16rem" : "3rem" }}
        >
          <AppSidebar
            isExpanded={isExpanded}
            isPinned={sidebarPinned}
            onTogglePin={() => setSidebarPinned(!sidebarPinned)}
          />
        </div>
      )}

      {isMobile && (
        <>
          <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border h-14 flex items-center justify-between px-4 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 text-foreground hover:bg-muted rounded-md"
              data-testid="button-mobile-menu"
              aria-label="Open navigation menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <img
              src="/logo.png"
              alt="Press Start CoMixx"
              className="h-8 w-auto"
            />
            <div className="w-10" />
          </header>

          {mobileMenuOpen && (
            <div className="fixed inset-0 z-[60] md:hidden">
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setMobileMenuOpen(false)}
              />
              <div className="absolute left-0 top-0 bottom-0 w-72 bg-background shadow-xl animate-in slide-in-from-left duration-200">
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <img src="/logo.png" alt="Press Start CoMixx" className="h-10 w-auto" />
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 text-foreground hover:bg-muted rounded-md"
                    data-testid="button-close-mobile-menu"
                    aria-label="Close navigation menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="overflow-y-auto h-[calc(100%-4rem)]">
                  <AppSidebar
                    isExpanded={true}
                    isPinned={false}
                    onTogglePin={() => {}}
                    onMobileClose={() => setMobileMenuOpen(false)}
                  />
                </div>
              </div>
            </div>
          )}

          <nav
            className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border h-16 flex items-center justify-around px-2 md:hidden safe-area-bottom"
            role="navigation"
            aria-label="Mobile navigation"
            data-testid="mobile-bottom-nav"
          >
            <MobileNavItem href="/" icon={Home} label="Home" current={location === "/"} />
            <MobileNavItem href="/community" icon={Users} label="Community" current={location.startsWith("/community")} />
            <MobileNavItem href="/marketplace" icon={ShoppingBag} label="Market" current={location.startsWith("/marketplace")} />
            <MobileNavItem href="/tools/prompt" icon={Sparkles} label="AI Tools" current={location.startsWith("/tools/")} />
            <MobileNavItem href="/portfolio" icon={User} label="Portfolio" current={location === "/portfolio"} />
          </nav>
        </>
      )}

      {isMobile && isCreatorTool && !desktopBannerDismissed && (
        <div
          className="fixed top-14 left-0 right-0 z-40 bg-amber-500/90 text-black px-4 py-2.5 flex items-center gap-3 md:hidden"
          data-testid="banner-desktop-recommended"
        >
          <Monitor className="w-5 h-5 shrink-0" />
          <p className="text-xs font-bold flex-1">Desktop recommended for creator tools</p>
          <button
            onClick={() => setDesktopBannerDismissed(true)}
            className="text-xs font-bold uppercase px-3 py-1 bg-black/20 hover:bg-black/30 rounded"
            data-testid="button-dismiss-desktop-banner"
          >
            Continue
          </button>
        </div>
      )}

      <main
        id="main-content"
        className={cn(
          "min-h-screen transition-[padding-left] duration-300 ease-in-out",
          isMobile && "pt-14 pb-16"
        )}
        role="main"
        tabIndex={-1}
        style={!isMobile ? { paddingLeft: isExpanded ? "16rem" : "3rem" } : undefined}
      >
        {children}
      </main>
    </div>
  );
}

function MobileNavItem({ href, icon: Icon, label, current }: { href: string; icon: any; label: string; current: boolean }) {
  return (
    <a
      href={href}
      className={cn(
        "flex flex-col items-center gap-1 py-1 px-3 min-w-[3.5rem] rounded-md transition-colors",
        current ? "text-primary" : "text-muted-foreground"
      )}
      data-testid={`mobile-nav-${label.toLowerCase().replace(/\s/g, '-')}`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-bold">{label}</span>
    </a>
  );
}
