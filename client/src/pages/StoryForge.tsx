import { Layout } from "@/components/layout/Layout";
import { useState } from "react";
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Sparkles, 
  Download, 
  Copy, 
  ArrowRight,
  User,
  RefreshCw,
  ArrowLeft,
  Save
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

interface Character {
  id: string;
  name: string;
  role: string;
  appearance: string;
  personality: string;
  flaws: string;
  backstory: string;
  skills: string;
  motivation: string;
}

const roleOptions = ["Protagonist", "Antagonist", "Sidekick", "Mentor", "Love Interest", "Comic Relief", "Supporting"];
const genreOptions = ["Fantasy", "Sci-Fi", "Horror", "Mystery", "Romance", "Action/Adventure", "Thriller", "Comedy", "Drama", "Superhero", "Post-Apocalyptic", "Slice of Life"];
const timePeriods = ["Ancient", "Medieval", "Renaissance", "Industrial", "Modern Day", "Near Future", "Far Future", "Timeless/Fantasy"];
const conflictTypes = ["Person vs Person", "Person vs Self", "Person vs Society", "Person vs Nature", "Person vs Technology", "Person vs Supernatural", "Person vs Fate"];
const storyLengths = ["Short (1-3 pages)", "Medium (5-10 pages)", "Long (15-30 pages)", "Extended (50+ pages)"];
const storyFormats = ["Prose", "Comic Script", "Screenplay", "Game Narrative"];

