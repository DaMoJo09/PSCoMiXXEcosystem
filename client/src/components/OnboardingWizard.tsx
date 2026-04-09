import { useState } from "react";
import { useLocation } from "wouter";
import { X, Palette, CreditCard, Film, ArrowRight, Sparkles, Zap, Trophy, CheckCircle2, BookOpen, GitBranch, Play } from "lucide-react";
import { useCreateProject } from "@/hooks/useProjects";
import { toast } from "sonner";

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

interface ComicSpread {
  id: string;
  leftPage: string[];
  rightPage: string[];
}

interface ComicMeta {
  title: string;
  genre: string;
  style: string;
}

interface ComicTemplateData {
  spreads: ComicSpread[];
  comicMeta: ComicMeta;
}

interface CardAbility {
  name: string;
  description: string;
  cost: number;
}

interface CardTemplateData {
  name: string;
  cardType: string;
  rarity: string;
  hp: number;
  attack: number;
  defense: number;
  abilities: CardAbility[];
  flavorText: string;
}

interface DrawingLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  locked: boolean;
  blendMode: string;
  imageData: string;
}

interface MotionFrame {
  id: string;
  imageData: string;
  vectorPaths: string[];
  imageLayers: string[];
  drawingLayers: DrawingLayer[];
  duration: number;
}

interface MotionTrack {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
}

interface MotionTemplateData {
  frames: MotionFrame[];
  tracks: MotionTrack[];
  audioClips: unknown[];
}

type TemplateData = ComicTemplateData | CardTemplateData | MotionTemplateData;

const comicTemplate: ComicTemplateData = {
  spreads: [
    { id: "spread_1", leftPage: [], rightPage: [] },
    { id: "spread_2", leftPage: [], rightPage: [] },
  ],
  comicMeta: { title: "My First Comic", genre: "action", style: "manga" },
};

const cardTemplate: CardTemplateData = {
  name: "My First Card",
  cardType: "character",
  rarity: "common",
  hp: 100,
  attack: 50,
  defense: 30,
  abilities: [{ name: "Quick Strike", description: "Deal 20 damage", cost: 1 }],
  flavorText: "A hero rises from the shadows...",
};

const motionTemplate: MotionTemplateData = {
  frames: [
    { id: "frame_1", imageData: "", vectorPaths: [], imageLayers: [], drawingLayers: [{ id: "dl_1", name: "Layer 1", visible: true, opacity: 100, locked: false, blendMode: "normal", imageData: "" }], duration: 1000 },
    { id: "frame_2", imageData: "", vectorPaths: [], imageLayers: [], drawingLayers: [{ id: "dl_2", name: "Layer 1", visible: true, opacity: 100, locked: false, blendMode: "normal", imageData: "" }], duration: 1000 },
    { id: "frame_3", imageData: "", vectorPaths: [], imageLayers: [], drawingLayers: [{ id: "dl_3", name: "Layer 1", visible: true, opacity: 100, locked: false, blendMode: "normal", imageData: "" }], duration: 1000 },
  ],
  tracks: [{ id: "track_1", name: "Layer 1", visible: true, locked: false }],
  audioClips: [],
};

const templateMap: Record<string, TemplateData> = {
  comic: comicTemplate,
  card: cardTemplate,
  motion: motionTemplate,
};

const modes = [
  {
    id: "comic",
    label: "Comic",
    desc: "Panels, speech bubbles, covers, and AI art. Export print-ready pages.",
    output: "Print-ready comic pages",
    icon: Palette,
    color: "border-cyan-500",
    glow: "shadow-[0_0_20px_rgba(6,182,212,0.3)]",
    href: "/creator/comic",
    templateTitle: "My First Comic",
  },
  {
    id: "card",
    label: "Trading Card",
    desc: "Stats, abilities, art, and effects. Build card packs and sell them.",
    output: "Collectible card packs",
    icon: CreditCard,
    color: "border-green-500",
    glow: "shadow-[0_0_20px_rgba(34,197,94,0.3)]",
    href: "/creator/card",
    templateTitle: "My First Card",
  },
  {
    id: "motion",
    label: "Short Clip",
    desc: "Animate frames on a timeline with keyframes and audio. Export as video.",
    output: "Animated video/GIF",
    icon: Film,
    color: "border-amber-500",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.3)]",
    href: "/creator/motion",
    templateTitle: "My First Clip",
  },
];

