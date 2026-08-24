export type StreamingSource = "live" | "community";
export type StreamingGroup = "watch" | "listen" | "experience" | "read" | "play" | "community";

export interface StreamingFeatureFlags {
  watch: boolean;
  experience: boolean;
  read: boolean;
  play: boolean;
  listen: boolean;
  search: boolean;
}

export const DEFAULT_STREAMING_FEATURE_FLAGS: StreamingFeatureFlags = {
  watch: true,
  experience: true,
  read: true,
  play: true,
  listen: true,
  search: true,
};

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
  featureFlags: StreamingFeatureFlags;
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

interface ClientFeatureFlags {
  watch_enabled?: boolean;
  experience_enabled?: boolean;
  read_enabled?: boolean;
  play_enabled?: boolean;
  listen_enabled?: boolean;
  search_enabled?: boolean;
}

interface ClientConfigResponse {
  data?: ClientConfigResponse;
  feature_flags?: ClientFeatureFlags;
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
  featureFlags: DEFAULT_STREAMING_FEATURE_FLAGS,
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
  if (key.includes("experience") || key.includes("hop")) return "experience";
  if (key.includes("read") || key.includes("comic") || key.includes("novel")) return "read";
  if (key.includes("play") || key.includes("game") || key.includes("arcade")) return "play";
  if (key.includes("watch") || key.includes("film") || key.includes("video") || key.includes("cinema")) return "watch";
  if (key.includes("listen") || key.includes("music")) return "listen";
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
    case "game":
    case "arcade":
      return "play";
    case "motion":
      return "watch";
    default:
      return "community";
  }
}

function groupFromItem(raw: LiveSectionItem, fallback: StreamingGroup): StreamingGroup {
  const runtime = (safeId(raw.runtime) || "").toLowerCase();
  const mode = (safeId(raw.mode) || "").toLowerCase();
  const type = (safeId(raw.type) || "").toLowerCase();
  const contentType = (safeId(raw.content_type) || "").toLowerCase();

  const explicit = `${runtime} ${mode}`;
  if (explicit.includes("experience")) return "experience";
  if (explicit.includes("read")) return "read";
  if (explicit.includes("play") || explicit.includes("game") || explicit.includes("arcade")) return "play";
  if (explicit.includes("watch")) return "watch";
  if (explicit.includes("listen")) return "listen";

  const media = `${type} ${contentType}`;
  const tokens = media.split(/\s+/).filter(Boolean);
  if (media.includes("music_video") || media.includes("lyric_video") || media.includes("performance") || media.includes("behind_the_song")) return "watch";
  if (["film", "movie", "series", "episode", "short", "shortformvideo", "motion", "video"].some((token) => tokens.includes(token))) return "watch";
  if (media.includes("living_visual") || media.includes("hop") || media.includes("experience")) return "experience";
  if (media.includes("comic") || media.includes("book") || media.includes("visual_novel") || media.includes("cyoa") || media.includes("trading_card") || tokens.includes("read")) return "read";
  if (media.includes("game") || media.includes("arcade") || tokens.includes("play")) return "play";

  const audioTokens = new Set(["music", "audio", "track", "album", "ep", "single", "playlist", "soundtrack"]);
  if (tokens.some((token) => audioTokens.has(token))) return "listen";

  return fallback;
}

function groupEnabled(group: StreamingGroup, flags: StreamingFeatureFlags): boolean {
  if (group === "community") return true;
  return flags[group];
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

function boolOrDefault(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

async function fetchFeatureFlags(): Promise<StreamingFeatureFlags> {
  try {
    const url = new URL(CATALOG_FEED_URL);
    url.searchParams.set("format", "client-config");
    const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    if (!res.ok) return { ...DEFAULT_STREAMING_FEATURE_FLAGS };
    const root = (await res.json()) as ClientConfigResponse;
    const source = root.data || root;
    const flags = source.feature_flags || {};
    return {
      watch: boolOrDefault(flags.watch_enabled, true),
      experience: boolOrDefault(flags.experience_enabled, true),
      read: boolOrDefault(flags.read_enabled, true),
      play: boolOrDefault(flags.play_enabled, true),
      listen: boolOrDefault(flags.listen_enabled, true),
      search: boolOrDefault(flags.search_enabled, true),
    };
  } catch {
    return { ...DEFAULT_STREAMING_FEATURE_FLAGS };
  }
}

async function fetchLiveCatalog(): Promise<{ items: MasterStreamingItem[]; generatedAt: string | null; featureFlags: StreamingFeatureFlags }> {
  const url = new URL(CATALOG_FEED_URL);
  url.searchParams.set("format", "sections");
  url.searchParams.set("platform", "web");

  const [catalogResponse, featureFlags] = await Promise.all([
    fetch(url.toString(), { headers: { Accept: "application/json" } }),
    fetchFeatureFlags(),
  ]);
  if (!catalogResponse.ok) throw new Error(`Live catalog returned ${catalogResponse.status}`);

  const payload = (await catalogResponse.json()) as LiveSectionsResponse;
  const items = (payload.sections || [])
    .flatMap(normalizeLiveSection)
    .filter((item) => groupEnabled(item.group, featureFlags));
  return {
    items,
    generatedAt: firstString(payload.generatedAt, payload.generated_at),
    featureFlags,
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
  const featureFlags = live?.featureFlags || { ...DEFAULT_STREAMING_FEATURE_FLAGS };
  const community = communityResult.status === "fulfilled"
    ? communityResult.value.filter((item) => groupEnabled(item.group, featureFlags))
    : [];
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
    featureFlags,
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
  const normalized = normalizeCommunityItem({
    id: project.id,
    title: project.title,
    thumbnail: project.thumbnail || null,
    creatorName: project.creatorName || "Press Start Creator",
    createdAt: project.createdAt || new Date().toISOString(),
    projectType: project.type || project.projectType,
  });
  return groupEnabled(normalized.group, catalog.featureFlags) ? normalized : null;
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
    case "play": return "PLAY";
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
    arcade: "GAME",
    play: "GAME",
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
