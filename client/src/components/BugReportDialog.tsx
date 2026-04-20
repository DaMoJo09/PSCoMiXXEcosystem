import { useState, useCallback, useRef } from "react";
import { Bug, X, Send, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface BugReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contextData?: {
    app?: string;
    projectId?: string;
    currentPage?: string;
  };
}

const CATEGORIES = [
  { value: "bug", label: "Bug" },
  { value: "ux_issue", label: "UX Issue" },
  { value: "feature_request", label: "Feature Request" },
  { value: "partner_tool_issue", label: "Partner Tool Issue" },
];

const SEVERITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const MAX_SCREENSHOTS = 3;
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

interface UploadedShot {
  url: string;
  filename: string;
  previewDataUrl: string;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function BugReportDialog({ isOpen, onClose, contextData }: BugReportDialogProps) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "bug",
    severity: "medium",
    stepsToReproduce: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [shots, setShots] = useState<UploadedShot[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_SCREENSHOTS - shots.length;
    if (remaining <= 0) {
      toast.error(`Up to ${MAX_SCREENSHOTS} screenshots`);
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      for (const file of toUpload) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name}: only images are allowed`);
          continue;
        }
        if (file.size > MAX_SIZE_BYTES) {
          toast.error(`${file.name}: max 5 MB`);
          continue;
        }
        const dataUrl = await fileToDataUrl(file);
        const res = await fetch("/api/files/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            data: dataUrl,
            filename: file.name,
            mimeType: file.type,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(err.message || `Failed to upload ${file.name}`);
          continue;
        }
        const result = await res.json();
        const url: string | undefined = result.url || result.fileUrl || result.path || (result.id ? `/api/files/${result.id}` : undefined);
        if (!url) {
          toast.error(`Upload of ${file.name} returned no URL`);
          continue;
        }
        setShots(prev => [...prev, { url, filename: file.name, previewDataUrl: dataUrl }]);
      }
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [shots.length]);

  const removeShot = useCallback((url: string) => {
    setShots(prev => prev.filter(s => s.url !== url));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/ecosystem/bug-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          app: contextData?.app || "comixx",
          screenshotUrls: shots.map(s => s.url),
          contextData: {
            ...contextData,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
          },
          projectId: contextData?.projectId,
        }),
      });
      if (res.ok) {
        toast.success("Report submitted — thank you!");
        setForm({ title: "", description: "", category: "bug", severity: "medium", stepsToReproduce: "" });
        setShots([]);
        onClose();
      } else {
        toast.error("Failed to submit report");
      }
    } catch {
      toast.error("Failed to submit report");
    }
    setSubmitting(false);
  }, [form, contextData, shots, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-start sm:items-center justify-center z-[100] p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg my-8">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Bug className="w-4 h-4 text-white" />
            <span className="text-white font-semibold text-sm">Report Issue</span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition" data-testid="button-close-bug-report">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-zinc-400 text-xs mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm p-2 focus:outline-none"
                data-testid="select-bug-category"
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-zinc-400 text-xs mb-1">Severity</label>
              <select
                value={form.severity}
                onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm p-2 focus:outline-none"
                data-testid="select-bug-severity"
              >
                {SEVERITIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 text-xs mb-1">Title</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm p-2 focus:outline-none"
              placeholder="Brief description of the issue"
              data-testid="input-bug-title"
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-xs mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm p-2 h-24 resize-none focus:outline-none"
              placeholder="What happened? What did you expect to happen?"
              data-testid="input-bug-description"
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-xs mb-1">Steps to Reproduce (optional)</label>
            <textarea
              value={form.stepsToReproduce}
              onChange={e => setForm(f => ({ ...f, stepsToReproduce: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm p-2 h-16 resize-none focus:outline-none"
              placeholder="1. Go to...  2. Click...  3. See error..."
              data-testid="input-bug-steps"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-zinc-400 text-xs">
                Screenshots (optional, up to {MAX_SCREENSHOTS})
              </label>
              <span className="text-[10px] text-zinc-600">{shots.length}/{MAX_SCREENSHOTS}</span>
            </div>

            {shots.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2" data-testid="list-bug-screenshots">
                {shots.map((shot) => (
                  <div key={shot.url} className="relative group" data-testid={`thumb-bug-screenshot-${shot.filename}`}>
                    <img
                      src={shot.previewDataUrl}
                      alt={shot.filename}
                      className="w-full h-20 object-cover border border-zinc-700"
                    />
                    <button
                      type="button"
                      onClick={() => removeShot(shot.url)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/80 hover:bg-red-600 text-white flex items-center justify-center rounded-full transition"
                      data-testid={`button-remove-screenshot-${shot.filename}`}
                      aria-label={`Remove ${shot.filename}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
              data-testid="input-bug-screenshot-file"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || shots.length >= MAX_SCREENSHOTS}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-zinc-800 border border-dashed border-zinc-700 hover:border-zinc-500 text-zinc-300 text-xs disabled:opacity-50 disabled:cursor-not-allowed transition"
              data-testid="button-add-screenshot"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" /> Uploading…
                </>
              ) : (
                <>
                  <ImagePlus className="w-3 h-3" /> Add screenshot
                </>
              )}
            </button>
            <p className="text-[10px] text-zinc-600 mt-1">PNG/JPG, up to 5 MB each.</p>
          </div>

          <div className="text-zinc-600 text-xs">
            Environment info will be captured automatically (app, page, browser).
          </div>
        </div>

        <div className="flex gap-2 px-4 py-3 border-t border-zinc-800">
          <button
            onClick={handleSubmit}
            disabled={submitting || uploading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white text-black font-medium text-sm hover:bg-zinc-200 transition disabled:opacity-50"
            data-testid="button-submit-bug-report"
          >
            <Send className="w-3 h-3" /> {submitting ? "Submitting..." : "Submit Report"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function BugReportButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-2 bottom-12 z-50 w-10 h-10 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition flex items-center justify-center group rounded"
        title="Report Issue"
        data-testid="button-report-issue"
      >
        <Bug className="w-4 h-4 text-zinc-400 group-hover:text-white transition" />
      </button>
      <BugReportDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        contextData={{
          app: "comixx",
          currentPage: window.location.pathname,
        }}
      />
    </>
  );
}
