import { useCallback } from "react";
import { toast } from "sonner";

// FX Studio is hosted externally at pscomixx.online (separate Lovable repo).
// Mirror the constant from useFxStudio so the two launch paths agree on
// where FX Studio actually lives.
const FX_STUDIO_BASE = "https://www.pscomixx.online";

export interface HandoffContext {
  projectId?: string;
  assetIds?: string[];
  layerMetadata?: Record<string, unknown>;
  effectTarget?: string;
  contentType?: string;
  assignmentId?: string;
  lessonId?: string;
  starterAssets?: string[];
  templateType?: string;
  rubricMetadata?: Record<string, unknown>;
  portfolioFlag?: boolean;
  metadata?: Record<string, unknown>;
}

export interface HandoffResult {
  ticketToken: string;
  targetApp: string;
  targetUrl: string | null;
  expiresAt: string;
  schoolSafeActive: boolean;
}

export function useHandoff() {
  const prepareHandoff = useCallback(async (targetApp: string, context: HandoffContext): Promise<HandoffResult | null> => {
    try {
      const res = await fetch("/api/handoff/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetApp, context }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Handoff failed" }));
        toast.error(err.error || "Failed to prepare handoff");
        return null;
      }
      return await res.json();
    } catch {
      toast.error("Network error preparing handoff");
      return null;
    }
  }, []);

  const launchFxStudio = useCallback(async (context: HandoffContext) => {
    // FX Studio is hosted at FX_STUDIO_BASE (separate app). Open it in a
    // NEW TAB so the current page (e.g. ComicCreator) stays mounted —
    // otherwise the parent's `useFxStudio` message listener is destroyed
    // and any "panel-fx-return" postMessage from FX Studio has nowhere to
    // land, which is why effects/covers/price-tags weren't coming back
    // and XP wasn't crediting. If popups are blocked, fall back to the
    // in-app launcher page so the user is never stranded.
    const result = await prepareHandoff("fxstudio", context);
    const params = new URLSearchParams();
    if (result?.ticketToken) params.set("ticket", result.ticketToken);
    if (context.projectId) params.set("returnProject", context.projectId);
    if (context.contentType) params.set("contentType", context.contentType);
    if (context.assetIds?.length) params.set("import", context.assetIds.join(","));
    const qs = params.toString();
    const externalUrl = `${FX_STUDIO_BASE}${qs ? `?${qs}` : ""}`;

    // Try popup first. We use a named target so a second click reuses the
    // same FX tab instead of stacking up windows.
    const win = window.open(externalUrl, "fx-studio");
    if (!win) {
      // Popup blocked. We deliberately do NOT navigate the comic away to
      // /fx-studio — that would unmount ComicCreator and re-create the
      // exact bug this fix addresses (return messages have nowhere to land,
      // kid loses their place). Instead, prompt the user to enable popups
      // and re-click. The browser remembers the user gesture for the retry.
      toast.error(
        "Popup blocked. Allow popups for this site, then click Send to FX again.",
        { duration: 8000 }
      );
    }

    if (result?.schoolSafeActive) {
      toast.info("School-safe mode active for this session");
    }
    return result || undefined;
  }, [prepareHandoff]);

  const launchStreaming = useCallback(async (context: HandoffContext) => {
    const result = await prepareHandoff("streaming", {
      ...context,
      portfolioFlag: true,
    });
    if (!result) return;
    if (!result.targetUrl) {
      toast.error("PS Streaming isn't connected yet. Please try again later.");
      return;
    }
    window.open(result.targetUrl, "_blank", "noopener");
    toast.success("Content sent to PS Streaming");
    return result;
  }, [prepareHandoff]);

  const launchLms = useCallback(async (context: HandoffContext) => {
    const result = await prepareHandoff("lms", context);
    if (!result) return;
    if (!result.targetUrl) {
      toast.error("Press Start LMS isn't connected yet. Please try again later.");
      return;
    }
    window.open(result.targetUrl, "_blank", "noopener");
    return result;
  }, [prepareHandoff]);

  const consumeHandoff = useCallback(async (ticketToken: string) => {
    try {
      const res = await fetch("/api/handoff/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ticketToken }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  return { prepareHandoff, launchFxStudio, launchStreaming, launchLms, consumeHandoff };
}
