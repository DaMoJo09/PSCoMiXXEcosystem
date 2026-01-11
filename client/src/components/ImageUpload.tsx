import { useRef, useState } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadProps {
  value?: string;
  onChange: (value: string) => void;
  className?: string;
  label?: string;
}

export function ImageUpload({ value, onChange, className = "", label }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File | null) => {
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
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onChange(result);
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileChange(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const clearImage = () => {
    onChange("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className={className}>
      {label && <label className="text-white text-sm font-medium mb-2 block">{label}</label>}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg cursor-pointer transition-all
          ${isDragging ? "border-white bg-white/10" : "border-zinc-600 hover:border-white"}
          ${value ? "p-2" : "p-6"}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
          className="hidden"
          data-testid="image-upload-input"
        />
        
        {value ? (
          <div className="relative">
            <img 
              src={value} 
              alt="Preview" 
              className="max-h-32 mx-auto rounded object-contain"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearImage();
              }}
              className="absolute -top-2 -right-2 p-1 bg-black border border-white rounded-full hover:bg-zinc-800"
              data-testid="image-upload-clear"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ) : (
          <div className="text-center">
            <Upload className="w-8 h-8 mx-auto mb-2 text-zinc-500" />
            <span className="text-sm text-zinc-400">Click or drag to upload</span>
            <span className="text-xs text-zinc-600 block mt-1">PNG, JPG up to 5MB</span>
          </div>
        )}
      </div>
    </div>
  );
}
