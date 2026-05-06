import { useQuery } from "@tanstack/react-query";

export function useFeatureFlag(key: string): { enabled: boolean; isLoading: boolean } {
  const { data, isLoading } = useQuery<{ enabled: boolean }>({
    queryKey: ["feature-flag", key],
    queryFn: async () => {
      const res = await fetch(`/api/feature-flags/${key}`);
      if (!res.ok) throw new Error("flag fetch failed");
      return res.json();
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  return { enabled: data?.enabled ?? false, isLoading };
}

export type FeatureFlagMap = Record<string, boolean>;

/**
 * Bulk-fetch every feature flag in one request.
 *
 * `isEnabled(key, fallback)` distinguishes three states so the sidebar
 * doesn't either flicker tabs or silently fail-open when the API errors:
 *   - loading: returns the supplied `fallback` (defaults to true) so the
 *     UI doesn't flash empty before the response arrives.
 *   - loaded successfully: returns the real flag value (or false if the
 *     key doesn't exist in the seeded set).
 *   - fetch error: returns false. We deliberately do NOT keep showing
 *     every tab when the server is down — admins rely on these toggles
 *     to actually hide things.
 */
export function useFeatureFlags(): {
  flags: FeatureFlagMap;
  isLoading: boolean;
  isError: boolean;
  isEnabled: (key: string, fallback?: boolean) => boolean;
} {
  const { data, isLoading, isError } = useQuery<FeatureFlagMap>({
    queryKey: ["feature-flags-all"],
    queryFn: async () => {
      const res = await fetch("/api/feature-flags");
      if (!res.ok) throw new Error("bulk feature flag fetch failed");
      return res.json();
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const flags = data ?? {};
  const isEnabled = (key: string, fallback = true) => {
    if (isLoading) return fallback;
    if (isError) return false;
    return flags[key] ?? false;
  };

  return { flags, isLoading, isError, isEnabled };
}
