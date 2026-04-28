import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { fxStudioApi } from "@/lib/api";

const FX_STUDIO_BASE = "https://www.pscomixx.online";
const ALLOWED_ORIGINS = [
  "https://pscomixx.online",
  "https://www.pscomixx.online",
  "https://pscomixx.com",
  "https://www.pscomixx.com",
  "https://panel-play-forge.lovable.app",
];

const FX_MODES: Record<string, string> = {
  fx: "",
  character: "/character",
  portrait: "/portrait",
  graffiti: "/graffiti",
  bgfx: "/bgfx",
  filter: "/filter",
  cover: "/cover",
  layout: "/layout",
  overlay: "/overlay",
  "price-tag": "/price-tag",
  title: "/title",
  bubble: "/bubble",
  script: "/script",
  hops: "/hops",
};

export type FxTarget = 
  | { type: "cover" }
  | { type: "backCover" }
  | { type: "priceTag" }
  | { type: "panel"; panelId: string; spreadIndex: number; page: "left" | "right" }
  | null;

export interface FxReturnPayload {
  effectId: string;
  projectId: string;
  panelId: string | null;
  previewUrl: string | null;
  assetTag: string;
  name: string;
  type: string;
  mode_hints: Record<string, unknown> | null;
  target?: FxTarget;
}

interface UseFxStudioOptions {
  projectId?: string;
  onAssetReturned?: (payload: FxReturnPayload) => void;
  onAssetExported?: (payload: FxReturnPayload) => void;
  onAssetsUpdated?: () => void;
}

