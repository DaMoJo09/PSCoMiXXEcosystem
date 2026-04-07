import { db } from "./db";
import { projects, users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

function uuid() {
  return crypto.randomUUID();
}

function pollinationsImg(prompt: string, w = 512, h = 512, seed = 42) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&seed=${seed}&nologo=true`;
}

function makeComic() {
  const spreads = [];
  const pageThemes = [
    { bg: "#1a1a2e", scene: "A young hero named Kai discovers a glowing crystal in a dark cave, mysterious light illuminating ancient walls" },
    { bg: "#16213e", scene: "Kai stands at the edge of a floating city above the clouds, wind blowing through their cape, cyberpunk anime style" },
    { bg: "#0f3460", scene: "A fierce robot guardian blocks the bridge, red eyes glowing, sparks flying from its joints, manga action scene" },
    { bg: "#1a1a2e", scene: "Kai leaps over the robot using parkour, crystal glowing in hand, dynamic action pose, speed lines" },
    { bg: "#533483", scene: "Inside a library of infinite knowledge, holographic books floating everywhere, Kai meets a wise old scholar" },
    { bg: "#e94560", scene: "The villain Shadow Lord appears in a burst of dark energy, cape flowing, menacing silhouette against red sky" },
    { bg: "#0f3460", scene: "Epic battle between Kai and Shadow Lord, energy beams clashing, ground cracking, manga style" },
    { bg: "#16213e", scene: "Kai discovers the crystal can heal the corrupted land, flowers blooming where darkness was, beautiful transformation" },
    { bg: "#533483", scene: "The floating city celebrates, fireworks and lanterns fill the sky, citizens cheering, warm golden light" },
    { bg: "#1a1a2e", scene: "Kai looks toward the horizon, new adventure awaiting, silhouette against a double sunset, cape flowing" },
  ];

  const dialogues = [
    [{ speaker: "Kai", text: "What is this light? It's calling to me..." }, { speaker: "Narrator", text: "Deep in the Forgotten Caves, destiny stirs." }],
    [{ speaker: "Kai", text: "The Sky City of Aethon... it's real!" }, { speaker: "Old Guard", text: "Turn back, young one. Only crystal bearers may enter." }],
    [{ speaker: "Guardian", text: "HALT. UNAUTHORIZED ENTRY DETECTED." }, { speaker: "Kai", text: "I don't want to fight you. Let me pass!" }],
    [{ speaker: "Kai", text: "Now!" }, { speaker: "Narrator", text: "With a burst of speed, Kai vaults over the metal giant." }],
    [{ speaker: "Scholar Wen", text: "That crystal... I haven't seen one in 300 years." }, { speaker: "Kai", text: "Can you tell me what it does?" }],
    [{ speaker: "Shadow Lord", text: "Give me the crystal, child. You have no idea of its power." }, { speaker: "Kai", text: "I know enough to keep it from you." }],
    [{ speaker: "Kai", text: "Everyone I've met believes in me. I won't let them down!" }, { speaker: "Shadow Lord", text: "Foolish... but brave." }],
    [{ speaker: "Kai", text: "The crystal... it's healing the land!" }, { speaker: "Scholar Wen", text: "The corruption is lifting. You've done it, Kai." }],
    [{ speaker: "Mayor", text: "Aethon is free! Three cheers for Kai!" }, { speaker: "Kai", text: "We did this together. All of us." }],
    [{ speaker: "Kai", text: "There are more crystals out there. More places that need help." }, { speaker: "Narrator", text: "And so begins a new chapter..." }],
  ];

  for (let i = 0; i < 10; i++) {
    const seed = 100 + i * 7;
    const panelImage = pollinationsImg(pageThemes[i].scene + ", comic book art style, vibrant colors, detailed", 600, 800, seed);
    const bubbles = dialogues[i].map((d, idx) => ({
      id: uuid(),
      type: "bubble" as const,
      data: {
        text: d.text,
        bubbleStyle: d.speaker === "Narrator" ? "narration" : "speech",
        fontSize: 14,
        fontFamily: "Comic Sans MS",
        color: "#ffffff",
        backgroundColor: d.speaker === "Narrator" ? "#1a1a2e" : "#222222",
      },
      transform: { x: idx === 0 ? 30 : 250, y: idx === 0 ? 30 : 50, scale: 1, rotation: 0 },
      zIndex: 10 + idx,
    }));

    spreads.push({
      id: uuid(),
      leftPage: [
        {
          id: uuid(),
          x: 5, y: 5, width: 90, height: 90,
          type: "rectangle",
          contents: [
            {
              id: uuid(),
              type: "image",
              data: { url: panelImage, alt: pageThemes[i].scene },
              transform: { x: 0, y: 0, scale: 1, rotation: 0 },
              zIndex: 1,
            },
            ...bubbles,
          ],
          zIndex: 1,
          locked: false,
          hidden: false,
          backgroundColor: pageThemes[i].bg,
          borderColor: "#ffffff",
        },
      ],
      rightPage: [],
      leftNarration: i === 0 ? { text: "Chapter 1: The Crystal of Aethon", style: "editorial" } : undefined,
    });
  }

  return {
    title: "Crystal of Aethon: The Sky City Saga",
    type: "comic",
    data: {
      spreads,
      comicMeta: {
        frontCover: {
          title: "Crystal of Aethon",
          subtitle: "The Sky City Saga",
          image: pollinationsImg("epic anime hero holding glowing crystal, floating city in background, dramatic lighting, comic book cover art", 600, 900, 999),
        },
        backCover: {
          text: "When Kai discovers a mysterious crystal in the Forgotten Caves, they're thrust into an adventure across floating cities, ancient libraries, and battles with the Shadow Lord. Can one young hero save an entire civilization?\n\nCreated with PSCoMiXX Creator",
          image: pollinationsImg("back cover of a comic book, floating city silhouette, crystal motif, dark elegant design", 600, 900, 998),
        },
        synopsis: "A young adventurer discovers a powerful crystal that holds the key to saving the floating city of Aethon from the Shadow Lord's corruption.",
        genre: "Action / Adventure / Sci-Fi",
      },
    },
    thumbnail: pollinationsImg("epic anime hero holding glowing crystal, floating city background, comic cover, vibrant", 400, 600, 999),
  };
}

function makeCYOA() {
  const startId = uuid();
  const forestId = uuid();
  const caveId = uuid();
  const villageId = uuid();
  const dragonId = uuid();
  const allyId = uuid();
  const betrayId = uuid();
  const puzzleId = uuid();
  const battleId = uuid();
  const goodEnd = uuid();
  const badEnd = uuid();
  const secretEnd = uuid();
  const neutralEnd = uuid();

  const nodes = [
    {
      id: startId, title: "The Crossroads", x: 400, y: 50,
      content: "You stand at a weathered crossroads deep in the Whispering Woods. A tattered map in your hand shows three paths: one leads into a dark forest where strange lights flicker, another descends into ancient caves carved with runes, and the third winds toward a distant village where smoke rises from chimneys. Behind you, the sound of pursuit grows closer. You must choose now.",
      image: pollinationsImg("fantasy crossroads in misty forest, three paths diverging, mysterious atmosphere, digital art", 600, 400, 200),
      choices: [
        { label: "Enter the Dark Forest", target: forestId },
        { label: "Descend into the Caves", target: caveId },
        { label: "Head to the Village", target: villageId },
      ],
    },
    {
      id: forestId, title: "The Enchanted Forest", x: 100, y: 200,
      content: "The forest closes around you like a living curtain. Bioluminescent mushrooms light your path in blues and greens. You hear a massive creature breathing ahead — a dragon, wounded and chained to an ancient oak. Its eyes, intelligent and desperate, lock onto yours. A ring of enchanted keys hangs from a branch just out of the dragon's reach.",
      image: pollinationsImg("wounded dragon chained to tree in bioluminescent forest, glowing mushrooms, fantasy art", 600, 400, 201),
      choices: [
        { label: "Free the Dragon", target: dragonId },
        { label: "Take the keys and leave quietly", target: betrayId },
        { label: "Try to communicate with the dragon", target: allyId },
      ],
    },
    {
      id: caveId, title: "The Runic Caves", x: 400, y: 200,
      content: "Ancient runes pulse with light as you descend into the caves. The air hums with old magic. At the bottom, you find a chamber with three stone pedestals. Each holds a glowing artifact: a sword that crackles with lightning, a shield that radiates warmth, and a book whose pages turn by themselves. A spectral guardian materializes, 'Choose wisely. Only one may leave this chamber.'",
      image: pollinationsImg("underground cave with three glowing artifacts on pedestals, runes on walls, spectral guardian, fantasy RPG", 600, 400, 202),
      choices: [
        { label: "Take the Lightning Sword", target: battleId },
        { label: "Take the Warm Shield", target: puzzleId },
        { label: "Take the Living Book", target: secretEnd },
      ],
    },
    {
      id: villageId, title: "The Hidden Village", x: 700, y: 200,
      content: "The village of Thornhaven is smaller than you expected. The villagers eye you with suspicion until an elderly woman steps forward. 'Another traveler fleeing the Shadows? We can offer shelter, but nothing is free here. Help us with our problem — beasts from the caves raid us every full moon — and we'll help you in return.'",
      image: pollinationsImg("small medieval fantasy village, suspicious villagers, elderly woman, warm torchlight, cozy but tense", 600, 400, 203),
      choices: [
        { label: "Agree to help the village", target: allyId },
        { label: "Ask more about the cave beasts", target: caveId },
        { label: "Decline and rest, then leave at dawn", target: neutralEnd },
      ],
    },
    {
      id: dragonId, title: "The Dragon's Gratitude", x: 50, y: 400,
      content: "With trembling hands, you unlock the chains. The dragon stretches its wings — they span wider than the tallest trees. It bows its head to you, a gesture of profound respect. 'I am Zephyrus, last of the Storm Drakes. You have shown courage where others showed cruelty. I will carry you to the Shadow Lord's fortress. Together, we can end this darkness.'",
      image: pollinationsImg("freed dragon bowing to young hero in forest, majestic storm dragon, wings spread, golden light", 600, 400, 204),
      choices: [
        { label: "Fly with Zephyrus to face the Shadow Lord", target: battleId },
        { label: "Ask Zephyrus to help the village first", target: goodEnd },
      ],
    },
    {
      id: allyId, title: "Building Alliances", x: 350, y: 400,
      content: "Your willingness to help has not gone unnoticed. The village blacksmith offers you enchanted armor, the healer gives you potions, and three skilled warriors volunteer to join your quest. The elderly woman reveals she was once a powerful mage — she can sense the Shadow Lord's magic weakening. 'Strike now, while we still can. But the caves hold both danger and the key to his undoing.'",
      image: pollinationsImg("fantasy party of heroes gathering weapons and supplies, village blacksmith forge, magical potions, team assembling", 600, 400, 205),
      choices: [
        { label: "Lead the party into the caves", target: puzzleId },
        { label: "Split up to cover more ground", target: badEnd },
      ],
    },
    {
      id: betrayId, title: "The Thief's Path", x: 100, y: 400,
      content: "You grab the keys and slip away. The dragon's anguished cry echoes through the forest, chilling your blood. The keys turn out to open a hidden treasure vault built into the hillside — gold, gems, magical artifacts beyond imagination. But as you fill your pockets, the ground begins to shake. The dragon's chains were also holding something else in check — a seal on an ancient evil.",
      image: pollinationsImg("shadowy figure stealing from treasure vault, ground cracking, ominous dark energy rising, dramatic fantasy", 600, 400, 206),
      choices: [
        { label: "Try to re-chain the dragon and reseal the evil", target: puzzleId },
        { label: "Flee with the treasure", target: badEnd },
      ],
    },
    {
      id: puzzleId, title: "The Heart of the Mountain", x: 350, y: 600,
      content: "Deep in the mountain's heart, you discover the source of the Shadow Lord's power — a corrupted crystal embedded in living rock. Ancient mechanisms surround it, a puzzle left by the world's first mages. The solution seems to require placing three elements in the correct order: Water (purification), Fire (transformation), and Earth (sealing). One wrong move could unleash the corruption forever.",
      image: pollinationsImg("giant corrupted crystal in mountain heart, ancient puzzle mechanisms, three elemental slots, epic fantasy", 600, 400, 207),
      choices: [
        { label: "Water, Fire, Earth (purify, transform, seal)", target: goodEnd },
        { label: "Fire, Earth, Water (burn it all away)", target: battleId },
      ],
    },
    {
      id: battleId, title: "The Final Confrontation", x: 600, y: 600,
      content: "The Shadow Lord materializes before you, a towering figure of living darkness. 'You think courage alone can defeat me? I am the fear in every heart, the doubt in every mind!' Lightning crackles, the ground splits. You raise your weapon — but you sense this fight cannot be won with strength alone.",
      image: pollinationsImg("epic battle against shadow lord, dark towering figure, lightning, hero with glowing weapon, dramatic fantasy climax", 600, 400, 208),
      choices: [
        { label: "Fight with everything you have", target: neutralEnd },
        { label: "Use compassion — try to reach the person inside the darkness", target: goodEnd },
      ],
    },
    {
      id: goodEnd, title: "The Light Returns", x: 300, y: 800, isEnding: true, endingType: "good" as const,
      content: "Your choice to lead with compassion and wisdom breaks through the Shadow Lord's corruption. The darkness shatters like glass, revealing a scared young mage who was consumed by power long ago. As light floods the land, the Whispering Woods bloom with color, the village cheers, and Zephyrus the dragon circles overhead in celebration. You've not just saved the world — you've healed it.\n\nTHE END — 'The Compassionate Hero'",
      image: pollinationsImg("light flooding dark fantasy land, flowers blooming, dragon flying overhead, village celebrating, sunrise, beautiful ending", 600, 400, 209),
      color: "green",
    },
    {
      id: badEnd, title: "Consumed by Shadow", x: 100, y: 800, isEnding: true, endingType: "bad" as const,
      content: "Your choices led you down a dark path. Whether through greed, haste, or carelessness, the Shadow Lord's corruption spreads unchecked. The last thing you see is darkness swallowing the horizon as the Whispering Woods fall silent forever. Perhaps another hero will learn from your mistakes.\n\nTHE END — 'Lost to Darkness'",
      image: pollinationsImg("dark ending, shadowy corruption spreading across fantasy landscape, ominous silence, dark clouds, tragic", 600, 400, 210),
      color: "red",
    },
    {
      id: secretEnd, title: "The Scholar's Ascension", x: 700, y: 800, isEnding: true, endingType: "good" as const,
      content: "The Living Book opens to reveal the true history of the world. The Shadow Lord, the dragon, the village — all are part of an ancient cycle. By choosing knowledge over power, you've unlocked the ability to rewrite the story itself. You become the new Guardian of the Crossroads, guiding future travelers to make better choices. The cycle is broken.\n\nSECRET ENDING — 'The Eternal Guardian'",
      image: pollinationsImg("figure floating surrounded by glowing books and knowledge, cosmic library, ascension, beautiful fantasy, golden light", 600, 400, 211),
      color: "blue",
    },
    {
      id: neutralEnd, title: "The Wanderer's Rest", x: 500, y: 800, isEnding: true, endingType: "neutral" as const,
      content: "You survive, but the world remains unchanged. The Shadow Lord retreats to gather strength, the dragon remains chained, and the village continues to suffer raids. You sit by a campfire, older and wiser, knowing you'll have another chance someday. For now, rest.\n\nTHE END — 'The Unfinished Journey'",
      image: pollinationsImg("lone traveler sitting by campfire, looking at stars, bittersweet mood, fantasy landscape, peaceful but unresolved", 600, 400, 212),
      color: "yellow",
    },
  ];

  return {
    title: "Shadows of the Whispering Woods",
    type: "cyoa",
    data: {
      nodes,
      variables: [
        { name: "courage", type: "number", defaultValue: 0 },
        { name: "hasAllies", type: "boolean", defaultValue: false },
        { name: "dragonFreed", type: "boolean", defaultValue: false },
      ],
    },
    thumbnail: pollinationsImg("dark fantasy crossroads, branching paths, mysterious forest, choose your adventure cover art", 400, 600, 200),
  };
}

function makeVN() {
  const chars = [
    { id: "mei", name: "Mei", color: "#ff6b9d", sprites: { neutral: pollinationsImg("anime girl portrait, dark hair, school uniform, neutral expression, visual novel sprite, transparent bg", 300, 500, 300), happy: pollinationsImg("anime girl portrait, dark hair, school uniform, happy smile, visual novel sprite", 300, 500, 301), surprised: pollinationsImg("anime girl portrait, dark hair, school uniform, surprised expression, visual novel sprite", 300, 500, 302), sad: pollinationsImg("anime girl portrait, dark hair, school uniform, sad expression, visual novel sprite", 300, 500, 303) } },
    { id: "ryo", name: "Ryo", color: "#4ecdc4", sprites: { neutral: pollinationsImg("anime boy portrait, spiky hair, casual jacket, neutral expression, visual novel sprite", 300, 500, 304), happy: pollinationsImg("anime boy portrait, spiky hair, casual jacket, grinning, visual novel sprite", 300, 500, 305), serious: pollinationsImg("anime boy portrait, spiky hair, casual jacket, serious determined expression, visual novel sprite", 300, 500, 306) } },
    { id: "professor", name: "Professor Tanaka", color: "#f9ca24", sprites: { neutral: pollinationsImg("anime older man portrait, glasses, lab coat, wise expression, visual novel sprite", 300, 500, 307), excited: pollinationsImg("anime older man portrait, glasses, lab coat, excited expression, visual novel sprite", 300, 500, 308) } },
  ];

  const scenes = [
    {
      id: uuid(), name: "Prologue — The Transfer", label: "prologue",
      background: pollinationsImg("anime school exterior, cherry blossoms, morning light, visual novel background, wide shot", 960, 540, 310),
      transition: "fade",
      characters: [{ id: "mei", position: "center", expression: "neutral", visible: true }],
      dialogue: [
        { speaker: "Narrator", text: "Sakura Academy — a prestigious school known for its advanced technology program. Today, a new student arrives." },
        { speaker: "Mei", text: "So this is Sakura Academy... It's bigger than I imagined." },
        { speaker: "Mei", text: "Mom said this school has the best robotics program in the country. I hope I can fit in here." },
        { speaker: "Narrator", text: "A bell chimes in the distance. First period is about to start." },
      ],
    },
    {
      id: uuid(), name: "Scene 1 — First Encounter", label: "first_encounter",
      background: pollinationsImg("anime school hallway, lockers, students walking, morning sunlight through windows, visual novel", 960, 540, 311),
      transition: "slide-left",
      characters: [{ id: "mei", position: "left", expression: "surprised", visible: true }, { id: "ryo", position: "right", expression: "happy", visible: true }],
      dialogue: [
        { speaker: "Narrator", text: "Mei rounds a corner and collides with someone carrying a tower of circuit boards." },
        { speaker: "Ryo", text: "Whoa! Watch out—!" },
        { speaker: "Mei", text: "I'm so sorry! Are those okay?!" },
        { speaker: "Ryo", text: "Ha, don't worry about it. These things are tougher than they look. I'm Ryo — you must be the new transfer student?" },
        { speaker: "Mei", text: "Y-yes... I'm Mei. How did you know?" },
        { speaker: "Ryo", text: "Small school, big news. Come on, I'll show you to the lab." },
      ],
    },
    {
      id: uuid(), name: "Scene 2 — The Lab", label: "the_lab",
      background: pollinationsImg("anime high-tech robotics laboratory, workbenches, robot parts, holographic displays, visual novel", 960, 540, 312),
      transition: "fade",
      characters: [{ id: "professor", position: "center", expression: "excited", visible: true }],
      dialogue: [
        { speaker: "Professor Tanaka", text: "Ah, you must be Mei! I've read your application — impressive work on neural network pathfinding." },
        { speaker: "Mei", text: "Thank you, Professor. I'm excited to work with real hardware here." },
        { speaker: "Professor Tanaka", text: "Good, because we have a challenge ahead. The National Robotics Competition is in three months, and our team needs a programmer." },
        { speaker: "Narrator", text: "Professor Tanaka gestures to a half-built robot on the center workbench. Its frame gleams under the lab lights." },
        { speaker: "Professor Tanaka", text: "Meet ARIA — Adaptive Robotic Intelligence Assembly. She's going to change everything." },
      ],
    },
    {
      id: uuid(), name: "Scene 3 — Late Night Coding", label: "late_night",
      background: pollinationsImg("anime school lab at night, computer screens glowing, stars visible through window, cozy atmosphere", 960, 540, 313),
      transition: "dissolve",
      characters: [{ id: "mei", position: "left", expression: "neutral", visible: true }, { id: "ryo", position: "right", expression: "serious", visible: true }],
      dialogue: [
        { speaker: "Narrator", text: "Weeks pass. Mei and Ryo spend every evening in the lab, coding and building." },
        { speaker: "Ryo", text: "The motion controller is still glitching. ARIA keeps veering left during the obstacle course." },
        { speaker: "Mei", text: "I think it's a sensor calibration issue, not the code. Look — the left proximity sensor reads 3% higher than the right." },
        { speaker: "Ryo", text: "...That's a hardware problem. Nice catch, Mei." },
        { speaker: "Mei", text: "We make a good team." },
        { speaker: "Ryo", text: "Yeah... we do.", characterSprite: "happy" },
      ],
    },
    {
      id: uuid(), name: "Scene 4 — The Rival", label: "the_rival",
      background: pollinationsImg("anime school auditorium, stage, competitive atmosphere, banners, robotics competition posters", 960, 540, 314),
      transition: "slide-right",
      characters: [{ id: "mei", position: "left", expression: "neutral", visible: true }],
      dialogue: [
        { speaker: "Narrator", text: "At the regional qualifier showcase, Mei spots a familiar logo on a competing team's banner — Nexus Tech Academy." },
        { speaker: "Mei", text: "That's my old school's team... and their robot looks incredible." },
        { speaker: "Ryo", text: "You know them?" },
        { speaker: "Mei", text: "I used to be on that team. They're the reason I transferred — creative differences, let's say." },
        { speaker: "Ryo", text: "Then let's show them what creative differences can produce.", characterSprite: "serious" },
      ],
    },
    {
      id: uuid(), name: "Scene 5 — The Setback", label: "setback",
      background: pollinationsImg("anime school lab, broken robot parts on floor, sparks, smoke, dramatic lighting, visual novel", 960, 540, 315),
      transition: "fade",
      characters: [{ id: "mei", position: "center", expression: "sad", visible: true }],
      dialogue: [
        { speaker: "Narrator", text: "Two weeks before the competition, disaster strikes." },
        { speaker: "Mei", text: "No... no no no. The main controller board is fried." },
        { speaker: "Professor Tanaka", text: "A power surge from the overnight storm. The backup boards won't arrive in time." },
        { speaker: "Mei", text: "All that work... What do we do?" },
        { speaker: "Ryo", text: "We improvise. Mei, remember that neural network pathfinding from your application? What if we use a Raspberry Pi cluster instead?" },
        { speaker: "Mei", text: "That's... actually crazy enough to work.", characterSprite: "surprised" },
      ],
    },
    {
      id: uuid(), name: "Scene 6 — Rebuilding Together", label: "rebuild",
      background: pollinationsImg("anime montage of students working together building robot, soldering, coding, teamwork, warm lighting", 960, 540, 316),
      transition: "dissolve",
      characters: [{ id: "mei", position: "left", expression: "happy", visible: true }, { id: "ryo", position: "right", expression: "happy", visible: true }],
      dialogue: [
        { speaker: "Narrator", text: "The next two weeks are a blur of code, solder, and determination." },
        { speaker: "Mei", text: "The adaptive algorithm is learning faster than expected. Look — ARIA's navigating the maze in under 30 seconds now." },
        { speaker: "Ryo", text: "That's a new record. The Pi cluster was a genius move." },
        { speaker: "Professor Tanaka", text: "I'm proud of both of you. This is what real engineering looks like — not giving up when things break." },
      ],
    },
    {
      id: uuid(), name: "Scene 7 — Competition Day", label: "competition",
      background: pollinationsImg("anime grand robotics competition arena, crowds, giant screens, spotlights, exciting atmosphere", 960, 540, 317),
      transition: "slide-left",
      characters: [{ id: "mei", position: "center", expression: "neutral", visible: true }],
      dialogue: [
        { speaker: "Narrator", text: "The National Robotics Competition. Thousands of spectators. Twelve teams. One chance." },
        { speaker: "Announcer", text: "Next up — Sakura Academy with ARIA!" },
        { speaker: "Mei", text: "This is it. Everything we've worked for." },
        { speaker: "Ryo", text: "ARIA's ready. Are you?" },
        { speaker: "Mei", text: "Let's show them what we can do." },
        { speaker: "Narrator", text: "Mei takes a deep breath and presses the start button." },
      ],
    },
    {
      id: uuid(), name: "Scene 8 — The Final Run", label: "final_run",
      background: pollinationsImg("anime robot navigating obstacle course, laser sensors, dramatic close-up, audience cheering, high-tech competition", 960, 540, 318),
      transition: "fade",
      characters: [],
      dialogue: [
        { speaker: "Narrator", text: "ARIA moves with fluid precision through the obstacle course. The adaptive algorithm adjusts in real-time, finding paths no other robot considered." },
        { speaker: "Crowd", text: "Look at it go!" },
        { speaker: "Narrator", text: "The final obstacle — a dynamic maze that changes every 10 seconds. This is where the neural network shines." },
        { speaker: "Mei", text: "Come on, ARIA... you've got this..." },
        { speaker: "Narrator", text: "ARIA pauses for a fraction of a second, then darts through the shifting walls like water through a sieve." },
        { speaker: "Announcer", text: "Time! Sakura Academy — 47.3 seconds! A new competition record!" },
      ],
    },
    {
      id: uuid(), name: "Epilogue — New Horizons", label: "epilogue",
      background: pollinationsImg("anime school rooftop, sunset, two students looking at horizon, cherry blossoms, beautiful sky, hopeful", 960, 540, 319),
      transition: "fade",
      characters: [{ id: "mei", position: "left", expression: "happy", visible: true }, { id: "ryo", position: "right", expression: "happy", visible: true }],
      dialogue: [
        { speaker: "Narrator", text: "On the rooftop, trophy in hand, the future feels limitless." },
        { speaker: "Ryo", text: "So... what's next for the genius programmer?" },
        { speaker: "Mei", text: "I was thinking... what if we enter the international competition? ARIA 2.0?" },
        { speaker: "Ryo", text: "You had me at 'ARIA 2.0.'" },
        { speaker: "Mei", text: "Ryo... thanks for bumping into me on my first day." },
        { speaker: "Ryo", text: "Best collision of my life." },
        { speaker: "Narrator", text: "THE END — 'Code & Circuits: A Sakura Academy Story'" },
      ],
    },
  ];

  return {
    title: "Code & Circuits: A Sakura Academy Story",
    type: "vn",
    data: { scenes, characters: chars },
    thumbnail: pollinationsImg("anime visual novel cover, two students with robot, school background, cherry blossoms, colorful", 400, 600, 310),
  };
}

function makeCards() {
  const cards = [
    { id: uuid(), name: "Zephyrus, Storm Drake", type: "Character", rarity: "Legendary", stats: { attack: 9, defense: 7, cost: 8 }, lore: "Last of the ancient Storm Drakes, Zephyrus commands lightning and wind. Those who earn its trust gain an unstoppable ally.", effect: "When played: Deal 3 damage to all enemy creatures. Allies gain +2 attack this turn.", borderColor: "#ffd700", accentColor: "#4169e1", templateId: "mtg-style", frontImage: pollinationsImg("legendary storm dragon trading card art, lightning breathing, majestic, fantasy TCG illustration", 400, 560, 400), backImage: "", nameFont: "Space Grotesk", statsFont: "JetBrains Mono", loreFont: "Inter", cardMode: "tcg" as const },
    { id: uuid(), name: "Shadow Sentinel", type: "Character", rarity: "Rare", stats: { attack: 5, defense: 8, cost: 5 }, lore: "Guards the boundary between light and darkness. Neither side claims it as their own.", effect: "Shield: Absorbs the first 3 damage dealt to your hero each turn.", borderColor: "#8b00ff", accentColor: "#2d2d2d", templateId: "cyberpunk", frontImage: pollinationsImg("dark armored sentinel warrior trading card art, glowing purple eyes, shield, fantasy TCG", 400, 560, 401), backImage: "", nameFont: "Space Grotesk", statsFont: "JetBrains Mono", loreFont: "Inter", cardMode: "tcg" as const },
    { id: uuid(), name: "Crystal Weaver", type: "Character", rarity: "Epic", stats: { attack: 4, defense: 4, cost: 3 }, lore: "Crystal Weavers can shape raw magical energy into solid constructs. Their art is both beautiful and deadly.", effect: "On play: Create a 2/2 Crystal Golem token.", borderColor: "#00ffcc", accentColor: "#1a1a2e", templateId: "mtg-style", frontImage: pollinationsImg("crystal mage weaving magical constructs, ethereal, glowing crystals, fantasy TCG card art", 400, 560, 402), backImage: "", nameFont: "Space Grotesk", statsFont: "JetBrains Mono", loreFont: "Inter", cardMode: "tcg" as const },
    { id: uuid(), name: "Void Blade", type: "Weapon", rarity: "Rare", stats: { attack: 7, defense: 0, cost: 4 }, lore: "Forged in the space between dimensions. It cuts through armor, magic, and reality itself.", effect: "Equipped hero's attacks ignore enemy shields.", borderColor: "#ff0066", accentColor: "#0d0d0d", templateId: "cyberpunk", frontImage: pollinationsImg("void blade weapon, dark energy sword, glowing edges, fantasy weapon TCG card illustration", 400, 560, 403), backImage: "", nameFont: "Space Grotesk", statsFont: "JetBrains Mono", loreFont: "Inter", cardMode: "tcg" as const },
    { id: uuid(), name: "Healing Spring", type: "Spell", rarity: "Common", stats: { attack: 0, defense: 0, cost: 2 }, lore: "Hidden in the deepest groves, these springs restore both body and spirit.", effect: "Restore 5 health to your hero. Draw a card.", borderColor: "#00ff88", accentColor: "#004d26", templateId: "mtg-style", frontImage: pollinationsImg("magical healing spring in forest grove, sparkling water, flowers, serene, fantasy TCG spell card", 400, 560, 404), backImage: "", nameFont: "Space Grotesk", statsFont: "JetBrains Mono", loreFont: "Inter", cardMode: "tcg" as const },
  ];

  return {
    title: "Aethon Chronicles — Starter Deck",
    type: "card",
    data: { cards, deckName: "Aethon Chronicles — Starter Deck", deckDescription: "A balanced starter deck featuring characters, weapons, and spells from the world of Aethon." },
    thumbnail: pollinationsImg("fantasy trading card game deck box, epic dragon and warrior, TCG cover art, vibrant", 400, 600, 400),
  };
}

function makeHOP() {
  const scenes = [
    { id: uuid(), order: 0, assetType: "image" as const, assetUrl: pollinationsImg("anime hero silhouette against glowing crystal, dark cave, dramatic lighting, cinematic", 1080, 1920, 500), caption: "In the depths of the Forgotten Caves...", textOverlay: "CRYSTAL OF AETHON", duration: 6, transition: "fade" as const },
    { id: uuid(), order: 1, assetType: "image" as const, assetUrl: pollinationsImg("hand reaching for glowing blue crystal, close-up, dramatic, anime style cinematic", 1080, 1920, 501), caption: "A light calls out from the darkness", duration: 5, transition: "zoom" as const },
    { id: uuid(), order: 2, assetType: "image" as const, assetUrl: pollinationsImg("floating city above clouds revealed, wide epic shot, sunlight breaking through, anime cinematic", 1080, 1920, 502), caption: "Above the clouds, Aethon awaits", textOverlay: "THE SKY CITY", duration: 7, transition: "fade" as const },
    { id: uuid(), order: 3, assetType: "image" as const, assetUrl: pollinationsImg("young hero walking through sky city streets, citizens staring, floating buildings, anime style", 1080, 1920, 503), caption: "A stranger in a city of wonders", duration: 5, transition: "cut" as const },
    { id: uuid(), order: 4, assetType: "image" as const, assetUrl: pollinationsImg("robot guardian blocking path, red glowing eyes, imposing metal figure, anime mecha style", 1080, 1920, 504), caption: "The Guardian stands between Kai and the truth", duration: 5, transition: "glitch" as const },
    { id: uuid(), order: 5, assetType: "image" as const, assetUrl: pollinationsImg("hero leaping over robot, dynamic action pose, speed lines, crystal glowing, anime action", 1080, 1920, 505), caption: "Sometimes the only way is through", duration: 4, transition: "cut" as const },
    { id: uuid(), order: 6, assetType: "image" as const, assetUrl: pollinationsImg("shadow lord emerging from darkness, menacing silhouette, red energy, dramatic anime villain", 1080, 1920, 506), caption: "The Shadow Lord awakens", textOverlay: "FACE YOUR FEAR", duration: 6, transition: "glitch" as const },
    { id: uuid(), order: 7, assetType: "image" as const, assetUrl: pollinationsImg("epic energy battle, two forces clashing, blue vs red energy beams, ground shattering, anime climax", 1080, 1920, 507), caption: "Light against darkness — the final battle", duration: 7, transition: "fade" as const },
    { id: uuid(), order: 8, assetType: "image" as const, assetUrl: pollinationsImg("crystal healing corrupted land, flowers blooming from darkness, beautiful transformation, anime", 1080, 1920, 508), caption: "From corruption, new life blooms", duration: 6, transition: "fade" as const },
    { id: uuid(), order: 9, assetType: "text_card" as const, textOverlay: "CRYSTAL OF AETHON\n\nRead the full comic on PSCoMiXX\nPlay the CYOA adventure\nExperience the Visual Novel\n\nCreated with PSCoMiXX Creator", caption: "Coming soon to all platforms", duration: 8, transition: "fade" as const },
    { id: uuid(), order: 10, assetType: "image" as const, assetUrl: pollinationsImg("hero looking at sunset horizon, cape flowing, hopeful future, anime ending scene, cinematic", 1080, 1920, 509), caption: "The adventure continues...", textOverlay: "TO BE CONTINUED", duration: 6, transition: "fade" as const },
    { id: uuid(), order: 11, assetType: "image" as const, assetUrl: pollinationsImg("stylish end credits card, PSCoMiXX logo, dark elegant design, neon accents, professional", 1080, 1920, 510), caption: "Made with PSCoMiXX Creator", textOverlay: "PSCoMiXX", duration: 5, transition: "fade" as const },
  ];

  return {
    title: "Crystal of Aethon — The HOP",
    type: "hop",
    data: {
      type: "single",
      clipLengthMode: "90s",
      loopMode: "single_loop",
      audioTrack: {
        src: "",
        name: "Epic Adventure Theme",
        volume: 0.7,
        loop: true,
      },
      scenes,
      coverImage: pollinationsImg("anime hero with crystal, dramatic poster, HOP video cover, cinematic, vertical format", 1080, 1920, 500),
      tags: ["action", "adventure", "anime", "fantasy", "crystal"],
      visibility: "public",
      totalDuration: 70,
      previewSettings: { autoplay: true, mutedByDefault: false, showCaptions: true },
      streamingSyncStatus: "draft",
    },
    thumbnail: pollinationsImg("anime hero with crystal, dramatic poster, vertical format, cinematic", 400, 600, 500),
  };
}

export async function seedDemoContent(userId: string) {
  const results: { type: string; id: string; title: string }[] = [];

  const contentDefs = [makeComic(), makeCYOA(), makeVN(), makeCards(), makeHOP()];

  for (const def of contentDefs) {
    const existing = await db.select({ id: projects.id })
      .from(projects)
      .where(sql`${projects.title} = ${def.title} AND ${projects.userId} = ${userId}`)
      .limit(1);

    if (existing.length > 0) {
      await db.update(projects)
        .set({ data: def.data, status: "published", thumbnail: def.thumbnail, updatedAt: new Date() })
        .where(eq(projects.id, existing[0].id));
      results.push({ type: def.type, id: existing[0].id, title: def.title });
    } else {
      const [created] = await db.insert(projects).values({
        userId,
        title: def.title,
        type: def.type,
        data: def.data,
        thumbnail: def.thumbnail,
        status: "published",
      }).returning();
      results.push({ type: def.type, id: created.id, title: def.title });
    }
  }

  return results;
}
