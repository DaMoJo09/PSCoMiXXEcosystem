import { useState } from "react";
import { useRoute, Link } from "wouter";
import { ArrowLeft, ExternalLink, Maximize2, Minimize2 } from "lucide-react";

const CURRICULA: Record<string, { title: string; subtitle: string; file: string; accent: string }> = {
  "comixx-main": {
    title: "CoMiXX Creator",
    subtitle: "Photography-Based Comics",
    file: "/curricula/comixx-main.html",
    accent: "#00e5ff",
  },
  "comixx-creator": {
    title: "CoMiXX Creator",
    subtitle: "Digital Comics & Platform",
    file: "/curricula/comixx-creator.html",
    accent: "#a855f7",
  },
  "fx-studio": {
    title: "FX Studio",
    subtitle: "Visual Effects & Compositing",
    file: "/curricula/fx-studio.html",
    accent: "#ff2d78",
  },
};

export default function CurriculumViewer() {
  const [, params] = useRoute("/ecosystem/learn/curriculum/:slug");
  const slug = params?.slug || "";
  const curr = CURRICULA[slug];
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!curr) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-zinc-400 text-lg">Curriculum not found</p>
          <Link href="/ecosystem/learn">
            <button className="px-6 py-2 border-2 border-white font-bold hover:bg-white hover:text-black transition-colors" data-testid="btn-back-learn">
              BACK TO LEARN
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
        <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0">
          <span className="text-white text-sm font-bold tracking-wide" style={{ color: curr.accent }}>{curr.title} — {curr.subtitle}</span>
          <button
            onClick={() => setIsFullscreen(false)}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            data-testid="btn-exit-fullscreen"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
        <iframe
          src={curr.file}
          className="flex-1 w-full border-0"
          title={curr.title}
          data-testid="curriculum-iframe"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/ecosystem/learn">
            <button className="p-2 hover:bg-zinc-800 transition-colors" data-testid="btn-back-learn">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-sm font-black tracking-wide" style={{ color: curr.accent }}>{curr.title}</h1>
            <p className="text-[10px] text-zinc-500 tracking-widest uppercase">{curr.subtitle} — 6-Week Curriculum</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFullscreen(true)}
            className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            data-testid="btn-fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <a
            href={curr.file}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            data-testid="btn-open-external"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
      <iframe
        src={curr.file}
        className="flex-1 w-full border-0"
        style={{ minHeight: "calc(100vh - 56px)" }}
        title={curr.title}
        data-testid="curriculum-iframe"
      />
    </div>
  );
}
