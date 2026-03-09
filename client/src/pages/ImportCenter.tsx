import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useLocation } from "wouter";
import JSZip from "jszip";
import { 
  Download, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  Trash2, 
  FolderOpen,
  Upload,
  Image,
  Film,
  Layers,
  AlertTriangle,
  FileArchive,
  Images,
  FileJson,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";

const sourceApps = ["iClone", "CharacterCreator", "CartoonAnimator", "ComfyUI", "Unknown"];
const exportTypes = ["render", "image", "image_sequence", "video", "asset_pack"];
const targetModes = ["library_card", "cover", "comic", "cyoa", "visual_novel"];
const assetRoles = ["character", "background", "panel", "overlay", "cutscene", "prop"];

type ImportFormat = "cbz" | "images" | "json";

interface PreviewData {
  format: ImportFormat;
  title: string;
  images: string[];
  projectData?: any;
  fileName: string;
}

function isImageFile(name: string): boolean {
  const ext = name.toLowerCase().split(".").pop() || "";
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext);
}

function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ImportCenter() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"file-import" | "incoming" | "imported" | "failed">("file-import");
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [newImport, setNewImport] = useState({
    bundleName: "",
    sourceApp: "ComfyUI",
    exportType: "image",
    targetMode: "comic",
    assetName: "",
    assetRole: "character",
  });

  const [isDragOver, setIsDragOver] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [projectTitle, setProjectTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: imports = [] } = useQuery({
    queryKey: ["/api/imports"],
    queryFn: async () => {
      const res = await fetch("/api/imports", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createImportMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create import");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/imports"] });
      setIsImportDialogOpen(false);
      toast.success("Asset added to import queue");
    },
  });

  const updateImportMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/imports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update import");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/imports"] });
    },
  });

  const deleteImportMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/imports/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete import");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/imports"] });
      toast.success("Import deleted");
    },
  });

  const fileImportMutation = useMutation({
    mutationFn: async (data: { format: string; images?: string[]; projectData?: any; title: string }) => {
      const res = await fetch("/api/imports/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to import");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setPreview(null);
      setProjectTitle("");
      toast.success(`Created project "${data.project.title}" with ${data.importedCount} item(s)`);
      navigate(`/creator/comic?id=${data.project.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const processCBZ = useCallback(async (file: File) => {
    setIsProcessing(true);
    setImportProgress(0);
    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      const imageFiles = Object.keys(contents.files)
        .filter((name) => !contents.files[name].dir && isImageFile(name))
        .sort(naturalSort);

      if (imageFiles.length === 0) {
        toast.error("The archive doesn't contain any image files");
        return;
      }

      const images: string[] = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const blob = await contents.files[imageFiles[i]].async("blob");
        const ext = imageFiles[i].toLowerCase().split(".").pop() || "png";
        const mimeType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : ext === "webp" ? "image/webp" : `image/${ext}`;
        const typedBlob = new Blob([blob], { type: mimeType });
        const dataUrl = await fileToDataUrl(typedBlob);
        images.push(dataUrl);
        setImportProgress(Math.round(((i + 1) / imageFiles.length) * 100));
      }

      const baseName = file.name.replace(/\.(cbz|cbr|zip)$/i, "");
      setPreview({ format: "cbz", title: baseName, images, fileName: file.name });
      setProjectTitle(baseName);
    } catch (err: any) {
      toast.error(err.message || "Failed to read archive");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const processImageSequence = useCallback(async (files: FileList | File[]) => {
    setIsProcessing(true);
    setImportProgress(0);
    try {
      const imageFiles = Array.from(files)
        .filter((f) => isImageFile(f.name))
        .sort((a, b) => naturalSort(a.name, b.name));

      if (imageFiles.length === 0) {
        toast.error("No valid image files selected");
        return;
      }

      const images: string[] = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const dataUrl = await fileToDataUrl(imageFiles[i]);
        images.push(dataUrl);
        setImportProgress(Math.round(((i + 1) / imageFiles.length) * 100));
      }

      setPreview({ format: "images", title: "Image Sequence", images, fileName: `${imageFiles.length} images` });
      setProjectTitle("Image Sequence Comic");
    } catch (err: any) {
      toast.error(err.message || "Failed to process images");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const processJSON = useCallback(async (file: File) => {
    setIsProcessing(true);
    setImportProgress(50);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const baseName = file.name.replace(/\.(json|cyoa|psdcf)$/i, "");
      setPreview({ format: "json", title: data.title || baseName, images: [], projectData: data, fileName: file.name });
      setProjectTitle(data.title || baseName);
      setImportProgress(100);
    } catch (err: any) {
      toast.error(err.message || "Invalid JSON file");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    const firstFile = fileList[0];
    const ext = firstFile.name.toLowerCase().split(".").pop() || "";

    if (["cbz", "cbr", "zip"].includes(ext)) {
      await processCBZ(firstFile);
    } else if (["json", "cyoa", "psdcf"].includes(ext)) {
      await processJSON(firstFile);
    } else if (isImageFile(firstFile.name)) {
      await processImageSequence(fileList);
    } else {
      toast.error(`File type .${ext} is not supported. Use CBZ, ZIP, images, or JSON files.`);
    }
  }, [processCBZ, processJSON, processImageSequence]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleConfirmImport = () => {
    if (!preview) return;
    if (preview.format === "json") {
      fileImportMutation.mutate({
        format: "json",
        projectData: preview.projectData,
        title: projectTitle || preview.title,
      });
    } else {
      fileImportMutation.mutate({
        format: preview.format,
        images: preview.images,
        title: projectTitle || preview.title,
      });
    }
  };

  const pendingImports = imports.filter((i: any) => i.status === "pending");
  const importedAssets = imports.filter((i: any) => i.status === "imported");
  const failedImports = imports.filter((i: any) => i.status === "failed");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="w-4 h-4 text-yellow-400" />;
      case "imported": return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case "failed": return <XCircle className="w-4 h-4 text-red-400" />;
      default: return null;
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "ComfyUI": return <Layers className="w-4 h-4" />;
      case "iClone": return <Film className="w-4 h-4" />;
      default: return <Image className="w-4 h-4" />;
    }
  };

  const tabs = [
    { id: "file-import" as const, label: "File Import", icon: Upload, count: null },
    { id: "incoming" as const, label: "Incoming", icon: Clock, count: pendingImports.length },
    { id: "imported" as const, label: "Imported", icon: CheckCircle, count: importedAssets.length },
    { id: "failed" as const, label: "Failed", icon: XCircle, count: failedImports.length },
  ];

  const renderImportCard = (item: any) => (
    <div key={item.id} className="border border-border bg-card p-4 hover:border-cyan-500/50 transition-colors" data-testid={`import-card-${item.id}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {item.thumbnail ? (
            <img src={item.thumbnail} alt="" className="w-14 h-14 object-cover border border-border" />
          ) : (
            <div className="w-14 h-14 bg-muted border border-border flex items-center justify-center text-muted-foreground">
              {getSourceIcon(item.sourceApp)}
            </div>
          )}
          <div>
            <h3 className="font-bold text-sm">{item.assetName || item.bundleName}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 border border-border bg-muted text-muted-foreground">
                {item.sourceApp}
              </span>
              <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 border border-cyan-500/30 text-cyan-400">
                {item.targetMode}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 font-mono">{item.exportType}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon(item.status)}
          {item.status === "pending" && (
            <>
              <button
                className="p-1.5 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-colors"
                onClick={() => updateImportMutation.mutate({ id: item.id, status: "imported" })}
                title="Import"
                data-testid={`btn-import-${item.id}`}
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                className="p-1.5 border border-red-500/50 text-red-400 hover:bg-red-500 hover:text-black transition-colors"
                onClick={() => deleteImportMutation.mutate(item.id)}
                title="Delete"
                data-testid={`btn-delete-${item.id}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {item.status === "failed" && (
            <button
              className="p-1.5 border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500 hover:text-black transition-colors"
              onClick={() => updateImportMutation.mutate({ id: item.id, status: "pending" })}
              title="Retry"
              data-testid={`btn-retry-${item.id}`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      {item.errorMessage && (
        <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-1.5">
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
          {item.errorMessage}
        </div>
      )}
    </div>
  );

  const renderEmptyState = (icon: React.ReactNode, title: string, desc: string) => (
    <div className="border border-dashed border-border p-12 text-center">
      <div className="text-muted-foreground/30 mb-4 flex justify-center">{icon}</div>
      <h3 className="font-bold text-lg mb-1">{title}</h3>
      <p className="text-muted-foreground text-sm">{desc}</p>
    </div>
  );

  return (
    <Layout>
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }} data-testid="text-import-title">
                IMPORT CENTER
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">Bring in comics, images, and project files</p>
            </div>
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
              <DialogTrigger asChild>
                <button
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm flex items-center gap-2 border border-cyan-500"
                  data-testid="btn-add-import"
                >
                  <Plus className="w-4 h-4" />
                  MANUAL IMPORT
                </button>
              </DialogTrigger>
              <DialogContent className="bg-card border border-border">
                <DialogHeader>
                  <DialogTitle className="font-bold">Add Manual Import</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Bundle Name</Label>
                    <Input
                      value={newImport.bundleName}
                      onChange={(e) => setNewImport({ ...newImport, bundleName: e.target.value })}
                      className="mt-1 bg-background border-border"
                      placeholder="20260107_COMIC_Scene01"
                      data-testid="input-bundle-name"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Asset Name</Label>
                    <Input
                      value={newImport.assetName}
                      onChange={(e) => setNewImport({ ...newImport, assetName: e.target.value })}
                      className="mt-1 bg-background border-border"
                      placeholder="Character Pose A"
                      data-testid="input-asset-name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Source App</Label>
                      <Select value={newImport.sourceApp} onValueChange={(v) => setNewImport({ ...newImport, sourceApp: v })}>
                        <SelectTrigger className="mt-1 bg-background border-border" data-testid="select-source-app">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {sourceApps.map((app) => (
                            <SelectItem key={app} value={app}>{app}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Export Type</Label>
                      <Select value={newImport.exportType} onValueChange={(v) => setNewImport({ ...newImport, exportType: v })}>
                        <SelectTrigger className="mt-1 bg-background border-border" data-testid="select-export-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {exportTypes.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Target Mode</Label>
                      <Select value={newImport.targetMode} onValueChange={(v) => setNewImport({ ...newImport, targetMode: v })}>
                        <SelectTrigger className="mt-1 bg-background border-border" data-testid="select-target-mode">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {targetModes.map((mode) => (
                            <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Asset Role</Label>
                      <Select value={newImport.assetRole} onValueChange={(v) => setNewImport({ ...newImport, assetRole: v })}>
                        <SelectTrigger className="mt-1 bg-background border-border" data-testid="select-asset-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {assetRoles.map((role) => (
                            <SelectItem key={role} value={role}>{role}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <button
                    className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm border border-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={() => createImportMutation.mutate(newImport)}
                    disabled={!newImport.bundleName || !newImport.assetName}
                    data-testid="btn-submit-import"
                  >
                    ADD TO QUEUE
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Pending", value: pendingImports.length, color: "text-yellow-400" },
              { label: "Imported", value: importedAssets.length, color: "text-emerald-400" },
              { label: "Failed", value: failedImports.length, color: "text-red-400" },
              { label: "Total", value: imports.length, color: "text-foreground" },
            ].map((stat) => (
              <div key={stat.label} className="border border-border bg-card p-4 text-center">
                <div className={`text-2xl font-black ${stat.color}`} data-testid={`text-${stat.label.toLowerCase()}-count`}>{stat.value}</div>
                <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            <div className="flex gap-1 border-b border-border overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                      isActive
                        ? "border-cyan-500 text-cyan-400"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid={`tab-${tab.id}`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {tab.count !== null && tab.count > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.5 font-mono ${
                        isActive ? "bg-cyan-500/20 text-cyan-400" : "bg-muted text-muted-foreground"
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {activeTab === "file-import" && (
              <div className="space-y-6">
                {!preview ? (
                  <>
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative border-2 border-dashed p-12 md:p-16 text-center cursor-pointer transition-all ${
                        isDragOver
                          ? "border-cyan-500 bg-cyan-500/5"
                          : "border-border hover:border-muted-foreground"
                      }`}
                      data-testid="drop-zone"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".cbz,.cbr,.zip,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.json,.cyoa,.psdcf"
                        onChange={(e) => e.target.files && handleFiles(e.target.files)}
                        className="hidden"
                        data-testid="input-file-upload"
                      />
                      {isProcessing ? (
                        <div className="space-y-4">
                          <div className="w-12 h-12 mx-auto border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                          <p className="font-bold text-lg">Processing files...</p>
                          <Progress value={importProgress} className="w-64 mx-auto" />
                          <p className="text-muted-foreground text-sm">{importProgress}% complete</p>
                        </div>
                      ) : (
                        <>
                          <div className="w-16 h-16 mx-auto mb-4 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                            <Upload className="w-8 h-8 text-muted-foreground/50" />
                          </div>
                          <h3 className="font-bold text-xl mb-2">Drop files here or click to browse</h3>
                          <p className="text-muted-foreground mb-6 text-sm">Import comics and project files into your library</p>
                          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <FileArchive className="w-4 h-4 text-blue-400" />
                              <span className="text-xs font-mono">CBZ / ZIP</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Images className="w-4 h-4 text-emerald-400" />
                              <span className="text-xs font-mono">Images</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <FileJson className="w-4 h-4 text-yellow-400" />
                              <span className="text-xs font-mono">JSON / CYOA</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="border border-border bg-card p-5">
                        <FileArchive className="w-7 h-7 text-blue-400 mb-3" />
                        <h4 className="font-bold mb-1 text-sm">CBZ / CBR / ZIP</h4>
                        <p className="text-muted-foreground text-xs leading-relaxed">Comic book archives. Images are extracted and each becomes a comic page.</p>
                      </div>
                      <div className="border border-border bg-card p-5">
                        <Images className="w-7 h-7 text-emerald-400 mb-3" />
                        <h4 className="font-bold mb-1 text-sm">Image Sequence</h4>
                        <p className="text-muted-foreground text-xs leading-relaxed">Select multiple images. They'll be sorted naturally and arranged as comic pages.</p>
                      </div>
                      <div className="border border-border bg-card p-5">
                        <FileJson className="w-7 h-7 text-yellow-400 mb-3" />
                        <h4 className="font-bold mb-1 text-sm">Project Files</h4>
                        <p className="text-muted-foreground text-xs leading-relaxed">Import .cyoa, .psdcf, or JSON project exports to restore saved work.</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="border border-border bg-card">
                    <div className="flex items-center justify-between p-4 border-b border-border">
                      <h3 className="font-bold flex items-center gap-2">
                        <Eye className="w-4 h-4 text-cyan-400" />
                        Import Preview
                      </h3>
                      <button
                        onClick={() => { setPreview(null); setProjectTitle(""); setPreviewIndex(0); }}
                        className="text-muted-foreground hover:text-foreground p-1"
                        data-testid="btn-cancel-preview"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-5 space-y-5">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Format</span>
                          <p className="font-bold text-sm mt-0.5" data-testid="text-preview-format">
                            {preview.format === "cbz" ? "CBZ / ZIP Archive" : preview.format === "images" ? "Image Sequence" : "Project File"}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Source</span>
                          <p className="font-bold text-sm mt-0.5 truncate" data-testid="text-preview-source">{preview.fileName}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                            {preview.format === "json" ? "Type" : "Pages"}
                          </span>
                          <p className="font-bold text-sm mt-0.5" data-testid="text-preview-count">
                            {preview.format === "json"
                              ? preview.projectData?.type || "comic"
                              : `${preview.images.length} page${preview.images.length !== 1 ? "s" : ""}`}
                          </p>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">Project Title</Label>
                        <Input
                          value={projectTitle}
                          onChange={(e) => setProjectTitle(e.target.value)}
                          className="bg-background border-border"
                          placeholder="Enter project title..."
                          data-testid="input-project-title"
                        />
                      </div>

                      {preview.images.length > 0 && (
                        <div className="space-y-3">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Preview</span>
                          <div className="relative bg-muted border border-border overflow-hidden" style={{ minHeight: 280 }}>
                            <img
                              src={preview.images[previewIndex]}
                              alt={`Page ${previewIndex + 1}`}
                              className="max-h-[380px] mx-auto object-contain"
                              data-testid="img-preview"
                            />
                            {preview.images.length > 1 && (
                              <>
                                <button
                                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/60 text-white hover:bg-black/80 disabled:opacity-30"
                                  onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
                                  disabled={previewIndex === 0}
                                  data-testid="btn-preview-prev"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/60 text-white hover:bg-black/80 disabled:opacity-30"
                                  onClick={() => setPreviewIndex(Math.min(preview.images.length - 1, previewIndex + 1))}
                                  disabled={previewIndex === preview.images.length - 1}
                                  data-testid="btn-preview-next"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 px-3 py-1 text-white text-xs font-mono font-bold">
                                  {previewIndex + 1} / {preview.images.length}
                                </div>
                              </>
                            )}
                          </div>
                          {preview.images.length > 1 && (
                            <div className="flex gap-1.5 overflow-x-auto pb-1">
                              {preview.images.map((img, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => setPreviewIndex(idx)}
                                  className={`flex-shrink-0 w-14 h-14 border-2 overflow-hidden transition-all ${
                                    idx === previewIndex ? "border-cyan-500" : "border-border hover:border-muted-foreground"
                                  }`}
                                  data-testid={`btn-thumbnail-${idx}`}
                                >
                                  <img src={img} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {preview.format === "json" && preview.projectData && (
                        <div className="bg-muted border border-border p-4">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-2 block">Project Data</span>
                          <pre className="text-xs overflow-auto max-h-40 font-mono text-muted-foreground">
                            {JSON.stringify(preview.projectData, null, 2).slice(0, 2000)}
                            {JSON.stringify(preview.projectData, null, 2).length > 2000 ? "\n..." : ""}
                          </pre>
                        </div>
                      )}

                      <div className="flex gap-3 pt-2">
                        <button
                          className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm border border-cyan-500 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                          onClick={handleConfirmImport}
                          disabled={fileImportMutation.isPending || !projectTitle.trim()}
                          data-testid="btn-confirm-import"
                        >
                          {fileImportMutation.isPending ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              IMPORTING...
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4" />
                              CREATE PROJECT
                            </>
                          )}
                        </button>
                        <button
                          className="px-6 py-3 border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground font-bold text-sm"
                          onClick={() => { setPreview(null); setProjectTitle(""); setPreviewIndex(0); }}
                          data-testid="btn-cancel-import"
                        >
                          CANCEL
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "incoming" && (
              <div className="space-y-3">
                {pendingImports.length === 0
                  ? renderEmptyState(<FolderOpen className="w-14 h-14" />, "No Pending Imports", "Add imports manually or drop files in the File Import tab")
                  : pendingImports.map(renderImportCard)}
              </div>
            )}

            {activeTab === "imported" && (
              <div className="space-y-3">
                {importedAssets.length === 0
                  ? renderEmptyState(<CheckCircle className="w-14 h-14" />, "No Imported Assets Yet", "Successfully imported assets will appear here")
                  : importedAssets.map(renderImportCard)}
              </div>
            )}

            {activeTab === "failed" && (
              <div className="space-y-3">
                {failedImports.length === 0
                  ? renderEmptyState(<CheckCircle className="w-14 h-14 text-emerald-500/30" />, "No Failed Imports", "All imports processed successfully")
                  : failedImports.map(renderImportCard)}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
