/**
 * Promo template -> editable Comic Spread materializer.
 *
 * The product decision (April 2026): a promo page should not have its own
 * separate editor. Instead, when the user picks a template from the studio
 * we MATERIALIZE it into a regular Spread with Panel + PanelContent items,
 * so the full Comic Creator toolset (drag/resize/rotate, font controls,
 * effects, layers, etc.) is available without writing a parallel editor.
 *
 * A template's `templateJson.materializeSpec` describes the rich layout
 * (positions, fonts, colors, decorative shapes). If a template lacks a spec,
 * `defaultMaterialize` produces a sensible vertical layout from the standard
 * fields (headline, subheadline, body, image, cta).
 *
 * Coordinate system:
 *   - Panel position is % of page (0-100). We always use ONE full-page
 *     panel covering 0,0 -> 100,100 — the entire page becomes the canvas
 *     and every item is a movable child.
 *   - PanelContent transform.x/y/width/height are PIXELS relative to the
 *     panel's rendered size. The Comic Creator's renderer divides by the
 *     live panel pixel size to compute % positions, so authoring at a
 *     fixed reference page size (650x920) gives consistent layouts.
 */
import type { PromoTemplate, PromoTemplateData, PromoCustomData } from "./PromoPageStudio";

// Reference page size used by the comic creator's normal (non-fullscreen)
// view. All materialize-spec percentages convert against these dimensions.
const REF_W = 650;
const REF_H = 920;

// Subset of PanelContent shape we generate. Mirrors the shape declared in
// ComicCreator.tsx's `interface PanelContent`. We avoid importing from
// ComicCreator to prevent a circular dep — the runtime shape is what
// matters.
export interface MaterializedTransform {
  x: number;          // px relative to panel
  y: number;
  width: number;
  height: number;
  rotation: number;   // degrees
  scaleX: number;
  scaleY: number;
}

export interface MaterializedContentData {
  url?: string;
  text?: string;
  bubbleStyle?:
    | "none" | "speech" | "thought" | "shout" | "whisper" | "burst"
    | "scream" | "robot" | "drip" | "glitch" | "retro" | "neon"
    | "graffiti" | "caption" | "starburst";
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  backgroundColor?: string;
  padding?: number;
  borderRadius?: number;
  textEffect?:
    | "none" | "outline" | "shadow" | "glow" | "3d" | "emboss"
    | "neon" | "comic" | "retro" | "fire" | "ice" | "gold" | "chrome";
  strokeColor?: string;
  strokeWidth?: number;
  fontWeight?: "normal" | "bold" | "900";
  fontStyle?: "normal" | "italic";
  textAlign?: "left" | "center" | "right";
  textTransform?: "none" | "uppercase" | "lowercase";
  letterSpacing?: number;
  lineHeight?: number;
  textPanel?: boolean;
  alt?: string;
}

export interface MaterializedContent {
  id: string;
  name?: string;
  type: "image" | "text" | "bubble" | "shape";
  hidden?: boolean;
  clipToPanel?: boolean;
  transform: MaterializedTransform;
  data: MaterializedContentData;
  zIndex: number;
  locked: boolean;
}

