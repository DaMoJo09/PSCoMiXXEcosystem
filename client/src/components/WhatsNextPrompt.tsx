import { useState } from "react";
import { useLocation } from "wouter";
import { X, Globe, User, ArrowRight, Palette } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface WhatsNextPromptProps {
  onDismiss: () => void;
}

export function WhatsNextPrompt({ onDismiss }: WhatsNextPromptProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const actions = [
    {
      label: "Publish to get seen",
      desc: "Share your work in the Community Library",
      icon: Globe,
      color: "border-cyan-500",
      onClick: () => {
        onDismiss();
        navigate("/community");
      },
    },
    {
      label: "Share your portfolio",
      desc: "Build your public creator profile",
      icon: User,
      color: "border-green-500",
      onClick: () => {
        onDismiss();
        navigate(`/portfolio${user?.id ? `/${user.id}` : ""}`);
      },
    },
    {
      label: "Keep creating",
      desc: "Start a new project from the Dashboard",
      icon: Palette,
      color: "border-amber-500",
      onClick: () => {
        onDismiss();
        navigate("/dashboard");
      },
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      data-testid="whats-next-overlay"
    >
      <div className="relative w-full max-w-md mx-4 bg-zinc-950 border border-white/20 shadow-2xl">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors z-10"
          data-testid="button-whats-next-dismiss"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-mono mb-2">
            Nice work
          </p>
          <h2
            className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mb-6"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            data-testid="text-whats-next-title"
          >
            What's next?
          </h2>

          <div className="space-y-3">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  className={`w-full p-4 border-2 ${action.color} bg-white/5 text-left flex items-center gap-4 hover:bg-white/10 transition-all group`}
                  data-testid={`button-whats-next-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <Icon className="w-6 h-6 text-white flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-sm font-black uppercase tracking-tight text-white"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {action.label}
                    </h3>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{action.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-white group-hover:translate-x-1 transition-all flex-shrink-0" />
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

