import { Link } from "wouter";
import { useEffect } from "react";
import {
  ArrowRight, Zap, Sparkles, Film, Trophy, BookOpen, Layers,
  GraduationCap, Rocket, Eye, Users, Award, Wand2, Gamepad2,
  Monitor, CheckCircle2, Play, BarChart3, Briefcase
} from "lucide-react";

const DISPLAY = `'Anton', 'Bebas Neue', 'Archivo Black', 'Space Grotesk', sans-serif`;
const HEAD = `'Archivo Black', 'Space Grotesk', sans-serif`;
const MONO = `'JetBrains Mono', monospace`;

function SectionLabel({ num, label }: { num: string; label: string }) {
  return (
    <div className="flex items-center gap-4 mb-8" data-testid={`section-label-${num}`}>
      <span className="font-black text-white/40 text-sm tracking-[0.3em]" style={{ fontFamily: MONO }}>
        {num}
      </span>
      <div className="h-px flex-1 bg-white/20" />
      <span className="font-black text-white/60 text-xs tracking-[0.4em] uppercase" style={{ fontFamily: MONO }}>
        {label}
      </span>
    </div>
  );
}

function ScreenshotCard({
  title, subtitle, icon: Icon, flagship = false, accent = "white", href,
}: {
  title: string; subtitle?: string; icon: any; flagship?: boolean; accent?: string; href?: string;
}) {
  const accentMap: Record<string, string> = {
    white: "border-white",
    pink: "border-pink-500",
    cyan: "border-cyan-400",
    amber: "border-amber-400",
    green: "border-green-400",
  };
  const inner = (
    <div
      className={`relative aspect-[16/10] border-2 ${accentMap[accent] || "border-white"} bg-zinc-950 flex flex-col items-center justify-center overflow-hidden group hover:bg-zinc-900 transition-colors ${flagship ? "ring-2 ring-pink-500 ring-offset-4 ring-offset-black" : ""}`}
      data-testid={`screenshot-card-${title.replace(/\s+/g, "-").toLowerCase()}`}
    >
      {flagship && (
        <div className="absolute top-0 right-0 bg-pink-500 text-black px-3 py-1 font-black text-xs tracking-[0.2em]" style={{ fontFamily: HEAD }}>
          FLAGSHIP
        </div>
      )}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <Icon className={`w-12 h-12 mb-3 ${flagship ? "text-pink-400" : "text-white/70"} group-hover:scale-110 transition-transform`} />
      <div className="text-white font-black text-lg uppercase text-center px-4 leading-tight" style={{ fontFamily: HEAD }}>
        {title}
      </div>
      {subtitle && (
        <div className="text-white/50 text-xs mt-2 uppercase tracking-widest" style={{ fontFamily: MONO }}>
          {subtitle}
        </div>
      )}
      <div className="absolute bottom-2 left-3 text-white/30 text-[10px] font-bold tracking-[0.2em]" style={{ fontFamily: MONO }}>
        SCREENSHOT
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block" data-testid={`link-card-${title.replace(/\s+/g, "-").toLowerCase()}`}>
      {inner}
    </Link>
  ) : inner;
}

const pipelineSteps = [
  { num: "01", label: "TRAIN", icon: GraduationCap },
  { num: "02", label: "CREATE", icon: Sparkles },
  { num: "03", label: "PUBLISH", icon: Rocket },
  { num: "04", label: "TRACK", icon: BarChart3 },
  { num: "05", label: "CONNECT", icon: Users },
  { num: "06", label: "PLACE", icon: Briefcase },
];

const employerCards = [
  { title: "VERIFIED TECHNICAL ABILITIES", desc: "Each skill backed by exportable creative artifacts." },
  { title: "REAL PROJECT PORTFOLIOS", desc: "Live, viewable, shareable — not PDFs." },
  { title: "CREATIVE OUTPUT VOLUME", desc: "Measured in finished works, not assignments." },
  { title: "CONSISTENCY OVER TIME", desc: "Heartbeat data shows real engagement." },
  { title: "READINESS FOR APPRENTICESHIPS", desc: "Pipeline-tagged learners surface to partners." },
  { title: "INDUSTRY-ALIGNED SKILL DATA", desc: "Skill domains mapped to workforce categories." },
];

