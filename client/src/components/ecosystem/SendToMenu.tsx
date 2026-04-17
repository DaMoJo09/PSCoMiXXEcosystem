import { useState, useCallback } from "react";
import { Send, Sparkles, Wand2, Radio, GraduationCap, FolderOpen, Globe, X } from "lucide-react";
import { useHandoff } from "@/hooks/useHandoff";
import { toast } from "sonner";

interface SendToTarget {
  key: string;
  label: string;
  icon: typeof Sparkles;
  description: string;
  handler: () => void;
}

interface Props {
  projectId?: string;
  assetIds?: string[];
  contentType?: string;
  layerMetadata?: Record<string, unknown>;
  onClose?: () => void;
}

export default function SendToMenu({ projectId, assetIds, contentType, layerMetadata, onClose }: Props) {
  const { launchFxStudio, launchStreaming, launchLms } = useHandoff();
  const [sending, setSending] = useState<string | null>(null);

  const handleSend = useCallback(async (key: string, handler: () => Promise<any>) => {
    setSending(key);
    try {
      await handler();
    } catch {
      toast.error("Failed to send");
    }
    setSending(null);
  }, []);

  const context = { projectId, assetIds, contentType, layerMetadata };

  const targets: SendToTarget[] = [
    {
      key: "fxstudio",
      label: "FX Studio",
      icon: Wand2,
      description: "Open in FX Studio for effects & motion",
      handler: () => handleSend("fxstudio", () => launchFxStudio(context)),
    },
    {
      key: "streaming",
      label: "PS Streaming",
      icon: Radio,
      description: "Publish to PS Streaming",
      handler: () => handleSend("streaming", () => launchStreaming(context)),
    },
    {
      key: "lms",
      label: "Press Start LMS",
      icon: GraduationCap,
      description: "Submit to LMS assignment",
      handler: () => handleSend("lms", () => launchLms(context)),
    },
    {
      key: "community",
      label: "Community Library",
      icon: Globe,
      description: "Publish so others can see your work",
      handler: () => handleSend("community", async () => {
        if (!projectId) {
          toast.error("Save your project first, then publish");
          return;
        }
        const res = await fetch(`/api/projects/${projectId}/publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ visibility: "public" }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: "Publish failed" }));
          toast.error(err.message || "Publish failed");
          return;
        }
        const data = await res.json();
        toast.success("Published to community library!", {
          description: data.communityUrl ? `View it at ${data.communityUrl}` : undefined,
        });
        onClose?.();
      }),
    },
    {
      key: "library",
      label: "Asset Library",
      icon: FolderOpen,
      description: "Save to shared asset library",
      handler: () => handleSend("library", async () => {
        if (!projectId) {
          toast.error("Save your project first");
          return;
        }
        toast.success("Saved to asset library");
        onClose?.();
      }),
    },
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-1 min-w-[200px]" data-testid="send-to-menu">
      <div className="flex items-center justify-between px-2 py-1 border-b border-zinc-800 mb-1">
        <span className="text-[10px] font-bold text-zinc-400 tracking-wider flex items-center gap-1">
          <Send className="w-3 h-3" /> SEND TO
        </span>
        {onClose && (
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 transition">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      {targets.map(t => {
        const Icon = t.icon;
        const isSending = sending === t.key;
        return (
          <button
            key={t.key}
            onClick={t.handler}
            disabled={isSending}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-zinc-800 transition group"
            data-testid={`send-to-${t.key}`}
          >
            <Icon className="w-4 h-4 text-zinc-500 group-hover:text-white transition shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-zinc-300 group-hover:text-white transition">{t.label}</div>
              <div className="text-[9px] text-zinc-600">{t.description}</div>
            </div>
            {isSending && <span className="text-[9px] text-zinc-500 animate-pulse">Sending...</span>}
          </button>
        );
      })}
    </div>
  );
}
