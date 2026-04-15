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
          setConnected(true);
          break;

        case "panel-fx-return": {
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
    if (connected && studioOriginRef.current) {
      try {
        win.postMessage({ type: "comixx-ping" }, studioOriginRef.current);
      } catch {}
    } else {
      try {
        win.postMessage({ type: "comixx-ping" }, FX_STUDIO_BASE);
      } catch {}
    }
  }, [connected]);

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

  const openFxStudio = useCallback(({
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
