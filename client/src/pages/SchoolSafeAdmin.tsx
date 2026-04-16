import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Plus, Trash2, Save, ChevronDown, ChevronRight, School, Users, BookOpen, AlertTriangle } from "lucide-react";

interface Policy {
  id: string;
  scope: string;
  scope_id: string;
  school_id: string | null;
  label: string;
  enabled: boolean;
  messaging_allowed: boolean;
  mature_content_allowed: boolean;
  marketplace_allowed: boolean;
  external_publishing_allowed: boolean;
  public_profile_allowed: boolean;
  remix_collab_allowed: boolean;
  moderated_publishing: boolean;
  external_contact_allowed: boolean;
  created_at: string;
}

interface SchoolItem {
  id: string;
  name: string;
}

const SCOPE_ICONS: Record<string, any> = {
  district: School,
  school: School,
  classroom: BookOpen,
  user: Users,
};

const POLICY_FIELDS = [
  { key: "messaging_allowed", label: "Messaging" },
  { key: "mature_content_allowed", label: "Mature Content" },
  { key: "marketplace_allowed", label: "Marketplace Access" },
  { key: "external_publishing_allowed", label: "External Publishing" },
  { key: "public_profile_allowed", label: "Public Profile" },
  { key: "remix_collab_allowed", label: "Remix & Collaboration" },
  { key: "moderated_publishing", label: "Moderated Publishing" },
  { key: "external_contact_allowed", label: "External Contact" },
];

