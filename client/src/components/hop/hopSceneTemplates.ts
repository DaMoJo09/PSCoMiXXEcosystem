export interface HopSceneTemplate {
  id: string;
  label: string;
  description: string;
  category: "basic" | "premium";
  defaults: {
    duration: number;
    mood?: string;
    cameraAngle?: string;
    lighting?: string;
    transition: "cut" | "fade" | "zoom" | "glitch";
    textOverlay?: string;
    soundPack?: string;
  };
}

export const SCENE_TEMPLATES: HopSceneTemplate[] = [
  {
    id: "cinematic-opener",
    label: "Cinematic Opener",
    description: "Wide shot, fade in, ambient audio",
    category: "basic",
    defaults: {
      duration: 8,
      mood: "dark, cinematic, tension",
      cameraAngle: "wide establishing",
      lighting: "low-key",
      transition: "fade",
      soundPack: "ambient_city",
    },
  },
  {
    id: "action-sequence",
    label: "Action Sequence",
    description: "Quick cuts, burst FX, high energy",
    category: "basic",
    defaults: {
      duration: 3,
      mood: "intense, high-energy",
      cameraAngle: "close-up",
      lighting: "dynamic",
      transition: "cut",
    },
  },
  {
    id: "dialogue-beat",
    label: "Dialogue Beat",
    description: "Speech bubbles, character focus, soft BG",
    category: "basic",
    defaults: {
      duration: 5,
      mood: "calm, conversational",
      cameraAngle: "medium shot",
      lighting: "soft, even",
      transition: "fade",
    },
  },
  {
    id: "musical-climax",
    label: "Musical Climax",
    description: "Full FX, speed lines, peak energy, synced to drop",
    category: "basic",
    defaults: {
      duration: 4,
      mood: "epic, peak energy",
      cameraAngle: "dynamic zoom",
      lighting: "neon, high contrast",
      transition: "glitch",
    },
  },
  {
    id: "cool-down",
    label: "Cool Down / Outro",
    description: "Slow fade, credits overlay, ambient loop",
    category: "basic",
    defaults: {
      duration: 10,
      mood: "reflective, calm",
      cameraAngle: "wide pull-out",
      lighting: "warm, fading",
      transition: "fade",
      soundPack: "ambient_nature",
    },
  },
  {
    id: "cyoa-branch",
    label: "CYOA Branch",
    description: "Decision point, split paths, interactive prompt",
    category: "premium",
    defaults: {
      duration: 8,
      mood: "suspense, choice",
      cameraAngle: "direct address",
      lighting: "spotlight",
      transition: "zoom",
      textOverlay: "What will you choose?",
    },
  },
  {
    id: "montage",
    label: "Montage",
    description: "Rapid image sequence, energy build",
    category: "premium",
    defaults: {
      duration: 2,
      mood: "fast, rhythmic",
      cameraAngle: "mixed cuts",
      lighting: "varied",
      transition: "cut",
    },
  },
  {
    id: "dream-sequence",
    label: "Dream Sequence",
    description: "Ethereal, slow, surreal visuals",
    category: "premium",
    defaults: {
      duration: 6,
      mood: "dreamy, surreal",
      cameraAngle: "floating",
      lighting: "soft glow",
      transition: "fade",
      soundPack: "ethereal_pad",
    },
  },
  {
    id: "horror-reveal",
    label: "Horror Reveal",
    description: "Building tension, sudden reveal, dark atmosphere",
    category: "premium",
    defaults: {
      duration: 5,
      mood: "dread, suspense",
      cameraAngle: "slow zoom",
      lighting: "low-key, shadows",
      transition: "glitch",
      soundPack: "tension_drone",
    },
  },
  {
    id: "title-card",
    label: "Title Card",
    description: "Bold text, minimal background, brand moment",
    category: "premium",
    defaults: {
      duration: 3,
      mood: "bold, declarative",
      cameraAngle: "static center",
      lighting: "even",
      transition: "fade",
    },
  },
];

export const SOUND_PACKS = [
  { id: "ambient_city", label: "City Ambient", category: "ambient", tier: "free" },
  { id: "ambient_nature", label: "Nature Loop", category: "ambient", tier: "free" },
  { id: "ambient_crowd", label: "Crowd Murmur", category: "ambient", tier: "free" },
  { id: "sfx_impact", label: "Impact Hit", category: "sfx", tier: "premium" },
  { id: "sfx_whoosh", label: "Whoosh", category: "sfx", tier: "premium" },
  { id: "sfx_transition", label: "Transition Sweep", category: "sfx", tier: "premium" },
  { id: "tension_drone", label: "Tension Drone", category: "mood", tier: "premium" },
  { id: "ethereal_pad", label: "Ethereal Pad", category: "mood", tier: "premium" },
  { id: "lo_fi_beat", label: "Lo-Fi Beat", category: "mood", tier: "premium" },
  { id: "cinematic_strings", label: "Cinematic Strings", category: "mood", tier: "premium" },
];

export const CAMERA_ANGLES = [
  "wide establishing", "medium shot", "close-up", "extreme close-up",
  "bird's eye", "low angle", "high angle", "dutch angle",
  "over-the-shoulder", "POV", "tracking shot", "static center",
  "slow zoom", "dynamic zoom", "floating", "direct address",
];

export const LIGHTING_PRESETS = [
  "natural", "soft, even", "low-key", "high-key",
  "neon, high contrast", "warm, fading", "spotlight",
  "dynamic", "soft glow", "silhouette", "rim light",
];

export const MOOD_PRESETS = [
  "dark, cinematic, tension", "calm, conversational",
  "intense, high-energy", "epic, peak energy",
  "reflective, calm", "dreamy, surreal",
  "dread, suspense", "bold, declarative",
  "romantic, warm", "mysterious, eerie",
  "joyful, celebratory", "melancholy, introspective",
];
