import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { syncPendingChanges, getPendingSyncCount } from "@/lib/offlineStorage";

export function NetworkStatusToast() {
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const handleOffline = () => {
      toast.warning("You're offline — changes will be saved locally", {
        id: "network-status",
        duration: 5000,
      });
    };

    const handleOnline = async () => {
      const toastId = "network-status";
      toast.loading("Back online — syncing your changes...", {
        id: toastId,
        duration: Infinity,
      });

      try {
        const pendingCount = await getPendingSyncCount();
        if (pendingCount > 0) {
          const result = await syncPendingChanges();
          if (result.synced > 0 && result.failed === 0) {
            toast.success(`Synced ${result.synced} change${result.synced > 1 ? "s" : ""} successfully`, {
              id: toastId,
              duration: 3000,
            });
          } else if (result.failed > 0) {
            toast.error(`Synced ${result.synced}, failed ${result.failed} — will retry`, {
              id: toastId,
              duration: 4000,
            });
          } else {
            toast.success("Back online", {
              id: toastId,
              duration: 3000,
            });
          }
        } else {
          toast.success("Back online", {
            id: toastId,
            duration: 3000,
          });
        }
      } catch {
        toast.error("Back online — sync failed, will retry shortly", {
          id: toastId,
          duration: 4000,
        });
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return null;
}
