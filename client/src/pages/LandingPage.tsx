import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { shouldBlockDirectPayments } from "@/lib/platform";
import {
  Sparkles, Film, Wand2, GraduationCap, Palette, ArrowRight, Trophy, Eye, Rocket,
  BookOpen, Users, School, CheckCircle2, Layers, Gamepad2, Zap, Monitor,
  BookOpenCheck, Clapperboard, Shield, Award, FileText, Play
} from "lucide-react";
import { EventCarousel } from "@/components/EventCarousel";

interface FeaturedSeries {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  creatorName: string;
  comicCount: number;
  subscriberCount: number;
}

function FeaturedSeriesSection() {
  const { data: series = [] } = useQuery<FeaturedSeries[]>({
    queryKey: ["featured-series"],
    queryFn: async () => {
      const res = await fetch("/api/community/series-featured");
      if (!res.ok) return [];
      return res.json();
    },
  });

  if (series.length === 0) return null;

  return (
    <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-8 bg-zinc-950 border-t-2 border-zinc-800" data-testid="section-featured-series">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10 text-center">
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.3em] block mb-4">FROM THE COMMUNITY</span>
          <h3 className="text-2xl sm:text-4xl font-black uppercase tracking-tight mb-4 text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            FEATURED SERIES
          </h3>
          <div className="w-24 h-1 bg-cyan-500 mx-auto" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {series.map((s) => (
            <Link key={s.id} href={`/community/series/${s.id}`}>
              <div className="group border-2 border-zinc-800 bg-zinc-900 hover:border-cyan-500 transition-all cursor-pointer" data-testid={`featured-series-card-${s.id}`}>
                <div className="aspect-[3/2] overflow-hidden">
                  {s.coverImage ? (
                    <img src={s.coverImage} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><BookOpen className="w-12 h-12 text-zinc-700" /></div>
                  )}
                </div>
                <div className="p-4">
                  <h4 className="font-black text-white text-lg truncate group-hover:text-cyan-400 transition-colors" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{s.title}</h4>
                  {s.description && <p className="text-zinc-500 text-sm mt-1 line-clamp-2">{s.description}</p>}
                  <div className="flex items-center justify-between mt-3 text-xs text-zinc-500 font-bold">
                    <span>{s.creatorName}</span>
                    <div className="flex items-center gap-3">
                      <span>{s.comicCount} ch</span>
                      {s.subscriberCount > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {s.subscriberCount}</span>}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

const flowSteps = [
  { icon: Sparkles, title: "CREATE", description: "Build comics, cards, stories, and motion art with AI-powered tools", accent: "border-cyan-500 text-cyan-400" },
  { icon: Rocket, title: "PUBLISH", description: "One-click publish to the streaming platform and community library", accent: "border-green-500 text-green-400" },
  { icon: Eye, title: "GET SEEN", description: "Build your audience, sell on the marketplace, grow your portfolio", accent: "border-amber-500 text-amber-400" },
  { icon: Trophy, title: "LEVEL UP", description: "Earn XP, unlock tools, earn certifications, and get recruited", accent: "border-red-500 text-red-400" },
];

const creatorTools = [
  { icon: BookOpen, title: "Comic Creator", description: "Full comic studio with panels, covers, speech bubbles, drawing tools, and AI art generation. Export print-ready 300 DPI.", accent: "border-cyan-500", accentColor: "text-cyan-400" },
  { icon: Gamepad2, title: "Card Creator", description: "Design trading cards and sports cards. Build card packs. Sell on the marketplace.", accent: "border-amber-500", accentColor: "text-amber-400" },
  { icon: Clapperboard, title: "Motion Studio", description: "Animate your art with keyframes, audio, and timeline editing. Export as video or GIF.", accent: "border-red-500", accentColor: "text-red-400" },
  { icon: BookOpenCheck, title: "Visual Novel", description: "Create Ren'Py-style visual novels with scenes, characters, dialogue trees, and transitions.", accent: "border-violet-500", accentColor: "text-violet-400" },
  { icon: Layers, title: "CYOA Builder", description: "Build branching interactive fiction with variables, conditions, and audio per scene.", accent: "border-green-500", accentColor: "text-green-400" },
  { icon: Zap, title: "HOPs Studio", description: "Create viral short-form content with beat sync, vibe modes, and instant export for streaming.", accent: "border-pink-500", accentColor: "text-pink-400" },
  { icon: Wand2, title: "FX Studio", description: "Effects pipeline for overlays, filters, and asset enhancement. Syncs with all creator modes.", accent: "border-orange-500", accentColor: "text-orange-400" },
];

const audienceSections = [
  {
    icon: GraduationCap, tag: "STUDENTS", title: "Learn by creating. Earn real certifications.",
    accent: "border-cyan-500", accentBg: "bg-cyan-500",
    bullets: [
      "Create comics, cards, and stories as school projects",
      "Earn XP and level up through 30 levels",
      "Build a real creative portfolio by graduation",
      "Get industry-recognized PS Creator certifications",
      "Submit work directly to your teacher's assignments",
    ],
    cta: "Start Creating", ctaLink: "/signup",
  },
  {
    icon: Palette, tag: "CREATORS", title: "Build your portfolio. Monetize your work.",
    accent: "border-amber-500", accentBg: "bg-amber-500",
    bullets: [
      "Professional tools for comics, motion art, and more",
      "Sell your work on the creator marketplace via Stripe",
      "Stream your content to a built-in audience",
      "AI-assisted creation that speeds up your workflow",
      "Print-ready exports at 300 DPI for physical products",
    ],
    cta: "Join Free", ctaLink: "/signup",
  },
  {
    icon: School, tag: "TEACHERS & SCHOOLS", title: "Turn students into creators with portfolios in 6 weeks.",
    accent: "border-green-500", accentBg: "bg-green-500",
    bullets: [
      "Built with student-data and parental-consent workflows for COPPA & FERPA alignment",
      "Curriculum-aligned to California CTE standards",
      "Track student progress with XP, levels, and certifications",
      "LMS integration — assign, collect, and grade creative work",
      "Bulk account creation and classroom management tools",
    ],
    cta: "Request a Demo", ctaLink: "/pricing",
  },
];

const pricingTiers = [
  { name: "FREE", price: "$0", period: "forever", features: ["3 active projects", "Basic AI generations", "Community library access", "Core creator tools", "XP and leveling"], accent: "border-zinc-600", highlight: false },
  { name: "CREATOR", price: "$9", period: "/month", features: ["Unlimited projects", "More AI generations", "Marketplace selling", "Priority exports", "Advanced FX Studio", "Remove watermarks"], accent: "border-cyan-500", highlight: true },
  { name: "PRO", price: "$19", period: "/month", features: ["Everything in Creator", "Team collaboration", "Print Studio access", "Unlimited AI", "API access", "Priority support"], accent: "border-amber-500", highlight: false },
  { name: "SCHOOL", price: "Custom", period: "per seat", features: ["Full teacher dashboard", "Bulk student accounts", "LMS integration", "Curriculum packages", "District-level admin", "Grant-ready pricing"], accent: "border-green-500", highlight: false },
];

const ecosystemApps = [
  { name: "CoMiXX Creator", desc: "The creative studio — where everything is made", icon: Sparkles, url: "https://pscomixx.com" },
  { name: "FX Studio", desc: "Effects and asset pipeline", icon: Wand2, url: "https://pscomixx.online" },
  { name: "PressPlays", desc: "Streaming platform for student and creator content", icon: Film, url: "https://psstreaming.com" },
  { name: "Press Start LMS", desc: "Learning management for schools and districts", icon: GraduationCap, url: "https://pressstart.tech" },
];

const trustSignals = [
  { icon: Shield, label: "Built for Student Privacy" },
  { icon: Award, label: "California CTE Aligned" },
  { icon: FileText, label: "Grant-Ready Documentation" },
  { icon: Monitor, label: "Works on Chromebooks & iPads" },
];

const trustMetrics = [
  { value: "10K+", label: "Projects Created" },
  { value: "500+", label: "Active Creators" },
  { value: "50+", label: "Schools" },
  { value: "7", label: "Creator Tools" },
];

export default function LandingPage() {
  const [, navigate] = useLocation();
  const [glitchText, setGlitchText] = useState(false);
  const [glitchOffset, setGlitchOffset] = useState({ x: 0, y: 0 });
  // Apple guideline 3.1.1: hide subscription pricing and "view plans" CTAs
  // when running inside the iOS app. Pricing lives at pscomixx.com on the web.
  const hideSubscriptionUi = shouldBlockDirectPayments();

  useEffect(() => {
    const glitchInterval = setInterval(() => {
      setGlitchText(true);
      setGlitchOffset({ x: Math.random() * 10 - 5, y: Math.random() * 10 - 5 });
      setTimeout(() => setGlitchOffset({ x: Math.random() * 6 - 3, y: Math.random() * 6 - 3 }), 50);
      setTimeout(() => setGlitchOffset({ x: Math.random() * 4 - 2, y: Math.random() * 4 - 2 }), 100);
      setTimeout(() => { setGlitchText(false); setGlitchOffset({ x: 0, y: 0 }); }, 150);
    }, 2500);
    return () => clearInterval(glitchInterval);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white relative overflow-x-hidden" style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff' }}>

      <div className="absolute top-6 left-4 sm:left-6 z-20 flex items-center gap-3">
        <div className="w-12 h-12 border-2 border-white flex items-center justify-center font-black text-lg" style={{ boxShadow: glitchText ? '0 0 20px rgba(255,255,255,0.8)' : 'none' }}>PS</div>
        <span className="text-xs text-zinc-500 uppercase tracking-widest hidden md:block font-mono">Press Start</span>
      </div>

      <div className="absolute top-6 right-4 sm:right-6 z-20 flex gap-4 items-center">
        {!hideSubscriptionUi && (
          <button data-testid="button-teacher-landing" onClick={() => navigate("/pricing")} className="text-xs text-green-400 hover:text-green-300 uppercase tracking-wider font-mono transition-colors bg-transparent border border-green-500/30 px-3 py-1.5 cursor-pointer hidden sm:block">
            I'm a Teacher
          </button>
        )}
        <button data-testid="button-login" onClick={() => navigate("/login")} className="text-xs text-zinc-500 hover:text-white uppercase tracking-wider font-mono transition-colors bg-transparent border-none cursor-pointer">
          Login
        </button>
      </div>

      {/* HERO */}
      <section className="relative min-h-screen" data-testid="section-hero">
        <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-40 z-0">
          <source src="/assets/comics_falling_from_sky.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30 z-[1]" />
        <div className="absolute inset-0 z-[2] pointer-events-none opacity-[0.15]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)' }} />

        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-8">
          <div className="text-center mb-4 relative inline-block">
            {glitchText && (
              <span className="absolute inset-0 text-sm sm:text-base font-black uppercase tracking-[0.3em] text-cyan-500 opacity-70"
                style={{ fontFamily: "'Space Grotesk', sans-serif", transform: `translate(${glitchOffset.x - 2}px, ${glitchOffset.y}px)` }}>
                PRESS START COMIXX
              </span>
            )}
            <span className="text-sm sm:text-base font-black uppercase tracking-[0.3em] text-zinc-500 relative"
              style={{ fontFamily: "'Space Grotesk', sans-serif", textShadow: glitchText ? `${glitchOffset.x}px ${glitchOffset.y}px 0 #ff0000, ${-glitchOffset.x}px ${-glitchOffset.y}px 0 #00ffff` : 'none' }}>
              PRESS START COMIXX
            </span>
          </div>

          <div className="w-32 h-px bg-zinc-600 mx-auto mb-8" style={{ boxShadow: glitchText ? '0 0 10px rgba(255,255,255,0.5)' : 'none' }} />

          <h1 className="text-3xl sm:text-5xl md:text-7xl font-black uppercase tracking-tight text-center mb-4 text-white"
            style={{ fontFamily: "'Space Grotesk', sans-serif", textShadow: glitchText ? `${glitchOffset.x}px ${glitchOffset.y}px 0 #ff0000, ${-glitchOffset.x}px ${-glitchOffset.y}px 0 #00ffff, 0 0 80px rgba(255,255,255,0.8)` : '0 0 40px rgba(255,255,255,0.3)' }}
            data-testid="text-tagline">
            <span className="block">Create comics, animations,</span>
            <span className="block">and interactive stories</span>
            <span className="block text-cyan-400">in minutes.</span>
          </h1>

          <p className="text-sm sm:text-lg md:text-xl text-zinc-400 text-center mb-3 max-w-2xl font-mono px-4" data-testid="text-subtitle">
            The AI-powered studio where students and creators go from idea to published work — comics, trading cards, motion art, visual novels, and more.
          </p>
          <p className="text-xs sm:text-sm text-zinc-500 text-center mb-8 max-w-xl font-mono px-4">
            Create. Publish. Get seen. Level up.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center mb-4">
            <button data-testid="button-start-creating" onClick={() => navigate("/signup")}
              className="group px-10 sm:px-14 py-4 sm:py-5 bg-white text-black font-black text-lg sm:text-xl uppercase tracking-wider flex items-center gap-3 hover:bg-zinc-200 transition-all relative border-none cursor-pointer"
              style={{ fontFamily: "'Space Grotesk', sans-serif", boxShadow: '0 0 30px rgba(255,255,255,0.3)' }}>
              CREATE YOUR FIRST COMIC — FREE
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              <div className="absolute inset-0 border-2 border-white translate-x-2 translate-y-2 -z-10 group-hover:translate-x-3 group-hover:translate-y-3 transition-transform" />
            </button>
            <button data-testid="button-teacher-hero" onClick={() => navigate("/pricing")}
              className="px-8 py-4 border-2 border-green-500 text-green-400 font-bold text-sm uppercase tracking-wider hover:bg-green-500/10 transition-all cursor-pointer bg-transparent"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              SCHOOLS & TEACHERS
            </button>
          </div>

          <p className="text-[11px] text-zinc-600 font-mono uppercase tracking-wider mb-10">No credit card required.</p>

          <div className="w-full max-w-4xl">
            <EventCarousel featuredOnly={true} variant="dark" />
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="relative z-10 py-6 px-4 bg-zinc-950 border-t-2 border-b-2 border-zinc-800" data-testid="section-trust-bar">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-6 sm:gap-10">
          {trustSignals.map((signal) => (
            <div key={signal.label} className="flex items-center gap-2 text-zinc-500" data-testid={`trust-signal-${signal.label.toLowerCase().replace(/[\s\/]/g, '-')}`}>
              <signal.icon className="w-4 h-4 text-zinc-600" />
              <span className="text-[11px] font-mono uppercase tracking-wider">{signal.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* WHAT YOU'LL MAKE */}
      <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-8 bg-black" data-testid="section-output-showcase">
        <div className="max-w-6xl mx-auto">
          <div className="mb-14 text-center">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.3em] block mb-4">NOT JUST TOOLS</span>
            <h3 className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              HERE'S WHAT YOU'LL MAKE
            </h3>
            <div className="w-24 h-1 bg-cyan-500 mx-auto mb-6" />
            <p className="text-sm text-zinc-500 font-mono max-w-2xl mx-auto">
              Real output. Real formats. Published and portfolio-ready in one session.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { title: "PRINT COMICS", desc: "300 DPI pages with covers, panels, and speech bubbles", accent: "border-cyan-500" },
              { title: "TRADING CARDS", desc: "Collectible card packs with stats, art, and effects", accent: "border-green-500" },
              { title: "MOTION COMICS", desc: "Animated video and GIF exports with audio sync", accent: "border-amber-500" },
              { title: "VISUAL NOVELS", desc: "Dialogue-driven stories with characters and transitions", accent: "border-violet-500" },
              { title: "CYOA STORIES", desc: "Branching interactive fiction with choices and variables", accent: "border-red-500" },
              { title: "VIRAL HOPs", desc: "Short-form loopable content for streaming and social", accent: "border-pink-500" },
            ].map((output) => (
              <div key={output.title} className={`border-2 ${output.accent} bg-zinc-950 p-4 text-center`} data-testid={`output-card-${output.title.toLowerCase().replace(/\s/g, '-')}`}>
                <h4 className="text-sm font-black uppercase tracking-wider mb-2 text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{output.title}</h4>
                <p className="text-[11px] text-zinc-500 font-mono leading-relaxed">{output.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <button data-testid="button-output-cta" onClick={() => navigate("/signup")}
              className="px-8 py-3 bg-white text-black font-black text-sm uppercase tracking-wider hover:bg-zinc-200 transition-all border-none cursor-pointer inline-flex items-center gap-2"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              START MAKING YOURS <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* CREATOR TOOLS — THE FULL SUITE */}
      <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-8 bg-black border-t-2 border-zinc-800" data-testid="section-tools">
        <div className="max-w-6xl mx-auto">
          <div className="mb-14 text-center">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.3em] block mb-4">THE STUDIO</span>
            <h3 className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              7 CREATOR TOOLS. ONE PLATFORM.
            </h3>
            <div className="w-24 h-1 bg-white mx-auto mb-6" />
            <p className="text-sm text-zinc-500 font-mono max-w-2xl mx-auto">
              Everything a student or creator needs to go from idea to published work — comics, cards, animation, interactive fiction, visual novels, and FX.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {creatorTools.map((tool) => (
              <div key={tool.title} className={`border-2 ${tool.accent} bg-zinc-950 p-6 hover:bg-zinc-900 transition-all group`} data-testid={`tool-card-${tool.title.toLowerCase().replace(/\s/g, '-')}`}>
                <div className={`w-12 h-12 border-2 ${tool.accent} flex items-center justify-center mb-4`}>
                  <tool.icon className={`w-6 h-6 ${tool.accentColor}`} />
                </div>
                <h4 className="text-lg font-black uppercase tracking-wider mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{tool.title}</h4>
                <p className="text-sm text-zinc-500 font-mono leading-relaxed">{tool.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ONE SCRIPT, THREE OUTPUTS */}
      <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-8 bg-zinc-950 border-t-2 border-zinc-800" data-testid="section-pipeline">
        <div className="max-w-5xl mx-auto">
          <div className="mb-14 text-center">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.3em] block mb-4">THE PIPELINE</span>
            <h3 className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              ONE STORY. THREE FORMATS.
            </h3>
            <div className="w-24 h-1 bg-white mx-auto mb-6" />
            <p className="text-sm sm:text-base text-zinc-500 font-mono max-w-2xl mx-auto leading-relaxed">
              Write once. The Press Start pipeline transforms a single creative script into a static comic, an animated motion comic, and an interactive choose-your-own-adventure — all from one project.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            <div className="hidden md:block absolute top-1/2 left-[18%] right-[18%] h-px bg-zinc-700 -translate-y-1/2" />
            {[
              { num: "01", title: "STATIC COMIC", desc: "Print-ready pages with panels, covers, speech bubbles, and narrator captions. Export at 300 DPI.", accent: "border-cyan-500", color: "text-cyan-400" },
              { num: "02", title: "MOTION COMIC", desc: "Animate panels with keyframes, transitions, and audio. Export as MP4 or GIF for streaming.", accent: "border-amber-500", color: "text-amber-400" },
              { num: "03", title: "INTERACTIVE STORY", desc: "Turn your narrative into a branching CYOA or visual novel with choices, variables, and audio.", accent: "border-red-500", color: "text-red-400" },
            ].map((output) => (
              <div key={output.num} className={`border-2 ${output.accent} bg-zinc-900 p-6 text-center relative`} data-testid={`pipeline-output-${output.num}`}>
                <span className={`text-4xl font-black ${output.color} block mb-3`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{output.num}</span>
                <h4 className="text-lg font-black uppercase tracking-wider mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{output.title}</h4>
                <p className="text-sm text-zinc-500 font-mono leading-relaxed">{output.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4-STEP FLOW */}
      <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-8 bg-black border-t-2 border-zinc-800" data-testid="section-flow">
        <div className="max-w-5xl mx-auto">
          <div className="mb-14 text-center">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.3em] block mb-4">HOW IT WORKS</span>
            <h3 className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>YOUR JOURNEY</h3>
            <div className="w-24 h-1 bg-white mx-auto" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            <div className="hidden lg:block absolute top-16 left-[15%] right-[15%] h-px bg-zinc-700" />
            {flowSteps.map((step, i) => (
              <div key={step.title} className="text-center relative" data-testid={`step-flow-${i}`}>
                <div className={`w-20 h-20 border-2 ${step.accent.split(' ')[0]} flex items-center justify-center mx-auto mb-5 relative bg-black`}>
                  <step.icon className={`w-8 h-8 ${step.accent.split(' ')[1]}`} />
                  <span className="absolute -top-3 -right-3 w-7 h-7 bg-white text-black text-xs font-black flex items-center justify-center" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h4 className="text-lg font-black uppercase tracking-wider mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{step.title}</h4>
                <p className="text-sm text-zinc-500 font-mono leading-relaxed max-w-[220px] mx-auto">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AUDIENCE SECTIONS */}
      <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-8 bg-zinc-950 border-t-2 border-zinc-800" data-testid="section-audiences">
        <div className="max-w-6xl mx-auto">
          <div className="mb-14 text-center">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.3em] block mb-4">WHO IT'S FOR</span>
            <h3 className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>BUILT FOR YOU</h3>
            <div className="w-24 h-1 bg-white mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {audienceSections.map((section) => (
              <div key={section.tag} className={`border-2 ${section.accent} bg-zinc-900 p-8 relative group hover:bg-zinc-800/50 transition-all`} data-testid={`card-audience-${section.tag.toLowerCase().replace(/\s.*/, '')}`}>
                <span className="absolute top-4 right-4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest border border-zinc-700 px-2 py-1">{section.tag}</span>
                <div className={`w-14 h-14 border-2 ${section.accent} flex items-center justify-center mb-6`}>
                  <section.icon className="w-7 h-7 text-zinc-300" />
                </div>
                <h4 className="text-lg font-black uppercase tracking-wider mb-5 leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{section.title}</h4>
                <ul className="space-y-3 mb-8">
                  {section.bullets.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-400 font-mono">
                      <CheckCircle2 className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />{bullet}
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate(section.ctaLink)}
                  className="w-full py-3 bg-white text-black font-bold text-sm uppercase tracking-wider hover:bg-zinc-200 transition-colors border-none cursor-pointer"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  data-testid={`button-audience-${section.tag.toLowerCase().replace(/\s.*/, '')}`}>
                  {section.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FeaturedSeriesSection />

      {/* PRICING PREVIEW — hidden inside the iOS app (Apple guideline 3.1.1).
          On native, prices and "view plans" CTAs aren't allowed; subscriptions
          are managed at pscomixx.com on the web. */}
      {!hideSubscriptionUi && (
      <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-8 bg-black border-t-2 border-zinc-800" data-testid="section-pricing-preview">
        <div className="max-w-6xl mx-auto">
          <div className="mb-14 text-center">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.3em] block mb-4">PLANS</span>
            <h3 className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              START FREE. SCALE UP.
            </h3>
            <div className="w-24 h-1 bg-white mx-auto mb-6" />
            <p className="text-sm text-zinc-500 font-mono max-w-xl mx-auto">
              Free tier gives you full access to core tools. Upgrade for more AI generations, marketplace selling, and team features.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {pricingTiers.map((tier) => (
              <div key={tier.name}
                className={`border-2 ${tier.accent} p-6 ${tier.highlight ? 'bg-zinc-900 relative' : 'bg-zinc-950'} transition-all hover:bg-zinc-900`}
                data-testid={`pricing-tier-${tier.name.toLowerCase()}`}>
                {tier.highlight && <span className="absolute -top-3 left-4 bg-cyan-500 text-black text-[10px] font-black uppercase tracking-wider px-2 py-0.5">Most Popular</span>}
                <h4 className="text-lg font-black uppercase tracking-wider mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{tier.name}</h4>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-black" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{tier.price}</span>
                  <span className="text-xs text-zinc-500 font-mono">{tier.period}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {tier.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-zinc-400 font-mono">
                      <CheckCircle2 className="w-3 h-3 text-zinc-600 shrink-0 mt-0.5" />{f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate(tier.name === "SCHOOL" ? "/pricing" : "/signup")}
                  className={`w-full py-2.5 font-bold text-xs uppercase tracking-wider border-none cursor-pointer transition-colors ${
                    tier.highlight ? 'bg-cyan-500 text-black hover:bg-cyan-400' : 'bg-zinc-800 text-white hover:bg-zinc-700'
                  }`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  data-testid={`button-tier-${tier.name.toLowerCase()}`}>
                  {tier.name === "FREE" ? "Get Started" : tier.name === "SCHOOL" ? "Contact Us" : "Start Trial"}
                </button>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button data-testid="button-view-pricing-cta" onClick={() => navigate("/pricing")}
              className="text-sm text-zinc-500 hover:text-white font-mono uppercase tracking-wider transition-colors bg-transparent border-none cursor-pointer underline underline-offset-4">
              View full pricing details
            </button>
          </div>
        </div>
      </section>
      )}

      {/* ECOSYSTEM */}
      <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-8 bg-zinc-950 border-t-2 border-zinc-800" data-testid="section-ecosystem">
        <div className="max-w-6xl mx-auto">
          <div className="mb-14 text-center">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.3em] block mb-4">THE FLYWHEEL</span>
            <h3 className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              THE PRESS START ECOSYSTEM
            </h3>
            <div className="w-24 h-1 bg-white mx-auto mb-6" />
            <p className="text-sm sm:text-base text-zinc-400 font-mono leading-relaxed max-w-2xl mx-auto">
              Four connected platforms that work together: schools adopt the LMS, students create in CoMiXX, content streams on PressPlays, XP ties it all together. That's the loop.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {ecosystemApps.map((app) => (
              <a key={app.name} href={app.url} target="_blank" rel="noopener noreferrer"
                className="border border-zinc-800 bg-zinc-900 p-5 text-center hover:border-zinc-600 transition-colors block no-underline text-inherit"
                data-testid={`ecosystem-app-${app.name.toLowerCase().replace(/\s/g, '-')}`}>
                <div className="w-12 h-12 border border-zinc-700 flex items-center justify-center mx-auto mb-3">
                  <app.icon className="w-6 h-6 text-zinc-400" />
                </div>
                <h4 className="text-sm font-black uppercase tracking-wider mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{app.name}</h4>
                <p className="text-[11px] text-zinc-600 font-mono">{app.desc}</p>
              </a>
            ))}
          </div>

          <div className="border-2 border-zinc-700 bg-zinc-900 p-6 sm:p-8 text-center">
            <div className="flex flex-wrap justify-center items-center gap-4 text-sm font-mono text-zinc-400">
              <span className="text-cyan-400 font-bold">LMS assigns</span>
              <ArrowRight className="w-4 h-4 text-zinc-600" />
              <span className="text-white font-bold">Student creates in CoMiXX</span>
              <ArrowRight className="w-4 h-4 text-zinc-600" />
              <span className="text-amber-400 font-bold">Publishes to PressPlays</span>
              <ArrowRight className="w-4 h-4 text-zinc-600" />
              <span className="text-red-400 font-bold">Earns XP + Certifications</span>
            </div>
            <p className="text-[11px] text-zinc-600 font-mono mt-4 uppercase tracking-wider">The complete creator-to-credential pipeline for K-12</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-t border-zinc-800 pt-12 mt-12">
            {trustMetrics.map((metric) => (
              <div key={metric.label} className="text-center" data-testid={`metric-${metric.label.toLowerCase().replace(/\s/g, '-')}`}>
                <div className="text-3xl sm:text-4xl font-black text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{metric.value}</div>
                <div className="text-[11px] text-zinc-600 font-mono uppercase tracking-wider">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-8 bg-black border-t-2 border-zinc-800" data-testid="section-final-cta">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            READY TO START?
          </h3>
          <p className="text-sm text-zinc-500 font-mono mb-10 max-w-lg mx-auto">
            Join thousands of students and creators already building, publishing, and leveling up. Free forever, upgrade when you're ready.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate("/signup")}
              className="group px-10 py-4 bg-white text-black font-black text-lg uppercase tracking-wider flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all relative border-none cursor-pointer"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              data-testid="button-final-cta-create">
              START CREATING
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              <div className="absolute inset-0 border-2 border-white translate-x-2 translate-y-2 -z-10" />
            </button>
            <button onClick={() => navigate("/pricing")}
              className="px-8 py-4 border-2 border-green-500 text-green-400 font-bold text-sm uppercase tracking-wider hover:bg-green-500/10 transition-all cursor-pointer bg-transparent"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              data-testid="button-final-cta-schools">
              SCHOOL / DISTRICT INQUIRY
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/10 py-12 px-4 sm:px-8 bg-black" data-testid="footer">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 border-2 border-white flex items-center justify-center font-black text-sm shrink-0">PS</div>
              <div>
                <span className="text-xs text-zinc-400 uppercase tracking-widest font-mono block">Press Start CoMiXX</span>
                <span className="text-[10px] text-zinc-700 font-mono block">A Press Start Gaming Inc. Platform</span>
                <span className="text-[10px] text-zinc-600 font-mono block mt-1" data-testid="text-business-contact">
                  Support:{" "}
                  <a href="mailto:support@pscomixx.com" className="hover:text-zinc-400 underline">support@pscomixx.com</a>
                </span>
              </div>
            </div>

            <nav className="flex flex-wrap justify-center gap-6">
              {[
                { label: "Pricing", href: "/pricing" },
                { label: "Privacy", href: "/privacy" },
                { label: "Terms", href: "/terms" },
                { label: "Disclaimer", href: "/disclaimer" },
                { label: "DMCA", href: "/dmca" },
                { label: "Compliance", href: "/compliance" },
                { label: "Contact", href: "/contact" },
              ].map((link) => (
                <a key={link.label} data-testid={`link-${link.label.toLowerCase()}`} href={link.href}
                  className="text-xs text-zinc-500 hover:text-white uppercase tracking-wider font-mono transition-colors cursor-pointer">
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Business identity block — Apple/App Store & consumer-protection
              transparency: developer name, legal entity type, contact. */}
          <div className="mt-8 pt-8 border-t border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" data-testid="business-identity">
            <div className="text-[10px] text-zinc-600 font-mono leading-relaxed">
              <span className="text-zinc-400 font-bold">Press Start Gaming Inc.</span>
              {" · "}A Delaware C-Corporation
              {" · "}Operator of Press Start CoMiXX
            </div>
            <p className="text-[10px] text-zinc-700 font-mono uppercase tracking-wider">
              &copy; {new Date().getFullYear()} Press Start Gaming Inc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