export interface MaterializedPanel {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  type?: "rectangle" | "circle" | "polygon";
  shape?: "rectangle" | "circle" | "polygon";
  contents: MaterializedContent[];
  zIndex: number;
  locked?: boolean;
  hidden?: boolean;
  name?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

export interface MaterializedPages {
  leftPage: MaterializedPanel[];
  rightPage: MaterializedPanel[];
}

// --- Spec types (what a template author writes) -------------------------

export type SpecAlign = "left" | "center" | "right";

export interface SpecItemBase {
  // Position in % of page (0-100). Authoring in % keeps templates
  // resolution-independent.
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  z?: number;
  locked?: boolean;
}

export interface SpecTextItem extends SpecItemBase {
  kind: "text";
  // Plain string, or token like "{{headline}}", "{{subheadline}}",
  // "{{bodyCopy}}", "{{ctaText}}", "{{ctaUrl}}". Tokens resolve from the
  // merged customData when materializing.
  text: string;
  fontSize?: number;            // px at REF_W=650
  fontFamily?: string;
  color?: string;
  fontWeight?: "normal" | "bold" | "900";
  fontStyle?: "normal" | "italic";
  textAlign?: SpecAlign;
  textTransform?: "none" | "uppercase" | "lowercase";
  letterSpacing?: number;
  lineHeight?: number;
  backgroundColor?: string;     // colored block behind text (textPanel)
  padding?: number;
  borderRadius?: number;
  textEffect?: MaterializedContentData["textEffect"];
  strokeColor?: string;
  strokeWidth?: number;
}

export interface SpecImageItem extends SpecItemBase {
  kind: "image";
  // Static URL OR token like "{{imageUrl}}", "{{logoUrl}}", "{{qrUrl}}".
  src: string;
  alt?: string;
}

// Decorative shape (rectangle, circle, starburst). Rendered as a Panel
// underneath all content panels, so it sits behind text/images and the
// user can still click + edit it via the panel handles.
export interface SpecShapeItem extends SpecItemBase {
  kind: "shape";
  shape: "rectangle" | "circle" | "starburst";
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  // For "starburst" (rendered as a bubble PanelContent inside a tiny
  // transparent host panel) — optional caption text shown inside.
  burstText?: string;
  burstColor?: string;
  burstFontSize?: number;
}

export type SpecItem = SpecTextItem | SpecImageItem | SpecShapeItem;

export interface MaterializeSpec {
  // Page background color (applied to the host panel's backgroundColor).
  pageBackground?: string;
  // Items rendered, in z-order top-to-bottom of the array (later = on top
  // unless `z` is given explicitly).
  items: SpecItem[];
  // If true, all items go on the rightPage. Else default rightPage.
  side?: "left" | "right";
}

// --- Helpers ------------------------------------------------------------

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function pctToPxX(pct: number): number { return Math.round((pct / 100) * REF_W); }
function pctToPxY(pct: number): number { return Math.round((pct / 100) * REF_H); }

// Resolve "{{token}}" references against merged custom data + template
// defaults. Unknown tokens render as empty strings (so a placeholder
// disappears cleanly when the user has not provided that value).
function resolveTokens(s: string, merged: PromoTemplateData): string {
  return s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => {
    const v = (merged as any)[key];
    return v == null ? "" : String(v);
  });
}

function makeFullPagePanel(opts: { backgroundColor?: string }): MaterializedPanel {
  return {
    id: uid("panel"),
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    type: "rectangle",
    shape: "rectangle",
    contents: [],
    zIndex: 0,
    backgroundColor: opts.backgroundColor || "#ffffff",
    borderColor: "transparent",
    borderWidth: 0,
    name: "Promo Page",
  };
}

function makeShapePanel(item: SpecShapeItem, zIndex: number): MaterializedPanel {
  const panel: MaterializedPanel = {
    id: uid("shape"),
    x: item.x,
    y: item.y,
    width: item.w,
    height: item.h,
    rotation: item.rotation || 0,
    type: item.shape === "circle" ? "circle" : "rectangle",
    shape: item.shape === "circle" ? "circle" : "rectangle",
    contents: [],
    zIndex,
    backgroundColor: item.backgroundColor || "#fde047",
    borderColor: item.borderColor || "transparent",
    borderWidth: item.borderWidth ?? 0,
    locked: !!item.locked,
    name: item.shape === "starburst" ? "Burst" : item.shape,
  };
  // Starburst is a rectangle host that contains a bubble PanelContent.
  if (item.shape === "starburst") {
    const w = pctToPxX(item.w);
    const h = pctToPxY(item.h);
    panel.backgroundColor = "transparent";
    panel.contents.push({
      id: uid("burst"),
      type: "bubble",
      transform: { x: 0, y: 0, width: w, height: h, rotation: 0, scaleX: 1, scaleY: 1 },
      data: {
        bubbleStyle: "starburst",
        backgroundColor: item.backgroundColor || "#fde047",
        color: item.burstColor || "#000000",
        text: item.burstText || "",
        fontSize: item.burstFontSize || 22,
        fontFamily: "'Bangers', cursive",
        fontWeight: "bold",
        textAlign: "center",
      },
      zIndex: 0,
      locked: false,
    });
  }
  return panel;
}

