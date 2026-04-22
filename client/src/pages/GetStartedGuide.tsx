import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import {
  ArrowRight,
  Camera,
  User as UserIcon,
  Scissors,
  Wand2,
  BookOpen,
  Rocket,
  Play,
  ChevronRight,
} from "lucide-react";

const SECTIONS = [
  { id: "capture",   num: "01", label: "Capture",   icon: Camera },
  { id: "character", num: "02", label: "Character", icon: UserIcon },
  { id: "fx",        num: "03", label: "FX",        icon: Scissors },
  { id: "transform", num: "04", label: "Transform", icon: Wand2 },
  { id: "story",     num: "05", label: "Story",     icon: BookOpen },
  { id: "export",    num: "06", label: "Export",    icon: Rocket },
];

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string>(ids[0]);
  useEffect(() => {
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActive(visible.target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [ids.join("|")]);
  return active;
}

function SectionHeader({
  num,
  title,
  Icon,
}: {
  num: string;
  title: string;
  Icon: any;
}) {
  return (
    <div className="flex items-end gap-4 mb-6 border-b border-white/20 pb-4">
      <div className="text-6xl md:text-8xl font-black leading-none tracking-tighter text-white/90 select-none">
        {num}
      </div>
      <div className="flex items-center gap-3">
        <Icon className="w-6 h-6 text-white/70" strokeWidth={1.5} />
        <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight">
          {title}
        </h2>
      </div>
    </div>
  );
}

function ImagePlate({
  src,
  alt,
  ratio = "16/9",
}: {
  src: string;
  alt: string;
  ratio?: string;
}) {
  return (
    <div
      className="relative w-full overflow-hidden bg-zinc-900 border border-white/10"
      style={{ aspectRatio: ratio, filter: "grayscale(1) contrast(1.05)" }}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-base md:text-lg text-white/80">
      {items.map((t, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="mt-2 inline-block w-2 h-2 bg-white shrink-0" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 border-l-4 border-white pl-4 py-2 text-lg md:text-xl font-semibold uppercase tracking-wide text-white">
      {children}
    </div>
  );
}

export default function GetStartedGuide() {
  const containerRef = useRef<HTMLDivElement>(null);
  const active = useActiveSection(SECTIONS.map((s) => s.id));

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Layout>
      <div
        ref={containerRef}
        className="min-h-screen bg-black text-white"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
        data-testid="page-get-started-guide"
      >
        {/* HERO */}
        <section className="relative border-b border-white/15">
          <div className="absolute inset-0">
            <img
              src="/guide/hero-backyard.png"
              alt=""
              className="w-full h-full object-cover opacity-40"
              style={{ filter: "grayscale(1) contrast(1.1)" }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
          </div>
          <div className="relative max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-32">
            <div className="max-w-3xl">
              <div className="inline-block border border-white/40 px-3 py-1 text-xs font-bold tracking-[0.2em] uppercase mb-6">
                Get Started · First-Time Creator Guide
              </div>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tighter uppercase">
                Turn your real world<br />into a scene
              </h1>
              <p className="mt-6 text-lg md:text-2xl text-white/80 max-w-2xl">
                Use your phone, your environment, and CoMiXX + FX to create
                something crazy in minutes.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link href="/creator/comic">
                  <button
                    className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 font-black uppercase tracking-wide hover:bg-white/90 transition"
                    data-testid="button-start-creating"
                  >
                    Start Creating <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
                <button
                  onClick={() => scrollTo("capture")}
                  className="inline-flex items-center gap-2 border border-white/60 text-white px-6 py-3 font-black uppercase tracking-wide hover:bg-white hover:text-black transition"
                  data-testid="button-watch-demo"
                >
                  <Play className="w-4 h-4" /> See How
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* BODY: sticky side nav + sections */}
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 md:py-20 grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-12">
          {/* Sticky side nav */}
          <nav
            className="hidden lg:block sticky top-24 self-start"
            aria-label="Guide sections"
          >
            <ul className="space-y-1 border-l border-white/15">
              {SECTIONS.map((s) => {
                const isActive = active === s.id;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => scrollTo(s.id)}
                      className={`w-full text-left flex items-center gap-3 pl-4 pr-3 py-3 -ml-px border-l-2 transition ${
                        isActive
                          ? "border-white text-white bg-white/5"
                          : "border-transparent text-white/50 hover:text-white hover:border-white/40"
                      }`}
                      data-testid={`nav-section-${s.id}`}
                    >
                      <span className="font-mono text-xs">{s.num}</span>
                      <span className="font-bold uppercase text-sm tracking-wider">
                        {s.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Sections */}
          <div className="space-y-24 md:space-y-32">
            {/* 01 CAPTURE */}
            <section id="capture" className="scroll-mt-24">
              <SectionHeader num="01" title="Shoot Your Scene" Icon={Camera} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <ImagePlate src="/guide/01-capture.png" alt="Capture your world" ratio="4/3" />
                <div>
                  <p className="text-lg text-white/80 mb-6">
                    Your phone is the camera. Your room, yard, hallway, or
                    street is the set. Look for angles, not perfection.
                  </p>
                  <Bullets
                    items={[
                      "Get LOW for dramatic angles",
                      "Shoot WIDE for room to compose",
                      "Hunt for textures — dirt, walls, shadows",
                      "Keep the area behind your subject simple",
                    ]}
                  />
                  <Callout>This isn't just a photo. It's your background.</Callout>
                </div>
              </div>
            </section>

            {/* 02 CHARACTER */}
            <section id="character" className="scroll-mt-24">
              <SectionHeader num="02" title="Shoot Your Character" Icon={UserIcon} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="md:order-2">
                  <ImagePlate src="/guide/02-character.png" alt="Add yourself" ratio="4/3" />
                </div>
                <div className="md:order-1">
                  <p className="text-lg text-white/80 mb-6">
                    You — or your friends, family, even pets — become the cast.
                    Easier cutouts mean easier scenes.
                  </p>
                  <Bullets
                    items={[
                      "Use a blank wall or greenscreen",
                      "Stand AWAY from the background",
                      "Even, soft lighting on the subject",
                      "Try poses: walking, pointing, reacting, jumping",
                    ]}
                  />
                  <Callout>You are now part of the scene.</Callout>
                </div>
              </div>
            </section>

            {/* 03 FX STUDIO */}
            <section id="fx" className="scroll-mt-24">
              <SectionHeader num="03" title="Build the Scene" Icon={Scissors} />
              <ImagePlate src="/guide/03-fx.png" alt="FX Studio" ratio="16/9" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                <ol className="space-y-3 text-lg text-white/85">
                  {[
                    "Upload your background",
                    "Upload your character shot",
                    "Remove the background",
                    "Place + scale into the scene",
                  ].map((t, i) => (
                    <li key={i} className="flex items-start gap-4">
                      <span className="font-mono text-2xl font-black w-10 shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="pt-1">{t}</span>
                    </li>
                  ))}
                </ol>
                <div>
                  <Callout>Reality just became editable.</Callout>
                  <Link href="/fx-studio">
                    <button
                      className="mt-6 inline-flex items-center gap-2 bg-white text-black px-5 py-3 font-black uppercase tracking-wide hover:bg-white/90 transition"
                      data-testid="button-open-fx"
                    >
                      Open FX Studio <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                </div>
              </div>
            </section>

            {/* 04 TRANSFORM */}
            <section id="transform" className="scroll-mt-24">
              <SectionHeader num="04" title="Transform Your World" Icon={Wand2} />
              <ImagePlate src="/guide/04-transform.png" alt="Before / After" ratio="16/9" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 items-start">
                <p className="text-lg text-white/80">
                  Add weird creatures. Drop in characters. Stack FX. Push the
                  vibe somewhere your camera couldn't reach on its own.
                </p>
                <Bullets
                  items={[
                    "Plain dirt yard → alien battlefield",
                    "Empty room → creator studio",
                    "Street → glitch world",
                    "Hallway → horror set",
                  ]}
                />
              </div>
              <Callout>Now you're not in your yard anymore. You're in a scene.</Callout>
            </section>

            {/* 05 STORY */}
            <section id="story" className="scroll-mt-24">
              <SectionHeader num="05" title="Build Your Story" Icon={BookOpen} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <ImagePlate src="/guide/05-story.png" alt="Comic panels" ratio="4/3" />
                <div>
                  <Bullets
                    items={[
                      "Drop your shots into panels",
                      "Add dialogue + narration",
                      "Arrange the moments",
                      "Re-cut until the rhythm hits",
                    ]}
                  />
                  <Callout>Turn moments into stories.</Callout>
                  <Link href="/creator/comic">
                    <button
                      className="mt-6 inline-flex items-center gap-2 bg-white text-black px-5 py-3 font-black uppercase tracking-wide hover:bg-white/90 transition"
                      data-testid="button-open-comic"
                    >
                      Open CoMiXX <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                </div>
              </div>
            </section>

            {/* 06 EXPORT */}
            <section id="export" className="scroll-mt-24">
              <SectionHeader num="06" title="Bring It to Life" Icon={Rocket} />
              <ImagePlate src="/guide/06-export.png" alt="Export & Share" ratio="16/9" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
                {[
                  { label: "Export Comic", href: "/creator/comic" },
                  { label: "Create HOP", href: "/creator/hop" },
                  { label: "Share to Community", href: "/community" },
                ].map((o) => (
                  <Link key={o.href} href={o.href}>
                    <button
                      className="w-full border border-white/40 px-5 py-4 font-black uppercase tracking-wide hover:bg-white hover:text-black transition flex items-center justify-between"
                      data-testid={`button-export-${o.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <span>{o.label}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* CHALLENGE */}
        <section className="border-t border-white/15 bg-white text-black">
          <div className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28">
            <div className="text-xs font-bold tracking-[0.3em] uppercase mb-4">
              Final Drill
            </div>
            <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-[0.85]">
              10 Minute<br />Creator Challenge
            </h2>
            <p className="mt-6 text-lg md:text-2xl max-w-2xl">
              Take something boring and turn it into something crazy.
            </p>
            <ul className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-lg font-bold uppercase">
              <li className="border border-black p-4">Backyard → Battle Scene</li>
              <li className="border border-black p-4">Bedroom → Creator Studio</li>
              <li className="border border-black p-4">Street → Glitch World</li>
            </ul>
            <div className="mt-10">
              <Link href="/creator/comic">
                <button
                  className="inline-flex items-center gap-2 bg-black text-white px-8 py-4 font-black uppercase tracking-wide text-lg hover:bg-zinc-800 transition"
                  data-testid="button-start-challenge"
                >
                  Start Now <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
