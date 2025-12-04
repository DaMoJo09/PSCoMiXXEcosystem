import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Gamepad2, Sparkles, Zap, Film, Book, Wand2 } from "lucide-react";

const heroVideoUrl = "/assets/CoMixxFallIng_1764842025129.mp4";

export default function LandingPage() {
  const [, navigate] = useLocation();
  const [glitchText, setGlitchText] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);

  useEffect(() => {
    const glitchInterval = setInterval(() => {
      setGlitchText(true);
      setTimeout(() => setGlitchText(false), 150);
    }, 3000);

    const featuresTimer = setTimeout(() => setShowFeatures(true), 1500);

    return () => {
      clearInterval(glitchInterval);
      clearTimeout(featuresTimer);
    };
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
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-40"
        data-testid="video-hero"
      >
        <source src={heroVideoUrl} type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)]" />

      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(255,255,255,0.03) 2px,
            rgba(255,255,255,0.03) 4px
          )`
        }}
      />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-8"
        >
          <div className="relative inline-block">
            <h1 
              className={`font-display text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter uppercase mb-2 ${
                glitchText ? 'animate-pulse' : ''
              }`}
              style={{
                textShadow: glitchText 
                  ? '4px 0 #ff0000, -4px 0 #00ffff, 0 0 40px rgba(255,255,255,0.5)'
                  : '0 0 40px rgba(255,255,255,0.3), 0 0 80px rgba(255,255,255,0.1)',
                letterSpacing: '-0.05em',
              }}
              data-testid="text-title"
            >
              <span className="block text-white">PRESS</span>
              <span className="block text-white">START</span>
            </h1>
            
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="h-2 bg-white mb-4 origin-left"
            />
            
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="font-display text-4xl md:text-6xl lg:text-7xl font-black tracking-[0.2em] uppercase"
              style={{
                textShadow: '0 0 30px rgba(255,255,255,0.4)',
                background: 'linear-gradient(180deg, #ffffff 0%, #888888 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
              data-testid="text-subtitle"
            >
              COMIXX
            </motion.h2>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-lg md:text-xl text-zinc-400 max-w-2xl text-center mb-12 font-mono"
          data-testid="text-tagline"
        >
          THE ULTIMATE CREATIVE STUDIO FOR COMICS, CARDS, MOTION GRAPHICS & MORE
        </motion.p>

        <AnimatePresence>
          {showFeatures && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-wrap justify-center gap-4 mb-12"
            >
              {features.map((feature, i) => (
                <motion.div
                  key={feature.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 backdrop-blur-sm"
                  data-testid={`feature-${feature.label.toLowerCase()}`}
                >
                  <feature.icon className="w-4 h-4 text-white/70" />
                  <span className="text-sm font-mono uppercase tracking-wider text-white/70">
                    {feature.label}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2 }}
          whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(255,255,255,0.3)' }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/login")}
          className="group relative px-12 py-5 bg-white text-black font-display font-black text-xl uppercase tracking-wider flex items-center gap-3 hover:bg-zinc-100 transition-all"
          data-testid="button-enter"
        >
          <Gamepad2 className="w-6 h-6" />
          ENTER THE STUDIO
          <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          
          <div className="absolute inset-0 border-2 border-white translate-x-2 translate-y-2 -z-10 group-hover:translate-x-3 group-hover:translate-y-3 transition-transform" />
        </motion.button>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <div className="w-px h-12 bg-gradient-to-b from-transparent to-white/30" />
          <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">
            Scroll or Enter
          </span>
        </motion.div>
      </div>

      <div className="absolute top-6 left-6 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border-2 border-white flex items-center justify-center">
            <span className="font-display font-black text-lg">PS</span>
          </div>
          <span className="font-mono text-xs text-zinc-500 uppercase tracking-widest hidden md:block">
            Creator Suite v1.0
          </span>
        </div>
      </div>

      <div className="absolute top-6 right-6 z-20 flex gap-4">
        <button 
          onClick={() => navigate("/login")}
          className="font-mono text-sm text-zinc-400 hover:text-white transition-colors uppercase tracking-wider"
          data-testid="button-login"
        >
          Login
        </button>
        <button 
          onClick={() => navigate("/login")}
          className="font-mono text-sm px-4 py-2 bg-white text-black hover:bg-zinc-200 transition-colors uppercase tracking-wider"
          data-testid="button-signup"
        >
          Sign Up
        </button>
      </div>
    </div>
  );
}