export default function SchoolSafeAdmin() {
  const { user } = useAuth();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newPolicy, setNewPolicy] = useState({
    scope: "school",
    scopeId: "",
    schoolId: "",
    label: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const schoolRes = await fetch("/api/admin/schools/overview", { credentials: "include" });
      if (schoolRes.ok) {
        const data = await schoolRes.json();
        const s = data.schools || data || [];
        setSchools(s);
        if (s.length > 0 && !selectedSchool) setSelectedSchool(s[0].id);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!selectedSchool) return;
    fetch(`/api/school-safe/policies/${selectedSchool}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(setPolicies)
      .catch(() => setPolicies([]));
  }, [selectedSchool]);

  const handleToggle = async (policyId: string, field: string, value: boolean) => {
    setSaving(true);
    try {
      await fetch(`/api/school-safe/policies/${policyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ [field]: value }),
      });
      setPolicies(prev =>
        prev.map(p => p.id === policyId ? { ...p, [field]: value } : p)
      );
    } catch {}
    setSaving(false);
  };

  const handleCreate = async () => {
    if (!newPolicy.label) return;
    setSaving(true);
    try {
      const res = await fetch("/api/school-safe/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          scope: newPolicy.scope,
          scopeId: newPolicy.scopeId || selectedSchool,
          schoolId: selectedSchool,
          label: newPolicy.label,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewPolicy({ scope: "school", scopeId: "", schoolId: "", label: "" });
        const updated = await fetch(`/api/school-safe/policies/${selectedSchool}`, { credentials: "include" });
        if (updated.ok) setPolicies(await updated.json());
      }
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (policyId: string) => {
    if (!confirm("Delete this policy?")) return;
    try {
      await fetch(`/api/school-safe/policies/${policyId}`, {
        method: "DELETE",
        credentials: "include",
      });
      setPolicies(prev => prev.filter(p => p.id !== policyId));
    } catch {}
  };

  if (user?.role !== "admin" && user?.role !== "teacher") {
    return (
      <Layout>
        <div className="p-8 text-center text-zinc-500">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          Access restricted to administrators and teachers.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-6 h-6 text-white" />
          <h1 className="text-2xl font-bold text-white" data-testid="text-school-safe-title">School-Safe Policy Admin</h1>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <select
            value={selectedSchool}
            onChange={e => setSelectedSchool(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-white px-3 py-2 text-sm"
            data-testid="select-school"
          >
            {schools.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1 bg-white text-black px-3 py-2 text-sm font-medium hover:bg-zinc-200 transition"
            data-testid="button-create-policy"
          >
            <Plus className="w-3.5 h-3.5" /> New Policy
          </button>
        </div>

        {showCreate && (
          <div className="bg-zinc-900 border border-zinc-800 p-4 mb-6 space-y-3">
            <h3 className="text-white text-sm font-semibold">Create Policy</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-500 text-xs">Scope</label>
                <select
                  value={newPolicy.scope}
                  onChange={e => setNewPolicy({ ...newPolicy, scope: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white px-2 py-1.5 text-sm"
                  data-testid="select-policy-scope"
                >
                  <option value="district">District</option>
                  <option value="school">School</option>
                  <option value="classroom">Classroom</option>
                  <option value="user">User</option>
                </select>
              </div>
              <div>
                <label className="text-zinc-500 text-xs">Label</label>
                <input
                  value={newPolicy.label}
                  onChange={e => setNewPolicy({ ...newPolicy, label: e.target.value })}
                  placeholder="e.g. Default K-8 Policy"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white px-2 py-1.5 text-sm"
                  data-testid="input-policy-label"
                />
              </div>
            </div>
            {(newPolicy.scope === "classroom" || newPolicy.scope === "user") && (
              <div>
                <label className="text-zinc-500 text-xs">Scope ID</label>
                <input
                  value={newPolicy.scopeId}
                  onChange={e => setNewPolicy({ ...newPolicy, scopeId: e.target.value })}
                  placeholder="Classroom or User ID"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white px-2 py-1.5 text-sm"
                  data-testid="input-scope-id"
                />
              </div>
            )}
            <button
              onClick={handleCreate}
              disabled={saving || !newPolicy.label}
              className="bg-white text-black px-4 py-1.5 text-sm font-medium hover:bg-zinc-200 transition disabled:opacity-50"
              data-testid="button-save-policy"
            >
              {saving ? "Saving..." : "Create Policy"}
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-zinc-500 text-center py-8">Loading policies...</div>
        ) : policies.length === 0 ? (
          <div className="text-zinc-500 text-center py-8 border border-zinc-800 bg-zinc-900">
            No policies configured for this school. Create one to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {policies.map(policy => {
              const ScopeIcon = SCOPE_ICONS[policy.scope] || Shield;
              const isExpanded = expandedPolicy === policy.id;
              return (
                <div key={policy.id} className="bg-zinc-900 border border-zinc-800">
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-800/50 transition"
                    onClick={() => setExpandedPolicy(isExpanded ? null : policy.id)}
                    data-testid={`policy-row-${policy.id}`}
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
                    <ScopeIcon className="w-4 h-4 text-zinc-400" />
                    <div className="flex-1">
                      <span className="text-white text-sm font-medium">{policy.label}</span>
                      <span className="text-zinc-600 text-xs ml-2">{policy.scope}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 ${policy.enabled ? "bg-white text-black" : "bg-zinc-800 text-zinc-500"}`}>
                      {policy.enabled ? "Active" : "Disabled"}
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-zinc-800">
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div className="flex items-center justify-between px-3 py-2 bg-zinc-800/50 border border-zinc-800">
                          <span className="text-sm text-zinc-300">Enabled</span>
                          <button
                            onClick={() => handleToggle(policy.id, "enabled", !policy.enabled)}
                            className={`w-10 h-5 rounded-full relative transition ${policy.enabled ? "bg-white" : "bg-zinc-700"}`}
                            data-testid={`toggle-enabled-${policy.id}`}
                          >
                            <div className={`w-4 h-4 rounded-full absolute top-0.5 transition ${policy.enabled ? "right-0.5 bg-black" : "left-0.5 bg-zinc-500"}`} />
                          </button>
                        </div>
                        {POLICY_FIELDS.map(field => (
                          <div key={field.key} className="flex items-center justify-between px-3 py-2 bg-zinc-800/50 border border-zinc-800">
                            <span className="text-sm text-zinc-300">{field.label}</span>
                            <button
                              onClick={() => handleToggle(policy.id, field.key, !(policy as any)[field.key])}
                              className={`w-10 h-5 rounded-full relative transition ${(policy as any)[field.key] ? "bg-white" : "bg-zinc-700"}`}
                              data-testid={`toggle-${field.key}-${policy.id}`}
                            >
                              <div className={`w-4 h-4 rounded-full absolute top-0.5 transition ${(policy as any)[field.key] ? "right-0.5 bg-black" : "left-0.5 bg-zinc-500"}`} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end mt-3">
                        <button
                          onClick={() => handleDelete(policy.id)}
                          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-red-400 transition"
                          data-testid={`button-delete-policy-${policy.id}`}
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
