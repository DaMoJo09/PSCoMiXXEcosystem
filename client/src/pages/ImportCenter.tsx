import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
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
  Wifi,
  WifiOff,
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
  Plus
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
  const [activeTab, setActiveTab] = useState("file-import");
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

  const { data: imports = [], isLoading } = useQuery({
    queryKey: ["/api/imports"],
    queryFn: async () => {
      const res = await fetch("/api/imports", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects?fields=meta", { credentials: "include" });
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
      toast({ title: "Import created", description: "Asset added to import queue" });
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
      toast({ title: "Import deleted" });
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
      toast({
        title: "Import successful!",
        description: `Created project "${data.project.title}" with ${data.importedCount} item(s)`,
      });
      navigate(`/comic-creator?project=${data.project.id}`);
    },
    onError: (error: Error) => {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
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
        toast({ title: "No images found", description: "The archive doesn't contain any image files", variant: "destructive" });
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
      toast({ title: "Failed to read archive", description: err.message, variant: "destructive" });
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
        toast({ title: "No images found", description: "No valid image files selected", variant: "destructive" });
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
      toast({ title: "Failed to process images", description: err.message, variant: "destructive" });
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
      toast({ title: "Invalid JSON file", description: err.message, variant: "destructive" });
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
      toast({ title: "Unsupported format", description: `File type .${ext} is not supported. Use CBZ, ZIP, images, or JSON files.`, variant: "destructive" });
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
      case "pending": return <Clock className="w-4 h-4 text-yellow-500" />;
      case "imported": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed": return <XCircle className="w-4 h-4 text-red-500" />;
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

  const renderImportCard = (item: any) => (
    <Card key={item.id} className="bg-black border-2 border-white hover:border-red-500 transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {item.thumbnail ? (
              <img src={item.thumbnail} alt="" className="w-16 h-16 object-cover border-2 border-white" />
            ) : (
              <div className="w-16 h-16 bg-zinc-900 border-2 border-white flex items-center justify-center">
                {getSourceIcon(item.sourceApp)}
              </div>
            )}
            <div>
              <h3 className="font-bold text-white">{item.assetName || item.bundleName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs border-white text-white">
                  {item.sourceApp}
                </Badge>
                <Badge variant="outline" className="text-xs border-red-500 text-red-500">
                  {item.targetMode}
                </Badge>
              </div>
              <p className="text-xs text-zinc-400 mt-1">{item.exportType}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(item.status)}
            {item.status === "pending" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-green-500 text-green-500 hover:bg-green-500 hover:text-black"
                  onClick={() => updateImportMutation.mutate({ id: item.id, status: "imported" })}
                  data-testid={`btn-import-${item.id}`}
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-500 text-red-500 hover:bg-red-500 hover:text-black"
                  onClick={() => deleteImportMutation.mutate(item.id)}
                  data-testid={`btn-delete-${item.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
            {item.status === "failed" && (
              <Button
                size="sm"
                variant="outline"
                className="border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black"
                onClick={() => updateImportMutation.mutate({ id: item.id, status: "pending" })}
                data-testid={`btn-retry-${item.id}`}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        {item.errorMessage && (
          <div className="mt-3 p-2 bg-red-900/30 border border-red-500 text-red-400 text-xs">
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            {item.errorMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex min-h-screen bg-black">
      <AppSidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                IMPORT CENTER
              </h1>
              <p className="text-zinc-400 mt-1">Import CBZ, image sequences, and project files</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 border-2 border-green-500 bg-green-500/10">
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-green-500 font-bold text-sm">CONNECTED</span>
              </div>
              <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-red-600 hover:bg-red-700 text-white border-2 border-white font-bold" data-testid="btn-add-import">
                    <Plus className="w-4 h-4 mr-2" />
                    MANUAL IMPORT
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-black border-2 border-white">
                  <DialogHeader>
                    <DialogTitle className="text-white font-bold">Add Manual Import</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label className="text-white">Bundle Name</Label>
                      <Input
                        value={newImport.bundleName}
                        onChange={(e) => setNewImport({ ...newImport, bundleName: e.target.value })}
                        className="bg-zinc-900 border-white text-white"
                        placeholder="20260107_COMIC_Scene01"
                        data-testid="input-bundle-name"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Asset Name</Label>
                      <Input
                        value={newImport.assetName}
                        onChange={(e) => setNewImport({ ...newImport, assetName: e.target.value })}
                        className="bg-zinc-900 border-white text-white"
                        placeholder="Character Pose A"
                        data-testid="input-asset-name"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white">Source App</Label>
                        <Select value={newImport.sourceApp} onValueChange={(v) => setNewImport({ ...newImport, sourceApp: v })}>
                          <SelectTrigger className="bg-zinc-900 border-white text-white" data-testid="select-source-app">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-white">
                            {sourceApps.map((app) => (
                              <SelectItem key={app} value={app} className="text-white">{app}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-white">Export Type</Label>
                        <Select value={newImport.exportType} onValueChange={(v) => setNewImport({ ...newImport, exportType: v })}>
                          <SelectTrigger className="bg-zinc-900 border-white text-white" data-testid="select-export-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-white">
                            {exportTypes.map((type) => (
                              <SelectItem key={type} value={type} className="text-white">{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white">Target Mode</Label>
                        <Select value={newImport.targetMode} onValueChange={(v) => setNewImport({ ...newImport, targetMode: v })}>
                          <SelectTrigger className="bg-zinc-900 border-white text-white" data-testid="select-target-mode">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-white">
                            {targetModes.map((mode) => (
                              <SelectItem key={mode} value={mode} className="text-white">{mode}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-white">Asset Role</Label>
                        <Select value={newImport.assetRole} onValueChange={(v) => setNewImport({ ...newImport, assetRole: v })}>
                          <SelectTrigger className="bg-zinc-900 border-white text-white" data-testid="select-asset-role">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-white">
                            {assetRoles.map((role) => (
                              <SelectItem key={role} value={role} className="text-white">{role}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button
                      className="w-full bg-red-600 hover:bg-red-700 text-white border-2 border-white font-bold"
                      onClick={() => createImportMutation.mutate(newImport)}
                      disabled={!newImport.bundleName || !newImport.assetName}
                      data-testid="btn-submit-import"
                    >
                      ADD TO QUEUE
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-black border-2 border-white">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-black text-yellow-500" data-testid="text-pending-count">{pendingImports.length}</div>
                <div className="text-xs text-zinc-400 uppercase font-bold">Pending</div>
              </CardContent>
            </Card>
            <Card className="bg-black border-2 border-white">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-black text-green-500" data-testid="text-imported-count">{importedAssets.length}</div>
                <div className="text-xs text-zinc-400 uppercase font-bold">Imported</div>
              </CardContent>
            </Card>
            <Card className="bg-black border-2 border-white">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-black text-red-500" data-testid="text-failed-count">{failedImports.length}</div>
                <div className="text-xs text-zinc-400 uppercase font-bold">Failed</div>
              </CardContent>
            </Card>
            <Card className="bg-black border-2 border-white">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-black text-white" data-testid="text-total-count">{imports.length}</div>
                <div className="text-xs text-zinc-400 uppercase font-bold">Total</div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-zinc-900 border-2 border-white p-1">
              <TabsTrigger
                value="file-import"
                className="data-[state=active]:bg-red-600 data-[state=active]:text-white font-bold"
                data-testid="tab-file-import"
              >
                <Upload className="w-4 h-4 mr-2" />
                FILE IMPORT
              </TabsTrigger>
              <TabsTrigger 
                value="incoming" 
                className="data-[state=active]:bg-red-600 data-[state=active]:text-white font-bold"
                data-testid="tab-incoming"
              >
                INCOMING ({pendingImports.length})
              </TabsTrigger>
              <TabsTrigger 
                value="imported" 
                className="data-[state=active]:bg-green-600 data-[state=active]:text-white font-bold"
                data-testid="tab-imported"
              >
                IMPORTED ({importedAssets.length})
              </TabsTrigger>
              <TabsTrigger 
                value="failed" 
                className="data-[state=active]:bg-red-600 data-[state=active]:text-white font-bold"
                data-testid="tab-failed"
              >
                FAILED ({failedImports.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="file-import" className="space-y-6">
              {!preview ? (
                <>
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-4 border-dashed rounded-lg p-16 text-center cursor-pointer transition-all ${
                      isDragOver
                        ? "border-red-500 bg-red-500/10"
                        : "border-zinc-600 hover:border-zinc-400 bg-zinc-900/30"
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
                        <div className="w-16 h-16 mx-auto border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-white font-bold text-lg">Processing files...</p>
                        <Progress value={importProgress} className="w-64 mx-auto" />
                        <p className="text-zinc-400 text-sm">{importProgress}% complete</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-16 h-16 text-zinc-500 mx-auto mb-4" />
                        <h3 className="text-white font-bold text-xl mb-2">Drop files here or click to browse</h3>
                        <p className="text-zinc-400 mb-6">Import comics and project files into your library</p>
                        <div className="flex items-center justify-center gap-6">
                          <div className="flex items-center gap-2 text-zinc-400">
                            <FileArchive className="w-5 h-5 text-blue-400" />
                            <span className="text-sm">CBZ / ZIP</span>
                          </div>
                          <div className="flex items-center gap-2 text-zinc-400">
                            <Images className="w-5 h-5 text-green-400" />
                            <span className="text-sm">Image Sequence</span>
                          </div>
                          <div className="flex items-center gap-2 text-zinc-400">
                            <FileJson className="w-5 h-5 text-yellow-400" />
                            <span className="text-sm">JSON / CYOA / PSDCF</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <Card className="bg-zinc-900/50 border border-zinc-700">
                      <CardContent className="p-6">
                        <FileArchive className="w-8 h-8 text-blue-400 mb-3" />
                        <h4 className="text-white font-bold mb-1">CBZ / CBR / ZIP</h4>
                        <p className="text-zinc-400 text-sm">Comic book archives. Images are extracted and each becomes a comic page.</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-zinc-900/50 border border-zinc-700">
                      <CardContent className="p-6">
                        <Images className="w-8 h-8 text-green-400 mb-3" />
                        <h4 className="text-white font-bold mb-1">Image Sequence</h4>
                        <p className="text-zinc-400 text-sm">Select multiple images. They'll be sorted naturally and arranged as comic pages.</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-zinc-900/50 border border-zinc-700">
                      <CardContent className="p-6">
                        <FileJson className="w-8 h-8 text-yellow-400 mb-3" />
                        <h4 className="text-white font-bold mb-1">Project Files</h4>
                        <p className="text-zinc-400 text-sm">Import .cyoa, .psdcf, or JSON project exports to restore saved work.</p>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <Card className="bg-black border-2 border-white">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white font-bold flex items-center gap-2">
                        <Eye className="w-5 h-5" />
                        Import Preview
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setPreview(null); setProjectTitle(""); }}
                        className="text-zinc-400 hover:text-white"
                        data-testid="btn-cancel-preview"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-zinc-400 text-xs uppercase">Format</Label>
                        <p className="text-white font-bold" data-testid="text-preview-format">
                          {preview.format === "cbz" ? "CBZ / ZIP Archive" : preview.format === "images" ? "Image Sequence" : "Project File (JSON)"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-zinc-400 text-xs uppercase">Source</Label>
                        <p className="text-white font-bold" data-testid="text-preview-source">{preview.fileName}</p>
                      </div>
                      <div>
                        <Label className="text-zinc-400 text-xs uppercase">
                          {preview.format === "json" ? "Type" : "Pages"}
                        </Label>
                        <p className="text-white font-bold" data-testid="text-preview-count">
                          {preview.format === "json"
                            ? preview.projectData?.type || "comic"
                            : `${preview.images.length} page${preview.images.length !== 1 ? "s" : ""}`}
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-white mb-2 block">Project Title</Label>
                      <Input
                        value={projectTitle}
                        onChange={(e) => setProjectTitle(e.target.value)}
                        className="bg-zinc-900 border-white text-white"
                        placeholder="Enter project title..."
                        data-testid="input-project-title"
                      />
                    </div>

                    {preview.images.length > 0 && (
                      <div className="space-y-3">
                        <Label className="text-zinc-400 text-xs uppercase">Preview</Label>
                        <div className="relative bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden" style={{ minHeight: 320 }}>
                          <img
                            src={preview.images[previewIndex]}
                            alt={`Page ${previewIndex + 1}`}
                            className="max-h-[400px] mx-auto object-contain"
                            data-testid="img-preview"
                          />
                          {preview.images.length > 1 && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white hover:bg-black/80"
                                onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
                                disabled={previewIndex === 0}
                                data-testid="btn-preview-prev"
                              >
                                <ChevronLeft className="w-5 h-5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white hover:bg-black/80"
                                onClick={() => setPreviewIndex(Math.min(preview.images.length - 1, previewIndex + 1))}
                                disabled={previewIndex === preview.images.length - 1}
                                data-testid="btn-preview-next"
                              >
                                <ChevronRight className="w-5 h-5" />
                              </Button>
                              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 px-3 py-1 rounded text-white text-sm font-bold">
                                {previewIndex + 1} / {preview.images.length}
                              </div>
                            </>
                          )}
                        </div>
                        {preview.images.length > 1 && (
                          <div className="flex gap-2 overflow-x-auto pb-2">
                            {preview.images.map((img, idx) => (
                              <button
                                key={idx}
                                onClick={() => setPreviewIndex(idx)}
                                className={`flex-shrink-0 w-16 h-16 border-2 overflow-hidden transition-all ${
                                  idx === previewIndex ? "border-red-500" : "border-zinc-700 hover:border-zinc-400"
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
                      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
                        <Label className="text-zinc-400 text-xs uppercase mb-2 block">Project Data Preview</Label>
                        <pre className="text-zinc-300 text-xs overflow-auto max-h-48 font-mono">
                          {JSON.stringify(preview.projectData, null, 2).slice(0, 2000)}
                          {JSON.stringify(preview.projectData, null, 2).length > 2000 ? "\n..." : ""}
                        </pre>
                      </div>
                    )}

                    <div className="flex gap-4">
                      <Button
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white border-2 border-white font-bold text-lg py-6"
                        onClick={handleConfirmImport}
                        disabled={fileImportMutation.isPending || !projectTitle.trim()}
                        data-testid="btn-confirm-import"
                      >
                        {fileImportMutation.isPending ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            IMPORTING...
                          </>
                        ) : (
                          <>
                            <Download className="w-5 h-5 mr-2" />
                            CREATE PROJECT
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="border-zinc-600 text-zinc-400 hover:text-white font-bold py-6"
                        onClick={() => { setPreview(null); setProjectTitle(""); setPreviewIndex(0); }}
                        data-testid="btn-cancel-import"
                      >
                        CANCEL
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="incoming" className="space-y-4">
              {pendingImports.length === 0 ? (
                <Card className="bg-black border-2 border-dashed border-zinc-700">
                  <CardContent className="p-12 text-center">
                    <FolderOpen className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                    <h3 className="text-white font-bold text-lg">No Pending Imports</h3>
                    <p className="text-zinc-400 mt-2">Add imports manually or export from Reallusion/ComfyUI</p>
                  </CardContent>
                </Card>
              ) : (
                pendingImports.map(renderImportCard)
              )}
            </TabsContent>

            <TabsContent value="imported" className="space-y-4">
              {importedAssets.length === 0 ? (
                <Card className="bg-black border-2 border-dashed border-zinc-700">
                  <CardContent className="p-12 text-center">
                    <CheckCircle className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                    <h3 className="text-white font-bold text-lg">No Imported Assets Yet</h3>
                    <p className="text-zinc-400 mt-2">Successfully imported assets will appear here</p>
                  </CardContent>
                </Card>
              ) : (
                importedAssets.map(renderImportCard)
              )}
            </TabsContent>

            <TabsContent value="failed" className="space-y-4">
              {failedImports.length === 0 ? (
                <Card className="bg-black border-2 border-dashed border-zinc-700">
                  <CardContent className="p-12 text-center">
                    <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <h3 className="text-white font-bold text-lg">No Failed Imports</h3>
                    <p className="text-zinc-400 mt-2">All imports processed successfully</p>
                  </CardContent>
                </Card>
              ) : (
                failedImports.map(renderImportCard)
              )}
            </TabsContent>
          </Tabs>

          <Card className="bg-black border-2 border-white">
            <CardHeader>
              <CardTitle className="text-white font-bold">Supported Formats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 border border-zinc-700 bg-zinc-900/50">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold">CBZ / CBR / ZIP</span>
                    <Badge className="bg-blue-600 text-white">Archive</Badge>
                  </div>
                  <p className="text-xs text-zinc-400 mt-2">Comic book archives with images extracted into pages</p>
                </div>
                <div className="p-4 border border-zinc-700 bg-zinc-900/50">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold">Image Sequence</span>
                    <Badge className="bg-green-600 text-white">Images</Badge>
                  </div>
                  <p className="text-xs text-zinc-400 mt-2">JPG, PNG, GIF, WebP - sorted and arranged as pages</p>
                </div>
                <div className="p-4 border border-zinc-700 bg-zinc-900/50">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold">JSON / CYOA / PSDCF</span>
                    <Badge className="bg-yellow-600 text-white">Project</Badge>
                  </div>
                  <p className="text-xs text-zinc-400 mt-2">Exported project files from CoMiXX or compatible tools</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
