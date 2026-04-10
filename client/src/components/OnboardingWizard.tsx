import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  X, Palette, CreditCard, Film, ArrowRight, Sparkles, Zap, Trophy,
  CheckCircle2, BookOpen, GitBranch, Play, Monitor, Wand2,
  FileText, LayoutTemplate, ArrowLeft, Rocket, Star
} from "lucide-react";
import { useCreateProject } from "@/hooks/useProjects";
import { toast } from "sonner";

const ONBOARDING_PREFIX = "pscomixx_onboarding_complete";

export function useOnboarding(userId?: string | number) {
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

const GUIDE_PREFIX = "pscomixx_guide_seen";

export function useFirstProjectGuide(userId?: string | number) {
  const key = userId ? `${GUIDE_PREFIX}:${userId}` : GUIDE_PREFIX;
  const [guideSeen, setGuideSeen] = useState(() => {
    return localStorage.getItem(key) === "true";
  });

  const markGuideSeen = () => {
    localStorage.setItem(key, "true");
    setGuideSeen(true);
  };

  return { guideSeen, markGuideSeen };
}

const creatorPaths = [
  {
    id: "comic",
    label: "Comic",
    emoji: "\uD83C\uDFA8",
    desc: "Panels, speech bubbles, AI art, covers. Export print-ready pages.",
    quickWin: "3-panel comic with FX in 60 seconds",
    icon: Palette,
    color: "border-cyan-500",
    glow: "shadow-[0_0_24px_rgba(6,182,212,0.3)]",
    bg: "bg-cyan-500/5",
    accentText: "text-cyan-400",
    href: "/creator/comic",
    templateTitle: "My First Comic",
    templateData: {
      spreads: [
        { id: "spread_1", leftPage: [], rightPage: [] },
        { id: "spread_2", leftPage: [], rightPage: [] },
      ],
      comicMeta: { title: "My First Comic", genre: "action", style: "manga" },
    },
  },
  {
    id: "vn",
    label: "Visual Novel",
    emoji: "\uD83C\uDFAC",
    desc: "Scenes, characters, dialogue, branching choices. Like Ren'Py but easier.",
    quickWin: "Interactive story with characters in 60 seconds",
    icon: BookOpen,
    color: "border-purple-500",
    glow: "shadow-[0_0_24px_rgba(168,85,247,0.3)]",
    bg: "bg-purple-500/5",
    accentText: "text-purple-400",
    href: "/creator/vn",
    templateTitle: "My First VN",
    templateData: {},
  },
  {
    id: "cyoa",
    label: "CYOA Story",
    emoji: "\uD83C\uDFAE",
    desc: "Interactive fiction with branching paths, variables, and multiple endings.",
    quickWin: "Branching story with 5 nodes in 60 seconds",
    icon: GitBranch,
    color: "border-red-500",
    glow: "shadow-[0_0_24px_rgba(239,68,68,0.3)]",
    bg: "bg-red-500/5",
    accentText: "text-red-400",
    href: "/creator/cyoa",
    templateTitle: "My First CYOA",
    templateData: {},
  },
  {
    id: "card",
    label: "Trading Card",
    emoji: "\uD83C\uDCCF",
    desc: "Stats, abilities, art, effects. Build card packs and battle.",
    quickWin: "Custom card with stats and art in 60 seconds",
    icon: CreditCard,
    color: "border-green-500",
    glow: "shadow-[0_0_24px_rgba(34,197,94,0.3)]",
    bg: "bg-green-500/5",
    accentText: "text-green-400",
    href: "/creator/card",
    templateTitle: "My First Card",
    templateData: {
      name: "My First Card",
      cardType: "character",
      rarity: "common",
      hp: 100,
      attack: 50,
      defense: 30,
      abilities: [{ name: "Quick Strike", description: "Deal 20 damage", cost: 1 }],
      flavorText: "A hero rises from the shadows...",
    },
  },
  {
    id: "motion",
    label: "Motion / Animation",
    emoji: "\uD83C\uDFAC",
    desc: "Animate frames, add audio, keyframes, and export as video or GIF.",
    quickWin: "3-frame animation with audio in 60 seconds",
    icon: Film,
    color: "border-amber-500",
    glow: "shadow-[0_0_24px_rgba(245,158,11,0.3)]",
    bg: "bg-amber-500/5",
    accentText: "text-amber-400",
    href: "/creator/motion",
    templateTitle: "My First Clip",
    templateData: {
      frames: [
        { id: "frame_1", imageData: "", vectorPaths: [], imageLayers: [], drawingLayers: [{ id: "dl_1", name: "Layer 1", visible: true, opacity: 100, locked: false, blendMode: "normal", imageData: "" }], duration: 1000 },
        { id: "frame_2", imageData: "", vectorPaths: [], imageLayers: [], drawingLayers: [{ id: "dl_2", name: "Layer 1", visible: true, opacity: 100, locked: false, blendMode: "normal", imageData: "" }], duration: 1000 },
        { id: "frame_3", imageData: "", vectorPaths: [], imageLayers: [], drawingLayers: [{ id: "dl_3", name: "Layer 1", visible: true, opacity: 100, locked: false, blendMode: "normal", imageData: "" }], duration: 1000 },
      ],
      tracks: [{ id: "track_1", name: "Layer 1", visible: true, locked: false }],
      audioClips: [],
    },
  },
  {
    id: "hop",
    label: "HOP (Hot One-Page)",
    emoji: "\u26A1",
    desc: "Viral short-form stories with vibe modes, beat sync, and effects.",
    quickWin: "Vibe-mode story page in 60 seconds",
    icon: Zap,
    color: "border-pink-500",
    glow: "shadow-[0_0_24px_rgba(236,72,153,0.3)]",
    bg: "bg-pink-500/5",
    accentText: "text-pink-400",
    href: "/creator/hop",
    templateTitle: "My First HOP",
    templateData: {},
  },
];

const quickStartOptions = [
  {
    id: "template",
    label: "Use a Template",
    desc: "Jump in with a starter project — customize everything.",
    icon: LayoutTemplate,
    tag: "FASTEST",
    tagColor: "bg-green-500 text-white",
  },
  {
    id: "blank",
    label: "Start Blank",
    desc: "Empty canvas. Full creative freedom.",
    icon: FileText,
    tag: null,
    tagColor: "",
  },
  {
    id: "ai",
    label: "Create with AI",
    desc: "Describe your idea — AI builds the first draft.",
    icon: Wand2,
    tag: "MAGIC",
    tagColor: "bg-purple-500 text-white",
  },
];

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState<"pick" | "quickstart" | "creating" | "done">("pick");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [xpAnimated, setXpAnimated] = useState(false);
  const [, navigate] = useLocation();
  const createProject = useCreateProject();
  const [earnedXp, setEarnedXp] = useState(0);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimateIn(true), 50);
    return () => clearTimeout(t);
  }, []);

  const selectedCreator = creatorPaths.find(p => p.id === selectedPath);

  const handlePickPath = (pathId: string) => {
    setSelectedPath(pathId);
  };

  const handleContinueToQuickStart = () => {
    if (selectedPath) setStep("quickstart");
  };

  const handleBack = () => {
    if (step === "quickstart") {
      setStep("pick");
      setSelectedStart(null);
    }
  };

  const handleGo = async () => {
    if (!selectedPath || !selectedStart) return;
    const creator = creatorPaths.find(p => p.id === selectedPath);
    if (!creator) return;

    if (selectedStart === "ai") {
      onComplete();
      navigate("/tools/story");
      return;
    }

    setStep("creating");

    try {
      const project = await createProject.mutateAsync({
        title: creator.templateTitle,
        type: selectedPath,
        status: "draft",
        data: selectedStart === "template" ? creator.templateData : {},
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
        setStep("done");
        setShowCelebration(true);
        setTimeout(() => setXpAnimated(true), 300);

        setTimeout(() => {
          onComplete();
          navigate(`${creator.href}?id=${project.id}`);
        }, 2500);
      }, 1500);
    } catch {
      toast.error("Could not create project. Try again.");
      setStep("quickstart");
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const stepIndex = step === "pick" ? 0 : step === "quickstart" ? 1 : step === "creating" ? 2 : 3;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md transition-opacity duration-500 ${animateIn ? "opacity-100" : "opacity-0"}`}
      data-testid="onboarding-overlay"
    >
      <style>{`
        @keyframes ob-loading {
          0% { width: 0%; margin-left: 0; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
        @keyframes ob-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes ob-glow-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `}</style>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-cyan-500/5 blur-[120px]" style={{ animation: "ob-glow-pulse 4s ease-in-out infinite" }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-purple-500/5 blur-[120px]" style={{ animation: "ob-glow-pulse 4s ease-in-out infinite 2s" }} />
      </div>

      <div className="relative w-full max-w-3xl mx-4 bg-zinc-950/90 border border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden">
        <button
          onClick={handleSkip}
          className="absolute top-5 right-5 text-zinc-600 hover:text-white transition-colors z-10 p-1"
          data-testid="button-onboarding-skip"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex gap-1 px-6 pt-5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-0.5 flex-1 rounded-full transition-all duration-500 ${
                i <= stepIndex ? "bg-white" : "bg-zinc-800"
              }`}
              data-testid={`progress-step-${i}`}
            />
          ))}
        </div>

        <div className="p-6 sm:p-8 min-h-[520px] flex flex-col">

          {step === "pick" && (
            <div className="flex-1 flex flex-col">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-1.5 mb-4">
                  <Rocket className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">Start Here</span>
                </div>
                <h2
                  className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mb-2"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  data-testid="text-onboarding-question"
                >
                  What do you want to create?
                </h2>
                <p className="text-sm text-zinc-500 max-w-md mx-auto">
                  Pick one to get started. You can explore everything else later.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1">
                {creatorPaths.map((path) => {
                  const selected = selectedPath === path.id;
                  return (
                    <button
                      key={path.id}
                      onClick={() => handlePickPath(path.id)}
                      className={`p-4 border-2 text-left transition-all rounded-xl flex flex-col relative overflow-hidden group ${
                        selected
                          ? `${path.color} ${path.bg} ${path.glow}`
                          : "border-zinc-800 hover:border-zinc-600 bg-transparent"
                      }`}
                      data-testid={`button-mode-${path.id}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{path.emoji}</span>
                        <h3
                          className="text-sm font-black uppercase tracking-tight text-white"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          {path.label}
                        </h3>
                      </div>
                      <p className="text-[10px] text-zinc-500 leading-relaxed flex-1">
                        {path.desc}
                      </p>
                      {selected && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] font-bold uppercase" style={{ color: "inherit" }}>
                          <CheckCircle2 className={`w-3.5 h-3.5 ${path.accentText}`} />
                          <span className={path.accentText}>Selected</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-5 mt-4 border-t border-zinc-800">
                <p className="text-[10px] text-zinc-600 font-mono hidden sm:block">
                  Create &rarr; Enhance &rarr; Publish
                </p>
                <button
                  onClick={handleContinueToQuickStart}
                  disabled={!selectedPath}
                  className={`px-6 py-2.5 font-black text-sm uppercase tracking-wider flex items-center gap-2 transition-all rounded-lg ${
                    selectedPath
                      ? "bg-white text-black hover:bg-zinc-200"
                      : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                  }`}
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  data-testid="button-onboarding-continue"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === "quickstart" && selectedCreator && (
            <div className="flex-1 flex flex-col">
              <button onClick={handleBack} className="text-zinc-500 hover:text-white text-sm flex items-center gap-1 mb-4 self-start transition-colors" data-testid="button-onboarding-back">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <div className="text-center mb-6">
                <div className={`inline-flex items-center gap-2 border rounded-full px-4 py-1.5 mb-4 ${selectedCreator.color} ${selectedCreator.bg}`}>
                  <span className="text-lg">{selectedCreator.emoji}</span>
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${selectedCreator.accentText}`}>{selectedCreator.label}</span>
                </div>
                <h2
                  className="text-2xl font-black uppercase tracking-tight text-white mb-2"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  How do you want to start?
                </h2>
                <p className="text-sm text-zinc-500 max-w-md mx-auto">
                  Every option gets you creating in under 60 seconds.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
                {quickStartOptions.map((opt) => {
                  const Icon = opt.icon;
                  const selected = selectedStart === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedStart(opt.id)}
                      className={`p-5 border-2 text-left transition-all rounded-xl flex flex-col relative ${
                        selected
                          ? `${selectedCreator.color} ${selectedCreator.bg} ${selectedCreator.glow}`
                          : "border-zinc-800 hover:border-zinc-600 bg-transparent"
                      }`}
                      data-testid={`button-start-${opt.id}`}
                    >
                      {opt.tag && (
                        <span className={`absolute top-3 right-3 text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${opt.tagColor}`}>
                          {opt.tag}
                        </span>
                      )}
                      <Icon className={`w-8 h-8 mb-3 ${selected ? selectedCreator.accentText : "text-zinc-500"}`} />
                      <h3 className="text-base font-black uppercase tracking-tight text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {opt.label}
                      </h3>
                      <p className="text-[11px] text-zinc-500 leading-relaxed flex-1">
                        {opt.desc}
                      </p>
                      {selected && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] font-bold uppercase">
                          <CheckCircle2 className={`w-3.5 h-3.5 ${selectedCreator.accentText}`} />
                          <span className={selectedCreator.accentText}>Selected</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 p-3 border border-zinc-800 bg-zinc-900/50 rounded-xl">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1.5 flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400" /> Your 1-minute win
                </p>
                <p className="text-[11px] text-zinc-400 font-mono">
                  {selectedCreator.quickWin}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-zinc-800">
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-yellow-400" />
                  <span className="text-[10px] text-zinc-500 font-mono">+75 XP for your first project</span>
                </div>
                <button
                  onClick={handleGo}
                  disabled={!selectedStart || createProject.isPending}
                  className={`px-6 py-2.5 font-black text-sm uppercase tracking-wider flex items-center gap-2 transition-all rounded-lg ${
                    selectedStart
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

          {step === "creating" && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl border-2 border-white flex items-center justify-center" style={{ animation: "ob-float 2s ease-in-out infinite" }}>
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
                Loading your {selectedCreator?.label.toLowerCase()} project
              </p>
              <div className="w-48 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ animation: "ob-loading 1.5s ease-in-out infinite" }} />
              </div>
            </div>
          )}

          {step === "done" && showCelebration && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
              <div
                className={`w-20 h-20 rounded-2xl border-4 border-white flex items-center justify-center transition-all duration-700 ${
                  xpAnimated ? "scale-110 shadow-[0_0_40px_rgba(255,255,255,0.4)]" : "scale-100"
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
                <p className="text-zinc-400 text-sm">
                  Your project is ready. Let's make something awesome.
                </p>
              </div>

              <div
                className={`flex items-center gap-3 px-6 py-3 border border-zinc-800 bg-zinc-900/50 rounded-xl transition-all duration-700 ${
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
                className={`space-y-2 transition-all duration-700 delay-300 ${
                  xpAnimated ? "opacity-100" : "opacity-0"
                }`}
              >
                <div className="flex items-center justify-center gap-6 text-[11px] font-mono">
                  <span className="flex items-center gap-1.5 text-green-400">
                    <CheckCircle2 className="w-3 h-3" /> Create
                  </span>
                  <span className="text-zinc-600">&rarr;</span>
                  <span className="flex items-center gap-1.5 text-zinc-500">
                    <Play className="w-3 h-3" /> Enhance
                  </span>
                  <span className="text-zinc-600">&rarr;</span>
                  <span className="flex items-center gap-1.5 text-zinc-500">
                    <Play className="w-3 h-3" /> Publish
                  </span>
                </div>
              </div>

              <p className="text-xs text-zinc-600 font-mono animate-pulse">
                Opening your editor...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
