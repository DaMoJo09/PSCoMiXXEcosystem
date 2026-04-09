import { useLocation } from "wouter";
import { X, Globe, User, ArrowRight, Palette, Zap, Play, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface WhatsNextPromptProps {
  onDismiss: () => void;
}

export function WhatsNextPrompt({ onDismiss }: WhatsNextPromptProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const actions = [
    {
      label: "Publish to Community",
      desc: "Go live in the Community Library where everyone can see your work",
      xpHint: "+100 XP",
      icon: Globe,
      color: "border-cyan-500",
      primary: true,
      onClick: () => {
        onDismiss();
        navigate("/community");
      },
    },
    {
      label: "Stream on PressPlays",
      desc: "Publish to the streaming platform for a wider audience",
      xpHint: "+100 XP",
      icon: Play,
      color: "border-green-500",
      primary: false,
      external: "https://psstreaming.com",
      onClick: () => {
        onDismiss();
        window.open("https://psstreaming.com", "_blank");
      },
    },
    {
      label: "Add to Portfolio",
      desc: "Build your public creator profile for scouts and recruiters",
      xpHint: "+25 XP",
      icon: User,
      color: "border-amber-500",
      primary: false,
      onClick: () => {
        onDismiss();
        navigate(`/portfolio${user?.id ? `/${user.id}` : ""}`);
      },
    },
    {
      label: "Keep Creating",
      desc: "Jump back to the Dashboard and start something new",
      xpHint: "+50 XP",
      icon: Palette,
      color: "border-zinc-600",
      primary: false,
      onClick: () => {
        onDismiss();
        navigate("/");
      },
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      data-testid="whats-next-overlay"
    >
      <div className="relative w-full max-w-md mx-4 bg-zinc-950 border-2 border-cyan-500/40 shadow-[0_0_40px_rgba(0,255,255,0.1)]">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors z-10"
          data-testid="button-whats-next-dismiss"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <p className="text-[10px] text-cyan-400 uppercase tracking-[0.2em] font-mono">
              Export complete
            </p>
          </div>
          <h2
            className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mb-1"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            data-testid="text-whats-next-title"
          >
            What's next?
          </h2>
          <p className="text-[11px] text-zinc-500 font-mono mb-6">
            Publish your work to earn XP and get seen by the community.
          </p>

          <div className="space-y-3">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  className={`w-full p-4 border-2 ${action.color} text-left flex items-center gap-4 hover:bg-white/10 transition-all group ${action.primary ? "bg-cyan-500/10" : "bg-white/5"}`}
                  data-testid={`button-whats-next-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className={`w-10 h-10 border-2 ${action.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3
                        className="text-sm font-black uppercase tracking-tight text-white"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {action.label}
                      </h3>
                      {action.external && <ExternalLink className="w-3 h-3 text-zinc-600" />}
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{action.desc}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] text-yellow-400 font-bold font-mono">{action.xpHint}</span>
                    <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-[10px] text-zinc-600 font-mono text-center mt-6">
            Create. Publish. Get seen. Level up.
          </p>
        </div>
      </div>
    </div>
  );
}
