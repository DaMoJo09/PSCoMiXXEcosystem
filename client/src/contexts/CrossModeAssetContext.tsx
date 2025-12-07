import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { UnifiedElement, UnifiedPanel, convertPanelContentToUnifiedElement, convertPanelToUnifiedPanel } from "@/components/tools/UnifiedRenderer";
import { toast } from "sonner";

export interface SharedAsset {
  id: string;
  name: string;
  sourceMode: "comic" | "card" | "vn" | "cyoa" | "cover" | "motion";
  type: "panel" | "element" | "scene" | "character" | "background";
  data: UnifiedPanel | UnifiedElement | any;
  thumbnail?: string;
  createdAt: Date;
}

interface CrossModeAssetContextType {
  sharedAssets: SharedAsset[];
  clipboard: SharedAsset | null;
  
  shareAsset: (asset: Omit<SharedAsset, "id" | "createdAt">) => void;
  removeSharedAsset: (id: string) => void;
  clearSharedAssets: () => void;
  
  copyToClipboard: (asset: Omit<SharedAsset, "id" | "createdAt">) => void;
  pasteFromClipboard: () => SharedAsset | null;
  clearClipboard: () => void;
  
  exportPanelFromComic: (panel: any, name?: string) => void;
  exportElementFromComic: (element: any, name?: string) => void;
  exportSceneFromVN: (scene: any, name?: string) => void;
  exportNodeFromCYOA: (node: any, name?: string) => void;
  
  importPanelToComic: (assetId: string) => UnifiedPanel | null;
  importElementToComic: (assetId: string) => UnifiedElement | null;
  importAsScene: (assetId: string) => any | null;
  importAsNode: (assetId: string) => any | null;
  
  getAssetsByMode: (mode: SharedAsset["sourceMode"]) => SharedAsset[];
  getAssetsByType: (type: SharedAsset["type"]) => SharedAsset[];
}

const CrossModeAssetContext = createContext<CrossModeAssetContextType | null>(null);

