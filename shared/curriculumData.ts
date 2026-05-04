export interface CurriculumObjective {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  trigger?: {
    action: string;
    count?: number;
    projectType?: string;
    toolUsed?: string;
  };
}

export interface CurriculumSession {
  id: string;
  number: string;
  title: string;
  type: string;
  duration: number;
  summary: string;
  objectives: CurriculumObjective[];
}

export interface CurriculumWeek {
  number: number;
  tag: string;
  title: string;
  deliverable: string;
  challengeTitle: string;
  challengeXp: number;
  sessions: CurriculumSession[];
}

export interface CurriculumDef {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  icon: string;
  weeks: CurriculumWeek[];
}

export const CURRICULA: CurriculumDef[] = [
  {
    id: "comixx-main",
    title: "CoMiXX Creator",
    subtitle: "Photography-Based Comics",
    accent: "#00e5ff",
    icon: "Camera",
    weeks: [
      {
        number: 1,
        tag: "📷 Week 01 · Capture",
        title: "SHOOT YOUR SCENE",
        deliverable: "5-shot Scene Collection",
        challengeTitle: "Complete your first scene collection",
        challengeXp: 100,
        sessions: [
          {
            id: "cm-w1-s1", number: "01.1", title: "The World is Your Studio", type: "LECTURE + DEMO", duration: 55,
            summary: "Intro to photography-based comics. Learn how to see environments as comic worlds.",
            objectives: [
              { id: "cm-w1-o1", title: "Create your first project", description: "Start a new comic project in the CoMiXX engine", xpReward: 25, trigger: { action: "project_created" } },
              { id: "cm-w1-o2", title: "Navigate the CoMiXX Engine", description: "Open and explore the Comic Creator workspace", xpReward: 15 },
            ]
          },
          {
            id: "cm-w1-s2", number: "01.2", title: "Rule of Thirds & Shot Composition", type: "STUDIO PRACTICE", duration: 55,
            summary: "Apply composition principles to real-world scenes using your phone camera.",
            objectives: [
              { id: "cm-w1-o3", title: "Upload a scene photo", description: "Import a photo asset into your project", xpReward: 25, trigger: { action: "save" } },
              { id: "cm-w1-o4", title: "Apply rule of thirds", description: "Compose a shot using the rule of thirds grid", xpReward: 20 },
            ]
          },
          {
            id: "cm-w1-s3", number: "01.3", title: "Lighting & Mood", type: "STUDIO PRACTICE", duration: 55,
            summary: "Understand how natural light creates atmosphere in your comic panels.",
            objectives: [
              { id: "cm-w1-o5", title: "Capture three lighting conditions", description: "Photograph the same scene in different lighting", xpReward: 30 },
            ]
          },
          {
            id: "cm-w1-s4", number: "01.4", title: "Building Your World Concept", type: "WORKSHOP", duration: 55,
            summary: "Create a shot list and plan your comic world using found environments.",
            objectives: [
              { id: "cm-w1-o6", title: "Write a world concept", description: "Document your comic's world and setting", xpReward: 25 },
            ]
          },
          {
            id: "cm-w1-s5", number: "01.5", title: "Scene Collection Review", type: "CRITIQUE + SHARE", duration: 55,
            summary: "Review and refine your 5-shot scene collection with peers.",
            objectives: [
              { id: "cm-w1-o7", title: "Save your scene collection", description: "Save your project with all 5 scene photos", xpReward: 30, trigger: { action: "save" } },
              { id: "cm-w1-o8", title: "Creator reflection", description: "Write a reflection on your photography choices", xpReward: 20 },
            ]
          }
        ]
      },
      {
        number: 2,
        tag: "🧑‍🎤 Week 02 · Character",
        title: "SHOOT YOUR CAST",
        deliverable: "Character Sheet with 3 Poses",
        challengeTitle: "Complete your character sheet",
        challengeXp: 100,
        sessions: [
          {
            id: "cm-w2-s1", number: "02.1", title: "Character Design Through Photography", type: "LECTURE + DEMO", duration: 55,
            summary: "How to capture and stylize real people as comic characters.",
            objectives: [
              { id: "cm-w2-o1", title: "Photograph character poses", description: "Capture 3 distinct character poses", xpReward: 25 },
            ]
          },
          {
            id: "cm-w2-s2", number: "02.2", title: "The Cutout Tool", type: "STUDIO PRACTICE", duration: 55,
            summary: "Use the background removal and cutout tools to isolate characters.",
            objectives: [
              { id: "cm-w2-o2", title: "Use the cutout tool", description: "Remove background from a character photo", xpReward: 30, trigger: { action: "ai_generation" } },
            ]
          },
          {
            id: "cm-w2-s3", number: "02.3", title: "Expression & Emotion", type: "STUDIO PRACTICE", duration: 55,
            summary: "Capture a range of emotions and expressions for your characters.",
            objectives: [
              { id: "cm-w2-o3", title: "Create expression range", description: "Capture 4+ expressions for one character", xpReward: 25 },
            ]
          },
          {
            id: "cm-w2-s4", number: "02.4", title: "Character Props & Costumes", type: "WORKSHOP", duration: 55,
            summary: "Add props and costume elements to define character identity.",
            objectives: [
              { id: "cm-w2-o4", title: "Style a character", description: "Add props or costume elements to your character", xpReward: 20 },
            ]
          },
          {
            id: "cm-w2-s5", number: "02.5", title: "Character Sheet Assembly", type: "CRITIQUE + SHARE", duration: 55,
            summary: "Assemble your final character sheet with all poses and expressions.",
            objectives: [
              { id: "cm-w2-o5", title: "Save character sheet", description: "Save your complete character sheet project", xpReward: 30, trigger: { action: "save" } },
            ]
          }
        ]
      },
      {
        number: 3,
        tag: "✨ Week 03 · FX",
        title: "STYLIZE YOUR WORLD",
        deliverable: "3 Styled Scene Panels",
        challengeTitle: "Complete your styled panels",
        challengeXp: 100,
        sessions: [
          {
            id: "cm-w3-s1", number: "03.1", title: "Filters & Comic Styles", type: "LECTURE + DEMO", duration: 55,
            summary: "Transform photos into comic art using filters and style presets.",
            objectives: [
              { id: "cm-w3-o1", title: "Apply a comic filter", description: "Use FX Studio to stylize a photo", xpReward: 25, trigger: { action: "ai_generation" } },
            ]
          },
          {
            id: "cm-w3-s2", number: "03.2", title: "Color Grading for Comics", type: "STUDIO PRACTICE", duration: 55,
            summary: "Use color grading to establish mood and atmosphere.",
            objectives: [
              { id: "cm-w3-o2", title: "Color grade a scene", description: "Apply color grading to establish mood", xpReward: 25 },
            ]
          },
          {
            id: "cm-w3-s3", number: "03.3", title: "Texture & Halftone Effects", type: "STUDIO PRACTICE", duration: 55,
            summary: "Add classic comic textures like halftone dots, grain, and line work.",
            objectives: [
              { id: "cm-w3-o3", title: "Add texture effects", description: "Apply halftone or texture overlay to a panel", xpReward: 25 },
            ]
          },
          {
            id: "cm-w3-s4", number: "03.4", title: "Compositing Characters & Scenes", type: "WORKSHOP", duration: 55,
            summary: "Combine cutout characters with styled backgrounds.",
            objectives: [
              { id: "cm-w3-o4", title: "Composite a scene", description: "Place a character cutout into a styled background", xpReward: 30, trigger: { action: "save" } },
            ]
          },
          {
            id: "cm-w3-s5", number: "03.5", title: "Style Guide Review", type: "CRITIQUE + SHARE", duration: 55,
            summary: "Finalize your visual style and review with peers.",
            objectives: [
              { id: "cm-w3-o5", title: "Save styled panels", description: "Save your 3 completed styled panels", xpReward: 30, trigger: { action: "save" } },
            ]
          }
        ]
      },
      {
        number: 4,
        tag: "📐 Week 04 · Layout",
        title: "BUILD YOUR PAGES",
        deliverable: "2-Page Comic Layout",
        challengeTitle: "Complete your comic layout",
        challengeXp: 100,
        sessions: [
          {
            id: "cm-w4-s1", number: "04.1", title: "Panel Design & Flow", type: "LECTURE + DEMO", duration: 55,
            summary: "Learn panel layout principles — reading flow, gutter spacing, and visual rhythm.",
            objectives: [
              { id: "cm-w4-o1", title: "Create panel layout", description: "Design a multi-panel page layout", xpReward: 25, trigger: { action: "save" } },
            ]
          },
          {
            id: "cm-w4-s2", number: "04.2", title: "Photo-to-Panel Placement", type: "STUDIO PRACTICE", duration: 55,
            summary: "Place your styled photos into comic panel frames.",
            objectives: [
              { id: "cm-w4-o2", title: "Fill panels with photos", description: "Place styled photos into your panel layout", xpReward: 25 },
            ]
          },
          {
            id: "cm-w4-s3", number: "04.3", title: "Dynamic Compositions", type: "STUDIO PRACTICE", duration: 55,
            summary: "Create visual impact through panel size variation and splash pages.",
            objectives: [
              { id: "cm-w4-o3", title: "Create a splash panel", description: "Design an impactful full or half-page panel", xpReward: 25 },
            ]
          },
          {
            id: "cm-w4-s4", number: "04.4", title: "Page Assembly", type: "WORKSHOP", duration: 55,
            summary: "Assemble your 2-page spread with consistent styling.",
            objectives: [
              { id: "cm-w4-o4", title: "Complete 2-page layout", description: "Finish assembling your 2-page comic spread", xpReward: 30, trigger: { action: "save" } },
            ]
          },
          {
            id: "cm-w4-s5", number: "04.5", title: "Layout Review", type: "CRITIQUE + SHARE", duration: 55,
            summary: "Peer review of page layouts and visual flow.",
            objectives: [
              { id: "cm-w4-o5", title: "Get peer feedback", description: "Share your layout for peer critique", xpReward: 20 },
            ]
          }
        ]
      },
      {
        number: 5,
        tag: "💬 Week 05 · Text",
        title: "ADD YOUR VOICE",
        deliverable: "Lettered Comic Pages",
        challengeTitle: "Complete your lettered pages",
        challengeXp: 100,
        sessions: [
          {
            id: "cm-w5-s1", number: "05.1", title: "Dialogue & Speech Bubbles", type: "LECTURE + DEMO", duration: 55,
            summary: "Learn comic lettering — balloon styles, tail direction, and font choices.",
            objectives: [
              { id: "cm-w5-o1", title: "Add speech bubbles", description: "Place dialogue bubbles on your comic pages", xpReward: 25, trigger: { action: "save" } },
            ]
          },
          {
            id: "cm-w5-s2", number: "05.2", title: "Sound Effects & Onomatopoeia", type: "STUDIO PRACTICE", duration: 55,
            summary: "Create comic SFX text — BOOM, CRASH, WHOOSH and more.",
            objectives: [
              { id: "cm-w5-o2", title: "Add SFX text", description: "Place sound effect text on action panels", xpReward: 25 },
            ]
          },
          {
            id: "cm-w5-s3", number: "05.3", title: "Captions & Narration", type: "STUDIO PRACTICE", duration: 55,
            summary: "Use caption boxes for narration and inner monologue.",
            objectives: [
              { id: "cm-w5-o3", title: "Add narration captions", description: "Write and place narrative caption boxes", xpReward: 25 },
            ]
          },
          {
            id: "cm-w5-s4", number: "05.4", title: "Typography & Style", type: "WORKSHOP", duration: 55,
            summary: "Match typography to your comic's tone and genre.",
            objectives: [
              { id: "cm-w5-o4", title: "Style your lettering", description: "Choose and apply consistent typography", xpReward: 20 },
            ]
          },
          {
            id: "cm-w5-s5", number: "05.5", title: "Lettering Review", type: "CRITIQUE + SHARE", duration: 55,
            summary: "Review complete lettered pages for readability and impact.",
            objectives: [
              { id: "cm-w5-o5", title: "Save lettered pages", description: "Save your fully lettered comic pages", xpReward: 30, trigger: { action: "save" } },
            ]
          }
        ]
      },
      {
        number: 6,
        tag: "🚀 Week 06 · Publish",
        title: "LAUNCH YOUR COMIC",
        deliverable: "Published 4-Page Photo Comic",
        challengeTitle: "Publish your photo comic",
        challengeXp: 150,
        sessions: [
          {
            id: "cm-w6-s1", number: "06.1", title: "Final Assembly & Polish", type: "STUDIO PRACTICE", duration: 55,
            summary: "Compile all pages into final reading order with cover.",
            objectives: [
              { id: "cm-w6-o1", title: "Assemble final comic", description: "Put all pages in reading order with cover", xpReward: 30, trigger: { action: "save" } },
            ]
          },
          {
            id: "cm-w6-s2", number: "06.2", title: "Export for Print & Digital", type: "WORKSHOP", duration: 55,
            summary: "Export your comic in multiple formats — PNG, PDF, print-ready.",
            objectives: [
              { id: "cm-w6-o2", title: "Export your comic", description: "Export your comic in at least one format", xpReward: 50, trigger: { action: "export_completed" } },
            ]
          },
          {
            id: "cm-w6-s3", number: "06.3", title: "Publishing to the Ecosystem", type: "LECTURE + DEMO", duration: 55,
            summary: "Learn the publishing pipeline — metadata, tags, and community sharing.",
            objectives: [
              { id: "cm-w6-o3", title: "Publish your comic", description: "Publish your comic to the PSCoMiXX ecosystem", xpReward: 100, trigger: { action: "publish" } },
            ]
          },
          {
            id: "cm-w6-s4", number: "06.4", title: "Creator Showcase Prep", type: "WORKSHOP", duration: 55,
            summary: "Prepare your presentation for the class showcase.",
            objectives: [
              { id: "cm-w6-o4", title: "Prepare showcase", description: "Write your creator statement and presentation notes", xpReward: 25 },
            ]
          },
          {
            id: "cm-w6-s5", number: "06.5", title: "Launch Day!", type: "SHOWCASE", duration: 55,
            summary: "Present your finished photo comic to the class.",
            objectives: [
              { id: "cm-w6-o5", title: "Complete the curriculum!", description: "Present your work and celebrate your journey", xpReward: 50 },
            ]
          }
        ]
      }
    ]
  },
  {
    id: "comixx-creator",
    title: "CoMiXX Creator",
    subtitle: "Digital Comics & Platform",
    accent: "#a855f7",
    icon: "Palette",
    weeks: [
      {
        number: 1,
        tag: "📝 Week 01 · Script",
        title: "WRITE YOUR STORY",
        deliverable: "Story Bible & Cover Concept",
        challengeTitle: "Complete your story bible",
        challengeXp: 100,
        sessions: [
          {
            id: "cc-w1-s1", number: "01.1", title: "Story Structure for Comics", type: "LECTURE + DEMO", duration: 55,
            summary: "Three-act structure, character arcs, and comic pacing.",
            objectives: [
              { id: "cc-w1-o1", title: "Create a new project", description: "Start a new digital comic project", xpReward: 25, trigger: { action: "project_created" } },
              { id: "cc-w1-o2", title: "Write your story premise", description: "Define your comic's core concept in one paragraph", xpReward: 20 },
            ]
          },
          {
            id: "cc-w1-s2", number: "01.2", title: "Building Your Cast", type: "WORKSHOP", duration: 55,
            summary: "Create compelling characters with clear motivations and visual design.",
            objectives: [
              { id: "cc-w1-o3", title: "Design your protagonist", description: "Create a character profile with visual reference", xpReward: 25 },
            ]
          },
          {
            id: "cc-w1-s3", number: "01.3", title: "World & Setting", type: "STUDIO PRACTICE", duration: 55,
            summary: "Design the world your story takes place in.",
            objectives: [
              { id: "cc-w1-o4", title: "Define your world", description: "Document setting details and visual mood", xpReward: 20 },
            ]
          },
          {
            id: "cc-w1-s4", number: "01.4", title: "Cover Concept & Thumbnails", type: "STUDIO PRACTICE", duration: 55,
            summary: "Sketch cover concepts using AI generation or hand-drawn thumbnails.",
            objectives: [
              { id: "cc-w1-o5", title: "Generate cover concept", description: "Create a cover concept using AI or sketching", xpReward: 30, trigger: { action: "ai_generation" } },
            ]
          },
          {
            id: "cc-w1-s5", number: "01.5", title: "Story Bible Review", type: "CRITIQUE + SHARE", duration: 55,
            summary: "Present and refine your story bible with peers.",
            objectives: [
              { id: "cc-w1-o6", title: "Save your story bible", description: "Save your project with story bible content", xpReward: 25, trigger: { action: "save" } },
            ]
          }
        ]
      },
      {
        number: 2,
        tag: "✒️ Week 02 · Ink",
        title: "LAYOUT YOUR PAGES",
        deliverable: "4-Page Thumbnail Layout",
        challengeTitle: "Complete your page layouts",
        challengeXp: 100,
        sessions: [
          {
            id: "cc-w2-s1", number: "02.1", title: "Panel Layout Fundamentals", type: "LECTURE + DEMO", duration: 55,
            summary: "Grid systems, panel flow, and gutter design in the Layout Mode.",
            objectives: [
              { id: "cc-w2-o1", title: "Use Layout Mode", description: "Open and use the comic panel layout tools", xpReward: 25, trigger: { action: "save" } },
            ]
          },
          {
            id: "cc-w2-s2", number: "02.2", title: "INKBLADE Engine", type: "STUDIO PRACTICE", duration: 55,
            summary: "Explore the INKBLADE drawing engine for digital inking.",
            objectives: [
              { id: "cc-w2-o2", title: "Draw with INKBLADE", description: "Create line art using the INKBLADE engine", xpReward: 30 },
            ]
          },
          {
            id: "cc-w2-s3", number: "02.3", title: "AI-Assisted Art Generation", type: "STUDIO PRACTICE", duration: 55,
            summary: "Use AI tools to generate panel art and backgrounds.",
            objectives: [
              { id: "cc-w2-o3", title: "Generate panel art with AI", description: "Use AI generation to create comic panel content", xpReward: 30, trigger: { action: "ai_generation" } },
            ]
          },
          {
            id: "cc-w2-s4", number: "02.4", title: "Refining Layouts", type: "WORKSHOP", duration: 55,
            summary: "Adjust panel sizes, add gutters, and refine page flow.",
            objectives: [
              { id: "cc-w2-o4", title: "Refine page layouts", description: "Adjust and polish your 4-page layout", xpReward: 20 },
            ]
          },
          {
            id: "cc-w2-s5", number: "02.5", title: "Layout Review", type: "CRITIQUE + SHARE", duration: 55,
            summary: "Present layouts for critique and iteration.",
            objectives: [
              { id: "cc-w2-o5", title: "Save completed layouts", description: "Save your 4-page thumbnail layouts", xpReward: 25, trigger: { action: "save" } },
            ]
          }
        ]
      },
      {
        number: 3,
        tag: "🎨 Week 03 · Color",
        title: "PAINT YOUR WORLD",
        deliverable: "Colored Comic Pages",
        challengeTitle: "Complete your colored pages",
        challengeXp: 100,
        sessions: [
          {
            id: "cc-w3-s1", number: "03.1", title: "Color Theory for Comics", type: "LECTURE + DEMO", duration: 55,
            summary: "Color palettes, mood, and visual hierarchy in sequential art.",
            objectives: [
              { id: "cc-w3-o1", title: "Create a color palette", description: "Define your comic's color scheme", xpReward: 20 },
            ]
          },
          {
            id: "cc-w3-s2", number: "03.2", title: "Flatting & Base Colors", type: "STUDIO PRACTICE", duration: 55,
            summary: "Apply flat color fills to your line art.",
            objectives: [
              { id: "cc-w3-o2", title: "Apply base colors", description: "Color your panels with flat base colors", xpReward: 25, trigger: { action: "save" } },
            ]
          },
          {
            id: "cc-w3-s3", number: "03.3", title: "Lighting & Shadows", type: "STUDIO PRACTICE", duration: 55,
            summary: "Add depth through lighting effects and shadow work.",
            objectives: [
              { id: "cc-w3-o3", title: "Add lighting effects", description: "Apply shadows and highlights to your panels", xpReward: 30 },
            ]
          },
          {
            id: "cc-w3-s4", number: "03.4", title: "FX Studio Integration", type: "WORKSHOP", duration: 55,
            summary: "Use FX Studio for advanced visual effects on panels.",
            objectives: [
              { id: "cc-w3-o4", title: "Apply FX to panels", description: "Use FX Studio effects on your comic panels", xpReward: 30, trigger: { action: "ai_generation" } },
            ]
          },
          {
            id: "cc-w3-s5", number: "03.5", title: "Color Review", type: "CRITIQUE + SHARE", duration: 55,
            summary: "Review colored pages for consistency and impact.",
            objectives: [
              { id: "cc-w3-o5", title: "Save colored pages", description: "Save your fully colored comic pages", xpReward: 25, trigger: { action: "save" } },
            ]
          }
        ]
      },
      {
        number: 4,
        tag: "🎬 Week 04 · Motion",
        title: "ANIMATE YOUR STORY",
        deliverable: "Animated Comic Sequence",
        challengeTitle: "Complete your animation",
        challengeXp: 100,
        sessions: [
          {
            id: "cc-w4-s1", number: "04.1", title: "Motion Comics Intro", type: "LECTURE + DEMO", duration: 55,
            summary: "How motion enhances comics — parallax, tweens, and transitions.",
            objectives: [
              { id: "cc-w4-o1", title: "Create a HOP", description: "Start your first animated comic sequence", xpReward: 30, trigger: { action: "hop_created" } },
            ]
          },
          {
            id: "cc-w4-s2", number: "04.2", title: "Timeline & Keyframes", type: "STUDIO PRACTICE", duration: 55,
            summary: "Use the timeline editor for layer animation and sequencing.",
            objectives: [
              { id: "cc-w4-o2", title: "Add keyframe animation", description: "Create keyframe-based motion for a layer", xpReward: 25 },
            ]
          },
          {
            id: "cc-w4-s3", number: "04.3", title: "Transitions & Effects", type: "STUDIO PRACTICE", duration: 55,
            summary: "Add panel transitions, camera movements, and particle effects.",
            objectives: [
              { id: "cc-w4-o3", title: "Add transitions", description: "Create smooth panel transitions in your sequence", xpReward: 25 },
            ]
          },
          {
            id: "cc-w4-s4", number: "04.4", title: "Audio Timing (Preview)", type: "WORKSHOP", duration: 55,
            summary: "Preview how audio syncs with your motion sequence.",
            objectives: [
              { id: "cc-w4-o4", title: "Save your HOP", description: "Save your animated comic sequence", xpReward: 25, trigger: { action: "hop_saved" } },
            ]
          },
          {
            id: "cc-w4-s5", number: "04.5", title: "Motion Review", type: "CRITIQUE + SHARE", duration: 55,
            summary: "Review and refine your motion comic sequence.",
            objectives: [
              { id: "cc-w4-o5", title: "Polish your animation", description: "Refine timing and transitions", xpReward: 25 },
            ]
          }
        ]
      },
      {
        number: 5,
        tag: "🔊 Week 05 · Sound",
        title: "LAYER YOUR AUDIO",
        deliverable: "Soundscaped Motion Comic",
        challengeTitle: "Complete your audio layers",
        challengeXp: 100,
        sessions: [
          {
            id: "cc-w5-s1", number: "05.1", title: "Audio Design for Comics", type: "LECTURE + DEMO", duration: 55,
            summary: "Sound effects, music, and ambient audio in motion comics.",
            objectives: [
              { id: "cc-w5-o1", title: "Add background audio", description: "Add ambient sound to your motion comic", xpReward: 25 },
            ]
          },
          {
            id: "cc-w5-s2", number: "05.2", title: "SFX Timing", type: "STUDIO PRACTICE", duration: 55,
            summary: "Sync sound effects to specific panel moments.",
            objectives: [
              { id: "cc-w5-o2", title: "Sync SFX to panels", description: "Time sound effects to match panel actions", xpReward: 25 },
            ]
          },
          {
            id: "cc-w5-s3", number: "05.3", title: "Voice & Narration", type: "STUDIO PRACTICE", duration: 55,
            summary: "Record or add voiceover narration tracks.",
            objectives: [
              { id: "cc-w5-o3", title: "Add narration audio", description: "Add voice or narration track to your comic", xpReward: 25 },
            ]
          },
          {
            id: "cc-w5-s4", number: "05.4", title: "Audio Mixing", type: "WORKSHOP", duration: 55,
            summary: "Balance audio levels and create a polished soundscape.",
            objectives: [
              { id: "cc-w5-o4", title: "Mix audio levels", description: "Balance music, SFX, and voice tracks", xpReward: 20 },
            ]
          },
          {
            id: "cc-w5-s5", number: "05.5", title: "Sound Review", type: "CRITIQUE + SHARE", duration: 55,
            summary: "Review complete audio experience with peers.",
            objectives: [
              { id: "cc-w5-o5", title: "Save soundscaped comic", description: "Save your complete soundscaped motion comic", xpReward: 30, trigger: { action: "save" } },
            ]
          }
        ]
      },
      {
        number: 6,
        tag: "🚀 Week 06 · Launch",
        title: "PUBLISH YOUR COMIC",
        deliverable: "Published Interactive Digital Comic",
        challengeTitle: "Launch your digital comic",
        challengeXp: 150,
        sessions: [
          {
            id: "cc-w6-s1", number: "06.1", title: "Final Assembly", type: "STUDIO PRACTICE", duration: 55,
            summary: "Compile all elements — art, motion, audio — into final form.",
            objectives: [
              { id: "cc-w6-o1", title: "Assemble final comic", description: "Compile all pages, animations, and audio", xpReward: 30, trigger: { action: "save" } },
            ]
          },
          {
            id: "cc-w6-s2", number: "06.2", title: "Quality Assurance", type: "WORKSHOP", duration: 55,
            summary: "Test your comic across formats and fix any issues.",
            objectives: [
              { id: "cc-w6-o2", title: "Test all formats", description: "Review your comic in reader and motion modes", xpReward: 20 },
            ]
          },
          {
            id: "cc-w6-s3", number: "06.3", title: "Export & Distribute", type: "STUDIO PRACTICE", duration: 55,
            summary: "Export your comic for multiple platforms.",
            objectives: [
              { id: "cc-w6-o3", title: "Export your comic", description: "Export in at least one format", xpReward: 50, trigger: { action: "export_completed" } },
            ]
          },
          {
            id: "cc-w6-s4", number: "06.4", title: "Publish to Ecosystem", type: "LECTURE + DEMO", duration: 55,
            summary: "Publish your interactive comic to the PSCoMiXX ecosystem.",
            objectives: [
              { id: "cc-w6-o4", title: "Publish your comic", description: "Publish to the PSCoMiXX community", xpReward: 100, trigger: { action: "publish" } },
            ]
          },
          {
            id: "cc-w6-s5", number: "06.5", title: "Launch Party!", type: "SHOWCASE", duration: 55,
            summary: "Present your finished interactive digital comic.",
            objectives: [
              { id: "cc-w6-o5", title: "Complete the curriculum!", description: "Present your work and celebrate", xpReward: 50 },
            ]
          }
        ]
      }
    ]
  },
  {
    id: "fx-studio",
    title: "FX Studio",
    subtitle: "Visual Effects & Compositing",
    accent: "#ff2d78",
    icon: "Sparkles",
    weeks: [
      {
        number: 1,
        tag: "📝 Week 01 · Script",
        title: "DRAFT YOUR VISION",
        deliverable: "Multi-Format Script Draft",
        challengeTitle: "Complete your vision script",
        challengeXp: 100,
        sessions: [
          {
            id: "fx-w1-s1", number: "01.1", title: "Multi-Format Storytelling", type: "LECTURE + DEMO", duration: 55,
            summary: "How one story becomes a comic, novel, motion piece, and more.",
            objectives: [
              { id: "fx-w1-o1", title: "Create an FX project", description: "Start a new project for visual effects work", xpReward: 25, trigger: { action: "project_created" } },
              { id: "fx-w1-o2", title: "Write your story draft", description: "Draft your multi-format story concept", xpReward: 20 },
            ]
          },
          {
            id: "fx-w1-s2", number: "01.2", title: "Visual Script Planning", type: "WORKSHOP", duration: 55,
            summary: "Plan visual sequences for your story across formats.",
            objectives: [
              { id: "fx-w1-o3", title: "Plan visual sequences", description: "Map out key visual moments", xpReward: 20 },
            ]
          },
          {
            id: "fx-w1-s3", number: "01.3", title: "Reference & Mood Boards", type: "STUDIO PRACTICE", duration: 55,
            summary: "Build reference collections for your visual effects work.",
            objectives: [
              { id: "fx-w1-o4", title: "Build a mood board", description: "Collect visual references for your project", xpReward: 25 },
            ]
          },
          {
            id: "fx-w1-s4", number: "01.4", title: "Format Adaptation", type: "WORKSHOP", duration: 55,
            summary: "Adapt your story for different output formats.",
            objectives: [
              { id: "fx-w1-o5", title: "Adapt for 2+ formats", description: "Plan how your story works in multiple formats", xpReward: 25 },
            ]
          },
          {
            id: "fx-w1-s5", number: "01.5", title: "Script Review", type: "CRITIQUE + SHARE", duration: 55,
            summary: "Present your multi-format script draft.",
            objectives: [
              { id: "fx-w1-o6", title: "Save your script", description: "Save your script draft project", xpReward: 25, trigger: { action: "save" } },
            ]
          }
        ]
      },
      {
        number: 2,
        tag: "🧑‍🎤 Week 02 · Character",
        title: "CAST YOUR STORY",
        deliverable: "Character Cast Sheet",
        challengeTitle: "Complete your cast sheet",
        challengeXp: 100,
        sessions: [
          {
            id: "fx-w2-s1", number: "02.1", title: "Character Archetypes", type: "LECTURE + DEMO", duration: 55,
            summary: "Hero, Foil, Wildcard — building a compelling cast.",
            objectives: [
              { id: "fx-w2-o1", title: "Define 3 characters", description: "Create Hero, Foil, and Wildcard archetypes", xpReward: 25 },
            ]
          },
          {
            id: "fx-w2-s2", number: "02.2", title: "AI Character Generation", type: "STUDIO PRACTICE", duration: 55,
            summary: "Use AI to generate character art and visual concepts.",
            objectives: [
              { id: "fx-w2-o2", title: "Generate character art", description: "Use AI to create character visuals", xpReward: 30, trigger: { action: "ai_generation" } },
            ]
          },
          {
            id: "fx-w2-s3", number: "02.3", title: "Character Compositing", type: "STUDIO PRACTICE", duration: 55,
            summary: "Use FX Studio layers to composite character sheets.",
            objectives: [
              { id: "fx-w2-o3", title: "Composite a character", description: "Layer character elements in FX Studio", xpReward: 30, trigger: { action: "save" } },
            ]
          },
          {
            id: "fx-w2-s4", number: "02.4", title: "Expression & Turnaround", type: "WORKSHOP", duration: 55,
            summary: "Create expression sheets and character turnarounds.",
            objectives: [
              { id: "fx-w2-o4", title: "Create expression sheet", description: "Show your character in multiple expressions", xpReward: 25 },
            ]
          },
          {
            id: "fx-w2-s5", number: "02.5", title: "Cast Review", type: "CRITIQUE + SHARE", duration: 55,
            summary: "Present your character cast for feedback.",
            objectives: [
              { id: "fx-w2-o5", title: "Save cast sheet", description: "Save your complete character cast sheet", xpReward: 25, trigger: { action: "save" } },
            ]
          }
        ]
      },
      {
        number: 3,
        tag: "🎬 Week 03 · Cinematography",
        title: "FRAME YOUR SHOTS",
        deliverable: "Shot Composition Portfolio",
        challengeTitle: "Complete your shot portfolio",
        challengeXp: 100,
        sessions: [
          {
            id: "fx-w3-s1", number: "03.1", title: "Camera Angles & Shots", type: "LECTURE + DEMO", duration: 55,
            summary: "Close-up, wide, dutch angle — cinematic framing for visual stories.",
            objectives: [
              { id: "fx-w3-o1", title: "Frame 5 shot types", description: "Create examples of 5 different camera angles", xpReward: 25 },
            ]
          },
          {
            id: "fx-w3-s2", number: "03.2", title: "Depth & Parallax", type: "STUDIO PRACTICE", duration: 55,
            summary: "Create depth using layered compositions and parallax effects.",
            objectives: [
              { id: "fx-w3-o2", title: "Create parallax layers", description: "Build a layered composition with depth", xpReward: 30, trigger: { action: "save" } },
            ]
          },
          {
            id: "fx-w3-s3", number: "03.3", title: "World Mode Composition", type: "STUDIO PRACTICE", duration: 55,
            summary: "Use World mode to create immersive scene compositions.",
            objectives: [
              { id: "fx-w3-o3", title: "Compose a world scene", description: "Build a scene in World mode", xpReward: 30, trigger: { action: "save" } },
            ]
          },
          {
            id: "fx-w3-s4", number: "03.4", title: "Mood Lighting in FX", type: "WORKSHOP", duration: 55,
            summary: "Apply lighting effects to establish mood and atmosphere.",
            objectives: [
              { id: "fx-w3-o4", title: "Apply lighting FX", description: "Add lighting effects to a composition", xpReward: 25, trigger: { action: "ai_generation" } },
            ]
          },
          {
            id: "fx-w3-s5", number: "03.5", title: "Shot Review", type: "CRITIQUE + SHARE", duration: 55,
            summary: "Review shot compositions with peers.",
            objectives: [
              { id: "fx-w3-o5", title: "Save shot portfolio", description: "Save your shot composition portfolio", xpReward: 25, trigger: { action: "save" } },
            ]
          }
        ]
      },
      {
        number: 4,
        tag: "🧪 Week 04 · Asset Lab",
        title: "CAPTURE & IMPORT",
        deliverable: "Asset Library Collection",
        challengeTitle: "Build your asset library",
        challengeXp: 100,
        sessions: [
          {
            id: "fx-w4-s1", number: "04.1", title: "Asset Capture Techniques", type: "LECTURE + DEMO", duration: 55,
            summary: "Capture, scan, and import real-world assets for digital compositing.",
            objectives: [
              { id: "fx-w4-o1", title: "Import 5 assets", description: "Capture and import 5 assets into your library", xpReward: 25 },
            ]
          },
          {
            id: "fx-w4-s2", number: "04.2", title: "Background Removal & Cleanup", type: "STUDIO PRACTICE", duration: 55,
            summary: "Clean up imported assets using AI background removal.",
            objectives: [
              { id: "fx-w4-o2", title: "Clean up assets with AI", description: "Use AI tools to clean and prepare assets", xpReward: 30, trigger: { action: "ai_generation" } },
            ]
          },
          {
            id: "fx-w4-s3", number: "04.3", title: "Asset Organization", type: "STUDIO PRACTICE", duration: 55,
            summary: "Organize your asset library with tags and categories.",
            objectives: [
              { id: "fx-w4-o3", title: "Organize your library", description: "Tag and categorize your asset collection", xpReward: 20 },
            ]
          },
          {
            id: "fx-w4-s4", number: "04.4", title: "Texture & Material Collection", type: "WORKSHOP", duration: 55,
            summary: "Build a texture library for compositing work.",
            objectives: [
              { id: "fx-w4-o4", title: "Collect 8+ textures", description: "Build a texture library with 8 or more textures", xpReward: 25, trigger: { action: "save" } },
            ]
          },
          {
            id: "fx-w4-s5", number: "04.5", title: "Asset Library Review", type: "CRITIQUE + SHARE", duration: 55,
            summary: "Present your asset library and discuss sourcing strategies.",
            objectives: [
              { id: "fx-w4-o5", title: "Save asset library", description: "Save your organized asset library project", xpReward: 25, trigger: { action: "save" } },
            ]
          }
        ]
      },
      {
        number: 5,
        tag: "🎛️ Week 05 · Studio Pass",
        title: "COMPOSE YOUR MASTERPIECE",
        deliverable: "Multi-Mode Composition",
        challengeTitle: "Complete your composition",
        challengeXp: 100,
        sessions: [
          {
            id: "fx-w5-s1", number: "05.1", title: "Multi-Layer Compositing", type: "LECTURE + DEMO", duration: 55,
            summary: "Combine characters, backgrounds, effects, and text in complex compositions.",
            objectives: [
              { id: "fx-w5-o1", title: "Create multi-layer scene", description: "Build a composition with 5+ layers", xpReward: 30, trigger: { action: "save" } },
            ]
          },
          {
            id: "fx-w5-s2", number: "05.2", title: "Blending & Masking", type: "STUDIO PRACTICE", duration: 55,
            summary: "Use blend modes and masks for professional compositing.",
            objectives: [
              { id: "fx-w5-o2", title: "Apply blend modes", description: "Use blend modes to integrate layers", xpReward: 25 },
            ]
          },
          {
            id: "fx-w5-s3", number: "05.3", title: "Motion & Animation Layers", type: "STUDIO PRACTICE", duration: 55,
            summary: "Add motion to your composition using the HOP timeline.",
            objectives: [
              { id: "fx-w5-o3", title: "Create a motion HOP", description: "Build an animated version of your composition", xpReward: 30, trigger: { action: "hop_created" } },
            ]
          },
          {
            id: "fx-w5-s4", number: "05.4", title: "Cross-Format Output", type: "WORKSHOP", duration: 55,
            summary: "Prepare your composition for multiple output formats.",
            objectives: [
              { id: "fx-w5-o4", title: "Prepare multi-format output", description: "Set up your composition for 2+ output formats", xpReward: 25 },
            ]
          },
          {
            id: "fx-w5-s5", number: "05.5", title: "Composition Review", type: "CRITIQUE + SHARE", duration: 55,
            summary: "Present your multi-mode composition.",
            objectives: [
              { id: "fx-w5-o5", title: "Save composition", description: "Save your final multi-mode composition", xpReward: 25, trigger: { action: "save" } },
            ]
          }
        ]
      },
      {
        number: 6,
        tag: "🏆 Week 06 · Final Master",
        title: "EXPORT YOUR MASTERPIECE",
        deliverable: "Final Exported Masterpiece",
        challengeTitle: "Export and publish your masterpiece",
        challengeXp: 150,
        sessions: [
          {
            id: "fx-w6-s1", number: "06.1", title: "Final Polish", type: "STUDIO PRACTICE", duration: 55,
            summary: "Polish every detail of your final composition.",
            objectives: [
              { id: "fx-w6-o1", title: "Polish final work", description: "Refine and perfect your final composition", xpReward: 30, trigger: { action: "save" } },
            ]
          },
          {
            id: "fx-w6-s2", number: "06.2", title: "Export Pipeline", type: "WORKSHOP", duration: 55,
            summary: "Master the export pipeline for print, digital, and motion formats.",
            objectives: [
              { id: "fx-w6-o2", title: "Export your masterpiece", description: "Export in your chosen format", xpReward: 50, trigger: { action: "export_completed" } },
            ]
          },
          {
            id: "fx-w6-s3", number: "06.3", title: "Publish to Ecosystem", type: "LECTURE + DEMO", duration: 55,
            summary: "Publish your final work to the PSCoMiXX ecosystem.",
            objectives: [
              { id: "fx-w6-o3", title: "Publish your work", description: "Publish to the PSCoMiXX community", xpReward: 100, trigger: { action: "publish" } },
            ]
          },
          {
            id: "fx-w6-s4", number: "06.4", title: "Portfolio & Presentation", type: "WORKSHOP", duration: 55,
            summary: "Prepare your portfolio presentation for the showcase.",
            objectives: [
              { id: "fx-w6-o4", title: "Prepare portfolio", description: "Write your artist statement and portfolio notes", xpReward: 25 },
            ]
          },
          {
            id: "fx-w6-s5", number: "06.5", title: "Final Showcase!", type: "SHOWCASE", duration: 55,
            summary: "Present your FX Studio masterpiece to the class.",
            objectives: [
              { id: "fx-w6-o5", title: "Complete the curriculum!", description: "Present your masterpiece and celebrate", xpReward: 50 },
            ]
          }
        ]
      }
    ]
  }
];

