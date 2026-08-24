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
  mode?: string;
  title?: string;
  synopsis?: string;
  description?: string;
  creator?: string;
  subtitle?: string;
  rating?: string;
  durationSeconds?: number;
  poster?: string;
  image?: string;
  thumbnail_url?: string;
  backdrop_url?: string;
  stream?: string;
  stream_url?: string;
  streamType?: string;
  deepLink?: string;
  to?: string;
  meta?: string;
  featured?: boolean;
  release_date?: string;
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

function sectionGroup(section: LiveSection): StreamingGroup {
  const key = `${section.id || ""} ${section.title || ""}`.toLowerCase();
  if (key.includes("listen") || key.includes("music")) return "listen";
  if (key.includes("read") || key.includes("comic") || key.includes("novel")) return "read";
  if (key.includes("play") || key.includes("experience") || key.includes("hop")) return "experience";
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

function normalizeLiveSection(section: LiveSection): MasterStreamingItem[] {
  const group = sectionGroup(section);
  return (section.items || []).flatMap((raw) => {
    const sourceId = safeId(raw.id) || safeId(raw.content_id);
    const title = safeId(raw.title);
    if (!sourceId || !title) return [];

    const kind = (safeId(raw.type) || safeId(raw.mode) || group).toLowerCase();
    const image = safeId(raw.poster) || safeId(raw.image) || safeId(raw.thumbnail_url);
    const synopsis = safeId(raw.synopsis) || safeId(raw.description) || "A Press Start release.";
    const creator = safeId(raw.creator) || safeId(raw.subtitle) || "Press Start Creator";

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
      backdrop: safeId(raw.backdrop_url) || image,
      rating: safeId(raw.rating),
      durationSeconds: typeof raw.durationSeconds === "number" ? raw.durationSeconds : null,
      meta: safeId(raw.meta),
      deepLink: safeId(raw.deepLink) || safeId(raw.to),
      streamUrl: safeId(raw.stream) || safeId(raw.stream_url),
      streamType: safeId(raw.streamType),
      featured: raw.featured === true,
      createdAt: safeId(raw.release_date),
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
    generatedAt: safeId(payload.generatedAt) || safeId(payload.generated_at),
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
    cyoa: "CYOA",
    vn: "VISUAL NOVEL",
    visual_novel: "VISUAL NOVEL",
    hop: "HOP",
    experience: "HOP",
    game: "GAME",
    music: "MUSIC",
    album: "ALBUM",
    music_video: "MUSIC VIDEO",
    motion: "MOTION",
    card: "CARDS",
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
