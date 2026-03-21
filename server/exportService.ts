import { storage } from "./storage";

interface LayerData {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation: number;
  opacity: number;
  zIndex: number;
  visible: boolean;
  locked: boolean;
  blendMode: string;
  asset?: {
    id: string;
    url: string;
    mimeType: string;
    dimensions: { width: number; height: number };
    fileSize?: number;
  };
  content?: Record<string, any>;
  effect?: Record<string, any>;
}

interface SceneExport {
  format: string;
  project: {
    id: string;
    title: string;
    type: string;
    version: number;
    createdAt: string;
    updatedAt: string;
    dimensions: { width: number; height: number; dpi: number; unit: string };
  };
  pages: Array<{
    index: number;
    id: string;
    layers: LayerData[];
    panels: Array<{
      id: string;
      bounds: { x: number; y: number; width: number; height: number };
      gutterWidth: number;
    }>;
  }>;
  effects: Array<{
    id: string;
    type: string;
    name: string;
    scope: string;
    params: Record<string, any>;
  }>;
  assets: Array<{
    id: string;
    type: string;
    filename: string;
    url: string;
    mimeType: string;
    dimensions?: { width: number; height: number };
    fileSize?: number;
    tags?: string[];
  }>;
  metadata: {
    exportedAt: string;
    exportFormat: string;
    version: string;
    creator: { id: string; name: string; profileUrl: string };
    engine: { name: string; version: string; url: string };
  };
}

interface TimelineExport {
  format: string;
  project: {
    id: string;
    title: string;
    type: string;
    fps: number;
    duration: number;
    dimensions: { width: number; height: number };
  };
  tracks: Array<{
    id: string;
    type: string;
    name: string;
    clips: Array<{
      id: string;
      startFrame: number;
      endFrame: number;
      startTime: number;
      endTime: number;
      layer?: string;
      asset?: Record<string, any>;
      effect?: Record<string, any>;
      volume?: number;
    }>;
  }>;
  keyframes: Array<{
    layerId: string;
    property: string;
    frames: Array<{
      frame: number;
      value: number;
      easing: string;
    }>;
  }>;
  assets: Array<Record<string, any>>;
  metadata: {
    exportedAt: string;
    exportFormat: string;
    version: string;
  };
}

export async function exportProjectAsScene(projectId: string): Promise<SceneExport | null> {
  const project = await storage.getProject(projectId);
  if (!project) return null;

  const user = await storage.getUser(project.userId);
  const projectData = (project.data as any) || {};

  const pages: SceneExport["pages"] = [];
  const allAssets: SceneExport["assets"] = [];
  const allEffects: SceneExport["effects"] = [];

  const spreads = projectData.spreads || projectData.pages || [];
  spreads.forEach((spread: any, index: number) => {
    const layers: LayerData[] = [];

    if (spread.panels) {
      spread.panels.forEach((panel: any, pIdx: number) => {
        if (panel.imageUrl) {
          const layerId = `layer-panel-${index}-${pIdx}`;
          layers.push({
            id: layerId,
            type: "image",
            name: `Panel ${pIdx + 1}`,
            position: { x: panel.x || 0, y: panel.y || 0 },
            size: { width: panel.width || 400, height: panel.height || 400 },
            rotation: 0,
            opacity: 1.0,
            zIndex: pIdx,
            visible: true,
            locked: false,
            blendMode: "normal",
            asset: {
              id: `asset-panel-${index}-${pIdx}`,
              url: panel.imageUrl,
              mimeType: "image/png",
              dimensions: { width: panel.width || 400, height: panel.height || 400 },
            },
          });
          allAssets.push({
            id: `asset-panel-${index}-${pIdx}`,
            type: "image",
            filename: `panel-${index}-${pIdx}.png`,
            url: panel.imageUrl,
            mimeType: "image/png",
            dimensions: { width: panel.width || 400, height: panel.height || 400 },
          });
        }

        if (panel.textElements) {
          panel.textElements.forEach((te: any, tIdx: number) => {
            layers.push({
              id: `layer-text-${index}-${pIdx}-${tIdx}`,
              type: "text",
              name: `Text ${tIdx + 1}`,
              position: { x: te.x || 0, y: te.y || 0 },
              size: { width: te.width || 200, height: te.height || 100 },
              rotation: te.rotation || 0,
              opacity: 1.0,
              zIndex: 100 + tIdx,
              visible: true,
              locked: false,
              blendMode: "normal",
              content: {
                text: te.text || "",
                font: te.fontFamily || "Bangers",
                fontSize: te.fontSize || 16,
                color: te.color || "#000000",
                alignment: te.textAlign || "center",
                bubbleType: te.bubbleType,
              },
            });
          });
        }

        if (panel.drawingData) {
          layers.push({
            id: `layer-drawing-${index}-${pIdx}`,
            type: "drawing",
            name: `Drawing Layer`,
            position: { x: panel.x || 0, y: panel.y || 0 },
            size: { width: panel.width || 400, height: panel.height || 400 },
            rotation: 0,
            opacity: 1.0,
            zIndex: 50,
            visible: true,
            locked: false,
            blendMode: "normal",
            content: { drawingData: panel.drawingData },
          });
        }
      });
    }

    if (spread.effects) {
      spread.effects.forEach((fx: any, fIdx: number) => {
        allEffects.push({
          id: `effect-${index}-${fIdx}`,
          type: fx.type || "filter",
          name: fx.name || "Unknown",
          scope: "page",
          params: fx.params || fx,
        });
      });
    }

    const panelBounds = (spread.panels || []).map((p: any, pIdx: number) => ({
      id: `panel-${index}-${pIdx}`,
      bounds: {
        x: p.x || 0,
        y: p.y || 0,
        width: p.width || 400,
        height: p.height || 400,
      },
      gutterWidth: spread.gutterWidth || 10,
    }));

    pages.push({
      index,
      id: `page-${index}`,
      layers,
      panels: panelBounds,
    });
  });

  const profileUrl = user?.username
    ? `https://pressstart.space/creator/${user.username}`
    : `https://pressstart.space/portfolio/${user?.id || "unknown"}`;

  return {
    format: "pscomixx-scene-v1",
    project: {
      id: project.id,
      title: project.title,
      type: project.type,
      version: 1,
      createdAt: project.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: project.updatedAt?.toISOString() || new Date().toISOString(),
      dimensions: {
        width: projectData.canvasWidth || 2480,
        height: projectData.canvasHeight || 3508,
        dpi: 300,
        unit: "px",
      },
    },
    pages,
    effects: allEffects,
    assets: allAssets,
    metadata: {
      exportedAt: new Date().toISOString(),
      exportFormat: "scene-json",
      version: "1.0",
      creator: {
        id: user?.id || "unknown",
        name: user?.name || "Unknown",
        profileUrl,
      },
      engine: {
        name: "PSCoMiXX",
        version: "1.0.0",
        url: "https://pressstart.space",
      },
    },
  };
}

