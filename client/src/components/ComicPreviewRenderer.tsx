import { useMemo } from "react";

interface PanelContent {
  id: string;
  type: string;
  transform: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    scaleX?: number;
    scaleY?: number;
  };
  data: {
    url?: string;
    text?: string;
    bubbleStyle?: string;
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    backgroundColor?: string;
    drawingData?: string;
  };
  zIndex: number;
}

interface Panel {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  type: "rectangle" | "circle";
  contents: PanelContent[];
  zIndex: number;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

interface Spread {
  id: string;
  leftPage: Panel[];
  rightPage: Panel[];
}

interface ComicPreviewRendererProps {
  data: any;
  maxWidth?: number;
  maxHeight?: number;
  className?: string;
}

function PagePreview({ panels, width, height }: { panels: Panel[]; width: number; height: number }) {
  if (!panels || panels.length === 0) return null;

  const scale = width / 650;

  return (
    <div
      className="relative bg-white overflow-hidden"
      style={{ width, height, border: "2px solid #333" }}
      data-testid="comic-page-preview"
    >
      {panels.sort((a, b) => a.zIndex - b.zIndex).map((panel) => {
        const panelX = (panel.x / 100) * width;
        const panelY = (panel.y / 100) * height;
        const panelW = (panel.width / 100) * width;
        const panelH = (panel.height / 100) * height;

        return (
          <div
            key={panel.id}
            className="absolute overflow-hidden"
            style={{
              left: panelX,
              top: panelY,
              width: panelW,
              height: panelH,
              backgroundColor: panel.backgroundColor || "#ffffff",
              border: `${panel.borderWidth || 2}px solid ${panel.borderColor || "#000000"}`,
              borderRadius: panel.type === "circle" ? "50%" : 0,
              transform: panel.rotation ? `rotate(${panel.rotation}deg)` : undefined,
            }}
          >
            {panel.contents?.sort((a, b) => a.zIndex - b.zIndex).map((content) => {
              const { transform, data, type } = content;
              const cX = transform.x * scale;
              const cY = transform.y * scale;
              const cW = transform.width * scale;
              const cH = transform.height * scale;

              return (
                <div
                  key={content.id}
                  className="absolute"
                  style={{
                    left: cX,
                    top: cY,
                    width: cW,
                    height: cH,
                    transform: `rotate(${transform.rotation || 0}deg) scaleX(${transform.scaleX || 1}) scaleY(${transform.scaleY || 1})`,
                  }}
                >
                  {(type === "image" || type === "gif") && data.url && (
                    <img
                      src={data.url}
                      alt=""
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                    />
                  )}
                  {type === "drawing" && data.drawingData && (
                    <img
                      src={data.drawingData}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  )}
                  {(type === "text" || type === "bubble") && data.text && (
                    <div
                      className="w-full h-full flex items-center justify-center overflow-hidden"
                      style={{
                        backgroundColor: data.bubbleStyle && data.bubbleStyle !== "none"
                          ? (data.backgroundColor || "#ffffff")
                          : "transparent",
                        border: data.bubbleStyle && data.bubbleStyle !== "none"
                          ? "2px solid #000"
                          : "none",
                        borderRadius: data.bubbleStyle === "thought" ? "50%" : data.bubbleStyle === "shout" ? "4px" : "8px",
                        padding: "4px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: Math.max(8, (data.fontSize || 14) * scale),
                          fontFamily: data.fontFamily || "inherit",
                          color: data.color || "#000000",
                          textAlign: "center",
                          wordBreak: "break-word",
                          lineHeight: 1.2,
                        }}
                      >
                        {data.text}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function ComicPreviewRenderer({ data, maxWidth = 500, maxHeight = 600, className = "" }: ComicPreviewRendererProps) {
  const spreads: Spread[] = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data.spreads)) return data.spreads;
    if (data.data && Array.isArray(data.data.spreads)) return data.data.spreads;
    if (Array.isArray(data)) return data;
    return [];
  }, [data]);

  if (spreads.length === 0) {
    return (
      <div className={`flex items-center justify-center text-zinc-500 py-8 ${className}`}>
        No pages to preview
      </div>
    );
  }

  const pageAspect = 920 / 650;
  const pageWidth = Math.min(maxWidth / 2, 220);
  const pageHeight = pageWidth * pageAspect;

  return (
    <div className={`space-y-4 ${className}`} data-testid="comic-preview-renderer">
      {spreads.map((spread, idx) => (
        <div key={spread.id || idx}>
          <div className="text-xs text-zinc-400 mb-1 font-bold">
            Spread {idx + 1}
          </div>
          <div className="flex gap-1 justify-center">
            {spread.leftPage && spread.leftPage.length > 0 && (
              <PagePreview panels={spread.leftPage} width={pageWidth} height={pageHeight} />
            )}
            {spread.rightPage && spread.rightPage.length > 0 && (
              <PagePreview panels={spread.rightPage} width={pageWidth} height={pageHeight} />
            )}
            {(!spread.leftPage || spread.leftPage.length === 0) && (!spread.rightPage || spread.rightPage.length === 0) && (
              <div
                className="bg-zinc-800 border-2 border-dashed border-zinc-600 flex items-center justify-center text-zinc-500 text-xs"
                style={{ width: pageWidth, height: pageHeight }}
              >
                Empty page
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
