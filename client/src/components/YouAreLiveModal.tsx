import { useState } from "react";
import { Monitor, ExternalLink, Copy, CheckCircle2, X, Eye } from "lucide-react";
import { toast } from "sonner";

export interface PublishResult {
  streamingUrl: string;
  projectTitle: string;
  projectType?: string;
  thumbnail?: string | null;
  creatorName?: string;
  viewCount?: number;
}

interface YouAreLiveModalProps {
  publishResult: PublishResult;
  onClose: () => void;
}

export function YouAreLiveModal({ publishResult, onClose }: YouAreLiveModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" data-testid="modal-you-are-live">
      <div className="bg-zinc-900 border-4 border-cyan-500 max-w-lg w-full p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white"
          data-testid="button-close-live-modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-cyan-500 mx-auto mb-4 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-black" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight" data-testid="text-you-are-live">
            YOU'RE LIVE!
          </h2>
          <p className="text-zinc-400 text-sm mt-2">
            "{publishResult.projectTitle}" is now on PS Streaming
          </p>
          <div className="flex items-center justify-center gap-1 mt-2 text-xs text-zinc-500" data-testid="text-live-views">
            <Eye className="w-3 h-3" /> {publishResult.viewCount ?? 0} views
          </div>
        </div>

        {publishResult.thumbnail && (
          <div className="border-2 border-zinc-700 mb-6">
            <div className="bg-zinc-800 px-3 py-1.5 flex items-center gap-2 border-b border-zinc-700">
              <Monitor className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] font-mono text-zinc-400 uppercase">Preview on PS Streaming</span>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center overflow-hidden">
              <img
                src={publishResult.thumbnail}
                alt={publishResult.projectTitle}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="bg-zinc-800 px-3 py-2 border-t border-zinc-700">
              <p className="text-sm font-bold truncate">{publishResult.projectTitle}</p>
              {publishResult.creatorName && (
                <p className="text-[10px] text-zinc-500">by {publishResult.creatorName}</p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-black border border-zinc-700 px-3 py-2 text-xs font-mono text-cyan-400 truncate">
              {publishResult.streamingUrl}
            </div>
            <button
              onClick={() => handleCopy(publishResult.streamingUrl)}
              className="p-2 border border-zinc-700 hover:border-white transition-colors"
              data-testid="button-copy-streaming-url"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <a
              href={publishResult.streamingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 bg-cyan-500 text-black font-black uppercase text-sm flex items-center justify-center gap-2 hover:bg-cyan-400 transition-colors"
              data-testid="link-view-on-streaming"
            >
              <ExternalLink className="w-4 h-4" /> View on Stage
            </a>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: publishResult.projectTitle,
                    url: publishResult.streamingUrl,
                  });
                } else {
                  handleCopy(publishResult.streamingUrl);
                  toast.success("Link copied to clipboard");
                }
              }}
              className="py-3 border-2 border-zinc-700 hover:border-white font-bold uppercase text-sm flex items-center justify-center gap-2 transition-colors"
              data-testid="button-share-link"
            >
              <Copy className="w-4 h-4" /> Share Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
