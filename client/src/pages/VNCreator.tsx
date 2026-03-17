import { Layout } from "@/components/layout/Layout";
import { 
  Play, Plus, ArrowLeft, Save, Trash2, Image as ImageIcon, 
  MessageSquare, GitBranch, User, Upload, Wand2, X,
  Copy, Eye, EyeOff,
  Download, ArrowUp, ArrowDown, Maximize2, Minimize2,
  BookOpen
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useSearch, Link } from "wouter";
import vnBg from "@assets/generated_images/visual_novel_background.png";
import { AIGenerator } from "@/components/tools/AIGenerator";
import { useProject, useUpdateProject, useCreateProject } from "@/hooks/useProjects";

import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";

type TransitionType = "none" | "fade" | "slide-left" | "slide-right" | "dissolve";

interface VNScene {
  id: string;
  name: string;
  background: string;
  backgroundUrl?: string;
  transition?: TransitionType;
  musicUrl?: string;
  tintColor?: string;
  characters: { id: string; position: "left" | "center" | "right"; expression: string; visible: boolean }[];
  dialogue: { speaker: string; text: string; choices?: { label: string; target: string }[] }[];
}

interface VNCharacter {
  id: string;
  name: string;
  color: string;
  sprites: { expression: string; url: string }[];
}

interface VNBackground {
  id: string;
  name: string;
  url: string;
}

const defaultBackgrounds: VNBackground[] = [
  { id: "classroom", name: "Classroom", url: vnBg },
  { id: "hallway", name: "Hallway", url: vnBg },
  { id: "rooftop", name: "Rooftop", url: vnBg },
  { id: "park", name: "Park", url: vnBg },
  { id: "night_city", name: "Night City", url: vnBg },
];

const TRANSITION_OPTIONS: { value: TransitionType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade" },
  { value: "slide-left", label: "Slide Left" },
  { value: "slide-right", label: "Slide Right" },
  { value: "dissolve", label: "Dissolve" },
];

