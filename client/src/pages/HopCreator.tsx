import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useSearch } from "wouter";
import {
  ArrowLeft, Plus, Trash2, Save, Upload, Play, Pause, Repeat,
  Music, Image as ImageIcon, Film, Type, GripVertical,
  Volume2, VolumeX, ChevronUp, ChevronDown, Eye, X,
  Zap, Clock, Sparkles, Settings2, Loader2, Download,
  Maximize2, SkipForward, SkipBack
} from "lucide-react";
import { toast } from "sonner";
import { useProject, useUpdateProject, useCreateProject } from "@/hooks/useProjects";
import { apiRequest } from "@/lib/queryClient";
import { saveProjectWithOfflineFallback } from "@/lib/offlineStorage";
import type { HopScene, HopData } from "@shared/schema";

const TRANSITIONS = [
  { id: "cut", label: "Cut" },
  { id: "fade", label: "Fade" },
  { id: "zoom", label: "Zoom" },
  { id: "glitch", label: "Glitch" },
] as const;

const ASSET_TYPES = [
  { id: "image", label: "Image", icon: ImageIcon, accept: "image/*" },
  { id: "gif", label: "GIF", icon: Sparkles, accept: "image/gif" },
  { id: "video", label: "Video", icon: Film, accept: "video/*" },
  { id: "text_card", label: "Text Card", icon: Type, accept: "" },
] as const;

