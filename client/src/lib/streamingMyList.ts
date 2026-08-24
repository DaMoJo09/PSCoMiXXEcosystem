const STORAGE_KEY = "ps-streaming-my-list-v1";
export const STREAMING_MY_LIST_EVENT = "ps-streaming-my-list-changed";

export function getStreamingMyListIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  } catch {
    return [];
  }
}

export function isStreamingItemSaved(id: string): boolean {
  return getStreamingMyListIds().includes(id);
}

export function setStreamingItemSaved(id: string, saved: boolean): string[] {
  const current = new Set(getStreamingMyListIds());
  if (saved) current.add(id);
  else current.delete(id);
  const next = Array.from(current);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(STREAMING_MY_LIST_EVENT, { detail: next }));
  } catch {
    // My List remains best-effort on devices that block local storage.
  }
  return next;
}

export function toggleStreamingMyList(id: string): boolean {
  const nextSaved = !isStreamingItemSaved(id);
  setStreamingItemSaved(id, nextSaved);
  return nextSaved;
}