export async function exportProjectAsTimeline(projectId: string): Promise<TimelineExport | null> {
  const project = await storage.getProject(projectId);
  if (!project) return null;

  const projectData = (project.data as any) || {};
  const fps = projectData.fps || 24;
  const frames = projectData.frames || [];
  const totalFrames = frames.length || 0;
  const duration = totalFrames > 0 ? (totalFrames / fps) * 1000 : 0;

  const tracks: TimelineExport["tracks"] = [];
  const keyframes: TimelineExport["keyframes"] = [];

  const videoTrack: any = {
    id: "track-video-01",
    type: "video",
    name: "Main Video",
    clips: [],
  };

  if (projectData.layers) {
    projectData.layers.forEach((layer: any, idx: number) => {
      videoTrack.clips.push({
        id: `clip-layer-${idx}`,
        startFrame: 0,
        endFrame: totalFrames || 1,
        startTime: 0,
        endTime: duration,
        layer: layer.id || `layer-${idx}`,
      });

      if (layer.keyframes) {
        Object.entries(layer.keyframes).forEach(([prop, kfData]: [string, any]) => {
          const kfFrames = Array.isArray(kfData) ? kfData : [];
          keyframes.push({
            layerId: layer.id || `layer-${idx}`,
            property: prop,
            frames: kfFrames.map((kf: any) => ({
              frame: kf.frame || 0,
              value: kf.value || 0,
              easing: kf.easing || "linear",
            })),
          });
        });
      }
    });
  }

  tracks.push(videoTrack);

  if (projectData.audioClips) {
    const audioTrack: any = {
      id: "track-audio-01",
      type: "audio",
      name: "Audio",
      clips: projectData.audioClips.map((clip: any, idx: number) => ({
        id: `clip-audio-${idx}`,
        startFrame: clip.startFrame || 0,
        endFrame: clip.endFrame || totalFrames,
        startTime: clip.startTime || 0,
        endTime: clip.endTime || duration,
        asset: {
          id: `asset-audio-${idx}`,
          url: clip.url || "",
          mimeType: clip.mimeType || "audio/mpeg",
          duration: clip.duration || duration,
        },
        volume: clip.volume || 1.0,
      })),
    };
    tracks.push(audioTrack);
  }

  if (projectData.effectsTrack) {
    const fxTrack: any = {
      id: "track-effects-01",
      type: "effects",
      name: "FX Track",
      clips: projectData.effectsTrack.map((fx: any, idx: number) => ({
        id: `clip-fx-${idx}`,
        startFrame: fx.startFrame || 0,
        endFrame: fx.endFrame || totalFrames,
        effect: {
          type: fx.type || "shake",
          params: fx.params || {},
        },
      })),
    };
    tracks.push(fxTrack);
  }

  return {
    format: "pscomixx-timeline-v1",
    project: {
      id: project.id,
      title: project.title,
      type: project.type,
      fps,
      duration,
      dimensions: {
        width: projectData.canvasWidth || 1920,
        height: projectData.canvasHeight || 1080,
      },
    },
    tracks,
    keyframes,
    assets: [],
    metadata: {
      exportedAt: new Date().toISOString(),
      exportFormat: "timeline-json",
      version: "1.0",
    },
  };
}

export async function getProjectExportData(
  projectId: string,
  format: string
): Promise<any> {
  switch (format) {
    case "scene-json":
      return exportProjectAsScene(projectId);
    case "timeline-json":
      return exportProjectAsTimeline(projectId);
    default:
      return exportProjectAsScene(projectId);
  }
}
