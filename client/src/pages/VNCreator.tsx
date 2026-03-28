import { Layout } from "@/components/layout/Layout";
import { 
  Play, Plus, ArrowLeft, Save, Trash2, Image as ImageIcon, 
  MessageSquare, GitBranch, User, Upload, Wand2, X,
  Copy, Eye, EyeOff, Download, ArrowUp, ArrowDown, Maximize2, Minimize2,
  BookOpen, SkipForward, Rewind, Code, Monitor, Volume2, Music,
  ChevronLeft, ChevronRight, FileText, Sparkles
} from "lucide-react";
import { FxBrowserPanel } from "@/components/FxBrowserPanel";
import type { FxEffect } from "@/lib/api";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useSearch, Link } from "wouter";
import vnBg from "@assets/generated_images/visual_novel_background.png";
import { AIGenerator } from "@/components/tools/AIGenerator";
import { useProject, useUpdateProject, useCreateProject } from "@/hooks/useProjects";
import { fxStudioApi } from "@/lib/api";
import { scriptToVN, normalizeScriptData, type ScriptData } from "@/lib/scriptImport";
import { toast } from "sonner";
import { useSyncToCoMiXX } from "@/hooks/useSyncToCoMiXX";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";

type TransitionType = "none" | "fade" | "slide-left" | "slide-right" | "dissolve";
type TextMode = "adv" | "nvl";

interface VNDialogueLine {
  speaker: string;
  text: string;
  choices?: { label: string; target: string }[];
  stageDirection?: string;
}

interface VNScene {
  id: string;
  name: string;
  label?: string;
  background: string;
  backgroundUrl?: string;
  transition?: TransitionType;
  musicUrl?: string;
  tintColor?: string;
  characters: { id: string; position: "left" | "center" | "right"; expression: string; visible: boolean }[];
  dialogue: VNDialogueLine[];
}

