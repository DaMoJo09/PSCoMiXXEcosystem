import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { Upload, Package, CheckCircle, Clock, XCircle, Plus } from "lucide-react";
import { toast } from "sonner";

interface ExternalTool {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
}

interface Submission {
  id: string;
  toolName: string;
  title: string;
  description: string;
  status: string;
  reviewNotes: string;
  xpAwarded: number;
  createdAt: string;
}

export default function ExternalToolSubmissions() {
  const [tools, setTools] = useState<ExternalTool[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ toolName: "", title: "", description: "", fileUrl: "" });
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [toolsRes, subsRes] = await Promise.all([
        fetch("/api/ecosystem/external-tools", { credentials: "include" }),
        fetch("/api/ecosystem/external-submissions", { credentials: "include" }),
      ]);
      if (toolsRes.ok) setTools(await toolsRes.json());
      if (subsRes.ok) setSubmissions(await subsRes.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = useCallback(async () => {
    if (!form.toolName || !form.title) {
      toast.error("Tool and title are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/ecosystem/external-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success("Submission recorded! +30 XP");
        setShowForm(false);
        setForm({ toolName: "", title: "", description: "", fileUrl: "" });
        loadData();
      }
    } catch {
      toast.error("Failed to submit");
    }
    setSubmitting(false);
  }, [form, loadData]);

  if (loading) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex-1 overflow-auto bg-black">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-white" />
              <div>
                <h1 className="text-2xl font-bold text-white tracking-wide" data-testid="text-ext-tools-title">EXTERNAL TOOL SUBMISSIONS</h1>
                <p className="text-zinc-500 text-sm">Submit work from partner tools for validation and XP</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium hover:bg-zinc-200 transition"
              data-testid="button-new-submission"
            >
              <Plus className="w-4 h-4" /> New Submission
            </button>
          </div>

          <div className="mb-10">
            <h2 className="text-white font-semibold mb-4">Supported Tools</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {tools.map(tool => (
                <div key={tool.id} className="bg-zinc-900 border border-zinc-800 p-4 text-center" data-testid={`tool-${tool.slug}`}>
                  <div className="text-white font-medium text-sm">{tool.name}</div>
                  <div className="text-zinc-600 text-xs mt-1">{tool.category}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-white font-semibold mb-4">Your Submissions</h2>
            <div className="space-y-2">
              {submissions.length ? submissions.map(sub => (
                <div key={sub.id} className="bg-zinc-900 border border-zinc-800 p-4 flex items-center justify-between" data-testid={`submission-${sub.id}`}>
                  <div className="flex items-center gap-3">
                    {sub.status === 'approved' ? <CheckCircle className="w-4 h-4 text-white" /> :
                     sub.status === 'rejected' ? <XCircle className="w-4 h-4 text-zinc-600" /> :
                     <Clock className="w-4 h-4 text-zinc-400" />}
                    <div>
                      <div className="text-zinc-300 text-sm">{sub.title}</div>
                      <div className="text-zinc-600 text-xs">{sub.toolName} · {new Date(sub.createdAt).toLocaleDateString()}</div>
                      {sub.reviewNotes && <div className="text-zinc-500 text-xs mt-1">{sub.reviewNotes}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {sub.xpAwarded > 0 && <span className="text-xs text-zinc-400">+{sub.xpAwarded} XP</span>}
                    <span className={`text-xs px-2 py-0.5 ${sub.status === 'approved' ? 'bg-white/10 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                      {sub.status}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 text-zinc-600">
                  <Upload className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p>No submissions yet. Submit work from external tools to earn XP and build your passport.</p>
                </div>
              )}
            </div>
          </div>

          {showForm && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg p-6">
                <h3 className="text-white font-semibold text-lg mb-4">Submit External Work</h3>

                <label className="block text-zinc-400 text-sm mb-1">Source Tool</label>
                <select
                  value={form.toolName}
                  onChange={e => setForm(f => ({ ...f, toolName: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm p-2 mb-3 focus:outline-none"
                  data-testid="select-tool"
                >
                  <option value="">Select a tool...</option>
                  {tools.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>

                <label className="block text-zinc-400 text-sm mb-1">Title</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm p-2 mb-3 focus:outline-none"
                  placeholder="Name your submission"
                  data-testid="input-submission-title"
                />

                <label className="block text-zinc-400 text-sm mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm p-2 h-24 resize-none mb-3 focus:outline-none"
                  placeholder="Describe what you created..."
                  data-testid="input-submission-description"
                />

                <label className="block text-zinc-400 text-sm mb-1">File URL (optional)</label>
                <input
                  value={form.fileUrl}
                  onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm p-2 mb-4 focus:outline-none"
                  placeholder="Link to your file or portfolio entry"
                  data-testid="input-submission-url"
                />

                <div className="flex gap-2">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-white text-black font-medium text-sm hover:bg-zinc-200 transition disabled:opacity-50"
                    data-testid="button-submit-work"
                  >
                    {submitting ? "Submitting..." : "Submit for Validation"}
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
