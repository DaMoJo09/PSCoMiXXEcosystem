import { Layout } from "@/components/layout/Layout";
import { 
  Save, Download, GitBranch, Plus, AlertCircle, Link as LinkIcon,
  ArrowLeft, Play, Copy, RefreshCw, ChevronRight, Trash2, Image as ImageIcon,
  Upload, Wand2, X, Edit, Search, Maximize2, Minimize2, Map,
  Variable, Filter, Eye, EyeOff, Code, Sparkles
} from "lucide-react";
import { FxBrowserPanel } from "@/components/FxBrowserPanel";
import type { FxEffect } from "@/lib/api";
import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { AIGenerator } from "@/components/tools/AIGenerator";
import { useProject, useUpdateProject, useCreateProject } from "@/hooks/useProjects";
import { toast } from "sonner";
import { useSyncToCoMiXX } from "@/hooks/useSyncToCoMiXX";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";

type NodeColor = "default" | "blue" | "green" | "red" | "yellow" | "purple";

interface VarEffect {
  variable: string;
  operation: "set" | "add" | "toggle";
  value: string | number | boolean;
}

interface ChoiceCondition {
  variable: string;
  operator: "==" | "!=" | ">" | "<" | ">=" | "<=";
  value: string | number | boolean;
}

interface CYOAChoice {
  label: string;
  target: string;
  condition?: ChoiceCondition;
  effects?: VarEffect[];
}

interface CYOANode {
  id: string;
  title?: string;
  text: string;
  choices: CYOAChoice[];
  isEnding?: boolean;
  endingType?: "good" | "bad" | "neutral";
  image?: string;
  color?: NodeColor;
  effects?: VarEffect[];
}

interface CYOABackground {
  id: string;
  name: string;
  url: string;
}

interface StoryVariable {
  name: string;
  type: "number" | "boolean" | "string";
  defaultValue: string | number | boolean;
}

const NODE_COLORS: Record<NodeColor, { bg: string; border: string; label: string }> = {
  default: { bg: "bg-zinc-900", border: "border-white/30", label: "Default" },
  blue: { bg: "bg-blue-950", border: "border-blue-500", label: "Info" },
  green: { bg: "bg-green-950", border: "border-green-500", label: "Success" },
  red: { bg: "bg-red-950", border: "border-red-500", label: "Danger" },
  yellow: { bg: "bg-yellow-950", border: "border-yellow-500", label: "Warning" },
  purple: { bg: "bg-purple-950", border: "border-purple-500", label: "Special" },
};

const NODE_CARD_W = 280;
const NODE_CARD_H = 200;
const NODE_GAP_X = 60;
const NODE_GAP_Y = 40;
const COLS = 4;

const CYOA_TEMPLATES = [
  {
    id: "space",
    emoji: "\u{1F680}",
    title: "Space Adventure",
    desc: "Explore the galaxy, meet aliens, and save your crew!",
    gradient: "from-indigo-600 to-purple-700",
    nodes: [
      { id: "start", title: "Launch Day", text: "The spaceship rumbles beneath your feet. Captain Zara's voice crackles over the intercom: 'Crew, we've detected two signals — one from a mysterious planet, another from a drifting space station. Where should we investigate first?'", choices: [{ label: "\u{1F30D} Head to the mysterious planet", target: "planet" }, { label: "\u{1F6F8} Dock at the space station", target: "station" }], color: "blue" as NodeColor },
      { id: "planet", title: "Strange Planet", text: "Your ship lands in a valley filled with glowing crystals. A friendly alien creature waves at you with three arms! It seems to want to show you something deeper in the crystal caves.", choices: [{ label: "\u{1F48E} Follow the alien into the caves", target: "caves" }, { label: "\u{1F4E1} Stay at the ship and scan for signals", target: "signal" }], color: "purple" as NodeColor },
      { id: "station", title: "Space Station", text: "The station looks abandoned... but you hear a faint beeping sound. In the control room, you find a robot that seems to be sending a distress signal. Its screen flickers with a message.", choices: [{ label: "\u{1F916} Help fix the robot", target: "robot_good" }, { label: "\u{1F50D} Search the rest of the station first", target: "station_explore" }], color: "blue" as NodeColor },
      { id: "caves", title: "Crystal Caves", text: "The caves shimmer with every color of the rainbow! The alien leads you to a chamber where you find a star map showing the way home — and a shortcut through a wormhole!", choices: [{ label: "\u{2B50} Take the star map home", target: "ending_hero" }], isEnding: false, color: "purple" as NodeColor },
      { id: "signal", title: "Mystery Signal", text: "Your scanner picks up a coded message: 'If you can read this, bring crystals to Station 7.' It's from the space station! Maybe the robot there needs these crystals to power up.", choices: [{ label: "\u{1F48E} Gather crystals and fly to the station", target: "robot_good" }], color: "yellow" as NodeColor },
      { id: "robot_good", title: "Robot Rescue", text: "You repair the robot and it comes to life! 'Thank you, friend! I am Navigator Bot 7. I know the safest route through every galaxy. Let me guide you home!' The robot joins your crew!", choices: [{ label: "\u{1F389} Head home with your new robot friend!", target: "ending_hero" }], color: "green" as NodeColor },
      { id: "station_explore", title: "Hidden Lab", text: "Behind a locked door, you discover an old science lab with amazing inventions — a gravity boots prototype and a universal translator! But you hear footsteps approaching...", choices: [{ label: "\u{1F45F} Grab the gravity boots and hide", target: "ending_hero" }, { label: "\u{1F44B} Call out and introduce yourself", target: "robot_good" }], color: "yellow" as NodeColor },
      { id: "ending_hero", title: "Home Sweet Home", text: "You return to Earth as heroes! Your discoveries help scientists understand the universe better, and your adventure inspires kids everywhere to dream of the stars. THE END \u{2B50}", choices: [], isEnding: true, endingType: "good" as const, color: "green" as NodeColor },
    ],
  },
  {
    id: "fairy",
    emoji: "\u{1F9DA}",
    title: "Fairy Tale Quest",
    desc: "A magical kingdom needs your help! Befriend dragons and outsmart trolls.",
    gradient: "from-pink-500 to-rose-600",
    nodes: [
      { id: "start", title: "The Enchanted Forest", text: "You find a golden letter on your doorstep: 'Dear Brave One, the Magic Crown has been stolen! Without it, flowers won't bloom and rainbows won't shine. Please help us!' Signed, The Forest Friends.", choices: [{ label: "\u{1F333} Enter the Enchanted Forest", target: "forest" }, { label: "\u{1F3F0} Go straight to the castle", target: "castle" }], color: "purple" as NodeColor },
      { id: "forest", title: "Meeting the Fox", text: "A clever fox wearing a tiny scarf approaches you. 'I saw the troll take the crown toward the mountain! But the path is tricky. I can guide you through the safe route, or you can take the shortcut through the dragon's garden.'", choices: [{ label: "\u{1F98A} Follow the fox safely", target: "fox_path" }, { label: "\u{1F409} Brave the dragon's garden", target: "dragon" }], color: "yellow" as NodeColor },
      { id: "castle", title: "The Wise Owl", text: "At the castle, a wise owl sits on the throne. 'The troll won't give back the crown easily. You'll need either the Dragon's Fire Flower or the Fox's Magic Compass to find him. Which friend will you seek?'", choices: [{ label: "\u{1F98A} Find the fox", target: "forest" }, { label: "\u{1F409} Visit the dragon", target: "dragon" }], color: "blue" as NodeColor },
      { id: "fox_path", title: "Hidden Waterfall", text: "The fox leads you to a beautiful hidden waterfall. Behind it, there's a secret tunnel! 'This leads right to the troll's cave,' whispers the fox. 'But let's be quiet...'", choices: [{ label: "\u{1F910} Sneak in quietly", target: "troll_kind" }], color: "green" as NodeColor },
      { id: "dragon", title: "The Friendly Dragon", text: "The dragon isn't scary at all — she's painting flowers on rocks! 'Oh, the crown? That silly troll borrowed it for his birthday party and forgot to return it. Here, take this Fire Flower — it lights up dark caves!'", choices: [{ label: "\u{1F338} Take the flower and find the troll", target: "troll_kind" }], color: "red" as NodeColor },
      { id: "troll_kind", title: "The Troll's Apology", text: "You find the troll... crying! 'I'm so sorry! I just wanted to wear it for ONE day because it's so pretty. I didn't know it would stop the rainbows!' He hands you the crown with a big sniff.", choices: [{ label: "\u{1F451} Return the crown and invite the troll to the celebration!", target: "ending_happy" }], color: "green" as NodeColor },
      { id: "ending_happy", title: "Rainbow Festival!", text: "With the crown restored, rainbows burst across the sky and flowers bloom everywhere! The whole kingdom celebrates, and even the troll gets to wear a special friendship crown. Everyone is happy! THE END \u{1F308}", choices: [], isEnding: true, endingType: "good" as const, color: "green" as NodeColor },
    ],
  },
  {
    id: "mystery",
    emoji: "\u{1F50D}",
    title: "Mystery Detective",
    desc: "Solve the case of the missing school mascot!",
    gradient: "from-amber-500 to-orange-600",
    nodes: [
      { id: "start", title: "The Missing Mascot", text: "Oh no! Buddy the school bulldog mascot costume has vanished right before the big game! Principal Park asks you to help. You find a trail of glitter leading two ways — toward the art room and the gym.", choices: [{ label: "\u{1F3A8} Follow the glitter to the art room", target: "art_room" }, { label: "\u{1F3C0} Check the gym", target: "gym" }], color: "yellow" as NodeColor },
      { id: "art_room", title: "Art Room Clues", text: "In the art room, you find Ms. Chen working on a big banner. 'Buddy? I haven't seen him, but I noticed muddy footprints heading toward the garden earlier. Also, someone borrowed my gold paint — very suspicious!'", choices: [{ label: "\u{1F43E} Follow the muddy footprints", target: "garden" }, { label: "\u{1F3C0} Check the gym too", target: "gym" }], color: "blue" as NodeColor },
      { id: "gym", title: "Gym Discovery", text: "Coach Williams is setting up for the game. 'I saw someone carrying something big and fuzzy toward the music room about an hour ago. They were humming the school fight song!' You also spot a piece of fake fur on the floor.", choices: [{ label: "\u{1F3B5} Head to the music room", target: "music_room" }], color: "blue" as NodeColor },
      { id: "garden", title: "The School Garden", text: "In the garden, you find more muddy footprints and... is that a bulldog ear sticking out from behind the shed? Wait, it's just a stuffed animal. But there IS a note: 'Meet me in the music room for the BIG SURPRISE!'", choices: [{ label: "\u{1F3B5} Rush to the music room!", target: "music_room" }], color: "yellow" as NodeColor },
      { id: "music_room", title: "Case Solved!", text: "You burst into the music room and find... the entire Spirit Committee! They've been secretly decorating Buddy with a brand new sparkly cape and crown for a surprise halftime show! 'You found us! Want to help with the surprise?'", choices: [{ label: "\u{1F389} Join the surprise team!", target: "ending_solved" }], color: "green" as NodeColor },
      { id: "ending_solved", title: "The Big Reveal!", text: "At halftime, Buddy bursts onto the field with his amazing new cape, and the crowd goes WILD! Principal Park gives you a Junior Detective badge. Best. Game. Ever! THE END \u{1F3C6}", choices: [], isEnding: true, endingType: "good" as const, color: "green" as NodeColor },
    ],
  },
  {
    id: "animals",
    emoji: "\u{1F43E}",
    title: "Animal Friends",
    desc: "Help forest animals prepare for the big talent show!",
    gradient: "from-emerald-500 to-teal-600",
    nodes: [
      { id: "start", title: "Talent Show Day", text: "The forest is buzzing with excitement! The Annual Animal Talent Show is tonight, but three friends need your help getting ready. Bear forgot his dance moves, Rabbit's magic trick went wrong, and Owl lost her singing voice!", choices: [{ label: "\u{1F43B} Help Bear with his dance", target: "bear" }, { label: "\u{1F430} Fix Rabbit's magic trick", target: "rabbit" }, { label: "\u{1F989} Help Owl find her voice", target: "owl" }], color: "green" as NodeColor },
      { id: "bear", title: "Bear's Big Dance", text: "Bear is trying to do the moonwalk but keeps tripping! 'I watched a video but my feet are too big!' You could teach him an easier dance, or help him turn his tripping into a funny comedy act.", choices: [{ label: "\u{1F483} Teach Bear the Cha-Cha Slide", target: "show_time" }, { label: "\u{1F923} Turn trips into a comedy routine", target: "show_time" }], color: "yellow" as NodeColor },
      { id: "rabbit", title: "Rabbit's Magic", text: "Rabbit pulls off her top hat... and instead of a dove, out pops a very confused frog! 'That's NOT what was supposed to happen!' The frog ribbits happily. Maybe the frog could BE the act?", choices: [{ label: "\u{1F438} Make it a frog magic show!", target: "show_time" }, { label: "\u{1F3A9} Practice the trick until it works", target: "show_time" }], color: "purple" as NodeColor },
      { id: "owl", title: "Owl's Lost Voice", text: "Owl opens her beak and only a tiny squeak comes out! She's been practicing too hard. You find some honey tea and a warm scarf. 'Maybe I could do a spoken word poem instead?' she whispers.", choices: [{ label: "\u{2615} Honey tea + warm-up exercises", target: "show_time" }, { label: "\u{1F4DD} Help write an amazing poem", target: "show_time" }], color: "blue" as NodeColor },
      { id: "show_time", title: "Showtime!", text: "The curtain rises and ALL three friends perform together — Bear's funny dancing, Rabbit's frog magic, and Owl's beautiful voice combine into the most amazing group act ever! The forest crowd gives a standing ovation!", choices: [{ label: "\u{1F3C6} Take a bow together!", target: "ending_star" }], color: "green" as NodeColor },
      { id: "ending_star", title: "Best Show Ever!", text: "The judges award the 'Best Friends Forever' trophy! Bear, Rabbit, and Owl lift you on their shoulders. 'We couldn't have done it without you!' The fireflies put on a light show as everyone celebrates. THE END \u{2B50}", choices: [], isEnding: true, endingType: "good" as const, color: "green" as NodeColor },
    ],
  },
  {
    id: "superhero",
    emoji: "\u{1F9B8}",
    title: "Superhero Academy",
    desc: "Discover your superpower and save Mega City!",
    gradient: "from-red-500 to-rose-600",
    nodes: [
      { id: "start", title: "Power Discovery Day", text: "Welcome to Superhero Academy! Today you discover your superpower. Professor Pulse holds up three glowing orbs: 'Each orb contains a different power. Choose wisely, young hero — Mega City needs you!'", choices: [{ label: "\u{26A1} Lightning Speed (yellow orb)", target: "speed" }, { label: "\u{1F4AA} Super Strength (red orb)", target: "strength" }, { label: "\u{1F9E0} Mind Reading (blue orb)", target: "mind" }], color: "red" as NodeColor },
      { id: "speed", title: "Lightning Fast!", text: "ZAP! You can run faster than a race car! Your first mission: a kitten is stuck on top of City Tower and a storm is coming. You zoom up the building in 2 seconds flat and rescue the kitten!", choices: [{ label: "\u{1F408} Save the kitten and find the storm's source", target: "villain" }], color: "yellow" as NodeColor },
      { id: "strength", title: "Super Strong!", text: "BOOM! You lift the training boulder with one hand! Your first mission: a bridge is cracking and a school bus is stuck on it. You hold up the bridge while everyone crosses safely!", choices: [{ label: "\u{1F68C} Save the bus and track the cause", target: "villain" }], color: "red" as NodeColor },
      { id: "mind", title: "Mind Power!", text: "WHOOSH! You can hear thoughts! Your first mission: someone is planning to turn off all the lights in the city. You read their thoughts and discover it's not a villain — it's a lonely robot who just wants friends!", choices: [{ label: "\u{1F916} Talk to the robot and understand", target: "kind_ending" }], color: "blue" as NodeColor },
      { id: "villain", title: "The Weather Machine", text: "You track the storm to an old warehouse where you find... a kid your age! 'I built a weather machine for my science fair project but it went haywire! I can't turn it off!' They look really scared.", choices: [{ label: "\u{1F91D} Help them fix it together", target: "kind_ending" }, { label: "\u{26A1} Use your power to disable it", target: "kind_ending" }], color: "purple" as NodeColor },
      { id: "kind_ending", title: "Heroes Are Kind", text: "You solve the problem with kindness instead of fighting! Professor Pulse gives you the Golden Heart badge: 'The greatest superpower isn't speed or strength — it's compassion.' You and your new friend become the best hero team ever!", choices: [{ label: "\u{1F31F} Graduate as a hero!", target: "ending_super" }], color: "green" as NodeColor },
      { id: "ending_super", title: "Graduation Day!", text: "The whole city cheers as you receive your Hero Certificate! 'Remember,' says Professor Pulse, 'every kid has a superpower — being kind, being brave, being YOU.' You fly off into the sunset, ready for your next adventure! THE END \u{1F31F}", choices: [], isEnding: true, endingType: "good" as const, color: "green" as NodeColor },
    ],
  },
];

