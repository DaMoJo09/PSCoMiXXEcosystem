import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { apiRequest } from "@/lib/queryClient";

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
  sortOrder?: number;
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
  isLoading: boolean;
  addAsset: (asset: Omit<Asset, "id" | "createdAt">) => Promise<Asset | null>;
  addAssets: (assets: Omit<Asset, "id" | "createdAt">[]) => Promise<Asset[]>;
  removeAsset: (id: string) => Promise<void>;
  updateAsset: (id: string, updates: Partial<Asset>) => Promise<void>;
  reorderAssets: (assetIds: string[]) => Promise<void>;
  addFolder: (name: string, parentId?: string) => AssetFolder;
  removeFolder: (id: string) => void;
  setSelectedFolder: (id: string | null) => void;
  getAssetsInFolder: (folderId: string | null) => Asset[];
  importFromFile: (file: File, folderId?: string) => Promise<Asset | null>;
  importFromFiles: (files: File[], folderId?: string) => Promise<Asset[]>;
  exportAsset: (id: string) => void;
  copyAssetToProject: (assetId: string, projectId: string) => void;
  refreshAssets: () => Promise<void>;
}

const AssetLibraryContext = createContext<AssetLibraryContextType | null>(null);

const DEFAULT_FOLDERS: AssetFolder[] = [
  { id: "sprites", name: "Sprites", createdAt: new Date() },
  { id: "backgrounds", name: "Backgrounds", createdAt: new Date() },
  { id: "characters", name: "Characters", createdAt: new Date() },
  { id: "effects", name: "Effects", createdAt: new Date() },
  { id: "bubbles", name: "Speech Bubbles", createdAt: new Date() },
];

