import { useState, useEffect } from "react";
import { X, ArrowRight, Sparkles, Layers, Download, Rocket, CheckCircle2 } from "lucide-react";

const GUIDE_KEY_PREFIX = "pscomixx_editor_guide";

interface GuideStep {
  id: string;
  title: string;
  desc: string;
  icon: typeof Sparkles;
  accentColor: string;
}

const guideSteps: Record<string, GuideStep[]> = {
  comic: [
    { id: "panel", title: "Add Your First Panel", desc: "Click the + button in the toolbar to add a panel to your page.", icon: Layers, accentColor: "text-cyan-400" },
    { id: "effect", title: "Try an Effect", desc: "Select a panel and apply a filter or use FX Studio for AI effects.", icon: Sparkles, accentColor: "text-purple-400" },
    { id: "export", title: "Export Your Work", desc: "Click Export to save your comic as images or a PDF.", icon: Download, accentColor: "text-green-400" },
  ],
  vn: [
    { id: "dialogue", title: "Write Your First Line", desc: "Click 'Add Line' to create dialogue for your scene.", icon: Layers, accentColor: "text-purple-400" },
    { id: "character", title: "Add a Character", desc: "Go to the Characters tab and create a character with expressions.", icon: Sparkles, accentColor: "text-cyan-400" },
    { id: "playtest", title: "Playtest Your Story", desc: "Click Playtest to see your visual novel come to life.", icon: Rocket, accentColor: "text-green-400" },
  ],
  cyoa: [
    { id: "node", title: "Edit Your First Node", desc: "Double-click a node to add story text and choices.", icon: Layers, accentColor: "text-red-400" },
    { id: "choice", title: "Add a Choice", desc: "Create branching paths by adding choices that lead to different nodes.", icon: Sparkles, accentColor: "text-amber-400" },
    { id: "preview", title: "Preview Your Story", desc: "Click Play to experience your interactive story as a reader.", icon: Rocket, accentColor: "text-green-400" },
  ],
  card: [
    { id: "art", title: "Add Card Art", desc: "Upload an image or use AI to generate your card's artwork.", icon: Layers, accentColor: "text-green-400" },
    { id: "stats", title: "Set Stats & Abilities", desc: "Configure HP, attack, defense, and special abilities.", icon: Sparkles, accentColor: "text-cyan-400" },
    { id: "export", title: "Export Your Card", desc: "Download your card as a high-quality image.", icon: Download, accentColor: "text-amber-400" },
  ],
  motion: [
    { id: "frame", title: "Draw Your First Frame", desc: "Use the drawing tools to create your first animation frame.", icon: Layers, accentColor: "text-amber-400" },
    { id: "timeline", title: "Add More Frames", desc: "Click + in the timeline to add frames and create motion.", icon: Sparkles, accentColor: "text-cyan-400" },
    { id: "export", title: "Export as Video", desc: "Click Export to render your animation as a video or GIF.", icon: Download, accentColor: "text-green-400" },
  ],
  hop: [
    { id: "content", title: "Add Content", desc: "Drop in images, text, or effects to build your scene.", icon: Layers, accentColor: "text-pink-400" },
    { id: "vibe", title: "Pick a Vibe", desc: "Choose a vibe mode to instantly style your entire page.", icon: Sparkles, accentColor: "text-purple-400" },
    { id: "export", title: "Export & Share", desc: "Export your HOP as an image or video to share.", icon: Rocket, accentColor: "text-green-400" },
  ],
};

interface FirstProjectGuideProps {
  editorType: string;
  userId?: string | number;
}

export function FirstProjectGuide({ editorType, userId }: FirstProjectGuideProps) {
  const key = userId ? `${GUIDE_KEY_PREFIX}:${userId}:${editorType}` : `${GUIDE_KEY_PREFIX}:${editorType}`;
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(key) === "true");
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [minimized, setMinimized] = useState(false);

  const steps = guideSteps[editorType];
  if (!steps || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(key, "true");
    setDismissed(true);
  };

  const handleComplete = () => {
    const next = new Set(completedSteps);
    next.add(currentStep);
    setCompletedSteps(next);
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleDismiss();
    }
  };

  const step = steps[currentStep];
  const Icon = step.icon;
  const progress = completedSteps.size / steps.length;

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-20 right-4 z-40 bg-black/80 border border-zinc-800 rounded-xl px-3 py-2 backdrop-blur-xl shadow-lg shadow-black/40 flex items-center gap-2 hover:bg-zinc-900 transition-all"
        data-testid="button-guide-expand"
      >
        <Rocket className="w-4 h-4 text-cyan-400" />
        <span className="text-[11px] font-bold text-white">Guide</span>
        <span className="text-[9px] text-zinc-500 font-mono">{completedSteps.size}/{steps.length}</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 w-72 bg-black/90 border border-zinc-800 rounded-xl backdrop-blur-xl shadow-lg shadow-black/40 overflow-hidden" data-testid="first-project-guide">
      <div className="h-0.5 bg-zinc-800">
        <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500" style={{ width: `${progress * 100}%` }} />
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-cyan-400" />
            <span className="text-[11px] font-bold text-white uppercase tracking-wider">Quick Guide</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setMinimized(true)} className="p-1 text-zinc-600 hover:text-white transition-colors" data-testid="button-guide-minimize">
              <ArrowRight className="w-3 h-3 rotate-90" />
            </button>
            <button onClick={handleDismiss} className="p-1 text-zinc-600 hover:text-white transition-colors" data-testid="button-guide-dismiss">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex gap-1.5 mb-3">
          {steps.map((s, i) => (
            <div key={s.id} className={`h-1 flex-1 rounded-full transition-all ${completedSteps.has(i) ? "bg-green-500" : i === currentStep ? "bg-white" : "bg-zinc-800"}`} />
          ))}
        </div>

        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-lg border border-zinc-800 flex items-center justify-center shrink-0 ${completedSteps.has(currentStep) ? "bg-green-500/20 border-green-500/30" : "bg-zinc-900"}`}>
            {completedSteps.has(currentStep) ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <Icon className={`w-4 h-4 ${step.accentColor}`} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white mb-0.5">{step.title}</h4>
            <p className="text-[11px] text-zinc-500 leading-relaxed">{step.desc}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
          <span className="text-[10px] text-zinc-600 font-mono">Step {currentStep + 1} of {steps.length}</span>
          <button
            onClick={handleComplete}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold rounded-lg transition-all flex items-center gap-1"
            data-testid="button-guide-next"
          >
            {currentStep < steps.length - 1 ? "Done, next" : "Finish"}
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
