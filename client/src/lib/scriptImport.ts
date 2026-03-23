export interface ScriptElement {
  type: "dialog" | "sfx" | "image" | "narration" | "caption" | "text";
  character?: string;
  content?: string;
  imageId?: string;
  style?: "normal" | "shout" | "whisper" | "thought";
  intensity?: "small" | "medium" | "large";
}

export interface LayoutPanel {
  x: number;
  y: number;
  width: number;
  height: number;
  type?: "rectangle" | "circle";
  textPanel?: boolean;
  text?: string;
}

export interface LayoutPage {
  panels: LayoutPanel[];
}

export interface LayoutData {
  template?: string;
  pages: LayoutPage[];
  title?: string;
  metadata?: Record<string, any>;
}

export interface ScriptPanel {
  panelNumber: number;
  action?: string;
  elements: ScriptElement[];
  suggestedLayout?: { size?: string; aspect?: string };
}

export interface ScriptPage {
  pageNumber: number;
  panels: ScriptPanel[];
}

export interface ScriptAsset {
  name: string;
  dataUrl: string;
  tag: string;
  source?: string;
  refKey?: string;
}

export interface ScriptData {
  title: string;
  pages: ScriptPage[];
  assets: ScriptAsset[];
  version?: number;
  metadata?: {
    total_pages?: number;
    total_panels?: number;
    total_dialogue_lines?: number;
    total_sfx?: number;
    total_narrations?: number;
    total_img_refs?: number;
    characters?: string[];
  };
  modeHints?: {
    comic?: Record<string, any>;
    vn?: Record<string, any>;
    cyoa?: Record<string, any>;
  };
}

interface PressPlaysDialogue {
  character: string;
  line: string;
  style?: "normal" | "shout" | "whisper" | "thought";
}

interface PressPlaysSfx {
  text: string;
  intensity?: "small" | "medium" | "large";
}

interface PressPlaysPanel {
  panel_number: number;
  description?: string;
  dialogue?: PressPlaysDialogue[];
  sfx?: PressPlaysSfx[];
  narrations?: string[];
  img_refs?: string[];
  suggested_layout?: { size?: string; aspect?: string };
}

interface PressPlaysPage {
  page_number: number;
  panels: PressPlaysPanel[];
}

interface PressPlaysAsset {
  ref_key?: string;
  name: string;
  data_url: string;
  asset_tag?: string;
  tag?: string;
}

interface PressPlaysScriptData {
  title: string;
  version?: number;
  created_at?: string;
  updated_at?: string;
  pages: PressPlaysPage[];
  assets?: PressPlaysAsset[];
  metadata?: {
    total_pages?: number;
    total_panels?: number;
    total_dialogue_lines?: number;
    total_sfx?: number;
    total_narrations?: number;
    total_img_refs?: number;
    characters?: string[];
  };
}

function isPressPlaysFormat(data: any): boolean {
  if (!data?.pages?.[0]) return false;
  const firstPage = data.pages[0];
  return 'page_number' in firstPage ||
    (firstPage.panels?.[0] && ('dialogue' in firstPage.panels[0] || 'sfx' in firstPage.panels[0] || 'narrations' in firstPage.panels[0]));
}

function normalizePressPlaysPanel(pp: PressPlaysPanel): ScriptPanel {
  const elements: ScriptElement[] = [];

  if (pp.dialogue) {
    for (const d of pp.dialogue) {
      elements.push({
        type: "dialog",
        character: d.character,
        content: d.line,
        style: d.style || "normal",
      });
    }
  }

  if (pp.sfx) {
    for (const s of pp.sfx) {
      elements.push({
        type: "sfx",
        content: s.text,
        intensity: s.intensity,
      });
    }
  }

  if (pp.narrations) {
    for (const n of pp.narrations) {
      elements.push({
        type: "narration",
        content: n,
      });
    }
  }

  if (pp.img_refs) {
    for (const ref of pp.img_refs) {
      elements.push({
        type: "image",
        imageId: ref,
      });
    }
  }

  return {
    panelNumber: pp.panel_number,
    action: pp.description,
    elements,
    suggestedLayout: pp.suggested_layout,
  };
}

function normalizePressPlaysAsset(a: PressPlaysAsset): ScriptAsset {
  return {
    name: a.ref_key || a.name,
    dataUrl: a.data_url,
    tag: a.asset_tag || a.tag || "interior-page",
    refKey: a.ref_key,
  };
}

