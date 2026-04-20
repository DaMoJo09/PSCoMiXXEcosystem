import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  X, ArrowRight, ArrowLeft, Camera, Upload, Sparkles, CheckCircle2,
  Sun, Image as ImageIcon, Smartphone, User, Trophy, Zap, RefreshCw,
  Wand2, Ghost, Rocket, Smile, Swords, Gamepad2, Palette, Trash2,
} from "lucide-react";
import { useCreateProject } from "@/hooks/useProjects";
import { useAssetLibrary } from "@/contexts/AssetLibraryContext";
import { useFxStudio } from "@/hooks/useFxStudio";
import { toast } from "sonner";

interface Props {
  onComplete: () => void;
}

type Step = "vibe" | "ready" | "pose" | "capture" | "confirm" | "stylize" | "building" | "done";

interface Vibe {
  id: string;
  label: string;
  emoji: string;
  Icon: typeof Ghost;
  desc: string;
  color: string;
  bg: string;
  accent: string;
  panelBg: string;
}

const VIBES: Vibe[] = [
  { id: "horror",    label: "Horror",    emoji: "👻", Icon: Ghost,    desc: "Dark, eerie, nightmare fuel", color: "border-purple-500", bg: "bg-purple-500/10", accent: "text-purple-400", panelBg: "#1a0b1f" },
  { id: "scifi",     label: "Sci-Fi",    emoji: "🚀", Icon: Rocket,   desc: "Future tech, neon, space",    color: "border-cyan-500",   bg: "bg-cyan-500/10",   accent: "text-cyan-400",   panelBg: "#08182b" },
  { id: "comedy",    label: "Comedy",    emoji: "🎭", Icon: Smile,    desc: "Light, silly, meme-ready",    color: "border-yellow-500", bg: "bg-yellow-500/10", accent: "text-yellow-400", panelBg: "#fff8d6" },
  { id: "action",    label: "Action",    emoji: "🦸", Icon: Swords,   desc: "Punches, energy, heroes",     color: "border-red-500",    bg: "bg-red-500/10",    accent: "text-red-400",    panelBg: "#2b0808" },
  { id: "game",      label: "Game",      emoji: "🎮", Icon: Gamepad2, desc: "Pixel, anime, character art", color: "border-green-500",  bg: "bg-green-500/10",  accent: "text-green-400",  panelBg: "#08240e" },
  { id: "freestyle", label: "Freestyle", emoji: "🎨", Icon: Palette,  desc: "No rules, your call",         color: "border-pink-500",   bg: "bg-pink-500/10",   accent: "text-pink-400",   panelBg: "#ffffff" },
];

interface Pose {
  id: string;
  label: string;
  hint: string;
  silhouette: string; // SVG path data, viewBox 0 0 100 200
}

// Hand-tuned silhouettes — full body, readable at a glance.
const POSES: Pose[] = [
  {
    id: "neutral",
    label: "Neutral",
    hint: "Stand tall. Arms relaxed at your sides.",
    silhouette: "M50,18 a10,10 0 1,0 0.01,0 Z M42,32 L58,32 L62,90 L57,150 L60,195 L54,195 L50,160 L46,195 L40,195 L43,150 L38,90 Z",
  },
  {
    id: "action",
    label: "Action",
    hint: "Punch forward, knees bent, ready to move.",
    silhouette: "M50,18 a10,10 0 1,0 0.01,0 Z M40,32 L58,32 L72,55 L88,72 L82,80 L66,68 L62,90 L58,150 L66,195 L58,195 L52,160 L44,195 L36,195 L40,150 L36,90 Z",
  },
  {
    id: "hero",
    label: "Hero Stance",
    hint: "Feet wide, fists at hips. Own it.",
    silhouette: "M50,18 a10,10 0 1,0 0.01,0 Z M38,32 L62,32 L70,55 L78,80 L70,82 L64,68 L66,90 L72,150 L80,195 L70,195 L60,160 L50,195 L40,195 L30,160 L20,195 L10,195 L18,150 L34,90 L36,68 L30,82 L22,80 L30,55 Z",
  },
  {
    id: "expression",
    label: "Expression",
    hint: "Big face — happy, scared, angry. Camera close.",
    silhouette: "M50,40 a32,32 0 1,0 0.01,0 Z M30,90 L70,90 L78,150 L72,195 L60,195 L55,160 L50,195 L45,195 L40,160 L28,195 L22,195 Z",
  },
];

