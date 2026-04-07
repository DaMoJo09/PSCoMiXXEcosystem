import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Play, Pause,
  BookOpen, GitBranch, Layers, Film, Eye, Heart
} from "lucide-react";

interface VNScene {
  id: string;
  name: string;
  background?: string;
  transition?: string;
  characters?: { id: string; position: string; expression: string; visible: boolean }[];
  dialogue?: { speaker?: string; text: string; characterSprite?: string }[];
}

interface VNData {
  scenes: VNScene[];
  characters: { id: string; name: string; color?: string; sprites: Record<string, string> }[];
}

interface CYOANode {
  id: string;
  title: string;
  content: string;
  image?: string;
  isEnding?: boolean;
  endingType?: string;
  choices?: { label: string; target: string }[];
}

interface HOPScene {
  id: string;
  order: number;
  assetType: string;
  assetUrl?: string;
  textOverlay?: string;
  caption?: string;
  duration: number;
  transition?: string;
}

interface CardItem {
  id: string;
  name: string;
  type: string;
  rarity: string;
  frontImage?: string;
  stats?: { attack?: number; defense?: number; cost?: number };
  lore?: string;
  effect?: string;
  borderColor?: string;
}

function VNReader({ data }: { data: VNData }) {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [lineIdx, setLineIdx] = useState(0);
  const scene = data.scenes[sceneIdx];
  const line = scene?.dialogue?.[lineIdx];
  const charMap = Object.fromEntries(data.characters.map(c => [c.id, c]));

  const advance = useCallback(() => {
    if (!scene?.dialogue) return;
    if (lineIdx < scene.dialogue.length - 1) {
      setLineIdx(l => l + 1);
    } else if (sceneIdx < data.scenes.length - 1) {
      setSceneIdx(s => s + 1);
      setLineIdx(0);
    }
  }, [lineIdx, sceneIdx, scene, data.scenes.length]);

  const goBack = useCallback(() => {
    if (lineIdx > 0) {
      setLineIdx(l => l - 1);
    } else if (sceneIdx > 0) {
      setSceneIdx(s => s - 1);
      const prevScene = data.scenes[sceneIdx - 1];
      setLineIdx(Math.max(0, (prevScene?.dialogue?.length || 1) - 1));
    }
  }, [lineIdx, sceneIdx, data.scenes]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") advance();
      if (e.key === "ArrowLeft") goBack();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [advance, goBack]);

  const activeChars = scene?.characters?.filter(c => c.visible) || [];

  return (
    <div className="relative w-full max-w-4xl mx-auto aspect-video bg-black overflow-hidden select-none" onClick={advance} onContextMenu={(e) => { e.preventDefault(); goBack(); }} data-testid="vn-reader">
      {scene?.background && (
        <img src={scene.background} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div className="absolute inset-0 bg-black/20" />

      <div className="absolute bottom-0 left-0 right-0 flex justify-around items-end pointer-events-none" style={{ height: "70%" }}>
        {activeChars.map(ac => {
          const charDef = charMap[ac.id];
          if (!charDef) return null;
          const sprite = charDef.sprites[line?.characterSprite || ac.expression] || charDef.sprites["neutral"] || Object.values(charDef.sprites)[0];
          const posMap: Record<string, string> = { left: "10%", center: "35%", right: "60%" };
          return (
            <img key={ac.id} src={sprite} alt={charDef.name} className="absolute bottom-20 h-[60%] object-contain drop-shadow-lg" style={{ left: posMap[ac.position] || "35%" }} />
          );
        })}
      </div>

      {line && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/85 border-t-2 border-cyan-500 p-4 sm:p-6">
          {line.speaker && line.speaker !== "Narrator" && (
            <div className="mb-2">
              <span className="px-3 py-1 text-sm font-black border-2 border-cyan-500 bg-zinc-900" style={{ color: charMap[data.characters.find(c => c.name === line.speaker)?.id || ""]?.color || "#4ecdc4" }}>
                {line.speaker}
              </span>
            </div>
          )}
          <p className={`text-white text-sm sm:text-base leading-relaxed ${line.speaker === "Narrator" ? "italic text-zinc-300" : ""}`} data-testid="vn-dialogue-text">
            {line.text}
          </p>
          <div className="mt-2 flex justify-between items-center text-zinc-500 text-xs">
            <span>Scene {sceneIdx + 1}/{data.scenes.length}</span>
            <span>Tap to continue</span>
          </div>
        </div>
      )}

      <button onClick={(e) => { e.stopPropagation(); goBack(); }} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 border border-zinc-700 text-white hover:bg-black/80 touch-manipulation" data-testid="btn-vn-back">
        <ChevronLeft className="w-5 h-5" />
      </button>
    </div>
  );
}

function CYOAPlayer({ data }: { data: { nodes: CYOANode[] } }) {
  const [history, setHistory] = useState<string[]>([]);
  const currentId = history.length > 0 ? history[history.length - 1] : data.nodes[0]?.id;
  const node = data.nodes.find(n => n.id === currentId);

  useEffect(() => {
    if (data.nodes.length > 0 && history.length === 0) {
      setHistory([data.nodes[0].id]);
    }
  }, [data.nodes, history.length]);

  const choose = (targetId: string) => {
    setHistory(h => [...h, targetId]);
  };

  const goBack = () => {
    if (history.length > 1) setHistory(h => h.slice(0, -1));
  };

  const restart = () => setHistory([data.nodes[0]?.id]);

  if (!node) return <div className="text-white p-8">No story data found.</div>;

  const endingColors: Record<string, string> = { good: "border-green-500", bad: "border-red-500", neutral: "border-yellow-500" };

  return (
    <div className="max-w-3xl mx-auto" data-testid="cyoa-player">
      <div className={`border-2 ${node.isEnding ? (endingColors[node.endingType || "neutral"] || "border-zinc-700") : "border-zinc-700"} bg-zinc-900`}>
        {node.image && (
          <div className="aspect-video relative overflow-hidden">
            <img src={node.image} alt={node.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
          </div>
        )}
        <div className="p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-black text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }} data-testid="cyoa-node-title">
            {node.title}
          </h2>
          <div className="text-zinc-300 text-sm sm:text-base leading-relaxed mb-6 whitespace-pre-line" data-testid="cyoa-node-content">
            {node.content}
          </div>

          {node.isEnding ? (
            <div className="space-y-3">
              <div className={`p-3 border-2 ${endingColors[node.endingType || "neutral"] || "border-zinc-600"} bg-zinc-950 text-center`}>
                <span className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                  {node.endingType === "good" ? "Good Ending" : node.endingType === "bad" ? "Bad Ending" : "Ending"}
                </span>
              </div>
              <button onClick={restart} className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 border-2 border-cyan-500 text-white font-bold text-sm touch-manipulation" data-testid="btn-cyoa-restart">
                Play Again
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {node.choices?.map((choice, idx) => (
                <button key={idx} onClick={() => choose(choice.target)} className="w-full text-left py-3 px-4 bg-zinc-800 hover:bg-zinc-700 border-2 border-zinc-600 hover:border-cyan-500 text-white text-sm font-medium transition-colors touch-manipulation" data-testid={`btn-cyoa-choice-${idx}`}>
                  {choice.label}
                </button>
              ))}
            </div>
          )}

          {history.length > 1 && (
            <button onClick={goBack} className="mt-4 flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm touch-manipulation" data-testid="btn-cyoa-back">
              <ChevronLeft className="w-4 h-4" /> Go Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function HOPPlayer({ data }: { data: { scenes: HOPScene[]; clipLengthMode?: string; audioTrack?: { src: string } } }) {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scene = data.scenes[sceneIdx];

  useEffect(() => {
    if (!playing || !scene) return;
    setProgress(0);
    const interval = 50;
    const totalMs = scene.duration * 1000;
    let elapsed = 0;

    timerRef.current = setInterval(() => {
      elapsed += interval;
      setProgress(Math.min(1, elapsed / totalMs));
      if (elapsed >= totalMs) {
        if (sceneIdx < data.scenes.length - 1) {
          setSceneIdx(s => s + 1);
        } else {
          setSceneIdx(0);
        }
      }
    }, interval);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [sceneIdx, playing, scene, data.scenes.length]);

  if (!scene) return <div className="text-white p-8">No HOP scenes found.</div>;

  return (
    <div className="max-w-md mx-auto" data-testid="hop-player">
      <div className="relative aspect-[9/16] bg-black border-2 border-zinc-700 overflow-hidden">
        {scene.assetType === "text_card" ? (
          <div className="absolute inset-0 bg-zinc-950 flex items-center justify-center p-8">
            <p className="text-white text-center text-lg font-bold whitespace-pre-line leading-relaxed" data-testid="hop-text-card">
              {scene.textOverlay}
            </p>
          </div>
        ) : (
          <>
            {scene.assetUrl && (
              <img src={scene.assetUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            )}
            {scene.textOverlay && (
              <div className="absolute top-8 left-0 right-0 text-center">
                <span className="px-4 py-2 bg-black/70 border-2 border-cyan-500 text-white font-black text-lg sm:text-xl tracking-wider" data-testid="hop-overlay-text">
                  {scene.textOverlay}
                </span>
              </div>
            )}
          </>
        )}

        {scene.caption && (
          <div className="absolute bottom-16 left-0 right-0 text-center px-4">
            <p className="text-white text-sm bg-black/60 px-3 py-2 inline-block" data-testid="hop-caption">
              {scene.caption}
            </p>
          </div>
        )}

        <div className="absolute top-0 left-0 right-0 flex gap-[2px] p-2">
          {data.scenes.map((_, i) => (
            <div key={i} className="flex-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{
                  width: i < sceneIdx ? "100%" : i === sceneIdx ? `${progress * 100}%` : "0%"
                }}
              />
            </div>
          ))}
        </div>

        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-3">
          <button onClick={() => setSceneIdx(i => Math.max(0, i - 1))} className="p-2 bg-black/50 border border-zinc-700 text-white touch-manipulation" data-testid="btn-hop-prev">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setPlaying(p => !p)} className="p-2 bg-black/50 border border-zinc-700 text-white touch-manipulation" data-testid="btn-hop-play-pause">
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button onClick={() => setSceneIdx(i => Math.min(data.scenes.length - 1, i + 1))} className="p-2 bg-black/50 border border-zinc-700 text-white touch-manipulation" data-testid="btn-hop-next">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button onClick={() => { setSceneIdx(s => Math.max(0, s - 1)); }} className="absolute left-0 top-0 bottom-16 w-1/3" />
        <button onClick={() => { setSceneIdx(s => Math.min(data.scenes.length - 1, s + 1)); }} className="absolute right-0 top-0 bottom-16 w-1/3" />
      </div>
    </div>
  );
}

function CardViewer({ data }: { data: { cards?: CardItem[] } & CardItem }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const cards: CardItem[] = data.cards || [data];
  const card = cards[selectedIdx];

  const rarityColors: Record<string, string> = {
    Common: "text-zinc-400 border-zinc-500",
    Rare: "text-blue-400 border-blue-500",
    Epic: "text-purple-400 border-purple-500",
    Legendary: "text-amber-400 border-amber-500",
  };

  return (
    <div className="max-w-4xl mx-auto" data-testid="card-viewer">
      {cards.length > 1 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 touch-pan-x">
          {cards.map((c, i) => (
            <button key={c.id} onClick={() => setSelectedIdx(i)} className={`px-3 py-2 text-xs font-bold border-2 whitespace-nowrap flex-shrink-0 transition-colors touch-manipulation ${i === selectedIdx ? "bg-cyan-500 text-black border-cyan-500" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`} data-testid={`btn-card-select-${i}`}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {card && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="aspect-[5/7] relative border-4 bg-zinc-900 overflow-hidden" style={{ borderColor: card.borderColor || "#333" }}>
            {card.frontImage ? (
              <img src={card.frontImage} alt={card.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                <Layers className="w-16 h-16 text-zinc-600" />
              </div>
            )}
            <div className="absolute top-2 right-2">
              <span className={`px-2 py-1 text-xs font-bold border-2 bg-black/80 ${rarityColors[card.rarity] || "text-zinc-400 border-zinc-600"}`}>
                {card.rarity}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-black text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }} data-testid="card-name">
              {card.name}
            </h2>
            <div className="text-sm text-zinc-400 font-bold uppercase tracking-wider">{card.type}</div>

            {card.stats && (card.stats.attack !== undefined || card.stats.defense !== undefined) && (
              <div className="flex gap-4">
                {card.stats.attack !== undefined && (
                  <div className="px-3 py-2 bg-red-950 border-2 border-red-800 text-center">
                    <div className="text-xs text-red-400 font-bold">ATK</div>
                    <div className="text-lg font-black text-red-300">{card.stats.attack}</div>
                  </div>
                )}
                {card.stats.defense !== undefined && (
                  <div className="px-3 py-2 bg-blue-950 border-2 border-blue-800 text-center">
                    <div className="text-xs text-blue-400 font-bold">DEF</div>
                    <div className="text-lg font-black text-blue-300">{card.stats.defense}</div>
                  </div>
                )}
                {card.stats.cost !== undefined && (
                  <div className="px-3 py-2 bg-amber-950 border-2 border-amber-800 text-center">
                    <div className="text-xs text-amber-400 font-bold">COST</div>
                    <div className="text-lg font-black text-amber-300">{card.stats.cost}</div>
                  </div>
                )}
              </div>
            )}

            {card.effect && (
              <div className="p-3 bg-zinc-800 border-2 border-zinc-700">
                <div className="text-xs text-cyan-400 font-bold mb-1">EFFECT</div>
                <p className="text-zinc-300 text-sm">{card.effect}</p>
              </div>
            )}

            {card.lore && (
              <div className="p-3 bg-zinc-950 border border-zinc-800">
                <p className="text-zinc-500 text-sm italic">{card.lore}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CommunityViewer() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/community/view/:id");
  const id = params?.id;

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ["community-project", id],
    queryFn: async () => {
      const res = await fetch(`/api/community/comic/${id}`);
      if (!res.ok) throw new Error("Failed to load project");
      return res.json();
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (project?.id) {
      fetch(`/api/community/comic/${project.id}/view`, { method: "POST" }).catch(() => {});
    }
  }, [project?.id]);

  if (!match) return null;

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="animate-pulse text-zinc-500 text-lg font-bold">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (isError || !project) {
    return (
      <Layout>
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
          <BookOpen className="w-16 h-16 text-zinc-700" />
          <p className="text-zinc-400 font-bold">Project not found</p>
          <button onClick={() => navigate("/community")} className="px-4 py-2 bg-cyan-600 border-2 border-cyan-500 text-white font-bold text-sm touch-manipulation" data-testid="btn-back-to-library">
            Back to Library
          </button>
        </div>
      </Layout>
    );
  }

  const typeLabels: Record<string, string> = { comic: "Comic", vn: "Visual Novel", cyoa: "Adventure", card: "Card Collection", hop: "HOP", motion: "Motion Comic" };
  const typeIcons: Record<string, typeof BookOpen> = { comic: BookOpen, vn: BookOpen, cyoa: GitBranch, card: Layers, hop: Film, motion: Film };
  const TypeIcon = typeIcons[project.type] || BookOpen;

  if (project.type === "comic") {
    navigate(`/community/read/${project.id}`, { replace: true });
    return null;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="bg-zinc-900 border-b-2 border-cyan-500 py-4 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <button onClick={() => navigate("/community")} className="flex items-center gap-2 text-zinc-400 hover:text-white mb-3 text-sm touch-manipulation" data-testid="btn-back-community">
              <ArrowLeft className="w-4 h-4" /> Back to Library
            </button>
            <div className="flex items-center gap-3">
              <TypeIcon className="w-6 h-6 text-cyan-400 flex-shrink-0" />
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }} data-testid="text-project-title">
                  {project.title}
                </h1>
                <div className="flex items-center gap-3 mt-1 text-sm text-zinc-400">
                  <span className="px-2 py-0.5 border border-zinc-700 text-xs font-bold uppercase">{typeLabels[project.type] || project.type}</span>
                  {project.creatorName && <span>by {project.creatorName}</span>}
                  {project.viewCount > 0 && <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {project.viewCount}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {project.type === "vn" && project.data?.scenes && (
            <VNReader data={project.data as VNData} />
          )}
          {project.type === "cyoa" && project.data?.nodes && (
            <CYOAPlayer data={project.data as { nodes: CYOANode[] }} />
          )}
          {project.type === "hop" && project.data?.scenes && (
            <HOPPlayer data={project.data as { scenes: HOPScene[] }} />
          )}
          {project.type === "card" && (
            <CardViewer data={project.data as any} />
          )}
          {!["vn", "cyoa", "hop", "card"].includes(project.type) && (
            <div className="text-center py-16 border-2 border-dashed border-zinc-800">
              <TypeIcon className="w-16 h-16 mx-auto text-zinc-700 mb-4" />
              <p className="text-zinc-400 font-bold">Viewer not available for this content type yet.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