export function normalizeScriptData(raw: any): ScriptData {
  if (!raw) return { title: "Untitled", pages: [], assets: [] };

  if (isPressPlaysFormat(raw)) {
    const pp = raw as PressPlaysScriptData;
    return {
      title: pp.title || "Untitled",
      version: pp.version,
      pages: (pp.pages || []).map(page => ({
        pageNumber: page.page_number,
        panels: (page.panels || []).map(normalizePressPlaysPanel),
      })),
      assets: (pp.assets || []).map(normalizePressPlaysAsset),
      metadata: pp.metadata,
    };
  }

  const sd = raw as ScriptData;
  return {
    title: sd.title || "Untitled",
    version: sd.version,
    pages: (sd.pages || []).map(p => ({
      pageNumber: p.pageNumber ?? (p as any).page_number ?? 0,
      panels: (p.panels || []).map(pn => ({
        panelNumber: pn.panelNumber ?? (pn as any).panel_number ?? 0,
        action: pn.action ?? (pn as any).description,
        elements: pn.elements || [],
        suggestedLayout: pn.suggestedLayout ?? (pn as any).suggested_layout,
      })),
    })),
    assets: (sd.assets || []).map(a => ({
      name: a.name || (a as any).ref_key || "",
      dataUrl: a.dataUrl || (a as any).data_url || "",
      tag: a.tag || (a as any).asset_tag || "interior-page",
      refKey: (a as any).ref_key || (a as any).refKey,
    })),
    metadata: sd.metadata,
  };
}

interface CYOANode {
  id: string;
  title?: string;
  text: string;
  choices: { label: string; target: string }[];
  isEnding?: boolean;
  endingType?: "good" | "bad" | "neutral";
  image?: string;
  color?: "default" | "blue" | "green" | "red" | "yellow" | "purple";
}

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
  transition?: "none" | "fade" | "slide-left" | "slide-right" | "dissolve";
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