export function CrossModeAssetProvider({ children }: { children: ReactNode }) {
  const [sharedAssets, setSharedAssets] = useState<SharedAsset[]>([]);
  const [clipboard, setClipboard] = useState<SharedAsset | null>(null);

  const shareAsset = useCallback((asset: Omit<SharedAsset, "id" | "createdAt">) => {
    const newAsset: SharedAsset = {
      ...asset,
      id: `shared_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };
    setSharedAssets(prev => [...prev, newAsset]);
    toast.success(`${asset.name} added to shared assets`);
    return newAsset;
  }, []);

  const removeSharedAsset = useCallback((id: string) => {
    setSharedAssets(prev => prev.filter(a => a.id !== id));
    toast.success("Asset removed from shared library");
  }, []);

  const clearSharedAssets = useCallback(() => {
    setSharedAssets([]);
    toast.success("Shared assets cleared");
  }, []);

  const copyToClipboard = useCallback((asset: Omit<SharedAsset, "id" | "createdAt">) => {
    const clipboardAsset: SharedAsset = {
      ...asset,
      id: `clip_${Date.now()}`,
      createdAt: new Date(),
    };
    setClipboard(clipboardAsset);
    toast.success(`${asset.name} copied to clipboard`);
  }, []);

  const pasteFromClipboard = useCallback(() => {
    if (clipboard) {
      toast.success(`Pasting ${clipboard.name}`);
    }
    return clipboard;
  }, [clipboard]);

  const clearClipboard = useCallback(() => {
    setClipboard(null);
  }, []);

  const exportPanelFromComic = useCallback((panel: any, name?: string) => {
    const unifiedPanel = convertPanelToUnifiedPanel(panel);
    shareAsset({
      name: name || `Panel ${panel.id.slice(-4)}`,
      sourceMode: "comic",
      type: "panel",
      data: unifiedPanel,
    });
  }, [shareAsset]);

  const exportElementFromComic = useCallback((element: any, name?: string) => {
    const unifiedElement = convertPanelContentToUnifiedElement(element);
    shareAsset({
      name: name || `Element ${element.id.slice(-4)}`,
      sourceMode: "comic",
      type: "element",
      data: unifiedElement,
    });
  }, [shareAsset]);

  const exportSceneFromVN = useCallback((scene: any, name?: string) => {
    shareAsset({
      name: name || scene.title || `Scene ${scene.id.slice(-4)}`,
      sourceMode: "vn",
      type: "scene",
      data: scene,
    });
  }, [shareAsset]);

  const exportNodeFromCYOA = useCallback((node: any, name?: string) => {
    shareAsset({
      name: name || node.title || `Node ${node.id.slice(-4)}`,
      sourceMode: "cyoa",
      type: "scene",
      data: node,
    });
  }, [shareAsset]);

  const importPanelToComic = useCallback((assetId: string): UnifiedPanel | null => {
    const asset = sharedAssets.find(a => a.id === assetId);
    if (!asset) return null;
    
    if (asset.type === "panel") {
      const panel = { ...asset.data } as UnifiedPanel;
      panel.id = `panel_${Date.now()}`;
      panel.contents = panel.contents.map(c => ({
        ...c,
        id: `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      }));
      return panel;
    }
    
    if (asset.type === "scene") {
      const panel: UnifiedPanel = {
        id: `panel_${Date.now()}`,
        x: 10,
        y: 10,
        width: 80,
        height: 80,
        rotation: 0,
        type: "rectangle",
        contents: [],
        zIndex: 0,
        locked: false,
      };
      
      if (asset.data.background) {
        panel.contents.push({
          id: `content_${Date.now()}_bg`,
          type: "image",
          transform: { x: 0, y: 0, width: 500, height: 500, rotation: 0, scaleX: 1, scaleY: 1 },
          data: { url: asset.data.background },
          zIndex: 0,
          locked: false,
        });
      }
      
      return panel;
    }
    
    return null;
  }, [sharedAssets]);

  const importElementToComic = useCallback((assetId: string): UnifiedElement | null => {
    const asset = sharedAssets.find(a => a.id === assetId);
    if (!asset) return null;
    
    if (asset.type === "element") {
      const element = { ...asset.data } as UnifiedElement;
      element.id = `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return element;
    }
    
    if (asset.type === "character" && asset.data.sprites) {
      const spriteUrl = Object.values(asset.data.sprites)[0] as string;
      return {
        id: `content_${Date.now()}`,
        type: "image",
        transform: { x: 100, y: 100, width: 200, height: 300, rotation: 0, scaleX: 1, scaleY: 1 },
        data: { url: spriteUrl },
        zIndex: 0,
        locked: false,
      };
    }
    
    if (asset.type === "background" && asset.data.url) {
      return {
        id: `content_${Date.now()}`,
        type: "image",
        transform: { x: 0, y: 0, width: 500, height: 500, rotation: 0, scaleX: 1, scaleY: 1 },
        data: { url: asset.data.url },
        zIndex: 0,
        locked: false,
      };
    }
    
    return null;
  }, [sharedAssets]);

  const importAsScene = useCallback((assetId: string): any | null => {
    const asset = sharedAssets.find(a => a.id === assetId);
    if (!asset) return null;
    
    if (asset.type === "scene") {
      return {
        ...asset.data,
        id: `scene_${Date.now()}`,
      };
    }
    
    if (asset.type === "panel") {
      const panel = asset.data as UnifiedPanel;
      const imageContent = panel.contents.find(c => c.type === "image");
      return {
        id: `scene_${Date.now()}`,
        title: asset.name,
        background: imageContent?.data.url,
        dialogue: [],
        choices: [],
      };
    }
    
    return null;
  }, [sharedAssets]);

  const importAsNode = useCallback((assetId: string): any | null => {
    const asset = sharedAssets.find(a => a.id === assetId);
    if (!asset) return null;
    
    if (asset.type === "scene") {
      return {
        id: `node_${Date.now()}`,
        title: asset.name,
        content: asset.data.dialogue?.[0]?.text || "",
        x: 100,
        y: 100,
        choices: asset.data.choices || [],
      };
    }
    
    return null;
  }, [sharedAssets]);

  const getAssetsByMode = useCallback((mode: SharedAsset["sourceMode"]) => {
    return sharedAssets.filter(a => a.sourceMode === mode);
  }, [sharedAssets]);

  const getAssetsByType = useCallback((type: SharedAsset["type"]) => {
    return sharedAssets.filter(a => a.type === type);
  }, [sharedAssets]);

  return (
    <CrossModeAssetContext.Provider
      value={{
        sharedAssets,
        clipboard,
        shareAsset,
        removeSharedAsset,
        clearSharedAssets,
        copyToClipboard,
        pasteFromClipboard,
        clearClipboard,
        exportPanelFromComic,
        exportElementFromComic,
        exportSceneFromVN,
        exportNodeFromCYOA,
        importPanelToComic,
        importElementToComic,
        importAsScene,
        importAsNode,
        getAssetsByMode,
        getAssetsByType,
      }}
    >
      {children}
    </CrossModeAssetContext.Provider>
  );
}

export function useCrossModeAssets() {
  const context = useContext(CrossModeAssetContext);
  if (!context) {
    throw new Error("useCrossModeAssets must be used within CrossModeAssetProvider");
  }
  return context;
}
