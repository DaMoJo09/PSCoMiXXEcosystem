import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { fxStudioApi } from "@/lib/api";

const FX_STUDIO_BASE = "https://www.pscomixx.online";
const ALLOWED_ORIGINS = [
  "https://pscomixx.online",
  "https://www.pscomixx.online",
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

export interface FxReturnPayload {
  effectId: string;
  projectId: string;
  panelId: string | null;
  previewUrl: string | null;
  assetTag: string;
  name: string;
  type: string;
  mode_hints: Record<string, unknown> | null;
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
  const studioWindowRef = useRef<Window | null>(null);
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

      const { type, payload } = event.data || {};

      switch (type) {
        case "fx-studio-ready":
        case "fx-studio-pong":
          setConnected(true);
          break;

        case "panel-fx-return":
          if (payload && optionsRef.current.onAssetReturned) {
            optionsRef.current.onAssetReturned(payload);
          }
          if (optionsRef.current.onAssetsUpdated) {
            optionsRef.current.onAssetsUpdated();
          }
          toast.success(`Asset received: ${payload?.name || "FX Asset"}`);
          break;

        case "asset-export":
          if (payload && optionsRef.current.onAssetExported) {
            optionsRef.current.onAssetExported(payload);
          }
          if (optionsRef.current.onAssetsUpdated) {
            optionsRef.current.onAssetsUpdated();
          }
          toast.success(`Asset exported: ${payload?.name || "FX Asset"}`);
          break;

        case "fx-studio-closed":
          setIsOpen(false);
          setConnected(false);
          studioWindowRef.current = null;
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
    for (const origin of ALLOWED_ORIGINS) {
      try {
        win.postMessage({ type: "comixx-ping" }, origin);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      pollRef.current = setInterval(() => {
        const win = studioWindowRef.current;
        if (win?.closed) {
          setIsOpen(false);
          setConnected(false);
          studioWindowRef.current = null;
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
    setIsOpen(true);
    setConnected(false);
  }, []);

  const sendToFxStudio = useCallback((data: Record<string, unknown>) => {
    if (studioWindowRef.current && !studioWindowRef.current.closed) {
      for (const origin of ALLOWED_ORIGINS) {
        try {
          studioWindowRef.current.postMessage(
            { type: "comixx-panel-data", payload: data },
            origin
          );
        } catch {}
      }
    }
  }, []);

  const closeFxStudio = useCallback(() => {
    if (studioWindowRef.current && !studioWindowRef.current.closed) {
      studioWindowRef.current.close();
    }
    setIsOpen(false);
    setConnected(false);
    studioWindowRef.current = null;
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
    openFxStudio,
    sendToFxStudio,
    closeFxStudio,
    checkApiConnection,
  };
}
