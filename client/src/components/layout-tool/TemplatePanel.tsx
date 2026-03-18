import { useState, useRef } from "react";
import { Upload, LayoutGrid, Image as ImageIcon } from "lucide-react";
import { PAGE_TEMPLATES } from "@/data/page-templates";

interface TemplatePanelProps {
  currentTemplate: string;
  onApplyTemplate: (templateId: string) => void;
  onDropAsset: (panelId: string, imageUrl: string) => void;
  selectedPanelId: string | null;
}

function TemplateThumbnail({ template, isActive, onClick }: {
  template: typeof PAGE_TEMPLATES[0];
  isActive: boolean;
  onClick: () => void;
}) {
  const { rows, cols, panels } = template;
  return (
    <button
      onClick={onClick}
      className={`w-full aspect-[3/4] border-2 p-1 ${isActive ? "border-cyan-500 bg-cyan-950/30" : "border-zinc-700 hover:border-zinc-500 bg-zinc-800"}`}
      title={template.name}
      data-testid={`template-${template.id}`}
    >
      <div
        className="w-full h-full gap-[2px]"
        style={{
          display: "grid",
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
        }}
      >
        {panels.map((p, i) => (
          <div
            key={i}
            className={`${isActive ? "bg-cyan-700" : "bg-zinc-600"} border border-zinc-500`}
            style={{
              gridRow: `${p.row} / span ${p.rowSpan}`,
              gridColumn: `${p.col} / span ${p.colSpan}`,
            }}
          />
        ))}
      </div>
      <div className="text-[8px] text-zinc-400 mt-1 text-center truncate">{template.name}</div>
    </button>
  );
}

export function TemplatePanel({ currentTemplate, onApplyTemplate, onDropAsset, selectedPanelId }: TemplatePanelProps) {
  const [tab, setTab] = useState<"templates" | "assets">("templates");
  const [uploadedAssets, setUploadedAssets] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedAssets(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleDragStart = (e: React.DragEvent, imageUrl: string) => {
    e.dataTransfer.setData("text/plain", imageUrl);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="w-[220px] border-r border-zinc-800 bg-zinc-900 flex flex-col shrink-0 overflow-hidden" data-testid="template-panel">
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setTab("templates")}
          className={`flex-1 text-[10px] font-bold py-2 ${tab === "templates" ? "text-cyan-400 border-b-2 border-cyan-500" : "text-zinc-500 hover:text-zinc-300"}`}
          data-testid="tab-templates"
        >
          <LayoutGrid className="w-3 h-3 inline mr-1" />TEMPLATES
        </button>
        <button
          onClick={() => setTab("assets")}
          className={`flex-1 text-[10px] font-bold py-2 ${tab === "assets" ? "text-cyan-400 border-b-2 border-cyan-500" : "text-zinc-500 hover:text-zinc-300"}`}
          data-testid="tab-assets"
        >
          <ImageIcon className="w-3 h-3 inline mr-1" />ASSETS
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {tab === "templates" ? (
          <div className="grid grid-cols-2 gap-2">
            {PAGE_TEMPLATES.map(t => (
              <TemplateThumbnail
                key={t.id}
                template={t}
                isActive={currentTemplate === t.id}
                onClick={() => onApplyTemplate(t.id)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-1 text-[10px] font-bold text-cyan-400 py-2 border border-dashed border-zinc-600 hover:border-cyan-500"
              data-testid="button-upload-asset"
            >
              <Upload className="w-3 h-3" /> UPLOAD IMAGES
            </button>
            {!selectedPanelId && (
              <p className="text-[9px] text-zinc-500 text-center">Select a panel, then drag an image onto it</p>
            )}
            {uploadedAssets.length === 0 && (
              <p className="text-[9px] text-zinc-500 text-center mt-4">No assets uploaded yet</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {uploadedAssets.map((url, i) => (
                <div
                  key={i}
                  draggable
                  onDragStart={(e) => handleDragStart(e, url)}
                  className="aspect-square border border-zinc-700 cursor-grab hover:border-cyan-500 overflow-hidden bg-zinc-800"
                  data-testid={`asset-thumb-${i}`}
                >
                  <img src={url} alt={`Asset ${i}`} className="w-full h-full object-cover" draggable={false} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