export default function StoryForge() {
  const [, navigate] = useLocation();
  const [characters, setCharacters] = useState<Character[]>([
    { id: "1", name: "", role: "Protagonist", appearance: "", personality: "", flaws: "", backstory: "", skills: "", motivation: "" }
  ]);
  
  const [storyConfig, setStoryConfig] = useState({
    title: "",
    genre: "Fantasy",
    timePeriod: "Modern Day",
    setting: "",
    tone: "",
    audience: "",
    themes: "",
    conflict: "Person vs Person",
    plotSummary: "",
    length: "Medium (5-10 pages)",
    format: "Comic Script",
  });

  const [generatedStory, setGeneratedStory] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const addCharacter = () => {
    setCharacters([...characters, {
      id: Date.now().toString(),
      name: "",
      role: "Supporting",
      appearance: "",
      personality: "",
      flaws: "",
      backstory: "",
      skills: "",
      motivation: "",
    }]);
  };

  const removeCharacter = (id: string) => {
    if (characters.length > 1) {
      setCharacters(characters.filter(c => c.id !== id));
    }
  };

  const updateCharacter = (id: string, field: keyof Character, value: string) => {
    setCharacters(characters.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const updateStoryConfig = (field: string, value: string) => {
    setStoryConfig({ ...storyConfig, [field]: value });
  };

  const forgeStory = async () => {
    if (!storyConfig.title || !storyConfig.plotSummary) {
      toast.error("Please fill in at least the title and plot summary");
      return;
    }

    setIsGenerating(true);
    await new Promise(r => setTimeout(r, 2000));

    const characterDescriptions = characters
      .filter(c => c.name)
      .map(c => `${c.name} (${c.role}): ${c.personality}. ${c.motivation}`)
      .join("\n");

    const story = `# ${storyConfig.title}

## Story Overview
**Genre:** ${storyConfig.genre}
**Time Period:** ${storyConfig.timePeriod}
**Setting:** ${storyConfig.setting || "A mysterious world waiting to be explored"}
**Tone:** ${storyConfig.tone || "Dramatic with moments of levity"}
**Central Conflict:** ${storyConfig.conflict}

## Characters
${characterDescriptions || "Characters to be developed"}

## Synopsis
${storyConfig.plotSummary}

---

## Chapter 1: The Beginning

The story opens in ${storyConfig.setting || "an unknown location"}, where ${characters[0]?.name || "our protagonist"} finds themselves facing an unexpected challenge. The ${storyConfig.tone || "tense"} atmosphere sets the stage for what's to come.

${characters[0]?.name || "The protagonist"} reflects on their past: ${characters[0]?.backstory || "a history shrouded in mystery"}. Their goal is clear: ${characters[0]?.motivation || "to overcome the odds and find their purpose"}.

As the sun sets on this first day, the true nature of the ${storyConfig.conflict.toLowerCase()} conflict begins to emerge...

## Chapter 2: Rising Action

The stakes escalate as ${characters[0]?.name || "our hero"} encounters ${characters[1]?.name || "an unexpected ally"}. Together, they must navigate the challenges of ${storyConfig.setting || "this strange new world"}.

${characters[1]?.name || "The ally"}'s ${characters[1]?.skills || "unique abilities"} prove invaluable, but their ${characters[1]?.flaws || "hidden weaknesses"} threaten to derail the mission.

## Chapter 3: The Climax

Everything comes to a head as the central conflict reaches its peak. ${characters[0]?.name || "The protagonist"} must use all their ${characters[0]?.skills || "skills and determination"} to overcome the final obstacle.

The themes of ${storyConfig.themes || "courage and perseverance"} resonate throughout this pivotal moment.

## Epilogue

The dust settles, and our characters emerge changed. ${storyConfig.title} concludes with a glimpse of what the future holds...

---
*Generated by Story Forge - PSCoMiXX Creator*
*Format: ${storyConfig.format} | Length: ${storyConfig.length}*`;

    setGeneratedStory(story);
    setIsGenerating(false);
    toast.success("Story forged successfully!");
  };

  const downloadStory = (format: "txt" | "md") => {
    const blob = new Blob([generatedStory], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${storyConfig.title || "story"}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded as .${format}`);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedStory);
    toast.success("Copied to clipboard!");
  };

  const sendToCYOA = () => {
    if (!generatedStory) {
      toast.error("Please generate a story first");
      return;
    }
    localStorage.setItem("cyoa_story", generatedStory);
    localStorage.setItem("cyoa_auto_branch", "true");
    localStorage.setItem("cyoa_branch_count", String(Math.max(5, Math.ceil(generatedStory.length / 500))));
    navigate("/tools/cyoa");
    toast.success("Sent to CYOA with auto-branching enabled!");
  };

  const sendToVN = () => {
    if (!generatedStory) {
      toast.error("Please generate a story first");
      return;
    }
    const vnData = {
      scenes: generatedStory.split(/##\s/).filter(s => s.trim()).slice(1).map((section, i) => ({
        id: `scene_${i}`,
        name: section.split('\n')[0]?.trim() || `Scene ${i + 1}`,
        background: "classroom",
        characters: characters.filter(c => c.name).map(c => ({
          id: c.id,
          position: i % 3 === 0 ? "left" : i % 3 === 1 ? "center" : "right" as const,
          expression: "neutral",
          visible: true
        })),
        dialogue: section.split('\n').filter(l => l.trim()).slice(1).map(line => ({
          speaker: characters[0]?.name || "Narrator",
          text: line.trim()
        }))
      })),
      characters: characters.filter(c => c.name).map(c => ({
        id: c.id,
        name: c.name,
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
        sprites: [{ expression: "neutral", url: "" }]
      }))
    };
    localStorage.setItem("vn_import_data", JSON.stringify(vnData));
    navigate("/creator/vn");
    toast.success("Sent to Visual Novel Creator!");
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 hover:bg-muted border border-transparent hover:border-border transition-colors" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              <h1 className="font-display font-bold text-lg">Story Forge</h1>
            </div>
            <span className="text-xs font-mono text-muted-foreground">AI-Powered Narrative Builder</span>
          </div>
        </header>

        <div className="flex">
          <div className="flex-1 p-6 space-y-8 max-w-4xl overflow-auto">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-lg flex items-center gap-2">
                  <User className="w-5 h-5" /> Character Builder
                </h2>
                <button
                  onClick={addCharacter}
                  className="px-3 py-1 bg-secondary border border-border text-sm font-medium hover:bg-muted flex items-center gap-1"
                  data-testid="button-add-character"
                >
                  <Plus className="w-4 h-4" /> Add Character
                </button>
              </div>

              <div className="space-y-4">
                {characters.map((char, index) => (
                  <div key={char.id} className="p-4 border border-border bg-card space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm">Character {index + 1}</h3>
                      {characters.length > 1 && (
                        <button
                          onClick={() => removeCharacter(char.id)}
                          className="p-1 hover:text-red-500"
                          data-testid={`delete-char-${index}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase">Name</label>
                        <input
                          value={char.name}
                          onChange={(e) => updateCharacter(char.id, "name", e.target.value)}
                          className="w-full p-2 border border-border bg-background text-sm"
                          placeholder="Character name"
                          data-testid={`input-char-name-${index}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase">Role</label>
                        <select
                          value={char.role}
                          onChange={(e) => updateCharacter(char.id, "role", e.target.value)}
                          className="w-full p-2 border border-border bg-background text-sm"
                          data-testid={`select-char-role-${index}`}
                        >
                          {roleOptions.map(role => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-xs font-bold uppercase">Physical Appearance</label>
                        <input
                          value={char.appearance}
                          onChange={(e) => updateCharacter(char.id, "appearance", e.target.value)}
                          className="w-full p-2 border border-border bg-background text-sm"
                          placeholder="Height, build, hair, eyes, distinctive features..."
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase">Personality</label>
                        <input
                          value={char.personality}
                          onChange={(e) => updateCharacter(char.id, "personality", e.target.value)}
                          className="w-full p-2 border border-border bg-background text-sm"
                          placeholder="Core traits..."
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase">Flaws / Weaknesses</label>
                        <input
                          value={char.flaws}
                          onChange={(e) => updateCharacter(char.id, "flaws", e.target.value)}
                          className="w-full p-2 border border-border bg-background text-sm"
                          placeholder="Character flaws..."
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-xs font-bold uppercase">Backstory</label>
                        <textarea
                          value={char.backstory}
                          onChange={(e) => updateCharacter(char.id, "backstory", e.target.value)}
                          className="w-full p-2 border border-border bg-background text-sm h-20 resize-none"
                          placeholder="Character's history and background..."
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase">Skills / Abilities</label>
                        <input
                          value={char.skills}
                          onChange={(e) => updateCharacter(char.id, "skills", e.target.value)}
                          className="w-full p-2 border border-border bg-background text-sm"
                          placeholder="What they're good at..."
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase">Motivation / Goal</label>
                        <input
                          value={char.motivation}
                          onChange={(e) => updateCharacter(char.id, "motivation", e.target.value)}
                          className="w-full p-2 border border-border bg-background text-sm"
                          placeholder="What drives them..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="font-display font-bold text-lg">Story Setup</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold uppercase">Story Title</label>
                  <input
                    value={storyConfig.title}
                    onChange={(e) => updateStoryConfig("title", e.target.value)}
                    className="w-full p-3 border border-border bg-background text-sm font-display"
                    placeholder="Enter your story title..."
                    data-testid="input-story-title"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase">Genre</label>
                  <select
                    value={storyConfig.genre}
                    onChange={(e) => updateStoryConfig("genre", e.target.value)}
                    className="w-full p-2 border border-border bg-background text-sm"
                    data-testid="select-genre"
                  >
                    {genreOptions.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase">Time Period</label>
                  <select
                    value={storyConfig.timePeriod}
                    onChange={(e) => updateStoryConfig("timePeriod", e.target.value)}
                    className="w-full p-2 border border-border bg-background text-sm"
                  >
                    {timePeriods.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold uppercase">Setting / World</label>
                  <input
                    value={storyConfig.setting}
                    onChange={(e) => updateStoryConfig("setting", e.target.value)}
                    className="w-full p-2 border border-border bg-background text-sm"
                    placeholder="Describe the world or location..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase">Tone / Mood</label>
                  <input
                    value={storyConfig.tone}
                    onChange={(e) => updateStoryConfig("tone", e.target.value)}
                    className="w-full p-2 border border-border bg-background text-sm"
                    placeholder="Dark, hopeful, comedic..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase">Target Audience</label>
                  <input
                    value={storyConfig.audience}
                    onChange={(e) => updateStoryConfig("audience", e.target.value)}
                    className="w-full p-2 border border-border bg-background text-sm"
                    placeholder="Young adult, mature..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase">Core Themes</label>
                  <input
                    value={storyConfig.themes}
                    onChange={(e) => updateStoryConfig("themes", e.target.value)}
                    className="w-full p-2 border border-border bg-background text-sm"
                    placeholder="Redemption, love, revenge..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase">Central Conflict</label>
                  <select
                    value={storyConfig.conflict}
                    onChange={(e) => updateStoryConfig("conflict", e.target.value)}
                    className="w-full p-2 border border-border bg-background text-sm"
                  >
                    {conflictTypes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold uppercase">Plot Summary / Premise</label>
                  <textarea
                    value={storyConfig.plotSummary}
                    onChange={(e) => updateStoryConfig("plotSummary", e.target.value)}
                    className="w-full p-3 border border-border bg-background text-sm h-32 resize-none"
                    placeholder="Describe the main plot of your story..."
                    data-testid="input-plot-summary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase">Story Length</label>
                  <select
                    value={storyConfig.length}
                    onChange={(e) => updateStoryConfig("length", e.target.value)}
                    className="w-full p-2 border border-border bg-background text-sm"
                  >
                    {storyLengths.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase">Story Format</label>
                  <select
                    value={storyConfig.format}
                    onChange={(e) => updateStoryConfig("format", e.target.value)}
                    className="w-full p-2 border border-border bg-background text-sm"
                  >
                    {storyFormats.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
            </section>

            <button
              onClick={forgeStory}
              disabled={isGenerating}
              className="w-full py-4 bg-primary text-primary-foreground font-bold uppercase tracking-wider shadow-hard disabled:opacity-50 flex items-center justify-center gap-2"
              data-testid="button-forge-story"
            >
              {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              Forge Story
            </button>
          </div>

          <aside className="w-96 border-l border-border p-6 bg-secondary/20 sticky top-14 h-[calc(100vh-56px)] overflow-auto">
            <h3 className="font-display font-bold text-sm uppercase mb-4">Generated Story</h3>
            
            {generatedStory ? (
              <div className="space-y-4">
                <div className="p-4 bg-background border border-border max-h-[400px] overflow-auto">
                  <pre className="text-xs font-mono whitespace-pre-wrap">{generatedStory}</pre>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-bold text-xs uppercase">Story Actions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={sendToCYOA}
                      className="p-2 bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center gap-1"
                      data-testid="button-send-cyoa"
                    >
                      <ArrowRight className="w-3 h-3" /> Send to CYOA
                    </button>
                    <button
                      onClick={sendToVN}
                      className="p-2 bg-secondary border border-border text-xs font-medium flex items-center justify-center gap-1"
                      data-testid="button-send-vn"
                    >
                      <ArrowRight className="w-3 h-3" /> Send to VN
                    </button>
                    <button
                      onClick={() => downloadStory("txt")}
                      className="p-2 bg-secondary border border-border text-xs font-medium flex items-center justify-center gap-1"
                    >
                      <Download className="w-3 h-3" /> .TXT
                    </button>
                    <button
                      onClick={() => downloadStory("md")}
                      className="p-2 bg-secondary border border-border text-xs font-medium flex items-center justify-center gap-1"
                    >
                      <Download className="w-3 h-3" /> .MD
                    </button>
                    <button
                      onClick={copyToClipboard}
                      className="p-2 bg-secondary border border-border text-xs font-medium flex items-center justify-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 border border-dashed border-border text-center">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">Your generated story will appear here</p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </Layout>
  );
}
