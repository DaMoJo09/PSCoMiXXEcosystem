import type { HopScene } from "@shared/schema";

export type HopBlendMode = "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "color" | "luminosity";

export interface HopSceneTemplate {
  id: string;
  label: string;
  emoji: string;
  description: string;
  category: "cinematic" | "action" | "dialogue" | "mood" | "music";
  scene: Partial<HopScene>;
}

export const SCENE_TEMPLATES: HopSceneTemplate[] = [
  {
    id: "cinematic-opener",
    label: "CINEMATIC OPENER",
    emoji: "🎬",
    description: "Wide shot, fade in, ambient audio",
    category: "cinematic",
    scene: {
      duration: 8,
      transition: "fade",
      mood: "cinematic, dramatic",
      cameraAngle: "wide establishing",
      lighting: "low-key, atmospheric",
      cameraStart: { x: 0, y: 0, zoom: 1 },
      cameraEnd: { x: 0, y: 0, zoom: 1.3 },
      cameraEasing: "ease-in-out",
    },
  },
  {
    id: "action-sequence",
    label: "ACTION SEQUENCE",
    emoji: "💥",
    description: "Quick cuts, burst FX, high energy",
    category: "action",
    scene: {
      duration: 3,
      transition: "cut",
      mood: "intense, high-energy",
      cameraAngle: "dynamic, close-up",
      lighting: "harsh, contrasty",
      cameraStart: { x: -5, y: 0, zoom: 1.2 },
      cameraEnd: { x: 5, y: 0, zoom: 1.5 },
      cameraEasing: "ease-out",
    },
  },
  {
    id: "dialogue-beat",
    label: "DIALOGUE BEAT",
    emoji: "💬",
    description: "Character focus, speech bubbles, soft BG",
    category: "dialogue",
    scene: {
      duration: 6,
      transition: "fade",
      mood: "conversational, intimate",
      cameraAngle: "medium shot",
      lighting: "soft, even",
      cameraStart: { x: 0, y: 0, zoom: 1.1 },
      cameraEnd: { x: 0, y: 0, zoom: 1.15 },
      cameraEasing: "ease-in-out",
    },
  },
  {
    id: "dramatic-reveal",
    label: "DRAMATIC REVEAL",
    emoji: "😱",
    description: "Slow zoom, tension build, iris transition",
    category: "cinematic",
    scene: {
      duration: 5,
      transition: "iris",
      mood: "suspenseful, mysterious",
      cameraAngle: "tight close-up",
      lighting: "dramatic, single source",
      cameraStart: { x: 0, y: 0, zoom: 1 },
      cameraEnd: { x: 0, y: 0, zoom: 2 },
      cameraEasing: "ease-in",
    },
  },
  {
    id: "transition-breather",
    label: "BREATHER",
    emoji: "🌙",
    description: "Slow pan, calm mood, wipe transition",
    category: "mood",
    scene: {
      duration: 7,
      transition: "wipe-right",
      mood: "calm, reflective",
      cameraAngle: "wide",
      lighting: "soft, warm",
      cameraStart: { x: -8, y: 0, zoom: 1.1 },
      cameraEnd: { x: 8, y: 0, zoom: 1.1 },
      cameraEasing: "linear",
    },
  },
  {
    id: "music-drop",
    label: "MUSIC DROP",
    emoji: "🔥",
    description: "Glitch transition, zoom burst, beat-synced",
    category: "music",
    scene: {
      duration: 4,
      transition: "glitch",
      mood: "explosive, hype",
      cameraAngle: "dynamic",
      lighting: "neon, high contrast",
      cameraStart: { x: 0, y: 0, zoom: 0.8 },
      cameraEnd: { x: 0, y: 0, zoom: 1.6 },
      cameraEasing: "ease-out",
    },
  },
  {
    id: "credits-roll",
    label: "CREDITS / OUTRO",
    emoji: "🎭",
    description: "Slow fade out, text card ready",
    category: "cinematic",
    scene: {
      duration: 10,
      transition: "fade",
      assetType: "text_card",
      mood: "closing, reflective",
      textOverlay: "Created with Press Start",
      cameraStart: { x: 0, y: 0, zoom: 1 },
      cameraEnd: { x: 0, y: 0, zoom: 1 },
    },
  },
  {
    id: "lyric-card",
    label: "LYRIC CARD",
    emoji: "🎤",
    description: "Text-focused, bold typography, slide transition",
    category: "music",
    scene: {
      duration: 5,
      transition: "slide-left",
      assetType: "text_card",
      mood: "lyrical, expressive",
      textOverlay: "Your lyrics here...",
    },
  },
  {
    id: "cool-down",
    label: "COOL DOWN",
    emoji: "🌊",
    description: "Slow fade, ambient loop, wind-down energy",
    category: "mood",
    scene: {
      duration: 8,
      transition: "dissolve",
      mood: "reflective, calm",
      cameraAngle: "wide pull-out",
      lighting: "warm, fading",
      cameraStart: { x: 0, y: 0, zoom: 1.2 },
      cameraEnd: { x: 0, y: 0, zoom: 1 },
      cameraEasing: "ease-in-out",
    },
  },
  {
    id: "montage",
    label: "MONTAGE",
    emoji: "⚡",
    description: "Rapid cuts, energy build, rhythmic pace",
    category: "action",
    scene: {
      duration: 2,
      transition: "cut",
      mood: "fast, rhythmic",
      cameraAngle: "mixed cuts",
      lighting: "varied",
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

export const VIBE_MODES = [
  { id: "lofi-chill", label: "LO-FI CHILL", emoji: "🌙", gradient: ["rgba(138,43,226,0.25)", "rgba(0,0,0,0)"], blendMode: "screen" as HopBlendMode, tint: "#8B5CF6" },
  { id: "golden-hour", label: "GOLDEN HOUR", emoji: "🌅", gradient: ["rgba(255,165,0,0.35)", "rgba(255,94,77,0.15)"], blendMode: "overlay" as HopBlendMode, tint: "#F59E0B" },
  { id: "cyberpunk", label: "CYBERPUNK", emoji: "⚡", gradient: ["rgba(0,255,255,0.2)", "rgba(255,0,255,0.25)"], blendMode: "screen" as HopBlendMode, tint: "#06B6D4" },
  { id: "noir", label: "NOIR", emoji: "🎬", gradient: ["rgba(0,0,0,0.5)", "rgba(0,0,0,0)"], blendMode: "multiply" as HopBlendMode, tint: "#6B7280" },
  { id: "anime-pop", label: "ANIME POP", emoji: "✨", gradient: ["rgba(255,105,180,0.3)", "rgba(255,255,0,0.15)"], blendMode: "screen" as HopBlendMode, tint: "#EC4899" },
  { id: "vintage", label: "VINTAGE", emoji: "📷", gradient: ["rgba(139,69,19,0.25)", "rgba(210,180,140,0.2)"], blendMode: "overlay" as HopBlendMode, tint: "#92400E" },
  { id: "ice-cold", label: "ICE COLD", emoji: "❄️", gradient: ["rgba(0,191,255,0.3)", "rgba(135,206,250,0.1)"], blendMode: "screen" as HopBlendMode, tint: "#38BDF8" },
  { id: "fire", label: "FIRE", emoji: "🔥", gradient: ["rgba(255,69,0,0.4)", "rgba(255,165,0,0.15)"], blendMode: "screen" as HopBlendMode, tint: "#EF4444" },
  { id: "dream", label: "DREAM", emoji: "💫", gradient: ["rgba(255,182,193,0.3)", "rgba(176,224,230,0.2)"], blendMode: "screen" as HopBlendMode, tint: "#F9A8D4" },
  { id: "matrix", label: "MATRIX", emoji: "🟢", gradient: ["rgba(0,255,0,0.15)", "rgba(0,128,0,0.25)"], blendMode: "screen" as HopBlendMode, tint: "#22C55E" },
];