const proofMetrics = [
  { label: "XP EARNED", icon: Zap },
  { label: "PROJECTS COMPLETED", icon: Layers },
  { label: "EXPORTS CREATED", icon: Film },
  { label: "PUBLISHED WORKS", icon: Rocket },
  { label: "SKILL DOMAINS", icon: Wand2 },
  { label: "CERTIFICATIONS", icon: Award },
  { label: "PORTFOLIO LINK", icon: Eye },
  { label: "EMPLOYER ENGAGEMENT", icon: Briefcase },
];

export default function EcosystemPipeline() {
  useEffect(() => {
    const prev = document.title;
    document.title = "Press Start × MADMIXEDMEDIA — The Creative Technology Pipeline";
    return () => { document.title = prev; };
  }, []);

  const scrollToId = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black" data-testid="page-ecosystem-pipeline">

      {/* ───────── HERO ───────── */}
      <section className="relative min-h-screen flex flex-col justify-between px-6 sm:px-12 lg:px-20 py-10 border-b-2 border-white/10" data-testid="section-hero">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-white" />
            <span className="font-black text-xs tracking-[0.3em] uppercase" style={{ fontFamily: MONO }}>
              PRESS START × MADMIXEDMEDIA
            </span>
          </div>
          <span className="hidden sm:block font-black text-xs tracking-[0.3em] text-white/40" style={{ fontFamily: MONO }}>
            CREATIVE TECHNOLOGY WORKFORCE HUB
          </span>
        </header>

        <div className="flex-1 flex flex-col justify-center py-16">
          <span className="text-xs tracking-[0.4em] text-white/50 mb-6 font-black" style={{ fontFamily: MONO }}>
            ECOSYSTEM OVERVIEW / 2026
          </span>
          <h1
            className="font-black uppercase leading-[0.85] tracking-tight text-white"
            style={{ fontFamily: DISPLAY, fontSize: "clamp(3rem, 12vw, 11rem)" }}
            data-testid="hero-headline"
          >
            THE CREATIVE<br />TECHNOLOGY<br />PIPELINE.
          </h1>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-white/70 font-black uppercase tracking-[0.15em]" style={{ fontFamily: HEAD, fontSize: "clamp(1rem, 2vw, 1.5rem)" }}>
            <span>LEARN</span>
            <ArrowRight className="w-5 h-5" />
            <span>CREATE</span>
            <ArrowRight className="w-5 h-5" />
            <span>PUBLISH</span>
            <ArrowRight className="w-5 h-5" />
            <span>TRACK</span>
            <ArrowRight className="w-5 h-5" />
            <span className="text-pink-400">PLACE</span>
          </div>

          <div className="mt-14 flex flex-wrap gap-3">
            <Link
              href="/comic"
              className="inline-block border-2 border-white bg-white text-black px-6 py-4 font-black uppercase tracking-[0.2em] text-sm hover:bg-pink-500 hover:border-pink-500 hover:text-black transition-colors"
              style={{ fontFamily: HEAD }}
              data-testid="link-view-comixx"
            >
              VIEW COMIXX →
            </Link>
            <Link
              href="/fx-studio"
              className="inline-block border-2 border-white text-white px-6 py-4 font-black uppercase tracking-[0.2em] text-sm hover:bg-white hover:text-black transition-colors"
              style={{ fontFamily: HEAD }}
              data-testid="link-view-fx"
            >
              VIEW FX STUDIO →
            </Link>
            <button
              type="button"
              onClick={() => scrollToId("ecosystem")}
              className="border-2 border-white/40 text-white/80 px-6 py-4 font-black uppercase tracking-[0.2em] text-sm hover:border-white hover:text-white transition-colors"
              style={{ fontFamily: HEAD }}
              data-testid="button-see-full-ecosystem"
            >
              SEE THE FULL ECOSYSTEM ↓
            </button>
          </div>
        </div>

        <footer className="flex items-center justify-between text-white/40 text-xs font-black tracking-[0.3em]" style={{ fontFamily: MONO }}>
          <span>SCROLL TO EXPLORE</span>
          <span>01 / 08</span>
        </footer>
      </section>

      {/* ───────── 02 ONE CONNECTED ECOSYSTEM ───────── */}
      <section id="ecosystem" className="px-6 sm:px-12 lg:px-20 py-24 border-b-2 border-white/10" data-testid="section-ecosystem">
        <SectionLabel num="02" label="ECOSYSTEM" />
        <h2 className="font-black uppercase leading-[0.9] tracking-tight mb-16" style={{ fontFamily: DISPLAY, fontSize: "clamp(2.5rem, 9vw, 7rem)" }}>
          ONE CONNECTED<br />ECOSYSTEM.
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          <ul className="space-y-6">
            {[
              { tag: "PS LMX", desc: "CURRICULUM + SKILL TRAINING" },
              { tag: "COMIXX", desc: "COMICS, CARDS, VISUAL NOVELS" },
              { tag: "FX STUDIO", desc: "MOTION FX, HOPS, SPRITE TOOLS", flag: true },
              { tag: "STREAMING", desc: "PUBLISH, RANK, SHOWCASE" },
              { tag: "XP", desc: "PROOF OF SKILL + WORKFORCE TRACKING" },
            ].map((row) => (
              <li key={row.tag} className="border-b border-white/15 pb-6 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6">
                <span
                  className={`font-black uppercase tracking-tight ${row.flag ? "text-pink-400" : "text-white"}`}
                  style={{ fontFamily: DISPLAY, fontSize: "clamp(1.75rem, 4vw, 3rem)" }}
                >
                  {row.tag}
                </span>
                <ArrowRight className="hidden sm:block w-5 h-5 text-white/40" />
                <span className="text-white/70 font-black uppercase tracking-[0.15em] text-sm sm:text-base" style={{ fontFamily: HEAD }}>
                  {row.desc}
                </span>
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-2 gap-4">
            <ScreenshotCard title="LMS Curriculum" icon={GraduationCap} subtitle="PS LMX" />
            <ScreenshotCard title="Comic Editor" icon={BookOpen} subtitle="CoMiXX" href="/comic" />
            <ScreenshotCard title="HOPs Builder" icon={Zap} subtitle="FX Studio" flagship accent="pink" href="/creator/hop" />
            <ScreenshotCard title="Streaming Showcase" icon={Monitor} subtitle="PS Streaming" />
          </div>
        </div>
      </section>

      {/* ───────── 03 COMIXX ───────── */}
      <section className="px-6 sm:px-12 lg:px-20 py-24 border-b-2 border-white/10" data-testid="section-comixx">
        <SectionLabel num="03" label="COMIXX" />
        <h2 className="font-black uppercase leading-[0.9] tracking-tight mb-6" style={{ fontFamily: DISPLAY, fontSize: "clamp(2.25rem, 8vw, 6rem)" }}>
          CREATE PORTFOLIOS,<br />NOT JUST ASSIGNMENTS.
        </h2>
        <p className="max-w-2xl text-white/60 font-bold uppercase tracking-[0.1em] mb-14 text-sm sm:text-base" style={{ fontFamily: HEAD }}>
          Comics. Trading cards. Visual novels. Cover design. Choose-your-own-adventure.
          Every project becomes a portfolio piece — owned by the student, viewable by the world.
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          <ScreenshotCard title="CoMiXX Editor" icon={Wand2} subtitle="Main creation surface" href="/comic" />
          <ScreenshotCard title="Comic Page Builder" icon={BookOpen} subtitle="Panels + lettering" href="/comic" />
          <ScreenshotCard title="Trading Card Creator" icon={Layers} subtitle="Print-ready cards" href="/creator/card" />
          <ScreenshotCard title="Visual Novel / CYOA" icon={Gamepad2} subtitle="Branching stories" href="/creator/vn" />
          <ScreenshotCard title="Cover Designer" icon={Sparkles} subtitle="Full transform editor" href="/creator/cover" />
          <ScreenshotCard title="Marketplace" icon={Eye} subtitle="Browse + sell creator IP" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/15">
          {[
            "STUDENTS BUILD REAL CREATIVE IP.",
            "TEACHERS SEE PROGRESS.",
            "PARTNERS SEE TALENT.",
          ].map((line) => (
            <div key={line} className="bg-black px-6 py-10 font-black uppercase tracking-tight leading-tight" style={{ fontFamily: DISPLAY, fontSize: "clamp(1.25rem, 2.5vw, 2rem)" }}>
              {line}
            </div>
          ))}
        </div>
      </section>

      {/* ───────── 04 FX STUDIO (HOPs FLAGSHIP) ───────── */}
      <section className="px-6 sm:px-12 lg:px-20 py-24 border-b-2 border-white/10 relative" data-testid="section-fx-studio">
        <SectionLabel num="04" label="FX STUDIO — FLAGSHIP" />
        <h2 className="font-black uppercase leading-[0.9] tracking-tight mb-6" style={{ fontFamily: DISPLAY, fontSize: "clamp(2.25rem, 8vw, 6rem)" }}>
          MOTION. EFFECTS.<br /><span className="text-pink-400">HOPS.</span>
        </h2>
        <p className="max-w-2xl text-white/60 font-bold uppercase tracking-[0.1em] mb-14 text-sm sm:text-base" style={{ fontFamily: HEAD }}>
          FX Studio is where motion meets workforce skill. At its center: HOPs — Hot One-Page
          Stories. Short-form, loopable, publishable creative artifacts students actually want to make.
        </p>

        {/* HOPs flagship hero card */}
        <div className="border-2 border-pink-500 bg-gradient-to-br from-pink-950/40 via-black to-black p-8 sm:p-12 lg:p-16 mb-12 relative overflow-hidden" data-testid="hops-flagship-card">
          <div className="absolute top-0 right-0 bg-pink-500 text-black px-4 py-2 font-black tracking-[0.3em] text-xs" style={{ fontFamily: HEAD }}>
            ★ FLAGSHIP
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Zap className="w-8 h-8 text-pink-400" />
                <span className="font-black uppercase tracking-[0.3em] text-pink-400 text-sm" style={{ fontFamily: MONO }}>
                  HOPS — HOT ONE-PAGE STORIES
                </span>
              </div>
              <h3 className="font-black uppercase leading-[0.9] tracking-tight mb-6" style={{ fontFamily: DISPLAY, fontSize: "clamp(2rem, 6vw, 4.5rem)" }}>
                THE FLAGSHIP<br />FORMAT.
              </h3>
              <ul className="space-y-3 mb-8">
                {[
                  "SHORT-FORM, LOOPABLE, PUBLISHABLE.",
                  "BEAT SYNC + VIBE MODES.",
                  "ONE-TAP EXPORT TO STREAMING.",
                  "EVERY HOP = SKILL DATA + XP.",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-3 text-white/90 font-black uppercase tracking-[0.1em] text-sm sm:text-base" style={{ fontFamily: HEAD }}>
                    <span className="text-pink-400 mt-0.5">▶</span>
                    {line}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/creator/hop"
                  className="inline-block border-2 border-pink-500 bg-pink-500 text-black px-6 py-3 font-black uppercase tracking-[0.2em] text-sm hover:bg-pink-400 hover:border-pink-400 transition-colors"
                  style={{ fontFamily: HEAD }}
                  data-testid="link-try-hops"
                >
                  TRY HOPS BUILDER →
                </Link>
                <Link
                  href="/fx-studio"
                  className="inline-block border-2 border-pink-500 text-pink-400 px-6 py-3 font-black uppercase tracking-[0.2em] text-sm hover:bg-pink-500 hover:text-black transition-colors"
                  style={{ fontFamily: HEAD }}
                  data-testid="link-open-fx"
                >
                  OPEN FX STUDIO
                </Link>
              </div>
            </div>
            <ScreenshotCard title="HOPs Builder" icon={Zap} subtitle="Beat sync · vibe modes · loop export" flagship accent="pink" href="/creator/hop" />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <ScreenshotCard title="FX Studio Editor" icon={Wand2} subtitle="Main surface" href="/fx-studio" />
          <ScreenshotCard title="Motion FX" icon={Film} subtitle="Frame timeline" href="/creator/motion" />
          <ScreenshotCard title="Sprite / Asset Lab" icon={Layers} subtitle="Asset sheets" />
          <ScreenshotCard title="Export Panel" icon={Rocket} subtitle="Send to streaming" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/15">
          {[
            "STUDENTS CREATE MOTION ASSETS.",
            "PROJECTS BECOME PUBLISHABLE MEDIA.",
            "EVERY ACTION CAN GENERATE XP.",
          ].map((line) => (
            <div key={line} className="bg-black px-6 py-10 font-black uppercase tracking-tight leading-tight" style={{ fontFamily: DISPLAY, fontSize: "clamp(1.25rem, 2.5vw, 2rem)" }}>
              {line}
            </div>
          ))}
        </div>
      </section>

      {/* ───────── 05 PIPELINE LOOP ───────── */}
      <section className="px-6 sm:px-12 lg:px-20 py-24 border-b-2 border-white/10" data-testid="section-pipeline-loop">
        <SectionLabel num="05" label="THE LOOP" />
        <h2 className="font-black uppercase leading-[0.9] tracking-tight mb-16" style={{ fontFamily: DISPLAY, fontSize: "clamp(2.5rem, 9vw, 7rem)" }}>
          THE PIPELINE<br />LOOP.
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-white/15 mb-12">
          {pipelineSteps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.num} className="bg-black p-6 flex flex-col items-center justify-center aspect-square" data-testid={`step-${step.label.toLowerCase()}`}>
                <span className="text-white/30 text-xs font-black tracking-[0.3em] mb-3" style={{ fontFamily: MONO }}>{step.num}</span>
                <Icon className="w-8 h-8 mb-3 text-white" />
                <span className="font-black uppercase tracking-tight text-white text-lg sm:text-2xl" style={{ fontFamily: DISPLAY }}>{step.label}</span>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/15">
          {[
            "TRAINING BECOMES PROJECTS.",
            "PROJECTS BECOME PORTFOLIOS.",
            "PORTFOLIOS BECOME PROOF.",
            "PROOF BECOMES OPPORTUNITY.",
          ].map((line) => (
            <div key={line} className="bg-black px-6 py-10 font-black uppercase tracking-tight leading-tight" style={{ fontFamily: DISPLAY, fontSize: "clamp(1.1rem, 2vw, 1.75rem)" }}>
              {line}
            </div>
          ))}
        </div>
      </section>

      {/* ───────── 06 WHAT EMPLOYERS SEE ───────── */}
      <section className="px-6 sm:px-12 lg:px-20 py-24 border-b-2 border-white/10" data-testid="section-employers">
        <SectionLabel num="06" label="EMPLOYERS" />
        <h2 className="font-black uppercase leading-[0.9] tracking-tight mb-16" style={{ fontFamily: DISPLAY, fontSize: "clamp(2.5rem, 9vw, 7rem)" }}>
          WHAT EMPLOYERS<br />SEE.
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {employerCards.map((c, i) => (
            <div
              key={c.title}
              className="border-2 border-white/30 bg-zinc-950 p-8 hover:border-white hover:bg-zinc-900 transition-colors group"
              data-testid={`employer-card-${i}`}
            >
              <div className="flex items-baseline justify-between mb-6">
                <span className="text-white/30 text-xs font-black tracking-[0.3em]" style={{ fontFamily: MONO }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <CheckCircle2 className="w-5 h-5 text-white/40 group-hover:text-pink-400 transition-colors" />
              </div>
              <h3 className="font-black uppercase leading-tight mb-3" style={{ fontFamily: DISPLAY, fontSize: "clamp(1.25rem, 2vw, 1.75rem)" }}>
                {c.title}
              </h3>
              <p className="text-white/60 font-bold text-sm uppercase tracking-[0.1em]" style={{ fontFamily: HEAD }}>
                {c.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 border-2 border-white/30 p-8 sm:p-10">
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-6 h-6 text-pink-400" />
            <span className="font-black uppercase tracking-[0.3em] text-pink-400 text-xs" style={{ fontFamily: MONO }}>
              CREATOR SKILL PASSPORT
            </span>
          </div>
          <ScreenshotCard title="Skill Passport Dashboard" icon={Award} subtitle="Verifiable, exportable, recruiter-facing" />
        </div>
      </section>

      {/* ───────── 07 PROOF OF SKILL DASHBOARD ───────── */}
      <section className="px-6 sm:px-12 lg:px-20 py-24 border-b-2 border-white/10" data-testid="section-proof">
        <SectionLabel num="07" label="PROOF OF SKILL" />
        <h2 className="font-black uppercase leading-[0.9] tracking-tight mb-6" style={{ fontFamily: DISPLAY, fontSize: "clamp(2.25rem, 8vw, 6rem)" }}>
          NOT JUST GRADES —<br /><span className="text-pink-400">PROOF OF SKILL.</span>
        </h2>
        <p className="max-w-2xl text-white/60 font-bold uppercase tracking-[0.1em] mb-14 text-sm sm:text-base" style={{ fontFamily: HEAD }}>
          Every action a student takes generates skill data. Every project is a portfolio piece.
          Every export is workforce-ready evidence.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/15">
          {proofMetrics.map((m, i) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="bg-black p-6 sm:p-8 flex flex-col items-start gap-4 aspect-square justify-between" data-testid={`metric-${i}`}>
                <Icon className="w-7 h-7 text-pink-400" />
                <div>
                  <div className="text-white/30 text-[10px] font-black tracking-[0.3em] mb-2" style={{ fontFamily: MONO }}>
                    METRIC / {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="font-black uppercase leading-tight text-white" style={{ fontFamily: DISPLAY, fontSize: "clamp(1rem, 1.75vw, 1.5rem)" }}>
                    {m.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-px bg-white/15">
          <div className="bg-black p-10 font-black uppercase tracking-tight leading-tight" style={{ fontFamily: DISPLAY, fontSize: "clamp(1.25rem, 2.5vw, 2rem)" }}>
            STUDENTS DON'T JUST COMPLETE LESSONS.<br /><span className="text-pink-400">THEY BUILD PROOF.</span>
          </div>
          <div className="bg-black p-10 font-black uppercase tracking-tight leading-tight" style={{ fontFamily: DISPLAY, fontSize: "clamp(1.25rem, 2.5vw, 2rem)" }}>
            TRAINING BECOMES TALENT.<br /><span className="text-pink-400">TALENT BECOMES OPPORTUNITY.</span>
          </div>
        </div>
      </section>

      {/* ───────── 08 CTA ───────── */}
      <section className="px-6 sm:px-12 lg:px-20 py-32 relative" data-testid="section-cta">
        <SectionLabel num="08" label="NEXT STEP" />
        <h2 className="font-black uppercase leading-[0.85] tracking-tight mb-10" style={{ fontFamily: DISPLAY, fontSize: "clamp(2.5rem, 11vw, 9rem)" }}>
          YOU WANT<br />WORKFORCE<br />READINESS.<br />
          <span className="text-pink-400">WE DELIVER<br />THE PIPELINE.</span>
        </h2>

        <div className="flex flex-wrap gap-3 mb-16">
          <a
            href="mailto:hello@pscomixx.com?subject=Schedule%20a%20Demo"
            className="inline-block border-2 border-white bg-white text-black px-8 py-5 font-black uppercase tracking-[0.2em] text-sm sm:text-base hover:bg-pink-500 hover:border-pink-500 transition-colors"
            style={{ fontFamily: HEAD }}
            data-testid="link-schedule-demo"
          >
            SCHEDULE DEMO →
          </a>
          <a
            href="mailto:hello@pscomixx.com?subject=Launch%20a%20Pilot"
            className="inline-block border-2 border-white text-white px-8 py-5 font-black uppercase tracking-[0.2em] text-sm sm:text-base hover:bg-white hover:text-black transition-colors"
            style={{ fontFamily: HEAD }}
            data-testid="link-launch-pilot"
          >
            LAUNCH A PILOT →
          </a>
          <Link
            href="/community"
            className="inline-block border-2 border-white/40 text-white/80 px-8 py-5 font-black uppercase tracking-[0.2em] text-sm sm:text-base hover:border-white hover:text-white transition-colors"
            style={{ fontFamily: HEAD }}
            data-testid="link-view-student-work"
          >
            VIEW STUDENT WORK →
          </Link>
        </div>

        <footer className="border-t-2 border-white/10 pt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white/40 text-xs font-black tracking-[0.3em]" style={{ fontFamily: MONO }}>
          <span>PRESS START × MADMIXEDMEDIA — CREATIVE TECHNOLOGY WORKFORCE HUB</span>
          <span>08 / 08</span>
        </footer>
      </section>
    </div>
  );
}
