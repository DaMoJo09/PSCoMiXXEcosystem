import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

export function UpdatePrompt() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  const handleUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage("skipWaiting");
    }
  }, [waitingWorker]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;

    const trackInstalling = (worker: ServiceWorker) => {
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          setWaitingWorker(worker);
        }
      });
    };

    navigator.serviceWorker.ready.then((reg) => {
      registration = reg;

      if (reg.waiting && navigator.serviceWorker.controller) {
        setWaitingWorker(reg.waiting);
      }

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (newWorker) {
          trackInstalling(newWorker);
        }
      });
    });

    const onControllerChange = () => {
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const interval = setInterval(() => {
      registration?.update().catch(() => {});
    }, 60 * 60 * 1000);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!waitingWorker) return;

    toast("A new version is available", {
      id: "sw-update",
      duration: Infinity,
      action: {
        label: "Update Now",
        onClick: handleUpdate,
      },
    });

    return () => {
      toast.dismiss("sw-update");
    };
  }, [waitingWorker, handleUpdate]);

  return null;
}
