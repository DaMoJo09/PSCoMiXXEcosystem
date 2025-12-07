import { useRef, forwardRef, useImperativeHandle } from "react";
import { TextElement } from "./TextElement";

export interface TransformState {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface UnifiedElement {
  id: string;
  type: "image" | "text" | "bubble" | "drawing" | "shape" | "video" | "gif";
  transform: TransformState;
  data: {
    url?: string;
    text?: string;
    bubbleStyle?: "none" | "speech" | "thought" | "shout" | "whisper";
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    drawingData?: string;
    vectorData?: any[];
    videoUrl?: string;
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
    backgroundColor?: string;
  };
  zIndex: number;
  locked: boolean;
  visible?: boolean;
}

export interface UnifiedPanel {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  type: "rectangle" | "circle";
  contents: UnifiedElement[];
  zIndex: number;
  locked: boolean;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

interface UnifiedRendererProps {
  panels: UnifiedPanel[];
  width: number;
  height: number;
  isPreview?: boolean;
  scale?: number;
  backgroundColor?: string;
  onPanelClick?: (panelId: string) => void;
  onContentClick?: (panelId: string, contentId: string) => void;
  className?: string;
}

export interface UnifiedRendererRef {
  exportToCanvas: () => Promise<HTMLCanvasElement | null>;
  exportToDataUrl: (format?: string, quality?: number) => Promise<string | null>;
}

export const UnifiedRenderer = forwardRef<UnifiedRendererRef, UnifiedRendererProps>(({
  panels,
  width,
  height,
  isPreview = false,
  scale = 1,
  backgroundColor = "#ffffff",
  onPanelClick,
  onContentClick,
  className = "",
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    exportToCanvas: async () => {
      if (!containerRef.current) return null;
      
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);

      for (const panel of panels.sort((a, b) => a.zIndex - b.zIndex)) {
        const panelX = (panel.x / 100) * width;
        const panelY = (panel.y / 100) * height;
        const panelW = (panel.width / 100) * width;
        const panelH = (panel.height / 100) * height;

        ctx.save();
        ctx.translate(panelX + panelW / 2, panelY + panelH / 2);
        ctx.rotate((panel.rotation * Math.PI) / 180);
        ctx.translate(-panelW / 2, -panelH / 2);

        if (panel.type === "circle") {
          ctx.beginPath();
          ctx.ellipse(panelW / 2, panelH / 2, panelW / 2, panelH / 2, 0, 0, Math.PI * 2);
          ctx.clip();
        }

        ctx.fillStyle = panel.backgroundColor || "#ffffff";
        ctx.fillRect(0, 0, panelW, panelH);

        if (panel.borderWidth && panel.borderColor) {
          ctx.strokeStyle = panel.borderColor;
          ctx.lineWidth = panel.borderWidth;
          ctx.strokeRect(0, 0, panelW, panelH);
        }

        for (const content of panel.contents.sort((a, b) => a.zIndex - b.zIndex)) {
          if (content.visible === false) continue;
          await renderContentToCanvas(ctx, content, panelW, panelH);
        }

        ctx.restore();
      }

      return canvas;
    },

    exportToDataUrl: async (format = "image/png", quality = 1) => {
      const canvas = await (ref as any).current?.exportToCanvas();
      if (!canvas) return null;
      return canvas.toDataURL(format, quality);
    },
  }));