const xpActions = [
  { action: "Create a project", xp: "+50 XP" },
  { action: "Save your work", xp: "+10 XP" },
  { action: "Export", xp: "+25 XP" },
  { action: "Publish", xp: "+100 XP" },
];

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [xpAnimated, setXpAnimated] = useState(false);
  const [, navigate] = useLocation();
  const createProject = useCreateProject();
  const [earnedXp, setEarnedXp] = useState(0);

  const totalSteps = 3;

  const handleModeSelect = (modeId: string) => {
    setSelectedMode(modeId);
  };

  const handleGoCreate = async () => {
    if (!selectedMode) return;

    const mode = modes.find(m => m.id === selectedMode);
    if (!mode) return;

    setStep(1);

    try {
      await createProject.mutateAsync({
        title: mode.templateTitle,
        type: selectedMode,
        status: "published",
        data: templateMap[selectedMode] || {},
        forceNew: true,
      });

      let totalXp = 0;
      for (const action of ["first_login", "project_created"]) {
        try {
          const xpRes = await fetch("/api/xp/action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
            credentials: "include",
          });
          if (xpRes.ok) {
            const xpData = await xpRes.json();
            totalXp += xpData.xpGained || 0;
          }
        } catch { /* continue */ }
      }
      setEarnedXp(totalXp);

      setTimeout(() => {
        setStep(2);
        setShowCelebration(true);
        setTimeout(() => setXpAnimated(true), 300);

        setTimeout(() => {
          onComplete();
          navigate("/");
        }, 3000);
      }, 1500);
    } catch {
      toast.error("Could not create project. Try again.");
      setStep(0);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      data-testid="onboarding-overlay"
    >
      <div className="relative w-full max-w-2xl mx-4 bg-zinc-950 border-2 border-white/20 shadow-2xl">
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors z-10"
          data-testid="button-onboarding-skip"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex gap-1 px-6 pt-6">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 transition-all duration-500 ${
                i <= step ? "bg-white" : "bg-white/10"
              }`}
              data-testid={`progress-step-${i}`}
            />
          ))}
        </div>

        <div className="p-6 sm:p-8 min-h-[480px] flex flex-col">
          {step === 0 && (
            <div className="flex-1 flex flex-col">
              <div className="text-center mb-6">
                <p className="text-xs text-cyan-400 uppercase tracking-[0.3em] font-mono mb-3">
                  START HERE
                </p>
                <h2
                  className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mb-2"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  data-testid="text-onboarding-question"
                >
                  What do you want to make?
                </h2>
                <p className="text-sm text-zinc-400 font-mono max-w-md mx-auto">
                  Pick one to start. Your first project will be ready in seconds. You can always explore more later.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
                {modes.map((mode) => {
                  const Icon = mode.icon;
                  const selected = selectedMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => handleModeSelect(mode.id)}
                      className={`p-5 border-2 text-left transition-all flex flex-col ${
                        selected
                          ? `${mode.color} bg-white/5 ${mode.glow}`
                          : "border-zinc-800 hover:border-zinc-600 bg-transparent"
                      }`}
                      data-testid={`button-mode-${mode.id}`}
                    >
                      <Icon className={`w-8 h-8 mb-3 ${selected ? "text-white" : "text-zinc-500"}`} />
                      <h3
                        className="text-lg font-black uppercase tracking-tight text-white mb-1"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {mode.label}
                      </h3>
                      <p className="text-[11px] text-zinc-500 leading-relaxed flex-1">
                        {mode.desc}
                      </p>
                      <p className="text-[10px] text-zinc-600 font-mono mt-2 border-t border-zinc-800 pt-2">
                        You'll make: {mode.output}
                      </p>
                      {selected && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] text-white font-bold uppercase">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 p-3 border border-zinc-800 bg-zinc-900/50">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-yellow-400" /> How you'll earn XP
                </p>
                <div className="flex flex-wrap gap-3">
                  {xpActions.map((a) => (
                    <span key={a.action} className="text-[10px] font-mono text-zinc-500">
                      {a.action} <span className="text-yellow-400 font-bold">{a.xp}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/10">
                <p className="text-[10px] text-zinc-600 font-mono">
                  Create. Publish. Get seen. Level up.
                </p>
                <button
                  onClick={handleGoCreate}
                  disabled={!selectedMode || createProject.isPending}
                  className={`px-6 py-2.5 font-black text-sm uppercase tracking-wider flex items-center gap-2 transition-all border-none cursor-pointer ${
                    selectedMode
                      ? "bg-white text-black hover:bg-zinc-200"
                      : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                  }`}
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  data-testid="button-onboarding-go"
                >
                  {createProject.isPending ? "Setting up..." : "Let's go"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-16 h-16 border-2 border-white flex items-center justify-center animate-pulse">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2
                className="text-2xl font-black uppercase tracking-tight text-white"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                data-testid="text-onboarding-loading"
              >
                Setting up your workspace...
              </h2>
              <p className="text-sm text-zinc-500 font-mono">
                Loading your {modes.find(m => m.id === selectedMode)?.label.toLowerCase()} template
              </p>
              <div className="w-48 h-1 bg-zinc-800 overflow-hidden">
                <div className="h-full bg-white animate-[loading_1.5s_ease-in-out_infinite]" />
              </div>
            </div>
          )}

          {step === 2 && showCelebration && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
              <div
                className={`w-20 h-20 border-4 border-white flex items-center justify-center transition-all duration-700 ${
                  xpAnimated ? "scale-110 shadow-[0_0_40px_rgba(255,255,255,0.5)]" : "scale-100"
                }`}
              >
                <Trophy className="w-10 h-10 text-yellow-400" />
              </div>

              <div>
                <h2
                  className="text-3xl font-black uppercase tracking-tight text-white mb-2"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  data-testid="text-onboarding-celebration"
                >
                  You're in!
                </h2>
                <p className="text-zinc-400 font-mono text-sm">
                  Your first project is ready. Start creating and earn XP for everything you do.
                </p>
              </div>

              <div
                className={`flex items-center gap-3 px-6 py-3 border-2 border-white bg-white/5 transition-all duration-700 ${
                  xpAnimated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
              >
                <Zap className="w-5 h-5 text-yellow-400" />
                <div className="text-left">
                  <p className="text-lg font-black text-white" data-testid="text-xp-earned">+{earnedXp || 75} XP</p>
                  <p className="text-[10px] text-zinc-500 font-mono uppercase">First login + Project created</p>
                </div>
              </div>

              <div
                className={`text-left w-full max-w-xs space-y-1 transition-all duration-700 delay-300 ${
                  xpAnimated ? "opacity-100" : "opacity-0"
                }`}
              >
                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Your journey:</p>
                <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
                  <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" /> Created your first project
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
                  <Play className="w-3 h-3 text-zinc-600 shrink-0" /> Export and share it
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
                  <Play className="w-3 h-3 text-zinc-600 shrink-0" /> Publish to get seen
                </div>
              </div>

              <p className="text-xs text-zinc-600 font-mono animate-pulse">
                Taking you to your dashboard...
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes loading {
          0% { width: 0%; margin-left: 0; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}