function makeTextContent(item: SpecTextItem, merged: PromoTemplateData, zIndex: number): MaterializedContent {
  return {
    id: uid("text"),
    type: "text",
    transform: {
      x: pctToPxX(item.x),
      y: pctToPxY(item.y),
      width: pctToPxX(item.w),
      height: pctToPxY(item.h),
      rotation: item.rotation || 0,
      scaleX: 1,
      scaleY: 1,
    },
    data: {
      text: resolveTokens(item.text, merged) || " ",
      fontSize: item.fontSize ?? 24,
      fontFamily: item.fontFamily || "'Bangers', cursive",
      color: item.color || "#000000",
      fontWeight: item.fontWeight || "bold",
      fontStyle: item.fontStyle || "normal",
      textAlign: item.textAlign || "left",
      textTransform: item.textTransform,
      letterSpacing: item.letterSpacing,
      lineHeight: item.lineHeight,
      backgroundColor: item.backgroundColor,
      padding: item.padding,
      borderRadius: item.borderRadius,
      textPanel: !!item.backgroundColor,
      textEffect: item.textEffect,
      strokeColor: item.strokeColor,
      strokeWidth: item.strokeWidth,
    },
    zIndex,
    locked: !!item.locked,
  };
}

function makeImageContent(item: SpecImageItem, merged: PromoTemplateData, zIndex: number): MaterializedContent | null {
  const url = resolveTokens(item.src, merged);
  if (!url) return null; // Skip empty image slots — keeps the spec clean.
  return {
    id: uid("img"),
    type: "image",
    transform: {
      x: pctToPxX(item.x),
      y: pctToPxY(item.y),
      width: pctToPxX(item.w),
      height: pctToPxY(item.h),
      rotation: item.rotation || 0,
      scaleX: 1,
      scaleY: 1,
    },
    data: { url, alt: item.alt || "" },
    zIndex,
    locked: !!item.locked,
  };
}

// --- Default fallback layout -------------------------------------------

function defaultMaterialize(merged: PromoTemplateData): MaterializedPages {
  const items: SpecItem[] = [];
  if (merged.headline) {
    items.push({
      kind: "text",
      x: 6, y: 6, w: 88, h: 12,
      text: "{{headline}}",
      fontSize: 38,
      color: merged.textColor || "#000000",
      fontWeight: "900",
      textAlign: "center",
      textTransform: "uppercase",
    });
  }
  if (merged.subheadline) {
    items.push({
      kind: "text",
      x: 8, y: 19, w: 84, h: 6,
      text: "{{subheadline}}",
      fontSize: 18,
      color: merged.textColor || "#222",
      fontWeight: "normal",
      fontStyle: "italic",
      textAlign: "center",
      fontFamily: "Georgia, serif",
    });
  }
  if (merged.imageUrl) {
    items.push({
      kind: "image",
      x: 12, y: 28, w: 76, h: 38,
      src: "{{imageUrl}}",
      alt: merged.headline || "Promo image",
    });
  }
  if (merged.bodyCopy) {
    items.push({
      kind: "text",
      x: 8, y: merged.imageUrl ? 70 : 32, w: 84, h: 18,
      text: "{{bodyCopy}}",
      fontSize: 15,
      color: merged.textColor || "#222",
      fontWeight: "normal",
      textAlign: "left",
      fontFamily: "Georgia, serif",
      lineHeight: 1.4,
    });
  }
  if (merged.ctaText) {
    items.push({
      kind: "shape",
      x: 25, y: 90, w: 50, h: 7,
      shape: "rectangle",
      backgroundColor: merged.accentColor || "#fbbf24",
      borderColor: "#000000",
      borderWidth: 2,
    });
    items.push({
      kind: "text",
      x: 25, y: 90, w: 50, h: 7,
      text: "{{ctaText}}",
      fontSize: 18,
      color: "#000000",
      fontWeight: "900",
      textAlign: "center",
      textTransform: "uppercase",
    });
  }
  return materializeFromSpec(
    { items, pageBackground: merged.backgroundColor || "#ffffff" },
    merged,
  );
}