  const renderContentToCanvas = async (
    ctx: CanvasRenderingContext2D,
    content: UnifiedElement,
    containerWidth: number,
    containerHeight: number
  ) => {
    const { transform, data, type } = content;
    const x = transform.x;
    const y = transform.y;
    const w = transform.width;
    const h = transform.height;

    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    ctx.scale(transform.scaleX, transform.scaleY);
    ctx.translate(-w / 2, -h / 2);

    if (type === "image" && data.url) {
      try {
        const img = await loadImage(data.url);
        ctx.drawImage(img, 0, 0, w, h);
      } catch (e) {
        ctx.fillStyle = "#cccccc";
        ctx.fillRect(0, 0, w, h);
      }
    } else if (type === "drawing" && data.drawingData) {
      try {
        const img = await loadImage(data.drawingData);
        ctx.drawImage(img, 0, 0, w, h);
      } catch (e) {}
    } else if ((type === "text" || type === "bubble") && data.text) {
      ctx.fillStyle = data.backgroundColor || "transparent";
      if (data.bubbleStyle === "speech" || data.bubbleStyle === "thought") {
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        
        if (data.bubbleStyle === "thought") {
          ctx.beginPath();
          ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(0, 0, w, h);
          ctx.strokeRect(0, 0, w, h);
        }
      }
      
      ctx.fillStyle = data.color || "#000000";
      ctx.font = `${data.fontSize || 16}px ${data.fontFamily || "Inter, sans-serif"}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      const lines = wrapText(ctx, data.text, w - 16);
      const lineHeight = (data.fontSize || 16) * 1.4;
      const startY = h / 2 - ((lines.length - 1) * lineHeight) / 2;
      
      lines.forEach((line, i) => {
        ctx.fillText(line, w / 2, startY + i * lineHeight);
      });
    } else if (type === "video" && data.videoUrl) {
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#ffffff";
      ctx.font = "14px Inter";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("[Video]", w / 2, h / 2);
    }

    ctx.restore();
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  const renderElement = (content: UnifiedElement, panelId: string) => {
    const { id, type, transform, data, zIndex, visible } = content;
    
    if (visible === false) return null;

    const style: React.CSSProperties = {
      position: "absolute",
      left: transform.x,
      top: transform.y,
      width: transform.width,
      height: transform.height,
      transform: `rotate(${transform.rotation}deg) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`,
      zIndex,
      pointerEvents: isPreview ? "none" : "auto",
    };

    const handleClick = (e: React.MouseEvent) => {
      if (!isPreview) {
        e.stopPropagation();
        onContentClick?.(panelId, id);
      }
    };

    if (type === "image" && data.url) {
      return (
        <div key={id} style={style} onClick={handleClick} className="overflow-hidden">
          <img 
            src={data.url} 
            alt="" 
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>
      );
    }

    if (type === "drawing" && data.drawingData) {
      return (
        <div key={id} style={style} onClick={handleClick} className="overflow-hidden">
          <img 
            src={data.drawingData} 
            alt="" 
            className="w-full h-full object-contain"
            draggable={false}
          />
        </div>
      );
    }

    if (type === "video" && data.videoUrl) {
      return (
        <div key={id} style={style} onClick={handleClick} className="overflow-hidden bg-black">
          <video
            src={data.videoUrl}
            autoPlay={isPreview ? data.autoplay !== false : false}
            loop={data.loop !== false}
            muted={data.muted !== false}
            playsInline
            controls={isPreview}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    if (type === "gif" && data.url) {
      return (
        <div key={id} style={style} onClick={handleClick} className="overflow-hidden">
          <img 
            src={data.url} 
            alt="" 
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>
      );
    }

    if (type === "text" || type === "bubble") {
      return (
        <div key={id} style={style} onClick={handleClick}>
          <TextElement
            id={id}
            text={data.text || ""}
            fontSize={data.fontSize}
            fontFamily={data.fontFamily}
            color={data.color}
            backgroundColor={data.backgroundColor}
            bubbleStyle={data.bubbleStyle}
            isEditing={false}
          />
        </div>
      );
    }

    return null;
  };

  const renderPanel = (panel: UnifiedPanel) => {
    const panelStyle: React.CSSProperties = {
      position: "absolute",
      left: `${panel.x}%`,
      top: `${panel.y}%`,
      width: `${panel.width}%`,
      height: `${panel.height}%`,
      transform: `rotate(${panel.rotation}deg)`,
      backgroundColor: panel.backgroundColor || "#ffffff",
      border: panel.borderWidth ? `${panel.borderWidth}px solid ${panel.borderColor || "#000000"}` : "3px solid #000000",
      borderRadius: panel.type === "circle" ? "50%" : 0,
      overflow: "hidden",
      zIndex: panel.zIndex,
    };

    return (
      <div
        key={panel.id}
        style={panelStyle}
        onClick={(e) => {
          if (!isPreview) {
            e.stopPropagation();
            onPanelClick?.(panel.id);
          }
        }}
        className={isPreview ? "" : "cursor-pointer hover:shadow-lg transition-shadow"}
      >
        {panel.contents
          .slice()
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((content) => renderElement(content, panel.id))}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        width: width * scale,
        height: height * scale,
        backgroundColor,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      }}
    >
      {panels
        .slice()
        .sort((a, b) => a.zIndex - b.zIndex)
        .map(renderPanel)}
    </div>
  );
});

UnifiedRenderer.displayName = "UnifiedRenderer";

export function convertPanelContentToUnifiedElement(content: any): UnifiedElement {
  return {
    id: content.id,
    type: content.type,
    transform: {
      x: content.transform?.x ?? 0,
      y: content.transform?.y ?? 0,
      width: content.transform?.width ?? 200,
      height: content.transform?.height ?? 200,
      rotation: content.transform?.rotation ?? 0,
      scaleX: content.transform?.scaleX ?? 1,
      scaleY: content.transform?.scaleY ?? 1,
    },
    data: {
      url: content.data?.url,
      text: content.data?.text,
      bubbleStyle: content.data?.bubbleStyle || "none",
      color: content.data?.color || "#000000",
      fontSize: content.data?.fontSize || 16,
      fontFamily: content.data?.fontFamily || "Inter, sans-serif",
      drawingData: content.data?.drawingData,
      vectorData: content.data?.vectorData,
      videoUrl: content.data?.videoUrl,
      autoplay: content.data?.autoplay,
      loop: content.data?.loop,
      muted: content.data?.muted,
      backgroundColor: content.data?.backgroundColor,
    },
    zIndex: content.zIndex ?? 0,
    locked: content.locked ?? false,
    visible: content.visible !== false,
  };
}

export function convertPanelToUnifiedPanel(panel: any): UnifiedPanel {
  return {
    id: panel.id,
    x: panel.x ?? 0,
    y: panel.y ?? 0,
    width: panel.width ?? 100,
    height: panel.height ?? 100,
    rotation: panel.rotation ?? 0,
    type: panel.type || "rectangle",
    contents: (panel.contents || []).map(convertPanelContentToUnifiedElement),
    zIndex: panel.zIndex ?? 0,
    locked: panel.locked ?? false,
    backgroundColor: panel.backgroundColor,
    borderColor: panel.borderColor,
    borderWidth: panel.borderWidth,
  };
}

export async function exportPageToPng(
  panels: UnifiedPanel[],
  width: number,
  height: number,
  backgroundColor: string = "#ffffff"
): Promise<string | null> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  for (const panel of panels.sort((a, b) => a.zIndex - b.zIndex)) {
    const panelX = (panel.x / 100) * width;
    const panelY = (panel.y / 100) * height;
    const panelW = (panel.width / 100) * width;
    const panelH = (panel.height / 100) * height;

    ctx.save();
    
    if (panel.type === "circle") {
      ctx.beginPath();
      ctx.ellipse(
        panelX + panelW / 2,
        panelY + panelH / 2,
        panelW / 2,
        panelH / 2,
        0, 0, Math.PI * 2
      );
      ctx.clip();
    }

    ctx.fillStyle = panel.backgroundColor || "#ffffff";
    ctx.fillRect(panelX, panelY, panelW, panelH);

    ctx.strokeStyle = panel.borderColor || "#000000";
    ctx.lineWidth = panel.borderWidth || 3;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    for (const content of panel.contents.sort((a, b) => a.zIndex - b.zIndex)) {
      if (content.visible === false) continue;

      const { transform, data, type } = content;
      const contentX = panelX + transform.x;
      const contentY = panelY + transform.y;
      const contentW = transform.width;
      const contentH = transform.height;

      ctx.save();
      ctx.translate(contentX + contentW / 2, contentY + contentH / 2);
      ctx.rotate((transform.rotation * Math.PI) / 180);
      ctx.scale(transform.scaleX, transform.scaleY);
      ctx.translate(-contentW / 2, -contentH / 2);

      if ((type === "image" || type === "gif") && data.url) {
        try {
          const img = await loadImage(data.url);
          ctx.drawImage(img, 0, 0, contentW, contentH);
        } catch (e) {
          ctx.fillStyle = "#cccccc";
          ctx.fillRect(0, 0, contentW, contentH);
        }
      } else if (type === "drawing" && data.drawingData) {
        try {
          const img = await loadImage(data.drawingData);
          ctx.drawImage(img, 0, 0, contentW, contentH);
        } catch (e) {}
      } else if ((type === "text" || type === "bubble") && data.text) {
        if (data.bubbleStyle !== "none") {
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 2;
          
          if (data.bubbleStyle === "thought") {
            ctx.beginPath();
            ctx.ellipse(contentW / 2, contentH / 2, contentW / 2, contentH / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          } else {
            ctx.fillRect(0, 0, contentW, contentH);
            ctx.strokeRect(0, 0, contentW, contentH);
          }
        }
        
        ctx.fillStyle = data.color || "#000000";
        ctx.font = `${data.fontSize || 16}px ${(data.fontFamily || "Inter").replace(/'/g, "")}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(data.text, contentW / 2, contentH / 2);
      }

      ctx.restore();
    }

    ctx.restore();
  }

  return canvas.toDataURL("image/png");
}

export async function exportSpreadsToPdf(
  spreads: { leftPage: UnifiedPanel[]; rightPage: UnifiedPanel[] }[],
  pageWidth: number,
  pageHeight: number
): Promise<Blob | null> {
  const pages: string[] = [];

  for (const spread of spreads) {
    const leftPng = await exportPageToPng(spread.leftPage, pageWidth, pageHeight);
    const rightPng = await exportPageToPng(spread.rightPage, pageWidth, pageHeight);
    if (leftPng) pages.push(leftPng);
    if (rightPng) pages.push(rightPng);
  }

  return null;
}
