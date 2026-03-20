import { useQuery } from "@tanstack/react-query";

export function useFeatureFlag(key: string): { enabled: boolean; isLoading: boolean } {
  const { data, isLoading } = useQuery<{ enabled: boolean }>({
    queryKey: ["feature-flag", key],
    queryFn: async () => {
      const res = await fetch(`/api/feature-flags/${key}`);
      if (!res.ok) return { enabled: false };
      return res.json();
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  return { enabled: data?.enabled ?? false, isLoading };
}
