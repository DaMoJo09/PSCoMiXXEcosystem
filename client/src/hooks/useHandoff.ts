import { useCallback } from "react";
import { toast } from "sonner";

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
    // FX Studio lives inside this same app at /fx-studio — navigate in-app
    // instead of opening an external URL that 404s.
    const result = await prepareHandoff("fxstudio", context);
    const params = new URLSearchParams();
    if (result?.ticketToken) params.set("ticket", result.ticketToken);
    if (context.projectId) params.set("projectId", context.projectId);
    if (context.contentType) params.set("contentType", context.contentType);
    if (context.assetIds?.length) params.set("assetIds", context.assetIds.join(","));
    const qs = params.toString();
    window.location.assign(qs ? `/fx-studio?${qs}` : "/fx-studio");
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
