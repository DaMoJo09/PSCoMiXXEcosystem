import { useState, useCallback } from "react";
import { fxStudioApi } from "@/lib/api";
import { toast } from "sonner";
import type { AssetTag, SyncPayload } from "@/types/asset-tags";

interface UseSyncToCoMiXXOptions {
  defaultTag: AssetTag;
  sourceMode: string;
  projectId?: string;
}

export function useSyncToCoMiXX({ defaultTag, sourceMode, projectId }: UseSyncToCoMiXXOptions) {
  const [isSyncing, setIsSyncing] = useState(false);

  const syncAsset = useCallback(async (payload: {
    name: string;
    dataUrl: string;
    tag?: AssetTag;
    targetPage?: number;
    layers?: any[];
    canvasBackground?: string;
    metadata?: Record<string, any>;
  }) => {
    setIsSyncing(true);
    try {
      const syncData: SyncPayload = {
        name: payload.name,
        asset_tag: payload.tag || defaultTag,
        preview_data_url: payload.dataUrl,
        target_page: payload.targetPage,
        project_id: projectId,
        source_mode: sourceMode,
        layers: payload.layers,
        canvas_background: payload.canvasBackground,
        metadata: payload.metadata,
      };

      const result = await fxStudioApi.pushTaggedAsset(syncData);
      toast.success(`Synced "${payload.name}" to CoMiXX as ${syncData.asset_tag}`);
      return result;
    } catch (err: any) {
      toast.error(err.message || "Failed to sync to CoMiXX");
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [defaultTag, sourceMode, projectId]);

  return { syncAsset, isSyncing };
}