const READY_TIPS = [
  { Icon: Sun,        title: "Find your light",   desc: "Face a window or lamp. Light should hit your front, not your back." },
  { Icon: ImageIcon,  title: "Clear your stage",  desc: "Plain wall behind you. Avoid clutter, patterns, or people walking past." },
  { Icon: Smartphone, title: "Phone at chest",    desc: "Hold it level — chest or eye height. No tilted upward shots." },
  { Icon: User,       title: "Step into frame",   desc: "Full body visible — head to feet. Leave a little space around you." },
];

export function CharacterFirstOnboarding({ onComplete }: Props) {
  const [step, setStep] = useState<Step>("vibe");
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [pose, setPose] = useState<Pose | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [characterName, setCharacterName] = useState("");
  const [earnedXp, setEarnedXp] = useState(0);
  const [stylizing, setStylizing] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const stylizeTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [, navigate] = useLocation();

  const clearStylizeTimers = useCallback(() => {
    stylizeTimersRef.current.forEach(clearTimeout);
    stylizeTimersRef.current = [];
  }, []);

  const createProject = useCreateProject();
  const { addAsset } = useAssetLibrary();
  const { openFxStudio, sendToFxStudio, closeFxStudio, isOpen: fxOpen } = useFxStudio({
    onAssetReturned: (payload) => {
      if (payload?.previewUrl) {
        setCapturedDataUrl(payload.previewUrl);
        toast.success("Stylized character ready!");
      }
      setStylizing(false);
      closeFxStudio();
    },
  });

  useEffect(() => {
    const t = setTimeout(() => setAnimateIn(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Cleanup FX window + retry timers if user cancels mid-stylize
  useEffect(() => {
    return () => {
      clearStylizeTimers();
      try { closeFxStudio(); } catch {}
    };
  }, [closeFxStudio, clearStylizeTimers]);

  // Resize large photos before storing as base64 — keeps the asset POST
  // well under typical body-parser limits (avoids 413 Payload Too Large)
  // and keeps the comic project payload reasonable.
  const resizeToDataUrl = useCallback((file: File, maxDim = 1024, quality = 0.85): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("read failed"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("decode failed"));
        img.onload = () => {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("no ctx"));
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please pick an image.");
      return;
    }
    try {
      const url = await resizeToDataUrl(file);
      setCapturedDataUrl(url);
      setStep("confirm");
    } catch {
      toast.error("Could not read that image.");
    }
  }, [resizeToDataUrl]);

  const onCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  };

  const onGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  };

  const handleStylize = useCallback(() => {
    if (!capturedDataUrl) return;
    clearStylizeTimers();
    setStylizing(true);
    openFxStudio({ mode: "character" });

    // Retry sending the image a few times so we hit the FX Studio popup
    // once it's ready. All timers tracked in a ref so cleanup/skip cancels
    // them — no zombie sends after onAssetReturned or unmount.
    let tries = 0;
    const send = () => {
      tries++;
      sendToFxStudio({
        sourceImage: capturedDataUrl,
        vibe: vibe?.id || "freestyle",
        pose: pose?.id || "neutral",
        purpose: "onboarding-character",
      });
      if (tries < 8) {
        const t = setTimeout(send, 1500);
        stylizeTimersRef.current.push(t);
      }
    };
    stylizeTimersRef.current.push(setTimeout(send, 1500));

    // Auto-bail after 60s so the user is never stuck
    stylizeTimersRef.current.push(setTimeout(() => {
      clearStylizeTimers();
      setStylizing((s) => {
        if (s) {
          toast.message("Sticking with your original photo for now.");
          try { closeFxStudio(); } catch {}
          return false;
        }
        return s;
      });
    }, 60_000));
  }, [capturedDataUrl, vibe, pose, openFxStudio, sendToFxStudio, closeFxStudio, clearStylizeTimers]);

  const handleFinish = useCallback(async () => {
    if (!capturedDataUrl || !vibe) return;
    setStep("building");

    const charName = characterName.trim() || `My ${vibe.label} Character`;

    // 1. Save to character library
    let assetUrl = capturedDataUrl;
    try {
      const saved = await addAsset({
        name: charName,
        type: "image",
        url: capturedDataUrl,
        folderId: "characters",
        tags: [vibe.id, pose?.id || "neutral", "onboarding"],
      });
      if (saved?.url) assetUrl = saved.url;
    } catch (err) {
      console.error("Save character failed", err);
    }

    // 2. Build a starter comic project with the character pre-placed
    let projectId: string | null = null;
    try {
      const project = await createProject.mutateAsync({
        title: `${charName} — First Story`,
        type: "comic",
        status: "draft",
        data: {
          spreads: [
            {
              id: "spread_1",
              leftPage: [
                {
                  id: "default-cover-panel",
                  x: 0, y: 0, width: 100, height: 100,
                  backgroundColor: vibe.panelBg,
                  shape: "rectangle",
                  type: "rectangle",
                  contents: [],
                  zIndex: 0,
                  rotation: 0,
                  coverRole: "front-cover",
                },
              ],
              rightPage: [],
            },
            {
              id: "spread_2",
              leftPage: [
                {
                  id: `panel_intro_${Date.now()}`,
                  x: 5, y: 5, width: 90, height: 55,
                  backgroundColor: vibe.panelBg,
                  shape: "rectangle",
                  type: "rectangle",
                  borderWidth: 3,
                  borderColor: "#000000",
                  contents: [
                    {
                      id: `content_char_${Date.now()}`,
                      type: "image",
                      data: { url: assetUrl },
                      transform: { x: 0, y: 0, scale: 1, rotation: 0 },
                      zIndex: 0,
                    },
                  ],
                  zIndex: 0,
                  rotation: 0,
                },
                {
                  id: `panel_moment_${Date.now() + 1}`,
                  x: 5, y: 65, width: 90, height: 30,
                  backgroundColor: vibe.panelBg,
                  shape: "rectangle",
                  type: "rectangle",
                  borderWidth: 3,
                  borderColor: "#000000",
                  contents: [],
                  zIndex: 1,
                  rotation: 0,
                },
              ],
              rightPage: [],
            },
          ],
          comicMeta: {
            title: charName,
            genre: vibe.id,
            style: vibe.id === "game" ? "anime" : "manga",
          },
        },
      });
      projectId = project.id;
    } catch (err) {
      console.error("Create project failed", err);
      toast.error("Could not create your starter comic. Try again.");
      setStep("confirm");
      return;
    }

    // 3. XP rewards
    let total = 0;
    for (const action of ["first_login", "project_created", "ai_generation"]) {
      try {
        const r = await fetch("/api/xp/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action }),
        });
        if (r.ok) {
          const data = await r.json();
          total += data.xpGained || 0;
        }
      } catch { /* continue */ }
    }
    setEarnedXp(total || 175);

    // 4. Celebrate, then navigate
    setStep("done");
    setTimeout(() => {
      onComplete();
      if (projectId) navigate(`/creator/comic?id=${projectId}`);
    }, 2400);
  }, [capturedDataUrl, vibe, pose, characterName, addAsset, createProject, navigate, onComplete]);

  const stepIndex = ["vibe", "ready", "pose", "capture", "confirm", "stylize", "building", "done"].indexOf(step);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md transition-opacity duration-500 ${animateIn ? "opacity-100" : "opacity-0"}`}
      data-testid="character-onboarding-overlay"
    >
      <style>{`
        @keyframes cfo-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes cfo-pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        @keyframes cfo-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div className="relative w-full max-w-3xl mx-4 bg-zinc-950/95 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        <button
          onClick={onComplete}
          className="absolute top-5 right-5 text-zinc-600 hover:text-white z-10"
          data-testid="button-character-onboarding-skip"
          aria-label="Skip"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex gap-1 px-6 pt-5">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              className={`h-0.5 flex-1 rounded-full transition-all duration-500 ${i <= stepIndex ? "bg-white" : "bg-zinc-800"}`}
            />
          ))}
        </div>

        <div className="p-6 sm:p-8 min-h-[560px] flex flex-col">

          {/* STEP: VIBE */}
          {step === "vibe" && (
            <div className="flex-1 flex flex-col">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-1.5 mb-4">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">Step 1 of 5</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Pick your vibe
                </h2>
                <p className="text-sm text-zinc-500">This shapes your character, backgrounds, and FX.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1">
                {VIBES.map((v) => {
                  const selected = vibe?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setVibe(v)}
                      className={`p-4 border-2 text-left rounded-xl transition-all flex flex-col ${selected ? `${v.color} ${v.bg}` : "border-zinc-800 hover:border-zinc-600"}`}
                      data-testid={`button-vibe-${v.id}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{v.emoji}</span>
                        <h3 className="text-sm font-black uppercase text-white">{v.label}</h3>
                      </div>
                      <p className="text-[10px] text-zinc-500 leading-relaxed flex-1">{v.desc}</p>
                      {selected && (
                        <div className={`mt-2 flex items-center gap-1 text-[10px] font-bold uppercase ${v.accent}`}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end pt-5 mt-4 border-t border-zinc-800">
                <button
                  onClick={() => setStep("ready")}
                  disabled={!vibe}
                  className={`px-6 py-2.5 font-black text-sm uppercase tracking-wider flex items-center gap-2 rounded-lg ${vibe ? "bg-white text-black hover:bg-zinc-200" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}
                  data-testid="button-vibe-continue"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP: READY TIPS */}
          {step === "ready" && vibe && (
            <div className="flex-1 flex flex-col">
              <button onClick={() => setStep("vibe")} className="text-zinc-500 hover:text-white text-sm flex items-center gap-1 mb-4 self-start" data-testid="button-ready-back">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Let's get the best shot 🔥
                </h2>
                <p className="text-sm text-zinc-500">Four quick rules. Takes 10 seconds. Makes everything after look 10x better.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                {READY_TIPS.map((t, i) => (
                  <div key={i} className="p-4 border border-zinc-800 rounded-xl bg-zinc-900/50 flex gap-3" data-testid={`tip-${i}`}>
                    <div className={`w-10 h-10 rounded-lg ${vibe.bg} ${vibe.color} border flex items-center justify-center flex-shrink-0`}>
                      <t.Icon className={`w-5 h-5 ${vibe.accent}`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase text-white mb-1">{t.title}</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">{t.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-5 mt-4 border-t border-zinc-800">
                <button
                  onClick={() => setStep("pose")}
                  className="px-6 py-2.5 font-black text-sm uppercase tracking-wider flex items-center gap-2 bg-white text-black hover:bg-zinc-200 rounded-lg"
                  data-testid="button-ready-continue"
                >
                  Got it <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP: POSE */}
          {step === "pose" && vibe && (
            <div className="flex-1 flex flex-col">
              <button onClick={() => setStep("ready")} className="text-zinc-500 hover:text-white text-sm flex items-center gap-1 mb-4 self-start" data-testid="button-pose-back">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Pick a pose
                </h2>
                <p className="text-sm text-zinc-500">You'll match this when the camera opens.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
                {POSES.map((p) => {
                  const selected = pose?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setPose(p)}
                      className={`p-3 border-2 rounded-xl transition-all flex flex-col items-center text-center ${selected ? `${vibe.color} ${vibe.bg}` : "border-zinc-800 hover:border-zinc-600"}`}
                      data-testid={`button-pose-${p.id}`}
                    >
                      <svg viewBox="0 0 100 200" className="w-full h-32 mb-2">
                        <path d={p.silhouette} fill={selected ? "currentColor" : "#52525b"} className={selected ? vibe.accent : ""} fillRule="evenodd" />
                      </svg>
                      <h3 className="text-xs font-black uppercase text-white mb-1">{p.label}</h3>
                      <p className="text-[9px] text-zinc-500 leading-tight">{p.hint}</p>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end pt-5 mt-4 border-t border-zinc-800">
                <button
                  onClick={() => setStep("capture")}
                  disabled={!pose}
                  className={`px-6 py-2.5 font-black text-sm uppercase tracking-wider flex items-center gap-2 rounded-lg ${pose ? "bg-white text-black hover:bg-zinc-200" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}
                  data-testid="button-pose-continue"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP: CAPTURE */}
          {step === "capture" && vibe && pose && (
            <div className="flex-1 flex flex-col">
              <button onClick={() => setStep("pose")} className="text-zinc-500 hover:text-white text-sm flex items-center gap-1 mb-4 self-start" data-testid="button-capture-back">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <div className="text-center mb-4">
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Match this pose
                </h2>
                <p className="text-sm text-zinc-500">{pose.hint}</p>
              </div>

              <div className="flex-1 flex items-center justify-center">
                <div className={`relative w-56 h-80 border-2 border-dashed ${vibe.color} ${vibe.bg} rounded-2xl flex items-center justify-center`}>
                  <svg viewBox="0 0 100 200" className="w-full h-full p-4 opacity-60">
                    <path d={pose.silhouette} fill="currentColor" className={vibe.accent} fillRule="evenodd" />
                  </svg>
                  <div className="absolute -top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-black border border-zinc-700 rounded">
                    Reference
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-5 mt-4 border-t border-zinc-800">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-3 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 bg-white text-black hover:bg-zinc-200 rounded-lg"
                  data-testid="button-open-camera"
                >
                  <Camera className="w-4 h-4" /> Open Camera
                </button>
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  className="px-4 py-3 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 bg-zinc-900 text-white border border-zinc-700 hover:bg-zinc-800 rounded-lg"
                  data-testid="button-open-gallery"
                >
                  <Upload className="w-4 h-4" /> Choose Photo
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" capture="user" onChange={onCameraChange} className="hidden" data-testid="input-camera" />
                <input ref={galleryInputRef} type="file" accept="image/*" onChange={onGalleryChange} className="hidden" data-testid="input-gallery" />
              </div>
            </div>
          )}

          {/* STEP: CONFIRM */}
          {step === "confirm" && capturedDataUrl && vibe && (
            <div className="flex-1 flex flex-col">
              <div className="text-center mb-4">
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Looking good?
                </h2>
                <p className="text-sm text-zinc-500">Name your character. Optional — we'll pick one if you skip.</p>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div className={`w-56 h-72 border-4 ${vibe.color} rounded-2xl overflow-hidden bg-zinc-900`}>
                  <img src={capturedDataUrl} alt="Your character" className="w-full h-full object-cover" data-testid="img-captured" />
                </div>
                <input
                  type="text"
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  placeholder={`My ${vibe.label} Character`}
                  maxLength={40}
                  className="w-full max-w-xs px-4 py-2.5 bg-zinc-900 border border-zinc-700 focus:border-white text-white text-center rounded-lg outline-none"
                  data-testid="input-character-name"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-5 mt-4 border-t border-zinc-800">
                <button
                  onClick={() => { setCapturedDataUrl(null); setStep("capture"); }}
                  className="px-4 py-2.5 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 bg-zinc-900 text-white border border-zinc-700 hover:bg-zinc-800 rounded-lg"
                  data-testid="button-retake"
                >
                  <RefreshCw className="w-4 h-4" /> Retake
                </button>
                <button
                  onClick={() => { setStep("stylize"); handleStylize(); }}
                  className="px-4 py-2.5 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 bg-zinc-900 text-white border border-zinc-700 hover:bg-zinc-800 rounded-lg flex-1"
                  data-testid="button-stylize"
                >
                  <Wand2 className="w-4 h-4" /> Stylize with FX
                </button>
                <button
                  onClick={handleFinish}
                  className="px-4 py-2.5 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 bg-white text-black hover:bg-zinc-200 rounded-lg flex-1"
                  data-testid="button-confirm-character"
                >
                  Use This <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP: STYLIZE — FX is processing */}
          {step === "stylize" && capturedDataUrl && vibe && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <div className={`w-32 h-32 rounded-full border-4 ${vibe.color} overflow-hidden`}>
                  <img src={capturedDataUrl} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-white" style={{ animation: "cfo-spin 1.2s linear infinite" }} />
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Turning you into a {vibe.label.toLowerCase()} character...
                </h2>
                <p className="text-sm text-zinc-500 font-mono">
                  {fxOpen ? "FX Studio opened in a new tab — let it cook" : "Sending to FX Studio…"}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setStylizing(false); try { closeFxStudio(); } catch {}; handleFinish(); }}
                  className="px-4 py-2.5 font-black text-sm uppercase tracking-wider bg-white text-black hover:bg-zinc-200 rounded-lg"
                  data-testid="button-stylize-skip"
                >
                  Skip — use original
                </button>
              </div>
              {!fxOpen && stylizing && (
                <p className="text-[10px] text-zinc-600 font-mono">Popup blocked? Allow popups and try again.</p>
              )}
            </div>
          )}

          {/* STEP: BUILDING */}
          {step === "building" && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl border-2 border-white flex items-center justify-center" style={{ animation: "cfo-float 2s ease-in-out infinite" }}>
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Building your first comic...
              </h2>
              <p className="text-sm text-zinc-500 font-mono">Saving character • Creating panels • Loading editor</p>
            </div>
          )}

          {/* STEP: DONE */}
          {step === "done" && vibe && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-20 h-20 rounded-2xl border-4 border-white flex items-center justify-center" style={{ animation: "cfo-float 2s ease-in-out infinite" }}>
                <Trophy className="w-10 h-10 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tight text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }} data-testid="text-onboarding-done">
                  You're a character now
                </h2>
                <p className="text-zinc-400 text-sm">Saved to your library. Comic editor opening...</p>
              </div>
              <div className="flex items-center gap-3 px-6 py-3 border border-zinc-800 bg-zinc-900/50 rounded-xl">
                <Zap className="w-5 h-5 text-yellow-400" />
                <div className="text-left">
                  <p className="text-lg font-black text-white" data-testid="text-xp-earned">+{earnedXp} XP</p>
                  <p className="text-[10px] text-zinc-500 font-mono uppercase">Character + first project</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

const KEY_PREFIX = "pscomixx_character_onboarding_complete";

export function useCharacterFirstOnboarding(userId?: string | number) {
  const key = userId ? `${KEY_PREFIX}:${userId}` : KEY_PREFIX;
  const [completed, setCompleted] = useState(() => localStorage.getItem(key) === "true");
  const markComplete = () => {
    localStorage.setItem(key, "true");
    setCompleted(true);
  };
  return { completed, markComplete };
}
