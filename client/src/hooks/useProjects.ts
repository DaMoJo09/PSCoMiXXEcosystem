import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "@/lib/api";
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
    refetchOnWindowFocus: true,
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
