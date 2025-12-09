export interface AIModel {
  id: string;
  name: string;
  engineLabel: string;
  provider: string;
  description: string;
  bestFor: string[];
  styleTip: string;
  samplePrompt: string;
  icon: string;
  category: "pro" | "fast" | "anime" | "comic" | "artistic" | "character" | "photo" | "abstract";
}

export interface AIProvider {
  id: string;
  name: string;
  description: string;
  isFree: boolean;
  requiresKey: boolean;
  baseUrl: string;
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: "pollinations",
    name: "Pollinations AI",
    description: "Free, fast, no API key required. Best for quick concept art and iterative design. Supports multiple models through a single API.",
    isFree: true,
    requiresKey: false,
    baseUrl: "https://image.pollinations.ai"
  }
];

export const AI_MODELS: AIModel[] = [
  {
    id: "flow-studio",
    name: "Flow Studio",
    engineLabel: "FLUX.1-schnell",
    provider: "pollinations",
    description: "High-quality and smooth. Creates polished comic art with natural flow, clean shading, and cinematic lighting. Best for pro-level panels.",
    bestFor: ["Comic covers", "Hero shots", "Key art", "Vibrant backgrounds", "Consistent comic aesthetics"],
    styleTip: "Add detail + lighting cues for best results.",
    samplePrompt: "Clean 2D comic art, dramatic shadows, bold outlines, dynamic pose, low-angle shot",
    icon: "sparkles",
    category: "pro"
  },
  {
    id: "classic-freestyle",
    name: "Classic Freestyle",
    engineLabel: "Pollinations Default",
    provider: "pollinations",
    description: "Fast, loose, imaginative. Gives soft, dreamy, stylized looks. Perfect for experimenting and generating ideas quickly.",
    bestFor: ["Backgrounds & atmospheres", "Quick character tests", "Weird worlds / dream panels", "Fast drafts"],
    styleTip: "Be casual and expressive with prompts.",
    samplePrompt: "Trippy neon comic city, glitch graffiti, surreal atmosphere",
    icon: "zap",
    category: "fast"
  },
  {
    id: "anime-studio",
    name: "Anime Studio",
    engineLabel: "Pony Diffusion V6",
    provider: "pollinations",
    description: "Bright anime look with consistent characters. Elite for anime/manga energy — expressive eyes, smooth shading, stable output.",
    bestFor: ["Manga-style pages", "Anime-style characters", "Cute mascot characters", "Bright, smooth scenes"],
    styleTip: "Keep prompts short + vibe-focused.",
    samplePrompt: "Anime hero, sharp cel shading, expressive eyes, bright action lighting",
    icon: "star",
    category: "anime"
  },
  {
    id: "comic-linelab",
    name: "Comic LineLab",
    engineLabel: "SDXL + Comic LoRAs",
    provider: "pollinations",
    description: "Pure comic book look. Thick lines, flat colors, inking consistency, and stylized shadows. Closest to a real comic artist's workflow.",
    bestFor: ["Traditional comic pages", "Consistent multi-panel characters", "Retro or modern comic style", "Inked linework"],
    styleTip: "Mention line weight + flat color.",
    samplePrompt: "Thick black ink lines, flat colors, 90s comic style, high action",
    icon: "pen-tool",
    category: "comic"
  },
  {
    id: "sketch-mode",
    name: "Sketch Mode",
    engineLabel: "SDXL Turbo",
    provider: "pollinations",
    description: "INSANELY fast. Great for quick roughs, silhouettes, and layout ideas. Perfect for fast prototyping, not meant for final art.",
    bestFor: ["Panel planning", "Silhouette blocking", "Pose ideas", "Storyboard-style thumbnails"],
    styleTip: "Keep it simple and rough.",
    samplePrompt: "Rough comic sketch, simple lines, storyboard frame",
    icon: "pencil",
    category: "fast"
  },
  {
    id: "style-blender",
    name: "Style Blender",
    engineLabel: "Kandinsky 2.2",
    provider: "pollinations",
    description: "Painterly + abstract. For softer gradients, emotional scenes, painterly backgrounds, or fantasy landscapes.",
    bestFor: ["Emotional scenes", "Magic / dream sequences", "Painterly backgrounds", "Atmospheric panels"],
    styleTip: "Describe mood, not detail.",
    samplePrompt: "Misty blue forest, soft brush strokes, dreamy lighting",
    icon: "palette",
    category: "artistic"
  },
  {
    id: "character-engine",
    name: "Character Engine",
    engineLabel: "FaceID LoRA SDXL",
    provider: "pollinations",
    description: "Same character every time. Lets users lock their character's face for consistency across pages — crucial for long-form comics.",
    bestFor: ["Series characters", "Repeat panels", "Identity consistency", "Visual novels"],
    styleTip: "Add LoRA tag + pose for consistency.",
    samplePrompt: "[character], comic pose, clean lines, waist-up shot",
    icon: "user",
    category: "character"
  },
  {
    id: "retro-toon",
    name: "Retro Toon",
    engineLabel: "SD 1.5 + Cartoon LoRAs",
    provider: "pollinations",
    description: "Saturday-morning-cartoon style. Thick outlines, bright flat colors, expressive shapes — great for kids' comics and fun adventures.",
    bestFor: ["Humor comics", "Kids' book-style panels", "Cartoon characters", "Simple visual stories"],
    styleTip: "Keep it playful and exaggerated.",
    samplePrompt: "Bright cartoon, exaggerated shapes, thick outlines, playful energy",
    icon: "smile",
    category: "artistic"
  },
  {
    id: "realistic-photo",
    name: "Realistic Photo",
    engineLabel: "SDXL Realistic",
    provider: "pollinations",
    description: "Photorealistic images with high detail. Best for reference photos, realistic backgrounds, and product shots.",
    bestFor: ["Photo references", "Realistic backgrounds", "Product mockups", "Portrait references"],
    styleTip: "Be specific about lighting and camera angles.",
    samplePrompt: "Professional photo, natural lighting, sharp focus, high detail, 8k",
    icon: "camera",
    category: "photo"
  },
  {
    id: "abstract-art",
    name: "Abstract Art",
    engineLabel: "Kandinsky Abstract",
    provider: "pollinations",
    description: "Non-representational art with bold colors and shapes. Great for backgrounds, textures, and experimental visuals.",
    bestFor: ["Abstract backgrounds", "Texture creation", "Pattern design", "Experimental art"],
    styleTip: "Focus on colors, shapes, and emotions rather than objects.",
    samplePrompt: "Abstract geometric shapes, bold colors, modern art, dynamic composition",
    icon: "shapes",
    category: "abstract"
  },
  {
    id: "pixel-art",
    name: "Pixel Art Studio",
    engineLabel: "Pixel Art LoRA",
    provider: "pollinations",
    description: "Retro pixel art style. Perfect for game assets, nostalgic visuals, and 8-bit/16-bit aesthetic.",
    bestFor: ["Game sprites", "Retro game art", "Pixel characters", "8-bit style"],
    styleTip: "Keep designs simple and blocky.",
    samplePrompt: "Pixel art, 16-bit style, clean pixels, retro game aesthetic, sprite design",
    icon: "grid",
    category: "artistic"
  },
  {
    id: "watercolor-dream",
    name: "Watercolor Dream",
    engineLabel: "Watercolor Style",
    provider: "pollinations",
    description: "Soft watercolor painting style. Beautiful for emotional scenes, nature art, and gentle storytelling.",
    bestFor: ["Nature scenes", "Emotional moments", "Book illustrations", "Gentle atmospheres"],
    styleTip: "Describe flowing, soft elements.",
    samplePrompt: "Soft watercolor painting, flowing colors, gentle gradients, artistic brush strokes",
    icon: "droplets",
    category: "artistic"
  }
];

