import { Layout } from "@/components/layout/Layout";
import { 
  Play, Plus, Settings, ArrowLeft, Save, Trash2, Image as ImageIcon, 
  MessageSquare, GitBranch, User, Mountain, Upload, Wand2, X, Move,
  ChevronLeft, ChevronRight, Copy, Eye, EyeOff
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import vnBg from "@assets/generated_images/visual_novel_background.png";
import { AIGenerator } from "@/components/tools/AIGenerator";
import { useProject, useUpdateProject, useCreateProject } from "@/hooks/useProjects";
import { useAssetLibrary } from "@/contexts/AssetLibraryContext";
import { toast } from "sonner";

interface VNScene {
  id: string;
  name: string;
  background: string;
  backgroundUrl?: string;
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

export default function VNCreator() {
  const [location, navigate] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const projectId = searchParams.get('id');
  
  const { data: project } = useProject(projectId || '');
  const updateProject = useUpdateProject();
  const createProject = useCreateProject();
  const { importFromFile } = useAssetLibrary();

  const [title, setTitle] = useState("Untitled Visual Novel");
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<"scenes" | "characters" | "backgrounds">("scenes");
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playIndex, setPlayIndex] = useState(0);
  const [showAIGen, setShowAIGen] = useState(false);
  const [aiTarget, setAiTarget] = useState<"background" | "sprite">("background");
  const [editMode, setEditMode] = useState<"dialogue" | "staging">("dialogue");

  const bgInputRef = useRef<HTMLInputElement>(null);
  const spriteInputRef = useRef<HTMLInputElement>(null);

  const [scenes, setScenes] = useState<VNScene[]>([
    {
      id: "scene_1",
      name: "Scene 1: Intro",
      background: "classroom",
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
    const creatingFlag = sessionStorage.getItem('vn_creating');
    if (!projectId && !creatingFlag && !createProject.isPending) {
      sessionStorage.setItem('vn_creating', 'true');
      setIsCreating(true);
      createProject.mutateAsync({
        title: "Untitled Visual Novel",
        type: "vn",
        status: "draft",
        data: { scenes, characters, backgrounds },
      }).then((newProject) => {
        sessionStorage.removeItem('vn_creating');
        setIsCreating(false);
        navigate(`/creator/vn?id=${newProject.id}`, { replace: true });
      }).catch(() => {
        toast.error("Failed to create project");
        sessionStorage.removeItem('vn_creating');
        setIsCreating(false);
      });
    } else if (projectId) {
      sessionStorage.removeItem('vn_creating');
      setIsCreating(false);
    }
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (projectId) {
        await updateProject.mutateAsync({
          id: projectId,
          data: { title, data: { scenes, characters, backgrounds } },
        });
      }
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
      characters: [],
      dialogue: [],
    };
    setScenes([...scenes, newScene]);
    setSelectedScene(newScene.id);
    toast.success("Scene added");
  };

  const deleteScene = (id: string) => {
    if (scenes.length <= 1) {
      toast.error("Cannot delete the last scene");
      return;
    }
    setScenes(scenes.filter(s => s.id !== id));
    if (selectedScene === id) {
      setSelectedScene(scenes[0].id);
    }
    toast.success("Scene deleted");
  };

  const addCharacter = () => {
    const newChar: VNCharacter = {
      id: `char_${Date.now()}`,
      name: "New Character",
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
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
  };

  const advanceDialogue = () => {
    const scene = scenes.find(s => s.id === selectedScene);
    if (scene && playIndex < scene.dialogue.length - 1) {
      setPlayIndex(playIndex + 1);
    } else {
      setIsPlaying(false);
      setPlayIndex(0);
    }
  };

  const currentScene = scenes.find(s => s.id === selectedScene);
  const currentBackground = backgrounds.find(b => b.id === currentScene?.background);
  const currentDialogue = currentScene?.dialogue[playIndex];

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

  return (
    <Layout>
      <div className="h-screen flex flex-col bg-zinc-950 text-white">
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
          </div>
          <div className="flex gap-2">
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
                  {scenes.map((scene) => (
                    <div
                      key={scene.id}
                      onClick={() => setSelectedScene(scene.id)}
                      className={`p-3 border cursor-pointer group ${
                        selectedScene === scene.id 
                          ? "bg-white text-black border-white" 
                          : "bg-zinc-800 border-zinc-700 hover:border-zinc-500"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{scene.name}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteScene(scene.id); }}
                          className={`opacity-0 group-hover:opacity-100 p-1 ${selectedScene === scene.id ? "hover:text-red-600" : "hover:text-red-500"}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className={`text-xs mt-1 ${selectedScene === scene.id ? "text-zinc-600" : "text-zinc-500"}`}>
                        {scene.dialogue.length} lines • {scene.characters.length} chars
                      </div>
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
                        <div className="w-4 h-4 rounded-full border border-current" style={{ backgroundColor: char.color }} />
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
                          <div className="grid grid-cols-3 gap-1">
                            {char.sprites.filter(s => s.url).map((sprite, i) => (
                              <div key={i} className="aspect-square bg-zinc-300 overflow-hidden">
                                <img src={sprite.url} className="w-full h-full object-cover" />
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
            <div 
              className="h-[70vh] bg-black relative overflow-hidden cursor-pointer" 
              onClick={isPlaying ? advanceDialogue : undefined}
            >
              <img 
                src={currentBackground?.url || vnBg} 
                className="w-full h-full object-cover"
              />
              
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
                {isPlaying && currentDialogue ? (
                  <>
                    <div 
                      className="font-bold font-display mb-2 uppercase tracking-wider text-sm"
                      style={{ color: characters.find(c => c.name === currentDialogue.speaker)?.color || "#fff" }}
                    >
                      {currentDialogue.speaker}
                    </div>
                    <p className="font-mono text-sm leading-relaxed">{currentDialogue.text}</p>
                    {currentDialogue.choices && currentDialogue.choices.length > 0 && (
                      <div className="mt-4 flex gap-2">
                        {currentDialogue.choices.map((choice, i) => (
                          <button
                            key={i}
                            onClick={(e) => { e.stopPropagation(); setSelectedScene(choice.target); setPlayIndex(0); }}
                            className="px-4 py-2 bg-white text-black text-sm font-medium hover:bg-zinc-200"
                          >
                            {choice.label}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="absolute bottom-4 right-4 animate-bounce text-zinc-500">▼</div>
                  </>
                ) : (
                  <div className="text-center text-zinc-500">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Click Playtest to preview your visual novel</p>
                  </div>
                )}
              </div>

              {isPlaying && (
                <div className="absolute top-4 right-4 bg-black/80 text-white px-3 py-1 text-xs font-mono">
                  {playIndex + 1} / {currentScene?.dialogue.length || 0}
                </div>
              )}

              {!isPlaying && currentScene && (
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
            </div>

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
                                  className={`w-16 h-16 flex-shrink-0 border-2 cursor-pointer overflow-hidden ${
                                    sceneChar.expression === sprite.expression ? "border-white" : "border-zinc-600 hover:border-zinc-400"
                                  }`}
                                >
                                  <img src={sprite.url} className="w-full h-full object-cover" />
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
