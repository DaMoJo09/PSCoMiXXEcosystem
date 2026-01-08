import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { announcementsApi, type Announcement } from "@/lib/api";

export function useActiveAnnouncements(featuredOnly?: boolean) {
  return useQuery({
    queryKey: ["announcements", "active", featuredOnly],
    queryFn: () => announcementsApi.getActive(featuredOnly),
    staleTime: 1000 * 60 * 5,
  });
}

export function useAllAnnouncements(featuredOnly?: boolean) {
  return useQuery({
    queryKey: ["announcements", "all", featuredOnly],
    queryFn: () => announcementsApi.getAll(featuredOnly),
  });
}

export function useMyAnnouncements() {
  return useQuery({
    queryKey: ["announcements", "mine"],
    queryFn: () => announcementsApi.getMine(),
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Announcement>) => announcementsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Announcement> }) =>
      announcementsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => announcementsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });
}
