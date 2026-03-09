import { useState } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles, Palette, Film, Layers, BookOpen, GitBranch, Lightbulb, Zap } from "lucide-react";

const ONBOARDING_PREFIX = "pscomixx_onboarding_complete";

export function useOnboarding(userId?: number) {
  const key = userId ? `${ONBOARDING_PREFIX}:${userId}` : ONBOARDING_PREFIX;
  const [completed, setCompleted] = useState(() => {
    return localStorage.getItem(key) === "true";
  });

  const markComplete = () => {
    localStorage.setItem(key, "true");
    setCompleted(true);
  };

  return { completed, markComplete };
}

const tools = [
  { id: "comic", label: "Comics", icon: Layers, desc: "Sequential art panel builder" },
  { id: "card", label: "Trading Cards", icon: Sparkles, desc: "TCG card forge & battle system" },
  { id: "motion", label: "Motion Comics", icon: Film, desc: "Animate your panels with timeline" },
  { id: "vn", label: "Visual Novels", icon: BookOpen, desc: "Interactive fiction engine" },
  { id: "cyoa", label: "CYOA Stories", icon: GitBranch, desc: "Branching narrative builder" },
  { id: "cover", label: "Cover Design", icon: Palette, desc: "Full wrap cover designer" },
];

const tips = [
  {
    icon: Zap,
    title: "Quick Start from Dashboard",
    desc: "Use the Quick Start buttons to jump straight into any creator mode.",
  },
  {
    icon: Lightbulb,
    title: "AI-Powered Prompts",
    desc: "Visit Prompt Factory to generate prompts for your AI image tools.",
  },
  {
    icon: Layers,
    title: "Drag & Drop Everything",
    desc: "All creators support drag-and-drop for images, bubbles, and effects.",
  },
  {
    icon: Sparkles,
    title: "Community & Marketplace",
    desc: "Publish your work, browse the community library, and sell on the marketplace.",
  },
];

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);

  const toggleTool = (id: string) => {
    setSelectedTools((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const totalSteps = 3;

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" data-testid="onboarding-overlay">
      <div className="relative w-full max-w-lg mx-4 bg-zinc-950 border border-white/20 shadow-2xl">
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-10"
          data-testid="button-onboarding-skip"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex gap-1 px-6 pt-6">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 transition-colors ${
                i <= step ? "bg-white" : "bg-white/20"
              }`}
              data-testid={`progress-step-${i}`}
            />
          ))}
        </div>

        <div className="p-6 min-h-[400px] flex flex-col">
          {step === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-16 h-16 bg-white text-black flex items-center justify-center text-3xl font-bold font-display">
                PS
              </div>
              <h2 className="text-3xl font-display font-bold uppercase tracking-tighter text-white" data-testid="text-onboarding-welcome">
                Welcome to Press Start CoMiXX
              </h2>
              <p className="text-white/60 font-mono text-sm max-w-sm leading-relaxed">
                Your all-in-one creative studio for comics, cards, motion graphics, visual novels, and more.
              </p>
              <p className="text-white/40 font-mono text-xs">
                Let's get you set up in 30 seconds.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="flex-1 flex flex-col space-y-4">
              <h2 className="text-xl font-display font-bold uppercase tracking-tighter text-white" data-testid="text-onboarding-tools">
                Pick Your Tools
              </h2>
              <p className="text-white/60 font-mono text-xs">
                Select the creator modes you're interested in. You can always change this later.
              </p>
              <div className="grid grid-cols-2 gap-3 flex-1">
                {tools.map((tool) => {
                  const Icon = tool.icon;
                  const selected = selectedTools.includes(tool.id);
                  return (
                    <button
                      key={tool.id}
                      onClick={() => toggleTool(tool.id)}
                      className={`p-3 border text-left transition-all ${
                        selected
                          ? "border-white bg-white/10"
                          : "border-white/20 hover:border-white/40 bg-transparent"
                      }`}
                      data-testid={`button-tool-select-${tool.id}`}
                    >
                      <Icon className={`w-5 h-5 mb-2 ${selected ? "text-white" : "text-white/50"}`} />
                      <h3 className="text-sm font-bold font-display text-white">{tool.label}</h3>
                      <p className="text-[10px] text-white/50 mt-1">{tool.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex-1 flex flex-col space-y-4">
              <h2 className="text-xl font-display font-bold uppercase tracking-tighter text-white" data-testid="text-onboarding-tips">
                Quick Tips
              </h2>
              <p className="text-white/60 font-mono text-xs">
                A few things to help you hit the ground running.
              </p>
              <div className="space-y-3 flex-1">
                {tips.map((tip, i) => {
                  const Icon = tip.icon;
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 border border-white/10 bg-white/5"
                      data-testid={`tip-item-${i}`}
                    >
                      <Icon className="w-5 h-5 text-white/70 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="text-sm font-bold font-display text-white">{tip.title}</h3>
                        <p className="text-[11px] text-white/50 mt-0.5">{tip.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 mt-auto border-t border-white/10">
            <div>
              {step > 0 && (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1 text-sm text-white/60 hover:text-white transition-colors font-mono"
                  data-testid="button-onboarding-back"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/40 font-mono">
                {step + 1} / {totalSteps}
              </span>
              <button
                onClick={handleNext}
                className="px-5 py-2 bg-white text-black font-bold text-sm font-display uppercase tracking-wider hover:bg-zinc-200 transition-colors flex items-center gap-1"
                data-testid="button-onboarding-next"
              >
                {step === totalSteps - 1 ? "Go to Dashboard" : "Next"}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