function generateId() {
  return `scene_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function createDefaultScene(order: number): HopScene {
  return {
    id: generateId(),
    order,
    assetType: "image",
    duration: 5,
    transition: "cut",
    loopInScene: false,
  };
}

export default function HopCreator() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const projectId = params.get("id");

  const { data: existingProject } = useProject(projectId || "");
  const updateProject = useUpdateProject();
  const createProject = useCreateProject();

  const [title, setTitle] = useState("Untitled HOP");
  const [description, setDescription] = useState("");
  const [hopType, setHopType] = useState<"single" | "series">("single");
  const [clipLengthMode, setClipLengthMode] = useState<"30s" | "90s" | "custom">("30s");
  const [loopMode, setLoopMode] = useState<"single_loop" | "full_series_loop" | "manual_advance">("single_loop");
  const [scenes, setScenes] = useState<HopScene[]>([createDefaultScene(0)]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [visibility, setVisibility] = useState<"private" | "unlisted" | "public">("private");

  const [audioTrack, setAudioTrack] = useState<{
    src: string; name: string; volume: number; loop: boolean; bpm?: number;
  } | null>(null);
  const [audioMuted, setAudioMuted] = useState(false);

  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewSceneIndex, setPreviewSceneIndex] = useState(0);
  const [loopCount, setLoopCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [effectiveProjectId, setEffectiveProjectId] = useState<string | null>(projectId);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (existingProject) {
      setTitle(existingProject.title || "Untitled HOP");
      const data = existingProject.data as any;
      if (data) {
        if (data.type) setHopType(data.type);
        if (data.clipLengthMode) setClipLengthMode(data.clipLengthMode);
        if (data.loopMode) setLoopMode(data.loopMode);
        if (data.scenes?.length) setScenes(data.scenes);
        if (data.tags) setTags(data.tags);
        if (data.visibility) setVisibility(data.visibility);
        if (data.audioTrack) setAudioTrack(data.audioTrack);
        if (existingProject.description) setDescription(existingProject.description as string || "");
      }
    }
  }, [existingProject]);

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
  const targetDuration = clipLengthMode === "30s" ? 30 : clipLengthMode === "90s" ? 90 : null;

  const buildHopData = useCallback((): HopData => ({
    type: hopType,
    clipLengthMode,
    loopMode,
    scenes,
    tags,
    visibility,
    totalDuration,
    audioTrack: audioTrack || undefined,
    previewSettings: { autoplay: true, mutedByDefault: false, showCaptions: true },
    streamingSyncStatus: "draft",
  }), [hopType, clipLengthMode, loopMode, scenes, tags, visibility, totalDuration, audioTrack]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const hopData = buildHopData();
      if (effectiveProjectId) {
        await saveProjectWithOfflineFallback(effectiveProjectId, { title, data: hopData }, "hop");
        toast.success("HOP saved");
      } else {
        const project = await createProject.mutateAsync({
          title,
          type: "hop",
          status: "draft",
          data: hopData,
          forceNew: true,
        });
        setEffectiveProjectId(project.id);
        window.history.replaceState(null, "", `/creator/hop?id=${project.id}`);
        toast.success("HOP created");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [buildHopData, title, effectiveProjectId, createProject]);

  const handleAddScene = useCallback(() => {
    setScenes(prev => [...prev, createDefaultScene(prev.length)]);
  }, []);

  const handleRemoveScene = useCallback((id: string) => {
    setScenes(prev => {
      const filtered = prev.filter(s => s.id !== id);
      return filtered.map((s, i) => ({ ...s, order: i }));
    });
    if (selectedSceneId === id) setSelectedSceneId(null);
  }, [selectedSceneId]);

  const handleUpdateScene = useCallback((id: string, updates: Partial<HopScene>) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const handleMoveScene = useCallback((id: string, direction: "up" | "down") => {
    setScenes(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (idx < 0) return prev;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr.map((s, i) => ({ ...s, order: i }));
    });
  }, []);

  const handleAssetUpload = useCallback((sceneId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      let assetType: HopScene["assetType"] = "image";
      if (file.type.startsWith("video/")) assetType = "video";
      else if (file.type === "image/gif") assetType = "gif";
      handleUpdateScene(sceneId, { assetUrl: url, assetType });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [handleUpdateScene]);

  const handleAudioUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("audio/")) {
      toast.error("Please select an audio file");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAudioTrack({
        src: reader.result as string,
        name: file.name.replace(/\.[^.]+$/, ""),
        volume: 0.8,
        loop: true,
      });
      toast.success(`Audio loaded: ${file.name}`);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  const handleAddTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags(prev => [...prev, tag]);
      setTagInput("");
    }
  }, [tagInput, tags]);

  useEffect(() => {
    if (showPreview && isPlaying && scenes.length > 0) {
      const currentScene = scenes[previewSceneIndex];
      if (!currentScene) return;

      previewTimerRef.current = setTimeout(() => {
        const nextIdx = previewSceneIndex + 1;
        if (nextIdx >= scenes.length) {
          if (loopMode === "single_loop" || loopMode === "full_series_loop") {
            setPreviewSceneIndex(0);
            setLoopCount(prev => prev + 1);
          } else {
            setIsPlaying(false);
          }
        } else {
          setPreviewSceneIndex(nextIdx);
        }
      }, currentScene.duration * 1000);

      return () => {
        if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      };
    }
  }, [showPreview, isPlaying, previewSceneIndex, scenes, loopMode]);

  useEffect(() => {
    if (audioRef.current && audioTrack) {
      if (isPlaying && !audioMuted) {
        audioRef.current.volume = audioTrack.volume;
        audioRef.current.loop = audioTrack.loop;
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, audioMuted, audioTrack]);

  const selectedScene = scenes.find(s => s.id === selectedSceneId);
  const currentPreviewScene = scenes[previewSceneIndex];

  return (
    <div className="h-screen flex flex-col bg-black text-white" data-testid="hop-creator">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-950 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-zinc-800 transition" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Zap className="w-5 h-5 text-orange-400" />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent text-white font-bold text-sm border-b border-transparent hover:border-zinc-600 focus:border-orange-500 outline-none px-1 py-0.5 w-48"
            data-testid="input-hop-title"
          />
          <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono">
            <Clock className="w-3 h-3" />
            {totalDuration}s {targetDuration && `/ ${targetDuration}s`}
          </div>
          {targetDuration && totalDuration > targetDuration && (
            <span className="text-[10px] text-red-400 font-mono">OVER TARGET</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowPreview(true); setPreviewSceneIndex(0); setLoopCount(0); setIsPlaying(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-white/10 transition"
            data-testid="button-preview"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-orange-600 hover:bg-orange-500 text-white font-medium transition disabled:opacity-50"
            data-testid="button-save"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 bg-zinc-950 border-r border-white/10 flex flex-col overflow-y-auto shrink-0">
          <div className="p-3 space-y-3 border-b border-white/10">
            <div>
              <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">HOP Type</label>
              <div className="flex gap-1 mt-1">
                {(["single", "series"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setHopType(t)}
                    className={`flex-1 py-1.5 text-xs font-medium transition ${
                      hopType === t ? "bg-orange-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                    data-testid={`button-type-${t}`}
                  >
                    {t === "single" ? "Single" : "Series"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Duration</label>
              <div className="flex gap-1 mt-1">
                {(["30s", "90s", "custom"] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setClipLengthMode(d)}
                    className={`flex-1 py-1.5 text-[10px] font-medium transition ${
                      clipLengthMode === d ? "bg-orange-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                    data-testid={`button-duration-${d}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Loop Mode</label>
              <select
                value={loopMode}
                onChange={(e) => setLoopMode(e.target.value as any)}
                className="w-full mt-1 bg-zinc-900 border border-white/10 text-xs text-white p-1.5"
                data-testid="select-loop-mode"
              >
                <option value="single_loop">Single Loop</option>
                <option value="full_series_loop">Full Series Loop</option>
                <option value="manual_advance">Manual Advance</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Visibility</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
                className="w-full mt-1 bg-zinc-900 border border-white/10 text-xs text-white p-1.5"
                data-testid="select-visibility"
              >
                <option value="private">Private</option>
                <option value="unlisted">Unlisted</option>
                <option value="public">Public</option>
              </select>
            </div>
          </div>

          <div className="p-3 space-y-2 border-b border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Audio Track</label>
              <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
              <button
                onClick={() => audioInputRef.current?.click()}
                className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-orange-400 transition"
                data-testid="button-upload-audio"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
            </div>
            {audioTrack ? (
              <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 px-2 py-1.5">
                <Music className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span className="text-[11px] text-zinc-300 truncate flex-1">{audioTrack.name}</span>
                <button onClick={() => setAudioMuted(!audioMuted)} className="p-0.5" data-testid="button-audio-mute">
                  {audioMuted ? <VolumeX className="w-3 h-3 text-red-400" /> : <Volume2 className="w-3 h-3 text-green-400" />}
                </button>
                <button onClick={() => setAudioTrack(null)} className="p-0.5 hover:text-red-400" data-testid="button-audio-remove">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <p className="text-[10px] text-zinc-600">No audio — click upload to add a loop</p>
            )}
            {audioTrack && (
              <input
                type="range" min="0" max="100"
                value={audioTrack.volume * 100}
                onChange={(e) => setAudioTrack(prev => prev ? { ...prev, volume: Number(e.target.value) / 100 } : null)}
                className="w-full h-1 accent-orange-500"
                data-testid="slider-audio-volume"
              />
            )}
          </div>

          <div className="p-3 space-y-2 border-b border-white/10">
            <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Tags</label>
            <div className="flex gap-1">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                placeholder="Add tag..."
                className="flex-1 bg-zinc-900 border border-white/10 text-xs text-white p-1.5 outline-none"
                data-testid="input-tag"
              />
              <button onClick={handleAddTag} className="px-2 bg-zinc-800 hover:bg-zinc-700 text-xs transition" data-testid="button-add-tag">+</button>
            </div>
            <div className="flex flex-wrap gap-1">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-orange-900/30 border border-orange-500/30 text-[10px] text-orange-300">
                  {tag}
                  <button onClick={() => setTags(prev => prev.filter(t => t !== tag))} className="hover:text-red-400" data-testid={`button-remove-tag-${tag}`}>
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="p-3 flex-1">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Scenes ({scenes.length})</label>
              <button onClick={handleAddScene} className="p-1 hover:bg-zinc-800 text-orange-400 transition" data-testid="button-add-scene">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1">
              {scenes.map((scene, idx) => (
                <div
                  key={scene.id}
                  onClick={() => setSelectedSceneId(scene.id)}
                  className={`flex items-center gap-2 px-2 py-2 cursor-pointer transition text-xs ${
                    selectedSceneId === scene.id
                      ? "bg-orange-900/30 border border-orange-500/50"
                      : "bg-zinc-900/50 border border-transparent hover:border-white/10"
                  }`}
                  data-testid={`scene-item-${idx}`}
                >
                  <GripVertical className="w-3 h-3 text-zinc-600 shrink-0" />
                  <div className="w-8 h-8 bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {scene.assetUrl ? (
                      scene.assetType === "video" ? (
                        <Film className="w-4 h-4 text-zinc-500" />
                      ) : (
                        <img src={scene.assetUrl} alt="" className="w-full h-full object-cover" />
                      )
                    ) : scene.assetType === "text_card" ? (
                      <Type className="w-4 h-4 text-zinc-500" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-zinc-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-zinc-300 truncate">{scene.textOverlay || scene.caption || `Scene ${idx + 1}`}</div>
                    <div className="text-[9px] text-zinc-500">{scene.duration}s · {scene.transition}</div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); handleMoveScene(scene.id, "up"); }} className="p-0.5 hover:bg-zinc-700" data-testid={`button-move-up-${idx}`}>
                      <ChevronUp className="w-3 h-3 text-zinc-500" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleMoveScene(scene.id, "down"); }} className="p-0.5 hover:bg-zinc-700" data-testid={`button-move-down-${idx}`}>
                      <ChevronDown className="w-3 h-3 text-zinc-500" />
                    </button>
                    {scenes.length > 1 && (
                      <button onClick={(e) => { e.stopPropagation(); handleRemoveScene(scene.id); }} className="p-0.5 hover:bg-red-900/30 hover:text-red-400" data-testid={`button-remove-scene-${idx}`}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedScene ? (
            <div className="flex-1 flex flex-col p-6 overflow-y-auto">
              <h3 className="text-sm font-bold text-zinc-300 mb-4">
                Scene {scenes.findIndex(s => s.id === selectedScene.id) + 1}
              </h3>

              <div className="flex-1 flex gap-6">
                <div className="flex-1 flex flex-col gap-4">
                  <div className="aspect-video bg-zinc-900 border-2 border-dashed border-white/10 flex items-center justify-center relative overflow-hidden">
                    {selectedScene.assetUrl ? (
                      selectedScene.assetType === "video" ? (
                        <video src={selectedScene.assetUrl} className="w-full h-full object-contain" controls data-testid="scene-video-preview" />
                      ) : (
                        <img src={selectedScene.assetUrl} alt="" className="w-full h-full object-contain" data-testid="scene-image-preview" />
                      )
                    ) : selectedScene.assetType === "text_card" ? (
                      <div className="p-8 text-center">
                        <p className="text-lg font-bold text-white">{selectedScene.textOverlay || "Enter text..."}</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                        <p className="text-xs text-zinc-500">Drop media or click to upload</p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,video/*"
                          className="hidden"
                          onChange={(e) => handleAssetUpload(selectedScene.id, e)}
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-2 px-3 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 border border-white/10 transition"
                          data-testid="button-upload-asset"
                        >
                          Choose File
                        </button>
                      </div>
                    )}
                    {selectedScene.assetUrl && selectedScene.textOverlay && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-4 py-2">
                        <p className="text-sm text-white text-center">{selectedScene.textOverlay}</p>
                      </div>
                    )}
                  </div>
                  {selectedScene.assetUrl && (
                    <div className="flex gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={(e) => handleAssetUpload(selectedScene.id, e)}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-white/10 transition"
                        data-testid="button-replace-asset"
                      >
                        Replace Media
                      </button>
                      <button
                        onClick={() => handleUpdateScene(selectedScene.id, { assetUrl: undefined })}
                        className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-red-900/30 border border-white/10 text-red-400 transition"
                        data-testid="button-clear-asset"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                <div className="w-56 space-y-3 shrink-0">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Asset Type</label>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      {ASSET_TYPES.map(at => (
                        <button
                          key={at.id}
                          onClick={() => handleUpdateScene(selectedScene.id, { assetType: at.id as HopScene["assetType"] })}
                          className={`flex items-center gap-1 px-2 py-1.5 text-[10px] transition ${
                            selectedScene.assetType === at.id
                              ? "bg-orange-600 text-white"
                              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                          }`}
                          data-testid={`button-asset-type-${at.id}`}
                        >
                          <at.icon className="w-3 h-3" /> {at.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Duration (seconds)</label>
                    <input
                      type="number" min="1" max="90" step="1"
                      value={selectedScene.duration}
                      onChange={(e) => handleUpdateScene(selectedScene.id, { duration: Math.max(1, Number(e.target.value)) })}
                      className="w-full mt-1 bg-zinc-900 border border-white/10 text-xs text-white p-1.5 outline-none"
                      data-testid="input-scene-duration"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Transition</label>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      {TRANSITIONS.map(tr => (
                        <button
                          key={tr.id}
                          onClick={() => handleUpdateScene(selectedScene.id, { transition: tr.id })}
                          className={`py-1.5 text-[10px] font-medium transition ${
                            selectedScene.transition === tr.id
                              ? "bg-orange-600 text-white"
                              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                          }`}
                          data-testid={`button-transition-${tr.id}`}
                        >
                          {tr.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Text Overlay</label>
                    <textarea
                      value={selectedScene.textOverlay || ""}
                      onChange={(e) => handleUpdateScene(selectedScene.id, { textOverlay: e.target.value })}
                      placeholder="Overlay text..."
                      className="w-full mt-1 bg-zinc-900 border border-white/10 text-xs text-white p-1.5 outline-none resize-none h-16"
                      data-testid="input-text-overlay"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Caption</label>
                    <input
                      value={selectedScene.caption || ""}
                      onChange={(e) => handleUpdateScene(selectedScene.id, { caption: e.target.value })}
                      placeholder="Caption..."
                      className="w-full mt-1 bg-zinc-900 border border-white/10 text-xs text-white p-1.5 outline-none"
                      data-testid="input-caption"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedScene.loopInScene}
                      onChange={(e) => handleUpdateScene(selectedScene.id, { loopInScene: e.target.checked })}
                      className="accent-orange-500"
                      data-testid="checkbox-loop-in-scene"
                    />
                    <span className="text-[10px] text-zinc-400">Loop this scene</span>
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Zap className="w-12 h-12 text-orange-400/30 mx-auto mb-3" />
                <p className="text-sm text-zinc-500">Select a scene to edit</p>
                <p className="text-xs text-zinc-600 mt-1">Or add a new scene from the sidebar</p>
              </div>
            </div>
          )}

          <div className="h-20 bg-zinc-950 border-t border-white/10 px-4 flex items-center gap-1 overflow-x-auto shrink-0">
            {scenes.map((scene, idx) => {
              const widthPct = targetDuration ? Math.min((scene.duration / targetDuration) * 100, 50) : (100 / scenes.length);
              return (
                <div
                  key={scene.id}
                  onClick={() => setSelectedSceneId(scene.id)}
                  className={`h-12 flex items-center justify-center cursor-pointer border transition shrink-0 ${
                    selectedSceneId === scene.id
                      ? "border-orange-500 bg-orange-900/20"
                      : "border-white/10 bg-zinc-900 hover:bg-zinc-800"
                  }`}
                  style={{ width: `${Math.max(widthPct, 8)}%`, minWidth: "60px" }}
                  data-testid={`timeline-scene-${idx}`}
                >
                  <div className="text-center">
                    <div className="text-[9px] text-zinc-400 font-mono">{idx + 1}</div>
                    <div className="text-[8px] text-zinc-600">{scene.duration}s</div>
                  </div>
                </div>
              );
            })}
            <button
              onClick={handleAddScene}
              className="h-12 w-12 flex items-center justify-center border border-dashed border-white/10 text-zinc-600 hover:text-orange-400 hover:border-orange-500/50 transition shrink-0"
              data-testid="timeline-add-scene"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {audioTrack && <audio ref={audioRef} src={audioTrack.src} preload="auto" />}

      {showPreview && (
        <div className="fixed inset-0 bg-black z-[80] flex flex-col" data-testid="hop-preview">
          <div className="flex items-center justify-between px-4 py-2 bg-zinc-950/80 shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setIsPlaying(!isPlaying); }}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 transition"
                data-testid="preview-play-pause"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button onClick={() => setPreviewSceneIndex(Math.max(0, previewSceneIndex - 1))} className="p-1.5 hover:bg-zinc-800 transition" data-testid="preview-prev">
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setPreviewSceneIndex(Math.min(scenes.length - 1, previewSceneIndex + 1))} className="p-1.5 hover:bg-zinc-800 transition" data-testid="preview-next">
                <SkipForward className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-zinc-400 font-mono">
                Scene {previewSceneIndex + 1}/{scenes.length}
              </span>
              <span className="text-xs text-orange-400 font-mono flex items-center gap-1">
                <Repeat className="w-3 h-3" /> {loopCount}
              </span>
            </div>
            <button
              onClick={() => { setShowPreview(false); setIsPlaying(false); setLoopCount(0); }}
              className="p-2 hover:bg-zinc-800 transition"
              data-testid="preview-close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center relative overflow-hidden">
            {currentPreviewScene && (
              <div
                className={`w-full h-full flex items-center justify-center transition-opacity duration-500 ${
                  currentPreviewScene.transition === "fade" ? "animate-fade-in" : ""
                }`}
                style={currentPreviewScene.transition === "zoom" ? { animation: `zoomIn ${currentPreviewScene.duration}s ease-out` } : {}}
              >
                {currentPreviewScene.assetType === "text_card" ? (
                  <div className="text-center p-12">
                    <p className="text-3xl font-bold text-white">{currentPreviewScene.textOverlay || "..."}</p>
                    {currentPreviewScene.caption && (
                      <p className="text-lg text-zinc-400 mt-4">{currentPreviewScene.caption}</p>
                    )}
                  </div>
                ) : currentPreviewScene.assetUrl ? (
                  <>
                    {currentPreviewScene.assetType === "video" ? (
                      <video
                        src={currentPreviewScene.assetUrl}
                        className="max-w-full max-h-full object-contain"
                        autoPlay
                        muted={audioMuted}
                        loop={currentPreviewScene.loopInScene}
                        data-testid="preview-video"
                      />
                    ) : (
                      <img src={currentPreviewScene.assetUrl} alt="" className="max-w-full max-h-full object-contain" data-testid="preview-image" />
                    )}
                    {currentPreviewScene.textOverlay && (
                      <div className="absolute bottom-16 left-0 right-0 text-center">
                        <p className="text-xl text-white font-bold bg-black/60 inline-block px-6 py-2">{currentPreviewScene.textOverlay}</p>
                      </div>
                    )}
                    {currentPreviewScene.caption && (
                      <div className="absolute bottom-4 left-0 right-0 text-center">
                        <p className="text-sm text-zinc-300 bg-black/40 inline-block px-4 py-1">{currentPreviewScene.caption}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-zinc-600 text-sm">No media in this scene</p>
                )}
              </div>
            )}
          </div>

          <div className="h-1 bg-zinc-900 shrink-0">
            <div className="h-full bg-orange-500 transition-all" style={{ width: `${((previewSceneIndex + 1) / scenes.length) * 100}%` }} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes zoomIn {
          from { transform: scale(1.1); opacity: 0.8; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-in;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
