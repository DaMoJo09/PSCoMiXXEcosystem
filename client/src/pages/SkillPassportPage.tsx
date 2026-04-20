import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Shield, Award, Star, TrendingUp, Briefcase, BookOpen, Zap, ChevronRight, ExternalLink, CheckCircle, AlertCircle, Clock, Users, Share2, Copy } from "lucide-react";

interface PassportData {
  user: {
    xp: number;
    level: number;
    ecosystemRole: string;
    creatorClass: string;
  };
  entries: any[];
  competencies: any[];
  balancesBySource: any[];
  productionCredits: any[];
}

interface EligibilityData {
  current: string;
  eligible: { roleName: string; displayName: string; meetsRequirements: boolean; gaps: string[] }[];
}

const ROLE_LABELS: Record<string, string> = {
  learner: "Learner",
  creator: "Creator",
  mentor_eligible: "Mentor Eligible",
  mentor: "Mentor",
  apprentice_eligible: "Apprentice Eligible",
  apprentice: "Apprentice",
  paid_apprentice_eligible: "Paid Apprentice Eligible",
  paid_apprentice: "Paid Apprentice",
  contributor: "Contributor",
  specialist: "Specialist",
  lead: "Lead",
};

export default function SkillPassportPage() {
  const [passport, setPassport] = useState<PassportData | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "entries" | "competencies" | "xp" | "ladder" | "workforce">("overview");
  const [username, setUsername] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [passportRes, eligRes, profRes] = await Promise.all([
        fetch("/api/ecosystem/passport", { credentials: "include" }),
        fetch("/api/ecosystem/roles/eligibility", { credentials: "include" }),
        fetch("/api/profile", { credentials: "include" }),
      ]);
      if (passportRes.ok) setPassport(await passportRes.json());
      if (eligRes.ok) setEligibility(await eligRes.json());
      if (profRes.ok) {
        const p = await profRes.json();
        setUsername(p.username || null);
      }
    } catch {}
    setLoading(false);
  }, []);

  const publicUrl = username ? `${window.location.origin}/passport/${username}` : null;
  const copyShareLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {}
  };

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white animate-spin" />
        </div>
      </Layout>
    );
  }

  const user = passport?.user;
  const xpPercent = user ? Math.min(100, ((user.xp || 0) / Math.max(1, (user.level || 1) * 500)) * 100) : 0;

  return (
    <Layout>
      <div className="flex-1 overflow-auto bg-black">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-white" />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white tracking-wide" data-testid="text-passport-title">SKILL PASSPORT</h1>
              <p className="text-zinc-500 text-sm">Press Start Creative Tech Apprenticeship Program</p>
            </div>
            {publicUrl && (
              <div className="flex items-center gap-2">
                <Link
                  href={`/passport/${username}`}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded transition flex items-center gap-1.5"
                  data-testid="link-view-public-passport"
                >
                  <ExternalLink className="w-3 h-3" /> View Public
                </Link>
                <button
                  onClick={copyShareLink}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded transition flex items-center gap-1.5"
                  data-testid="button-share-passport"
                >
                  {shareCopied ? <><CheckCircle className="w-3 h-3" /> Copied</> : <><Share2 className="w-3 h-3" /> Share Public Passport</>}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-zinc-900 border border-zinc-800 p-4">
              <div className="text-zinc-500 text-xs mb-1">TOTAL XP</div>
              <div className="text-2xl font-bold text-white" data-testid="text-passport-xp">{(user?.xp || 0).toLocaleString()}</div>
              <div className="w-full h-1 bg-zinc-800 mt-2">
                <div className="h-full bg-white transition-all" style={{ width: `${xpPercent}%` }} />
              </div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4">
              <div className="text-zinc-500 text-xs mb-1">LEVEL</div>
              <div className="text-2xl font-bold text-white" data-testid="text-passport-level">{user?.level || 1}</div>
              <div className="text-zinc-500 text-xs mt-1">{user?.creatorClass || "Novice"}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4">
              <div className="text-zinc-500 text-xs mb-1">ROLE</div>
              <div className="text-lg font-bold text-white" data-testid="text-passport-role">
                {ROLE_LABELS[user?.ecosystemRole || 'learner'] || user?.ecosystemRole}
              </div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4">
              <div className="text-zinc-500 text-xs mb-1">PASSPORT ENTRIES</div>
              <div className="text-2xl font-bold text-white" data-testid="text-passport-entries-count">{passport?.entries?.length || 0}</div>
            </div>
          </div>

          <div className="flex gap-1 mb-6 border-b border-zinc-800">
            {(["overview", "entries", "competencies", "xp", "ladder", "workforce"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium transition ${activeTab === tab ? "text-white border-b-2 border-white" : "text-zinc-500 hover:text-zinc-300"}`}
                data-testid={`tab-passport-${tab}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> XP by Source</h3>
                {passport?.balancesBySource?.length ? (
                  <div className="space-y-3">
                    {passport.balancesBySource.map((b: any, i: number) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="w-3 h-3 text-zinc-400" />
                          <span className="text-zinc-300 text-sm capitalize">{b.source}</span>
                          {b.toolUsed && <span className="text-zinc-600 text-xs">({b.toolUsed})</span>}
                        </div>
                        <div className="text-white font-mono text-sm">{(b.totalXp || 0).toLocaleString()} XP</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-600 text-sm">No XP earned yet. Start creating to build your passport!</p>
                )}
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Briefcase className="w-4 h-4" /> Production Credits</h3>
                {passport?.productionCredits?.length ? (
                  <div className="space-y-2">
                    {passport.productionCredits.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                        <div>
                          <div className="text-zinc-300 text-sm">{c.roleName}</div>
                          <div className="text-zinc-600 text-xs">{c.projectName} — {c.department}</div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 ${c.status === 'active' ? 'bg-white/10 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                          {c.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-600 text-sm">No production credits yet.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "entries" && (
            <div className="space-y-3">
              {passport?.entries?.length ? passport.entries.map((e: any) => (
                <div key={e.id} className="bg-zinc-900 border border-zinc-800 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-zinc-400" />
                        <span className="text-white font-medium">{e.title}</span>
                        <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5">{e.entryType}</span>
                      </div>
                      {e.description && <p className="text-zinc-500 text-sm mt-1">{e.description}</p>}
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs text-zinc-600">Source: {e.source}</span>
                        {e.xpAwarded > 0 && <span className="text-xs text-zinc-400">+{e.xpAwarded} XP</span>}
                      </div>
                    </div>
                    {e.mentorApproved && (
                      <span className="text-xs bg-white/10 text-white px-2 py-0.5 flex items-center gap-1">
                        <Star className="w-3 h-3" /> Mentor Approved
                      </span>
                    )}
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 text-zinc-600">
                  <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p>No passport entries yet. Complete pathways, publish projects, and earn mentor approvals to build your passport.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "competencies" && (
            <div className="space-y-3">
              {passport?.competencies?.length ? passport.competencies.map((c: any) => (
                <div key={c.id} className="bg-zinc-900 border border-zinc-800 p-4 flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">Skill #{c.skillTagId?.slice(0, 8)}</div>
                    <div className="text-zinc-500 text-xs">Level {c.level} — {c.totalXp} XP</div>
                  </div>
                  {c.verifiedBy && <span className="text-xs bg-white/10 text-white px-2 py-0.5">Verified</span>}
                </div>
              )) : (
                <div className="text-center py-12 text-zinc-600">
                  <p>No competencies tracked yet.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "xp" && (
            <XpBreakdownTab />
          )}

          {activeTab === "ladder" && eligibility && (
            <WorkforceLadder eligibility={eligibility} />
          )}

          {activeTab === "workforce" && (
            <WorkforceTab />
          )}
        </div>
      </div>
    </Layout>
  );
}

function XpBreakdownTab() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ecosystem/xp/events?limit=100", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(d => { setEvents(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-zinc-500 text-center py-8">Loading XP history...</div>;

  return (
    <div className="space-y-2">
      <h3 className="text-white font-semibold mb-4">Recent XP Activity</h3>
      {events.length ? events.map((e: any) => (
        <div key={e.id} className="bg-zinc-900 border border-zinc-800 p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-3 h-3 text-zinc-400" />
            <div>
              <div className="text-zinc-300 text-sm">{e.action?.replace(/_/g, " ")}</div>
              <div className="text-zinc-600 text-xs">{e.source} · {new Date(e.createdAt).toLocaleDateString()}</div>
            </div>
          </div>
          <span className="text-white font-mono text-sm">+{e.xpAmount}</span>
        </div>
      )) : (
        <p className="text-zinc-600 text-center py-8">No XP events yet.</p>
      )}
    </div>
  );
}

const TIER_CONFIG: Record<string, { label: string; color: string }> = {
  exploring: { label: "Exploring", color: "text-zinc-400" },
  developing: { label: "Developing", color: "text-blue-400" },
  proficient: { label: "Proficient", color: "text-emerald-400" },
  advanced: { label: "Advanced", color: "text-amber-400" },
  professional: { label: "Professional", color: "text-purple-400" },
};

function WorkforceTab() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/workforce/passport", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setProfile(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-zinc-500 text-center py-8">Loading workforce data...</div>;
  if (!profile) return <div className="text-zinc-500 text-center py-8">No workforce data available yet.</div>;

  const p = profile.profile || {};
  const tier = TIER_CONFIG[p.readiness_tier || "exploring"] || TIER_CONFIG.exploring;

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2"><Briefcase className="w-4 h-4" /> Workforce Readiness</h3>
          <span className={`text-sm font-bold ${tier.color}`} data-testid="text-workforce-tier">{tier.label}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: "Contract Ready", active: p.contract_ready },
            { label: "MMM Creator", active: p.mmm_creator_eligible },
            { label: "Partner Ready", active: p.partner_ready },
            { label: "Internship Ready", active: p.internship_ready },
            { label: "Apprenticeship", active: p.apprenticeship_ready },
          ].map((b, i) => (
            <div key={i} className={`flex items-center gap-2 px-3 py-2 border ${b.active ? "border-zinc-700 bg-zinc-800" : "border-zinc-800 bg-zinc-900/50"}`}>
              {b.active ? <CheckCircle className="w-3.5 h-3.5 text-white" /> : <AlertCircle className="w-3.5 h-3.5 text-zinc-700" />}
              <span className={`text-xs ${b.active ? "text-white" : "text-zinc-600"}`}>{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <h4 className="text-zinc-400 text-xs font-bold mb-3">STATS</h4>
          <div className="grid grid-cols-2 gap-3">
            <div><div className="text-xl font-bold text-white">{p.total_projects || 0}</div><div className="text-[10px] text-zinc-600">Total Projects</div></div>
            <div><div className="text-xl font-bold text-white">{p.published_projects || 0}</div><div className="text-[10px] text-zinc-600">Published</div></div>
            <div><div className="text-xl font-bold text-white">{p.team_projects_completed || 0}</div><div className="text-[10px] text-zinc-600">Team Projects</div></div>
            <div><div className="text-xl font-bold text-white">{p.paid_projects_completed || 0}</div><div className="text-[10px] text-zinc-600">Paid Projects</div></div>
            <div><div className="text-xl font-bold text-white">{p.deadlines_met || 0}</div><div className="text-[10px] text-zinc-600">Deadlines Met</div></div>
            <div><div className="text-xl font-bold text-white">{p.teacher_endorsements || 0}</div><div className="text-[10px] text-zinc-600">Endorsements</div></div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <h4 className="text-zinc-400 text-xs font-bold mb-3">TOP SKILLS</h4>
          {(p.top_skills || []).length === 0 && <p className="text-zinc-600 text-xs">Complete projects to build skill signals</p>}
          {(p.top_skills || []).slice(0, 8).map((s: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-1 border-b border-zinc-800 last:border-0">
              <span className="text-zinc-300 text-sm">{s.skill}</span>
              <span className="text-zinc-500 text-xs">{s.count}</span>
            </div>
          ))}
        </div>
      </div>

      {(profile.teacherEndorsements || []).length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <h4 className="text-zinc-400 text-xs font-bold mb-3">ENDORSEMENTS</h4>
          {profile.teacherEndorsements.map((e: any, i: number) => (
            <div key={i} className="py-2 border-b border-zinc-800 last:border-0">
              <div className="flex items-center gap-1 text-sm">
                <Users className="w-3 h-3 text-zinc-500" />
                <span className="text-zinc-300">{e.skill_category}</span>
                <span className="text-zinc-600 text-xs ml-auto">{e.endorser_role}</span>
              </div>
              {e.comment && <p className="text-zinc-500 text-xs mt-0.5">{e.comment}</p>}
            </div>
          ))}
        </div>
      )}

      {(profile.recentSignals || []).length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <h4 className="text-zinc-400 text-xs font-bold mb-3">RECENT SIGNALS</h4>
          {profile.recentSignals.slice(0, 10).map((s: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-zinc-800/50 last:border-0">
              <Clock className="w-3 h-3 text-zinc-700" />
              <span className="text-zinc-400">{s.signal_type?.replace(/_/g, " ")}</span>
              {s.source_app && <span className="text-zinc-600">via {s.source_app}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WorkforceLadder({ eligibility }: { eligibility: EligibilityData }) {
  const LADDER = [
    { role: "learner", level: "0-5", label: "Learner" },
    { role: "creator", level: "5-10", label: "Creator" },
    { role: "mentor_eligible", level: "10-15", label: "Mentor Eligible" },
    { role: "apprentice_eligible", level: "15-20", label: "Apprentice Eligible" },
    { role: "paid_apprentice_eligible", level: "20-25", label: "Paid Apprentice Eligible" },
    { role: "contributor", level: "25+", label: "Contributor / Specialist / Lead" },
  ];

  const currentIndex = LADDER.findIndex(l => l.role === eligibility.current);

  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4" /> Workforce Progression Ladder
      </h3>
      <p className="text-zinc-500 text-sm mb-6">
        Press Start Creative Tech Apprenticeship Program — your path from learner to paid creative professional.
      </p>

      <div className="space-y-1">
        {LADDER.map((step, i) => {
          const isCurrent = step.role === eligibility.current;
          const isPast = i < currentIndex;
          const ruleData = eligibility.eligible.find(e => e.roleName === step.role);

          return (
            <div
              key={step.role}
              className={`p-4 border transition ${
                isCurrent ? "bg-white/10 border-white text-white" :
                isPast ? "bg-zinc-900 border-zinc-700 text-zinc-400" :
                "bg-zinc-900/50 border-zinc-800 text-zinc-600"
              }`}
              data-testid={`ladder-step-${step.role}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isCurrent ? "bg-white" : isPast ? "bg-zinc-500" : "bg-zinc-800"}`} />
                  <div>
                    <div className="font-medium">{step.label}</div>
                    <div className="text-xs opacity-60">Level {step.level}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isCurrent && <span className="text-xs bg-white text-black px-2 py-0.5 font-bold">CURRENT</span>}
                  {isPast && <span className="text-xs text-zinc-500">Completed</span>}
                  {ruleData && !isPast && !isCurrent && (
                    ruleData.meetsRequirements ? (
                      <span className="text-xs bg-white/10 text-white px-2 py-0.5">Ready</span>
                    ) : (
                      <div className="text-right">
                        {ruleData.gaps.map((g, gi) => (
                          <div key={gi} className="text-xs text-zinc-600">{g}</div>
                        ))}
                      </div>
                    )
                  )}
                  <ChevronRight className="w-4 h-4 opacity-30" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