interface TransformState {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

interface PanelContent {
  id: string;
  type: "image" | "text" | "bubble" | "drawing" | "shape" | "video" | "gif" | "audio";
  transform: TransformState;
  data: Record<string, any>;
  zIndex: number;
  locked: boolean;
}

interface Panel {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  type: "rectangle" | "circle";
  contents: PanelContent[];
  zIndex: number;
  locked: boolean;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

interface Spread {
  id: string;
  leftPage: Panel[];
  rightPage: Panel[];
}

const CHARACTER_COLORS = [
  "#60a5fa", "#f472b6", "#34d399", "#fbbf24", "#a78bfa",
  "#fb923c", "#22d3ee", "#e879f9", "#4ade80", "#f87171",
];

const STYLE_TO_BUBBLE: Record<string, string> = {
  normal: "speech",
  shout: "shout",
  whisper: "whisper",
  thought: "thought",
};

function resolveAssetUrl(imageId: string, assets: ScriptAsset[]): string | undefined {
  const asset = assets.find(a => a.name === imageId || a.refKey === imageId);
  return asset?.dataUrl;
}

function extractCharacters(scriptData: ScriptData): string[] {
  if (scriptData.metadata?.characters?.length) {
    return scriptData.metadata.characters;
  }

  const charMap = new Map<string, string>();
  for (const page of scriptData.pages) {
    for (const panel of page.panels) {
      for (const el of panel.elements) {
        if (el.type === "dialog" && el.character) {
          const key = el.character.toLowerCase();
          if (!charMap.has(key)) {
            charMap.set(key, el.character);
          }
        }
      }
    }
  }
  return Array.from(charMap.values());
}

export function scriptToCYOA(scriptData: ScriptData): { nodes: CYOANode[]; variables: any[] } {
  const nodes: CYOANode[] = [];

  for (const page of scriptData.pages) {
    for (const panel of page.panels) {
      const nodeId = `node_p${page.pageNumber}_${panel.panelNumber}`;

      const dialogParts: string[] = [];
      let image: string | undefined;

      for (const el of panel.elements) {
        if (el.type === "dialog" && el.character && el.content) {
          const prefix = el.style === "shout" ? "!" : el.style === "whisper" ? "~" : el.style === "thought" ? "*" : "";
          dialogParts.push(`**${el.character}**: "${prefix}${el.content}${prefix}"`);
        } else if (el.type === "narration" && el.content) {
          dialogParts.push(el.content);
        } else if (el.type === "caption" && el.content) {
          dialogParts.push(`_${el.content}_`);
        } else if (el.type === "sfx" && el.content) {
          dialogParts.push(`[${el.content}]`);
        } else if (el.type === "image" && el.imageId) {
          if (!image) image = resolveAssetUrl(el.imageId, scriptData.assets);
        }
      }

      const text = [
        panel.action ? `*${panel.action}*` : "",
        ...dialogParts,
      ].filter(Boolean).join("\n\n");

      nodes.push({
        id: nodeId,
        title: `Page ${page.pageNumber}, Panel ${panel.panelNumber}`,
        text: text || "...",
        choices: [],
        image,
        color: "default",
      });
    }
  }

  for (let i = 0; i < nodes.length - 1; i++) {
    nodes[i].choices.push({
      label: "Continue",
      target: nodes[i + 1].id,
    });
  }

  if (nodes.length > 0) {
    const lastNode = nodes[nodes.length - 1];
    lastNode.isEnding = true;
    lastNode.endingType = "good";
  }

  return { nodes, variables: [] };
}

export function scriptToVN(scriptData: ScriptData): {
  scenes: VNScene[];
  characters: VNCharacter[];
  backgrounds: VNBackground[];
} {
  const charNames = extractCharacters(scriptData);
  const characters: VNCharacter[] = charNames.map((name, i) => ({
    id: `char_${name.toLowerCase().replace(/\s+/g, "_")}`,
    name,
    color: CHARACTER_COLORS[i % CHARACTER_COLORS.length],
    sprites: [{ expression: "neutral", url: "" }],
  }));

  const backgrounds: VNBackground[] = [];
  const bgMap = new Map<string, string>();

  for (const asset of scriptData.assets) {
    if (asset.tag === "background" || asset.tag === "interior-page") {
      const bgId = `bg_${asset.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      backgrounds.push({ id: bgId, name: asset.name, url: asset.dataUrl });
      bgMap.set(asset.name, bgId);
      if (asset.refKey) bgMap.set(asset.refKey, bgId);
    }
  }

  if (backgrounds.length === 0) {
    backgrounds.push({ id: "bg_default", name: "Default", url: "" });
  }

  const scenes: VNScene[] = [];

  for (const page of scriptData.pages) {
    for (const panel of page.panels) {
      const sceneId = `scene_p${page.pageNumber}_${panel.panelNumber}`;
      const dialogue: VNDialogueLine[] = [];
      let sceneBg = backgrounds[0].id;
      let sceneBgUrl: string | undefined;

      const presentChars = new Set<string>();

      if (panel.action) {
        dialogue.push({
          speaker: "Narrator",
          text: panel.action,
          stageDirection: panel.action,
        });
      }

      for (const el of panel.elements) {
        if (el.type === "dialog" && el.character && el.content) {
          presentChars.add(el.character);
          dialogue.push({
            speaker: el.character,
            text: el.content,
          });
        } else if (el.type === "narration" && el.content) {
          dialogue.push({
            speaker: "Narrator",
            text: el.content,
          });
        } else if (el.type === "sfx" && el.content) {
          dialogue.push({
            speaker: "Narrator",
            text: `[SFX: ${el.content}]`,
            stageDirection: `Sound: ${el.content}`,
          });
        } else if (el.type === "image" && el.imageId) {
          const bgId = bgMap.get(el.imageId);
          if (bgId) {
            sceneBg = bgId;
            sceneBgUrl = resolveAssetUrl(el.imageId, scriptData.assets);
          }
        }
      }

      if (dialogue.length === 0) {
        dialogue.push({ speaker: "Narrator", text: "..." });
      }

      const charPlacements = Array.from(presentChars).slice(0, 3).map((name, i) => {
        const char = characters.find(c => c.name.toLowerCase() === name.toLowerCase());
        const positions: ("left" | "center" | "right")[] = ["left", "center", "right"];
        return {
          id: char?.id || `char_${name.toLowerCase().replace(/\s+/g, "_")}`,
          position: positions[i % 3],
          expression: "neutral",
          visible: true,
        };
      });

      scenes.push({
        id: sceneId,
        name: `P${page.pageNumber} Panel ${panel.panelNumber}`,
        label: panel.action?.substring(0, 30) || undefined,
        background: sceneBg,
        backgroundUrl: sceneBgUrl,
        transition: "fade",
        characters: charPlacements,
        dialogue,
      });
    }
  }

  return { scenes, characters, backgrounds };
}

export function scriptToComic(scriptData: ScriptData): Spread[] {
  const spreads: Spread[] = [];

  for (const page of scriptData.pages) {
    const panelCount = page.panels.length;

    const layoutPanels = generatePanelLayout(panelCount, page.panels);

    const comicPanels: Panel[] = layoutPanels.map((layout, i) => {
      const scriptPanel = page.panels[i];
      const panelId = `panel_p${page.pageNumber}_${i}`;
      const contents: PanelContent[] = [];
      let contentIndex = 0;

      if (scriptPanel) {
        for (const el of scriptPanel.elements) {
          if (el.type === "image" && el.imageId) {
            const url = resolveAssetUrl(el.imageId, scriptData.assets);
            if (url) {
              contents.push({
                id: `content_${Date.now()}_${contentIndex++}`,
                type: "image",
                transform: { x: 0, y: 0, width: layout.width * 4, height: layout.height * 4, rotation: 0, scaleX: 1, scaleY: 1 },
                data: { url },
                zIndex: contentIndex,
                locked: false,
              });
            }
          } else if (el.type === "dialog" && el.character && el.content) {
            const bubbleStyle = STYLE_TO_BUBBLE[el.style || "normal"] || "speech";
            contents.push({
              id: `content_${Date.now()}_${contentIndex++}`,
              type: "bubble",
              transform: { x: 10, y: 10 + contentIndex * 20, width: layout.width * 3, height: 60, rotation: 0, scaleX: 1, scaleY: 1 },
              data: {
                text: el.content,
                bubbleStyle,
                fontFamily: "'Bangers', cursive",
                fontSize: 14,
                color: "#000000",
                backgroundColor: "#ffffff",
                padding: 12,
                borderRadius: bubbleStyle === "shout" ? 0 : 20,
              },
              zIndex: contentIndex + 10,
              locked: false,
            });
          } else if (el.type === "sfx" && el.content) {
            const fontSize = el.intensity === "large" ? 32 : el.intensity === "medium" ? 24 : 18;
            contents.push({
              id: `content_${Date.now()}_${contentIndex++}`,
              type: "text",
              transform: { x: 30, y: 40, width: 120, height: 40, rotation: -10, scaleX: 1, scaleY: 1 },
              data: {
                text: el.content,
                fontFamily: "'Bangers', cursive",
                fontSize,
                color: "#ff0000",
                textEffect: "comic",
              },
              zIndex: contentIndex + 20,
              locked: false,
            });
          } else if (el.type === "narration" && el.content) {
            contents.push({
              id: `content_${Date.now()}_${contentIndex++}`,
              type: "bubble",
              transform: { x: 5, y: 5, width: layout.width * 3.5, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
              data: {
                text: el.content,
                bubbleStyle: "caption",
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                color: "#ffffff",
                backgroundColor: "#1a1a1a",
                padding: 10,
                borderRadius: 4,
              },
              zIndex: contentIndex + 10,
              locked: false,
            });
          } else if (el.type === "text" && el.content) {
            contents.push({
              id: `content_${Date.now()}_${contentIndex++}`,
              type: "text",
              transform: { x: 0, y: 0, width: layout.width * 4, height: layout.height * 4, rotation: 0, scaleX: 1, scaleY: 1 },
              data: {
                text: el.content,
                textPanel: true,
                fontFamily: "'Georgia', 'Times New Roman', serif",
                fontSize: 16,
                color: "#1a1a1a",
                backgroundColor: "#ffffff",
                padding: 32,
                lineHeight: 1.8,
                textAlign: "left",
                textEffect: "none",
              },
              zIndex: 0,
              locked: false,
            });
          }
        }
      }

      return {
        id: panelId,
        ...layout,
        rotation: 0,
        type: "rectangle" as const,
        contents,
        zIndex: i,
        locked: false,
        backgroundColor: "#ffffff",
        borderColor: "#000000",
        borderWidth: 3,
      };
    });

    const leftPanels = comicPanels.slice(0, Math.ceil(comicPanels.length / 2));
    const rightPanels = comicPanels.slice(Math.ceil(comicPanels.length / 2));

    if (leftPanels.length > 0 || rightPanels.length > 0) {
      redistributePanels(leftPanels);
      redistributePanels(rightPanels);

      spreads.push({
        id: `spread_p${page.pageNumber}`,
        leftPage: leftPanels,
        rightPage: rightPanels,
      });
    }
  }

  if (spreads.length === 0) {
    spreads.push({
      id: "spread_1",
      leftPage: [{
        id: "panel_default",
        x: 2, y: 2, width: 96, height: 96, rotation: 0,
        type: "rectangle", contents: [], zIndex: 0, locked: false,
        backgroundColor: "#ffffff", borderColor: "#000000", borderWidth: 3,
      }],
      rightPage: [],
    });
  }

  return spreads;
}

function generatePanelLayout(count: number, panels?: ScriptPanel[]): { x: number; y: number; width: number; height: number }[] {
  if (panels?.length === 1 && panels[0].suggestedLayout?.size === "splash") {
    return [{ x: 2, y: 2, width: 96, height: 96 }];
  }

  const gap = 2;
  if (count <= 1) {
    return [{ x: gap, y: gap, width: 100 - gap * 2, height: 100 - gap * 2 }];
  }
  if (count === 2) {
    const hasSplash = panels?.some(p => p.suggestedLayout?.size === "large" || p.suggestedLayout?.size === "splash");
    if (hasSplash) {
      return [
        { x: gap, y: gap, width: 100 - gap * 2, height: 65 - gap },
        { x: gap, y: 67, width: 100 - gap * 2, height: 33 - gap },
      ];
    }
    return [
      { x: gap, y: gap, width: 100 - gap * 2, height: 50 - gap * 1.5 },
      { x: gap, y: 50 + gap * 0.5, width: 100 - gap * 2, height: 50 - gap * 1.5 },
    ];
  }
  if (count === 3) {
    return [
      { x: gap, y: gap, width: 100 - gap * 2, height: 33 - gap },
      { x: gap, y: 34 + gap * 0.5, width: 100 - gap * 2, height: 33 - gap },
      { x: gap, y: 68 + gap * 0.5, width: 100 - gap * 2, height: 32 - gap },
    ];
  }
  if (count === 4) {
    return [
      { x: gap, y: gap, width: 50 - gap * 1.5, height: 50 - gap * 1.5 },
      { x: 50 + gap * 0.5, y: gap, width: 50 - gap * 1.5, height: 50 - gap * 1.5 },
      { x: gap, y: 50 + gap * 0.5, width: 50 - gap * 1.5, height: 50 - gap * 1.5 },
      { x: 50 + gap * 0.5, y: 50 + gap * 0.5, width: 50 - gap * 1.5, height: 50 - gap * 1.5 },
    ];
  }
  const cols = count <= 6 ? 2 : 3;
  const rows = Math.ceil(count / cols);
  const cellW = (100 - gap * (cols + 1)) / cols;
  const cellH = (100 - gap * (rows + 1)) / rows;
  const result: { x: number; y: number; width: number; height: number }[] = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    result.push({
      x: gap + col * (cellW + gap),
      y: gap + row * (cellH + gap),
      width: cellW,
      height: cellH,
    });
  }
  return result;
}

function redistributePanels(panels: Panel[]) {
  if (panels.length === 0) return;
  const gap = 2;
  const rows = panels.length;
  const cellH = (100 - gap * (rows + 1)) / rows;
  panels.forEach((p, i) => {
    p.x = gap;
    p.y = gap + i * (cellH + gap);
    p.width = 100 - gap * 2;
    p.height = cellH;
  });
}

export function layoutToSpreads(layoutData: LayoutData): Spread[] {
  const spreads: Spread[] = [];
  const rawPages = layoutData.pages;
  const pages = Array.isArray(rawPages) ? rawPages : [];

  for (let i = 0; i < pages.length; i += 2) {
    const leftPageData = pages[i];
    const rightPageData = pages[i + 1];

    const leftRawPanels = leftPageData?.panels;
    const leftPanels: Panel[] = (Array.isArray(leftRawPanels) ? leftRawPanels : []).map((lp, j) => {
      const contents: PanelContent[] = [];
      if (lp.textPanel && lp.text) {
        contents.push({
          id: `content_tp_${Date.now()}_${i}_${j}`,
          type: "text",
          transform: { x: 0, y: 0, width: lp.width * 4, height: lp.height * 4, rotation: 0, scaleX: 1, scaleY: 1 },
          data: {
            text: lp.text,
            textPanel: true,
            fontFamily: "'Georgia', 'Times New Roman', serif",
            fontSize: 16,
            color: "#1a1a1a",
            backgroundColor: "#ffffff",
            padding: 32,
            lineHeight: 1.8,
            textAlign: "left",
            textEffect: "none",
          },
          zIndex: 0,
          locked: false,
        });
      }
      return {
        id: `panel_layout_${i}_${j}`,
        x: lp.x,
        y: lp.y,
        width: lp.width,
        height: lp.height,
        rotation: 0,
        type: (lp.type || "rectangle") as "rectangle" | "circle",
        contents,
        zIndex: j,
        locked: false,
        backgroundColor: lp.textPanel ? "#ffffff" : "#ffffff",
        borderColor: "#000000",
        borderWidth: lp.textPanel ? 0 : 3,
      };
    });

    const rightRawPanels = rightPageData?.panels;
    const rightPanels: Panel[] = (Array.isArray(rightRawPanels) ? rightRawPanels : []).map((lp, j) => {
      const contents: PanelContent[] = [];
      if (lp.textPanel && lp.text) {
        contents.push({
          id: `content_tp_${Date.now()}_${i + 1}_${j}`,
          type: "text",
          transform: { x: 0, y: 0, width: lp.width * 4, height: lp.height * 4, rotation: 0, scaleX: 1, scaleY: 1 },
          data: {
            text: lp.text,
            textPanel: true,
            fontFamily: "'Georgia', 'Times New Roman', serif",
            fontSize: 16,
            color: "#1a1a1a",
            backgroundColor: "#ffffff",
            padding: 32,
            lineHeight: 1.8,
            textAlign: "left",
            textEffect: "none",
          },
          zIndex: 0,
          locked: false,
        });
      }
      return {
        id: `panel_layout_${i + 1}_${j}`,
        x: lp.x,
        y: lp.y,
        width: lp.width,
        height: lp.height,
        rotation: 0,
        type: (lp.type || "rectangle") as "rectangle" | "circle",
        contents,
        zIndex: j,
        locked: false,
        backgroundColor: lp.textPanel ? "#ffffff" : "#ffffff",
        borderColor: "#000000",
        borderWidth: lp.textPanel ? 0 : 3,
      };
    });

    spreads.push({
      id: `spread_layout_${Math.floor(i / 2)}`,
      leftPage: leftPanels,
      rightPage: rightPanels,
    });
  }

  if (spreads.length === 0) {
    spreads.push({
      id: "spread_layout_0",
      leftPage: [{
        id: "panel_default",
        x: 2, y: 2, width: 96, height: 96, rotation: 0,
        type: "rectangle", contents: [], zIndex: 0, locked: false,
        backgroundColor: "#ffffff", borderColor: "#000000", borderWidth: 3,
      }],
      rightPage: [],
    });
  }

  return spreads;
}

export function getScriptStats(scriptData: ScriptData) {
  if (scriptData.metadata?.characters?.length) {
    return {
      title: scriptData.title,
      pageCount: scriptData.metadata.total_pages || scriptData.pages.length,
      panelCount: scriptData.metadata.total_panels || scriptData.pages.reduce((s, p) => s + p.panels.length, 0),
      dialogueCount: scriptData.metadata.total_dialogue_lines || 0,
      sfxCount: scriptData.metadata.total_sfx || 0,
      imageCount: scriptData.metadata.total_img_refs || 0,
      narrationCount: scriptData.metadata.total_narrations || 0,
      assetCount: scriptData.assets.length,
      characters: scriptData.metadata.characters,
    };
  }

  const characters = extractCharacters(scriptData);
  let totalPanels = 0;
  let totalDialogue = 0;
  let totalSfx = 0;
  let totalImages = 0;
  let totalNarrations = 0;

  for (const page of scriptData.pages) {
    totalPanels += page.panels.length;
    for (const panel of page.panels) {
      for (const el of panel.elements) {
        if (el.type === "dialog") totalDialogue++;
        if (el.type === "sfx") totalSfx++;
        if (el.type === "image") totalImages++;
        if (el.type === "narration") totalNarrations++;
      }
    }
  }

  return {
    title: scriptData.title,
    pageCount: scriptData.pages.length,
    panelCount: totalPanels,
    dialogueCount: totalDialogue,
    sfxCount: totalSfx,
    imageCount: totalImages,
    narrationCount: totalNarrations,
    assetCount: scriptData.assets.length,
    characters,
  };
}
