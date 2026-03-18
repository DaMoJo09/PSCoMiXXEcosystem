export type PageSize = "us-comic" | "manga-b5" | "euro-a4" | "square" | "custom";
export type BorderStyle = "thick-ink" | "thin" | "rounded" | "borderless" | "jagged" | "torn" | "double";
export type PanelFit = "cover" | "contain" | "fill" | "none";

export interface PanelCell {
  id: string;
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  imageUrl: string | null;
  imageFit: PanelFit;
  imageOffsetX: number;
  imageOffsetY: number;
  imageZoom: number;
  borderStyle: BorderStyle;
  borderWidth: number;
  borderColor: string;
  backgroundColor: string;
  caption: string;
  captionPosition: "top" | "bottom" | "none";
  captionFont: string;
  captionFontSize: number;
  bleed: boolean;
  rotation: number;
}

export interface PageTemplate {
  id: string;
  name: string;
  rows: number;
  cols: number;
  panels: Pick<PanelCell, "row" | "col" | "rowSpan" | "colSpan">[];
}

export interface ComicPage {
  id: string;
  name: string;
  pageSize: PageSize;
  customWidth?: number;
  customHeight?: number;
  gutterWidth: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  backgroundColor: string;
  panels: PanelCell[];
  template: string;
}

export const PAGE_SIZES: Record<PageSize, { width: number; height: number; label: string }> = {
  "us-comic":  { width: 168.3, height: 260.4, label: 'US Comic (6.625×10.25")' },
  "manga-b5":  { width: 176, height: 250, label: "Manga B5" },
  "euro-a4":   { width: 210, height: 297, label: "European A4" },
  "square":    { width: 200, height: 200, label: "Square" },
  "custom":    { width: 200, height: 300, label: "Custom" },
};

export function createDefaultPanel(overrides: Partial<PanelCell> = {}): PanelCell {
  return {
    id: `panel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    row: 1,
    col: 1,
    rowSpan: 1,
    colSpan: 1,
    imageUrl: null,
    imageFit: "cover",
    imageOffsetX: 0,
    imageOffsetY: 0,
    imageZoom: 100,
    borderStyle: "thick-ink",
    borderWidth: 3,
    borderColor: "#000000",
    backgroundColor: "#FFFFFF",
    caption: "",
    captionPosition: "none",
    captionFont: "Inter, sans-serif",
    captionFontSize: 14,
    bleed: false,
    rotation: 0,
    ...overrides,
  };
}

export function createDefaultPage(templateId: string = "2x2"): ComicPage {
  return {
    id: `page-${Date.now()}`,
    name: "Untitled Page",
    pageSize: "us-comic",
    gutterWidth: 8,
    marginTop: 12,
    marginBottom: 12,
    marginLeft: 12,
    marginRight: 12,
    backgroundColor: "#FFFFFF",
    panels: [],
    template: templateId,
  };
}
