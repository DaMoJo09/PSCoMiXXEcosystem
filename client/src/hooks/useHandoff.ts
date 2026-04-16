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
    const result = await prepareHandoff("fxstudio", context);
    if (!result) return;
    const url = result.targetUrl || `https://www.pscomixx.online/handoff?ticket=${result.ticketToken}`;
    window.open(url, "_blank");
    if (result.schoolSafeActive) {
      toast.info("School-safe mode active for this session");
    }
    return result;
  }, [prepareHandoff]);

  const launchStreaming = useCallback(async (context: HandoffContext) => {
    const result = await prepareHandoff("streaming", {
      ...context,
      portfolioFlag: true,
    });
    if (!result) return;
    const url = result.targetUrl || `https://psstreaming.com/handoff?ticket=${result.ticketToken}`;
    window.open(url, "_blank");
    toast.success("Content sent to PS Streaming");
    return result;
  }, [prepareHandoff]);

  const launchLms = useCallback(async (context: HandoffContext) => {
    const result = await prepareHandoff("lms", context);
    if (!result) return;
    const url = result.targetUrl || `https://pressstart.tech/handoff?ticket=${result.ticketToken}`;
    window.open(url, "_blank");
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
