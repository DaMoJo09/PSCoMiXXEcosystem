import { useState, useEffect, useCallback } from "react";
import { X, Download } from "lucide-react";

const VISIT_COUNT_KEY = "psc_visit_count";
const DISMISS_KEY = "psc_install_banner_dismissed";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function getVisitCount(): number {
  try {
    return parseInt(localStorage.getItem(VISIT_COUNT_KEY) || "0", 10);
  } catch {
    return 0;
  }
}

function incrementVisitCount(): number {
  const count = getVisitCount() + 1;
  try {
    localStorage.setItem(VISIT_COUNT_KEY, String(count));
  } catch {}
  return count;
}

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = parseInt(raw, 10);
    if (Date.now() - dismissedAt < DISMISS_DURATION_MS) return true;
    localStorage.removeItem(DISMISS_KEY);
    return false;
  } catch {
    return false;
  }
}

function setDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {}
}

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const visits = incrementVisitCount();

    if (visits < 2 || isDismissed()) return;

    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };

    const installedHandler = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === "accepted") {
        setVisible(false);
      }
    } catch {}
    setInstalling(false);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setDismissed();
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="w-full bg-gradient-to-r from-cyan-600 via-fuchsia-600 to-cyan-600 text-white px-4 py-3 flex items-center justify-between gap-3 z-50 shadow-lg animate-in slide-in-from-top duration-300"
      role="banner"
      data-testid="banner-install"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Download className="w-5 h-5 shrink-0" aria-hidden="true" />
        <p className="text-sm font-medium truncate">
          Install Press Start CoMixx for the best experience — works offline!
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstall}
          disabled={installing}
          className="px-4 py-1.5 bg-white text-black text-sm font-bold rounded hover:bg-white/90 transition-colors disabled:opacity-60"
          data-testid="button-install-banner"
        >
          {installing ? "Installing…" : "Install"}
        </button>
        <button
          onClick={handleDismiss}
          className="p-1.5 hover:bg-white/20 rounded transition-colors"
          aria-label="Dismiss install banner"
          data-testid="button-dismiss-install-banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
