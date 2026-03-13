import { useRef, useState } from "react";
import { Camera, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface ThumbnailPickerProps {
  projectId: string;
  currentThumbnail?: string | null;
  onSuccess?: () => void;
  className?: string;
}

export function ThumbnailPicker({ projectId, currentThumbnail, onSuccess, className = "" }: ThumbnailPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!preview) return;
    setIsUploading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate-thumbnail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ thumbnail: preview }),
      });
      if (res.ok) {
        qc.invalidateQueries({ queryKey: ["projects"] });
        qc.invalidateQueries({ queryKey: ["project", projectId] });
        toast.success("Thumbnail updated!");
        setIsOpen(false);
        setPreview(null);
        onSuccess?.();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to update thumbnail");
      }
    } catch {
      toast.error("Failed to update thumbnail");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAutoCapture = async () => {
    setIsUploading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate-thumbnail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (res.ok) {
        qc.invalidateQueries({ queryKey: ["projects"] });
        qc.invalidateQueries({ queryKey: ["project", projectId] });
        toast.success("Thumbnail auto-generated!");
        setIsOpen(false);
        onSuccess?.();
      } else {
        const err = await res.json();
        toast.error(err.message || "No suitable image found in project");
      }
    } catch {
      toast.error("Failed to auto-generate thumbnail");
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
        className={`p-1.5 bg-black/70 hover:bg-black/90 text-white rounded-sm transition-opacity ${className}`}
        title="Set thumbnail"
        data-testid={`button-set-thumbnail-${projectId}`}
      >
        <Camera className="w-3.5 h-3.5" />
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
      onClick={(e) => { e.stopPropagation(); setIsOpen(false); setPreview(null); }}
      data-testid="thumbnail-picker-overlay"
    >
      <div
        className="bg-zinc-900 border-2 border-zinc-700 w-full max-w-sm mx-4 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-white text-sm">Set Thumbnail</h3>
          <button onClick={() => { setIsOpen(false); setPreview(null); }} className="text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {preview ? (
          <div className="space-y-3">
            <div className="aspect-[4/3] overflow-hidden border border-zinc-700 bg-black">
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="flex-1 px-3 py-2 text-xs font-bold border border-zinc-600 text-zinc-300 hover:bg-zinc-800"
                data-testid="button-thumbnail-change"
              >
                Change
              </button>
              <button
                onClick={handleSave}
                disabled={isUploading}
                className="flex-1 px-3 py-2 text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50"
                data-testid="button-thumbnail-save"
              >
                {isUploading ? "Saving..." : "Save Thumbnail"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {currentThumbnail && (
              <div className="aspect-[4/3] overflow-hidden border border-zinc-700 bg-black mb-2">
                <img src={currentThumbnail} alt="Current" className="w-full h-full object-cover opacity-60" />
                <div className="text-center text-[10px] text-zinc-500 mt-1">Current thumbnail</div>
              </div>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-3 border-2 border-dashed border-zinc-600 hover:border-cyan-500 text-zinc-300 hover:text-white flex items-center justify-center gap-2 transition-colors"
              data-testid="button-thumbnail-upload"
            >
              <Upload className="w-4 h-4" />
              <span className="text-sm font-medium">Upload Image</span>
            </button>

            <button
              onClick={handleAutoCapture}
              disabled={isUploading}
              className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-300 hover:text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              data-testid="button-thumbnail-auto"
            >
              <Camera className="w-4 h-4" />
              {isUploading ? "Scanning..." : "Auto-detect from project"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
              data-testid="input-thumbnail-file"
            />
          </div>
        )}
      </div>
    </div>
  );
}
