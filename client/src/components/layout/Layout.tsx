import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { AppSidebar } from "./AppSidebar";
import { Menu, X, Home, ShoppingBag, Users, User, Sparkles, Monitor, Layers, Settings, Shield, FileText, Mail, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { AppIcon, AppIconInline } from "@/components/ui/app-icon";
import { BugReportButton } from "@/components/BugReportDialog";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";
import { EcosystemNav } from "./EcosystemNav";

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
  const { enabled: marketplaceEnabled } = useFeatureFlag("marketplace_enabled");
  const { enabled: communityEnabled } = useFeatureFlag("community_enabled");
  const { enabled: aiToolsEnabled } = useFeatureFlag("ai_tools_enabled");

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

      <EcosystemNav />

      {!isMobile && (
        <div
          className="fixed left-0 top-8 h-[calc(100vh-2rem)] z-50 hidden md:block"
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
          <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border h-14 flex items-center justify-between px-4 md:hidden safe-area-top">
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
            <SyncStatusIndicator />
          </header>

          {mobileMenuOpen && (
            <div className="fixed inset-0 z-[60] md:hidden">
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setMobileMenuOpen(false)}
              />
              <div className="absolute left-0 top-0 bottom-0 w-72 bg-background shadow-xl animate-in slide-in-from-left duration-200 flex flex-col safe-area-top">
                <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
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
                <div className="overflow-y-auto flex-1 min-h-0">
                  <AppSidebar
                    isExpanded={true}
                    isPinned={false}
                    onTogglePin={() => {}}
                    onMobileClose={() => setMobileMenuOpen(false)}
                  />
                </div>
                <div className="border-t border-border px-4 py-3 space-y-1 bg-background shrink-0 safe-area-bottom">
                  <Link
                    href="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                    data-testid="mobile-drawer-settings"
                  >
                    <AppIconInline icon={Settings} />
                    Settings & Account
                  </Link>
                  <Link
                    href="/contact"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                    data-testid="mobile-drawer-contact"
                  >
                    <AppIconInline icon={Mail} />
                    Support & Contact
                  </Link>
                  <div className="flex items-center gap-4 pt-1">
                    <Link
                      href="/privacy"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-[11px] text-muted-foreground hover:text-foreground"
                      data-testid="mobile-drawer-privacy"
                    >
                      Privacy Policy
                    </Link>
                    <Link
                      href="/terms"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-[11px] text-muted-foreground hover:text-foreground"
                      data-testid="mobile-drawer-terms"
                    >
                      Terms of Service
                    </Link>
                  </div>
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
            {communityEnabled && <MobileNavItem href="/community" icon={Users} label="Community" current={location.startsWith("/community")} />}
            {marketplaceEnabled && <MobileNavItem href="/marketplace" icon={ShoppingBag} label="Market" current={location.startsWith("/marketplace")} />}
            {aiToolsEnabled && <MobileNavItem href="/tools/prompt" icon={Sparkles} label="AI Tools" current={location.startsWith("/tools/")} />}
            {!communityEnabled && <MobileNavItem href="/library" icon={Layers} label="Library" current={location === "/library"} />}
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
          isMobile && "pt-14 pb-20"
        )}
        role="main"
        tabIndex={-1}
        style={!isMobile ? { paddingLeft: isExpanded ? "16rem" : "3rem" } : undefined}
      >
        {children}
      </main>
      <BugReportButton />
    </div>
  );
}

function MobileNavItem({ href, icon: Icon, label, current }: { href: string; icon: any; label: string; current: boolean }) {
  return (
    <a
      href={href}
      className={cn(
        "flex flex-col items-center gap-1 py-1 px-2 min-w-[3rem] transition-colors",
        current ? "text-foreground" : "text-muted-foreground"
      )}
      data-testid={`mobile-nav-${label.toLowerCase().replace(/\s/g, '-')}`}
    >
      <div className={cn(
        "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200",
        current
          ? "bg-foreground text-background shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
          : "bg-muted/50 text-muted-foreground border border-border/40"
      )}>
        <Icon className="w-4.5 h-4.5" strokeWidth={2} />
      </div>
      <span className={cn("text-[9px] font-bold", current && "text-foreground")}>{label}</span>
    </a>
  );
}
