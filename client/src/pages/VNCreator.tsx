import { Layout } from "@/components/layout/Layout";
import { Play, Plus, Settings, ArrowLeft, Save, Trash2, Image as ImageIcon, MessageSquare, GitBranch, User, Mountain } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import vnBg from "@assets/generated_images/visual_novel_background.png";
import { useProject, useUpdateProject, useCreateProject } from "@/hooks/useProjects";
import { toast } from "sonner";

interface VNScene {
  id: string;
  name: string;
  background: string;
  characters: { id: string; position: "left" | "center" | "right"; expression: string }[];
  dialogue: { speaker: string; text: string; choices?: { label: string; target: string }[] }[];
}

interface VNCharacter {
  id: string;
  name: string;
  color: string;
  sprites: { expression: string; url: string }[];
}

const defaultBackgrounds = [
  { id: "classroom", name: "Classroom", url: vnBg },
  { id: "hallway", name: "Hallway", url: vnBg },
  { id: "rooftop", name: "Rooftop", url: vnBg },
  { id: "park", name: "Park", url: vnBg },
  { id: "night_city", name: "Night City", url: vnBg },
];

export default function VNCreator() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const projectId = searchParams.get('id');
  
  const { data: project } = useProject(projectId || '');
  const updateProject = useUpdateProject();
  const createProject = useCreateProject();

  const [title, setTitle] = useState("Untitled Visual Novel");
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"scenes" | "characters" | "dialogue">("scenes");
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playIndex, setPlayIndex] = useState(0);

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

  useEffect(() => {
    if (project) {
      setTitle(project.title);
      const data = project.data as any;
      if (data?.scenes) setScenes(data.scenes);
      if (data?.characters) setCharacters(data.characters);
    }
  }, [project]);

  useEffect(() => {
    if (scenes.length > 0 && !selectedScene) {
      setSelectedScene(scenes[0].id);
    }
  }, [scenes, selectedScene]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (projectId) {
        await updateProject.mutateAsync({
          id: projectId,
          data: { title, data: { scenes, characters } },
        });
      } else {
        await createProject.mutateAsync({
          title,
          type: "vn",
          status: "draft",
          data: { scenes, characters },
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
      background: "classroom",
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
      color: "#888888",
      sprites: [{ expression: "neutral", url: "" }],
    };
    setCharacters([...characters, newChar]);
    toast.success("Character added");
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

  const updateDialogue = (sceneId: string, index: number, updates: Partial<{ speaker: string; text: string }>) => {
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
      updateScene(sceneId, {
        dialogue: scene.dialogue.filter((_, i) => i !== index),
      });
    }
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
  const currentBackground = defaultBackgrounds.find(b => b.id === currentScene?.background);
  const currentDialogue = currentScene?.dialogue[playIndex];

  return (
    <Layout>
      <div className="h-screen flex flex-col">
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 hover:bg-muted border border-transparent hover:border-border transition-colors" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-display font-bold text-lg bg-transparent border-none outline-none hover:bg-muted px-2 py-1"
              data-testid="input-vn-title"
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-secondary hover:bg-border border border-border text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              data-testid="button-save"
            >
              <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save"}
            </button>
            <button 
              onClick={startPlaytest}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-hard-sm" 
              data-testid="button-playtest"
            >
              <Play className="w-4 h-4" /> Playtest
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-72 border-r border-border bg-secondary/10 flex flex-col">
            <div className="border-b border-border p-2 flex gap-1">
              <button
                onClick={() => setActiveTab("scenes")}
                className={`flex-1 py-2 text-xs font-medium ${activeTab === "scenes" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                Scenes
              </button>
              <button
                onClick={() => setActiveTab("characters")}
                className={`flex-1 py-2 text-xs font-medium ${activeTab === "characters" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                Characters
              </button>
            </div>

            <div className="flex-1 overflow-auto p-2 space-y-2">
              {activeTab === "scenes" && (
                <>
                  {scenes.map((scene, index) => (
                    <div
                      key={scene.id}
                      onClick={() => setSelectedScene(scene.id)}
                      className={`p-3 border cursor-pointer group ${
                        selectedScene === scene.id 
                          ? "bg-primary/10 border-primary" 
                          : "bg-background border-border hover:border-primary"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{scene.name}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteScene(scene.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {scene.dialogue.length} lines
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={addScene}
                    className="w-full p-3 border border-dashed border-border hover:border-primary text-sm flex items-center justify-center gap-2"
                    data-testid="button-add-scene"
                  >
                    <Plus className="w-4 h-4" /> Add Scene
                  </button>
                </>
              )}

              {activeTab === "characters" && (
                <>
                  {characters.map((char) => (
                    <div key={char.id} className="p-3 bg-background border border-border">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: char.color }}
                        />
                        <input
                          value={char.name}
                          onChange={(e) => setCharacters(characters.map(c => 
                            c.id === char.id ? { ...c, name: e.target.value } : c
                          ))}
                          className="font-bold text-sm bg-transparent border-none outline-none flex-1"
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {char.sprites.length} sprite(s)
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={addCharacter}
                    className="w-full p-3 border border-dashed border-border hover:border-primary text-sm flex items-center justify-center gap-2"
                    data-testid="button-add-character"
                  >
                    <Plus className="w-4 h-4" /> Add Character
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="h-[60%] bg-black relative overflow-hidden" onClick={isPlaying ? advanceDialogue : undefined}>
              <img src={currentBackground?.url || vnBg} className="w-full h-full object-cover opacity-50" />
              
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[80%] w-[300px] bg-gradient-to-t from-black to-transparent opacity-50 border-b border-white"></div>
              
              <div className="absolute bottom-8 left-8 right-8 h-32 bg-background/90 border border-white p-6 shadow-hard">
                {isPlaying && currentDialogue ? (
                  <>
                    <div 
                      className="font-bold font-display mb-2 uppercase tracking-wider"
                      style={{ color: characters.find(c => c.name === currentDialogue.speaker)?.color || "#fff" }}
                    >
                      {currentDialogue.speaker}
                    </div>
                    <p className="font-mono text-sm">{currentDialogue.text}</p>
                    <div className="absolute bottom-4 right-4 animate-bounce text-muted-foreground">▼</div>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Select a scene and click Playtest to preview</p>
                  </div>
                )}
              </div>

              {isPlaying && (
                <div className="absolute top-4 right-4 bg-black/80 text-white px-3 py-1 text-xs font-mono">
                  {playIndex + 1} / {currentScene?.dialogue.length || 0}
                </div>
              )}
            </div>

            <div className="flex-1 border-t border-border bg-background flex flex-col overflow-hidden">
              <div className="border-b border-border p-2 bg-secondary/30 flex items-center justify-between">
                <div className="flex gap-2 text-xs font-mono">
                  <button className="px-3 py-1 bg-primary text-primary-foreground">Dialogue</button>
                  <button className="px-3 py-1 hover:bg-muted">Backgrounds</button>
                  <button className="px-3 py-1 hover:bg-muted">Sprites</button>
                </div>
                {currentScene && (
                  <button
                    onClick={() => addDialogue(currentScene.id)}
                    className="px-3 py-1 bg-secondary border border-border text-xs flex items-center gap-1 hover:bg-muted"
                  >
                    <Plus className="w-3 h-3" /> Add Line
                  </button>
                )}
              </div>
              <div className="flex-1 p-4 overflow-auto space-y-2">
                {currentScene?.dialogue.map((line, index) => (
                  <div key={index} className={`flex gap-4 p-2 hover:bg-secondary/30 group ${playIndex === index && isPlaying ? "bg-primary/10" : ""}`}>
                    <span className="text-muted-foreground w-8 text-right text-sm">{index + 1}</span>
                    <select
                      value={line.speaker}
                      onChange={(e) => updateDialogue(currentScene.id, index, { speaker: e.target.value })}
                      className="w-32 p-1 border border-border bg-background text-sm"
                    >
                      <option value="Narrator">Narrator</option>
                      {characters.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    <input
                      value={line.text}
                      onChange={(e) => updateDialogue(currentScene.id, index, { text: e.target.value })}
                      className="flex-1 p-1 border border-border bg-background text-sm font-mono"
                      placeholder="Enter dialogue..."
                    />
                    <button
                      onClick={() => deleteDialogue(currentScene.id, index)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {currentScene && currentScene.dialogue.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">No dialogue yet. Click "Add Line" to start.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