export function getCurriculum(id: string): CurriculumDef | undefined {
  return CURRICULA.find(c => c.id === id);
}

export function getAllCurriculumIds(): string[] {
  return CURRICULA.map(c => c.id);
}

export function getAllObjectivesForCurriculum(curriculumId: string): CurriculumObjective[] {
  const curr = getCurriculum(curriculumId);
  if (!curr) return [];
  return curr.weeks.flatMap(w => w.sessions.flatMap(s => s.objectives));
}

export function getTotalXpForCurriculum(curriculumId: string): number {
  const curr = getCurriculum(curriculumId);
  if (!curr) return 0;
  const objectiveXp = curr.weeks.flatMap(w => w.sessions.flatMap(s => s.objectives)).reduce((sum, o) => sum + o.xpReward, 0);
  const challengeXp = curr.weeks.reduce((sum, w) => sum + w.challengeXp, 0);
  return objectiveXp + challengeXp;
}

export function getObjectiveById(curriculumId: string, objectiveId: string): CurriculumObjective | undefined {
  return getAllObjectivesForCurriculum(curriculumId).find(o => o.id === objectiveId);
}

export function getAutoTriggerObjectives(curriculumId: string): CurriculumObjective[] {
  return getAllObjectivesForCurriculum(curriculumId).filter(o => o.trigger);
}

export function findObjectivesByAction(action: string): { curriculumId: string; objective: CurriculumObjective; weekNumber: number }[] {
  const results: { curriculumId: string; objective: CurriculumObjective; weekNumber: number }[] = [];
  for (const curr of CURRICULA) {
    for (const week of curr.weeks) {
      for (const session of week.sessions) {
        for (const obj of session.objectives) {
          if (obj.trigger?.action === action) {
            results.push({ curriculumId: curr.id, objective: obj, weekNumber: week.number });
          }
        }
      }
    }
  }
  return results;
}
