import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Film, Wand2, GraduationCap, Palette, ArrowRight, Trophy, Eye, Rocket, BookOpen, Users, School, CheckCircle2 } from "lucide-react";
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
          <h3
            className="text-2xl sm:text-4xl font-black uppercase tracking-tight mb-4 text-white"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            FEATURED SERIES
          </h3>
          <div className="w-24 h-1 bg-cyan-500 mx-auto" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {series.map((s) => (
            <Link key={s.id} href={`/community/series/${s.id}`}>
              <div
                className="group border-2 border-zinc-800 bg-zinc-900 hover:border-cyan-500 transition-all cursor-pointer"
                data-testid={`featured-series-card-${s.id}`}
              >
                <div className="aspect-[3/2] overflow-hidden">
                  {s.coverImage ? (
                    <img
                      src={s.coverImage}
                      alt={s.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-zinc-700" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h4
                    className="font-black text-white text-lg truncate group-hover:text-cyan-400 transition-colors"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {s.title}
                  </h4>
                  {s.description && (
                    <p className="text-zinc-500 text-sm mt-1 line-clamp-2">{s.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-3 text-xs text-zinc-500 font-bold">
                    <span>{s.creatorName}</span>
                    <div className="flex items-center gap-3">
                      <span>{s.comicCount} ch</span>
                      {s.subscriberCount > 0 && (
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {s.subscriberCount}</span>
                      )}
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
  {
    icon: Sparkles,
    title: "CREATE",
    description: "Make comics, cards, and clips with AI-powered tools",
    accent: "border-cyan-500 text-cyan-400",
  },
  {
    icon: Rocket,
    title: "PUBLISH",
    description: "Share to the streaming platform with one click",
    accent: "border-green-500 text-green-400",
  },
  {
    icon: Eye,
    title: "GET SEEN",
    description: "Build your audience and creator portfolio",
    accent: "border-amber-500 text-amber-400",
  },
  {
    icon: Trophy,
    title: "LEVEL UP",
    description: "Earn XP, unlock tools, and get certified",
    accent: "border-red-500 text-red-400",
  },
];

const audienceSections = [
  {
    icon: GraduationCap,
    tag: "STUDENTS",
    title: "Learn by creating. Earn real certifications.",
    accent: "border-cyan-500",
    accentBg: "bg-cyan-500",
    bullets: [
      "Create comics, cards, and stories as school projects",
      "Earn XP and level up like a game",
      "Build a real creative portfolio by graduation",
      "Get industry-recognized PS Creator certifications",
    ],
    cta: "Start Creating",
    ctaLink: "/signup",
  },
  {
    icon: Palette,
    tag: "CREATORS",
    title: "Build your portfolio. Monetize your work.",
    accent: "border-amber-500",
    accentBg: "bg-amber-500",
    bullets: [
      "Professional tools for comics, motion art, and more",
      "Sell your work on the creator marketplace",
      "Stream your content to a built-in audience",
      "AI-assisted creation that speeds up your workflow",
    ],
    cta: "Join Free",
    ctaLink: "/signup",
  },
  {
    icon: School,
    tag: "SCHOOLS",
    title: "Turn students into creators with portfolios in 6 weeks.",
    accent: "border-green-500",
    accentBg: "bg-green-500",
    bullets: [
      "COPPA/FERPA-compliant with teacher dashboards",
      "Curriculum-ready assignments and templates",
      "Track student progress with XP and certifications",
      "LMS integration for seamless classroom management",
    ],
    cta: "Learn More",
    ctaLink: "/pricing",
  },
];

const ecosystemApps = [
  { name: "CoMiXX Creator", desc: "The creative studio", icon: Sparkles },
  { name: "FX Studio", desc: "Effects and asset pipeline", icon: Wand2 },
  { name: "PressPlays", desc: "Streaming platform", icon: Film },
  { name: "Press Start LMS", desc: "Learning management", icon: GraduationCap },
];

const trustMetrics = [
  { value: "10K+", label: "Projects Created" },
  { value: "500+", label: "Active Creators" },
  { value: "50+", label: "Schools" },
  { value: "30", label: "Levels to Unlock" },
];

export default function LandingPage() {
  const [, navigate] = useLocation();
  const [glitchText, setGlitchText] = useState(false);
  const [glitchOffset, setGlitchOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        navigate("/signup");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  useEffect(() => {
    const glitchInterval = setInterval(() => {
      setGlitchText(true);
      setGlitchOffset({
        x: Math.random() * 10 - 5,
        y: Math.random() * 10 - 5
      });

      setTimeout(() => {
        setGlitchOffset({ x: Math.random() * 6 - 3, y: Math.random() * 6 - 3 });
      }, 50);

      setTimeout(() => {
        setGlitchOffset({ x: Math.random() * 4 - 2, y: Math.random() * 4 - 2 });
      }, 100);

      setTimeout(() => {
        setGlitchText(false);
        setGlitchOffset({ x: 0, y: 0 });
      }, 150);
    }, 2500);

    return () => clearInterval(glitchInterval);
  }, []);

  return (
    <div
      className="min-h-screen bg-black text-white relative overflow-x-hidden"
      style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', position: 'relative', overflow: 'hidden' }}
    >
      <div className="absolute top-6 left-4 sm:left-6 z-20 flex items-center gap-3">
        <div
          className="w-12 h-12 border-2 border-white flex items-center justify-center font-black text-lg"
          style={{
            boxShadow: glitchText ? '0 0 20px rgba(255,255,255,0.8)' : 'none',
          }}
        >
          PS
        </div>
        <span className="text-xs text-zinc-500 uppercase tracking-widest hidden md:block font-mono">
          Press Start
        </span>
      </div>

      <div className="absolute top-6 right-4 sm:right-6 z-20 flex gap-3 items-center">
        <button
          data-testid="button-login"
          onClick={() => navigate("/login")}
          className="text-xs text-zinc-500 hover:text-white uppercase tracking-wider font-mono transition-colors bg-transparent border-none cursor-pointer"
        >
          Login
        </button>
      </div>

      {/* HERO */}
      <section className="relative min-h-screen" data-testid="section-hero">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-40 z-0"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4, zIndex: 0 }}
        >
          <source src="/assets/comics_falling_from_sky.mp4" type="video/mp4" />
        </video>

        <div
          className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30 z-[1]"
          style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #000, rgba(0,0,0,0.7), rgba(0,0,0,0.3))', zIndex: 1 }}
        />

        <div
          className="absolute inset-0 z-[2] pointer-events-none opacity-[0.15]"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            pointerEvents: 'none',
            opacity: 0.15,
            backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0,0,0,0.3) 2px,
              rgba(0,0,0,0.3) 4px
            )`
          }}
        />

        <div
          className="relative z-10 min-h-screen flex flex-col items-center justify-center p-8"
          style={{ position: 'relative', zIndex: 10, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
        >
          <div className="text-center mb-4 relative inline-block">
            {glitchText && (
              <span
                className="absolute inset-0 text-sm sm:text-base font-black uppercase tracking-[0.3em] text-cyan-500 opacity-70"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  transform: `translate(${glitchOffset.x - 2}px, ${glitchOffset.y}px)`,
                }}
              >
                PRESS START COMIXX
              </span>
            )}
            <span
              className="text-sm sm:text-base font-black uppercase tracking-[0.3em] text-zinc-500 relative"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                textShadow: glitchText
                  ? `${glitchOffset.x}px ${glitchOffset.y}px 0 #ff0000, ${-glitchOffset.x}px ${-glitchOffset.y}px 0 #00ffff`
                  : 'none',
              }}
            >
              PRESS START COMIXX
            </span>
          </div>

          <div
            className="w-32 h-px bg-zinc-600 mx-auto mb-8"
            style={{
              boxShadow: glitchText ? '0 0 10px rgba(255,255,255,0.5)' : 'none',
              transform: glitchText ? `scaleX(${0.9 + Math.random() * 0.2})` : 'scaleX(1)',
            }}
          />

          <h1
            className="text-3xl sm:text-5xl md:text-7xl font-black uppercase tracking-tight text-center mb-6 text-white"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              textShadow: glitchText
                ? `${glitchOffset.x}px ${glitchOffset.y}px 0 #ff0000, ${-glitchOffset.x}px ${-glitchOffset.y}px 0 #00ffff, 0 0 80px rgba(255,255,255,0.8)`
                : '0 0 40px rgba(255,255,255,0.3)',
              transform: glitchText ? `translate(${glitchOffset.x * 0.3}px, ${glitchOffset.y * 0.3}px)` : 'none',
              transition: glitchText ? 'none' : 'transform 0.1s ease-out',
            }}
            data-testid="text-tagline"
          >
            <span className="block">CREATE. PUBLISH.</span>
            <span className="block">GET SEEN. LEVEL UP.</span>
          </h1>

          <p
            className="text-sm sm:text-lg md:text-xl text-zinc-400 text-center mb-12 max-w-2xl font-mono px-4"
            data-testid="text-subtitle"
          >
            The all-in-one creative studio for comics, cards, motion art, and more.
          </p>

          <button
            data-testid="button-start-creating"
            onClick={() => navigate("/signup")}
            className="group px-10 sm:px-14 py-4 sm:py-5 bg-white text-black font-black text-lg sm:text-xl uppercase tracking-wider flex items-center gap-3 hover:bg-zinc-200 transition-all relative border-none cursor-pointer"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              boxShadow: glitchText
                ? `${glitchOffset.x}px ${glitchOffset.y}px 0 #ff0000, ${-glitchOffset.x}px ${-glitchOffset.y}px 0 #00ffff`
                : '0 0 30px rgba(255,255,255,0.3)',
            }}
          >
            START CREATING — FREE
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            <div className="absolute inset-0 border-2 border-white translate-x-2 translate-y-2 -z-10 group-hover:translate-x-3 group-hover:translate-y-3 transition-transform" />
          </button>

          <div className="w-full max-w-4xl mt-14">
            <EventCarousel featuredOnly={true} variant="dark" />
          </div>
        </div>
      </section>

      {/* 4-STEP FLOW */}
      <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-8 bg-zinc-950 border-t-2 border-zinc-800" data-testid="section-flow">
        <div className="max-w-5xl mx-auto">
          <div className="mb-14 text-center">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.3em] block mb-4">HOW IT WORKS</span>
            <h3
              className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              YOUR JOURNEY
            </h3>
            <div className="w-24 h-1 bg-white mx-auto" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            <div className="hidden lg:block absolute top-16 left-[15%] right-[15%] h-px bg-zinc-700" />
            {flowSteps.map((step, i) => (
              <div key={step.title} className="text-center relative" data-testid={`step-flow-${i}`}>
                <div className={`w-20 h-20 border-2 ${step.accent.split(' ')[0]} flex items-center justify-center mx-auto mb-5 relative bg-zinc-950`}>
                  <step.icon className={`w-8 h-8 ${step.accent.split(' ')[1]}`} />
                  <span className="absolute -top-3 -right-3 w-7 h-7 bg-white text-black text-xs font-black flex items-center justify-center"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h4 className="text-lg font-black uppercase tracking-wider mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {step.title}
                </h4>
                <p className="text-sm text-zinc-500 font-mono leading-relaxed max-w-[200px] mx-auto">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AUDIENCE SECTIONS */}
      <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-8 bg-black" data-testid="section-audiences">
        <div className="max-w-6xl mx-auto">
          <div className="mb-14 text-center">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.3em] block mb-4">WHO IT'S FOR</span>
            <h3
              className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              BUILT FOR YOU
            </h3>
            <div className="w-24 h-1 bg-white mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {audienceSections.map((section) => (
              <div
                key={section.tag}
                className={`border-2 ${section.accent} bg-zinc-950 p-8 relative group hover:bg-zinc-900 transition-all`}
                data-testid={`card-audience-${section.tag.toLowerCase()}`}
              >
                <span className="absolute top-4 right-4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest border border-zinc-700 px-2 py-1">
                  {section.tag}
                </span>
                <div className={`w-14 h-14 border-2 ${section.accent} flex items-center justify-center mb-6`}>
                  <section.icon className="w-7 h-7 text-zinc-300" />
                </div>
                <h4
                  className="text-lg font-black uppercase tracking-wider mb-5 leading-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {section.title}
                </h4>
                <ul className="space-y-3 mb-8">
                  {section.bullets.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-400 font-mono">
                      <CheckCircle2 className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
                      {bullet}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate(section.ctaLink)}
                  className="w-full py-3 bg-white text-black font-bold text-sm uppercase tracking-wider hover:bg-zinc-200 transition-colors border-none cursor-pointer"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  data-testid={`button-audience-${section.tag.toLowerCase()}`}
                >
                  {section.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FeaturedSeriesSection />

      {/* PRICING CTA */}
      <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-8 bg-zinc-950 border-t-2 border-zinc-800" data-testid="section-pricing-preview">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.3em] block mb-4">PLANS</span>
          <h3
            className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-6"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            START FREE. SCALE UP.
          </h3>
          <p className="text-sm sm:text-base text-zinc-500 font-mono leading-relaxed mb-10 max-w-xl mx-auto">
            Free tier gives you full access to core tools. Upgrade for more AI generations, team features, marketplace selling, and priority support.
          </p>
          <button
            data-testid="button-view-pricing-cta"
            onClick={() => navigate("/pricing")}
            className="group inline-flex items-center gap-3 px-8 py-4 bg-white text-black font-bold text-lg uppercase tracking-wider hover:bg-zinc-200 transition-all relative border-none cursor-pointer"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            VIEW PRICING
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            <div className="absolute inset-0 border-2 border-white translate-x-2 translate-y-2 -z-10 group-hover:translate-x-3 group-hover:translate-y-3 transition-transform" />
          </button>
        </div>
      </section>

      {/* ABOUT / COMPANY FOOTER */}
      <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-8 bg-black border-t-2 border-zinc-800" data-testid="section-about">
        <div className="max-w-6xl mx-auto">
          <div className="mb-14 text-center">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.3em] block mb-4">ABOUT</span>
            <h3
              className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              THE PRESS START ECOSYSTEM
            </h3>
            <div className="w-24 h-1 bg-white mx-auto mb-8" />
            <p className="text-sm sm:text-base text-zinc-400 font-mono leading-relaxed max-w-2xl mx-auto">
              Press Start is a unified creative ecosystem built by MAD Mixed Media. We give students, indie creators, and schools
              the tools to create, publish, and monetize digital content — from comics to motion graphics to interactive stories.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
            {ecosystemApps.map((app) => (
              <div
                key={app.name}
                className="border border-zinc-800 bg-zinc-950 p-5 text-center hover:border-zinc-600 transition-colors"
                data-testid={`ecosystem-app-${app.name.toLowerCase().replace(/\s/g, '-')}`}
              >
                <div className="w-12 h-12 border border-zinc-700 flex items-center justify-center mx-auto mb-3">
                  <app.icon className="w-6 h-6 text-zinc-400" />
                </div>
                <h4 className="text-sm font-black uppercase tracking-wider mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {app.name}
                </h4>
                <p className="text-[11px] text-zinc-600 font-mono">{app.desc}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-t border-zinc-800 pt-12">
            {trustMetrics.map((metric) => (
              <div key={metric.label} className="text-center" data-testid={`metric-${metric.label.toLowerCase().replace(/\s/g, '-')}`}>
                <div
                  className="text-3xl sm:text-4xl font-black text-white mb-1"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {metric.value}
                </div>
                <div className="text-[11px] text-zinc-600 font-mono uppercase tracking-wider">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LEGAL FOOTER */}
      <footer className="relative z-10 border-t border-white/10 py-12 px-4 sm:px-8 bg-black" data-testid="footer">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border-2 border-white flex items-center justify-center font-black text-sm">
                PS
              </div>
              <div>
                <span className="text-xs text-zinc-400 uppercase tracking-widest font-mono block">
                  Press Start CoMiXX
                </span>
                <span className="text-[10px] text-zinc-700 font-mono block">
                  A MAD Mixed Media Platform
                </span>
              </div>
            </div>

            <nav className="flex flex-wrap justify-center gap-6">
              <a
                data-testid="link-pricing"
                href="/pricing"
                className="text-xs text-zinc-500 hover:text-white uppercase tracking-wider font-mono transition-colors cursor-pointer"
              >
                Pricing
              </a>
              <a
                data-testid="link-privacy"
                href="/privacy"
                className="text-xs text-zinc-500 hover:text-white uppercase tracking-wider font-mono transition-colors cursor-pointer"
              >
                Privacy
              </a>
              <a
                data-testid="link-terms"
                href="/terms"
                className="text-xs text-zinc-500 hover:text-white uppercase tracking-wider font-mono transition-colors cursor-pointer"
              >
                Terms
              </a>
              <a
                data-testid="link-disclaimer"
                href="/disclaimer"
                className="text-xs text-zinc-500 hover:text-white uppercase tracking-wider font-mono transition-colors cursor-pointer"
              >
                Disclaimer
              </a>
              <a
                data-testid="link-dmca"
                href="/dmca"
                className="text-xs text-zinc-500 hover:text-white uppercase tracking-wider font-mono transition-colors cursor-pointer"
              >
                DMCA
              </a>
              <a
                data-testid="link-compliance"
                href="/compliance"
                className="text-xs text-zinc-500 hover:text-white uppercase tracking-wider font-mono transition-colors cursor-pointer"
              >
                Compliance
              </a>
            </nav>
          </div>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-xs text-zinc-700 font-mono uppercase tracking-wider">
              &copy; {new Date().getFullYear()} MADMixedMedia / Press Start CoMiXX. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
