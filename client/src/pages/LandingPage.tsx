import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronRight, Gamepad2, Sparkles, Zap, Film, Book, Wand2 } from "lucide-react";

export default function LandingPage() {
  const [, navigate] = useLocation();
  const [glitchText, setGlitchText] = useState(false);
  const [glitchOffset, setGlitchOffset] = useState({ x: 0, y: 0 });

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
    { icon: Book, label: "Comics" },
    { icon: Gamepad2, label: "Cards" },
    { icon: Film, label: "Motion" },
    { icon: Sparkles, label: "AI Art" },
    { icon: Wand2, label: "Stories" },
    { icon: Zap, label: "CYOA" },
  ];

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-900 z-0" />
      
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30 z-[1]" />
      
      <div 
        className="absolute inset-0 z-[2] pointer-events-none opacity-[0.15]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.3) 2px,
            rgba(0,0,0,0.3) 4px
          )`
        }}
      />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-8">
        <div className="text-center mb-8 relative">
          {glitchText && (
            <>
              <h1 
                className="absolute inset-0 text-7xl md:text-9xl font-black uppercase tracking-tight text-cyan-500 opacity-70"
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
                className="absolute inset-0 text-7xl md:text-9xl font-black uppercase tracking-tight text-red-500 opacity-70"
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
            className="text-7xl md:text-9xl font-black uppercase mb-4 tracking-tight text-white relative"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              textShadow: glitchText 
                ? `${glitchOffset.x}px ${glitchOffset.y}px 0 #ff0000, ${-glitchOffset.x}px ${-glitchOffset.y}px 0 #00ffff, 0 0 80px rgba(255,255,255,0.8)` 
                : '0 0 60px rgba(255,255,255,0.5), 0 0 120px rgba(255,255,255,0.2)',
              transform: glitchText ? `translate(${glitchOffset.x * 0.5}px, ${glitchOffset.y * 0.5}px)` : 'none',
              transition: glitchText ? 'none' : 'transform 0.1s ease-out',
            }}
          >
            <span className="block">PRESS</span>
            <span className="block">START</span>
          </h1>
          
          <div 
            className="w-full max-w-lg h-1 bg-white mx-auto mb-6"
            style={{
              boxShadow: '0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(255,255,255,0.4)',
              transform: glitchText ? `scaleX(${0.9 + Math.random() * 0.2})` : 'scaleX(1)',
            }}
          />
          
          <h2 
            className="text-5xl md:text-7xl font-black uppercase tracking-[0.3em] relative"
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
          className="text-xl text-zinc-400 text-center mb-12 max-w-2xl font-mono"
          style={{
            opacity: glitchText ? 0.5 : 1,
            transform: glitchText ? `translateX(${glitchOffset.x * 2}px)` : 'none',
          }}
        >
          THE ULTIMATE CREATIVE STUDIO FOR COMICS, CARDS, MOTION GRAPHICS & MORE
        </p>

        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {features.map((feature, i) => (
            <div
              key={feature.label}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/20 backdrop-blur-sm"
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
          onClick={() => navigate("/login")}
          className="group px-10 py-4 bg-white text-black font-bold text-xl uppercase tracking-wider flex items-center gap-3 hover:bg-zinc-200 transition-all relative"
          style={{
            boxShadow: glitchText 
              ? `${glitchOffset.x}px ${glitchOffset.y}px 0 #ff0000, ${-glitchOffset.x}px ${-glitchOffset.y}px 0 #00ffff`
              : '0 0 30px rgba(255,255,255,0.3)',
          }}
        >
          <Gamepad2 className="w-6 h-6" />
          ENTER THE STUDIO
          <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          <div className="absolute inset-0 border-2 border-white translate-x-2 translate-y-2 -z-10 group-hover:translate-x-3 group-hover:translate-y-3 transition-transform" />
        </button>
      </div>

      <div className="absolute top-6 left-6 z-20 flex items-center gap-3">
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

      <div className="absolute top-6 right-6 z-20 flex gap-4">
        <button 
          onClick={() => navigate("/login")}
          className="text-sm text-zinc-400 hover:text-white uppercase tracking-wider font-mono transition-colors"
        >
          Login
        </button>
        <button 
          onClick={() => navigate("/login")}
          className="text-sm px-4 py-2 bg-white text-black hover:bg-zinc-200 uppercase tracking-wider font-mono transition-colors"
        >
          Sign Up
        </button>
      </div>
      
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
        <div className="w-px h-16 bg-gradient-to-b from-transparent to-white/50" />
        <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest animate-pulse">
          Press Enter
        </span>
      </div>
    </div>
  );
}
