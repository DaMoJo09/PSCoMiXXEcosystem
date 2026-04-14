import { Layout } from "@/components/layout/Layout";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import {
  Shield, Briefcase, Bug, Package, Star, Users, ArrowLeft,
  CheckCircle, XCircle, Clock, AlertTriangle, Eye, ChevronDown, ChevronUp,
  RefreshCw, Activity, Loader2, Key,
} from "lucide-react";
import { Link } from "wouter";

type AdminTab = "bug-reports" | "apprenticeships" | "external-reviews" | "xp-rules" | "role-rules" | "sync-health" | "sso-audit";

export default function EcosystemAdmin() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("bug-reports");

  if (user?.role !== "admin") {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-zinc-500 font-mono text-sm" data-testid="text-access-denied">ACCESS DENIED</p>
        </div>
      </Layout>
    );
  }

  const tabs: { id: AdminTab; label: string; icon: any }[] = [
    { id: "bug-reports", label: "Bug Reports", icon: Bug },
    { id: "apprenticeships", label: "Apprenticeships", icon: Briefcase },
    { id: "external-reviews", label: "External Reviews", icon: Package },
    { id: "xp-rules", label: "XP Rules", icon: Star },
    { id: "role-rules", label: "Role Rules", icon: Shield },
    { id: "sync-health", label: "Sync Health", icon: Activity },
    { id: "sso-audit", label: "SSO Audit", icon: Key },
  ];

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <header className="border-b border-border pb-4">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/admin">
              <Button variant="ghost" size="sm" data-testid="button-back-admin">
                <ArrowLeft className="w-4 h-4 mr-1" /> Admin
              </Button>
            </Link>
            <span className="bg-black text-white text-xs px-2 py-0.5 font-mono font-bold">ECOSYSTEM</span>
          </div>
          <h1 className="text-3xl font-display font-bold" data-testid="text-ecosystem-admin-title">Ecosystem Management</h1>
        </header>

        <div className="flex gap-2 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              data-testid={`tab-${t.id}`}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-2 border-black transition ${
                activeTab === t.id
                  ? "bg-black text-white shadow-[3px_3px_0_#333]"
                  : "bg-white text-black hover:bg-zinc-100"
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {activeTab === "bug-reports" && <BugReportTriagePanel />}
        {activeTab === "apprenticeships" && <ApprenticeshipManagement />}
        {activeTab === "external-reviews" && <ExternalSubmissionReview />}
        {activeTab === "xp-rules" && <XPRulesPanel />}
        {activeTab === "role-rules" && <RoleRulesPanel />}
        {activeTab === "sync-health" && <SyncHealthDashboard />}
        {activeTab === "sso-audit" && <SSOAuditPanel />}
      </div>
    </Layout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; icon: any }> = {
    submitted: { color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: Clock },
    reviewing: { color: "bg-blue-100 text-blue-800 border-blue-300", icon: Eye },
    in_progress: { color: "bg-purple-100 text-purple-800 border-purple-300", icon: AlertTriangle },
    resolved: { color: "bg-green-100 text-green-800 border-green-300", icon: CheckCircle },
    closed: { color: "bg-zinc-100 text-zinc-600 border-zinc-300", icon: XCircle },
    pending: { color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: Clock },
    accepted: { color: "bg-green-100 text-green-800 border-green-300", icon: CheckCircle },
    rejected: { color: "bg-red-100 text-red-800 border-red-300", icon: XCircle },
    waitlisted: { color: "bg-orange-100 text-orange-800 border-orange-300", icon: Clock },
    approved: { color: "bg-green-100 text-green-800 border-green-300", icon: CheckCircle },
  };
  const m = map[status] || map.submitted;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold border rounded ${m.color}`} data-testid={`badge-status-${status}`}>
      <Icon className="w-3 h-3" /> {status.replace("_", " ").toUpperCase()}
    </span>
  );
}

function BugReportTriagePanel() {
  const queryClient = useQueryClient();
  const { data: reports, isLoading } = useQuery({
    queryKey: ["/api/ecosystem/bug-reports"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/ecosystem/bug-reports");
      return res.json();
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, resolution }: { id: string; status: string; resolution?: string }) => {
      await apiRequest("PUT", `/api/ecosystem/bug-reports/${id}`, { status, resolution });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecosystem/bug-reports"] });
      toast.success("Bug report updated");
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

  const items = Array.isArray(reports) ? reports : [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold" data-testid="text-bug-triage-title">Bug Report Triage ({items.length})</h2>
      {items.length === 0 && <p className="text-zinc-500 text-sm">No bug reports yet.</p>}
      {items.map((r: any) => (
        <div key={r.id} className="border-2 border-black p-4 space-y-2" data-testid={`bug-report-${r.id}`}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-sm">{r.title}</h3>
              <p className="text-xs text-zinc-500">
                {r.category} · User #{r.userId} · {r.currentPage || "N/A"}
              </p>
            </div>
            <StatusBadge status={r.status} />
          </div>
          <p className="text-sm text-zinc-700">{r.description}</p>
          <div className="flex gap-2 flex-wrap">
            {["reviewing", "in_progress", "resolved", "closed"].map((s) => (
              <button
                key={s}
                onClick={() => updateStatus.mutate({ id: r.id, status: s })}
                disabled={r.status === s}
                data-testid={`button-set-status-${s}-${r.id}`}
                className="px-2 py-1 text-xs font-bold border border-black hover:bg-black hover:text-white transition disabled:opacity-30"
              >
                → {s.replace("_", " ").toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ApprenticeshipManagement() {
  const queryClient = useQueryClient();
  const { data: applications, isLoading } = useQuery({
    queryKey: ["/api/ecosystem/apprenticeships/applications"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/ecosystem/apprenticeships/applications");
      return res.json();
    },
  });
  const { data: tracks } = useQuery({
    queryKey: ["/api/ecosystem/apprenticeships/tracks"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/ecosystem/apprenticeships/tracks");
      return res.json();
    },
  });

  const reviewApp = useMutation({
    mutationFn: async ({ id, status, reviewNotes }: { id: string; status: string; reviewNotes?: string }) => {
      await apiRequest("PUT", `/api/ecosystem/apprenticeships/applications/${id}/review`, { status, reviewNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecosystem/apprenticeships/applications"] });
      toast.success("Application updated");
    },
  });

  const [newTrackName, setNewTrackName] = useState("");
  const [newTrackDesc, setNewTrackDesc] = useState("");
  const createTrack = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/ecosystem/apprenticeships/tracks", {
        name: newTrackName,
        description: newTrackDesc,
        minXp: 500,
        minLevel: 3,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecosystem/apprenticeships/tracks"] });
      setNewTrackName("");
      setNewTrackDesc("");
      toast.success("Track created");
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

  const apps = Array.isArray(applications) ? applications : [];
  const trackList = Array.isArray(tracks) ? tracks : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-3" data-testid="text-apprenticeship-admin-title">Apprenticeship Tracks ({trackList.length})</h2>
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Track name"
            value={newTrackName}
            onChange={(e) => setNewTrackName(e.target.value)}
            className="max-w-xs"
            data-testid="input-track-name"
          />
          <Input
            placeholder="Description"
            value={newTrackDesc}
            onChange={(e) => setNewTrackDesc(e.target.value)}
            className="max-w-md"
            data-testid="input-track-desc"
          />
          <Button onClick={() => createTrack.mutate()} disabled={!newTrackName} data-testid="button-create-track">
            Create
          </Button>
        </div>
        {trackList.map((t: any) => (
          <div key={t.id} className="border border-border p-3 mb-2 text-sm" data-testid={`track-${t.id}`}>
            <span className="font-bold">{t.name}</span> — {t.description || "No description"} (Min XP: {t.minXp || 0})
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-bold mb-3">Applications ({apps.length})</h2>
        {apps.length === 0 && <p className="text-zinc-500 text-sm">No applications yet.</p>}
        {apps.map((a: any) => (
          <div key={a.id} className="border-2 border-black p-4 mb-3 space-y-2" data-testid={`application-${a.id}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-sm">User #{a.userId} → Track #{a.trackId}</p>
                <p className="text-xs text-zinc-500">{a.applicationNote?.slice(0, 100)}</p>
              </div>
              <StatusBadge status={a.status} />
            </div>
            <div className="flex gap-2">
              {["accepted", "waitlisted", "rejected"].map((s) => (
                <button
                  key={s}
                  onClick={() => reviewApp.mutate({ id: a.id, status: s })}
                  disabled={a.status === s}
                  data-testid={`button-review-${s}-${a.id}`}
                  className="px-2 py-1 text-xs font-bold border border-black hover:bg-black hover:text-white transition disabled:opacity-30"
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExternalSubmissionReview() {
  const queryClient = useQueryClient();
  const { data: submissions, isLoading } = useQuery({
    queryKey: ["/api/ecosystem/external-submissions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/ecosystem/external-submissions");
      return res.json();
    },
  });

  const reviewSub = useMutation({
    mutationFn: async ({ id, status, xpAwarded, reviewNotes }: { id: string; status: string; xpAwarded?: number; reviewNotes?: string }) => {
      await apiRequest("PUT", `/api/ecosystem/external-submissions/${id}/review`, { status, xpAwarded, reviewNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecosystem/external-submissions"] });
      toast.success("Submission reviewed");
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

  const items = Array.isArray(submissions) ? submissions : [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold" data-testid="text-external-review-title">External Submissions ({items.length})</h2>
      {items.length === 0 && <p className="text-zinc-500 text-sm">No submissions to review.</p>}
      {items.map((s: any) => (
        <div key={s.id} className="border-2 border-black p-4 space-y-2" data-testid={`submission-${s.id}`}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-sm">{s.title}</h3>
              <p className="text-xs text-zinc-500">
                Tool: {s.toolName || `#${s.toolId}`} · User #{s.userId} · Version: {s.sourceToolVersion || "N/A"}
              </p>
            </div>
            <StatusBadge status={s.status} />
          </div>
          {s.fileUrl && (
            <a href={s.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline" data-testid={`link-submission-${s.id}`}>
              View submission →
            </a>
          )}
          <p className="text-sm text-zinc-700">{s.description}</p>
          <div className="flex gap-2">
            <button
              onClick={() => reviewSub.mutate({ id: s.id, status: "approved", xpAwarded: 50 })}
              data-testid={`button-approve-${s.id}`}
              className="px-3 py-1 text-xs font-bold bg-green-600 text-white border border-black hover:bg-green-700 transition"
            >
              APPROVE (+50 XP)
            </button>
            <button
              onClick={() => reviewSub.mutate({ id: s.id, status: "rejected", reviewNotes: "Does not meet requirements" })}
              data-testid={`button-reject-${s.id}`}
              className="px-3 py-1 text-xs font-bold bg-red-600 text-white border border-black hover:bg-red-700 transition"
            >
              REJECT
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function XPRulesPanel() {
  const XP_ACTIONS = [
    { action: "project_create", label: "Project Create", defaultXp: 10 },
    { action: "project_save", label: "Project Save", defaultXp: 2 },
    { action: "project_export", label: "Project Export", defaultXp: 15 },
    { action: "project_publish", label: "Project Publish", defaultXp: 25 },
    { action: "lesson_complete", label: "Lesson Complete", defaultXp: 20 },
    { action: "pathway_complete", label: "Pathway Complete", defaultXp: 100 },
    { action: "external_submission_approved", label: "External Work Approved", defaultXp: 50 },
    { action: "peer_review", label: "Peer Review", defaultXp: 10 },
    { action: "bug_report", label: "Bug Report", defaultXp: 5 },
    { action: "mentor_feedback", label: "Mentor Feedback", defaultXp: 15 },
    { action: "daily_login", label: "Daily Login", defaultXp: 1 },
    { action: "stream_watch", label: "Stream Watch (15m)", defaultXp: 5 },
  ];

  const LEVEL_THRESHOLDS = [
    { level: 1, xp: 0, title: "Newcomer" },
    { level: 2, xp: 50, title: "Explorer" },
    { level: 3, xp: 150, title: "Apprentice" },
    { level: 4, xp: 400, title: "Creator" },
    { level: 5, xp: 800, title: "Pro Creator" },
    { level: 6, xp: 1500, title: "Expert" },
    { level: 7, xp: 3000, title: "Master" },
    { level: 8, xp: 5000, title: "Legend" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-3" data-testid="text-xp-rules-title">XP Action Values</h2>
        <div className="border-2 border-black overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-black text-white">
              <tr>
                <th className="text-left p-3 font-mono text-xs">ACTION</th>
                <th className="text-left p-3 font-mono text-xs">LABEL</th>
                <th className="text-right p-3 font-mono text-xs">XP</th>
              </tr>
            </thead>
            <tbody>
              {XP_ACTIONS.map((a, i) => (
                <tr key={a.action} className={i % 2 === 0 ? "bg-white" : "bg-zinc-50"} data-testid={`row-xp-action-${a.action}`}>
                  <td className="p-3 font-mono text-xs">{a.action}</td>
                  <td className="p-3">{a.label}</td>
                  <td className="p-3 text-right font-bold">{a.defaultXp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold mb-3">Level Thresholds</h2>
        <div className="border-2 border-black overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-black text-white">
              <tr>
                <th className="text-left p-3 font-mono text-xs">LEVEL</th>
                <th className="text-left p-3 font-mono text-xs">TITLE</th>
                <th className="text-right p-3 font-mono text-xs">XP REQUIRED</th>
              </tr>
            </thead>
            <tbody>
              {LEVEL_THRESHOLDS.map((l, i) => (
                <tr key={l.level} className={i % 2 === 0 ? "bg-white" : "bg-zinc-50"} data-testid={`row-level-${l.level}`}>
                  <td className="p-3 font-bold">Level {l.level}</td>
                  <td className="p-3">{l.title}</td>
                  <td className="p-3 text-right font-mono">{l.xp.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RoleRulesPanel() {
  const queryClient = useQueryClient();
  const { data: rules, isLoading } = useQuery({
    queryKey: ["/api/ecosystem/roles/rules"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/ecosystem/roles/rules");
      return res.json();
    },
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, minXp, minCompetencies, minProjects }: any) => {
      await apiRequest("PUT", `/api/ecosystem/roles/rules/${id}`, { minXp, minCompetencies, minProjects });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecosystem/roles/rules"] });
      toast.success("Rule updated");
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

  const items = Array.isArray(rules) ? rules : [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold" data-testid="text-role-rules-title">Role Eligibility Rules ({items.length})</h2>
      {items.length === 0 && <p className="text-zinc-500 text-sm">No rules configured. Default seeded rules may need migration.</p>}
      {items.map((r: any) => (
        <div key={r.id} className="border-2 border-black p-4 space-y-2" data-testid={`role-rule-${r.id}`}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm uppercase">{r.roleName}</h3>
            <span className="text-xs font-mono text-zinc-500">Rule #{r.id}</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <Label className="text-xs">Min XP</Label>
              <p className="font-bold">{r.minXp || 0}</p>
            </div>
            <div>
              <Label className="text-xs">Min Competencies</Label>
              <p className="font-bold">{r.minCompetencies || 0}</p>
            </div>
            <div>
              <Label className="text-xs">Min Projects</Label>
              <p className="font-bold">{r.minProjects || 0}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SyncHealthDashboard() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/sync/dashboard"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/sync/dashboard");
      return res.json();
    },
    refetchInterval: 15000,
  });

  if (isLoading) return <div className="flex justify-center p-8"><Spinner /></div>;
  if (!data) return <p className="text-zinc-500 text-sm">Unable to load sync data</p>;

  const { sync, sso, recentSyncEvents } = data;

  return (
    <div className="space-y-6" data-testid="sync-health-dashboard">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Sync Health Monitor</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh-sync">
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Pending" value={sync?.statusCounts?.pending || 0} icon={<Clock className="w-4 h-4 text-blue-500" />} />
        <MetricCard label="Processing" value={sync?.statusCounts?.processing || 0} icon={<Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />} />
        <MetricCard label="Completed" value={sync?.statusCounts?.completed || 0} icon={<CheckCircle className="w-4 h-4 text-green-500" />} />
        <MetricCard label="Failed" value={sync?.statusCounts?.failed || 0} icon={<XCircle className="w-4 h-4 text-red-500" />} />
      </div>

      {sync?.alerts && (
        <div className="space-y-2">
          {sync.alerts.highFailureRate && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-3 text-sm flex items-center gap-2" data-testid="alert-high-failure">
              <AlertTriangle className="w-4 h-4" /> High failure rate detected
            </div>
          )}
          {sync.alerts.deadLetterBacklog && (
            <div className="bg-orange-50 border border-orange-200 text-orange-800 p-3 text-sm flex items-center gap-2" data-testid="alert-dead-letter">
              <AlertTriangle className="w-4 h-4" /> Dead letter backlog growing
            </div>
          )}
          {sync.alerts.retryBacklog && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 text-sm flex items-center gap-2" data-testid="alert-retry-backlog">
              <AlertTriangle className="w-4 h-4" /> Retry backlog detected
            </div>
          )}
        </div>
      )}

      <div>
        <h3 className="font-bold text-sm mb-2">Recent Sync Events</h3>
        <div className="border border-black divide-y divide-zinc-200 max-h-64 overflow-y-auto">
          {(!recentSyncEvents || recentSyncEvents.length === 0) && <p className="p-3 text-sm text-zinc-500">No sync events yet</p>}
          {recentSyncEvents?.map((e: any) => (
            <div key={e.id} className="p-3 flex items-center justify-between text-sm" data-testid={`sync-event-row-${e.id}`}>
              <div className="flex items-center gap-2">
                {e.status === "completed" && <CheckCircle className="w-3 h-3 text-green-500" />}
                {e.status === "failed" && <XCircle className="w-3 h-3 text-red-500" />}
                {e.status === "pending" && <Clock className="w-3 h-3 text-blue-500" />}
                {e.status === "retrying" && <RefreshCw className="w-3 h-3 text-orange-500" />}
                {e.status === "processing" && <Loader2 className="w-3 h-3 text-yellow-500 animate-spin" />}
                <span className="font-mono text-xs">{e.eventType}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-500">
                <span>{e.sourceApp} → {e.targetApp}</span>
                <span>{new Date(e.createdAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="border-2 border-black p-3 bg-white" data-testid={`metric-${label.toLowerCase()}`}>
      <div className="flex items-center justify-between mb-1">
        {icon}
        <span className="text-2xl font-bold font-mono">{value}</span>
      </div>
      <p className="text-xs text-zinc-500 font-bold uppercase">{label}</p>
    </div>
  );
}

function SSOAuditPanel() {
  const [showFailuresOnly, setShowFailuresOnly] = useState(false);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/sso/audit", showFailuresOnly],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/sso/audit?failures=${showFailuresOnly}&limit=100`);
      return res.json();
    },
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="flex justify-center p-8"><Spinner /></div>;

  return (
    <div className="space-y-4" data-testid="sso-audit-panel">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">SSO Audit Log</h2>
        <div className="flex gap-2">
          <Button
            variant={showFailuresOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFailuresOnly(!showFailuresOnly)}
            data-testid="button-toggle-failures"
          >
            <AlertTriangle className="w-3 h-3 mr-1" /> {showFailuresOnly ? "Showing Failures" : "Show All"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh-sso">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="border border-black divide-y divide-zinc-200 max-h-96 overflow-y-auto">
        {(!data || data.length === 0) && <p className="p-3 text-sm text-zinc-500">No SSO events recorded</p>}
        {data?.map((log: any) => (
          <div key={log.id} className="p-3 text-sm" data-testid={`sso-log-${log.id}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {log.success ? <CheckCircle className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-red-500" />}
                <span className="font-mono text-xs font-bold">{log.action}</span>
                {log.email && <span className="text-zinc-500 text-xs">{log.email}</span>}
              </div>
              <span className="text-xs text-zinc-400">{new Date(log.createdAt).toLocaleString()}</span>
            </div>
            {!log.success && log.errorMessage && (
              <div className="mt-1 text-xs text-red-600 font-mono bg-red-50 p-1 rounded">
                [{log.errorCode}] {log.errorMessage}
              </div>
            )}
            {log.sourceApp && <span className="text-[10px] text-zinc-400 mt-1 block">from: {log.sourceApp} | IP: {log.ipAddress || "n/a"}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
