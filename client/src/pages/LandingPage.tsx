import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronRight, Gamepad2, Sparkles, Zap, Film, Book, Wand2, GraduationCap, Palette, Building2, ArrowRight, Upload, MousePointerClick, Download, Star, Quote } from "lucide-react";
import { EventCarousel } from "@/components/EventCarousel";

export default function LandingPage() {
  const [, navigate] = useLocation();
  const [glitchText, setGlitchText] = useState(false);
  const [glitchOffset, setGlitchOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        navigate("/login");
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

  const features = [
    { icon: Book, label: "Comics", description: "Build multi-page comics with panels, speech bubbles, and effects. Drag-and-drop layout with 40+ bubble styles." },
    { icon: Gamepad2, label: "Cards", description: "Design trading cards, character sheets, and collectible card sets. Battle-ready with stats and abilities." },
    { icon: Film, label: "Motion", description: "Animate your panels with keyframe motion graphics. Export as video or animated GIF." },
    { icon: Sparkles, label: "AI Art", description: "Generate art with AI prompts. Style transfer, upscaling, and batch generation built in." },
    { icon: Wand2, label: "Stories", description: "Write scripts, dialogues, and narrative arcs. AI-assisted story forge with character tracking." },
    { icon: Zap, label: "CYOA", description: "Build Choose Your Own Adventure stories with branching paths, variables, and multiple endings." },
  ];

  const audiences = [
    { icon: GraduationCap, title: "Schools & Education", description: "COPPA-compliant creative tools for classrooms. Teacher dashboards, student portfolios, and curriculum-ready templates.", tag: "EDU" },
    { icon: Palette, title: "Indie Creators", description: "Everything you need to create, publish, and sell your comics. No code, no subscriptions to juggle. Just create.", tag: "INDIE" },
    { icon: Building2, title: "Studios & Professionals", description: "Team collaboration, asset libraries, and production pipelines. White-label ready for agencies and publishers.", tag: "PRO" },
  ];

  const steps = [
    { number: "01", title: "UPLOAD OR GENERATE", description: "Drop in your artwork or generate it with AI. Import from anywhere.", icon: Upload },
    { number: "02", title: "CREATE & COMPOSE", description: "Use our studio tools to build comics, cards, motion graphics, and stories.", icon: MousePointerClick },
    { number: "03", title: "PUBLISH & SHARE", description: "Export in any format. Share to the community. Sell on the marketplace.", icon: Download },
  ];

  const testimonials = [
    { quote: "Press Start Comixx changed how I create comics. The AI tools are insane.", author: "Comic Creator", role: "Indie Artist" },
    { quote: "My students love it. The teacher dashboard makes classroom management a breeze.", author: "Educator", role: "High School Art Teacher" },
    { quote: "Finally a platform that treats comics as a serious creative medium.", author: "Studio Lead", role: "Animation Studio" },
  ];

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
          Creator Suite v1.0
        </span>
      </div>

      <div className="absolute top-6 right-4 sm:right-6 z-20 flex gap-2 sm:gap-4 items-center">
        <button 
          data-testid="button-view-pricing"
          onClick={() => navigate("/pricing")}
          className="text-sm text-zinc-400 hover:text-white uppercase tracking-wider font-mono transition-colors bg-transparent border-none cursor-pointer hidden sm:block"
        >
          Pricing
        </button>
        <button 
          data-testid="button-login"
          onClick={() => navigate("/login")}
          className="text-sm text-zinc-400 hover:text-white uppercase tracking-wider font-mono transition-colors bg-transparent border-none cursor-pointer"
        >
          Login
        </button>
        <button 
          data-testid="button-signup"
          onClick={() => navigate("/signup")}
          className="text-sm px-4 py-2 bg-white text-black hover:bg-zinc-200 uppercase tracking-wider font-mono transition-colors border-none cursor-pointer"
        >
          Sign Up
        </button>
      </div>

      <section className="relative min-h-screen">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-50 z-0"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5, zIndex: 0 }}
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
          <div className="text-center mb-8 relative">
            {glitchText && (
              <>
                <h1 
                  className="absolute inset-0 text-5xl sm:text-7xl md:text-9xl font-black uppercase tracking-tight text-cyan-500 opacity-70"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    transform: `translate(${glitchOffset.x - 3}px, ${glitchOffset.y}px)`,
                    clipPath: 'polygon(0 0, 100% 0, 100% 45%, 0 45%)',
                  }}
                >
                  <span className="block">PRESS</span>
                  <span className="block">START</span>
                </h1>
                <h1 
                  className="absolute inset-0 text-5xl sm:text-7xl md:text-9xl font-black uppercase tracking-tight text-red-500 opacity-70"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    transform: `translate(${glitchOffset.x + 3}px, ${glitchOffset.y}px)`,
                    clipPath: 'polygon(0 55%, 100% 55%, 100% 100%, 0 100%)',
                  }}
                >
                  <span className="block">PRESS</span>
                  <span className="block">START</span>
                </h1>
              </>
            )}
            
            <h1 
              className="text-5xl sm:text-7xl md:text-9xl font-black uppercase mb-4 tracking-tight text-white relative"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 900,
                textTransform: 'uppercase',
                marginBottom: '1rem',
                letterSpacing: '-0.025em',
                color: '#fff',
                position: 'relative',
                textShadow: glitchText 
                  ? `${glitchOffset.x}px ${glitchOffset.y}px 0 #ff0000, ${-glitchOffset.x}px ${-glitchOffset.y}px 0 #00ffff, 0 0 80px rgba(255,255,255,0.8)` 
                  : '0 0 60px rgba(255,255,255,0.5), 0 0 120px rgba(255,255,255,0.2)',
                transform: glitchText ? `translate(${glitchOffset.x * 0.5}px, ${glitchOffset.y * 0.5}px)` : 'none',
                transition: glitchText ? 'none' : 'transform 0.1s ease-out',
              }}
            >
              <span style={{ display: 'block' }}>PRESS</span>
              <span style={{ display: 'block' }}>START</span>
            </h1>
            
            <div 
              className="w-full max-w-lg h-1 bg-white mx-auto mb-6"
              style={{
                boxShadow: '0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(255,255,255,0.4)',
                transform: glitchText ? `scaleX(${0.9 + Math.random() * 0.2})` : 'scaleX(1)',
              }}
            />
            
            <h2 
              className="text-3xl sm:text-5xl md:text-7xl font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] relative"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                background: glitchText 
                  ? 'linear-gradient(to bottom, #ff0000, #00ffff)' 
                  : 'linear-gradient(to bottom, #ffffff, #666666)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: glitchText ? 'blur(1px)' : 'none',
                transform: glitchText ? `translate(${-glitchOffset.x}px, ${-glitchOffset.y}px)` : 'none',
              }}
            >
              COMIXX
            </h2>
          </div>

          <p 
            className="text-sm sm:text-lg md:text-xl text-zinc-400 text-center mb-8 sm:mb-12 max-w-2xl font-mono px-4"
            style={{
              opacity: glitchText ? 0.5 : 1,
              transform: glitchText ? `translateX(${glitchOffset.x * 2}px)` : 'none',
            }}
          >
            THE ULTIMATE CREATIVE STUDIO FOR COMICS, CARDS, MOTION GRAPHICS & MORE
          </p>

          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8 sm:mb-12 px-4">
            {features.map((feature, i) => (
              <div
                key={feature.label}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/20 backdrop-blur-sm"
                data-testid={`badge-feature-${feature.label.toLowerCase().replace(/\s/g, '-')}`}
                style={{
                  transform: glitchText && i % 2 === 0 ? `translateY(${glitchOffset.y}px)` : 'none',
                }}
              >
                <feature.icon className="w-4 h-4" />
                <span className="text-sm font-mono uppercase tracking-wider">{feature.label}</span>
              </div>
            ))}
          </div>

          <button
            data-testid="button-enter-studio"
            onClick={() => navigate("/login")}
            className="group px-6 sm:px-10 py-3 sm:py-4 bg-white text-black font-bold text-base sm:text-xl uppercase tracking-wider flex items-center gap-2 sm:gap-3 hover:bg-zinc-200 transition-all relative"
            style={{
              padding: '1rem 2.5rem',
              backgroundColor: '#fff',
              color: '#000',
              fontWeight: 700,
              fontSize: '1.25rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              border: 'none',
              position: 'relative',
              boxShadow: glitchText 
                ? `${glitchOffset.x}px ${glitchOffset.y}px 0 #ff0000, ${-glitchOffset.x}px ${-glitchOffset.y}px 0 #00ffff`
                : '0 0 30px rgba(255,255,255,0.3)',
            }}
          >
            <Gamepad2 className="w-6 h-6" style={{ width: '1.5rem', height: '1.5rem' }} />
            ENTER THE STUDIO
            <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" style={{ width: '1.5rem', height: '1.5rem' }} />
            <div className="absolute inset-0 border-2 border-white translate-x-2 translate-y-2 -z-10 group-hover:translate-x-3 group-hover:translate-y-3 transition-transform" />
          </button>
          
          <div className="w-full max-w-4xl mt-12">
            <EventCarousel featuredOnly={true} variant="dark" />
          </div>
        </div>

        <button 
          onClick={() => navigate("/login")}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 bg-transparent border-none cursor-pointer"
          data-testid="button-press-enter"
        >
          <div className="w-px h-16 bg-gradient-to-b from-transparent to-white/50" />
          <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest animate-pulse">
            Click or Press Enter
          </span>
        </button>
      </section>

      <section className="relative z-10 py-20 sm:py-32 px-4 sm:px-8 bg-black" data-testid="section-features">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16 text-center">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.3em] block mb-4">CREATIVE TOOLS</span>
            <h3
              className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              EVERYTHING YOU NEED
            </h3>
            <div className="w-24 h-1 bg-white mx-auto" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.label}
                className="border border-white/10 bg-white/[0.02] p-6 sm:p-8 hover:border-white/30 hover:bg-white/[0.05] transition-all group"
                data-testid={`card-feature-${feature.label.toLowerCase().replace(/\s/g, '-')}`}
              >
                <div className="w-12 h-12 border border-white/20 flex items-center justify-center mb-4 group-hover:border-white/50 transition-colors">
                  <feature.icon className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
                </div>
                <h4 className="text-lg font-black uppercase tracking-wider mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {feature.label}
                </h4>
                <p className="text-sm text-zinc-500 font-mono leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-20 sm:py-32 px-4 sm:px-8 bg-zinc-950" data-testid="section-built-for">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16 text-center">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.3em] block mb-4">WHO IT'S FOR</span>
            <h3
              className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              BUILT FOR CREATORS
            </h3>
            <div className="w-24 h-1 bg-white mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {audiences.map((audience) => (
              <div
                key={audience.title}
                className="border border-white/10 p-8 relative group hover:border-white/30 transition-all"
                data-testid={`card-audience-${audience.tag.toLowerCase()}`}
              >
                <span className="absolute top-4 right-4 text-[10px] font-mono text-zinc-600 uppercase tracking-widest border border-zinc-800 px-2 py-1">
                  {audience.tag}
                </span>
                <div className="w-14 h-14 border-2 border-white/20 flex items-center justify-center mb-6 group-hover:border-white/50 transition-colors">
                  <audience.icon className="w-7 h-7 text-zinc-400 group-hover:text-white transition-colors" />
                </div>
                <h4 className="text-xl font-black uppercase tracking-wider mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {audience.title}
                </h4>
                <p className="text-sm text-zinc-500 font-mono leading-relaxed">
                  {audience.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-20 sm:py-32 px-4 sm:px-8 bg-black" data-testid="section-how-it-works">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16 text-center">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.3em] block mb-4">GET STARTED</span>
            <h3
              className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              HOW IT WORKS
            </h3>
            <div className="w-24 h-1 bg-white mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-px bg-zinc-800" />
            {steps.map((step) => (
              <div key={step.number} className="text-center relative" data-testid={`step-${step.number}`}>
                <div className="w-24 h-24 border-2 border-white/20 flex items-center justify-center mx-auto mb-6 relative bg-black">
                  <span className="text-3xl font-black text-zinc-600" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {step.number}
                  </span>
                  <step.icon className="w-5 h-5 text-zinc-500 absolute -bottom-2 -right-2 bg-black p-0.5" />
                </div>
                <h4 className="text-base font-black uppercase tracking-wider mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {step.title}
                </h4>
                <p className="text-sm text-zinc-500 font-mono leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-20 sm:py-32 px-4 sm:px-8 bg-zinc-950" data-testid="section-testimonials">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16 text-center">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.3em] block mb-4">COMMUNITY</span>
            <h3
              className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              WHAT CREATORS SAY
            </h3>
            <div className="w-24 h-1 bg-white mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <div
                key={i}
                className="border border-white/10 p-8 relative"
                data-testid={`card-testimonial-${i}`}
              >
                <Quote className="w-8 h-8 text-zinc-800 mb-4" />
                <p className="text-sm text-zinc-400 font-mono leading-relaxed mb-6 italic">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 border border-zinc-700 flex items-center justify-center">
                    <Star className="w-4 h-4 text-zinc-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {testimonial.author}
                    </p>
                    <p className="text-xs text-zinc-600 font-mono">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-20 sm:py-32 px-4 sm:px-8 bg-black" data-testid="section-pricing-preview">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.3em] block mb-4">PLANS</span>
          <h3
            className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-6"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            START FREE. SCALE UP.
          </h3>
          <p className="text-sm sm:text-base text-zinc-500 font-mono leading-relaxed mb-10 max-w-xl mx-auto">
            Free tier gets you full access to core tools. Upgrade for AI generation, team collaboration, marketplace selling, and priority support.
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

      <footer className="relative z-10 border-t border-white/10 py-12 px-4 sm:px-8 bg-black" data-testid="footer">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border-2 border-white flex items-center justify-center font-black text-sm">
                PS
              </div>
              <span className="text-xs text-zinc-500 uppercase tracking-widest font-mono">
                Press Start Comixx
              </span>
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
              &copy; {new Date().getFullYear()} Press Start Comixx. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
