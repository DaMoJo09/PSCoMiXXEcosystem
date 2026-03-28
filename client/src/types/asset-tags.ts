export type AssetTag =
  | "cover"
  | "cover-front"
  | "cover-back"
  | "back-cover"
  | "interior-page"
  | "splash-page"
  | "price-tag"
  | "barcode"
  | "logo"
  | "title-block"
  | "title-card"
  | "character-art"
  | "background"
  | "fx-overlay"
  | "speech-bubble"
  | "sfx-text"
  | "graffiti"
  | "filter-output"
  | "panel-strip"
  | "page-layout"
  | "variant-cover"
  | "credits-page"
  | "ad-page"
  | "pin-up"
  | "chapter-break"
  | "prop"
  | "script"
  | "comic-script";

export type AssetType =
  | "static-asset"
  | "comixx-panel-export"
  | "panel-fx-return"
  | "comic-script"
  | "library-asset"
  | "character"
  | "graffiti"
  | "background-fx"
  | "filtered-image"
  | "cover"
  | "layout-spread"
  | "overlay"
  | "price-tag"
  | "title"
  | "bubble"
  | "script-package"
  | string;

export interface SyncPayload {
  name: string;
  asset_tag: AssetTag;
  preview_data_url: string;
  target_page?: number;
  project_id?: string;
  source_mode: string;
  source_panel_id?: string;
  type?: AssetType;
  layers?: any[];
  canvas_background?: string;
  metadata?: Record<string, any>;
  description?: string;
  layer_count?: number;
  total_frames?: number;
  fps?: number;
  mode_hints?: Record<string, any>;
  script_data?: any;
}

export interface AssetFolderGroup {
  label: string;
  tags: AssetTag[];
}

export const ASSET_FOLDER_GROUPS: AssetFolderGroup[] = [
  { label: "Covers", tags: ["cover", "cover-front", "cover-back", "back-cover", "variant-cover"] },
  { label: "Pages", tags: ["interior-page", "splash-page", "page-layout", "credits-page", "ad-page", "pin-up", "chapter-break", "panel-strip"] },
  { label: "Characters", tags: ["character-art"] },
  { label: "Backgrounds", tags: ["background"] },
  { label: "FX & Overlays", tags: ["fx-overlay", "filter-output"] },
  { label: "Text & Bubbles", tags: ["speech-bubble", "sfx-text", "title-block", "title-card"] },
  { label: "Art & Drawing", tags: ["graffiti"] },
  { label: "Props & Misc", tags: ["price-tag", "barcode", "logo", "prop"] },
  { label: "Scripts", tags: ["script", "comic-script"] },
];

export const ASSET_TAG_LABELS: Record<AssetTag, string> = {
  "cover": "Cover",
  "cover-front": "Front Cover",
  "cover-back": "Back Cover",
  "back-cover": "Back Cover",
  "interior-page": "Interior Page",
  "splash-page": "Splash Page",
  "price-tag": "Price Tag",
  "barcode": "Barcode",
  "logo": "Logo",
  "title-block": "Title Block",
  "title-card": "Title Card",
  "character-art": "Character Art",
  "background": "Background",
  "fx-overlay": "FX Overlay",
  "speech-bubble": "Speech Bubble",
  "sfx-text": "SFX Text",
  "graffiti": "Graffiti",
  "filter-output": "Filter Output",
  "panel-strip": "Panel Strip",
  "page-layout": "Page Layout",
  "variant-cover": "Variant Cover",
  "credits-page": "Credits Page",
  "ad-page": "Ad Page",
  "pin-up": "Pin-Up",
  "chapter-break": "Chapter Break",
  "prop": "Prop",
  "script": "Script",
  "comic-script": "Comic Script",
};

export const FX_MODE_TYPE_MAP: Record<string, { defaultTag: AssetTag; label: string }> = {
  "static-asset": { defaultTag: "fx-overlay", label: "FX Studio" },
  "character": { defaultTag: "character-art", label: "Character" },
  "graffiti": { defaultTag: "fx-overlay", label: "Graffiti" },
  "background-fx": { defaultTag: "background", label: "BG FX" },
  "filtered-image": { defaultTag: "fx-overlay", label: "Filter" },
  "cover": { defaultTag: "cover-front", label: "Cover" },
  "layout-spread": { defaultTag: "page-layout", label: "Layout" },
  "overlay": { defaultTag: "fx-overlay", label: "Overlay" },
  "price-tag": { defaultTag: "prop", label: "Price Tag" },
  "title": { defaultTag: "title-card", label: "Title" },
  "bubble": { defaultTag: "speech-bubble", label: "Bubble" },
  "script-package": { defaultTag: "script", label: "Script" },
  "library-asset": { defaultTag: "prop", label: "Library" },
  "comic-script": { defaultTag: "comic-script", label: "Script" },
  "comixx-panel-export": { defaultTag: "interior-page", label: "Panel Export" },
  "panel-fx-return": { defaultTag: "fx-overlay", label: "FX Return" },
};

export const LIBRARY_CATEGORY_TAG_MAP: Record<string, AssetTag> = {
  character: "character-art",
  background: "background",
  effect: "fx-overlay",
  overlay: "fx-overlay",
  bubble: "speech-bubble",
  cover: "cover",
  title: "title-card",
  preset: "prop",
  other: "prop",
};

export const MODE_DEFAULT_TAGS: Record<string, AssetTag> = {
  "/creator/comic": "interior-page",
  "/creator/motion": "fx-overlay",
  "/creator/card": "character-art",
  "/creator/vn": "background",
  "/creator/cyoa": "interior-page",
};