export function useFxStudio(options: UseFxStudioOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [activeTarget, setActiveTarget] = useState<FxTarget>(null);
  const activeTargetRef = useRef<FxTarget>(null);
  activeTargetRef.current = activeTarget;
  const studioWindowRef = useRef<Window | null>(null);
  const studioOriginRef = useRef<string>(FX_STUDIO_BASE);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const clearPing = useCallback(() => {
    if (pingRef.current) {
      clearInterval(pingRef.current);
      pingRef.current = null;
    }
  }, []);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!ALLOWED_ORIGINS.includes(event.origin)) return;
      if (studioWindowRef.current && event.source !== studioWindowRef.current) return;

      const { type, payload } = event.data || {};

      switch (type) {
        case "fx-studio-ready":
        case "fx-studio-pong":
          studioOriginRef.current = event.origin;
          // ADOPT-ON-HANDSHAKE: only adopt the source window when FX Studio
          // explicitly identifies itself with the "ready" / "pong" handshake.
          // Adopting on any inbound message would let any allowed-origin
          // page spoof itself as FX Studio and inject panel-fx-return /
          // asset-export payloads into the comic. The handshake messages are
          // produced only by the actual FX Studio app boot/ping handler.
          if (!studioWindowRef.current && event.source) {
            try {
              studioWindowRef.current = event.source as Window;
              setIsOpen(true);
            } catch {}
          }
          setConnected(true);
          break;

        case "panel-fx-return": {
          // Defense-in-depth: require an established handshake (a tracked
          // studio window) before accepting any return payload. Without
          // this, any allowed-origin page could forge a panel-fx-return
          // and inject an image into the comic. Adoption only happens on
          // the explicit fx-studio-ready / fx-studio-pong handshake.
          if (!studioWindowRef.current || event.source !== studioWindowRef.current) {
            console.warn("[FX] Dropped panel-fx-return — no established FX session");
            break;
          }
          const enriched = { ...payload, target: payload?.target || activeTargetRef.current };
          if (enriched && optionsRef.current.onAssetReturned) {
            optionsRef.current.onAssetReturned(enriched);
          }
          if (optionsRef.current.onAssetsUpdated) {
            optionsRef.current.onAssetsUpdated();
          }
          const targetLabel = enriched?.target?.type === "cover" ? " → Cover"
            : enriched?.target?.type === "backCover" ? " → Back Cover"
            : enriched?.target?.type === "priceTag" ? " → Price Tag"
            : enriched?.target?.type === "panel" ? ` → Panel` : "";
          toast.success(`Asset received: ${payload?.name || "FX Asset"}${targetLabel}`);
          break;
        }

        case "asset-export": {
          if (!studioWindowRef.current || event.source !== studioWindowRef.current) {
            console.warn("[FX] Dropped asset-export — no established FX session");
            break;
          }
          const enrichedExport = { ...payload, target: payload?.target || activeTargetRef.current };
          if (enrichedExport && optionsRef.current.onAssetExported) {
            optionsRef.current.onAssetExported(enrichedExport);
          }
          if (optionsRef.current.onAssetsUpdated) {
            optionsRef.current.onAssetsUpdated();
          }
          toast.success(`Asset exported: ${payload?.name || "FX Asset"}`);
          break;
        }

        case "fx-studio-closed":
          setIsOpen(false);
          setConnected(false);
          studioWindowRef.current = null;
          studioOriginRef.current = FX_STUDIO_BASE;
          clearPing();
          break;
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [clearPing]);

  const sendPing = useCallback(() => {
    const win = studioWindowRef.current;
    if (!win || win.closed) return;
    try {
      win.postMessage({ type: "comixx-ping" }, "*");
    } catch {}
  }, []);

  useEffect(() => {
    if (isOpen) {
      pollRef.current = setInterval(() => {
        const win = studioWindowRef.current;
        if (win?.closed) {
          setIsOpen(false);
          setConnected(false);
          studioWindowRef.current = null;
          studioOriginRef.current = FX_STUDIO_BASE;
          clearPoll();
          clearPing();
          if (optionsRef.current.onAssetsUpdated) {
            optionsRef.current.onAssetsUpdated();
          }
        }
      }, 2000);

      clearPing();
      let pingCount = 0;
      pingRef.current = setInterval(() => {
        sendPing();
        pingCount++;
        if (pingCount > 30) {
          clearPing();
        }
      }, 2000);
    }
    return () => {
      clearPoll();
      clearPing();
    };
  }, [isOpen, sendPing, clearPoll, clearPing]);

  const openFxStudio = useCallback(async ({
    mode,
    effectId,
    panelId,
  }: {
    mode?: string;
    effectId?: string;
    panelId?: string;
  } = {}) => {
    if (studioWindowRef.current && !studioWindowRef.current.closed) {
      studioWindowRef.current.focus();
      return;
    }

    // AI Transparency / consent gate (Apple Guideline 5.1.2(i)). We call
    // the exported bridge which, if consent is not already recorded, opens
    // the global AiConsentModal and resolves only after the user accepts
    // or declines. Blocks FX Studio from opening when gating fails.
    try {
      const { ensureAiConsent } = await import("@/contexts/AiConsentContext");
      const ok = await ensureAiConsent();
      if (!ok) return;
    } catch (err) {
      // If the gate itself errors out, fail closed rather than open —
      // compliance requirement: no AI invocation without verified consent.
      toast.error("Unable to verify AI consent. Please refresh and try again.");
      return;
    }

    const params = new URLSearchParams();
    if (effectId) params.set("import", effectId);
    if (optionsRef.current.projectId) params.set("returnProject", optionsRef.current.projectId);
    if (panelId) params.set("panelId", panelId);

    const modePath = FX_MODES[mode || "fx"] || "";
    const url = `${FX_STUDIO_BASE}${modePath}${params.toString() ? "?" + params.toString() : ""}`;

    const win = window.open(url, "fx-studio");
    if (!win) {
      toast.error("Popup blocked — please allow popups for this site and try again");
      setIsOpen(false);
      setConnected(false);
      return;
    }
    studioWindowRef.current = win;
    studioOriginRef.current = FX_STUDIO_BASE;
    setIsOpen(true);
    setConnected(false);
  }, []);

  const sendToFxStudio = useCallback((data: Record<string, unknown>) => {
    if (studioWindowRef.current && !studioWindowRef.current.closed) {
      const enrichedData = { ...data, target: activeTargetRef.current };
      const origin = studioOriginRef.current || FX_STUDIO_BASE;
      try {
        studioWindowRef.current.postMessage(
          { type: "comixx-panel-data", payload: enrichedData },
          origin
        );
      } catch {}
    }
  }, []);

  const closeFxStudio = useCallback(() => {
    if (studioWindowRef.current && !studioWindowRef.current.closed) {
      studioWindowRef.current.close();
    }
    setIsOpen(false);
    setConnected(false);
    studioWindowRef.current = null;
    studioOriginRef.current = FX_STUDIO_BASE;
    clearPing();
  }, [clearPing]);

  const checkApiConnection = useCallback(async () => {
    try {
      const r = await fxStudioApi.healthCheck();
      return r.status === "ok";
    } catch {
      return false;
    }
  }, []);

  return {
    isOpen,
    connected,
    activeTarget,
    setActiveTarget,
    openFxStudio,
    sendToFxStudio,
    closeFxStudio,
    checkApiConnection,
  };
}
