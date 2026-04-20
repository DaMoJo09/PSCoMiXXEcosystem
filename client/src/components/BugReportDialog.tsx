import { useState, useCallback } from "react";
import { Bug, X, Camera, Send } from "lucide-react";
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

export function BugReportDialog({ isOpen, onClose, contextData }: BugReportDialogProps) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "bug",
    severity: "medium",
    stepsToReproduce: "",
  });
  const [submitting, setSubmitting] = useState(false);

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
        onClose();
      } else {
        toast.error("Failed to submit report");
      }
    } catch {
      toast.error("Failed to submit report");
    }
    setSubmitting(false);
  }, [form, contextData, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg">
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

          <div className="text-zinc-600 text-xs">
            Environment info will be captured automatically (app, page, browser).
          </div>
        </div>

        <div className="flex gap-2 px-4 py-3 border-t border-zinc-800">
          <button
            onClick={handleSubmit}
            disabled={submitting}
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
