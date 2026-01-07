import { useState } from "react";
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
import { toast } from "@/hooks/use-toast";
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
  AlertTriangle
} from "lucide-react";

const sourceApps = ["iClone", "CharacterCreator", "CartoonAnimator", "ComfyUI", "Unknown"];
const exportTypes = ["render", "image", "image_sequence", "video", "asset_pack"];
const targetModes = ["library_card", "cover", "comic", "cyoa", "visual_novel"];
const assetRoles = ["character", "background", "panel", "overlay", "cutscene", "prop"];

export default function ImportCenter() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("incoming");
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [newImport, setNewImport] = useState({
    bundleName: "",
    sourceApp: "ComfyUI",
    exportType: "image",
    targetMode: "comic",
    assetName: "",
    assetRole: "character",
  });

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
      const res = await fetch("/api/projects", { credentials: "include" });
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
              <p className="text-zinc-400 mt-1">Reallusion & ComfyUI Asset Pipeline</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 border-2 border-green-500 bg-green-500/10">
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-green-500 font-bold text-sm">CONNECTED</span>
              </div>
              <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-red-600 hover:bg-red-700 text-white border-2 border-white font-bold" data-testid="btn-add-import">
                    <Upload className="w-4 h-4 mr-2" />
                    ADD IMPORT
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-black border-2 border-white">
                  <DialogHeader>
                    <DialogTitle className="text-white font-bold">Add New Import</DialogTitle>
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
                <div className="text-3xl font-black text-yellow-500">{pendingImports.length}</div>
                <div className="text-xs text-zinc-400 uppercase font-bold">Pending</div>
              </CardContent>
            </Card>
            <Card className="bg-black border-2 border-white">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-black text-green-500">{importedAssets.length}</div>
                <div className="text-xs text-zinc-400 uppercase font-bold">Imported</div>
              </CardContent>
            </Card>
            <Card className="bg-black border-2 border-white">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-black text-red-500">{failedImports.length}</div>
                <div className="text-xs text-zinc-400 uppercase font-bold">Failed</div>
              </CardContent>
            </Card>
            <Card className="bg-black border-2 border-white">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-black text-white">{imports.length}</div>
                <div className="text-xs text-zinc-400 uppercase font-bold">Total</div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-zinc-900 border-2 border-white p-1">
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
              <CardTitle className="text-white font-bold">Connection Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border border-zinc-700 bg-zinc-900/50">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold">Reallusion</span>
                    <Badge className="bg-green-600 text-white">Ready</Badge>
                  </div>
                  <p className="text-xs text-zinc-400 mt-2">iClone, Character Creator, Cartoon Animator</p>
                </div>
                <div className="p-4 border border-zinc-700 bg-zinc-900/50">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold">ComfyUI</span>
                    <Badge className="bg-green-600 text-white">Ready</Badge>
                  </div>
                  <p className="text-xs text-zinc-400 mt-2">AI Image Generation Workflow</p>
                </div>
              </div>
              <div className="text-xs text-zinc-500">
                Export assets to: <code className="bg-zinc-800 px-2 py-1">~/Documents/CoMiXX/_INBOX/</code>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