export function AssetLibraryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [folders, setFolders] = useState<AssetFolder[]>(DEFAULT_FOLDERS);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshAssets = useCallback(async () => {
    if (!user) {
      setAssets([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/assets", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setAssets(data.map((a: any) => ({
          ...a,
          createdAt: new Date(a.createdAt),
        })));
      }
    } catch (error) {
      console.error("Failed to fetch assets:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshAssets();
  }, [refreshAssets]);

  const addAsset = useCallback(async (assetData: Omit<Asset, "id" | "createdAt">): Promise<Asset | null> => {
    if (!user) return null;

    try {
      const response = await apiRequest("POST", "/api/assets", {
        filename: assetData.name,
        type: assetData.type,
        url: assetData.url,
        thumbnail: assetData.thumbnail,
        projectId: assetData.projectId,
        folderId: assetData.folderId,
        sortOrder: assetData.sortOrder || 0,
        metadata: assetData.bubbleData ? { bubbleData: assetData.bubbleData, tags: assetData.tags } : { tags: assetData.tags },
      });

      const newAsset = await response.json();
      const mappedAsset: Asset = {
        id: newAsset.id,
        name: newAsset.filename,
        type: newAsset.type,
        url: newAsset.url,
        thumbnail: newAsset.thumbnail,
        createdAt: new Date(newAsset.createdAt),
        projectId: newAsset.projectId,
        folderId: newAsset.folderId,
        sortOrder: newAsset.sortOrder,
        tags: newAsset.metadata?.tags,
        bubbleData: newAsset.metadata?.bubbleData,
      };

      setAssets(prev => [...prev, mappedAsset]);
      return mappedAsset;
    } catch (error) {
      console.error("Failed to add asset:", error);
      return null;
    }
  }, [user]);

  const addAssets = useCallback(async (assetDataList: Omit<Asset, "id" | "createdAt">[]): Promise<Asset[]> => {
    if (!user || assetDataList.length === 0) return [];

    try {
      const response = await apiRequest("POST", "/api/assets/bulk", {
        assets: assetDataList.map(assetData => ({
          filename: assetData.name,
          type: assetData.type,
          url: assetData.url,
          thumbnail: assetData.thumbnail,
          projectId: assetData.projectId,
          folderId: assetData.folderId,
          sortOrder: assetData.sortOrder || 0,
          metadata: assetData.bubbleData ? { bubbleData: assetData.bubbleData, tags: assetData.tags } : { tags: assetData.tags },
        })),
      });

      const newAssets = await response.json();
      const mappedAssets: Asset[] = newAssets.map((a: any) => ({
        id: a.id,
        name: a.filename,
        type: a.type,
        url: a.url,
        thumbnail: a.thumbnail,
        createdAt: new Date(a.createdAt),
        projectId: a.projectId,
        folderId: a.folderId,
        sortOrder: a.sortOrder,
        tags: a.metadata?.tags,
        bubbleData: a.metadata?.bubbleData,
      }));

      setAssets(prev => [...prev, ...mappedAssets]);
      return mappedAssets;
    } catch (error) {
      console.error("Failed to add assets:", error);
      return [];
    }
  }, [user]);

  const removeAsset = useCallback(async (id: string) => {
    try {
      await apiRequest("DELETE", `/api/assets/${id}`);
      setAssets(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error("Failed to remove asset:", error);
    }
  }, []);

  const updateAsset = useCallback(async (id: string, updates: Partial<Asset>) => {
    try {
      await apiRequest("PATCH", `/api/assets/${id}`, {
        folderId: updates.folderId,
        sortOrder: updates.sortOrder,
        filename: updates.name,
      });
      setAssets(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    } catch (error) {
      console.error("Failed to update asset:", error);
    }
  }, []);

  const reorderAssets = useCallback(async (assetIds: string[]) => {
    try {
      await apiRequest("POST", "/api/assets/reorder", { assetIds });
      setAssets(prev => {
        const updated = [...prev];
        assetIds.forEach((id, index) => {
          const asset = updated.find(a => a.id === id);
          if (asset) asset.sortOrder = index;
        });
        return updated;
      });
    } catch (error) {
      console.error("Failed to reorder assets:", error);
    }
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
    return assets
      .filter(a => a.folderId === folderId)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [assets]);

  const importFromFile = useCallback(async (file: File, folderId?: string): Promise<Asset | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const url = e.target?.result as string;
        const type = file.type.startsWith("image/") ? "image" : 
                     file.type.startsWith("video/") ? "video" : 
                     file.type.startsWith("audio/") ? "audio" : "image";
        
        const asset = await addAsset({
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

  const importFromFiles = useCallback(async (files: File[], folderId?: string): Promise<Asset[]> => {
    const fileDataPromises = files.map((file) => {
      return new Promise<Omit<Asset, "id" | "createdAt"> | null>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const url = e.target?.result as string;
          const type = file.type.startsWith("image/") ? "image" : 
                       file.type.startsWith("video/") ? "video" : 
                       file.type.startsWith("audio/") ? "audio" : "image";
          resolve({
            name: file.name,
            type: type as Asset["type"],
            url,
            folderId,
            tags: [],
          });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    });

    const assetDataList = (await Promise.all(fileDataPromises)).filter((a): a is Omit<Asset, "id" | "createdAt"> => a !== null);
    return addAssets(assetDataList);
  }, [addAssets]);

  const exportAsset = useCallback((id: string) => {
    const asset = assets.find(a => a.id === id);
    if (!asset) return;
    
    const link = document.createElement("a");
    link.href = asset.url;
    link.download = asset.name;
    link.click();
  }, [assets]);

  const copyAssetToProject = useCallback(async (assetId: string, projectId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;
    
    await addAsset({
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
        isLoading,
        addAsset,
        addAssets,
        removeAsset,
        updateAsset,
        reorderAssets,
        addFolder,
        removeFolder,
        setSelectedFolder: setSelectedFolderId,
        getAssetsInFolder,
        importFromFile,
        importFromFiles,
        exportAsset,
        copyAssetToProject,
        refreshAssets,
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
