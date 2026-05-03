import { lazy, ComponentType } from "react";

const RELOAD_KEY = "psx:chunk-reload-attempts";
const MAX_ATTEMPTS = 2;
const ATTEMPT_WINDOW_MS = 60_000;

function isChunkLoadError(err: unknown): boolean {
  if (!err) return false;
  const message = err instanceof Error ? err.message : String(err);
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Loading chunk \d+ failed/i.test(message) ||
    /ChunkLoadError/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message)
  );
}

function readAttempts(): { count: number; firstAt: number } {
  try {
    const raw = sessionStorage.getItem(RELOAD_KEY);
    if (!raw) return { count: 0, firstAt: 0 };
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.count === "number" &&
      typeof parsed?.firstAt === "number"
    ) {
      return parsed;
    }
  } catch {}
  return { count: 0, firstAt: 0 };
}

function writeAttempts(state: { count: number; firstAt: number }): void {
  try {
    sessionStorage.setItem(RELOAD_KEY, JSON.stringify(state));
  } catch {}
}

let reloadInFlight = false;

function tryRecover(): boolean {
  if (reloadInFlight) return true;
  const now = Date.now();
  let state = readAttempts();
  if (now - state.firstAt > ATTEMPT_WINDOW_MS) {
    state = { count: 0, firstAt: now };
  }
  if (state.count >= MAX_ATTEMPTS) {
    return false;
  }
  reloadInFlight = true;
  writeAttempts({ count: state.count + 1, firstAt: state.firstAt || now });
  setTimeout(() => {
    try {
      window.location.reload();
    } catch {
      reloadInFlight = false;
    }
  }, 50);
  return true;
}

export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): ReturnType<typeof lazy<T>> {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      if (isChunkLoadError(err) && tryRecover()) {
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    if (isChunkLoadError(event.error || event.message)) {
      tryRecover();
    }
  });
  window.addEventListener("unhandledrejection", (event) => {
    if (isChunkLoadError(event.reason)) {
      tryRecover();
    }
  });
}