export function getModelById(id: string): AIModel | undefined {
  return AI_MODELS.find(m => m.id === id);
}

export function getModelsByCategory(category: AIModel["category"]): AIModel[] {
  return AI_MODELS.filter(m => m.category === category);
}

export function generateImageUrl(modelId: string, prompt: string, width = 1024, height = 1024): string {
  const seed = Math.floor(Math.random() * 10000);
  
  let styleModifier = "";
  switch (modelId) {
    case "flow-studio":
      styleModifier = ", high quality, cinematic lighting, professional comic art, detailed shading";
      break;
    case "classic-freestyle":
      styleModifier = ", creative, stylized, dreamy, artistic";
      break;
    case "anime-studio":
      styleModifier = ", anime style, cel shading, vibrant colors, expressive";
      break;
    case "comic-linelab":
      styleModifier = ", comic book style, thick ink lines, flat colors, bold outlines";
      break;
    case "sketch-mode":
      styleModifier = ", rough sketch, simple lines, storyboard, quick draft";
      break;
    case "style-blender":
      styleModifier = ", painterly, soft gradients, artistic, emotional";
      break;
    case "character-engine":
      styleModifier = ", consistent character, detailed face, clean lines";
      break;
    case "retro-toon":
      styleModifier = ", cartoon style, bright colors, thick outlines, playful";
      break;
    case "realistic-photo":
      styleModifier = ", photorealistic, natural lighting, sharp focus, high detail, 8k, professional photography";
      break;
    case "abstract-art":
      styleModifier = ", abstract art, bold colors, geometric shapes, modern art, dynamic composition";
      break;
    case "pixel-art":
      styleModifier = ", pixel art, 16-bit style, clean pixels, retro game aesthetic, sprite design";
      break;
    case "watercolor-dream":
      styleModifier = ", soft watercolor painting, flowing colors, gentle gradients, artistic brush strokes";
      break;
    default:
      styleModifier = ", high quality";
  }
  
  const encodedPrompt = encodeURIComponent(`${prompt}${styleModifier}`);
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${seed}`;
}
