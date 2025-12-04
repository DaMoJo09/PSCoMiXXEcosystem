import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronRight, Gamepad2, Sparkles, Zap, Film, Book, Wand2 } from "lucide-react";

export default function LandingPage() {
  const [, navigate] = useLocation();
  const [glitchText, setGlitchText] = useState(false);

  useEffect(() => {
    const glitchInterval = setInterval(() => {
      setGlitchText(true);
      setTimeout(() => setGlitchText(false), 150);
    }, 3000);
    return () => clearInterval(glitchInterval);
  }, []);

  const features = [
    { icon: Book, label: "Comics" },
    { icon: Gamepad2, label: "Cards" },
    { icon: Film, label: "Motion" },
    { icon: Sparkles, label: "AI Art" },
    { icon: Wand2, label: "Stories" },
    { icon: Zap, label: "CYOA" },
  ];

  return (
    <div className="min-h-screen bg-zinc-900 text-white relative overflow-hidden">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-30 z-0"
      >
        <source src="/assets/CoMixxFallIng_1764842025129.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-black/50 z-[1]" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-8">
        <div className="text-center mb-8">
          <h1 
            className={`text-7xl md:text-9xl font-black uppercase mb-4 tracking-tight ${glitchText ? 'text-red-500' : 'text-white'}`}
            style={{
              textShadow: glitchText 
                ? '4px 0 cyan, -4px 0 red' 
                : '0 0 60px rgba(255,255,255,0.5)',
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            <span className="block">PRESS</span>
            <span className="block">START</span>
          </h1>
          
          <div className="w-full max-w-md h-1 bg-white mx-auto mb-6" />
          
          <h2 
            className="text-5xl md:text-7xl font-black uppercase tracking-[0.3em]"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              background: 'linear-gradient(to bottom, #fff, #666)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 40px rgba(255,255,255,0.3)',
            }}
          >
            COMIXX
          </h2>
        </div>

        <p className="text-xl text-zinc-400 text-center mb-12 max-w-2xl font-mono">
          THE ULTIMATE CREATIVE STUDIO FOR COMICS, CARDS, MOTION GRAPHICS & MORE
        </p>

        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {features.map((feature) => (
            <div
              key={feature.label}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded"
            >
              <feature.icon className="w-4 h-4" />
              <span className="text-sm font-mono uppercase">{feature.label}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate("/login")}
          className="group px-10 py-4 bg-white text-black font-bold text-xl uppercase tracking-wider flex items-center gap-3 hover:bg-zinc-200 transition-all relative"
        >
          <Gamepad2 className="w-6 h-6" />
          ENTER THE STUDIO
          <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          <div className="absolute inset-0 border-2 border-white translate-x-2 translate-y-2 -z-10" />
        </button>
      </div>

      <div className="absolute top-6 left-6 z-20 flex items-center gap-3">
        <div className="w-10 h-10 border-2 border-white flex items-center justify-center font-black">
          PS
        </div>
        <span className="text-xs text-zinc-500 uppercase tracking-widest hidden md:block font-mono">
          Creator Suite v1.0
        </span>
      </div>

      <div className="absolute top-6 right-6 z-20 flex gap-4">
        <button 
          onClick={() => navigate("/login")}
          className="text-sm text-zinc-400 hover:text-white uppercase tracking-wider font-mono"
        >
          Login
        </button>
        <button 
          onClick={() => navigate("/login")}
          className="text-sm px-4 py-2 bg-white text-black hover:bg-zinc-200 uppercase tracking-wider font-mono"
        >
          Sign Up
        </button>
      </div>
    </div>
  );
}
