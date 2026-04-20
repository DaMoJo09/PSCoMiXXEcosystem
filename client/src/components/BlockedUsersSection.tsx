import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ban, UserX, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { blocksApi } from "@/lib/api";

export function BlockedUsersSection() {
  const qc = useQueryClient();

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ["/api/users/me/blocks"],
    queryFn: () => blocksApi.getBlocks(),
  });

  const unblock = useMutation({
    mutationFn: (userId: string) => blocksApi.unblockUser(userId),
    onSuccess: () => {
      toast.success("User unblocked");
      qc.invalidateQueries({ queryKey: ["/api/users/me/blocks"] });
      qc.invalidateQueries({ queryKey: ["/api/social/feed"] });
      qc.invalidateQueries({ queryKey: ["/api/social/explore"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to unblock"),
  });

  return (
    <section className="p-6 bg-zinc-900 border-4 border-zinc-700" data-testid="section-blocked-users">
      <div className="flex items-center gap-3 mb-4">
        <Ban className="w-5 h-5 text-red-400" />
        <h2 className="font-black uppercase text-lg text-white">Blocked Users</h2>
      </div>
      <p className="text-sm text-zinc-400 mb-5">
        Blocked users can't see your posts, comment on your work, or appear in your feed.
        You can unblock them at any time.
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : blocks.length === 0 ? (
        <p className="text-zinc-500 text-sm font-mono" data-testid="text-no-blocks">
          You haven't blocked anyone.
        </p>
      ) : (
        <ul className="space-y-2">
          {blocks.map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between gap-4 p-3 bg-black border-2 border-zinc-800"
              data-testid={`row-block-${b.blockedId}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-sm">
                  {b.user?.avatar ? (
                    <img src={b.user.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-zinc-400">{(b.user?.name || "?").charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-white font-bold truncate" data-testid={`text-block-name-${b.blockedId}`}>
                    {b.user?.name || "Unknown user"}
                  </div>
                  {b.reason && (
                    <div className="text-zinc-500 text-xs truncate">Reason: {b.reason}</div>
                  )}
                </div>
              </div>
              <button
                onClick={() => unblock.mutate(b.blockedId)}
                disabled={unblock.isPending}
                className="px-3 py-1.5 text-xs font-bold bg-zinc-800 border-2 border-zinc-700 text-white hover:bg-zinc-700 disabled:opacity-50 whitespace-nowrap flex items-center gap-1"
                data-testid={`button-unblock-${b.blockedId}`}
              >
                <UserX className="w-3 h-3" /> UNBLOCK
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
