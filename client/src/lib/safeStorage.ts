import { toast } from "sonner";

type Kind = "session" | "local";

function store(kind: Kind): Storage | null {
  try {
    return kind === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

function isQuotaError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { name?: string; code?: number; message?: string };
  return (
    e.name === "QuotaExceededError" ||
    e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    e.code === 22 ||
    e.code === 1014 ||
    /quota/i.test(e.message || "")
  );
}

function approxBytes(value: string): number {
  return value.length * 2;
}

function pruneByPrefix(s: Storage, prefix: string, keep: number): number {
  const matches: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const k = s.key(i);
    if (k && k.startsWith(prefix)) matches.push(k);
  }
  let removed = 0;
  for (let i = 0; i < matches.length - keep; i++) {
    try {
      s.removeItem(matches[i]);
      removed++;
    } catch {}
  }
  return removed;
}

export interface SafeSetOptions {
  kind?: Kind;
  toastOnFail?: boolean;
  prunePrefix?: string;
  pruneKeep?: number;
  maxBytes?: number;
}

export function safeSet(
  key: string,
  value: string,
  opts: SafeSetOptions = {},
): boolean {
  const kind: Kind = opts.kind ?? "session";
  const s = store(kind);
  if (!s) return false;

  if (opts.maxBytes && approxBytes(value) > opts.maxBytes) {
    if (opts.toastOnFail !== false) {
      toast.error("That payload is too large to cache locally.", {
        description: `~${(approxBytes(value) / 1024 / 1024).toFixed(1)} MB exceeds the local cache limit.`,
      });
    }
    return false;
  }

  try {
    s.setItem(key, value);
    return true;
  } catch (err) {
    if (!isQuotaError(err)) {
      try {
        console.warn("[safeStorage] setItem failed:", err);
      } catch {}
      return false;
    }
  }

  if (opts.prunePrefix) {
    pruneByPrefix(s, opts.prunePrefix, opts.pruneKeep ?? 1);
    try {
      s.setItem(key, value);
      return true;
    } catch {}
  }

  try {
    s.removeItem(key);
    s.setItem(key, value);
    return true;
  } catch {}

  if (opts.toastOnFail !== false) {
    toast.error("Browser storage is full.", {
      description:
        "Couldn't save the handoff payload — try closing other tabs or clearing site data.",
    });
  }
  return false;
}

export function safeGet(key: string, kind: Kind = "session"): string | null {
  const s = store(kind);
  if (!s) return null;
  try {
    return s.getItem(key);
  } catch {
    return null;
  }
}

export function safeRemove(key: string, kind: Kind = "session"): void {
  const s = store(kind);
  if (!s) return;
  try {
    s.removeItem(key);
  } catch {}
}