function TypewriterText({ text, speed = 30, onComplete }: { text: string; speed?: number; onComplete?: () => void }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    indexRef.current = 0;

    if (speed <= 0) {
      setDisplayed(text);
      setDone(true);
      onComplete?.();
      return;
    }

    const interval = setInterval(() => {
      indexRef.current++;
      if (indexRef.current >= text.length) {
        setDisplayed(text);
        setDone(true);
        onComplete?.();
        clearInterval(interval);
      } else {
        setDisplayed(text.slice(0, indexRef.current));
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {!done && <span className="animate-pulse">|</span>}
    </span>
  );
}

function TextLog({ log, onClose }: { log: { speaker: string; text: string; color: string }[]; onClose: () => void }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [log]);

  return (
    <div className="absolute inset-0 bg-black/95 z-30 flex flex-col" data-testid="text-log-panel">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <h3 className="font-display font-bold text-lg flex items-center gap-2">
          <BookOpen className="w-5 h-5" /> Text Log
        </h3>
        <button onClick={onClose} className="p-2 hover:bg-zinc-800" data-testid="button-close-log">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {log.map((entry, i) => (
          <div key={i} className="border-b border-zinc-800/50 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: entry.color }}>
              {entry.speaker}
            </span>
            <p className="text-sm text-zinc-300 mt-1 font-mono leading-relaxed">{entry.text}</p>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

export default function VNCreator() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const projectId = searchParams.get('id');
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const effectiveProjectId = projectId || createdProjectId;
  
  const { data: project } = useProject(effectiveProjectId || '');
  const updateProject = useUpdateProject();
  const createProject = useCreateProject();

  const [title, setTitle] = useState("Untitled Visual Novel");
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(!effectiveProjectId);
  const creationAttempted = useRef(false);
  const [activeTab, setActiveTab] = useState<"scenes" | "characters" | "backgrounds">("scenes");
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playIndex, setPlayIndex] = useState(0);
  const [showAIGen, setShowAIGen] = useState(false);
  const [aiTarget, setAiTarget] = useState<"background" | "sprite">("background");
  const [editMode, setEditMode] = useState<"dialogue" | "staging">("dialogue");
  const [textSpeed, setTextSpeed] = useState(30);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [autoAdvanceDelay, setAutoAdvanceDelay] = useState(3000);
  const [showTextLog, setShowTextLog] = useState(false);
  const [textLog, setTextLog] = useState<{ speaker: string; text: string; color: string }[]>([]);
  const [typewriterDone, setTypewriterDone] = useState(false);
  const [transitionClass, setTransitionClass] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);

  const bgInputRef = useRef<HTMLInputElement>(null);
  const spriteInputRef = useRef<HTMLInputElement>(null);
  const playtestRef = useRef<HTMLDivElement>(null);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [scenes, setScenes] = useState<VNScene[]>([
    {
      id: "scene_1",
      name: "Scene 1: Intro",
      background: "classroom",
      transition: "fade",
      characters: [],
      dialogue: [
        { speaker: "Narrator", text: "The morning sun filters through the classroom windows..." },
        { speaker: "Akira", text: "I never thought I'd see you here again... not after what happened." },
      ],
    },
  ]);

  const [characters, setCharacters] = useState<VNCharacter[]>([
    { id: "akira", name: "Akira", color: "#FF6B6B", sprites: [{ expression: "neutral", url: "" }] },
    { id: "yuki", name: "Yuki", color: "#4ECDC4", sprites: [{ expression: "neutral", url: "" }] },
  ]);

  const [backgrounds, setBackgrounds] = useState<VNBackground[]>(defaultBackgrounds);

  useEffect(() => {
    if (projectId) {
      setIsCreating(false);
      return;
    }
    if (creationAttempted.current) return;

    creationAttempted.current = true;
    setIsCreating(true);

    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      setIsCreating(false);
      toast.error("Project creation timed out - please try again");
    }, 15000);

    fetch("/api/projects?fields=meta", { credentials: "include" })
      .then(res => res.ok ? res.json() : Promise.reject(new Error("Failed to fetch projects")))
      .then((allProjects: any[]) => {
        if (cancelled) return;
        const existing = allProjects
          .filter((p: any) => p.type === "vn")
          .sort((a: any, b: any) => {
            const aHasData = a.updatedAt !== a.createdAt;
            const bHasData = b.updatedAt !== b.createdAt;
            if (aHasData && !bHasData) return -1;
            if (!aHasData && bHasData) return 1;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          });
        if (existing.length > 0) {
          clearTimeout(timeoutId);
          setCreatedProjectId(existing[0].id);
          setIsCreating(false);
          navigate(`/creator/vn?id=${existing[0].id}`, { replace: true });
          return;
        }
        return createProject.mutateAsync({
          title: "Untitled Visual Novel",
          type: "vn",
          status: "draft",
          data: { scenes, characters, backgrounds },
        }).then((newProject) => {
          if (cancelled) return;
          clearTimeout(timeoutId);
          setCreatedProjectId(newProject.id);
          setIsCreating(false);
          navigate(`/creator/vn?id=${newProject.id}`, { replace: true });
        });
      }).catch((err) => {
        if (cancelled) return;
        clearTimeout(timeoutId);
        toast.error(err?.message || "Failed to create project - please try again");
        setIsCreating(false);
        creationAttempted.current = false;
      });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [projectId]);

  useEffect(() => {
    if (project) {
      setTitle(project.title);
      const data = project.data as any;
      if (data?.scenes) setScenes(data.scenes);
      if (data?.characters) setCharacters(data.characters);
      if (data?.backgrounds) setBackgrounds(data.backgrounds);
    }
  }, [project]);

  useEffect(() => {
    if (scenes.length > 0 && !selectedScene) {
      setSelectedScene(scenes[0].id);
    }
  }, [scenes, selectedScene]);

  useEffect(() => {
    const importData = localStorage.getItem("vn_import_data");
    if (importData) {
      try {
        const data = JSON.parse(importData);
        if (data.scenes) setScenes(data.scenes);
        if (data.characters) setCharacters(data.characters);
        localStorage.removeItem("vn_import_data");
        toast.success("Story imported from Story Forge!");
      } catch (e) {
        console.error("Failed to import VN data:", e);
      }
    }
  }, []);

  const fireXpAction = useCallback((action: string) => {
    fetch("/api/xp/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
      credentials: "include",
    });
  }, []);

  const pendingSaveRef = useRef(false);
  const initialLoadDoneRef = useRef(false);
  const latestDataRef = useRef({ title, scenes, characters, backgrounds, projectId: effectiveProjectId });
  latestDataRef.current = { title, scenes, characters, backgrounds, projectId: effectiveProjectId };

  useEffect(() => {
    if (project && !initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true;
    }
  }, [project]);

  useEffect(() => {
    if (!effectiveProjectId || !initialLoadDoneRef.current) return;
    pendingSaveRef.current = true;
  }, [scenes, characters, backgrounds, title, effectiveProjectId]);

  useEffect(() => {
    if (!effectiveProjectId || scenes.length === 0) return;
    const interval = setInterval(async () => {
      if (!pendingSaveRef.current) return;
      try {
        await updateProject.mutateAsync({
          id: effectiveProjectId,
          data: { title, data: { scenes, characters, backgrounds } },
        });
        pendingSaveRef.current = false;
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [effectiveProjectId, scenes, characters, backgrounds, title]);

  useEffect(() => {
    return () => {
      if (pendingSaveRef.current) {
        const { projectId: pid, title: t, scenes: s, characters: c, backgrounds: b } = latestDataRef.current;
        if (pid) {
          navigator.sendBeacon(
            `/api/projects/${pid}/autosave`,
            new Blob([JSON.stringify({ title: t, data: { scenes: s, characters: c, backgrounds: b } })], { type: "application/json" })
          );
        }
      }
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingSaveRef.current) {
        const { projectId: pid, title: t, scenes: s, characters: c, backgrounds: b } = latestDataRef.current;
        if (pid) {
          navigator.sendBeacon(
            `/api/projects/${pid}/autosave`,
            new Blob([JSON.stringify({ title: t, data: { scenes: s, characters: c, backgrounds: b } })], { type: "application/json" })
          );
        }
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!typewriterDone) {
          setTextSpeed(0);
        } else {
          advanceDialogue();
        }
      } else if (e.key === "Escape") {
        setIsPlaying(false);
        setIsFullscreen(false);
      } else if (e.key === "l" || e.key === "L") {
        setShowTextLog(prev => !prev);
      } else if (e.key === "a" || e.key === "A") {
        setAutoAdvance(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isPlaying, typewriterDone]);

  useEffect(() => {
    if (autoAdvance && typewriterDone && isPlaying) {
      const scene = scenes.find(s => s.id === selectedScene);
      const currentLine = scene?.dialogue[playIndex];
      if (currentLine?.choices && currentLine.choices.length > 0) return;
      autoAdvanceTimer.current = setTimeout(() => {
        advanceDialogue();
      }, autoAdvanceDelay);
    }
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, [autoAdvance, typewriterDone, isPlaying, playIndex, selectedScene, autoAdvanceDelay]);

  const handleExportJSON = () => {
    const data = { title, scenes, characters, backgrounds };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Project exported as JSON");
    fireXpAction("export");
  };

  const handleExportHTML = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#000;color:#fff;overflow:hidden;height:100vh;width:100vw}
#game{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center}
#bg{position:absolute;inset:0;background-size:cover;background-position:center;transition:opacity 0.8s}
.char{position:absolute;bottom:0;height:80%;display:flex;align-items:flex-end;transition:all 0.5s}
.char img{height:100%;object-fit:contain}
.char.left{left:10%}.char.center{left:50%;transform:translateX(-50%)}.char.right{right:10%}
#textbox{position:absolute;bottom:2rem;left:2rem;right:2rem;background:rgba(0,0,0,0.92);border:2px solid rgba(255,255,255,0.8);padding:1.5rem 2rem;min-height:140px;z-index:10}
#speaker{font-weight:bold;font-size:0.85rem;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:0.5rem}
#dialogue{font-size:0.95rem;line-height:1.7;min-height:3em}
#advance{position:absolute;bottom:0.5rem;right:1rem;animation:bounce 1s infinite;color:rgba(255,255,255,0.5);font-size:1.2rem}
@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(4px)}}
#choices{display:flex;gap:0.5rem;margin-top:1rem;flex-wrap:wrap}
#choices button{padding:0.7rem 1.5rem;background:rgba(255,255,255,0.08);border:2px solid rgba(255,255,255,0.3);color:#fff;cursor:pointer;font-size:0.9rem;transition:all 0.2s}
#choices button:hover{background:rgba(255,255,255,0.15);border-color:rgba(255,255,255,0.6)}
#controls{position:absolute;top:1rem;right:1rem;display:flex;gap:0.5rem;z-index:20}
#controls button{padding:0.4rem 0.8rem;background:rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.2);color:#fff;cursor:pointer;font-size:0.7rem;text-transform:uppercase}
#controls button:hover{background:rgba(255,255,255,0.1)}
#counter{position:absolute;top:1rem;left:1rem;font-size:0.7rem;color:rgba(255,255,255,0.4);font-family:monospace;z-index:20}
.fade-in{animation:fadeIn 0.8s}@keyframes fadeIn{from{opacity:0}to{opacity:1}}
#log-panel{position:absolute;inset:0;background:rgba(0,0,0,0.95);z-index:30;display:none;flex-direction:column}
#log-panel.open{display:flex}
#log-panel .header{padding:1rem;border-bottom:1px solid #333;display:flex;justify-content:space-between;align-items:center}
#log-panel .entries{flex:1;overflow:auto;padding:1.5rem}
#log-panel .entry{border-bottom:1px solid #222;padding-bottom:0.8rem;margin-bottom:0.8rem}
#log-panel .entry .name{font-size:0.75rem;font-weight:bold;text-transform:uppercase;letter-spacing:0.08em}
#log-panel .entry .text{font-size:0.85rem;color:#aaa;margin-top:0.3rem;line-height:1.5}
</style>
</head>
<body>
<div id="game">
<div id="bg"></div>
<div id="textbox">
<div id="speaker"></div>
<div id="dialogue"></div>
<div id="advance">▼</div>
<div id="choices"></div>
</div>
<div id="counter"></div>
<div id="controls">
<button onclick="toggleAuto()">Auto</button>
<button onclick="toggleLog()">Log</button>
<button onclick="skipText()">Skip</button>
</div>
<div id="log-panel">
<div class="header"><span style="font-weight:bold">Text Log</span><button onclick="toggleLog()" style="background:none;border:none;color:#fff;cursor:pointer;font-size:1.2rem">✕</button></div>
<div class="entries" id="log-entries"></div>
</div>
</div>
<script>
const scenes=${JSON.stringify(scenes)};
const characters=${JSON.stringify(characters)};
const backgrounds=${JSON.stringify(backgrounds)};
let sceneIdx=0,lineIdx=0,typing=false,autoMode=false,autoTimer=null,textLog=[];
function getBgUrl(scene){
if(scene.backgroundUrl)return scene.backgroundUrl;
const bg=backgrounds.find(b=>b.id===scene.background);
return bg?bg.url:'';
}
function getCharColor(name){const c=characters.find(ch=>ch.name===name);return c?c.color:'#fff';}
function showScene(idx){
sceneIdx=idx;lineIdx=0;
const scene=scenes[idx];if(!scene)return;
const bgEl=document.getElementById('bg');
bgEl.style.backgroundImage='url('+getBgUrl(scene)+')';
if(scene.tintColor){bgEl.style.backgroundColor=scene.tintColor;bgEl.style.backgroundBlendMode='overlay';}
bgEl.className='fade-in';
showLine();
}
function typeText(el,text,cb){
typing=true;let i=0;el.textContent='';
const iv=setInterval(()=>{i++;if(i>=text.length){el.textContent=text;typing=false;clearInterval(iv);if(cb)cb();}else{el.textContent=text.slice(0,i);}},30);
return iv;
}
let typeInterval=null;
function showLine(){
const scene=scenes[sceneIdx];if(!scene)return;
if(lineIdx>=scene.dialogue.length){
if(sceneIdx<scenes.length-1){showScene(sceneIdx+1);}
return;
}
const line=scene.dialogue[lineIdx];
document.getElementById('speaker').textContent=line.speaker;
document.getElementById('speaker').style.color=getCharColor(line.speaker);
document.getElementById('counter').textContent=(lineIdx+1)+' / '+scene.dialogue.length;
if(typeInterval)clearInterval(typeInterval);
const choicesEl=document.getElementById('choices');choicesEl.innerHTML='';
typeInterval=typeText(document.getElementById('dialogue'),line.text,()=>{
if(line.choices&&line.choices.length>0){
line.choices.forEach(c=>{
const btn=document.createElement('button');btn.textContent=c.label;
btn.onclick=()=>{const ti=scenes.findIndex(s=>s.id===c.target);if(ti>=0)showScene(ti);};
choicesEl.appendChild(btn);
});
}
if(autoMode){autoTimer=setTimeout(()=>{lineIdx++;showLine();},3000);}
});
textLog.push({speaker:line.speaker,text:line.text,color:getCharColor(line.speaker)});
}
function advance(){
if(typing){if(typeInterval)clearInterval(typeInterval);const scene=scenes[sceneIdx];const line=scene.dialogue[lineIdx];document.getElementById('dialogue').textContent=line.text;typing=false;return;}
lineIdx++;showLine();
}
function skipText(){if(typing){if(typeInterval)clearInterval(typeInterval);const scene=scenes[sceneIdx];const line=scene.dialogue[lineIdx];document.getElementById('dialogue').textContent=line.text;typing=false;}}
function toggleAuto(){autoMode=!autoMode;if(!autoMode&&autoTimer){clearTimeout(autoTimer);autoTimer=null;}}
function toggleLog(){
const p=document.getElementById('log-panel');p.classList.toggle('open');
const el=document.getElementById('log-entries');el.innerHTML='';
textLog.forEach(e=>{el.innerHTML+='<div class="entry"><div class="name" style="color:'+e.color+'">'+e.speaker+'</div><div class="text">'+e.text+'</div></div>';});
el.scrollTop=el.scrollHeight;
}
document.getElementById('textbox').onclick=advance;
document.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();advance();}if(e.key==='Escape'){toggleLog();}});
if(scenes.length>0)showScene(0);
</script>
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_")}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported as playable HTML!");
    fireXpAction("export");
  };

  const moveDialogue = (sceneId: string, index: number, direction: "up" | "down") => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= scene.dialogue.length) return;
    const newDialogue = [...scene.dialogue];
    [newDialogue[index], newDialogue[newIndex]] = [newDialogue[newIndex], newDialogue[index]];
    updateScene(sceneId, { dialogue: newDialogue });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (effectiveProjectId) {
        await updateProject.mutateAsync({
          id: effectiveProjectId,
          data: { title, data: { scenes, characters, backgrounds } },
        });
      }
      pendingSaveRef.current = false;
      fireXpAction("save");
      toast.success("Project saved");
    } catch (error: any) {
      toast.error(error.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const addScene = () => {
    const newScene: VNScene = {
      id: `scene_${Date.now()}`,
      name: `Scene ${scenes.length + 1}`,
      background: backgrounds[0]?.id || "classroom",
      transition: "fade",
      characters: [],
      dialogue: [],
    };
    setScenes([...scenes, newScene]);
    setSelectedScene(newScene.id);
    toast.success("Scene added");
  };

  const duplicateScene = (id: string) => {
    const scene = scenes.find(s => s.id === id);
    if (!scene) return;
    const dup: VNScene = {
      ...JSON.parse(JSON.stringify(scene)),
      id: `scene_${Date.now()}`,
      name: `${scene.name} (Copy)`,
    };
    const idx = scenes.findIndex(s => s.id === id);
    const newScenes = [...scenes];
    newScenes.splice(idx + 1, 0, dup);
    setScenes(newScenes);
    toast.success("Scene duplicated");
  };

  const moveScene = (id: string, direction: "up" | "down") => {
    const idx = scenes.findIndex(s => s.id === id);
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= scenes.length) return;
    const newScenes = [...scenes];
    [newScenes[idx], newScenes[newIdx]] = [newScenes[newIdx], newScenes[idx]];
    setScenes(newScenes);
  };

  const deleteScene = (id: string) => {
    if (scenes.length <= 1) {
      toast.error("Cannot delete the last scene");
      return;
    }
    const remaining = scenes.filter(s => s.id !== id);
    setScenes(remaining);
    if (selectedScene === id) {
      setSelectedScene(remaining[0]?.id || null);
    }
    toast.success("Scene deleted");
  };

  const addCharacter = () => {
    const newChar: VNCharacter = {
      id: `char_${Date.now()}`,
      name: "New Character",
      color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
      sprites: [{ expression: "neutral", url: "" }],
    };
    setCharacters([...characters, newChar]);
    setSelectedCharacter(newChar.id);
    toast.success("Character added");
  };

  const updateCharacter = (id: string, updates: Partial<VNCharacter>) => {
    setCharacters(characters.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCharacter = (id: string) => {
    setCharacters(characters.filter(c => c.id !== id));
    if (selectedCharacter === id) setSelectedCharacter(null);
    toast.success("Character deleted");
  };

  const updateScene = (id: string, updates: Partial<VNScene>) => {
    setScenes(scenes.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const addDialogue = (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (scene) {
      updateScene(sceneId, {
        dialogue: [...scene.dialogue, { speaker: characters[0]?.name || "???", text: "" }],
      });
    }
  };

  const addChoice = (sceneId: string, dialogueIndex: number) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (scene) {
      const newDialogue = [...scene.dialogue];
      const currentChoices = newDialogue[dialogueIndex].choices || [];
      newDialogue[dialogueIndex] = {
        ...newDialogue[dialogueIndex],
        choices: [...currentChoices, { label: "New choice", target: scenes[0].id }],
      };
      updateScene(sceneId, { dialogue: newDialogue });
    }
  };

  const updateDialogue = (sceneId: string, index: number, updates: Partial<{ speaker: string; text: string; choices?: { label: string; target: string }[] }>) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (scene) {
      const newDialogue = [...scene.dialogue];
      newDialogue[index] = { ...newDialogue[index], ...updates };
      updateScene(sceneId, { dialogue: newDialogue });
    }
  };

  const deleteDialogue = (sceneId: string, index: number) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (scene) {
      updateScene(sceneId, { dialogue: scene.dialogue.filter((_, i) => i !== index) });
    }
  };

  const addCharacterToScene = (sceneId: string, characterId: string, position: "left" | "center" | "right") => {
    const scene = scenes.find(s => s.id === sceneId);
    if (scene) {
      const exists = scene.characters.find(c => c.id === characterId);
      if (!exists) {
        updateScene(sceneId, {
          characters: [...scene.characters, { id: characterId, position, expression: "neutral", visible: true }],
        });
        toast.success("Character added to scene");
      }
    }
  };

  const removeCharacterFromScene = (sceneId: string, characterId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (scene) {
      updateScene(sceneId, {
        characters: scene.characters.filter(c => c.id !== characterId),
      });
    }
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const newBg: VNBackground = {
        id: `bg_${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ""),
        url,
      };
      setBackgrounds([...backgrounds, newBg]);
      toast.success("Background imported");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSpriteUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCharacter) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const char = characters.find(c => c.id === selectedCharacter);
      if (char) {
        updateCharacter(selectedCharacter, {
          sprites: [...char.sprites, { expression: `sprite_${char.sprites.length}`, url }],
        });
        toast.success("Sprite added to character");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleAIGenerated = (url: string) => {
    fireXpAction("generate");
    if (aiTarget === "background") {
      const newBg: VNBackground = {
        id: `bg_${Date.now()}`,
        name: "AI Background",
        url,
      };
      setBackgrounds([...backgrounds, newBg]);
      toast.success("AI background added");
    } else if (selectedCharacter) {
      const char = characters.find(c => c.id === selectedCharacter);
      if (char) {
        updateCharacter(selectedCharacter, {
          sprites: [...char.sprites, { expression: `ai_sprite`, url }],
        });
        toast.success("AI sprite added");
      }
    }
    setShowAIGen(false);
  };

  const startPlaytest = () => {
    setIsPlaying(true);
    setPlayIndex(0);
    setTextLog([]);
    setTypewriterDone(false);
    setTextSpeed(30);
    const scene = scenes.find(s => s.id === selectedScene);
    if (scene) {
      const transition = scene.transition || "none";
      if (transition !== "none") {
        setTransitionClass(`vn-transition-${transition}`);
        setTimeout(() => setTransitionClass(""), 800);
      }
    }
  };

  const advanceDialogue = () => {
    const scene = scenes.find(s => s.id === selectedScene);
    if (!scene) return;

    const currentLine = scene.dialogue[playIndex];
    if (currentLine) {
      const speakerColor = characters.find(c => c.name === currentLine.speaker)?.color || "#fff";
      setTextLog(prev => {
        if (prev.length > 0 && prev[prev.length - 1].text === currentLine.text) return prev;
        return [...prev, { speaker: currentLine.speaker, text: currentLine.text, color: speakerColor }];
      });
    }

    if (playIndex < scene.dialogue.length - 1) {
      setPlayIndex(playIndex + 1);
      setTypewriterDone(false);
      setTextSpeed(30);
    } else {
      setIsPlaying(false);
      setIsFullscreen(false);
      setPlayIndex(0);
    }
  };

  const handlePlaytestClick = () => {
    if (!typewriterDone) {
      setTextSpeed(0);
    } else {
      advanceDialogue();
    }
  };

  const currentScene = scenes.find(s => s.id === selectedScene);
  const currentBackground = backgrounds.find(b => b.id === currentScene?.background);
  const currentBackgroundUrl = currentScene?.backgroundUrl || currentBackground?.url || vnBg;
  const currentDialogue = currentScene?.dialogue[playIndex];

  const totalDialogueLines = scenes.reduce((sum, s) => sum + s.dialogue.length, 0);

  if (isCreating) {
    return (
      <Layout>
        <div className="h-screen flex items-center justify-center bg-black">
          <div className="text-center text-white">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-400">Creating visual novel project...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const playtestView = (
    <div 
      ref={playtestRef}
      className={`relative overflow-hidden cursor-pointer ${isFullscreen ? "fixed inset-0 z-50 bg-black" : "h-[70vh]"}`}
      onClick={handlePlaytestClick}
      data-testid="playtest-viewport"
    >
      <div className={`w-full h-full ${transitionClass}`}>
        <img 
          src={currentBackgroundUrl} 
          className="w-full h-full object-cover"
          style={currentScene?.tintColor ? { filter: `sepia(0.2)`, mixBlendMode: "normal" } : undefined}
        />
        {currentScene?.tintColor && (
          <div className="absolute inset-0" style={{ backgroundColor: currentScene.tintColor, opacity: 0.15 }} />
        )}
      </div>
      
      {currentScene?.characters.filter(c => c.visible).map((sceneChar) => {
        const char = characters.find(c => c.id === sceneChar.id);
        const sprite = char?.sprites.find(s => s.expression === sceneChar.expression || s.url);
        if (!sprite?.url) return null;
        
        const positionStyles = {
          left: { left: "10%", transform: "translateX(0)" },
          center: { left: "50%", transform: "translateX(-50%)" },
          right: { right: "10%", transform: "translateX(0)" },
        };
        
        return (
          <div
            key={sceneChar.id}
            className="absolute bottom-0 h-[80%] flex items-end transition-all duration-500"
            style={positionStyles[sceneChar.position]}
          >
            <img src={sprite.url} className="h-full object-contain" />
          </div>
        );
      })}

      {showTextLog && (
        <TextLog log={textLog} onClose={() => setShowTextLog(false)} />
      )}
      
      <div className="absolute bottom-8 left-8 right-8 bg-zinc-900/95 border-2 border-white" style={{ minHeight: isFullscreen ? "160px" : "140px" }}>
        {currentDialogue ? (
          <div className="p-6">
            <div 
              className="font-bold font-display mb-2 uppercase tracking-wider text-sm"
              style={{ color: characters.find(c => c.name === currentDialogue.speaker)?.color || "#fff" }}
            >
              {currentDialogue.speaker}
            </div>
            <p className="font-mono text-sm leading-relaxed">
              <TypewriterText 
                text={currentDialogue.text} 
                speed={textSpeed}
                onComplete={() => setTypewriterDone(true)}
              />
            </p>
            {typewriterDone && currentDialogue.choices && currentDialogue.choices.length > 0 && (
              <div className="mt-4 flex gap-2 flex-wrap">
                {currentDialogue.choices.map((choice, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setSelectedScene(choice.target); setPlayIndex(0); setIsPlaying(true); setTypewriterDone(false); setTextSpeed(30); }}
                    className="px-4 py-2 bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors"
                    data-testid={`button-choice-${i}`}
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            )}
            <div className="absolute bottom-4 right-4 animate-bounce text-zinc-500">▼</div>
          </div>
        ) : (
          <div className="p-6 text-center text-zinc-500">
            <MessageSquare className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Click Playtest to preview your visual novel</p>
          </div>
        )}
      </div>

      <div className="absolute top-4 right-4 flex gap-1 z-20">
        <button
          onClick={(e) => { e.stopPropagation(); setAutoAdvance(!autoAdvance); }}
          className={`px-2 py-1 text-[10px] font-bold uppercase ${autoAdvance ? "bg-green-500 text-black" : "bg-black/70 text-white border border-white/20"}`}
          title="Auto-advance (A)"
          data-testid="button-auto-advance"
        >
          {autoAdvance ? "Auto ON" : "Auto"}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setTextSpeed(0); }}
          className="px-2 py-1 bg-black/70 text-white border border-white/20 text-[10px] font-bold uppercase"
          title="Skip text"
          data-testid="button-skip-text"
        >
          Skip
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setShowTextLog(true); }}
          className="px-2 py-1 bg-black/70 text-white border border-white/20 text-[10px] font-bold uppercase"
          title="Text log (L)"
          data-testid="button-text-log"
        >
          Log
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setIsFullscreen(!isFullscreen); }}
          className="px-2 py-1 bg-black/70 text-white border border-white/20 text-[10px] font-bold uppercase"
          title="Toggle fullscreen"
          data-testid="button-fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setIsPlaying(false); setIsFullscreen(false); }}
          className="px-2 py-1 bg-red-500/80 text-white text-[10px] font-bold uppercase"
          title="Stop (Esc)"
          data-testid="button-stop-playtest"
        >
          Stop
        </button>
      </div>

      <div className="absolute top-4 left-4 bg-black/80 text-white px-3 py-1 text-xs font-mono z-20">
        {playIndex + 1} / {currentScene?.dialogue.length || 0}
      </div>
    </div>
  );

  if (isFullscreen && isPlaying) {
    return playtestView;
  }

  return (
    <Layout>
      <div className="h-screen flex flex-col bg-zinc-950 text-white">
        <style>{`
          .vn-transition-fade { animation: vnFade 0.8s ease-in-out; }
          .vn-transition-dissolve { animation: vnDissolve 1s ease-in-out; }
          .vn-transition-slide-left { animation: vnSlideLeft 0.6s ease-out; }
          .vn-transition-slide-right { animation: vnSlideRight 0.6s ease-out; }
          @keyframes vnFade { from { opacity: 0; } to { opacity: 1; } }
          @keyframes vnDissolve { 0% { opacity: 0; filter: blur(8px); } 100% { opacity: 1; filter: blur(0); } }
          @keyframes vnSlideLeft { from { transform: translateX(100%); } to { transform: translateX(0); } }
          @keyframes vnSlideRight { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        `}</style>

        <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 hover:bg-zinc-800" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-display font-bold text-lg bg-transparent border-none outline-none hover:bg-zinc-800 px-2 py-1"
              data-testid="input-vn-title"
            />
            <span className="text-xs font-mono text-zinc-500">Visual Novel Engine</span>
            <span className="text-[10px] font-mono text-zinc-600 hidden md:block">
              {scenes.length} scenes • {totalDialogueLines} lines • {characters.length} chars
            </span>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-medium flex items-center gap-2"
                data-testid="button-export"
              >
                <Download className="w-4 h-4" /> Export
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 z-50 w-40">
                  <button
                    onClick={() => { handleExportJSON(); setShowExportMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-700 flex items-center gap-2"
                    data-testid="button-export-json"
                  >
                    JSON Project
                  </button>
                  <button
                    onClick={() => { handleExportHTML(); setShowExportMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-700 flex items-center gap-2"
                    data-testid="button-export-html"
                  >
                    Playable HTML
                  </button>
                </div>
              )}
            </div>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              data-testid="button-save"
            >
              <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save"}
            </button>
            <button 
              onClick={startPlaytest}
              className="px-4 py-2 bg-white text-black text-sm font-bold flex items-center gap-2" 
              data-testid="button-playtest"
            >
              <Play className="w-4 h-4" /> Playtest
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-72 border-r border-zinc-800 bg-zinc-900 flex flex-col">
            <div className="border-b border-zinc-800 p-1 flex">
              {(["scenes", "characters", "backgrounds"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-xs font-bold uppercase ${activeTab === tab ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-auto p-2 space-y-2">
              {activeTab === "scenes" && (
                <>
                  {scenes.map((scene, idx) => (
                    <div
                      key={scene.id}
                      onClick={() => {
                        if (isPlaying) {
                          const transition = scene.transition || "none";
                          if (transition !== "none") {
                            setTransitionClass(`vn-transition-${transition}`);
                            setTimeout(() => setTransitionClass(""), 800);
                          }
                        }
                        setSelectedScene(scene.id);
                      }}
                      className={`p-3 border cursor-pointer group ${
                        selectedScene === scene.id 
                          ? "bg-white text-black border-white" 
                          : "bg-zinc-800 border-zinc-700 hover:border-zinc-500"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <input
                          value={scene.name}
                          onChange={(e) => updateScene(scene.id, { name: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                          className={`font-bold text-sm bg-transparent border-none outline-none flex-1 w-0 ${
                            selectedScene === scene.id ? "text-black" : ""
                          }`}
                        />
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                          <button
                            onClick={(e) => { e.stopPropagation(); moveScene(scene.id, "up"); }}
                            disabled={idx === 0}
                            className={`p-0.5 disabled:opacity-30 ${selectedScene === scene.id ? "hover:text-zinc-600" : "hover:text-yellow-400"}`}
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); moveScene(scene.id, "down"); }}
                            disabled={idx === scenes.length - 1}
                            className={`p-0.5 disabled:opacity-30 ${selectedScene === scene.id ? "hover:text-zinc-600" : "hover:text-yellow-400"}`}
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); duplicateScene(scene.id); }}
                            className={`p-0.5 ${selectedScene === scene.id ? "hover:text-zinc-600" : "hover:text-blue-400"}`}
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteScene(scene.id); }}
                            className={`p-0.5 ${selectedScene === scene.id ? "hover:text-red-600" : "hover:text-red-500"}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className={`text-xs mt-1 ${selectedScene === scene.id ? "text-zinc-600" : "text-zinc-500"}`}>
                        {scene.dialogue.length} lines • {scene.characters.length} chars
                      </div>
                      {selectedScene === scene.id && (
                        <div className="mt-2 pt-2 border-t border-zinc-300 space-y-2" onClick={(e) => e.stopPropagation()}>
                          <div>
                            <label className="text-[10px] font-bold uppercase text-zinc-500 block mb-1">Transition</label>
                            <select
                              value={scene.transition || "none"}
                              onChange={(e) => updateScene(scene.id, { transition: e.target.value as TransitionType })}
                              className="w-full p-1 bg-zinc-200 text-black text-xs border-none"
                            >
                              {TRANSITION_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase text-zinc-500 block mb-1">Tint Color</label>
                            <div className="flex gap-1">
                              <input
                                type="color"
                                value={scene.tintColor || "#000000"}
                                onChange={(e) => updateScene(scene.id, { tintColor: e.target.value })}
                                className="w-8 h-6 bg-transparent cursor-pointer"
                              />
                              {scene.tintColor && (
                                <button
                                  onClick={() => updateScene(scene.id, { tintColor: undefined })}
                                  className="text-[10px] text-zinc-400 hover:text-red-400"
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addScene}
                    className="w-full p-3 border border-dashed border-zinc-700 hover:border-white text-sm flex items-center justify-center gap-2"
                    data-testid="button-add-scene"
                  >
                    <Plus className="w-4 h-4" /> Add Scene
                  </button>
                </>
              )}

              {activeTab === "characters" && (
                <>
                  {characters.map((char) => (
                    <div 
                      key={char.id} 
                      className={`p-3 border cursor-pointer group ${
                        selectedCharacter === char.id ? "bg-white text-black border-white" : "bg-zinc-800 border-zinc-700"
                      }`}
                      onClick={() => setSelectedCharacter(char.id)}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={char.color}
                          onChange={(e) => updateCharacter(char.id, { color: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 cursor-pointer bg-transparent border-none"
                        />
                        <input
                          value={char.name}
                          onChange={(e) => updateCharacter(char.id, { name: e.target.value })}
                          className={`font-bold text-sm bg-transparent border-none outline-none flex-1 ${
                            selectedCharacter === char.id ? "text-black" : ""
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteCharacter(char.id); }}
                          className={`opacity-0 group-hover:opacity-100 p-1 ${selectedCharacter === char.id ? "hover:text-red-600" : "hover:text-red-500"}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className={`text-xs mt-2 ${selectedCharacter === char.id ? "text-zinc-600" : "text-zinc-500"}`}>
                        {char.sprites.length} sprite(s)
                      </div>
                      {selectedCharacter === char.id && (
                        <div className="mt-3 pt-3 border-t border-zinc-300 space-y-2">
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); spriteInputRef.current?.click(); }}
                              className="flex-1 p-2 bg-zinc-200 text-xs flex items-center justify-center gap-1"
                            >
                              <Upload className="w-3 h-3" /> Import
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setAiTarget("sprite"); setShowAIGen(true); }}
                              className="flex-1 p-2 bg-zinc-800 text-white text-xs flex items-center justify-center gap-1"
                            >
                              <Wand2 className="w-3 h-3" /> AI Gen
                            </button>
                          </div>
                          <div className="space-y-1">
                            {char.sprites.map((sprite, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-zinc-300 overflow-hidden flex-shrink-0">
                                  {sprite.url && <img src={sprite.url} className="w-full h-full object-cover" />}
                                </div>
                                <input
                                  value={sprite.expression}
                                  onChange={(e) => {
                                    const newSprites = [...char.sprites];
                                    newSprites[i] = { ...sprite, expression: e.target.value };
                                    updateCharacter(char.id, { sprites: newSprites });
                                  }}
                                  className="flex-1 p-1 bg-zinc-200 text-[10px] text-black border-none"
                                  placeholder="Expression label"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateCharacter(char.id, { sprites: char.sprites.filter((_, j) => j !== i) });
                                  }}
                                  className="p-0.5 hover:text-red-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addCharacter}
                    className="w-full p-3 border border-dashed border-zinc-700 hover:border-white text-sm flex items-center justify-center gap-2"
                    data-testid="button-add-character"
                  >
                    <Plus className="w-4 h-4" /> Add Character
                  </button>
                </>
              )}

              {activeTab === "backgrounds" && (
                <>
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => bgInputRef.current?.click()}
                      className="flex-1 p-2 bg-zinc-800 text-xs flex items-center justify-center gap-1 hover:bg-zinc-700"
                    >
                      <Upload className="w-3 h-3" /> Import
                    </button>
                    <button
                      onClick={() => { setAiTarget("background"); setShowAIGen(true); }}
                      className="flex-1 p-2 bg-white text-black text-xs flex items-center justify-center gap-1"
                    >
                      <Wand2 className="w-3 h-3" /> AI Gen
                    </button>
                  </div>
                  {backgrounds.map((bg) => (
                    <div
                      key={bg.id}
                      onClick={() => currentScene && updateScene(currentScene.id, { background: bg.id })}
                      className={`p-2 border cursor-pointer ${
                        currentScene?.background === bg.id
                          ? "border-white"
                          : "border-zinc-700 hover:border-zinc-500"
                      }`}
                    >
                      <div className="aspect-video bg-zinc-800 overflow-hidden mb-1">
                        <img src={bg.url} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-xs font-medium">{bg.name}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div className="relative">
                  {isPlaying ? playtestView : (
                    <div className="h-[70vh] bg-black relative overflow-hidden">
                      <img 
                        src={currentBackgroundUrl} 
                        className="w-full h-full object-cover"
                      />
                      {currentScene?.tintColor && (
                        <div className="absolute inset-0" style={{ backgroundColor: currentScene.tintColor, opacity: 0.15 }} />
                      )}
                      
                      {currentScene?.characters.filter(c => c.visible).map((sceneChar) => {
                        const char = characters.find(c => c.id === sceneChar.id);
                        const sprite = char?.sprites.find(s => s.expression === sceneChar.expression || s.url);
                        if (!sprite?.url) return null;
                        
                        const positionStyles = {
                          left: { left: "10%", transform: "translateX(0)" },
                          center: { left: "50%", transform: "translateX(-50%)" },
                          right: { right: "10%", transform: "translateX(0)" },
                        };
                        
                        return (
                          <div
                            key={sceneChar.id}
                            className="absolute bottom-0 h-[80%] flex items-end"
                            style={positionStyles[sceneChar.position]}
                          >
                            <img src={sprite.url} className="h-full object-contain" />
                          </div>
                        );
                      })}
                      
                      <div className="absolute bottom-8 left-8 right-8 h-36 bg-zinc-900/95 border-2 border-white p-6">
                        <div className="text-center text-zinc-500">
                          <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-sm">Click Playtest to preview your visual novel</p>
                          <p className="text-xs text-zinc-600 mt-1">Space/Enter to advance • L for log • A for auto • Esc to stop</p>
                        </div>
                      </div>

                      {currentScene && (
                        <div className="absolute top-4 left-4 flex gap-2">
                          <div className="flex bg-zinc-800 p-1">
                            <button 
                              onClick={() => setEditMode("dialogue")}
                              className={`px-3 py-1 text-xs ${editMode === "dialogue" ? "bg-white text-black" : "text-white"}`}
                            >
                              Dialogue
                            </button>
                            <button 
                              onClick={() => setEditMode("staging")}
                              className={`px-3 py-1 text-xs ${editMode === "staging" ? "bg-white text-black" : "text-white"}`}
                            >
                              Staging
                            </button>
                          </div>
                        </div>
                      )}

                      {currentScene?.transition && currentScene.transition !== "none" && (
                        <div className="absolute top-4 right-4 bg-black/60 px-2 py-1 text-[10px] font-mono text-zinc-400">
                          {currentScene.transition}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-56 bg-zinc-900 border-zinc-700 text-white">
                <ContextMenuItem onClick={addScene} className="hover:bg-zinc-800 cursor-pointer">
                  <Plus className="w-4 h-4 mr-2" /> Add Scene
                </ContextMenuItem>
                <ContextMenuItem onClick={addCharacter} className="hover:bg-zinc-800 cursor-pointer">
                  <User className="w-4 h-4 mr-2" /> Add Character
                </ContextMenuItem>
                <ContextMenuSeparator className="bg-zinc-700" />
                <ContextMenuItem onClick={() => { setAiTarget("background"); setShowAIGen(true); }} className="hover:bg-zinc-800 cursor-pointer">
                  <Wand2 className="w-4 h-4 mr-2" /> Generate Background
                </ContextMenuItem>
                <ContextMenuItem onClick={() => { setAiTarget("sprite"); setShowAIGen(true); }} className="hover:bg-zinc-800 cursor-pointer">
                  <ImageIcon className="w-4 h-4 mr-2" /> Generate Sprite
                </ContextMenuItem>
                <ContextMenuSeparator className="bg-zinc-700" />
                <ContextMenuItem onClick={() => isPlaying ? setIsPlaying(false) : startPlaytest()} className="hover:bg-zinc-800 cursor-pointer">
                  <Play className="w-4 h-4 mr-2" /> {isPlaying ? "Stop" : "Playtest"}
                </ContextMenuItem>
                {currentScene && (
                  <>
                    <ContextMenuSeparator className="bg-zinc-700" />
                    <ContextMenuItem onClick={() => addDialogue(currentScene.id)} className="hover:bg-zinc-800 cursor-pointer">
                      <MessageSquare className="w-4 h-4 mr-2" /> Add Dialogue
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => duplicateScene(currentScene.id)} className="hover:bg-zinc-800 cursor-pointer">
                      <Copy className="w-4 h-4 mr-2" /> Duplicate Scene
                    </ContextMenuItem>
                  </>
                )}
              </ContextMenuContent>
            </ContextMenu>

            <div className="flex-1 border-t border-zinc-800 bg-zinc-900 flex flex-col overflow-hidden">
              <div className="border-b border-zinc-800 p-2 bg-zinc-800 flex items-center justify-between">
                <div className="text-xs font-mono text-zinc-400">
                  {currentScene?.name || "No scene selected"}
                </div>
                {currentScene && editMode === "dialogue" && (
                  <button
                    onClick={() => addDialogue(currentScene.id)}
                    className="px-3 py-1 bg-white text-black text-xs font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Line
                  </button>
                )}
                {currentScene && editMode === "staging" && (
                  <div className="flex gap-2">
                    {characters.map(char => (
                      <button
                        key={char.id}
                        onClick={() => addCharacterToScene(currentScene.id, char.id, "center")}
                        className="px-2 py-1 bg-zinc-700 text-xs flex items-center gap-1"
                        style={{ borderLeft: `3px solid ${char.color}` }}
                      >
                        <Plus className="w-3 h-3" /> {char.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex-1 p-4 overflow-auto space-y-2">
                {editMode === "dialogue" && currentScene?.dialogue.map((line, index) => (
                  <div key={index} className={`flex gap-4 p-2 hover:bg-zinc-800 group ${playIndex === index && isPlaying ? "bg-zinc-700" : ""}`}>
                    <span className="text-zinc-600 w-8 text-right text-sm">{index + 1}</span>
                    <select
                      value={line.speaker}
                      onChange={(e) => updateDialogue(currentScene.id, index, { speaker: e.target.value })}
                      className="w-32 p-1 border border-zinc-700 bg-zinc-800 text-sm"
                    >
                      <option value="Narrator">Narrator</option>
                      {characters.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    <input
                      value={line.text}
                      onChange={(e) => updateDialogue(currentScene.id, index, { text: e.target.value })}
                      className="flex-1 p-1 border border-zinc-700 bg-zinc-800 text-sm font-mono"
                      placeholder="Enter dialogue..."
                    />
                    <button
                      onClick={() => moveDialogue(currentScene.id, index, "up")}
                      disabled={index === 0}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-yellow-400 disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveDialogue(currentScene.id, index, "down")}
                      disabled={index === currentScene.dialogue.length - 1}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-yellow-400 disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => addChoice(currentScene.id, index)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-blue-400"
                      title="Add branching choice"
                    >
                      <GitBranch className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteDialogue(currentScene.id, index)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {editMode === "dialogue" && currentScene?.dialogue.map((line, index) => (
                  line.choices && line.choices.length > 0 ? (
                    <div key={`choices-${index}`} className="ml-12 pl-4 border-l-2 border-blue-500/30 space-y-1">
                      <div className="text-[10px] font-bold uppercase text-blue-400 mb-1">Choices at line {index + 1}</div>
                      {line.choices.map((choice, ci) => (
                        <div key={ci} className="flex gap-2 items-center">
                          <input
                            value={choice.label}
                            onChange={(e) => {
                              const newChoices = [...(line.choices || [])];
                              newChoices[ci] = { ...choice, label: e.target.value };
                              updateDialogue(currentScene.id, index, { choices: newChoices });
                            }}
                            className="flex-1 p-1 border border-zinc-700 bg-zinc-800 text-xs"
                            placeholder="Choice text"
                          />
                          <select
                            value={choice.target}
                            onChange={(e) => {
                              const newChoices = [...(line.choices || [])];
                              newChoices[ci] = { ...choice, target: e.target.value };
                              updateDialogue(currentScene.id, index, { choices: newChoices });
                            }}
                            className="w-32 p-1 border border-zinc-700 bg-zinc-800 text-xs"
                          >
                            {scenes.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              const newChoices = (line.choices || []).filter((_, j) => j !== ci);
                              updateDialogue(currentScene.id, index, { choices: newChoices.length > 0 ? newChoices : undefined });
                            }}
                            className="p-1 hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null
                ))}

                {editMode === "staging" && currentScene && (
                  <div className="space-y-2">
                    {currentScene.characters.map(sceneChar => {
                      const char = characters.find(c => c.id === sceneChar.id);
                      const availableSprites = char?.sprites.filter(s => s.url) || [];
                      return (
                        <div key={sceneChar.id} className="p-3 bg-zinc-800 border border-zinc-700 space-y-3">
                          <div className="flex items-center gap-4">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: char?.color }} />
                            <span className="font-medium text-sm flex-1">{char?.name}</span>
                            <select
                              value={sceneChar.position}
                              onChange={(e) => {
                                updateScene(currentScene.id, {
                                  characters: currentScene.characters.map(c => 
                                    c.id === sceneChar.id ? { ...c, position: e.target.value as any } : c
                                  )
                                });
                              }}
                              className="p-1 bg-zinc-700 border border-zinc-600 text-sm"
                            >
                              <option value="left">Left</option>
                              <option value="center">Center</option>
                              <option value="right">Right</option>
                            </select>
                            <select
                              value={sceneChar.expression}
                              onChange={(e) => {
                                updateScene(currentScene.id, {
                                  characters: currentScene.characters.map(c =>
                                    c.id === sceneChar.id ? { ...c, expression: e.target.value } : c
                                  )
                                });
                              }}
                              className="p-1 bg-zinc-700 border border-zinc-600 text-xs"
                            >
                              {char?.sprites.map((s, i) => (
                                <option key={i} value={s.expression}>{s.expression}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => {
                                updateScene(currentScene.id, {
                                  characters: currentScene.characters.map(c =>
                                    c.id === sceneChar.id ? { ...c, visible: !c.visible } : c
                                  )
                                });
                              }}
                              className={`p-1 ${sceneChar.visible ? "text-white" : "text-zinc-500"}`}
                            >
                              {sceneChar.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => removeCharacterFromScene(currentScene.id, sceneChar.id)}
                              className="p-1 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          {availableSprites.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto">
                              {availableSprites.map((sprite, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => {
                                    updateScene(currentScene.id, {
                                      characters: currentScene.characters.map(c =>
                                        c.id === sceneChar.id ? { ...c, expression: sprite.expression } : c
                                      )
                                    });
                                  }}
                                  className={`flex-shrink-0 border-2 cursor-pointer overflow-hidden ${
                                    sceneChar.expression === sprite.expression ? "border-white" : "border-zinc-600 hover:border-zinc-400"
                                  }`}
                                >
                                  <div className="w-16 h-16">
                                    <img src={sprite.url} className="w-full h-full object-cover" />
                                  </div>
                                  <div className="text-[8px] text-center py-0.5 bg-zinc-700 truncate px-1">
                                    {sprite.expression}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {availableSprites.length === 0 && (
                            <p className="text-xs text-zinc-500">No sprites imported. Add sprites in Characters tab.</p>
                          )}
                        </div>
                      );
                    })}
                    {currentScene.characters.length === 0 && (
                      <div className="text-center py-8 text-zinc-500">
                        <User className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">No characters in this scene. Add them above.</p>
                      </div>
                    )}
                  </div>
                )}

                {editMode === "dialogue" && currentScene && currentScene.dialogue.length === 0 && (
                  <div className="text-center py-8 text-zinc-500">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">No dialogue yet. Click "Add Line" to start.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={handleBackgroundUpload} />
        <input ref={spriteInputRef} type="file" accept="image/*" className="hidden" onChange={handleSpriteUpload} />

        {showAIGen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-zinc-700 p-6 w-[500px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Wand2 className="w-5 h-5" /> AI Generate {aiTarget === "background" ? "Background" : "Sprite"}
                </h3>
                <button onClick={() => setShowAIGen(false)} className="p-2 hover:bg-zinc-800">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <AIGenerator type="vn" onImageGenerated={handleAIGenerated} />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
