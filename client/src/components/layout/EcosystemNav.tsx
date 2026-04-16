import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, Wand2, Radio, GraduationCap, LayoutGrid, User, ChevronDown } from "lucide-react";

interface EcosystemApp {
  key: string;
  name: string;
  shortName: string;
  icon: typeof Sparkles;
  url: string;
  ssoTarget: string | null;
  description: string;
}

const ECOSYSTEM_APPS: EcosystemApp[] = [
  { key: "hub", name: "MMM Hub", shortName: "Hub", icon: LayoutGrid, url: "/ecosystem", ssoTarget: null, description: "Ecosystem dashboard" },
  { key: "comixx", name: "CoMiXX", shortName: "CoMiXX", icon: Sparkles, url: "/", ssoTarget: null, description: "Creative studio" },
  { key: "fxstudio", name: "FX Studio", shortName: "FX", icon: Wand2, url: "https://www.pscomixx.online", ssoTarget: "fxstudio", description: "Effects & assets" },
  { key: "streaming", name: "PS Streaming", shortName: "Stream", icon: Radio, url: "https://psstreaming.com", ssoTarget: "streaming", description: "Showcase & engage" },
  { key: "lms", name: "Press Start LMS", shortName: "LMS", icon: GraduationCap, url: "https://pressstart.tech", ssoTarget: "lms", description: "Learn & certify" },
];

export function EcosystemNav() {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);

  const isDesktopMode = typeof window !== "undefined" && (
    window.location.search.includes("hub=1") ||
    localStorage.getItem("mmm-hub-mode") === "1"
  );

  const handleAppClick = useCallback(async (app: EcosystemApp) => {
    if (!app.ssoTarget) {
      window.location.href = app.url;
      return;
    }

    try {
      const res = await fetch(`/api/auth/sso/redirect?target=${encodeURIComponent(app.ssoTarget)}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.redirectUrl) {
          window.open(data.redirectUrl, "_blank");
          return;
        }
      }
    } catch {}

    window.open(app.url, "_blank");
  }, []);

  const currentApp = "comixx";

  return (
    <div className="bg-black border-b border-zinc-800" data-testid="ecosystem-nav">
      <div className="max-w-screen-2xl mx-auto px-2">
        <div className="flex items-center h-8 gap-0.5 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-zinc-400 hover:text-white transition shrink-0 md:hidden"
            data-testid="ecosystem-nav-toggle"
          >
            <LayoutGrid className="w-3 h-3" />
            <ChevronDown className={`w-2.5 h-2.5 transition ${expanded ? "rotate-180" : ""}`} />
          </button>

          <div className={`flex items-center gap-0.5 ${expanded ? "flex-wrap" : ""} md:flex`}>
            {ECOSYSTEM_APPS.map((app) => {
              const Icon = app.icon;
              const isCurrent = app.key === currentApp;
              return (
                <button
                  key={app.key}
                  onClick={() => handleAppClick(app)}
                  className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium transition shrink-0 ${
                    isCurrent
                      ? "text-white bg-zinc-800 border-b border-white"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                  }`}
                  title={app.description}
                  data-testid={`ecosystem-nav-${app.key}`}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{app.shortName}</span>
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-2 shrink-0">
            {user && (
              <a
                href="/ecosystem/passport"
                className="flex items-center gap-1 px-2 py-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition"
                data-testid="ecosystem-nav-passport"
              >
                <User className="w-3 h-3" />
                <span className="hidden sm:inline">Passport</span>
              </a>
            )}
            {isDesktopMode && (
              <span className="text-[9px] text-emerald-500 bg-emerald-950 px-1.5 py-0.5 font-bold">HUB</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
