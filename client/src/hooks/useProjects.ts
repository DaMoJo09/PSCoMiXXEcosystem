import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi, ApiError } from "@/lib/api";
import type { Project, InsertProject } from "@shared/schema";

export function useProjects(lightweight = true) {
  return useQuery<Project[]>({
    queryKey: ["projects", lightweight ? "meta" : "full"],
    queryFn: () => projectsApi.getAll(lightweight),
  });
}

export function useProject(id: string) {
  return useQuery<Project>({
    queryKey: ["project", id],
    queryFn: () => projectsApi.getOne(id),
    enabled: !!id,
    // CRITICAL: never refetch the project body on tab focus. The autosave
    // round-trip is the only thing that should mutate it, and a stray refetch
    // overwriting the editor state has caused student work to vanish.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
    // Retry transient failures (5xx, network), but NOT 404/403/401 — those
    // are deterministic and don't get better with retries.
    retry: (failureCount, err) => {
      const status = err instanceof ApiError ? err.status : undefined;
      if (status === 404 || status === 403 || status === 401) return false;
      return failureCount < 3;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });
}

type CreateProjectInput = Omit<InsertProject, "userId"> & { forceNew?: boolean };

export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateProjectInput) => projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<InsertProject, "userId">> }) =>
      projectsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", id] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
