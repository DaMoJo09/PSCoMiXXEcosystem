export type AssetTag =
  | "cover"
  | "back-cover"
  | "interior-page"
  | "splash-page"
  | "price-tag"
  | "barcode"
  | "logo"
  | "title-block"
  | "character-art"
  | "background"
  | "fx-overlay"
  | "speech-bubble"
  | "sfx-text"
  | "graffiti"
  | "filter-output"
  | "panel-strip"
  | "variant-cover"
  | "credits-page"
  | "ad-page"
  | "pin-up"
  | "chapter-break";

export type AssetType =
  | "static-asset"
  | "comixx-panel-export"
  | "panel-fx-return"
  | "comic-script"
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
}

export interface AssetFolderGroup {
  label: string;
  tags: AssetTag[];
}

export const ASSET_FOLDER_GROUPS: AssetFolderGroup[] = [
  { label: "Covers", tags: ["cover", "back-cover", "variant-cover"] },
  { label: "Pages", tags: ["interior-page", "splash-page", "credits-page", "ad-page", "pin-up", "chapter-break"] },
  { label: "Overlays", tags: ["fx-overlay", "speech-bubble", "sfx-text", "graffiti"] },
  { label: "Art Assets", tags: ["character-art", "background", "filter-output"] },
  { label: "Branding", tags: ["price-tag", "barcode", "logo", "title-block"] },
];

export const ASSET_TAG_LABELS: Record<AssetTag, string> = {
  "cover": "Cover",
  "back-cover": "Back Cover",
  "interior-page": "Interior Page",
  "splash-page": "Splash Page",
  "price-tag": "Price Tag",
  "barcode": "Barcode",
  "logo": "Logo",
  "title-block": "Title Block",
  "character-art": "Character Art",
  "background": "Background",
  "fx-overlay": "FX Overlay",
  "speech-bubble": "Speech Bubble",
  "sfx-text": "SFX Text",
  "graffiti": "Graffiti",
  "filter-output": "Filter Output",
  "panel-strip": "Panel Strip",
  "variant-cover": "Variant Cover",
  "credits-page": "Credits Page",
  "ad-page": "Ad Page",
  "pin-up": "Pin-Up",
  "chapter-break": "Chapter Break",
};

export const MODE_DEFAULT_TAGS: Record<string, AssetTag> = {
  "/creator/comic": "interior-page",
  "/creator/motion": "fx-overlay",
  "/creator/card": "character-art",
  "/creator/vn": "background",
  "/creator/cyoa": "interior-page",
};
