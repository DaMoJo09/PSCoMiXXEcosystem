export type StreamingSource = "live" | "community";
export type StreamingGroup = "watch" | "listen" | "experience" | "read" | "community";

export interface MasterStreamingItem {
  id: string;
  sourceId: string;
  source: StreamingSource;
  group: StreamingGroup;
  kind: string;
  title: string;
  synopsis: string;
  creator: string;
  image: string | null;
  backdrop: string | null;
  rating: string | null;
  durationSeconds: number | null;
  meta: string | null;
  deepLink: string | null;
  streamUrl: string | null;
  streamType: string | null;
  featured: boolean;
  createdAt: string | null;
}

export interface MasterStreamingCatalog {
  items: MasterStreamingItem[];
  generatedAt: string | null;
  sources: {
    live: boolean;
    community: boolean;
  };
}

interface LiveSectionItem {
  id?: string;
  content_id?: string;
  type?: string;
  content_type?: string;
  mode?: string;
  runtime?: string;
  title?: string;
  synopsis?: string;
  description?: string;
  creator?: string;
  creator_name?: string;
  creator_credit?: string;
  subtitle?: string;
  rating?: string;
  age_rating?: string;
  durationSeconds?: number;
  duration_seconds?: number;
  poster?: string;
  poster_url?: string;
  image?: string;
  artwork_url?: string;
  cover_asset_url?: string;
  thumbnail_url?: string;
  backdrop_url?: string;
  backdrop?: string;
  stream?: string;
  stream_url?: string;
  streamType?: string;
  stream_type?: string;
  deepLink?: string;
  deep_link?: string;
  play_deep_link?: string;
  to?: string;
  meta?: string;
  featured?: boolean;
  release_date?: string;
  published_at?: string;
  created_at?: string;
}

interface LiveSection {
  id?: string;
  title?: string;
  items?: LiveSectionItem[];
}

interface LiveSectionsResponse {
  provider?: string;
  version?: string;
  generatedAt?: string;
  generated_at?: string;
  sections?: LiveSection[];
}

interface CommunityItem {
  id: string;
  title: string;
  thumbnail: string | null;
  creatorName: string;
  createdAt: string;
  projectType?: string;
}

interface CommunityLibraryResponse {
  comics?: CommunityItem[];
}

const CATALOG_FEED_URL =
  import.meta.env.VITE_PS_CATALOG_FEED_URL ||
  "https://upivslgwjtvqymonliib.supabase.co/functions/v1/catalog-feed";

const EMPTY_CATALOG: MasterStreamingCatalog = {
  items: [],
  generatedAt: null,
  sources: { live: false, community: false },
};

function safeId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    const normalized = safeId(value);
    if (normalized) return normalized;
  }
  return null;
}

function sectionGroup(section: LiveSection): StreamingGroup {
  const key = `${section.id || ""} ${section.title || ""}`.toLowerCase();
  if (key.includes("listen") || key.includes("music")) return "listen";
  if (key.includes("read") || key.includes("comic") || key.includes("novel")) return "read";
  if (key.includes("experience") || key.includes("hop")) return "experience";
  if (key.includes("watch") || key.includes("film") || key.includes("video")) return "watch";
  return "community";
}

function communityGroup(projectType?: string): StreamingGroup {
  switch ((projectType || "").toLowerCase()) {
    case "comic":
    case "vn":
    case "cyoa":
    case "card":
      return "read";
    case "hop":
      return "experience";
    case "motion":
      return "watch";
    default:
      return "community";
  }
}

function groupFromItem(raw: LiveSectionItem, fallback: StreamingGroup): StreamingGroup {
  const key = `${raw.runtime || ""} ${raw.mode || ""} ${raw.type || ""} ${raw.content_type || ""}`.toLowerCase();
  if (key.includes("listen") || key.includes("music") || key.includes("audio") || key.includes("track") || key.includes("album") || key.includes("ep")) return "listen";
  if (key.includes("read") || key.includes("comic") || key.includes("novel") || key.includes("cyoa") || key.includes("card")) return "read";
  if (key.includes("experience") || key.includes("hop") || key.includes("living_visual")) return "experience";
  if (key.includes("watch") || key.includes("film") || key.includes("video") || key.includes("episode") || key.includes("motion")) return "watch";
  return fallback;
}

function normalizeLiveSection(section: LiveSection): MasterStreamingItem[] {
  const sectionFallback = sectionGroup(section);
  return (section.items || []).flatMap((raw) => {
    const sourceId = firstString(raw.id, raw.content_id);
    const title = safeId(raw.title);
    if (!sourceId || !title) return [];

    const group = groupFromItem(raw, sectionFallback);
    const kind = (firstString(raw.content_type, raw.type, raw.mode, raw.runtime) || group).toLowerCase();
    const image = firstString(raw.poster, raw.poster_url, raw.image, raw.artwork_url, raw.cover_asset_url, raw.thumbnail_url);
    const synopsis = firstString(raw.synopsis, raw.description) || "A Press Start release.";
    const creator = firstString(raw.creator_credit, raw.creator_name, raw.creator, raw.subtitle) || "Independent Creator";
    const durationSeconds = typeof raw.duration_seconds === "number"
      ? raw.duration_seconds
      : typeof raw.durationSeconds === "number"
        ? raw.durationSeconds
        : null;

    return [{
      id: `live:${sourceId}`,
      sourceId,
      source: "live" as const,
      group,
      kind,
      title,
      synopsis,
      creator,
      image,
      backdrop: firstString(raw.backdrop_url, raw.backdrop) || image,
      rating: firstString(raw.rating, raw.age_rating),
      durationSeconds,
      meta: safeId(raw.meta),
      deepLink: firstString(raw.deep_link, raw.deepLink, raw.play_deep_link, raw.to),
      streamUrl: firstString(raw.stream, raw.stream_url),
      streamType: firstString(raw.stream_type, raw.streamType),
      featured: raw.featured === true,
      createdAt: firstString(raw.release_date, raw.published_at, raw.created_at),
    }];
  });
}