interface VNCharacter {
  id: string;
  name: string;
  color: string;
  sprites: { expression: string; url: string }[];
  sideImage?: string;
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

const VN_TEMPLATES = [
  {
    id: "school",
    emoji: "\u{1F3EB}",
    title: "School Days",
    desc: "Make friends, join clubs, and navigate the halls of Starlight Academy!",
    gradient: "from-sky-500 to-blue-600",
    characters: [
      { id: "alex", name: "Alex", color: "#4ECDC4", sprites: [{ expression: "neutral", url: "" }] },
      { id: "maya", name: "Maya", color: "#FF6B9D", sprites: [{ expression: "neutral", url: "" }] },
      { id: "coach", name: "Coach Kim", color: "#FFD93D", sprites: [{ expression: "neutral", url: "" }] },
    ],
    scenes: [
      {
        id: "scene_1", name: "First Day", label: "first_day", background: "classroom", transition: "fade" as TransitionType,
        characters: [{ id: "alex", position: "center" as const, expression: "neutral", visible: true }],
        dialogue: [
          { speaker: "Narrator", text: "It's your first day at Starlight Academy. The hallways are buzzing with students chatting and laughing." },
          { speaker: "Alex", text: "Hey! You must be new here. I'm Alex \u{1F44B} Welcome to Starlight!" },
          { speaker: "Narrator", text: "Alex seems friendly. They're wearing a badge that says 'Student Ambassador.'" },
          { speaker: "Alex", text: "I can show you around if you want! There's the art room, the science lab, and oh \u2014 the rooftop garden is AMAZING." },
          { speaker: "You", text: "That sounds great! Where should we go first?" },
          { speaker: "Alex", text: "How about we check out the clubs? Sign-ups are today!", choices: [{ label: "\u{1F3A8} Visit the Art Club", target: "scene_2" }, { label: "\u{26BD} Check out the Sports Field", target: "scene_3" }] },
        ],
      },
      {
        id: "scene_2", name: "Art Club", label: "art_club", background: "classroom", transition: "slide-left" as TransitionType,
        characters: [{ id: "maya", position: "center" as const, expression: "neutral", visible: true }],
        dialogue: [
          { speaker: "Narrator", text: "The art room is filled with colorful paintings and half-finished sculptures. A girl with paint-stained overalls waves you over." },
          { speaker: "Maya", text: "Another art lover! \u{1F3A8} I'm Maya, president of the Art Club. We're working on a mural for the school festival!" },
          { speaker: "Maya", text: "Want to help? I could really use someone with fresh ideas! We have brushes, markers, even a digital drawing tablet." },
          { speaker: "You", text: "I'd love to help!" },
          { speaker: "Maya", text: "YES! This is going to be the best mural Starlight Academy has ever seen! \u{1F31F}" },
        ],
      },
      {
        id: "scene_3", name: "Sports Field", label: "sports", background: "park", transition: "slide-right" as TransitionType,
        characters: [{ id: "coach", position: "center" as const, expression: "neutral", visible: true }],
        dialogue: [
          { speaker: "Narrator", text: "The sports field is alive with energy. Students are playing soccer, running laps, and practicing gymnastics." },
          { speaker: "Coach Kim", text: "New student! Perfect timing \u{23F0} We need one more player for the relay team. Think you can run fast?" },
          { speaker: "You", text: "I'll give it my best shot!" },
          { speaker: "Coach Kim", text: "That's the spirit! \u{1F4AA} Remember, it's not about being the fastest \u2014 it's about teamwork and having fun!" },
          { speaker: "Narrator", text: "You join the relay team and make instant friends. This is going to be a great year at Starlight Academy! \u{2B50}" },
        ],
      },
    ],
  },
  {
    id: "space",
    emoji: "\u{1F680}",
    title: "Star Explorers",
    desc: "Captain your own spaceship and discover amazing new worlds!",
    gradient: "from-violet-600 to-purple-700",
    characters: [
      { id: "nova", name: "Nova", color: "#A78BFA", sprites: [{ expression: "neutral", url: "" }] },
      { id: "bolt", name: "Bolt (Robot)", color: "#60A5FA", sprites: [{ expression: "neutral", url: "" }] },
    ],
    scenes: [
      {
        id: "scene_1", name: "Liftoff!", label: "liftoff", background: "night_city", transition: "fade" as TransitionType,
        characters: [{ id: "nova", position: "left" as const, expression: "neutral", visible: true }, { id: "bolt", position: "right" as const, expression: "neutral", visible: true }],
        dialogue: [
          { speaker: "Narrator", text: "The year is 2525. You've been chosen as the youngest captain in the Space Explorer Program! \u{1F680}" },
          { speaker: "Nova", text: "Captain! I'm Nova, your co-pilot. All systems are go for launch!" },
          { speaker: "Bolt (Robot)", text: "BEEP BOOP! Navigation systems online. I have calculated three possible destinations, Captain!" },
          { speaker: "You", text: "Let's see what's out there!" },
          { speaker: "Nova", text: "We've got a crystal planet, a cloud city, or a floating garden in space. Your call, Captain!", choices: [{ label: "\u{1F48E} Crystal Planet", target: "scene_2" }, { label: "\u{2601}\u{FE0F} Cloud City", target: "scene_3" }] },
        ],
      },
      {
        id: "scene_2", name: "Crystal Planet", label: "crystal", background: "hallway", transition: "dissolve" as TransitionType,
        characters: [{ id: "bolt", position: "center" as const, expression: "neutral", visible: true }],
        dialogue: [
          { speaker: "Narrator", text: "The planet's surface sparkles like a giant diamond! Every step you take creates musical notes \u{1F3B5}" },
          { speaker: "Bolt (Robot)", text: "AMAZING! These crystals vibrate at different frequencies. Captain, this entire planet is one giant musical instrument!" },
          { speaker: "You", text: "Let's play a song!" },
          { speaker: "Narrator", text: "You and Bolt compose a melody by touching different crystals. The music echoes through space, and ships from across the galaxy come to listen! \u{1F31F}" },
        ],
      },
      {
        id: "scene_3", name: "Cloud City", label: "clouds", background: "rooftop", transition: "dissolve" as TransitionType,
        characters: [{ id: "nova", position: "center" as const, expression: "neutral", visible: true }],
        dialogue: [
          { speaker: "Narrator", text: "Cloud City floats on rainbow-colored clouds. The buildings are made of solidified light!" },
          { speaker: "Nova", text: "Look! The Cloud People are having a festival! They're racing on cloud surfboards! \u{1F3C4}" },
          { speaker: "You", text: "Can we join?" },
          { speaker: "Nova", text: "They say anyone with a brave heart is welcome! Let's show them what Earth explorers can do!" },
          { speaker: "Narrator", text: "You and Nova surf across the rainbow clouds, making friends with an entire civilization. Best. Mission. Ever! \u{2B50}" },
        ],
      },
    ],
  },
  {
    id: "fantasy",
    emoji: "\u{1F9D9}",
    title: "Magic Academy",
    desc: "Learn spells, tame dragons, and save the enchanted kingdom!",
    gradient: "from-amber-500 to-orange-600",
    characters: [
      { id: "sage", name: "Professor Sage", color: "#D97706", sprites: [{ expression: "neutral", url: "" }] },
      { id: "pip", name: "Pip (Dragon)", color: "#10B981", sprites: [{ expression: "neutral", url: "" }] },
    ],
    scenes: [
      {
        id: "scene_1", name: "Welcome to Arcadia", label: "welcome", background: "classroom", transition: "fade" as TransitionType,
        characters: [{ id: "sage", position: "center" as const, expression: "neutral", visible: true }],
        dialogue: [
          { speaker: "Narrator", text: "A golden letter floats through your window and lands on your desk. You've been accepted to Arcadia \u2014 the world's most magical school! \u{2728}" },
          { speaker: "Professor Sage", text: "Welcome, young mage! I am Professor Sage. Today you'll discover your magical gift!" },
          { speaker: "Professor Sage", text: "Hold out your hands and focus. What do you feel?", choices: [{ label: "\u{1F525} Warm tingling (Fire Magic)", target: "scene_2" }, { label: "\u{1F33F} Cool breeze (Nature Magic)", target: "scene_3" }] },
        ],
      },
      {
        id: "scene_2", name: "Fire Magic Class", label: "fire", background: "hallway", transition: "slide-left" as TransitionType,
        characters: [{ id: "pip", position: "center" as const, expression: "neutral", visible: true }],
        dialogue: [
          { speaker: "Narrator", text: "In the Fire Magic classroom, a tiny dragon is struggling to breathe fire. It only manages little smoke puffs." },
          { speaker: "Pip (Dragon)", text: "*puff puff* I can't do it! All the other dragons can breathe fire but me..." },
          { speaker: "You", text: "Don't give up, Pip! Let's practice together!" },
          { speaker: "Narrator", text: "You and Pip practice side by side. Your fire magic grows stronger, and Pip finally breathes a beautiful golden flame!" },
          { speaker: "Pip (Dragon)", text: "WE DID IT! You're my best friend EVER! \u{1F525}\u{2764}\u{FE0F}" },
        ],
      },
      {
        id: "scene_3", name: "Nature Garden", label: "nature", background: "park", transition: "slide-right" as TransitionType,
        characters: [{ id: "pip", position: "center" as const, expression: "neutral", visible: true }],
        dialogue: [
          { speaker: "Narrator", text: "The Nature Garden is alive with glowing flowers and talking trees. A small dragon is hiding behind a rosebush." },
          { speaker: "Pip (Dragon)", text: "Psst! Over here! I ran away from Fire class because I'm terrible at breathing fire. But I can make flowers grow! Watch!" },
          { speaker: "Narrator", text: "Pip touches a seed and a beautiful rainbow flower springs up instantly!" },
          { speaker: "You", text: "That's amazing, Pip! You have Nature magic, not Fire magic!" },
          { speaker: "Pip (Dragon)", text: "Really?! I'm not broken? I'm just... DIFFERENT! That's so cool! Let's grow a whole garden together! \u{1F33A}" },
        ],
      },
    ],
  },
  {
    id: "detective",
    emoji: "\u{1F575}\u{FE0F}",
    title: "Kid Detective",
    desc: "Solve mysteries, find clues, and crack the case!",
    gradient: "from-emerald-500 to-teal-600",
    characters: [
      { id: "watson", name: "Watson (Dog)", color: "#F59E0B", sprites: [{ expression: "neutral", url: "" }] },
      { id: "suspect", name: "The Baker", color: "#EC4899", sprites: [{ expression: "neutral", url: "" }] },
    ],
    scenes: [
      {
        id: "scene_1", name: "The Missing Cookies", label: "case", background: "classroom", transition: "fade" as TransitionType,
        characters: [{ id: "watson", position: "center" as const, expression: "neutral", visible: true }],
        dialogue: [
          { speaker: "Narrator", text: "CASE FILE #42: The Great Cookie Caper! Someone ate ALL the cookies from the school bake sale \u{1F36A}" },
          { speaker: "Watson (Dog)", text: "*sniff sniff* WOOF! I've found crumbs leading in two directions, Detective!" },
          { speaker: "You", text: "Good boy, Watson! Let's follow the trail!" },
          { speaker: "Watson (Dog)", text: "One trail goes to the kitchen, the other to the playground. Where first?", choices: [{ label: "\u{1F373} Follow crumbs to the kitchen", target: "scene_2" }, { label: "\u{1F3A0} Check the playground", target: "scene_3" }] },
        ],
      },
      {
        id: "scene_2", name: "Kitchen Clues", label: "kitchen", background: "hallway", transition: "slide-left" as TransitionType,
        characters: [{ id: "suspect", position: "center" as const, expression: "neutral", visible: true }],
        dialogue: [
          { speaker: "Narrator", text: "In the kitchen, you find The Baker looking nervous. There's chocolate on their apron!" },
          { speaker: "The Baker", text: "Oh! Detective! I was just... um... making MORE cookies! Yes, that's it!" },
          { speaker: "You", text: "But those look like the same cookies from the bake sale..." },
          { speaker: "The Baker", text: "OK, OK! I accidentally burned the original batch and was trying to secretly replace them before anyone noticed! I'm so sorry! \u{1F62D}" },
          { speaker: "Narrator", text: "Mystery solved! It wasn't stealing \u2014 just a baking mishap! You help The Baker make even BETTER cookies for the sale. Case closed! \u{1F3C6}" },
        ],
      },
      {
        id: "scene_3", name: "Playground Discovery", label: "playground", background: "park", transition: "slide-right" as TransitionType,
        characters: [{ id: "watson", position: "center" as const, expression: "neutral", visible: true }],
        dialogue: [
          { speaker: "Narrator", text: "On the playground, Watson sniffs out a trail of cookie crumbs leading to... a squirrel nest!" },
          { speaker: "Watson (Dog)", text: "WOOF WOOF! *tail wagging* The squirrels have been collecting crumbs!" },
          { speaker: "You", text: "The squirrels didn't take the cookies \u2014 they just followed the crumb trail!" },
          { speaker: "Narrator", text: "This clue tells you the real cookie trail leads back to the kitchen! The crumbs fell when someone carried them in a hurry." },
          { speaker: "Watson (Dog)", text: "To the kitchen! I can smell chocolate! \u{1F36B}", choices: [{ label: "\u{1F373} Head to the kitchen!", target: "scene_2" }] },
        ],
      },
    ],
  },
  {
    id: "animals",
    emoji: "\u{1F43E}",
    title: "Animal Rescue",
    desc: "Run a rescue center and help animals find their forever homes!",
    gradient: "from-pink-500 to-rose-600",
    characters: [
      { id: "luna", name: "Luna (Cat)", color: "#C084FC", sprites: [{ expression: "neutral", url: "" }] },
      { id: "buddy", name: "Buddy (Dog)", color: "#FB923C", sprites: [{ expression: "neutral", url: "" }] },
    ],
    scenes: [
      {
        id: "scene_1", name: "Opening Day", label: "opening", background: "park", transition: "fade" as TransitionType,
        characters: [{ id: "luna", position: "left" as const, expression: "neutral", visible: true }, { id: "buddy", position: "right" as const, expression: "neutral", visible: true }],
        dialogue: [
          { speaker: "Narrator", text: "Welcome to Paws & Hearts Animal Rescue! Today is opening day, and two special animals are your first guests \u{2764}\u{FE0F}" },
          { speaker: "Luna (Cat)", text: "*purrrr* Hello, human. I am Luna. I require exactly three chin scratches and one sunny windowsill, please. \u{1F431}" },
          { speaker: "Buddy (Dog)", text: "HI HI HI! I'M BUDDY! I LOVE EVERYONE! CAN WE PLAY?! \u{1F436}" },
          { speaker: "You", text: "You're both wonderful! Let's get you settled in!" },
          { speaker: "Narrator", text: "A family walks in looking for a pet!", choices: [{ label: "\u{1F431} Introduce them to Luna", target: "scene_2" }, { label: "\u{1F436} Introduce them to Buddy", target: "scene_3" }] },
        ],
      },
      {
        id: "scene_2", name: "Luna's Match", label: "luna_match", background: "classroom", transition: "dissolve" as TransitionType,
        characters: [{ id: "luna", position: "center" as const, expression: "neutral", visible: true }],
        dialogue: [
          { speaker: "Narrator", text: "The family has a quiet little girl who loves reading. Luna immediately jumps onto her lap and starts purring!" },
          { speaker: "Luna (Cat)", text: "*purrrrrr* This human is warm and quiet. I approve. She may adopt me. \u{1F4DA}" },
          { speaker: "You", text: "Looks like Luna chose HER!" },
          { speaker: "Narrator", text: "The girl hugs Luna gently. 'Can we really take her home?' she whispers. It's a perfect match! \u{1F49C}" },
        ],
      },
      {
        id: "scene_3", name: "Buddy's Day", label: "buddy_day", background: "park", transition: "dissolve" as TransitionType,
        characters: [{ id: "buddy", position: "center" as const, expression: "neutral", visible: true }],
        dialogue: [
          { speaker: "Narrator", text: "The family has two energetic kids who love playing outside. Buddy immediately starts running circles around them!" },
          { speaker: "Buddy (Dog)", text: "BEST DAY EVER! They want to PLAY! And RUN! And PLAY MORE! \u{1F389}" },
          { speaker: "You", text: "Buddy, I think you found your family!" },
          { speaker: "Narrator", text: "The kids tackle-hug Buddy and he licks every face he can reach. Another perfect match at Paws & Hearts! \u{1F9E1}" },
        ],
      },
    ],
  },
];

function TypewriterText({ text, speed = 30, onComplete }: { text: string; speed?: number; onComplete?: () => void }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    indexRef.current = 0;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (speed <= 0) {
      setDisplayed(text);
      setDone(true);
      onComplete?.();
      return;
    }

    const advance = () => {
      indexRef.current++;
      if (indexRef.current >= text.length) {
        setDisplayed(text);
        setDone(true);
        onComplete?.();
        return;
      }
      setDisplayed(text.slice(0, indexRef.current));

      const char = text[indexRef.current - 1];
      let delay = speed;
      if (char === "." || char === "!" || char === "?") delay = speed * 6;
      else if (char === "," || char === ";") delay = speed * 3;
      else if (char === "—" || char === "–") delay = speed * 4;
      else if (char === ":") delay = speed * 3;

      timeoutRef.current = setTimeout(advance, delay);
    };

    timeoutRef.current = setTimeout(advance, speed);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
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

function ScriptView({ scenes, characters, backgrounds }: { scenes: VNScene[]; characters: VNCharacter[]; backgrounds: VNBackground[] }) {
  return (
    <div className="h-full overflow-auto p-4 font-mono text-sm leading-relaxed bg-zinc-950">
      <div className="text-zinc-600 mb-4">
        {characters.map(c => (
          <div key={c.id}>
            <span className="text-purple-400">define</span>{" "}
            <span className="text-yellow-300">{c.name.toLowerCase().replace(/\s+/g, "_")}</span>{" = "}
            <span className="text-green-400">Character</span>
            {"("}
            <span className="text-orange-300">"{c.name}"</span>
            {", color="}
            <span className="text-orange-300">"{c.color}"</span>
            {")"}
          </div>
        ))}
      </div>
      {scenes.map((scene, si) => (
        <div key={scene.id} className="mb-6">
          <div className="text-cyan-400 mb-1">
            label {scene.label || scene.id}:
          </div>
          <div className="ml-4 space-y-0.5">
            <div className="text-zinc-500">
              <span className="text-blue-400">scene</span> {backgrounds.find(b => b.id === scene.background)?.name || scene.background}
              {scene.transition && scene.transition !== "none" && (
                <span className="text-zinc-600"> with {scene.transition}</span>
              )}
            </div>
            {scene.musicUrl && (
              <div className="text-zinc-500">
                <span className="text-blue-400">play music</span> "{scene.musicUrl}"
              </div>
            )}
            {scene.characters.filter(c => c.visible).map(sc => {
              const char = characters.find(c => c.id === sc.id);
              return (
                <div key={sc.id} className="text-zinc-500">
                  <span className="text-blue-400">show</span> {char?.name || sc.id} {sc.expression} at {sc.position}
                </div>
              );
            })}
            <div className="mt-2" />
            {scene.dialogue.map((line, li) => (
              <div key={li}>
                {line.stageDirection && (
                  <div className="text-zinc-600 italic">
                    # {line.stageDirection}
                  </div>
                )}
                {line.speaker === "Narrator" ? (
                  <div>
                    <span className="text-orange-300">"{line.text}"</span>
                  </div>
                ) : (
                  <div>
                    <span className="text-yellow-300">{line.speaker.toLowerCase().replace(/\s+/g, "_")}</span>
                    {" "}
                    <span className="text-orange-300">"{line.text}"</span>
                  </div>
                )}
                {line.choices && line.choices.length > 0 && (
                  <div className="ml-4 mt-1 mb-1">
                    <div className="text-pink-400">menu:</div>
                    {line.choices.map((choice, ci) => (
                      <div key={ci} className="ml-4">
                        <span className="text-orange-300">"{choice.label}"</span>
                        {":"}
                        <div className="ml-4 text-zinc-500">
                          <span className="text-blue-400">jump</span> {choice.target}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
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
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showFxBrowser, setShowFxBrowser] = useState(false);

  const { syncAsset, isSyncing: isSyncingToCoMiXX } = useSyncToCoMiXX({
    defaultTag: "background",
    sourceMode: "/creator/vn",
    projectId: effectiveProjectId || undefined,
  });
  const creationAttempted = useRef(false);
  const [activeTab, setActiveTab] = useState<"scenes" | "characters" | "backgrounds">("scenes");
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playIndex, setPlayIndex] = useState(0);
  const [showAIGen, setShowAIGen] = useState(false);
  const [aiTarget, setAiTarget] = useState<"background" | "sprite">("background");
  const [editMode, setEditMode] = useState<"dialogue" | "staging" | "script">("dialogue");
  const [textSpeed, setTextSpeed] = useState(30);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [autoAdvanceDelay] = useState(3000);
  const [showTextLog, setShowTextLog] = useState(false);
  const [textLog, setTextLog] = useState<{ speaker: string; text: string; color: string }[]>([]);
  const [typewriterDone, setTypewriterDone] = useState(false);
  const [transitionClass, setTransitionClass] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [textMode, setTextMode] = useState<TextMode>("adv");
  const [hideTextbox, setHideTextbox] = useState(false);
  const [nvlLines, setNvlLines] = useState<{ speaker: string; text: string; color: string }[]>([]);

  const bgInputRef = useRef<HTMLInputElement>(null);
  const spriteInputRef = useRef<HTMLInputElement>(null);
  const playtestRef = useRef<HTMLDivElement>(null);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [scenes, setScenes] = useState<VNScene[]>([
    {
      id: "scene_1",
      name: "Scene 1: Intro",
      label: "intro",
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
    if (projectId) { setIsCreating(false); return; }
    if (creationAttempted.current) return;
    creationAttempted.current = true;
    setIsCreating(true);
    let cancelled = false;
    const timeoutId = setTimeout(() => { if (cancelled) return; setIsCreating(false); toast.error("Project creation timed out"); }, 15000);
    fetch("/api/projects?fields=meta", { credentials: "include" })
      .then(res => res.ok ? res.json() : Promise.reject(new Error("Failed")))
      .then((allProjects: any[]) => {
        if (cancelled) return;
        const existing = allProjects.filter((p: any) => p.type === "vn").sort((a: any, b: any) => {
          const aHasData = a.updatedAt !== a.createdAt; const bHasData = b.updatedAt !== b.createdAt;
          if (aHasData && !bHasData) return -1; if (!aHasData && bHasData) return 1;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
        if (existing.length > 0) { clearTimeout(timeoutId); setCreatedProjectId(existing[0].id); setIsCreating(false); navigate(`/creator/vn?id=${existing[0].id}`, { replace: true }); return; }
        return createProject.mutateAsync({ title: "Untitled Visual Novel", type: "vn", status: "draft", data: { scenes, characters, backgrounds } })
          .then((p) => { if (cancelled) return; clearTimeout(timeoutId); setCreatedProjectId(p.id); setIsCreating(false); navigate(`/creator/vn?id=${p.id}`, { replace: true }); });
      }).catch((err) => { if (cancelled) return; clearTimeout(timeoutId); toast.error(err?.message || "Failed"); setIsCreating(false); creationAttempted.current = false; });
    return () => { cancelled = true; clearTimeout(timeoutId); };
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

  useEffect(() => { if (scenes.length > 0 && !selectedScene) setSelectedScene(scenes[0].id); }, [scenes, selectedScene]);

  useEffect(() => {
    const fromScript = searchParams.get('fromScript');
    if (!fromScript) return;
    fxStudioApi.getEffect(fromScript).then((effect: any) => {
      const eff = Array.isArray(effect) ? effect[0] : effect;
      if (!eff) return;
      const metadata = eff.metadata || {};
      const raw = metadata.script_data || { title: eff.name || "Untitled", pages: metadata.pages || [], assets: metadata.assets || [] };
      const sd = normalizeScriptData(raw);
      const { scenes: importedScenes, characters: importedChars, backgrounds: importedBgs } = scriptToVN(sd);
      if (importedScenes.length > 0) setScenes(importedScenes);
      if (importedChars.length > 0) setCharacters(importedChars);
      if (importedBgs.length > 0) setBackgrounds(importedBgs);
      setTitle(sd.title || "Imported Script");
      toast.success("Script imported to Visual Novel");
    }).catch(() => toast.error("Failed to load script"));
  }, []);

  useEffect(() => {
    const importData = localStorage.getItem("vn_import_data");
    if (importData) {
      try { const data = JSON.parse(importData); if (data.scenes) setScenes(data.scenes); if (data.characters) setCharacters(data.characters); localStorage.removeItem("vn_import_data"); toast.success("Story imported!"); } catch {}
    }
  }, []);

  const fireXpAction = useCallback((action: string) => {
    fetch("/api/xp/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }), credentials: "include" });
  }, []);

  const pendingSaveRef = useRef(false);
  const initialLoadDoneRef = useRef(false);
  const latestDataRef = useRef({ title, scenes, characters, backgrounds, projectId: effectiveProjectId });
  latestDataRef.current = { title, scenes, characters, backgrounds, projectId: effectiveProjectId };

  useEffect(() => { if (project && !initialLoadDoneRef.current) initialLoadDoneRef.current = true; }, [project]);
  useEffect(() => { if (!effectiveProjectId || !initialLoadDoneRef.current) return; pendingSaveRef.current = true; }, [scenes, characters, backgrounds, title, effectiveProjectId]);

  useEffect(() => {
    if (!effectiveProjectId || scenes.length === 0) return;
    const interval = setInterval(async () => {
      if (!pendingSaveRef.current) return;
      try { await updateProject.mutateAsync({ id: effectiveProjectId, data: { title, data: { scenes, characters, backgrounds } } }); pendingSaveRef.current = false; } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [effectiveProjectId, scenes, characters, backgrounds, title]);

  useEffect(() => {
    return () => {
      if (pendingSaveRef.current) {
        const { projectId: pid, title: t, scenes: s, characters: c, backgrounds: b } = latestDataRef.current;
        if (pid) navigator.sendBeacon(`/api/projects/${pid}/autosave`, new Blob([JSON.stringify({ title: t, data: { scenes: s, characters: c, backgrounds: b } })], { type: "application/json" }));
      }
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingSaveRef.current) {
        const { projectId: pid, title: t, scenes: s, characters: c, backgrounds: b } = latestDataRef.current;
        if (pid) navigator.sendBeacon(`/api/projects/${pid}/autosave`, new Blob([JSON.stringify({ title: t, data: { scenes: s, characters: c, backgrounds: b } })], { type: "application/json" }));
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (!typewriterDone) setTextSpeed(0); else advanceDialogue(); }
      else if (e.key === "Escape") { setIsPlaying(false); setIsFullscreen(false); stopMusic(); }
      else if (e.key === "l" || e.key === "L") setShowTextLog(prev => !prev);
      else if (e.key === "a" || e.key === "A") setAutoAdvance(prev => !prev);
      else if (e.key === "h" || e.key === "H") setHideTextbox(prev => !prev);
      else if (e.key === "ArrowLeft" || e.key === "Backspace") rollback();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isPlaying, typewriterDone, playIndex]);

  useEffect(() => {
    if (autoAdvance && typewriterDone && isPlaying) {
      const scene = scenes.find(s => s.id === selectedScene);
      const currentLine = scene?.dialogue[playIndex];
      if (currentLine?.choices && currentLine.choices.length > 0) return;
      autoAdvanceTimer.current = setTimeout(() => advanceDialogue(), autoAdvanceDelay);
    }
    return () => { if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current); };
  }, [autoAdvance, typewriterDone, isPlaying, playIndex, selectedScene, autoAdvanceDelay]);

  const playMusic = (url?: string) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (url) {
      audioRef.current = new Audio(url);
      audioRef.current.loop = true;
      audioRef.current.volume = 0.3;
      audioRef.current.play().catch(() => {});
    }
  };

  const stopMusic = () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } };

  const handleExportJSON = () => {
    const data = { title, scenes, characters, backgrounds };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${title.replace(/\s+/g, "_")}.json`; a.click(); URL.revokeObjectURL(url);
    toast.success("Project exported as JSON"); fireXpAction("export");
  };

  const handleExportRenpy = () => {
    let script = `# ${title}\n# Generated by PSCoMiXX Visual Novel Engine\n\n`;
    characters.forEach(c => { script += `define ${c.name.toLowerCase().replace(/\s+/g, "_")} = Character("${c.name}", color="${c.color}")\n`; });
    script += "\n";
    scenes.forEach(scene => {
      script += `label ${scene.label || scene.id}:\n`;
      const bg = backgrounds.find(b => b.id === scene.background);
      script += `    scene ${bg?.name || scene.background}`;
      if (scene.transition && scene.transition !== "none") script += ` with ${scene.transition}`;
      script += "\n";
      if (scene.musicUrl) script += `    play music "${scene.musicUrl}"\n`;
      scene.characters.filter(c => c.visible).forEach(sc => {
        const char = characters.find(c => c.id === sc.id);
        script += `    show ${char?.name || sc.id} ${sc.expression} at ${sc.position}\n`;
      });
      script += "\n";
      scene.dialogue.forEach(line => {
        if (line.stageDirection) script += `    # ${line.stageDirection}\n`;
        if (line.speaker === "Narrator") { script += `    "${line.text}"\n`; }
        else { script += `    ${line.speaker.toLowerCase().replace(/\s+/g, "_")} "${line.text}"\n`; }
        if (line.choices && line.choices.length > 0) {
          script += "    menu:\n";
          line.choices.forEach(c => { script += `        "${c.label}":\n            jump ${c.target}\n`; });
        }
      });
      script += "\n";
    });
    const blob = new Blob([script], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${title.replace(/\s+/g, "_")}.rpy`; a.click(); URL.revokeObjectURL(url);
    toast.success("Exported as Ren'Py script!"); fireXpAction("export");
  };

  const handleExportHTML = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',system-ui,sans-serif;background:#000;color:#fff;overflow:hidden;height:100vh;width:100vw}
#game{position:relative;width:100%;height:100%;cursor:pointer}#bg{position:absolute;inset:0;background-size:cover;background-position:center;transition:opacity 0.8s}
.char{position:absolute;bottom:0;height:80%;display:flex;align-items:flex-end;transition:all 0.5s}.char img{height:100%;object-fit:contain}
.char.left{left:10%}.char.center{left:50%;transform:translateX(-50%)}.char.right{right:10%}
#textbox{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.95) 20%);padding:3rem 2.5rem 1rem;min-height:180px;z-index:10;transition:opacity 0.3s}
#textbox.hidden{opacity:0;pointer-events:none}
#speaker-row{display:flex;align-items:center;gap:0.8rem;margin-bottom:0.6rem}
#side-img{width:60px;height:60px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.3);display:none}
#speaker{font-weight:bold;font-size:0.9rem;text-transform:uppercase;letter-spacing:0.1em}
#dialogue{font-size:1rem;line-height:1.8;min-height:3.5em}
#choices{display:flex;gap:0.5rem;margin-top:1rem;flex-wrap:wrap}
#choices button{padding:0.8rem 1.5rem;background:rgba(255,255,255,0.06);border:2px solid rgba(255,255,255,0.25);color:#fff;cursor:pointer;font-size:0.9rem;transition:all 0.2s;backdrop-filter:blur(4px)}
#choices button:hover{background:rgba(255,255,255,0.12);border-color:rgba(255,255,255,0.5);transform:translateX(4px)}
#quickmenu{position:absolute;bottom:0;left:0;right:0;display:flex;justify-content:center;gap:0.3rem;padding:0.4rem;z-index:20;background:rgba(0,0,0,0.5)}
#quickmenu button{padding:0.3rem 0.8rem;background:transparent;border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.5);cursor:pointer;font-size:0.65rem;text-transform:uppercase;letter-spacing:0.05em;transition:all 0.2s}
#quickmenu button:hover{color:#fff;border-color:rgba(255,255,255,0.4)}#quickmenu button.active{color:#4ade80;border-color:#4ade80}
#counter{position:absolute;top:1rem;left:1rem;font-size:0.7rem;color:rgba(255,255,255,0.3);font-family:monospace;z-index:20}
.fade-in{animation:fadeIn 0.8s}@keyframes fadeIn{from{opacity:0}to{opacity:1}}
#log-panel{position:absolute;inset:0;background:rgba(0,0,0,0.97);z-index:30;display:none;flex-direction:column}
#log-panel.open{display:flex}#log-panel .hdr{padding:1rem 1.5rem;border-bottom:1px solid #222;display:flex;justify-content:space-between;align-items:center;font-weight:bold}
#log-panel .entries{flex:1;overflow:auto;padding:1.5rem}#log-panel .entry{border-bottom:1px solid #1a1a1a;padding-bottom:0.8rem;margin-bottom:0.8rem}
#log-panel .entry .nm{font-size:0.75rem;font-weight:bold;text-transform:uppercase;letter-spacing:0.08em}
#log-panel .entry .tx{font-size:0.85rem;color:#999;margin-top:0.3rem;line-height:1.6}
</style></head><body>
<div id="game" onclick="advance()">
<div id="bg"></div>
<div id="textbox"><div id="speaker-row"><img id="side-img" src=""><div id="speaker"></div></div><div id="dialogue"></div><div id="choices"></div></div>
<div id="quickmenu">
<button onclick="event.stopPropagation();doRollback()">Back</button>
<button onclick="event.stopPropagation();skipText()">Skip</button>
<button id="btn-auto" onclick="event.stopPropagation();toggleAuto()">Auto</button>
<button onclick="event.stopPropagation();toggleLog()">Log</button>
<button onclick="event.stopPropagation();toggleHide()">Hide</button>
</div>
<div id="counter"></div>
<div id="log-panel"><div class="hdr"><span>Text Log</span><button onclick="toggleLog()" style="background:none;border:none;color:#fff;cursor:pointer;font-size:1.2rem">&times;</button></div><div class="entries" id="log-entries"></div></div>
</div>
<script>
const S=${JSON.stringify(scenes)};const C=${JSON.stringify(characters)};const B=${JSON.stringify(backgrounds)};
let si=0,li=0,typing=false,auto=false,autoT=null,log=[],hist=[];let tI=null;
function bg(s){if(s.backgroundUrl)return s.backgroundUrl;const b=B.find(x=>x.id===s.background);return b?b.url:'';}
function cc(n){const c=C.find(x=>x.name===n);return c?c.color:'#fff';}
function si_url(n){const c=C.find(x=>x.name===n);return c&&c.sideImage?c.sideImage:(c&&c.sprites&&c.sprites[0]&&c.sprites[0].url?c.sprites[0].url:'');}
function showS(i){si=i;li=0;const s=S[i];if(!s)return;document.getElementById('bg').style.backgroundImage='url('+bg(s)+')';document.getElementById('bg').className='fade-in';showL();}
function typeT(el,t,cb){typing=true;let i=0;el.textContent='';tI=setInterval(()=>{i++;if(i>=t.length){el.textContent=t;typing=false;clearInterval(tI);tI=null;if(cb)cb();}else{el.textContent=t.slice(0,i);}},30);}
function showL(){const s=S[si];if(!s)return;if(li>=s.dialogue.length){if(si<S.length-1)showS(si+1);return;}
hist.push({si,li});const l=s.dialogue[li];
document.getElementById('speaker').textContent=l.speaker;document.getElementById('speaker').style.color=cc(l.speaker);
const simg=si_url(l.speaker);const el=document.getElementById('side-img');if(simg){el.src=simg;el.style.display='block';}else{el.style.display='none';}
document.getElementById('counter').textContent=(li+1)+'/'+s.dialogue.length;
if(tI)clearInterval(tI);document.getElementById('choices').innerHTML='';
typeT(document.getElementById('dialogue'),l.text,()=>{
if(l.choices&&l.choices.length>0){l.choices.forEach(c=>{const b=document.createElement('button');b.textContent=c.label;b.onclick=(e)=>{e.stopPropagation();const ti=S.findIndex(x=>x.id===c.target);if(ti>=0)showS(ti);};document.getElementById('choices').appendChild(b);});}
if(auto&&!(l.choices&&l.choices.length>0)){autoT=setTimeout(()=>{li++;showL();},3000);}
});
log.push({speaker:l.speaker,text:l.text,color:cc(l.speaker)});}
function advance(){if(typing){if(tI)clearInterval(tI);const s=S[si];const l=s.dialogue[li];document.getElementById('dialogue').textContent=l.text;typing=false;return;}li++;showL();}
function skipText(){if(typing){if(tI)clearInterval(tI);document.getElementById('dialogue').textContent=S[si].dialogue[li].text;typing=false;}}
function toggleAuto(){auto=!auto;document.getElementById('btn-auto').className=auto?'active':'';if(!auto&&autoT){clearTimeout(autoT);autoT=null;}}
function toggleLog(){const p=document.getElementById('log-panel');p.classList.toggle('open');const el=document.getElementById('log-entries');el.innerHTML='';log.forEach(e=>{el.innerHTML+='<div class="entry"><div class="nm" style="color:'+e.color+'">'+e.speaker+'</div><div class="tx">'+e.text+'</div></div>';});el.scrollTop=el.scrollHeight;}
function toggleHide(){const t=document.getElementById('textbox');t.classList.toggle('hidden');document.getElementById('quickmenu').classList.toggle('hidden');}
function doRollback(){if(hist.length>1){hist.pop();const prev=hist[hist.length-1];si=prev.si;li=prev.li;showL();}}
document.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();advance();}if(e.key==='ArrowLeft'||e.key==='Backspace')doRollback();if(e.key==='Escape')toggleLog();if(e.key==='h'||e.key==='H')toggleHide();});
if(S.length>0)showS(0);
</script></body></html>`;
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${title.replace(/\s+/g, "_")}.html`; a.click(); URL.revokeObjectURL(url);
    toast.success("Exported as playable HTML!"); fireXpAction("export");
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
      if (effectiveProjectId) await updateProject.mutateAsync({ id: effectiveProjectId, data: { title, data: { scenes, characters, backgrounds } } });
      pendingSaveRef.current = false; fireXpAction("save"); toast.success("Project saved");
    } catch (error: any) { toast.error(error.message || "Save failed"); } finally { setIsSaving(false); }
  };

  const addScene = () => {
    const id = `scene_${Date.now()}`;
    const newScene: VNScene = { id, name: `Scene ${scenes.length + 1}`, label: id, background: backgrounds[0]?.id || "classroom", transition: "fade", characters: [], dialogue: [] };
    setScenes([...scenes, newScene]); setSelectedScene(newScene.id); toast.success("Scene added");
  };

  const duplicateScene = (id: string) => {
    const scene = scenes.find(s => s.id === id);
    if (!scene) return;
    const newId = `scene_${Date.now()}`;
    const dup: VNScene = { ...JSON.parse(JSON.stringify(scene)), id: newId, name: `${scene.name} (Copy)`, label: newId };
    const idx = scenes.findIndex(s => s.id === id);
    const newScenes = [...scenes]; newScenes.splice(idx + 1, 0, dup); setScenes(newScenes); toast.success("Scene duplicated");
  };

  const moveScene = (id: string, direction: "up" | "down") => {
    const idx = scenes.findIndex(s => s.id === id);
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= scenes.length) return;
    const newScenes = [...scenes]; [newScenes[idx], newScenes[newIdx]] = [newScenes[newIdx], newScenes[idx]]; setScenes(newScenes);
  };

  const deleteScene = (id: string) => {
    if (scenes.length <= 1) { toast.error("Cannot delete the last scene"); return; }
    const remaining = scenes.filter(s => s.id !== id); setScenes(remaining);
    if (selectedScene === id) setSelectedScene(remaining[0]?.id || null);
    toast.success("Scene deleted");
  };

  const addCharacter = () => {
    const newChar: VNCharacter = { id: `char_${Date.now()}`, name: "New Character", color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`, sprites: [{ expression: "neutral", url: "" }] };
    setCharacters([...characters, newChar]); setSelectedCharacter(newChar.id); toast.success("Character added");
  };

  const updateCharacter = (id: string, updates: Partial<VNCharacter>) => { setCharacters(characters.map(c => c.id === id ? { ...c, ...updates } : c)); };
  const deleteCharacter = (id: string) => { setCharacters(characters.filter(c => c.id !== id)); if (selectedCharacter === id) setSelectedCharacter(null); toast.success("Character deleted"); };
  const updateScene = (id: string, updates: Partial<VNScene>) => { setScenes(scenes.map(s => s.id === id ? { ...s, ...updates } : s)); };

  const addDialogue = (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (scene) updateScene(sceneId, { dialogue: [...scene.dialogue, { speaker: characters[0]?.name || "Narrator", text: "" }] });
  };

  const addChoice = (sceneId: string, dialogueIndex: number) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (scene) {
      const newDialogue = [...scene.dialogue];
      const currentChoices = newDialogue[dialogueIndex].choices || [];
      newDialogue[dialogueIndex] = { ...newDialogue[dialogueIndex], choices: [...currentChoices, { label: "New choice", target: scenes[0].id }] };
      updateScene(sceneId, { dialogue: newDialogue });
    }
  };

  const updateDialogue = (sceneId: string, index: number, updates: Partial<VNDialogueLine>) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (scene) { const d = [...scene.dialogue]; d[index] = { ...d[index], ...updates }; updateScene(sceneId, { dialogue: d }); }
  };

  const deleteDialogue = (sceneId: string, index: number) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (scene) updateScene(sceneId, { dialogue: scene.dialogue.filter((_, i) => i !== index) });
  };

  const addCharacterToScene = (sceneId: string, characterId: string, position: "left" | "center" | "right") => {
    const scene = scenes.find(s => s.id === sceneId);
    if (scene && !scene.characters.find(c => c.id === characterId)) {
      updateScene(sceneId, { characters: [...scene.characters, { id: characterId, position, expression: "neutral", visible: true }] });
      toast.success("Character added to scene");
    }
  };

  const removeCharacterFromScene = (sceneId: string, characterId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (scene) updateScene(sceneId, { characters: scene.characters.filter(c => c.id !== characterId) });
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => { const url = event.target?.result as string; setBackgrounds([...backgrounds, { id: `bg_${Date.now()}`, name: file.name.replace(/\.[^/.]+$/, ""), url }]); toast.success("Background imported"); };
    reader.readAsDataURL(file); e.target.value = "";
  };

  const handleSpriteUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !selectedCharacter) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const char = characters.find(c => c.id === selectedCharacter);
      if (char) { updateCharacter(selectedCharacter, { sprites: [...char.sprites, { expression: `sprite_${char.sprites.length}`, url }] }); toast.success("Sprite added"); }
    };
    reader.readAsDataURL(file); e.target.value = "";
  };

  const handleAIGenerated = (url: string) => {
    fireXpAction("generate");
    if (aiTarget === "background") { setBackgrounds([...backgrounds, { id: `bg_${Date.now()}`, name: "AI Background", url }]); toast.success("AI background added"); }
    else if (selectedCharacter) { const char = characters.find(c => c.id === selectedCharacter); if (char) { updateCharacter(selectedCharacter, { sprites: [...char.sprites, { expression: "ai_sprite", url }] }); toast.success("AI sprite added"); } }
    setShowAIGen(false);
  };

  const startPlaytest = () => {
    setIsPlaying(true); setPlayIndex(0); setTextLog([]); setTypewriterDone(false); setTextSpeed(30); setNvlLines([]); setHideTextbox(false);
    const scene = scenes.find(s => s.id === selectedScene);
    if (scene) {
      if (scene.transition && scene.transition !== "none") { setTransitionClass(`vn-transition-${scene.transition}`); setTimeout(() => setTransitionClass(""), 800); }
      playMusic(scene.musicUrl);
    }
  };

  const rollback = () => {
    if (playIndex > 0) { setPlayIndex(playIndex - 1); setTypewriterDone(false); setTextSpeed(30); }
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
      if (textMode === "nvl") {
        setNvlLines(prev => [...prev, { speaker: currentLine.speaker, text: currentLine.text, color: speakerColor }]);
      }
    }
    if (playIndex < scene.dialogue.length - 1) { setPlayIndex(playIndex + 1); setTypewriterDone(false); setTextSpeed(30); }
    else { setIsPlaying(false); setIsFullscreen(false); setPlayIndex(0); stopMusic(); }
  };

  const handlePlaytestClick = () => {
    if (hideTextbox) { setHideTextbox(false); return; }
    if (!typewriterDone) setTextSpeed(0); else advanceDialogue();
  };

  const currentScene = scenes.find(s => s.id === selectedScene);
  const currentBackground = backgrounds.find(b => b.id === currentScene?.background);
  const currentBackgroundUrl = currentScene?.backgroundUrl || currentBackground?.url || vnBg;
  const currentDialogue = currentScene?.dialogue[playIndex];
  const totalDialogueLines = scenes.reduce((sum, s) => sum + s.dialogue.length, 0);

  const currentSpeakerChar = currentDialogue ? characters.find(c => c.name === currentDialogue.speaker) : null;
  const sideImageUrl = currentSpeakerChar?.sideImage || currentSpeakerChar?.sprites.find(s => s.url)?.url || "";

  if (isCreating) {
    return (<Layout><div className="h-screen flex items-center justify-center bg-black"><div className="text-center text-white"><div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" /><p className="text-zinc-400">Creating visual novel project...</p></div></div></Layout>);
  }

  const playtestView = (
    <div ref={playtestRef} className={`relative overflow-hidden cursor-pointer ${isFullscreen ? "fixed inset-0 z-50 bg-black" : "h-[70vh]"}`} onClick={handlePlaytestClick} data-testid="playtest-viewport">
      <style>{`
        @keyframes vnChoiceFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes vnCharEnterLeft{from{opacity:0;transform:translateX(calc(-50% - 60px))}to{opacity:1;transform:translateX(0)}}
        @keyframes vnCharEnterRight{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:translateX(0)}}
        @keyframes vnCharEnterCenter{from{opacity:0;transform:translateX(-50%) scale(0.9) translateY(20px)}to{opacity:1;transform:translateX(-50%) scale(1) translateY(0)}}
        @keyframes vnSpeakerPop{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}
        .vn-speaker-pop{animation:vnSpeakerPop 0.3s ease-out}
      `}</style>
      <div className={`w-full h-full ${transitionClass}`}>
        <img src={currentBackgroundUrl} className="w-full h-full object-cover" />
        {currentScene?.tintColor && <div className="absolute inset-0" style={{ backgroundColor: currentScene.tintColor, opacity: 0.15 }} />}
      </div>
      
      {currentScene?.characters.filter(c => c.visible).map((sceneChar) => {
        const char = characters.find(c => c.id === sceneChar.id);
        const sprite = char?.sprites.find(s => s.expression === sceneChar.expression || s.url);
        if (!sprite?.url) return null;
        const positionStyles: Record<string, React.CSSProperties> = {
          left: { left: "10%", transform: "translateX(0)", animation: "vnCharEnterLeft 0.6s ease-out both" },
          center: { left: "50%", animation: "vnCharEnterCenter 0.5s ease-out both" },
          right: { right: "10%", transform: "translateX(0)", animation: "vnCharEnterRight 0.6s ease-out both" }
        };
        const isSpeaking = currentDialogue?.speaker === char?.name;
        return (<div key={`${sceneChar.id}-${currentScene?.id}`} className="absolute bottom-0 h-[80%] flex items-end transition-all duration-500" style={positionStyles[sceneChar.position]}>
          <img src={sprite.url} className={`h-full object-contain transition-all duration-300 ${isSpeaking ? "brightness-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" : "brightness-75"}`} />
        </div>);
      })}

      {showTextLog && <TextLog log={textLog} onClose={() => setShowTextLog(false)} />}

      {textMode === "nvl" && !hideTextbox && (
        <div className="absolute inset-0 bg-black/85 z-10 overflow-auto p-8" onClick={(e) => e.stopPropagation()}>
          <div className="max-w-2xl mx-auto space-y-4" onClick={handlePlaytestClick}>
            {nvlLines.map((line, i) => (
              <div key={i}>
                {line.speaker !== "Narrator" && <span className="font-bold text-sm" style={{ color: line.color }}>{line.speaker}: </span>}
                <span className="text-sm leading-relaxed font-mono">{i === nvlLines.length - 1 && !typewriterDone ? <TypewriterText text={line.text} speed={textSpeed} onComplete={() => setTypewriterDone(true)} /> : line.text}</span>
              </div>
            ))}
            {currentDialogue && nvlLines.length === 0 && (
              <div>
                {currentDialogue.speaker !== "Narrator" && <span className="font-bold text-sm" style={{ color: currentSpeakerChar?.color || "#fff" }}>{currentDialogue.speaker}: </span>}
                <span className="text-sm leading-relaxed font-mono"><TypewriterText text={currentDialogue.text} speed={textSpeed} onComplete={() => setTypewriterDone(true)} /></span>
              </div>
            )}
            {typewriterDone && currentDialogue?.choices && currentDialogue.choices.length > 0 && (
              <div className="mt-6 space-y-2">
                {currentDialogue.choices.map((choice, i) => (
                  <button key={i} onClick={(e) => { e.stopPropagation(); setSelectedScene(choice.target); setPlayIndex(0); setIsPlaying(true); setTypewriterDone(false); setTextSpeed(30); setNvlLines([]); }}
                    className="block w-full text-left px-5 py-3 bg-white/5 border-2 border-white/20 text-sm hover:bg-white/15 hover:border-white/50 transition-all duration-200 hover:translate-x-2 hover:shadow-[4px_0_0_rgba(255,255,255,0.2)] active:scale-[0.98] font-medium"
                    style={{ animation: `vnChoiceFade 0.4s ease-out ${i * 0.12}s both` }}
                    data-testid={`button-choice-${i}`}>{choice.label}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {textMode === "adv" && !hideTextbox && (
        <div className="absolute bottom-0 left-0 right-0 z-10" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.95) 20%)", padding: "3rem 2.5rem 2.5rem", minHeight: isFullscreen ? "200px" : "180px" }}>
          {currentDialogue ? (
            <>
              <div key={`${currentDialogue.speaker}-${playIndex}`} className="flex items-center gap-3 mb-2 vn-speaker-pop">
                {sideImageUrl && <img src={sideImageUrl} className="w-12 h-12 rounded-full object-cover border-2 flex-shrink-0" style={{ borderColor: currentSpeakerChar?.color || "rgba(255,255,255,0.3)" }} />}
                <div className="font-bold font-display uppercase tracking-wider text-sm" style={{ color: currentSpeakerChar?.color || "#fff" }}>{currentDialogue.speaker}</div>
              </div>
              <p className="font-mono text-sm leading-relaxed">
                <TypewriterText text={currentDialogue.text} speed={textSpeed} onComplete={() => setTypewriterDone(true)} />
              </p>
              {typewriterDone && currentDialogue.choices && currentDialogue.choices.length > 0 && (
                <div className="mt-4 flex gap-2 flex-wrap">
                  {currentDialogue.choices.map((choice, i) => (
                    <button key={i} onClick={(e) => { e.stopPropagation(); setSelectedScene(choice.target); setPlayIndex(0); setIsPlaying(true); setTypewriterDone(false); setTextSpeed(30); setNvlLines([]); }}
                      className="px-5 py-2.5 bg-white/10 border-2 border-white/25 text-sm hover:bg-white/20 hover:border-white/60 transition-all duration-200 hover:translate-y-[-2px] hover:shadow-[0_4px_12px_rgba(255,255,255,0.15)] active:scale-95 font-medium"
                      style={{ animation: `vnChoiceFade 0.4s ease-out ${i * 0.1}s both` }}
                      data-testid={`button-choice-${i}`}>{choice.label}</button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-zinc-500"><MessageSquare className="w-8 h-8 mx-auto mb-2" /><p className="text-sm">Click Playtest to preview</p></div>
          )}
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-1 p-1.5 z-20" style={{ background: "rgba(0,0,0,0.5)" }}>
        <button onClick={(e) => { e.stopPropagation(); rollback(); }} className="px-2 py-0.5 text-[10px] text-white/50 border border-white/10 hover:text-white hover:border-white/30 uppercase" title="Back (←)">Back</button>
        <button onClick={(e) => { e.stopPropagation(); setTextSpeed(0); }} className="px-2 py-0.5 text-[10px] text-white/50 border border-white/10 hover:text-white hover:border-white/30 uppercase" title="Skip">Skip</button>
        <button onClick={(e) => { e.stopPropagation(); setAutoAdvance(!autoAdvance); }} className={`px-2 py-0.5 text-[10px] border uppercase ${autoAdvance ? "text-green-400 border-green-400/30" : "text-white/50 border-white/10 hover:text-white hover:border-white/30"}`} title="Auto (A)">Auto</button>
        <button onClick={(e) => { e.stopPropagation(); setShowTextLog(true); }} className="px-2 py-0.5 text-[10px] text-white/50 border border-white/10 hover:text-white hover:border-white/30 uppercase" title="Log (L)">Log</button>
        <button onClick={(e) => { e.stopPropagation(); setHideTextbox(!hideTextbox); }} className="px-2 py-0.5 text-[10px] text-white/50 border border-white/10 hover:text-white hover:border-white/30 uppercase" title="Hide (H)">Hide</button>
        <button onClick={(e) => { e.stopPropagation(); setTextMode(textMode === "adv" ? "nvl" : "adv"); setNvlLines([]); }} className="px-2 py-0.5 text-[10px] text-white/50 border border-white/10 hover:text-white hover:border-white/30 uppercase" title="Toggle ADV/NVL">{textMode === "adv" ? "NVL" : "ADV"}</button>
        <button onClick={(e) => { e.stopPropagation(); setIsFullscreen(!isFullscreen); }} className="px-2 py-0.5 text-[10px] text-white/50 border border-white/10 hover:text-white hover:border-white/30 uppercase">{isFullscreen ? "Window" : "Full"}</button>
        <button onClick={(e) => { e.stopPropagation(); setIsPlaying(false); setIsFullscreen(false); stopMusic(); }} className="px-2 py-0.5 text-[10px] text-red-400/70 border border-red-400/20 hover:text-red-400 hover:border-red-400/40 uppercase">Quit</button>
      </div>

      <div className="absolute top-4 left-4 bg-black/80 text-white px-3 py-1 text-xs font-mono z-20">
        {currentScene?.label || currentScene?.name} — {playIndex + 1}/{currentScene?.dialogue.length || 0}
      </div>
    </div>
  );

  if (isFullscreen && isPlaying) return playtestView;

  return (
    <Layout>
      <div className="h-screen flex flex-col bg-zinc-950 text-white">
        <style>{`
          .vn-transition-fade{animation:vnFade 0.8s ease-in-out}.vn-transition-dissolve{animation:vnDissolve 1s ease-in-out}
          .vn-transition-slide-left{animation:vnSlideLeft 0.6s ease-out}.vn-transition-slide-right{animation:vnSlideRight 0.6s ease-out}
          @keyframes vnFade{from{opacity:0}to{opacity:1}}@keyframes vnDissolve{0%{opacity:0;filter:blur(8px)}100%{opacity:1;filter:blur(0)}}
          @keyframes vnSlideLeft{from{transform:translateX(100%)}to{transform:translateX(0)}}@keyframes vnSlideRight{from{transform:translateX(-100%)}to{transform:translateX(0)}}
          @keyframes vnChoiceFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
          @keyframes vnCharEnterLeft{from{opacity:0;transform:translateX(-60px)}to{opacity:1;transform:translateX(0)}}
          @keyframes vnCharEnterRight{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:translateX(0)}}
          @keyframes vnCharEnterCenter{from{opacity:0;transform:scale(0.9) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
          @keyframes vnSpeakerPop{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}
          .vn-speaker-pop{animation:vnSpeakerPop 0.3s ease-out}
        `}</style>

        <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900">
          <div className="flex items-center gap-4">
            <Link href="/"><button className="p-2 hover:bg-zinc-800" data-testid="button-back"><ArrowLeft className="w-4 h-4" /></button></Link>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="font-display font-bold text-lg bg-transparent border-none outline-none hover:bg-zinc-800 px-2 py-1" data-testid="input-vn-title" />
            <span className="text-xs font-mono text-zinc-500">Visual Novel Engine</span>
            <span className="text-[10px] font-mono text-zinc-600 hidden md:block">{scenes.length} scenes • {totalDialogueLines} lines • {characters.length} chars</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                try {
                  const p = await createProject.mutateAsync({ title: "Untitled Visual Novel", type: "vn", status: "draft", data: {}, forceNew: true } as any);
                  navigate(`/creator/vn?id=${p.id}`, { replace: true });
                  window.location.reload();
                } catch { toast.error("Failed to create new project"); }
              }}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-medium flex items-center gap-2"
              data-testid="button-new-vn"
            >
              <Plus className="w-4 h-4" /> New
            </button>
            <button
              onClick={() => setShowTemplatePicker(!showTemplatePicker)}
              className={`px-3 py-2 border border-zinc-700 text-sm font-medium flex items-center gap-2 ${showTemplatePicker ? "bg-white text-black" : "bg-zinc-800 hover:bg-zinc-700"}`}
              data-testid="button-vn-templates"
            >
              <BookOpen className="w-4 h-4" /> Templates
            </button>
            <button
              onClick={() => setShowFxBrowser(!showFxBrowser)}
              className={`px-3 py-2 border border-purple-500/30 text-sm font-medium flex items-center gap-2 ${showFxBrowser ? "bg-purple-600 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-purple-400"}`}
              data-testid="button-vn-fx-studio"
            >
              <Sparkles className="w-4 h-4" /> FX Studio
            </button>
            <div className="relative">
              <button onClick={() => setShowExportMenu(!showExportMenu)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-medium flex items-center gap-2" data-testid="button-export">
                <Download className="w-4 h-4" /> Export
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 z-50 w-44">
                  <button onClick={() => { handleExportJSON(); setShowExportMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-700" data-testid="button-export-json">JSON Project</button>
                  <button onClick={() => { handleExportHTML(); setShowExportMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-700" data-testid="button-export-html">Playable HTML</button>
                  <button onClick={() => { handleExportRenpy(); setShowExportMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-700 flex items-center gap-2" data-testid="button-export-renpy"><Code className="w-3 h-3" /> Ren'Py Script</button>
                  <div className="border-t border-zinc-600 my-1" />
                  <button
                    onClick={async () => {
                      setShowExportMenu(false);
                      const json = JSON.stringify({ title, scenes, characters });
                      const blob = new Blob([json], { type: "application/json" });
                      const reader = new FileReader();
                      reader.onload = async () => {
                        await syncAsset({ name: `${title} - VN Project`, dataUrl: reader.result as string, tag: "interior-page" });
                      };
                      reader.readAsDataURL(blob);
                    }}
                    disabled={isSyncingToCoMiXX}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-700 text-cyan-400 flex items-center gap-2"
                    data-testid="button-sync-comixx"
                  >
                    Sync to CoMiXX
                  </button>
                </div>
              )}
            </div>
            <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50" data-testid="button-save">
              <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save"}
            </button>
            <button onClick={startPlaytest} className="px-4 py-2 bg-white text-black text-sm font-bold flex items-center gap-2" data-testid="button-playtest">
              <Play className="w-4 h-4" /> Playtest
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-72 border-r border-zinc-800 bg-zinc-900 flex flex-col">
            <div className="border-b border-zinc-800 p-1 flex">
              {(["scenes", "characters", "backgrounds"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 text-xs font-bold uppercase ${activeTab === tab ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}>{tab}</button>
              ))}
            </div>

            <div className="flex-1 overflow-auto p-2 space-y-2">
              {activeTab === "scenes" && (
                <>
                  {scenes.map((scene, idx) => (
                    <div key={scene.id} onClick={() => { setSelectedScene(scene.id); if (isPlaying && scene.transition && scene.transition !== "none") { setTransitionClass(`vn-transition-${scene.transition}`); setTimeout(() => setTransitionClass(""), 800); } }}
                      className={`p-3 border cursor-pointer group ${selectedScene === scene.id ? "bg-white text-black border-white" : "bg-zinc-800 border-zinc-700 hover:border-zinc-500"}`}>
                      <div className="flex items-center justify-between">
                        <input value={scene.name} onChange={(e) => updateScene(scene.id, { name: e.target.value })} onClick={(e) => e.stopPropagation()}
                          className={`font-bold text-sm bg-transparent border-none outline-none flex-1 w-0 ${selectedScene === scene.id ? "text-black" : ""}`} />
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                          <button onClick={(e) => { e.stopPropagation(); moveScene(scene.id, "up"); }} disabled={idx === 0} className={`p-0.5 disabled:opacity-30 ${selectedScene === scene.id ? "hover:text-zinc-600" : "hover:text-yellow-400"}`}><ArrowUp className="w-3 h-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); moveScene(scene.id, "down"); }} disabled={idx === scenes.length - 1} className={`p-0.5 disabled:opacity-30 ${selectedScene === scene.id ? "hover:text-zinc-600" : "hover:text-yellow-400"}`}><ArrowDown className="w-3 h-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); duplicateScene(scene.id); }} className={`p-0.5 ${selectedScene === scene.id ? "hover:text-zinc-600" : "hover:text-blue-400"}`}><Copy className="w-3 h-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); deleteScene(scene.id); }} className={`p-0.5 ${selectedScene === scene.id ? "hover:text-red-600" : "hover:text-red-500"}`}><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                      <div className={`text-xs mt-1 ${selectedScene === scene.id ? "text-zinc-600" : "text-zinc-500"}`}>{scene.dialogue.length} lines • {scene.characters.length} chars</div>
                      {selectedScene === scene.id && (
                        <div className="mt-2 pt-2 border-t border-zinc-300 space-y-2" onClick={(e) => e.stopPropagation()}>
                          <div>
                            <label className="text-[10px] font-bold uppercase text-zinc-500 block mb-1">Label (for jumps)</label>
                            <input value={scene.label || ""} onChange={(e) => updateScene(scene.id, { label: e.target.value })} className="w-full p-1 bg-zinc-200 text-black text-xs font-mono border-none" placeholder="scene_label" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase text-zinc-500 block mb-1">Transition</label>
                            <select value={scene.transition || "none"} onChange={(e) => updateScene(scene.id, { transition: e.target.value as TransitionType })} className="w-full p-1 bg-zinc-200 text-black text-xs border-none">
                              {TRANSITION_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase text-zinc-500 block mb-1">Music URL</label>
                            <input value={scene.musicUrl || ""} onChange={(e) => updateScene(scene.id, { musicUrl: e.target.value })} className="w-full p-1 bg-zinc-200 text-black text-xs border-none" placeholder="https://..." />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase text-zinc-500 block mb-1">Tint Color</label>
                            <div className="flex gap-1 items-center">
                              <input type="color" value={scene.tintColor || "#000000"} onChange={(e) => updateScene(scene.id, { tintColor: e.target.value })} className="w-8 h-5 bg-transparent cursor-pointer" />
                              {scene.tintColor && <button onClick={() => updateScene(scene.id, { tintColor: undefined })} className="text-[10px] text-zinc-400 hover:text-red-400">Clear</button>}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <button onClick={addScene} className="w-full p-3 border border-dashed border-zinc-700 hover:border-white text-sm flex items-center justify-center gap-2" data-testid="button-add-scene"><Plus className="w-4 h-4" /> Add Scene</button>
                </>
              )}

              {activeTab === "characters" && (
                <>
                  {characters.map((char) => (
                    <div key={char.id} className={`p-3 border cursor-pointer group ${selectedCharacter === char.id ? "bg-white text-black border-white" : "bg-zinc-800 border-zinc-700"}`} onClick={() => setSelectedCharacter(char.id)}>
                      <div className="flex items-center gap-2">
                        <input type="color" value={char.color} onChange={(e) => updateCharacter(char.id, { color: e.target.value })} onClick={(e) => e.stopPropagation()} className="w-4 h-4 cursor-pointer bg-transparent border-none" />
                        <input value={char.name} onChange={(e) => updateCharacter(char.id, { name: e.target.value })} className={`font-bold text-sm bg-transparent border-none outline-none flex-1 ${selectedCharacter === char.id ? "text-black" : ""}`} onClick={(e) => e.stopPropagation()} />
                        <button onClick={(e) => { e.stopPropagation(); deleteCharacter(char.id); }} className={`opacity-0 group-hover:opacity-100 p-1 ${selectedCharacter === char.id ? "hover:text-red-600" : "hover:text-red-500"}`}><Trash2 className="w-3 h-3" /></button>
                      </div>
                      <div className={`text-xs mt-2 ${selectedCharacter === char.id ? "text-zinc-600" : "text-zinc-500"}`}>{char.sprites.length} sprite(s)</div>
                      {selectedCharacter === char.id && (
                        <div className="mt-3 pt-3 border-t border-zinc-300 space-y-2">
                          <div className="flex gap-2">
                            <button onClick={(e) => { e.stopPropagation(); spriteInputRef.current?.click(); }} className="flex-1 p-2 bg-zinc-200 text-xs flex items-center justify-center gap-1"><Upload className="w-3 h-3" /> Import</button>
                            <button onClick={(e) => { e.stopPropagation(); setAiTarget("sprite"); setShowAIGen(true); }} className="flex-1 p-2 bg-zinc-800 text-white text-xs flex items-center justify-center gap-1"><Wand2 className="w-3 h-3" /> AI Gen</button>
                          </div>
                          <div className="space-y-1">
                            {char.sprites.map((sprite, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-zinc-300 overflow-hidden flex-shrink-0">{sprite.url && <img src={sprite.url} className="w-full h-full object-cover" />}</div>
                                <input value={sprite.expression} onChange={(e) => { const s = [...char.sprites]; s[i] = { ...sprite, expression: e.target.value }; updateCharacter(char.id, { sprites: s }); }} className="flex-1 p-1 bg-zinc-200 text-[10px] text-black border-none" placeholder="Expression label" onClick={(e) => e.stopPropagation()} />
                                <button onClick={(e) => { e.stopPropagation(); updateCharacter(char.id, { sprites: char.sprites.filter((_, j) => j !== i) }); }} className="p-0.5 hover:text-red-600"><X className="w-3 h-3" /></button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <button onClick={addCharacter} className="w-full p-3 border border-dashed border-zinc-700 hover:border-white text-sm flex items-center justify-center gap-2" data-testid="button-add-character"><Plus className="w-4 h-4" /> Add Character</button>
                </>
              )}

              {activeTab === "backgrounds" && (
                <>
                  <div className="flex gap-2 mb-2">
                    <button onClick={() => bgInputRef.current?.click()} className="flex-1 p-2 bg-zinc-800 text-xs flex items-center justify-center gap-1 hover:bg-zinc-700"><Upload className="w-3 h-3" /> Import</button>
                    <button onClick={() => { setAiTarget("background"); setShowAIGen(true); }} className="flex-1 p-2 bg-white text-black text-xs flex items-center justify-center gap-1"><Wand2 className="w-3 h-3" /> AI Gen</button>
                  </div>
                  {backgrounds.map((bg) => (
                    <div key={bg.id} onClick={() => currentScene && updateScene(currentScene.id, { background: bg.id })} className={`p-2 border cursor-pointer relative group ${currentScene?.background === bg.id ? "border-white" : "border-zinc-700 hover:border-zinc-500"}`}>
                      <div className="aspect-video bg-zinc-800 overflow-hidden mb-1 relative">
                        <img src={bg.url} className="w-full h-full object-cover" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const remaining = backgrounds.filter(b => b.id !== bg.id);
                            if (remaining.length === 0) {
                              toast.error("Cannot remove the last background");
                              return;
                            }
                            const fallbackId = remaining[0].id;
                            scenes.forEach(scene => {
                              if (scene.background === bg.id) {
                                updateScene(scene.id, { background: fallbackId });
                              }
                            });
                            setBackgrounds(remaining);
                            toast.success(`Background "${bg.name}" removed`);
                          }}
                          className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove background"
                          data-testid={`button-delete-bg-${bg.id}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-xs font-medium">{bg.name}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            {showTemplatePicker && (
              <div className="absolute inset-0 z-40 bg-zinc-950/95 backdrop-blur-sm overflow-auto flex items-center justify-center p-8">
                <div className="max-w-4xl w-full">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-display font-bold mb-2">Choose a Template</h2>
                    <p className="text-zinc-500 text-sm">Pick a starter template — everything is fully editable.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                    {VN_TEMPLATES.map(template => (
                      <button
                        key={template.id}
                        onClick={() => {
                          setScenes(template.scenes as VNScene[]);
                          setCharacters(template.characters as VNCharacter[]);
                          setTitle(template.title);
                          setSelectedScene(template.scenes[0].id);
                          setShowTemplatePicker(false);
                          toast.success(`"${template.title}" loaded — click Playtest to preview.`);
                        }}
                        className="group p-4 bg-zinc-900 border border-zinc-700 hover:border-white text-left transition-colors"
                        data-testid={`button-vn-template-${template.id}`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{template.emoji}</span>
                          <h3 className="font-bold text-sm text-white">{template.title}</h3>
                        </div>
                        <p className="text-zinc-500 text-xs leading-relaxed">{template.desc}</p>
                        <div className="mt-2 flex items-center gap-2 text-zinc-600 text-[10px] font-mono">
                          <span>{template.scenes.length} scenes</span>
                          <span>{"\u2022"}</span>
                          <span>{template.characters.length} characters</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="text-center">
                    <button
                      onClick={() => setShowTemplatePicker(false)}
                      className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div className="relative">
                  {isPlaying ? playtestView : (
                    <div className="h-[70vh] bg-black relative overflow-hidden">
                      <img src={currentBackgroundUrl} className="w-full h-full object-cover" />
                      {currentScene?.tintColor && <div className="absolute inset-0" style={{ backgroundColor: currentScene.tintColor, opacity: 0.15 }} />}
                      {currentScene?.characters.filter(c => c.visible).map((sceneChar) => {
                        const char = characters.find(c => c.id === sceneChar.id);
                        const sprite = char?.sprites.find(s => s.expression === sceneChar.expression || s.url);
                        if (!sprite?.url) return null;
                        const positionStyles = { left: { left: "10%", transform: "translateX(0)" }, center: { left: "50%", transform: "translateX(-50%)" }, right: { right: "10%", transform: "translateX(0)" } };
                        return (<div key={sceneChar.id} className="absolute bottom-0 h-[80%] flex items-end" style={positionStyles[sceneChar.position]}><img src={sprite.url} className="h-full object-contain" /></div>);
                      })}
                      <div className="absolute bottom-0 left-0 right-0 p-8" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.9) 30%)" }}>
                        <div className="text-center text-zinc-500">
                          <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-sm">Click Playtest to preview your visual novel</p>
                          <p className="text-xs text-zinc-600 mt-1">Space/Enter advance {"\u2022"} {"\u2190"} rollback {"\u2022"} L log {"\u2022"} A auto {"\u2022"} H hide {"\u2022"} Esc quit</p>
                        </div>
                      </div>
                      {currentScene && (
                        <div className="absolute top-4 left-4 flex gap-2">
                          <div className="flex bg-zinc-800 p-1">
                            {(["dialogue", "staging", "script"] as const).map(mode => (
                              <button key={mode} onClick={() => setEditMode(mode)} className={`px-3 py-1 text-xs ${editMode === mode ? "bg-white text-black" : "text-white"}`}>
                                {mode === "script" ? <><Code className="w-3 h-3 inline mr-1" />Script</> : mode.charAt(0).toUpperCase() + mode.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {currentScene?.transition && currentScene.transition !== "none" && <div className="absolute top-4 right-4 bg-black/60 px-2 py-1 text-[10px] font-mono text-zinc-400">with {currentScene.transition}</div>}
                      {currentScene?.musicUrl && <div className="absolute top-4 right-4 bg-black/60 px-2 py-1 text-[10px] font-mono text-zinc-400 flex items-center gap-1" style={{ top: currentScene.transition && currentScene.transition !== "none" ? "2.5rem" : "1rem" }}><Music className="w-3 h-3" /> music</div>}
                    </div>
                  )}
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-56 bg-zinc-900 border-zinc-700 text-white">
                <ContextMenuItem onClick={addScene} className="hover:bg-zinc-800 cursor-pointer"><Plus className="w-4 h-4 mr-2" /> Add Scene</ContextMenuItem>
                <ContextMenuItem onClick={addCharacter} className="hover:bg-zinc-800 cursor-pointer"><User className="w-4 h-4 mr-2" /> Add Character</ContextMenuItem>
                <ContextMenuSeparator className="bg-zinc-700" />
                <ContextMenuItem onClick={() => { setAiTarget("background"); setShowAIGen(true); }} className="hover:bg-zinc-800 cursor-pointer"><Wand2 className="w-4 h-4 mr-2" /> Generate Background</ContextMenuItem>
                <ContextMenuItem onClick={() => { setAiTarget("sprite"); setShowAIGen(true); }} className="hover:bg-zinc-800 cursor-pointer"><ImageIcon className="w-4 h-4 mr-2" /> Generate Sprite</ContextMenuItem>
                <ContextMenuSeparator className="bg-zinc-700" />
                <ContextMenuItem onClick={() => isPlaying ? (setIsPlaying(false), stopMusic()) : startPlaytest()} className="hover:bg-zinc-800 cursor-pointer"><Play className="w-4 h-4 mr-2" /> {isPlaying ? "Stop" : "Playtest"}</ContextMenuItem>
                {currentScene && (<><ContextMenuSeparator className="bg-zinc-700" /><ContextMenuItem onClick={() => addDialogue(currentScene.id)} className="hover:bg-zinc-800 cursor-pointer"><MessageSquare className="w-4 h-4 mr-2" /> Add Dialogue</ContextMenuItem><ContextMenuItem onClick={() => duplicateScene(currentScene.id)} className="hover:bg-zinc-800 cursor-pointer"><Copy className="w-4 h-4 mr-2" /> Duplicate Scene</ContextMenuItem></>)}
              </ContextMenuContent>
            </ContextMenu>

            <div className="flex-1 border-t border-zinc-800 bg-zinc-900 flex flex-col overflow-hidden">
              {editMode === "script" ? (
                <ScriptView scenes={scenes} characters={characters} backgrounds={backgrounds} />
              ) : (
                <>
                  <div className="border-b border-zinc-800 p-2 bg-zinc-800 flex items-center justify-between">
                    <div className="text-xs font-mono text-zinc-400">{currentScene?.name || "No scene selected"}{currentScene?.label ? ` [${currentScene.label}]` : ""}</div>
                    {currentScene && editMode === "dialogue" && (
                      <button onClick={() => addDialogue(currentScene.id)} className="px-3 py-1 bg-white text-black text-xs font-medium flex items-center gap-1"><Plus className="w-3 h-3" /> Add Line</button>
                    )}
                    {currentScene && editMode === "staging" && (
                      <div className="flex gap-2">
                        {characters.map(char => (
                          <button key={char.id} onClick={() => addCharacterToScene(currentScene.id, char.id, "center")} className="px-2 py-1 bg-zinc-700 text-xs flex items-center gap-1" style={{ borderLeft: `3px solid ${char.color}` }}><Plus className="w-3 h-3" /> {char.name}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 p-4 overflow-auto space-y-1">
                    {editMode === "dialogue" && currentScene?.dialogue.map((line, index) => (
                      <div key={index}>
                        {line.stageDirection && (
                          <div className="flex gap-4 p-1 items-center ml-12">
                            <span className="text-[10px] text-zinc-600 italic font-mono">#{" "}</span>
                            <input value={line.stageDirection} onChange={(e) => updateDialogue(currentScene.id, index, { stageDirection: e.target.value })} className="flex-1 p-1 border border-zinc-700/50 bg-zinc-800/50 text-[10px] font-mono italic text-zinc-500" placeholder="Stage direction..." />
                          </div>
                        )}
                        <div className={`flex gap-4 p-2 hover:bg-zinc-800 group ${playIndex === index && isPlaying ? "bg-zinc-700" : ""}`}>
                          <span className="text-zinc-600 w-8 text-right text-sm">{index + 1}</span>
                          <select value={line.speaker} onChange={(e) => updateDialogue(currentScene.id, index, { speaker: e.target.value })} className="w-32 p-1 border border-zinc-700 bg-zinc-800 text-sm">
                            <option value="Narrator">Narrator</option>
                            {characters.map(c => (<option key={c.id} value={c.name}>{c.name}</option>))}
                          </select>
                          <input value={line.text} onChange={(e) => updateDialogue(currentScene.id, index, { text: e.target.value })} className="flex-1 p-1 border border-zinc-700 bg-zinc-800 text-sm font-mono" placeholder="Enter dialogue..." />
                          <button onClick={() => moveDialogue(currentScene.id, index, "up")} disabled={index === 0} className="opacity-0 group-hover:opacity-100 p-1 hover:text-yellow-400 disabled:opacity-30" title="Move up"><ArrowUp className="w-4 h-4" /></button>
                          <button onClick={() => moveDialogue(currentScene.id, index, "down")} disabled={index === currentScene.dialogue.length - 1} className="opacity-0 group-hover:opacity-100 p-1 hover:text-yellow-400 disabled:opacity-30" title="Move down"><ArrowDown className="w-4 h-4" /></button>
                          <button onClick={() => updateDialogue(currentScene.id, index, { stageDirection: line.stageDirection ? undefined : "" })} className={`opacity-0 group-hover:opacity-100 p-1 ${line.stageDirection !== undefined ? "text-purple-400" : "hover:text-purple-400"}`} title="Stage direction"><FileText className="w-4 h-4" /></button>
                          <button onClick={() => addChoice(currentScene.id, index)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-blue-400" title="Add branching choice"><GitBranch className="w-4 h-4" /></button>
                          <button onClick={() => deleteDialogue(currentScene.id, index)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        {line.choices && line.choices.length > 0 && (
                          <div className="ml-12 pl-4 border-l-2 border-blue-500/30 space-y-1 mb-2">
                            <div className="text-[10px] font-bold uppercase text-blue-400 mb-1 font-mono">menu:</div>
                            {line.choices.map((choice, ci) => (
                              <div key={ci} className="flex gap-2 items-center">
                                <span className="text-[10px] text-zinc-600 font-mono">→</span>
                                <input value={choice.label} onChange={(e) => { const nc = [...(line.choices || [])]; nc[ci] = { ...choice, label: e.target.value }; updateDialogue(currentScene.id, index, { choices: nc }); }} className="flex-1 p-1 border border-zinc-700 bg-zinc-800 text-xs" placeholder="Choice text" />
                                <span className="text-[10px] text-zinc-600 font-mono">jump</span>
                                <select value={choice.target} onChange={(e) => { const nc = [...(line.choices || [])]; nc[ci] = { ...choice, target: e.target.value }; updateDialogue(currentScene.id, index, { choices: nc }); }} className="w-32 p-1 border border-zinc-700 bg-zinc-800 text-xs">
                                  {scenes.map(s => (<option key={s.id} value={s.id}>{s.label || s.name}</option>))}
                                </select>
                                <button onClick={() => { const nc = (line.choices || []).filter((_, j) => j !== ci); updateDialogue(currentScene.id, index, { choices: nc.length > 0 ? nc : undefined }); }} className="p-1 hover:text-red-500"><X className="w-3 h-3" /></button>
                              </div>
                            ))}
                          </div>
                        )}
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
                                <select value={sceneChar.position} onChange={(e) => updateScene(currentScene.id, { characters: currentScene.characters.map(c => c.id === sceneChar.id ? { ...c, position: e.target.value as any } : c) })} className="p-1 bg-zinc-700 border border-zinc-600 text-sm">
                                  <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
                                </select>
                                <select value={sceneChar.expression} onChange={(e) => updateScene(currentScene.id, { characters: currentScene.characters.map(c => c.id === sceneChar.id ? { ...c, expression: e.target.value } : c) })} className="p-1 bg-zinc-700 border border-zinc-600 text-xs">
                                  {char?.sprites.map((s, i) => (<option key={i} value={s.expression}>{s.expression}</option>))}
                                </select>
                                <button onClick={() => updateScene(currentScene.id, { characters: currentScene.characters.map(c => c.id === sceneChar.id ? { ...c, visible: !c.visible } : c) })} className={`p-1 ${sceneChar.visible ? "text-white" : "text-zinc-500"}`}>
                                  {sceneChar.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>
                                <button onClick={() => removeCharacterFromScene(currentScene.id, sceneChar.id)} className="p-1 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                              </div>
                              {availableSprites.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto">
                                  {availableSprites.map((sprite, idx) => (
                                    <div key={idx} onClick={() => updateScene(currentScene.id, { characters: currentScene.characters.map(c => c.id === sceneChar.id ? { ...c, expression: sprite.expression } : c) })}
                                      className={`flex-shrink-0 border-2 cursor-pointer overflow-hidden ${sceneChar.expression === sprite.expression ? "border-white" : "border-zinc-600 hover:border-zinc-400"}`}>
                                      <div className="w-16 h-16"><img src={sprite.url} className="w-full h-full object-cover" /></div>
                                      <div className="text-[8px] text-center py-0.5 bg-zinc-700 truncate px-1">{sprite.expression}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {availableSprites.length === 0 && <p className="text-xs text-zinc-500">No sprites imported. Add sprites in Characters tab.</p>}
                            </div>
                          );
                        })}
                        {currentScene.characters.length === 0 && <div className="text-center py-8 text-zinc-500"><User className="w-8 h-8 mx-auto mb-2" /><p className="text-sm">No characters in this scene. Add them above.</p></div>}
                      </div>
                    )}

                    {editMode === "dialogue" && currentScene && currentScene.dialogue.length === 0 && (
                      <div className="text-center py-8 text-zinc-500"><MessageSquare className="w-8 h-8 mx-auto mb-2" /><p className="text-sm">No dialogue yet. Click "Add Line" to start.</p></div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={handleBackgroundUpload} />
        <input ref={spriteInputRef} type="file" accept="image/*" className="hidden" onChange={handleSpriteUpload} />

        {showAIGen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-zinc-700 p-6 w-[500px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2"><Wand2 className="w-5 h-5" /> AI Generate {aiTarget === "background" ? "Background" : "Sprite"}</h3>
                <button onClick={() => setShowAIGen(false)} className="p-2 hover:bg-zinc-800"><X className="w-4 h-4" /></button>
              </div>
              <AIGenerator type="vn" onImageGenerated={handleAIGenerated} />
            </div>
          </div>
        )}

        {showFxBrowser && (
          <div className="fixed top-16 right-4 w-96 max-h-[80vh] bg-black border border-purple-500/30 shadow-[4px_4px_0px_0px_rgba(168,85,247,0.3)] z-50 overflow-hidden flex flex-col">
            <FxBrowserPanel
              onClose={() => setShowFxBrowser(false)}
              useLabel="Use as Background"
              onSelectEffect={(effect: FxEffect) => {
                if (effect.preview_data_url) {
                  const newBg = { id: `fx_${Date.now()}`, name: effect.name, url: effect.preview_data_url };
                  setBackgrounds(prev => [...prev, newBg]);
                  if (currentScene) {
                    updateScene(currentScene.id, { background: newBg.id });
                  }
                  toast.success(`"${effect.name}" added as scene background`);
                  setShowFxBrowser(false);
                } else {
                  toast.error("This effect has no preview image");
                }
              }}
            />
          </div>
        )}
      </div>
    </Layout>
  );
}