function TypewriterText({ text, speed = 30, onComplete }: { text: string; speed?: number; onComplete?: () => void }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed(""); setDone(false); let i = 0;
    if (speed <= 0) { setDisplayed(text); setDone(true); onComplete?.(); return; }
    const interval = setInterval(() => { i++; if (i >= text.length) { setDisplayed(text); setDone(true); onComplete?.(); clearInterval(interval); } else { setDisplayed(text.slice(0, i)); } }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return (<span>{displayed}{!done && <span className="animate-pulse">|</span>}</span>);
}

function evaluateCondition(condition: ChoiceCondition, vars: Record<string, any>): boolean {
  const val = vars[condition.variable];
  if (val === undefined) return false;
  const target = condition.value;
  switch (condition.operator) {
    case "==": return val == target;
    case "!=": return val != target;
    case ">": return Number(val) > Number(target);
    case "<": return Number(val) < Number(target);
    case ">=": return Number(val) >= Number(target);
    case "<=": return Number(val) <= Number(target);
    default: return true;
  }
}

function applyEffects(effects: VarEffect[], vars: Record<string, any>): Record<string, any> {
  const newVars = { ...vars };
  effects.forEach(eff => {
    switch (eff.operation) {
      case "set": newVars[eff.variable] = eff.value; break;
      case "add": newVars[eff.variable] = (Number(newVars[eff.variable]) || 0) + Number(eff.value); break;
      case "toggle": newVars[eff.variable] = !newVars[eff.variable]; break;
    }
  });
  return newVars;
}

function NodeGraph({ nodes, selectedNodeId, onSelectNode, onEditNode }: {
  nodes: CYOANode[]; selectedNodeId: string | null; onSelectNode: (id: string) => void; onEditNode: (id: string) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mainNodes = nodes.filter(n => !n.id.startsWith("ending"));
  
  const nodePositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    mainNodes.forEach((node, idx) => { positions[node.id] = { x: (idx % COLS) * (NODE_CARD_W + NODE_GAP_X) + 20, y: Math.floor(idx / COLS) * (NODE_CARD_H + NODE_GAP_Y) + 20 }; });
    let endingIdx = 0;
    nodes.filter(n => n.id.startsWith("ending")).forEach(node => { positions[node.id] = { x: (endingIdx % COLS) * (NODE_CARD_W + NODE_GAP_X) + 20, y: (Math.ceil(mainNodes.length / COLS) + Math.floor(endingIdx / COLS)) * (NODE_CARD_H + NODE_GAP_Y) + 20 }; endingIdx++; });
    return positions;
  }, [nodes]);

  const connections = useMemo(() => {
    const lines: { from: string; to: string; label: string; hasCondition: boolean }[] = [];
    nodes.forEach(node => { node.choices.forEach(choice => { if (nodePositions[node.id] && nodePositions[choice.target]) lines.push({ from: node.id, to: choice.target, label: choice.label, hasCondition: !!choice.condition }); }); });
    return lines;
  }, [nodes, nodePositions]);

  const maxX = Math.max(...Object.values(nodePositions).map(p => p.x + NODE_CARD_W + 40), 800);
  const maxY = Math.max(...Object.values(nodePositions).map(p => p.y + NODE_CARD_H + 40), 600);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-auto">
      <div className="relative" style={{ width: maxX, height: maxY, minWidth: "100%", minHeight: "100%" }}>
        <svg ref={svgRef} className="absolute inset-0 pointer-events-none" style={{ width: maxX, height: maxY }}>
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="rgba(255,255,255,0.3)" /></marker>
            <marker id="arrowhead-cond" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="rgba(168,85,247,0.5)" /></marker>
          </defs>
          {connections.map((conn, i) => {
            const fromPos = nodePositions[conn.from]; const toPos = nodePositions[conn.to];
            if (!fromPos || !toPos) return null;
            const fromX = fromPos.x + NODE_CARD_W / 2; const fromY = fromPos.y + NODE_CARD_H;
            const toX = toPos.x + NODE_CARD_W / 2; const toY = toPos.y; const midY = (fromY + toY) / 2;
            return (<g key={i}><path d={`M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`} fill="none" stroke={conn.hasCondition ? "rgba(168,85,247,0.3)" : "rgba(255,255,255,0.15)"} strokeWidth="2" strokeDasharray={conn.hasCondition ? "5,3" : undefined} markerEnd={conn.hasCondition ? "url(#arrowhead-cond)" : "url(#arrowhead)"} /></g>);
          })}
        </svg>

        {nodes.map((node) => {
          const pos = nodePositions[node.id]; if (!pos) return null;
          const colorScheme = NODE_COLORS[node.color || (node.isEnding ? "green" : "default")];
          const hasEffects = node.effects && node.effects.length > 0;
          const hasCondChoices = node.choices.some(c => c.condition);
          return (
            <div key={node.id} className={`absolute p-3 border-2 shadow-lg cursor-pointer transition-all hover:shadow-xl ${colorScheme.bg} ${node.isEnding ? "border-green-500" : colorScheme.border} ${selectedNodeId === node.id ? "ring-2 ring-white ring-offset-1 ring-offset-zinc-950" : ""}`}
              style={{ left: pos.x, top: pos.y, width: NODE_CARD_W, height: NODE_CARD_H }} onClick={() => onSelectNode(node.id)} onDoubleClick={() => onEditNode(node.id)}>
              {node.image && <div className="absolute inset-0 opacity-20 overflow-hidden"><img src={node.image} className="w-full h-full object-cover" /></div>}
              <div className="relative z-10 h-full flex flex-col">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-xs uppercase truncate flex-1">{node.title || (node.isEnding ? "ENDING" : node.id)}</span>
                  <div className="flex gap-0.5 ml-1">
                    {hasEffects && <Variable className="w-3 h-3 text-purple-400" title="Sets variables" />}
                    {hasCondChoices && <Filter className="w-3 h-3 text-amber-400" title="Has conditions" />}
                  </div>
                </div>
                <p className="text-[11px] font-mono text-zinc-400 line-clamp-4 flex-1">{node.text}</p>
                {node.choices.length > 0 && (
                  <div className="mt-auto pt-2 border-t border-zinc-700/50 space-y-0.5">
                    {node.choices.slice(0, 3).map((choice, i) => (
                      <div key={i} className="text-[9px] text-zinc-500 flex items-center gap-1 truncate">
                        {choice.condition ? <Filter className="w-2 h-2 flex-shrink-0 text-amber-400" /> : <LinkIcon className="w-2 h-2 flex-shrink-0" />}
                        <span className="truncate">{choice.label}</span>
                      </div>
                    ))}
                    {node.choices.length > 3 && <div className="text-[9px] text-zinc-600">+{node.choices.length - 3} more</div>}
                  </div>
                )}
                {node.isEnding && <div className={`text-[9px] font-bold uppercase mt-1 ${node.endingType === "good" ? "text-green-400" : node.endingType === "bad" ? "text-red-400" : "text-yellow-400"}`}>{node.endingType || "neutral"} ending</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VarEffectEditor({ effects, variables, onChange }: { effects: VarEffect[]; variables: StoryVariable[]; onChange: (effects: VarEffect[]) => void }) {
  return (
    <div className="space-y-1">
      {effects.map((eff, i) => (
        <div key={i} className="flex gap-1 items-center">
          <select value={eff.variable} onChange={(e) => { const ne = [...effects]; ne[i] = { ...eff, variable: e.target.value }; onChange(ne); }} className="flex-1 p-1 bg-zinc-800 border border-zinc-700 text-[10px]">
            <option value="">— variable —</option>
            {variables.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
          </select>
          <select value={eff.operation} onChange={(e) => { const ne = [...effects]; ne[i] = { ...eff, operation: e.target.value as any }; onChange(ne); }} className="w-16 p-1 bg-zinc-800 border border-zinc-700 text-[10px]">
            <option value="set">set</option><option value="add">add</option><option value="toggle">toggle</option>
          </select>
          {eff.operation !== "toggle" && (
            <input value={String(eff.value)} onChange={(e) => { const ne = [...effects]; ne[i] = { ...eff, value: isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value) }; onChange(ne); }} className="w-16 p-1 bg-zinc-800 border border-zinc-700 text-[10px]" placeholder="value" />
          )}
          <button onClick={() => onChange(effects.filter((_, j) => j !== i))} className="p-0.5 hover:text-red-400"><X className="w-3 h-3" /></button>
        </div>
      ))}
      <button onClick={() => onChange([...effects, { variable: variables[0]?.name || "", operation: "set", value: "" }])} className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1"><Plus className="w-3 h-3" /> Add Effect</button>
    </div>
  );
}

function ConditionEditor({ condition, variables, onChange, onRemove }: { condition?: ChoiceCondition; variables: StoryVariable[]; onChange: (c: ChoiceCondition) => void; onRemove: () => void }) {
  if (!condition) {
    return (
      <button onClick={() => onChange({ variable: variables[0]?.name || "", operator: "==", value: "" })} className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1"><Filter className="w-3 h-3" /> Add Condition</button>
    );
  }
  return (
    <div className="flex gap-1 items-center bg-amber-500/10 border border-amber-500/20 p-1 rounded">
      <span className="text-[10px] text-amber-400 font-bold">IF</span>
      <select value={condition.variable} onChange={(e) => onChange({ ...condition, variable: e.target.value })} className="flex-1 p-0.5 bg-zinc-800 border border-zinc-700 text-[10px]">
        <option value="">—</option>
        {variables.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
      </select>
      <select value={condition.operator} onChange={(e) => onChange({ ...condition, operator: e.target.value as any })} className="w-12 p-0.5 bg-zinc-800 border border-zinc-700 text-[10px]">
        <option value="==">==</option><option value="!=">!=</option><option value={">"}>{">"}</option><option value={"<"}>{"<"}</option><option value={">="}>{"≥"}</option><option value={"<="}>{"≤"}</option>
      </select>
      <input value={String(condition.value)} onChange={(e) => onChange({ ...condition, value: isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value) })} className="w-14 p-0.5 bg-zinc-800 border border-zinc-700 text-[10px]" placeholder="value" />
      <button onClick={onRemove} className="p-0.5 hover:text-red-400"><X className="w-3 h-3" /></button>
    </div>
  );
}

function ScriptView({ nodes, variables }: { nodes: CYOANode[]; variables: StoryVariable[] }) {
  return (
    <div className="absolute inset-0 overflow-auto p-4 font-mono text-sm leading-relaxed bg-zinc-950">
      {variables.length > 0 && (
        <div className="text-zinc-600 mb-4">
          {variables.map(v => (
            <div key={v.name}><span className="text-purple-400">default</span> {v.name} = <span className="text-orange-300">{JSON.stringify(v.defaultValue)}</span></div>
          ))}
        </div>
      )}
      {nodes.map(node => (
        <div key={node.id} className="mb-4">
          <div className="text-cyan-400">label {node.id}:</div>
          <div className="ml-4">
            {node.title && <div className="text-zinc-500"># {node.title}</div>}
            {node.effects && node.effects.length > 0 && node.effects.map((eff, i) => (
              <div key={i} className="text-purple-400">$ {eff.variable} {eff.operation === "set" ? "=" : eff.operation === "add" ? "+=" : "= not"} {eff.operation !== "toggle" ? JSON.stringify(eff.value) : eff.variable}</div>
            ))}
            <div className="text-orange-300 whitespace-pre-wrap">"{node.text.substring(0, 200)}{node.text.length > 200 ? "..." : ""}"</div>
            {node.choices.length > 0 && (
              <div className="mt-1">
                <div className="text-pink-400">menu:</div>
                {node.choices.map((c, ci) => (
                  <div key={ci} className="ml-4">
                    {c.condition && <div className="text-amber-400">if {c.condition.variable} {c.condition.operator} {JSON.stringify(c.condition.value)}:</div>}
                    <div className={c.condition ? "ml-4" : ""}><span className="text-orange-300">"{c.label}"</span>:</div>
                    <div className={`${c.condition ? "ml-8" : "ml-4"} text-zinc-500`}>
                      {c.effects && c.effects.map((eff, ei) => <span key={ei} className="text-purple-400 block">$ {eff.variable} {eff.operation === "set" ? "=" : eff.operation === "add" ? "+=" : "= not"} {eff.operation === "toggle" ? eff.variable : JSON.stringify(eff.value)}</span>)}
                      <span className="text-blue-400">jump</span> {c.target}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {node.isEnding && <div className="text-green-400">return # {node.endingType || "neutral"} ending</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CYOABuilder() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const projectId = searchParams.get('id');
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const effectiveProjectId = projectId || createdProjectId;
  
  const { data: project } = useProject(effectiveProjectId || '');
  const updateProject = useUpdateProject();
  const createProject = useCreateProject();

  const [title, setTitle] = useState("Untitled CYOA");
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(!effectiveProjectId);

  const { syncAsset, isSyncing: isSyncingToCoMiXX } = useSyncToCoMiXX({
    defaultTag: "interior-page",
    sourceMode: "/creator/cyoa",
    projectId: effectiveProjectId || undefined,
  });
  const creationAttempted = useRef(false);
  const [storyText, setStoryText] = useState("");
  const [branchPoints, setBranchPoints] = useState(5);
  const [optionsPerBranch, setOptionsPerBranch] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [nodes, setNodes] = useState<CYOANode[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);
  const [currentNode, setCurrentNode] = useState<string | null>(null);
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [backgrounds, setBackgrounds] = useState<CYOABackground[]>([]);
  const [showAIGen, setShowAIGen] = useState(false);
  const [activeTab, setActiveTab] = useState<"story" | "nodes" | "variables" | "assets">("story");
  const [viewMode, setViewMode] = useState<"cards" | "graph" | "script">("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [typewriterDone, setTypewriterDone] = useState(false);
  const [textSpeed, setTextSpeed] = useState(30);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showFxBrowser, setShowFxBrowser] = useState(false);
  const [endingsFound, setEndingsFound] = useState<Set<string>>(new Set());
  const [storyVariables, setStoryVariables] = useState<StoryVariable[]>([]);
  const [runtimeVars, setRuntimeVars] = useState<Record<string, any>>({});
  const [showVarDebug, setShowVarDebug] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const autoSaveInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingSaveRef = useRef(false);
  const initialLoadDoneRef = useRef(false);
  const latestDataRef = useRef({ title, nodes, storyText, branchPoints, optionsPerBranch, backgrounds, storyVariables, projectId: effectiveProjectId });
  latestDataRef.current = { title, nodes, storyText, branchPoints, optionsPerBranch, backgrounds, storyVariables, projectId: effectiveProjectId };

  const fireXpAction = (action: string) => { fetch("/api/xp/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }), credentials: "include" }); };

  const stats = useMemo(() => {
    const wordCount = nodes.reduce((sum, n) => sum + n.text.split(/\s+/).filter(Boolean).length, 0);
    const endingCount = nodes.filter(n => n.isEnding).length;
    const choiceCount = nodes.reduce((sum, n) => sum + n.choices.length, 0);
    const condCount = nodes.reduce((sum, n) => sum + n.choices.filter(c => c.condition).length, 0);
    return { nodeCount: nodes.length, wordCount, endingCount, choiceCount, condCount };
  }, [nodes]);

  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return nodes;
    const q = searchQuery.toLowerCase();
    return nodes.filter(n => n.text.toLowerCase().includes(q) || n.id.toLowerCase().includes(q) || (n.title || "").toLowerCase().includes(q) || n.choices.some(c => c.label.toLowerCase().includes(q)));
  }, [nodes, searchQuery]);

  useEffect(() => {
    if (effectiveProjectId && nodes.length > 0) {
      autoSaveInterval.current = setInterval(() => {
        if (!pendingSaveRef.current) return;
        updateProject.mutateAsync({ id: effectiveProjectId, data: { title, data: { nodes, storyText, branchPoints, optionsPerBranch, backgrounds, storyVariables } } }).then(() => { pendingSaveRef.current = false; }).catch(() => {});
      }, 30000);
    }
    return () => { if (autoSaveInterval.current) clearInterval(autoSaveInterval.current); };
  }, [effectiveProjectId, nodes, title, storyText, branchPoints, optionsPerBranch, backgrounds, storyVariables]);

  useEffect(() => {
    if (projectId) { setIsCreating(false); return; }
    if (creationAttempted.current) return;
    creationAttempted.current = true; setIsCreating(true);
    let cancelled = false;
    const timeoutId = setTimeout(() => { if (cancelled) return; setIsCreating(false); toast.error("Project creation timed out"); }, 15000);
    fetch("/api/projects?fields=meta", { credentials: "include" })
      .then(res => res.ok ? res.json() : Promise.reject(new Error("Failed")))
      .then((allProjects: any[]) => {
        if (cancelled) return;
        const existing = allProjects.filter((p: any) => p.type === "cyoa").sort((a: any, b: any) => {
          const aHasData = a.updatedAt !== a.createdAt; const bHasData = b.updatedAt !== b.createdAt;
          if (aHasData && !bHasData) return -1; if (!aHasData && bHasData) return 1;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
        if (existing.length > 0) { clearTimeout(timeoutId); setCreatedProjectId(existing[0].id); setIsCreating(false); navigate(`/creator/cyoa?id=${existing[0].id}`, { replace: true }); return; }
        return createProject.mutateAsync({ title: "Untitled CYOA", type: "cyoa", status: "draft", data: { nodes: [], storyText: "", branchPoints: 5, optionsPerBranch: 3, backgrounds: [], storyVariables: [] } })
          .then((p) => { if (cancelled) return; clearTimeout(timeoutId); setCreatedProjectId(p.id); setIsCreating(false); navigate(`/creator/cyoa?id=${p.id}`, { replace: true }); });
      }).catch((err) => { if (cancelled) return; clearTimeout(timeoutId); toast.error(err?.message || "Failed"); setIsCreating(false); creationAttempted.current = false; });
    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [projectId]);

  useEffect(() => {
    if (project) {
      setTitle(project.title);
      const data = project.data as any;
      if (data?.nodes) setNodes(data.nodes);
      if (data?.storyText) setStoryText(data.storyText);
      if (data?.branchPoints) setBranchPoints(data.branchPoints);
      if (data?.optionsPerBranch) setOptionsPerBranch(data.optionsPerBranch);
      if (data?.backgrounds) setBackgrounds(data.backgrounds);
      if (data?.storyVariables) setStoryVariables(data.storyVariables);
      initialLoadDoneRef.current = true;
    }
  }, [project]);

  useEffect(() => { if (!effectiveProjectId || !initialLoadDoneRef.current) return; pendingSaveRef.current = true; }, [nodes, title, storyText, branchPoints, optionsPerBranch, backgrounds, storyVariables, effectiveProjectId]);

  useEffect(() => {
    return () => {
      if (pendingSaveRef.current) {
        const d = latestDataRef.current;
        if (d.projectId) navigator.sendBeacon(`/api/projects/${d.projectId}/autosave`, new Blob([JSON.stringify({ title: d.title, data: { nodes: d.nodes, storyText: d.storyText, branchPoints: d.branchPoints, optionsPerBranch: d.optionsPerBranch, backgrounds: d.backgrounds, storyVariables: d.storyVariables } })], { type: "application/json" }));
      }
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingSaveRef.current) {
        const d = latestDataRef.current;
        if (d.projectId) navigator.sendBeacon(`/api/projects/${d.projectId}/autosave`, new Blob([JSON.stringify({ title: d.title, data: { nodes: d.nodes, storyText: d.storyText, branchPoints: d.branchPoints, optionsPerBranch: d.optionsPerBranch, backgrounds: d.backgrounds, storyVariables: d.storyVariables } })], { type: "application/json" }));
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (!previewMode) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exitPreview();
      else if (e.key === " " || e.key === "Enter") { if (!typewriterDone) setTextSpeed(0); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [previewMode, typewriterDone]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (effectiveProjectId) await updateProject.mutateAsync({ id: effectiveProjectId, data: { title, data: { nodes, storyText, branchPoints, optionsPerBranch, backgrounds, storyVariables } } });
      pendingSaveRef.current = false; fireXpAction("save"); toast.success("Project saved");
    } catch (error: any) { toast.error(error?.message || "Save failed"); } finally { setIsSaving(false); }
  };

  const validateCYOA = () => {
    if (nodes.length === 0) { toast.error("No nodes to validate"); return; }
    const issues: string[] = [];
    const nodeIds = new Set(nodes.map(n => n.id));
    nodes.forEach(node => { node.choices.forEach(choice => { if (!nodeIds.has(choice.target)) issues.push(`Broken link: "${choice.label}" in ${node.id} → "${choice.target}"`); }); });
    if (nodes.length > 0) {
      const reachable = new Set<string>(); const queue = [nodes[0].id]; reachable.add(nodes[0].id);
      while (queue.length > 0) { const current = queue.shift()!; const cn = nodes.find(n => n.id === current); if (cn) cn.choices.forEach(choice => { if (nodeIds.has(choice.target) && !reachable.has(choice.target)) { reachable.add(choice.target); queue.push(choice.target); } }); }
      nodes.forEach(node => { if (!reachable.has(node.id)) issues.push(`Orphan node: "${node.id}" unreachable`); });
    }
    nodes.forEach(node => { if (!node.isEnding && node.choices.length === 0) issues.push(`Dead end: "${node.id}" has no choices and isn't an ending`); });
    const varNames = new Set(storyVariables.map(v => v.name));
    nodes.forEach(node => {
      node.effects?.forEach(eff => { if (!varNames.has(eff.variable)) issues.push(`Unknown variable "${eff.variable}" in node "${node.id}" effects`); });
      node.choices.forEach(c => { if (c.condition && !varNames.has(c.condition.variable)) issues.push(`Unknown variable "${c.condition.variable}" in choice condition of "${node.id}"`); c.effects?.forEach(eff => { if (!varNames.has(eff.variable)) issues.push(`Unknown variable "${eff.variable}" in choice effect of "${node.id}"`); }); });
    });
    if (issues.length === 0) toast.success("Validation passed!"); else { issues.slice(0, 5).forEach(i => toast.error(i, { duration: 5000 })); if (issues.length > 5) toast.warning(`And ${issues.length - 5} more issue(s)`); }
  };

  const generateCYOA = async () => {
    if (!storyText.trim()) { toast.error("Please paste a story first"); return; }
    setIsGenerating(true); await new Promise(r => setTimeout(r, 1500));
    const paragraphs = storyText.split(/\n\n+/).filter(p => p.trim());
    const segmentSize = Math.ceil(paragraphs.length / branchPoints);
    const generatedNodes: CYOANode[] = [];
    for (let i = 0; i < branchPoints; i++) {
      const segment = paragraphs.slice(i * segmentSize, (i + 1) * segmentSize).join("\n\n"); if (!segment) continue;
      const nodeId = `node_${i}`; const choices: CYOAChoice[] = [];
      if (i < branchPoints - 1) {
        for (let j = 0; j < optionsPerBranch; j++) {
          const labels = [["Continue forward","Take a different path","Wait and observe","Retreat"],["Accept the challenge","Decline politely","Ask for more info","Negotiate terms"],["Trust instincts","Follow evidence","Seek help","Go alone"]];
          choices.push({ label: labels[j % labels.length][i % 4], target: j === 0 ? `node_${i+1}` : `ending_${j}_${i}` });
        }
      }
      generatedNodes.push({ id: nodeId, title: `Chapter ${i+1}`, text: segment.substring(0, 2000) + (segment.length > 2000 ? "..." : ""), choices, isEnding: i === branchPoints - 1, endingType: i === branchPoints - 1 ? "good" : undefined, color: i === 0 ? "blue" : i === branchPoints - 1 ? "green" : "default" });
      if (i < branchPoints - 1) {
        for (let j = 1; j < optionsPerBranch; j++) generatedNodes.push({ id: `ending_${j}_${i}`, title: `Alternate Ending ${j}`, text: "Your choice leads to an unexpected outcome...", choices: [], isEnding: true, endingType: j === 1 ? "bad" : "neutral", color: j === 1 ? "red" : "yellow" });
      }
    }
    setNodes(generatedNodes); setIsGenerating(false); setActiveTab("nodes"); fireXpAction("generate"); toast.success("CYOA structure generated!");
  };

  const addNode = () => {
    const newNode: CYOANode = { id: `node_${Date.now()}`, title: "New Scene", text: "New story segment...", choices: [], color: "default" };
    setNodes([...nodes, newNode]); setSelectedNodeId(newNode.id); setEditingNode(newNode.id);
  };

  const updateNode = (id: string, updates: Partial<CYOANode>) => { setNodes(nodes.map(n => n.id === id ? { ...n, ...updates } : n)); };
  const deleteNode = (id: string) => { setNodes(nodes.filter(n => n.id !== id)); if (selectedNodeId === id) setSelectedNodeId(null); if (editingNode === id) setEditingNode(null); toast.success("Node deleted"); };
  const duplicateNode = (id: string) => { const node = nodes.find(n => n.id === id); if (!node) return; setNodes([...nodes, { ...JSON.parse(JSON.stringify(node)), id: `node_${Date.now()}`, title: `${node.title || node.id} (Copy)` }]); toast.success("Node duplicated"); };
  const addChoiceToNode = (nodeId: string) => { const node = nodes.find(n => n.id === nodeId); if (node) updateNode(nodeId, { choices: [...node.choices, { label: "New choice", target: nodes[0]?.id || "" }] }); };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      if (selectedNodeId) { updateNode(selectedNodeId, { image: url }); toast.success("Image added"); } else { setBackgrounds([...backgrounds, { id: `bg_${Date.now()}`, name: file.name.replace(/\.[^/.]+$/, ""), url }]); toast.success("Background added"); }
    };
    reader.readAsDataURL(file); e.target.value = "";
  };

  const handleAIGenerated = (url: string) => {
    if (selectedNodeId) { updateNode(selectedNodeId, { image: url }); toast.success("AI image added"); } else { setBackgrounds([...backgrounds, { id: `bg_${Date.now()}`, name: "AI Background", url }]); toast.success("AI background added"); }
    setShowAIGen(false);
  };

  const initRuntimeVars = () => {
    const vars: Record<string, any> = {};
    storyVariables.forEach(v => { vars[v.name] = v.defaultValue; });
    return vars;
  };

  const replayVarsForPath = (history: string[], choiceHistory?: CYOAChoice[]) => {
    let vars = initRuntimeVars();
    for (let i = 0; i < history.length; i++) {
      const node = nodes.find(n => n.id === history[i]);
      if (node?.effects) vars = applyEffects(node.effects, vars);
      if (choiceHistory && choiceHistory[i]?.effects) vars = applyEffects(choiceHistory[i].effects, vars);
    }
    return vars;
  };

  const [choiceHistory, setChoiceHistory] = useState<CYOAChoice[]>([]);

  const startPreview = (fromNodeId?: string) => {
    if (nodes.length === 0) { toast.error("Generate CYOA first"); return; }
    const startId = fromNodeId || nodes[0].id;
    setPreviewMode(true); setCurrentNode(startId); setPathHistory([startId]); setChoiceHistory([]); setTypewriterDone(false); setTextSpeed(30);
    const vars = initRuntimeVars();
    const startNode = nodes.find(n => n.id === startId);
    if (startNode?.effects) setRuntimeVars(applyEffects(startNode.effects, vars)); else setRuntimeVars(vars);
    if (!fromNodeId) setEndingsFound(new Set());
  };

  const selectChoice = (choice: CYOAChoice) => {
    let vars = { ...runtimeVars };
    if (choice.effects) vars = applyEffects(choice.effects, vars);
    const targetNode = nodes.find(n => n.id === choice.target);
    if (targetNode?.effects) vars = applyEffects(targetNode.effects, vars);
    setRuntimeVars(vars);
    setCurrentNode(choice.target); setPathHistory([...pathHistory, choice.target]); setChoiceHistory([...choiceHistory, choice]); setTypewriterDone(false); setTextSpeed(30);
    if (targetNode?.isEnding) setEndingsFound(prev => { const s = new Set(Array.from(prev)); s.add(choice.target); return s; });
  };

  const goBack = () => {
    if (pathHistory.length > 1) {
      const newHistory = pathHistory.slice(0, -1);
      const newChoiceHistory = choiceHistory.slice(0, -1);
      setPathHistory(newHistory); setChoiceHistory(newChoiceHistory); setCurrentNode(newHistory[newHistory.length - 1]); setTypewriterDone(false); setTextSpeed(30);
      setRuntimeVars(replayVarsForPath(newHistory, newChoiceHistory));
    }
  };

  const exitPreview = () => { setPreviewMode(false); setIsFullscreenPreview(false); setCurrentNode(null); setPathHistory([]); };

  const exportCYOA = (format: "cyoa" | "json" | "txt" | "html") => {
    let data: string; let mimeType = "text/plain";
    if (format === "html") {
      mimeType = "text/html";
      data = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',system-ui,sans-serif;background:#0a0a0a;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center}
.container{max-width:720px;width:100%;padding:2rem;position:relative}h1{font-size:1.8rem;margin-bottom:2rem;text-align:center}
.node-img{width:100%;aspect-ratio:16/9;object-fit:cover;margin-bottom:1.5rem;border:2px solid #3f3f46}.node-title{font-size:1.1rem;font-weight:bold;margin-bottom:0.8rem;text-transform:uppercase;letter-spacing:0.05em}
.node-text{background:#18181b;border:2px solid #3f3f46;padding:1.5rem;margin-bottom:1.5rem;white-space:pre-wrap;line-height:1.7;font-size:0.95rem}
.ending{text-transform:uppercase;font-weight:bold;font-size:0.8rem;margin-bottom:1rem;padding:0.5rem 1rem;display:inline-block}.ending.good{color:#22c55e;border:1px solid #22c55e}.ending.bad{color:#ef4444;border:1px solid #ef4444}.ending.neutral{color:#eab308;border:1px solid #eab308}
.choice{display:block;width:100%;padding:1.2rem;background:rgba(255,255,255,0.05);border:2px solid rgba(255,255,255,0.2);color:#fff;text-align:left;cursor:pointer;margin-bottom:0.5rem;font-size:0.95rem;transition:all 0.2s}
.choice:hover{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.5);transform:translateX(4px)}.choice.locked{opacity:0.3;cursor:not-allowed}
.restart{display:block;width:100%;padding:1rem;background:#fff;color:#000;border:none;font-weight:bold;text-transform:uppercase;cursor:pointer;font-size:1rem;margin-top:1.5rem}
.path{text-align:center;font-size:0.7rem;color:rgba(255,255,255,0.25);margin-top:2rem;font-family:monospace}
.tracker{text-align:center;font-size:0.75rem;color:rgba(255,255,255,0.3);margin-top:0.5rem}
.vars{position:fixed;top:1rem;right:1rem;background:rgba(0,0,0,0.8);border:1px solid #333;padding:0.5rem;font-size:0.65rem;font-family:monospace;z-index:10;max-width:200px}
.back-btn{position:fixed;top:1rem;left:1rem;padding:0.5rem 1rem;background:rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.2);color:#fff;cursor:pointer;font-size:0.75rem;z-index:10}
</style></head><body>
<div class="container"><h1>${title}</h1><div id="story"></div><div id="path" class="path"></div><div id="tracker" class="tracker"></div></div>
<button class="back-btn" onclick="goBack()" id="back-btn" style="display:none">← Back</button>
<div class="vars" id="var-debug" style="display:none"></div>
<script>
const N=${JSON.stringify(nodes)};const V=${JSON.stringify(storyVariables)};
let h=[];const ef=new Set();const te=N.filter(n=>n.isEnding).length;
let vars={};V.forEach(v=>{vars[v.name]=v.defaultValue;});
function ev(c,v){const val=v[c.variable];if(val===undefined)return false;switch(c.operator){case'==':return val==c.value;case'!=':return val!=c.value;case'>':return Number(val)>Number(c.value);case'<':return Number(val)<Number(c.value);case'>=':return Number(val)>=Number(c.value);case'<=':return Number(val)<=Number(c.value);}return true;}
function ae(effs,v){const nv={...v};effs.forEach(e=>{if(e.operation==='set')nv[e.variable]=e.value;else if(e.operation==='add')nv[e.variable]=(Number(nv[e.variable])||0)+Number(e.value);else if(e.operation==='toggle')nv[e.variable]=!nv[e.variable];});return nv;}
function showN(id,choiceEffects){
const n=N.find(x=>x.id===id);if(!n)return;h.push(id);
if(choiceEffects)vars=ae(choiceEffects,vars);if(n.effects)vars=ae(n.effects,vars);
document.getElementById('back-btn').style.display=h.length>1?'block':'none';
let html='';if(n.image)html+='<img class="node-img" src="'+n.image+'">';
if(n.isEnding){ef.add(id);html+='<div class="ending '+(n.endingType||'neutral')+'">'+(n.endingType||'neutral').toUpperCase()+' ENDING</div>';}
if(n.title)html+='<div class="node-title">'+n.title.replace(/</g,'&lt;')+'</div>';
html+='<div class="node-text">'+n.text.replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</div>';
if(n.choices&&n.choices.length>0){let vc=0,lc=0;html+='<div>';
n.choices.forEach(function(c,i){
const visible=!c.condition||ev(c.condition,vars);
if(visible){vc++;html+='<button class="choice" onclick="pickChoice('+i+',\\''+id+'\\')">'+c.label.replace(/</g,'&lt;')+'</button>';}else{lc++;}
});if(lc>0)html+='<div style="text-align:center;font-size:0.7rem;color:rgba(234,179,8,0.5);margin-top:0.5rem">'+lc+' choice(s) locked by conditions</div>';if(vc===0&&lc>0)html+='<div style="padding:1rem;border:1px solid rgba(234,179,8,0.3);background:rgba(234,179,8,0.1);text-align:center;color:#fcd34d;margin-top:0.5rem">All paths are locked. Try a different route.</div>';html+='</div>';}
if(n.isEnding)html+='<button class="restart" onclick="restart()">Restart Story</button>';
document.getElementById('story').innerHTML=html;document.getElementById('path').textContent='Path: '+h.join(' → ');
document.getElementById('tracker').textContent='Endings: '+ef.size+'/'+te;
const vd=document.getElementById('var-debug');if(V.length>0){vd.style.display='block';vd.innerHTML=Object.entries(vars).map(function(kv){return kv[0]+': '+JSON.stringify(kv[1]);}).join('<br>');}
window.scrollTo(0,0);}
let ch=[];
function pickChoice(i,nid){const n=N.find(x=>x.id===nid);if(!n)return;const c=n.choices[i];ch.push(c);showN(c.target,c.effects);}
function replayVars(hist){vars={};V.forEach(v=>{vars[v.name]=v.defaultValue;});for(let i=0;i<hist.length;i++){const nd=N.find(x=>x.id===hist[i]);if(nd&&nd.effects)vars=ae(nd.effects,vars);if(ch[i]&&ch[i].effects)vars=ae(ch[i].effects,vars);}}
function goBack(){if(h.length>1){h.pop();ch.pop();replayVars(h);const id=h[h.length-1];h.pop();showN(id);}}
function restart(){h=[];ch=[];ef.clear();vars={};V.forEach(v=>{vars[v.name]=v.defaultValue;});showN(N[0].id);}
if(N.length>0)showN(N[0].id);
</script></body></html>`;
    } else if (format === "txt") {
      data = nodes.map(n => `[${n.id}]${n.title ? ' - ' + n.title : ''}\n${n.text}\n${n.choices.map(c => `> ${c.label}${c.condition ? ` [if ${c.condition.variable} ${c.condition.operator} ${c.condition.value}]` : ""} -> ${c.target}`).join("\n")}`).join("\n\n---\n\n");
    } else {
      data = JSON.stringify({ title, nodes, variables: storyVariables, metadata: { branchPoints, optionsPerBranch } }, null, 2);
    }
    const blob = new Blob([data], { type: mimeType }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${title}.${format}`; a.click(); URL.revokeObjectURL(url);
    fireXpAction("export"); toast.success(`Exported as .${format}`);
  };

  const getCurrentNodeData = () => nodes.find(n => n.id === currentNode);

  if (isCreating) {
    return (<Layout><div className="h-screen flex items-center justify-center bg-black"><div className="text-center text-white"><div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" /><p className="text-zinc-400">Creating CYOA project...</p></div></div></Layout>);
  }

  const totalEndings = nodes.filter(n => n.isEnding).length;

  const getVisibleChoices = (nodeData: CYOANode | undefined) => {
    if (!nodeData) return [];
    return nodeData.choices.filter(c => !c.condition || evaluateCondition(c.condition, runtimeVars));
  };

  const previewContent = (
    <div className={`flex-1 text-white flex flex-col items-center justify-center relative ${isFullscreenPreview ? "fixed inset-0 z-50 bg-black" : "bg-black"}`}>
      {getCurrentNodeData()?.image && (
        <div className="absolute inset-0"><img src={getCurrentNodeData()?.image} className="w-full h-full object-cover opacity-30" /><div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" /></div>
      )}
      <div className="max-w-2xl w-full space-y-6 relative z-10 p-8">
        <div className="flex justify-between items-center">
          <h2 className="font-display font-bold text-xl">Interactive Preview</h2>
          <div className="flex gap-2">
            <button onClick={goBack} disabled={pathHistory.length <= 1} className="px-3 py-1 bg-white/10 text-sm disabled:opacity-30 hover:bg-white/20">← Back</button>
            {storyVariables.length > 0 && <button onClick={() => setShowVarDebug(!showVarDebug)} className={`px-3 py-1 text-sm ${showVarDebug ? "bg-purple-500/30 text-purple-300" : "bg-white/10 hover:bg-white/20"}`}><Variable className="w-4 h-4" /></button>}
            <button onClick={() => setIsFullscreenPreview(!isFullscreenPreview)} className="px-3 py-1 bg-white/10 text-sm hover:bg-white/20">{isFullscreenPreview ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>
            <button onClick={exitPreview} className="px-3 py-1 bg-white/10 text-sm hover:bg-white/20">Exit</button>
          </div>
        </div>

        {showVarDebug && storyVariables.length > 0 && (
          <div className="bg-purple-500/10 border border-purple-500/30 p-3 font-mono text-xs space-y-1">
            <div className="text-purple-400 font-bold text-[10px] uppercase mb-2">Variables</div>
            {Object.entries(runtimeVars).map(([k, v]) => (
              <div key={k} className="flex justify-between"><span className="text-purple-300">{k}</span><span className="text-white">{JSON.stringify(v)}</span></div>
            ))}
          </div>
        )}

        {totalEndings > 0 && <div className="text-xs text-white/40 font-mono text-center">Endings discovered: {endingsFound.size} / {totalEndings}</div>}

        {getCurrentNodeData() && (
          <div className="space-y-6">
            {getCurrentNodeData()?.image && <div className="aspect-video overflow-hidden border border-white/10"><img src={getCurrentNodeData()?.image} className="w-full h-full object-cover" /></div>}
            <div className={`p-6 border-2 ${getCurrentNodeData()?.isEnding ? getCurrentNodeData()?.endingType === "good" ? "border-green-500 bg-green-500/10" : getCurrentNodeData()?.endingType === "bad" ? "border-red-500 bg-red-500/10" : "border-yellow-500 bg-yellow-500/10" : "border-white/30 bg-zinc-900/80"}`}>
              {getCurrentNodeData()?.isEnding && <div className={`text-xs font-bold uppercase mb-4 ${getCurrentNodeData()?.endingType === "good" ? "text-green-500" : getCurrentNodeData()?.endingType === "bad" ? "text-red-500" : "text-yellow-500"}`}>{getCurrentNodeData()?.endingType?.toUpperCase()} ENDING</div>}
              {getCurrentNodeData()?.title && <h3 className="font-display font-bold text-lg mb-3">{getCurrentNodeData()?.title}</h3>}
              <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap"><TypewriterText text={getCurrentNodeData()?.text || ""} speed={textSpeed} onComplete={() => setTypewriterDone(true)} /></div>
            </div>

            {typewriterDone && (() => {
              const visibleChoices = getVisibleChoices(getCurrentNodeData());
              const allChoices = getCurrentNodeData()?.choices || [];
              const hiddenCount = allChoices.length - visibleChoices.length;
              return allChoices.length > 0 ? (
                <div className="space-y-2">
                  {visibleChoices.length > 0 && <h4 className="text-xs font-bold uppercase text-white/50">Choose your path:</h4>}
                  {visibleChoices.map((choice, i) => (
                    <button key={i} onClick={() => selectChoice(choice)} className="w-full p-4 bg-white/5 border-2 border-white/20 text-left hover:bg-white/10 hover:border-white/40 transition-all hover:translate-x-1 flex items-center justify-between group" data-testid={`button-choice-${i}`}>
                      <span>{choice.label}</span>
                      <div className="flex items-center gap-2">
                        {choice.effects && choice.effects.length > 0 && <Variable className="w-3 h-3 text-purple-400 opacity-50" />}
                        <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                  {hiddenCount > 0 && <div className="text-[10px] text-amber-400/50 font-mono text-center">{hiddenCount} choice(s) locked by conditions</div>}
                  {visibleChoices.length === 0 && hiddenCount > 0 && <div className="p-4 border border-amber-500/30 bg-amber-500/10 text-center text-sm text-amber-300">All paths are locked. Try a different route to unlock new choices.</div>}
                </div>
              ) : null;
            })()}

            {getCurrentNodeData()?.isEnding && (
              <button onClick={() => startPreview()}
                className="w-full p-4 bg-white text-black font-bold uppercase hover:bg-zinc-200 transition-colors">Restart Story</button>
            )}
          </div>
        )}

        <div className="text-xs text-white/30 text-center font-mono">Path: {pathHistory.join(" → ")}</div>
      </div>
    </div>
  );

  if (isFullscreenPreview && previewMode) return previewContent;

  return (
    <Layout>
      <div className="h-screen flex flex-col bg-zinc-950 text-white">
        <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900">
          <div className="flex items-center gap-4">
            <Link href="/"><button className="p-2 hover:bg-zinc-800" data-testid="button-back"><ArrowLeft className="w-4 h-4" /></button></Link>
            <div className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="font-display font-bold text-lg bg-transparent border-none outline-none hover:bg-zinc-800 px-2 py-1" data-testid="input-cyoa-title" />
            </div>
            <span className="text-xs font-mono text-zinc-500">Interactive Fiction Engine</span>
            {stats.nodeCount > 0 && (
              <span className="text-[10px] font-mono text-zinc-600 hidden md:flex items-center gap-2">
                <span>{stats.nodeCount} nodes</span><span>•</span><span>{stats.wordCount} words</span><span>•</span><span>{stats.endingCount} endings</span><span>•</span><span>{stats.choiceCount} choices</span>
                {stats.condCount > 0 && <><span>•</span><span className="text-amber-400">{stats.condCount} conditional</span></>}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                try {
                  const p = await createProject.mutateAsync({ title: "Untitled CYOA", type: "cyoa", status: "draft", data: {}, forceNew: true } as any);
                  navigate(`/creator/cyoa?id=${p.id}`, { replace: true });
                  window.location.reload();
                } catch { toast.error("Failed to create new project"); }
              }}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-medium flex items-center gap-2"
              data-testid="button-new-cyoa"
            >
              <Plus className="w-4 h-4" /> New
            </button>
            <button
              onClick={() => setShowFxBrowser(!showFxBrowser)}
              className={`px-3 py-2 border border-purple-500/30 text-sm font-medium flex items-center gap-2 ${showFxBrowser ? "bg-purple-600 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-purple-400"}`}
              data-testid="button-cyoa-fx-studio"
            >
              <Sparkles className="w-4 h-4" /> FX Studio
            </button>
            <div className="relative">
              <button onClick={() => setShowExportMenu(!showExportMenu)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-medium flex items-center gap-2" data-testid="button-export">
                <Download className="w-4 h-4" /> Export
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 z-50 w-40">
                  <button onClick={() => { exportCYOA("json"); setShowExportMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-700">JSON</button>
                  <button onClick={() => { exportCYOA("html"); setShowExportMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-700">Playable HTML</button>
                  <button onClick={() => { exportCYOA("txt"); setShowExportMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-700">Plain Text</button>
                  <div className="border-t border-zinc-600 my-1" />
                  <button
                    onClick={async () => {
                      setShowExportMenu(false);
                      const canvas = document.createElement("canvas");
                      canvas.width = 400; canvas.height = 300;
                      const ctx = canvas.getContext("2d");
                      if (ctx) {
                        ctx.fillStyle = "#18181b";
                        ctx.fillRect(0, 0, 400, 300);
                        ctx.fillStyle = "#22d3ee";
                        ctx.font = "bold 18px sans-serif";
                        ctx.fillText(title, 20, 40);
                        ctx.fillStyle = "#a1a1aa";
                        ctx.font = "14px sans-serif";
                        ctx.fillText(`${nodes.length} nodes`, 20, 70);
                        ctx.fillText(`${storyVariables.length} variables`, 20, 92);
                      }
                      const dataUrl = canvas.toDataURL("image/png");
                      await syncAsset({ name: `${title} - CYOA`, dataUrl, tag: "interior-page" });
                    }}
                    disabled={isSyncingToCoMiXX}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-700 text-cyan-400"
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
            <button onClick={validateCYOA} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-medium flex items-center gap-2" data-testid="button-validate">
              <AlertCircle className="w-4 h-4" /> Validate
            </button>
            {nodes.length > 0 && (
              <button onClick={() => startPreview()} className="px-4 py-2 bg-white text-black text-sm font-bold flex items-center gap-2" data-testid="button-preview"><Play className="w-4 h-4" /> Preview</button>
            )}
          </div>
        </header>

        {previewMode ? previewContent : (
          <div className="flex-1 flex overflow-hidden">
            <div className="w-80 border-r border-zinc-800 bg-zinc-900 flex flex-col">
              <div className="border-b border-zinc-800 p-1 flex">
                {(["story", "nodes", "variables", "assets"] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 text-xs font-bold uppercase ${activeTab === tab ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}>
                    {tab === "variables" ? <><Variable className="w-3 h-3 inline mr-1" />Vars</> : tab}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-4">
                {activeTab === "story" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-zinc-400">Paste Your Story</label>
                      <textarea value={storyText} onChange={(e) => setStoryText(e.target.value)} placeholder="Paste your story text here..." className="w-full h-48 p-3 border border-zinc-700 bg-zinc-800 text-sm font-mono resize-none" data-testid="input-story-text" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-zinc-400">Branch Points</label>
                      <div className="flex gap-1">{[3, 5, 7, 10].map(n => (<button key={n} onClick={() => setBranchPoints(n)} className={`flex-1 py-2 text-sm font-medium border ${branchPoints === n ? "bg-white text-black border-white" : "bg-zinc-800 border-zinc-700 hover:border-zinc-500"}`}>{n}</button>))}</div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-zinc-400">Choices per Branch</label>
                      <div className="flex gap-1">{[2, 3, 4].map(n => (<button key={n} onClick={() => setOptionsPerBranch(n)} className={`flex-1 py-2 text-sm font-medium border ${optionsPerBranch === n ? "bg-white text-black border-white" : "bg-zinc-800 border-zinc-700 hover:border-zinc-500"}`}>{n}</button>))}</div>
                    </div>
                    <button onClick={generateCYOA} disabled={isGenerating || !storyText.trim()} className="w-full py-3 bg-white text-black font-bold uppercase disabled:opacity-50 flex items-center justify-center gap-2" data-testid="button-generate-cyoa">
                      {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <GitBranch className="w-5 h-5" />} Generate CYOA
                    </button>
                  </>
                )}

                {activeTab === "nodes" && (
                  <>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search nodes..." className="w-full pl-7 pr-2 py-1.5 bg-zinc-800 border border-zinc-700 text-xs" data-testid="input-search-nodes" />
                      </div>
                      <button onClick={addNode} className="p-1.5 bg-white text-black" data-testid="button-add-node"><Plus className="w-4 h-4" /></button>
                    </div>
                    {filteredNodes.filter(n => !n.id.startsWith("ending")).map((node, idx) => (
                      <div key={node.id} onClick={() => { setSelectedNodeId(node.id); setEditingNode(node.id); }}
                        className={`p-3 border cursor-pointer group ${selectedNodeId === node.id ? "bg-white text-black border-white" : node.isEnding ? "border-green-500 bg-green-500/10" : `${NODE_COLORS[node.color || "default"].border} ${NODE_COLORS[node.color || "default"].bg}`}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs truncate flex-1">{node.title || (node.isEnding ? "ENDING" : `NODE ${idx + 1}`)}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                            <button onClick={(e) => { e.stopPropagation(); startPreview(node.id); }} className={`p-1 ${selectedNodeId === node.id ? "hover:text-zinc-600" : "hover:text-green-400"}`} title="Play from here"><Play className="w-3 h-3" /></button>
                            <button onClick={(e) => { e.stopPropagation(); duplicateNode(node.id); }} className={`p-1 ${selectedNodeId === node.id ? "hover:text-zinc-600" : "hover:text-blue-400"}`}><Copy className="w-3 h-3" /></button>
                            <button onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }} className={`p-1 ${selectedNodeId === node.id ? "hover:text-red-600" : "hover:text-red-500"}`}><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                        <p className={`text-xs line-clamp-2 ${selectedNodeId === node.id ? "text-zinc-600" : "text-zinc-400"}`}>{node.text}</p>
                        <div className={`mt-2 text-[10px] flex items-center gap-2 ${selectedNodeId === node.id ? "text-zinc-500" : "text-zinc-600"}`}>
                          {node.choices.length} choices
                          {node.effects && node.effects.length > 0 && <span className="text-purple-400">• {node.effects.length} var(s)</span>}
                          {node.choices.some(c => c.condition) && <span className="text-amber-400">• cond</span>}
                        </div>
                      </div>
                    ))}
                    {filteredNodes.length === 0 && searchQuery && <div className="text-center py-4 text-zinc-500 text-xs">No nodes match "{searchQuery}"</div>}
                  </>
                )}

                {activeTab === "variables" && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold uppercase text-zinc-400">Story Variables</label>
                        <button onClick={() => setStoryVariables([...storyVariables, { name: `var_${storyVariables.length + 1}`, type: "number", defaultValue: 0 }])} className="p-1 bg-white text-black text-[10px] flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
                      </div>
                      <p className="text-[10px] text-zinc-600">Define variables to track player choices, stats, and story flags. Use them in node effects and choice conditions.</p>
                    </div>
                    {storyVariables.map((v, i) => (
                      <div key={i} className="p-3 bg-zinc-800 border border-zinc-700 space-y-2">
                        <div className="flex gap-2 items-center">
                          <input value={v.name} onChange={(e) => { const nv = [...storyVariables]; nv[i] = { ...v, name: e.target.value }; setStoryVariables(nv); }} className="flex-1 p-1 bg-zinc-900 border border-zinc-600 text-sm font-mono" placeholder="variable_name" />
                          <select value={v.type} onChange={(e) => { const nv = [...storyVariables]; const type = e.target.value as StoryVariable["type"]; nv[i] = { ...v, type, defaultValue: type === "number" ? 0 : type === "boolean" ? false : "" }; setStoryVariables(nv); }} className="w-20 p-1 bg-zinc-900 border border-zinc-600 text-xs">
                            <option value="number">Num</option><option value="boolean">Bool</option><option value="string">Str</option>
                          </select>
                          <button onClick={() => setStoryVariables(storyVariables.filter((_, j) => j !== i))} className="p-1 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-500">Default:</span>
                          {v.type === "boolean" ? (
                            <button onClick={() => { const nv = [...storyVariables]; nv[i] = { ...v, defaultValue: !v.defaultValue }; setStoryVariables(nv); }} className={`px-2 py-0.5 text-[10px] border ${v.defaultValue ? "border-green-500 text-green-400" : "border-zinc-600 text-zinc-400"}`}>{v.defaultValue ? "true" : "false"}</button>
                          ) : (
                            <input value={String(v.defaultValue)} onChange={(e) => { const nv = [...storyVariables]; nv[i] = { ...v, defaultValue: v.type === "number" ? Number(e.target.value) || 0 : e.target.value }; setStoryVariables(nv); }} className="flex-1 p-1 bg-zinc-900 border border-zinc-600 text-[10px] font-mono" />
                          )}
                        </div>
                      </div>
                    ))}
                    {storyVariables.length === 0 && (
                      <div className="text-center py-8 text-zinc-600">
                        <Variable className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-xs">No variables defined yet.</p>
                        <p className="text-[10px] mt-1">Variables let you track player progress — reputation, items found, allies gained — and gate choices based on those values.</p>
                      </div>
                    )}
                  </>
                )}

                {activeTab === "assets" && (
                  <>
                    <div className="flex gap-2 mb-2">
                      <button onClick={() => imageInputRef.current?.click()} className="flex-1 p-2 bg-zinc-800 text-xs flex items-center justify-center gap-1 hover:bg-zinc-700"><Upload className="w-3 h-3" /> Import</button>
                      <button onClick={() => setShowAIGen(true)} className="flex-1 p-2 bg-white text-black text-xs flex items-center justify-center gap-1"><Wand2 className="w-3 h-3" /> AI Gen</button>
                    </div>
                    {backgrounds.map((bg) => (
                      <div key={bg.id} className="p-2 border border-zinc-700">
                        <div className="aspect-video bg-zinc-800 overflow-hidden mb-1"><img src={bg.url} className="w-full h-full object-cover" /></div>
                        <span className="text-xs font-medium">{bg.name}</span>
                      </div>
                    ))}
                    {backgrounds.length === 0 && <div className="text-center py-4 text-zinc-500 text-xs">No assets yet. Import or generate images.</div>}
                  </>
                )}
              </div>
            </div>

            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div className="flex-1 relative bg-zinc-950 overflow-hidden">
                  {nodes.length > 0 && !editingNode && (
                    <div className="absolute top-4 right-4 z-20 flex gap-2">
                      <button onClick={() => setViewMode("cards")} className={`px-3 py-1 text-xs font-bold ${viewMode === "cards" ? "bg-white text-black" : "bg-zinc-800 text-white border border-zinc-700"}`}>Cards</button>
                      <button onClick={() => setViewMode("graph")} className={`px-3 py-1 text-xs font-bold ${viewMode === "graph" ? "bg-white text-black" : "bg-zinc-800 text-white border border-zinc-700"}`}><Map className="w-3 h-3 inline mr-1" />Graph</button>
                      <button onClick={() => setViewMode("script")} className={`px-3 py-1 text-xs font-bold ${viewMode === "script" ? "bg-white text-black" : "bg-zinc-800 text-white border border-zinc-700"}`}><Code className="w-3 h-3 inline mr-1" />Script</button>
                    </div>
                  )}

                  {nodes.length === 0 && !editingNode && (
                    <div className="absolute inset-0 overflow-auto">
                      <div className="min-h-full flex flex-col items-center justify-center p-8">
                        <div className="text-center mb-8 max-w-lg">
                          <h2 className="text-2xl font-display font-bold mb-2">Choose a Template</h2>
                          <p className="text-zinc-500 text-sm">Pick a starter template or build from scratch.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-4xl mb-8">
                          {CYOA_TEMPLATES.map(template => (
                            <button
                              key={template.id}
                              onClick={() => {
                                setNodes(template.nodes as CYOANode[]);
                                setTitle(template.title);
                                toast.success(`"${template.title}" loaded — click any node to edit.`);
                              }}
                              className="group p-4 bg-zinc-900 border border-zinc-700 hover:border-white text-left transition-colors"
                              data-testid={`button-template-${template.id}`}
                            >
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl">{template.emoji}</span>
                                <h3 className="font-bold text-sm text-white">{template.title}</h3>
                              </div>
                              <p className="text-zinc-500 text-xs leading-relaxed">{template.desc}</p>
                              <div className="mt-2 flex items-center gap-2 text-zinc-600 text-[10px] font-mono">
                                <span>{template.nodes.length} nodes</span>
                                <span>{"\u2022"}</span>
                                <span>{template.nodes.filter(n => n.isEnding).length} endings</span>
                              </div>
                            </button>
                          ))}
                          <button
                            onClick={() => {
                              addNode();
                              setActiveTab("story");
                            }}
                            className="group p-4 border border-dashed border-zinc-700 hover:border-white text-left transition-colors"
                            data-testid="button-template-blank"
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <Plus className="w-6 h-6 text-zinc-500 group-hover:text-white" />
                              <h3 className="font-bold text-sm text-zinc-400 group-hover:text-white">Blank Project</h3>
                            </div>
                            <p className="text-zinc-600 text-xs leading-relaxed">Start with an empty canvas and build your own story.</p>
                          </button>
                        </div>
                        <p className="text-zinc-600 text-xs">Or paste a story in the <button onClick={() => setActiveTab("story")} className="text-white underline hover:text-zinc-300">Story tab</button> and generate a CYOA from it.</p>
                      </div>
                    </div>
                  )}

                  {editingNode ? (
                    <div className="absolute inset-0 p-8 overflow-auto">
                      {(() => {
                        const node = nodes.find(n => n.id === editingNode);
                        if (!node) return null;
                        return (
                          <div className="max-w-2xl mx-auto space-y-6">
                            <div className="flex justify-between items-center">
                              <h3 className="font-bold text-lg">Edit Node</h3>
                              <button onClick={() => setEditingNode(null)} className="p-2 hover:bg-zinc-800"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase text-zinc-400">Node Title</label>
                              <input value={node.title || ""} onChange={(e) => updateNode(node.id, { title: e.target.value })} className="w-full p-2 border border-zinc-700 bg-zinc-800 text-sm font-bold" placeholder="Scene title..." />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase text-zinc-400">Node Text</label>
                              <textarea value={node.text} onChange={(e) => updateNode(node.id, { text: e.target.value })} className="w-full h-48 p-3 border border-zinc-700 bg-zinc-800 text-sm font-mono resize-none" />
                            </div>
                            <div className="flex gap-4">
                              <div className="space-y-2 flex-1">
                                <label className="text-xs font-bold uppercase text-zinc-400">Color Tag</label>
                                <div className="flex gap-1 flex-wrap">
                                  {(Object.entries(NODE_COLORS) as [NodeColor, typeof NODE_COLORS[NodeColor]][]).map(([key, val]) => (
                                    <button key={key} onClick={() => updateNode(node.id, { color: key })} className={`px-2 py-1 text-[10px] border ${node.color === key || (!node.color && key === "default") ? "border-white bg-white/20" : `${val.border} ${val.bg}`}`}>{val.label}</button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {storyVariables.length > 0 && (
                              <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-purple-400 flex items-center gap-1"><Variable className="w-3 h-3" /> On Enter Effects</label>
                                <p className="text-[10px] text-zinc-600">Set variables when the player reaches this node.</p>
                                <VarEffectEditor effects={node.effects || []} variables={storyVariables} onChange={(effects) => updateNode(node.id, { effects })} />
                              </div>
                            )}

                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase text-zinc-400">Node Image</label>
                              <div className="flex gap-2">
                                <button onClick={() => { setSelectedNodeId(node.id); imageInputRef.current?.click(); }} className="flex-1 p-3 bg-zinc-800 text-sm flex items-center justify-center gap-2 hover:bg-zinc-700"><Upload className="w-4 h-4" /> Upload</button>
                                <button onClick={() => { setSelectedNodeId(node.id); setShowAIGen(true); }} className="flex-1 p-3 bg-white text-black text-sm flex items-center justify-center gap-2"><Wand2 className="w-4 h-4" /> AI Generate</button>
                              </div>
                              {node.image && <div className="relative aspect-video bg-zinc-800 overflow-hidden"><img src={node.image} className="w-full h-full object-cover" /><button onClick={() => updateNode(node.id, { image: undefined })} className="absolute top-2 right-2 p-1 bg-red-500/80 hover:bg-red-500"><X className="w-3 h-3" /></button></div>}
                            </div>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <label className="text-xs font-bold uppercase text-zinc-400">Choices</label>
                                <button onClick={() => addChoiceToNode(node.id)} className="p-1 bg-white text-black text-xs flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
                              </div>
                              {node.choices.map((choice, i) => (
                                <div key={i} className="space-y-1 p-2 bg-zinc-800/50 border border-zinc-700/50">
                                  <div className="flex gap-2">
                                    <input value={choice.label} onChange={(e) => { const nc = [...node.choices]; nc[i] = { ...choice, label: e.target.value }; updateNode(node.id, { choices: nc }); }} className="flex-1 p-2 border border-zinc-700 bg-zinc-800 text-sm" placeholder="Choice text" />
                                    <select value={choice.target} onChange={(e) => { const nc = [...node.choices]; nc[i] = { ...choice, target: e.target.value }; updateNode(node.id, { choices: nc }); }} className="w-40 p-2 border border-zinc-700 bg-zinc-800 text-sm">
                                      {nodes.map(n => (<option key={n.id} value={n.id}>{n.title || n.id}</option>))}
                                    </select>
                                    <button onClick={() => updateNode(node.id, { choices: node.choices.filter((_, j) => j !== i) })} className="p-2 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                                  {storyVariables.length > 0 && (
                                    <div className="flex gap-4 pl-2">
                                      <div className="flex-1">
                                        <ConditionEditor condition={choice.condition} variables={storyVariables} onChange={(c) => { const nc = [...node.choices]; nc[i] = { ...choice, condition: c }; updateNode(node.id, { choices: nc }); }} onRemove={() => { const nc = [...node.choices]; nc[i] = { ...choice, condition: undefined }; updateNode(node.id, { choices: nc }); }} />
                                      </div>
                                      <div className="flex-1">
                                        <div className="text-[10px] text-purple-400 mb-0.5">Choice Effects:</div>
                                        <VarEffectEditor effects={choice.effects || []} variables={storyVariables} onChange={(effects) => { const nc = [...node.choices]; nc[i] = { ...choice, effects }; updateNode(node.id, { choices: nc }); }} />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-4">
                              <label className="flex items-center gap-2">
                                <input type="checkbox" checked={node.isEnding || false} onChange={(e) => updateNode(node.id, { isEnding: e.target.checked })} className="w-4 h-4" />
                                <span className="text-sm">Is Ending</span>
                              </label>
                              {node.isEnding && (
                                <select value={node.endingType || "neutral"} onChange={(e) => updateNode(node.id, { endingType: e.target.value as any })} className="p-2 border border-zinc-700 bg-zinc-800 text-sm">
                                  <option value="good">Good Ending</option><option value="bad">Bad Ending</option><option value="neutral">Neutral Ending</option>
                                </select>
                              )}
                            </div>
                            <div className="flex gap-2 pt-4">
                              <button onClick={() => startPreview(node.id)} className="px-4 py-2 bg-green-600 text-white text-sm font-bold flex items-center gap-2 hover:bg-green-500"><Play className="w-4 h-4" /> Play from here</button>
                              <button onClick={() => duplicateNode(node.id)} className="px-4 py-2 bg-zinc-800 text-sm flex items-center gap-2 hover:bg-zinc-700"><Copy className="w-4 h-4" /> Duplicate</button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : nodes.length > 0 ? (
                    viewMode === "graph" ? (
                      <NodeGraph nodes={nodes} selectedNodeId={selectedNodeId} onSelectNode={(id) => setSelectedNodeId(id)} onEditNode={(id) => setEditingNode(id)} />
                    ) : viewMode === "script" ? (
                      <ScriptView nodes={nodes} variables={storyVariables} />
                    ) : (
                      <div className="absolute inset-0 p-8 overflow-auto">
                        <div className="flex flex-wrap gap-4">
                          {nodes.filter(n => !n.id.startsWith("ending")).map((node, index) => {
                            const colorScheme = NODE_COLORS[node.color || "default"];
                            const hasEffects = node.effects && node.effects.length > 0;
                            return (
                              <div key={node.id} className={`w-72 border-2 shadow-lg cursor-pointer transition-all hover:shadow-xl ${node.isEnding ? "border-green-500" : colorScheme.border} ${colorScheme.bg} ${selectedNodeId === node.id ? "ring-2 ring-white" : ""}`}
                                onClick={() => setSelectedNodeId(node.id)} onDoubleClick={() => setEditingNode(node.id)}>
                                {node.image && <div className="aspect-video overflow-hidden"><img src={node.image} className="w-full h-full object-cover" /></div>}
                                <div className="p-4">
                                  <div className="flex justify-between mb-2">
                                    <span className="font-bold text-xs uppercase">{node.title || (node.isEnding ? "ENDING" : `Scene ${index + 1}`)}</span>
                                    <div className="flex items-center gap-1">
                                      {hasEffects && <Variable className="w-3 h-3 text-purple-400" />}
                                      <button onClick={(e) => { e.stopPropagation(); startPreview(node.id); }} className="p-0.5 hover:text-green-400" title="Play from here"><Play className="w-3 h-3" /></button>
                                      <span className="text-[10px] text-zinc-500">{node.id}</span>
                                    </div>
                                  </div>
                                  <p className="text-xs font-mono text-zinc-400 line-clamp-3">{node.text}</p>
                                  {node.choices.length > 0 && (
                                    <div className="mt-3 pt-2 border-t border-zinc-700 space-y-1">
                                      {node.choices.map((choice, i) => (
                                        <div key={i} className="text-[10px] text-zinc-500 flex items-center gap-1">
                                          {choice.condition ? <Filter className="w-2 h-2 text-amber-400" /> : <LinkIcon className="w-2 h-2" />}
                                          {choice.label} → {choice.target}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <GitBranch className="w-16 h-16 mx-auto text-zinc-700" />
                        <p className="text-sm text-zinc-500">Generate a CYOA to see the branch structure</p>
                        <p className="text-xs text-zinc-600">Paste a story and click Generate</p>
                      </div>
                    </div>
                  )}
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-56 bg-zinc-900 border-zinc-700 text-white">
                <ContextMenuItem onClick={addNode} className="hover:bg-zinc-800 cursor-pointer"><Plus className="w-4 h-4 mr-2" /> Add Node</ContextMenuItem>
                <ContextMenuItem onClick={generateCYOA} disabled={!storyText.trim()} className="hover:bg-zinc-800 cursor-pointer"><GitBranch className="w-4 h-4 mr-2" /> Generate CYOA</ContextMenuItem>
                <ContextMenuSeparator className="bg-zinc-700" />
                <ContextMenuItem onClick={() => setShowAIGen(true)} className="hover:bg-zinc-800 cursor-pointer"><Wand2 className="w-4 h-4 mr-2" /> AI Generate Image</ContextMenuItem>
                <ContextMenuSeparator className="bg-zinc-700" />
                <ContextMenuItem onClick={() => startPreview()} className="hover:bg-zinc-800 cursor-pointer"><Play className="w-4 h-4 mr-2" /> Preview Story</ContextMenuItem>
                <ContextMenuSeparator className="bg-zinc-700" />
                <ContextMenuItem onClick={() => setViewMode(viewMode === "cards" ? "graph" : viewMode === "graph" ? "script" : "cards")} className="hover:bg-zinc-800 cursor-pointer">
                  <Map className="w-4 h-4 mr-2" /> Cycle View ({viewMode})
                </ContextMenuItem>
                {selectedNodeId && (<><ContextMenuSeparator className="bg-zinc-700" /><ContextMenuItem onClick={() => setEditingNode(selectedNodeId)} className="hover:bg-zinc-800 cursor-pointer"><Edit className="w-4 h-4 mr-2" /> Edit Node</ContextMenuItem><ContextMenuItem onClick={() => startPreview(selectedNodeId)} className="hover:bg-zinc-800 cursor-pointer"><Play className="w-4 h-4 mr-2" /> Play from Here</ContextMenuItem><ContextMenuItem onClick={() => duplicateNode(selectedNodeId)} className="hover:bg-zinc-800 cursor-pointer"><Copy className="w-4 h-4 mr-2" /> Duplicate Node</ContextMenuItem><ContextMenuItem onClick={() => deleteNode(selectedNodeId)} className="hover:bg-red-900 cursor-pointer text-red-400"><Trash2 className="w-4 h-4 mr-2" /> Delete Node</ContextMenuItem></>)}
              </ContextMenuContent>
            </ContextMenu>
          </div>
        )}

        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

        {showAIGen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-zinc-700 p-6 w-[500px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2"><Wand2 className="w-5 h-5" /> AI Generate Image</h3>
                <button onClick={() => setShowAIGen(false)} className="p-2 hover:bg-zinc-800"><X className="w-4 h-4" /></button>
              </div>
              <AIGenerator type="cyoa" onImageGenerated={handleAIGenerated} />
            </div>
          </div>
        )}

        {showFxBrowser && (() => {
          const targetNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;
          return (
            <div className="fixed top-16 right-4 w-96 max-h-[80vh] bg-black border border-purple-500/30 shadow-[4px_4px_0px_0px_rgba(168,85,247,0.3)] z-50 overflow-hidden flex flex-col">
              {targetNode && (
                <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400">Target: <strong className="text-white">{targetNode.title}</strong></span>
                  <button onClick={() => setSelectedNodeId(null)} className="text-[10px] text-zinc-500 hover:text-white">Clear</button>
                </div>
              )}
              <FxBrowserPanel
                onClose={() => setShowFxBrowser(false)}
                useLabel={targetNode ? "Use as Node Image" : "Add as Background"}
                onSelectEffect={(effect: FxEffect) => {
                  if (effect.preview_data_url) {
                    if (targetNode) {
                      updateNode(targetNode.id, { image: effect.preview_data_url });
                      toast.success(`"${effect.name}" added to "${targetNode.title}"`);
                    } else {
                      setBackgrounds(prev => [...prev, { id: `fx_${Date.now()}`, name: effect.name, url: effect.preview_data_url! }]);
                      toast.success(`"${effect.name}" added as background`);
                    }
                    setShowFxBrowser(false);
                  } else {
                    toast.error("This effect has no preview image");
                  }
                }}
              />
            </div>
          );
        })()}
      </div>
    </Layout>
  );
}