function normalizeCommunityItem(raw: CommunityItem): MasterStreamingItem {
  const group = communityGroup(raw.projectType);
  const kind = (raw.projectType || "community").toLowerCase();
  const deepLink = kind === "comic" ? `/community/read/${raw.id}` : `/community/view/${raw.id}`;
  return {
    id: `community:${raw.id}`,
    sourceId: raw.id,
    source: "community",
    group,
    kind,
    title: raw.title,
    synopsis: "A creator release from the Press Start ecosystem.",
    creator: raw.creatorName || "Press Start Creator",
    image: raw.thumbnail || null,
    backdrop: raw.thumbnail || null,
    rating: null,
    durationSeconds: null,
    meta: null,
    deepLink,
    streamUrl: null,
    streamType: null,
    featured: false,
    createdAt: raw.createdAt || null,
  };
}

async function fetchLiveCatalog(): Promise<{ items: MasterStreamingItem[]; generatedAt: string | null }> {
  const url = new URL(CATALOG_FEED_URL);
  url.searchParams.set("format", "sections");
  url.searchParams.set("platform", "web");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Live catalog returned ${res.status}`);

  const payload = (await res.json()) as LiveSectionsResponse;
  const items = (payload.sections || []).flatMap(normalizeLiveSection);
  return {
    items,
    generatedAt: firstString(payload.generatedAt, payload.generated_at),
  };
}

async function fetchCommunityCatalog(): Promise<MasterStreamingItem[]> {
  const query = new URLSearchParams({ page: "1", limit: "100", sort: "newest" });
  const res = await fetch(`/api/community/library?${query.toString()}`);
  if (!res.ok) throw new Error(`Community catalog returned ${res.status}`);
  const payload = (await res.json()) as CommunityLibraryResponse;
  return (payload.comics || []).map(normalizeCommunityItem);
}

export async function fetchMasterStreamingCatalog(): Promise<MasterStreamingCatalog> {
  const [liveResult, communityResult] = await Promise.allSettled([
    fetchLiveCatalog(),
    fetchCommunityCatalog(),
  ]);

  const live = liveResult.status === "fulfilled" ? liveResult.value : null;
  const community = communityResult.status === "fulfilled" ? communityResult.value : [];
  const deduped = new Map<string, MasterStreamingItem>();

  for (const item of [...(live?.items || []), ...community]) {
    deduped.set(item.id, item);
  }

  if (!live && communityResult.status === "rejected") return EMPTY_CATALOG;

  return {
    items: Array.from(deduped.values()),
    generatedAt: live?.generatedAt || null,
    sources: {
      live: !!live,
      community: communityResult.status === "fulfilled",
    },
  };
}

export async function fetchMasterStreamingItem(encodedId: string): Promise<MasterStreamingItem | null> {
  let id = encodedId;
  try {
    id = decodeURIComponent(encodedId);
  } catch {
    id = encodedId;
  }

  const catalog = await fetchMasterStreamingCatalog();
  const direct = catalog.items.find((item) => item.id === id);
  if (direct) return direct;

  const [source, ...rest] = id.split(":");
  const sourceId = rest.join(":");
  if (source !== "community" || !sourceId) return null;

  const res = await fetch(`/api/community/comic/${encodeURIComponent(sourceId)}`);
  if (!res.ok) return null;
  const project = await res.json();
  return normalizeCommunityItem({
    id: project.id,
    title: project.title,
    thumbnail: project.thumbnail || null,
    creatorName: project.creatorName || "Press Start Creator",
    createdAt: project.createdAt || new Date().toISOString(),
    projectType: project.type || project.projectType,
  });
}

export function streamingItemHref(item: MasterStreamingItem): string {
  return `/streaming/title/${encodeURIComponent(item.id)}`;
}

export function streamingItemDestination(item: MasterStreamingItem): string | null {
  return item.deepLink || null;
}

export function streamingGroupLabel(group: StreamingGroup): string {
  switch (group) {
    case "watch": return "WATCH";
    case "listen": return "LISTEN";
    case "experience": return "EXPERIENCE";
    case "read": return "READ";
    default: return "PRESS START";
  }
}

export function streamingKindLabel(kind: string): string {
  const labels: Record<string, string> = {
    film: "FILM",
    series: "SERIES",
    episode: "EPISODE",
    short: "SHORT",
    comic: "COMIC",
    comic_issue: "COMIC",
    cyoa: "CYOA",
    vn: "VISUAL NOVEL",
    visual_novel: "VISUAL NOVEL",
    hop: "HOP",
    experience: "HOP",
    living_visual: "LIVING VISUAL",
    game: "GAME",
    music: "MUSIC",
    track: "TRACK",
    single: "SINGLE",
    ep: "EP",
    album: "ALBUM",
    music_video: "MUSIC VIDEO",
    motion: "MOTION",
    card: "CARDS",
    trading_card: "CARDS",
  };
  return labels[kind.toLowerCase()] || kind.replaceAll("_", " ").toUpperCase();
}

export function formatRuntime(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}
