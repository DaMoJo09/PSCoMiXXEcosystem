// Real-world creative skill taxonomy used by the Skill Passport.
// Maps any (action, toolUsed, sourceApp, category) combination produced by
// the XP engine onto a recruiter-meaningful skill bucket.

export const SKILLS = [
  "animation",
  "character",
  "fx",
  "drawing",
  "storytelling",
  "scene",
  "publishing",
  "collaboration",
  "learning",
] as const;

export type Skill = typeof SKILLS[number];

export const SKILL_LABELS: Record<Skill, string> = {
  animation: "Animation",
  character: "Character Creation",
  fx: "Visual FX",
  drawing: "Drawing & Illustration",
  storytelling: "Storytelling",
  scene: "Scene Building",
  publishing: "Publishing",
  collaboration: "Collaboration",
  learning: "Learning",
};

export const SKILL_DESCRIPTIONS: Record<Skill, string> = {
  animation: "Frame-by-frame motion, timing, easing, and motion design.",
  character: "Character design, rigging, expression sheets, and personality.",
  fx: "Visual effects, particles, lighting, and post-production polish.",
  drawing: "Linework, illustration, vector and raster art.",
  storytelling: "Scripts, dialogue, narrative pacing, and structure.",
  scene: "Composition, layouts, environments, and panel design.",
  publishing: "Releasing finished work to the world.",
  collaboration: "Reviews, mentor validation, team production credits.",
  learning: "Lessons, pathways, certifications.",
};

export interface SkillSignal {
  action?: string | null;
  toolUsed?: string | null;
  sourceApp?: string | null;
  category?: string | null;
}

const TOOL_RULES: Array<[RegExp, Skill]> = [
  [/motion|animat|tween|frame|timeline|hop/i, "animation"],
  [/fx|effect|particle|light|shader|render/i, "fx"],
  [/character|rig|avatar|portrait|face|expression/i, "character"],
  [/draw|brush|inkblade|stroke|pen|paint|sketch|vector/i, "drawing"],
  [/script|story|dialog|narrative|prompt|cyoa|vn|visual_novel/i, "storytelling"],
  [/scene|panel|layout|background|environment|stage|cover|comic|card/i, "scene"],
  [/publish|export|print|release|chapter/i, "publishing"],
];

const ACTION_RULES: Array<[RegExp, Skill]> = [
  [/^project_publish|^featured_publication|^project_export/i, "publishing"],
  [/^pathway_complete|^lesson_complete|^certification/i, "learning"],
  [/^mentor_validation|^production_credit|^endorse|^review/i, "collaboration"],
];

const SOURCE_RULES: Array<[string, Skill]> = [
  ["fxstudio", "fx"],
  ["lms", "learning"],
];

const CATEGORY_FALLBACK: Record<string, Skill> = {
  publishing: "publishing",
  learning: "learning",
  validation: "collaboration",
  workforce: "collaboration",
  engagement: "collaboration",
  achievement: "publishing",
  creation: "scene",
  sync: "collaboration",
};

export function mapToSkill(signal: SkillSignal): Skill {
  const action = signal.action ? String(signal.action).toLowerCase() : null;
  const toolUsed = signal.toolUsed ? String(signal.toolUsed).toLowerCase() : null;
  const sourceApp = signal.sourceApp ? String(signal.sourceApp).toLowerCase() : null;
  const category = signal.category ? String(signal.category).toLowerCase() : null;

  if (action) {
    for (const [pattern, skill] of ACTION_RULES) {
      if (pattern.test(action)) return skill;
    }
  }

  if (toolUsed) {
    for (const [pattern, skill] of TOOL_RULES) {
      if (pattern.test(toolUsed)) return skill;
    }
  }

  if (action) {
    for (const [pattern, skill] of TOOL_RULES) {
      if (pattern.test(action)) return skill;
    }
  }

  if (sourceApp) {
    for (const [needle, skill] of SOURCE_RULES) {
      if (sourceApp === needle) return skill;
    }
  }

  if (category && CATEGORY_FALLBACK[category]) {
    return CATEGORY_FALLBACK[category];
  }

  return "collaboration";
}

export interface SkillAggregate {
  skill: Skill;
  label: string;
  totalXp: number;
  eventCount: number;
}

export interface PreAggregatedSignal extends SkillSignal {
  xpAmount?: number;
  eventCount?: number;
}

export function aggregateBySkill(rows: PreAggregatedSignal[]): SkillAggregate[] {
  const buckets = new Map<Skill, { totalXp: number; eventCount: number }>();
  for (const r of rows) {
    const skill = mapToSkill(r);
    const bucket = buckets.get(skill) || { totalXp: 0, eventCount: 0 };
    bucket.totalXp += r.xpAmount || 0;
    bucket.eventCount += r.eventCount || 1;
    buckets.set(skill, bucket);
  }
  return Array.from(buckets.entries())
    .map(([skill, b]) => ({ skill, label: SKILL_LABELS[skill], ...b }))
    .sort((a, b) => b.totalXp - a.totalXp);
}