// --- Spec-driven layout -------------------------------------------------

function materializeFromSpec(spec: MaterializeSpec, merged: PromoTemplateData): MaterializedPages {
  const host = makeFullPagePanel({ backgroundColor: spec.pageBackground });
  const shapePanels: MaterializedPanel[] = [];
  // Decorative shapes go BEHIND the host panel content, so they sit at
  // lower zIndex. Text + images live inside the host panel.
  let zCounter = 1;
  for (const item of spec.items) {
    if (item.kind === "shape") {
      shapePanels.push(makeShapePanel(item, item.z ?? zCounter++));
    }
  }
  const hostZ = (shapePanels.length ? Math.max(...shapePanels.map(p => p.zIndex)) : 0) + 1;
  host.zIndex = hostZ;
  let inner = 0;
  for (const item of spec.items) {
    if (item.kind === "text") {
      host.contents.push(makeTextContent(item, merged, item.z ?? inner++));
    } else if (item.kind === "image") {
      const c = makeImageContent(item, merged, item.z ?? inner++);
      if (c) host.contents.push(c);
    }
  }
  const allPanels = [...shapePanels, host];
  if (spec.side === "left") {
    return { leftPage: allPanels, rightPage: [] };
  }
  return { leftPage: [], rightPage: allPanels };
}

// --- Public entry point -------------------------------------------------

// Yellow-on-black disclosure banner required for sponsor/student/creator
// promos. Inserted as a LOCKED content item on every page so the user
// cannot accidentally remove or restyle it. Exports render the locked item
// alongside the rest of the spread, so the disclosure follows the page.
const REQUIRED_LABELS: Record<string, string | null> = {
  platform: null,
  sponsor:  "SPONSORED PAGE",
  student:  "STUDENT-CREATED PROMO",
  creator:  "CREATOR PROMO",
};

function makeDisclosureLabelContent(text: string, zIndex: number): MaterializedContent {
  return {
    id: uid("disclosure"),
    name: "Disclosure label (required)",
    type: "text",
    transform: {
      x: pctToPxX(2),
      y: pctToPxY(1.5),
      width: pctToPxX(96),
      height: pctToPxY(3.5),
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    },
    data: {
      text,
      fontSize: 14,
      fontFamily: "'Inter', system-ui, sans-serif",
      fontWeight: "900",
      textAlign: "center",
      textTransform: "uppercase",
      letterSpacing: 1.5,
      color: "#fde047",
      backgroundColor: "#000000",
      padding: 6,
      borderRadius: 4,
      textPanel: true,
    },
    zIndex,
    locked: true,
  };
}

/**
 * Convert a promo template + the user's custom data into editable Comic
 * Creator panels. Returns leftPage and rightPage panel arrays the caller
 * can assign directly onto a Spread.
 */
export function materializePromoTemplate(
  template: PromoTemplate,
  customData: PromoCustomData | undefined,
): MaterializedPages {
  const merged: PromoTemplateData = { ...(template.templateJson || {}), ...(customData || {}) };
  const spec = (merged as any).materializeSpec as MaterializeSpec | undefined;
  const pages = (spec && Array.isArray(spec.items))
    ? materializeFromSpec(spec, merged)
    : defaultMaterialize(merged);
  // Stamp the required disclosure label on whichever page has content.
  // Locked, fixed yellow-on-black, always at the top — matches the
  // PromoPageRenderer's read-only banner for legacy spreads.
  const requiredLabel = REQUIRED_LABELS[template.type] ?? null;
  if (requiredLabel) {
    const target = pages.rightPage.length ? pages.rightPage : pages.leftPage;
    const host = target.find(p => p.x === 0 && p.y === 0 && p.width === 100 && p.height === 100);
    if (host) {
      const topZ = host.contents.reduce((m, c) => Math.max(m, c.zIndex), 0) + 1;
      host.contents.push(makeDisclosureLabelContent(requiredLabel, topZ));
    }
  }
  return pages;
}
