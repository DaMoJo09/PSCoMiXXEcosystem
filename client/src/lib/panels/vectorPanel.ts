/**
 * Vector panel system — foundation for the Live Vector Panel feature.
 *
 * Background
 *   The legacy panel model is a raster rectangle (x, y, width, height) that
 *   simply sets a clipping window in the comic page. That makes resizing
 *   destructive (contents drift, get cropped, or drop out entirely) and
 *   prevents non-rectangular shapes (round, hex, splash, custom polygon).
 *
 * Goals
 *   1. Panels are SHAPES — described by either a primitive or a path.
 *   2. Resizing/reshaping a panel preserves its contents proportionally.
 *   3. Anything dragged into a panel is auto-clipped by the panel's shape.
 *   4. Backwards-compatible: a legacy rect panel maps cleanly to a "rect"
 *      VectorPanel and can be migrated lazily.
 *
 * This module is the pure-data layer. It has zero React deps so it can be
 * unit-tested and reused by Motion Studio + FX.
 */

export type PanelShape =
  | { kind: "rect"; rx?: number /* corner radius 0..1 of half-min-side */ }
  | { kind: "ellipse" }
  | { kind: "polygon"; points: Array<[number, number]> /* in 0..1 normalized panel space */ }
  | { kind: "path"; d: string /* SVG path in 0..1 normalized panel space */ };

/**
 * A panel as a vector container. x/y/width/height are in PAGE pixels
 * (matches the legacy storage). All shape-defining geometry is normalized
 * to 0..1 within the panel's bounding box so it survives resize/scale.
 */
export interface VectorPanel {
  id: string;
  /** Bounding box in page pixels (or % — caller's choice; normalize is bbox-relative). */
  x: number;
  y: number;
  width: number;
  height: number;
  shape: PanelShape;
  /** Visual style, optional — defaults applied at render time. */
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
}

/** Migrate a legacy rect-only panel to a VectorPanel without losing fields. */
export function fromLegacyRect(rect: { id: string; x: number; y: number; width: number; height: number }): VectorPanel {
  return { ...rect, shape: { kind: "rect" } };
}

/**
 * Build the SVG path `d` attribute for a panel shape, expressed in the
 * panel's own bounding-box pixel space (0..width, 0..height).
 *
 * The returned path is suitable for use as a <clipPath> child OR as a
 * stroked outline.
 */
export function shapeToPath(panel: VectorPanel): string {
  const { width: w, height: h, shape } = panel;
  switch (shape.kind) {
    case "rect": {
      const r = Math.max(0, Math.min(1, shape.rx ?? 0)) * (Math.min(w, h) / 2);
      if (r <= 0) return `M 0 0 H ${w} V ${h} H 0 Z`;
      return [
        `M ${r} 0`,
        `H ${w - r}`,
        `Q ${w} 0 ${w} ${r}`,
        `V ${h - r}`,
        `Q ${w} ${h} ${w - r} ${h}`,
        `H ${r}`,
        `Q 0 ${h} 0 ${h - r}`,
        `V ${r}`,
        `Q 0 0 ${r} 0`,
        "Z",
      ].join(" ");
    }
    case "ellipse": {
      const rx = w / 2, ry = h / 2;
      return `M ${rx} 0 a ${rx} ${ry} 0 1 0 0 ${h} a ${rx} ${ry} 0 1 0 0 ${-h} Z`;
    }
    case "polygon": {
      if (shape.points.length === 0) return "";
      const pts = shape.points.map(([nx, ny]) => `${(nx * w).toFixed(2)} ${(ny * h).toFixed(2)}`);
      return `M ${pts[0]} L ${pts.slice(1).join(" L ")} Z`;
    }
    case "path":
      // Normalized 0..1 path → scale by bbox. Cheap viewport scale via SVG
      // transform; here we emit a transform-aware path by wrapping in a
      // group at render time. Keep `d` raw to avoid double-scaling.
      return shape.d;
  }
}

/**
 * A clip-path id stable for a given panel, so multiple SVG layers can share
 * the same clip without re-emitting it.
 */
export function clipIdFor(panel: VectorPanel): string {
  return `panel-clip-${panel.id}`;
}

/**
 * Test whether a (page-space) point falls inside a panel's shape.
 * Used for hit-testing drag-drop targets and pen interactions.
 */
export function pointInPanel(panel: VectorPanel, px: number, py: number): boolean {
  const lx = px - panel.x;
  const ly = py - panel.y;
  if (lx < 0 || ly < 0 || lx > panel.width || ly > panel.height) return false;

  const { shape, width: w, height: h } = panel;
  switch (shape.kind) {
    case "rect":
      return true; // bbox already passed
    case "ellipse": {
      const dx = (lx - w / 2) / (w / 2);
      const dy = (ly - h / 2) / (h / 2);
      return dx * dx + dy * dy <= 1;
    }
    case "polygon": {
      // Even-odd ray cast in normalized space.
      const nx = lx / w, ny = ly / h;
      return pointInPolygon(shape.points, nx, ny);
    }
    case "path": {
      // `shape.d` is in NORMALIZED 0..1 panel space (same convention as
      // shapeToPath). Test the normalized point against the normalized path
      // — never the pixel point against the normalized path, which would
      // mis-fire for almost all real panel sizes.
      if (typeof document === "undefined") return true;
      try {
        const ctx = document.createElement("canvas").getContext("2d");
        if (!ctx) return true;
        return ctx.isPointInPath(new Path2D(shape.d), lx / w, ly / h);
      } catch {
        return true;
      }
    }
  }
}

function pointInPolygon(pts: Array<[number, number]>, x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    const intersects = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/**
 * Reshape a panel to a new bounding box without mutating its shape descriptor.
 * Because shape geometry is normalized, this is a straight bbox swap — content
 * stretches with the box rather than being cropped.
 */
export function resizePanel(panel: VectorPanel, next: { x: number; y: number; width: number; height: number }): VectorPanel {
  return { ...panel, ...next };
}

/**
 * Convenience preset shapes for the panel template picker.
 */
export const PANEL_SHAPE_PRESETS: Array<{ id: string; label: string; shape: PanelShape }> = [
  { id: "rect",        label: "Rectangle",       shape: { kind: "rect" } },
  { id: "rect-soft",   label: "Soft Rectangle",  shape: { kind: "rect", rx: 0.15 } },
  { id: "ellipse",     label: "Ellipse",         shape: { kind: "ellipse" } },
  { id: "diamond",     label: "Diamond",         shape: { kind: "polygon", points: [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]] } },
  { id: "hex",         label: "Hexagon",         shape: { kind: "polygon", points: [[0.25, 0], [0.75, 0], [1, 0.5], [0.75, 1], [0.25, 1], [0, 0.5]] } },
  { id: "triangle",    label: "Triangle",        shape: { kind: "polygon", points: [[0.5, 0], [1, 1], [0, 1]] } },
];
