import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export interface BubbleAssetData {
  shape?: string;
  effectType?: string;
  elements?: any[];
  style?: any;
}

export interface Asset {
  id: string;
  name: string;
  type: "image" | "sprite" | "background" | "audio" | "video" | "bubble" | "effect";
  url: string;
  thumbnail?: string;
  createdAt: Date;
  projectId?: string;
  folderId?: string;
  tags?: string[];
  bubbleData?: BubbleAssetData;
}

export interface AssetFolder {
  id: string;
  name: string;
  parentId?: string;
  createdAt: Date;
}

interface AssetLibraryContextType {
  assets: Asset[];
  folders: AssetFolder[];
  selectedFolderId: string | null;
  addAsset: (asset: Omit<Asset, "id" | "createdAt">) => Asset;
  removeAsset: (id: string) => void;
  updateAsset: (id: string, updates: Partial<Asset>) => void;
  addFolder: (name: string, parentId?: string) => AssetFolder;
  removeFolder: (id: string) => void;
  setSelectedFolder: (id: string | null) => void;
  getAssetsInFolder: (folderId: string | null) => Asset[];
  importFromFile: (file: File, folderId?: string) => Promise<Asset | null>;
  exportAsset: (id: string) => void;
  copyAssetToProject: (assetId: string, projectId: string) => void;
}

const AssetLibraryContext = createContext<AssetLibraryContextType | null>(null);

export function AssetLibraryProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [folders, setFolders] = useState<AssetFolder[]>([
    { id: "sprites", name: "Sprites", createdAt: new Date() },
    { id: "backgrounds", name: "Backgrounds", createdAt: new Date() },
    { id: "characters", name: "Characters", createdAt: new Date() },
    { id: "effects", name: "Effects", createdAt: new Date() },
    { id: "bubbles", name: "Speech Bubbles", createdAt: new Date() },
  ]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const addAsset = useCallback((assetData: Omit<Asset, "id" | "createdAt">): Asset => {
    const newAsset: Asset = {
      ...assetData,
      id: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };
    setAssets(prev => [...prev, newAsset]);
    return newAsset;
  }, []);

  const removeAsset = useCallback((id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
  }, []);

  const updateAsset = useCallback((id: string, updates: Partial<Asset>) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const addFolder = useCallback((name: string, parentId?: string): AssetFolder => {
    const newFolder: AssetFolder = {
      id: `folder_${Date.now()}`,
      name,
      parentId,
      createdAt: new Date(),
    };
    setFolders(prev => [...prev, newFolder]);
    return newFolder;
  }, []);

  const removeFolder = useCallback((id: string) => {
    setFolders(prev => prev.filter(f => f.id !== id));
    setAssets(prev => prev.filter(a => a.folderId !== id));
  }, []);

  const getAssetsInFolder = useCallback((folderId: string | null): Asset[] => {
    return assets.filter(a => a.folderId === folderId);
  }, [assets]);

  const importFromFile = useCallback(async (file: File, folderId?: string): Promise<Asset | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        const type = file.type.startsWith("image/") ? "image" : 
                     file.type.startsWith("video/") ? "video" : 
                     file.type.startsWith("audio/") ? "audio" : "image";
        
        const asset = addAsset({
          name: file.name,
          type: type as Asset["type"],
          url,
          folderId,
          tags: [],
        });
        resolve(asset);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }, [addAsset]);

  const exportAsset = useCallback((id: string) => {
    const asset = assets.find(a => a.id === id);
    if (!asset) return;
    
    const link = document.createElement("a");
    link.href = asset.url;
    link.download = asset.name;
    link.click();
  }, [assets]);

  const copyAssetToProject = useCallback((assetId: string, projectId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;
    
    addAsset({
      ...asset,
      projectId,
      name: `${asset.name} (copy)`,
    });
  }, [assets, addAsset]);

  return (
    <AssetLibraryContext.Provider
      value={{
        assets,
        folders,
        selectedFolderId,
        addAsset,
        removeAsset,
        updateAsset,
        addFolder,
        removeFolder,
        setSelectedFolder: setSelectedFolderId,
        getAssetsInFolder,
        importFromFile,
        exportAsset,
        copyAssetToProject,
      }}
    >
      {children}
    </AssetLibraryContext.Provider>
  );
}

export function useAssetLibrary() {
  const context = useContext(AssetLibraryContext);
  if (!context) {
    throw new Error("useAssetLibrary must be used within AssetLibraryProvider");
  }
  return context;
}
