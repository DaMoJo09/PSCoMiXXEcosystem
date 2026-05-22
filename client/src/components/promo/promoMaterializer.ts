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
 *   - EACH spec item (text, image, decorative shape) becomes its OWN
 *     top-level Panel sized in % of page (0-100). Every panel sits at
 *     the same stacking level, so the author's intended z-order — e.g.
 *     a red banner shape BEHIND the headline text — is preserved and
 *     each item stays independently selectable on the canvas.
 *   - A locked, full-page background panel at zIndex 0 holds the page
 *     color so individual item panels can be transparent without
 *     exposing the underlying white page.
 *   - PanelContent transform.x/y/width/height are PIXELS relative to
 *     the panel's rendered size. The Comic Creator's renderer divides
 *     by the live panel pixel size to compute % positions, so authoring
 *     at a fixed reference page size (650x920) gives consistent layouts.
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
  // Which page of the spread receives the materialized panels. Defaults
  // to "left" so a freshly inserted promo lands on page 1 (visible and
  // immediately editable). Set to "right" to override.
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

// Wrap a single text item in its own top-level panel sized to the slot.
// This keeps text/images at the SAME stacking level as decorative shapes
// so they can be interleaved by zIndex and each selected independently.
// Position is in % of page, so it scales correctly across non-fullscreen
// (650x920) and fullscreen (800x1130) page sizes.
function makeTextPanel(item: SpecTextItem, merged: PromoTemplateData, zIndex: number): MaterializedPanel {
  const wPx = pctToPxX(item.w);
  const hPx = pctToPxY(item.h);
  return {
    id: uid("textp"),
    x: item.x,
    y: item.y,
    width: item.w,
    height: item.h,
    rotation: item.rotation || 0,
    type: "rectangle",
    shape: "rectangle",
    contents: [
      {
        id: uid("text"),
        type: "text",
        transform: { x: 0, y: 0, width: wPx, height: hPx, rotation: 0, scaleX: 1, scaleY: 1 },
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
        zIndex: 0,
        locked: !!item.locked,
      },
    ],
    zIndex,
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderWidth: 0,
    locked: !!item.locked,
    name: "Text",
  };
}

// Same idea for images — own panel, image content fills it.
function makeImagePanel(item: SpecImageItem, merged: PromoTemplateData, zIndex: number): MaterializedPanel | null {
  const url = resolveTokens(item.src, merged);
  if (!url) return null;
  const wPx = pctToPxX(item.w);
  const hPx = pctToPxY(item.h);
  return {
    id: uid("imgp"),
    x: item.x,
    y: item.y,
    width: item.w,
    height: item.h,
    rotation: item.rotation || 0,
    type: "rectangle",
    shape: "rectangle",
    contents: [
      {
        id: uid("img"),
        type: "image",
        transform: { x: 0, y: 0, width: wPx, height: hPx, rotation: 0, scaleX: 1, scaleY: 1 },
        data: { url, alt: item.alt || "" },
        zIndex: 0,
        locked: !!item.locked,
      },
    ],
    zIndex,
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderWidth: 0,
    locked: !!item.locked,
    name: "Image",
  };
}

// Disclosure label becomes its own top-level panel pinned to the top of
// the page. Locked + with the highest zIndex so the user cannot move,
// re-style, or accidentally hide it.
function makeDisclosureLabelPanel(text: string, zIndex: number): MaterializedPanel {
  return {
    id: uid("disclose"),
    x: 2,
    y: 1.5,
    width: 96,
    height: 3.5,
    rotation: 0,
    type: "rectangle",
    shape: "rectangle",
    contents: [
      {
        id: uid("disc-text"),
        name: "Disclosure label (required)",
        type: "text",
        transform: {
          x: 0, y: 0,
          width: pctToPxX(96),
          height: pctToPxY(3.5),
          rotation: 0, scaleX: 1, scaleY: 1,
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
        zIndex: 0,
        locked: true,
      },
    ],
    zIndex,
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderWidth: 0,
    locked: true,
    name: "Disclosure label (required)",
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

// Legacy helper kept for backward-compat: text-as-content inside an
// existing host panel. New code path uses makeTextPanel above which gives
// each text its own top-level panel for correct stacking with shapes.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// Legacy helper kept for backward-compat — see makeTextContent comment.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  // Background fill: locked full-page panel at z=0 holding the page color.
  // Locked so the user can't accidentally drag/resize it; if they want a
  // different color they can unlock and re-style or just delete it.
  const bgPanel = makeFullPagePanel({ backgroundColor: spec.pageBackground });
  bgPanel.zIndex = 0;
  bgPanel.locked = true;
  bgPanel.name = "Background";

  // Each spec item becomes its own top-level panel. This means decorative
  // shapes, text blocks, and images all live at the same stacking level
  // and can be interleaved by zIndex — so a shape that's authored to sit
  // BEHIND a text block actually renders behind it (and remains
  // independently selectable from the canvas).
  const itemPanels: MaterializedPanel[] = [];
  let zCounter = 1;
  for (const item of spec.items) {
    const z = item.z ?? zCounter++;
    if (item.kind === "shape") {
      itemPanels.push(makeShapePanel(item, z));
    } else if (item.kind === "text") {
      itemPanels.push(makeTextPanel(item, merged, z));
    } else if (item.kind === "image") {
      const p = makeImagePanel(item, merged, z);
      if (p) itemPanels.push(p);
    }
  }

  const allPanels = [bgPanel, ...itemPanels];
  // Default to LEFT page so promo content lands on page 1 of the spread —
  // matches the user's expectation that "send promo to comic" produces a
  // single editable page they can immediately see and transform. Templates
  // can override by setting spec.side = "right".
  if (spec.side === "right") {
    return { leftPage: [], rightPage: allPanels };
  }
  return { leftPage: allPanels, rightPage: [] };
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
  // Stamp the required disclosure label as a locked top-level panel pinned
  // to whichever page has content. Highest zIndex so it always wins the
  // stacking contest — matches the PromoPageRenderer's read-only banner
  // for legacy spreads.
  const requiredLabel = REQUIRED_LABELS[template.type] ?? null;
  if (requiredLabel) {
    const target = pages.rightPage.length ? pages.rightPage : pages.leftPage;
    if (target.length > 0) {
      const topZ = target.reduce((m, p) => Math.max(m, p.zIndex), 0) + 1;
      target.push(makeDisclosureLabelPanel(requiredLabel, topZ));
    }
  }
  return pages;
}
