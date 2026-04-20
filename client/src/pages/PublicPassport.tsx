import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import {
  Shield, Award, Star, TrendingUp, Briefcase, Zap, CheckCircle, ExternalLink,
  Clock, Sparkles, Users, BookOpen, Layers, Wrench, Globe
} from "lucide-react";

interface PassportPayload {
  identity: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
    coverImage?: string;
    tagline?: string;
    bio?: string;
    joinedAt: string;
    socialLinks?: Record<string, string> | null;
  };
  progression: {
    xp: number;
    level: number;
    creatorClass: string;
    ecosystemRole: string;
    totalMinutes: number;
    totalHours: number;
    ecosystemVerified: boolean;
  };
  stats: { creativity: number; storytelling: number; artistry: number; collaboration: number };
  skillsByCategory: { category: string; totalXp: number; eventCount: number }[];
  skillsByTaxonomy: { skill: string; label: string; totalXp: number; eventCount: number }[];
  toolsUsed: { toolUsed: string; totalXp: number; eventCount: number; lastUsed: string }[];
  sources: { sourceApp: string; totalXp: number; eventCount: number }[];
  recentActivity: any[];
  publishedWorks: { id: string; title: string; type: string; thumbnail?: string; createdAt: string }[];
  publishedCount: number;
  certifications: any[];
  productionCredits: any[];
  social: { followers: number; following: number; publishedCount: number };
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

const SOURCE_LABELS: Record<string, string> = {
  comixx: "PSCoMiXX",
  fxstudio: "FX Studio",
  streaming: "Streaming",
  lms: "LMS",
  unreal: "Unreal Engine",
  reallusion: "Reallusion",
  maxon: "Maxon",
  ai_tools: "AI Tools",
};

function fmt(n: number) { return (n || 0).toLocaleString(); }

export default function PublicPassport() {
  const params = useParams<{ username: string }>();
  const [data, setData] = useState<PassportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!params.username) return;
    setLoading(true);
    fetch(`/api/public/passport/${encodeURIComponent(params.username)}`)
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.message || "Passport not available");
        }
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [params.username]);

  useEffect(() => {
    if (data?.identity?.name) {
      document.title = `${data.identity.name} — Skill Passport · Press Start`;
    }
  }, [data]);

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-zinc-400">
        <div className="text-center">
          <Shield className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p data-testid="text-passport-error">{error || "Passport not found"}</p>
          <Link href="/" className="text-zinc-500 text-sm hover:text-white mt-4 inline-block">← Back to Press Start</Link>
        </div>
      </div>
    );
  }

  const { identity, progression, stats, skillsByTaxonomy, toolsUsed, sources,
          publishedWorks, certifications, productionCredits, social, recentActivity } = data;

  const xpPerLevel = 500;
  const xpInLevel = progression.xp % xpPerLevel;
  const xpPercent = Math.min(100, (xpInLevel / xpPerLevel) * 100);
  const maxSkillXp = Math.max(1, ...skillsByTaxonomy.map((s) => s.totalXp));
  const maxToolXp = Math.max(1, ...toolsUsed.map((t) => t.totalXp));

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Cover banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black overflow-hidden border-b border-zinc-800">
        {identity.coverImage && (
          <img src={identity.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute top-4 left-4 flex items-center gap-2 text-xs text-zinc-400">
          <Shield className="w-4 h-4" />
          <span className="tracking-widest font-semibold">PRESS START · SKILL PASSPORT</span>
        </div>
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={copyShareLink}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 backdrop-blur text-white text-xs font-semibold rounded transition flex items-center gap-1.5"
            data-testid="button-copy-passport-link"
          >
            <ExternalLink className="w-3 h-3" />
            {copied ? "Link copied" : "Share"}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-16 md:-mt-20 pb-16">
        {/* Identity card */}
        <div className="flex flex-col md:flex-row gap-6 items-start mb-8">
          <div className="relative">
            <div className="w-32 h-32 md:w-40 md:h-40 bg-zinc-900 border-4 border-black rounded-full overflow-hidden">
              {identity.avatar ? (
                <img src={identity.avatar} alt={identity.name} className="w-full h-full object-cover" data-testid="img-passport-avatar" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-zinc-600">
                  {identity.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
              )}
            </div>
            {progression.ecosystemVerified && (
              <div
                className="absolute -bottom-1 -right-1 bg-emerald-500 text-black rounded-full p-1.5 border-4 border-black"
                title="Ecosystem-verified creator"
                data-testid="badge-ecosystem-verified"
              >
                <CheckCircle className="w-4 h-4" />
              </div>
            )}
          </div>
          <div className="flex-1 pt-4 md:pt-20">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-passport-name">{identity.name}</h1>
              <span className="text-zinc-500 text-sm">@{identity.username}</span>
              {progression.ecosystemVerified && (
                <span className="text-[10px] uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">
                  Verified
                </span>
              )}
            </div>
            {identity.tagline && <p className="text-zinc-300 mt-1" data-testid="text-passport-tagline">{identity.tagline}</p>}
            {identity.bio && <p className="text-zinc-500 text-sm mt-2 max-w-2xl" data-testid="text-passport-bio">{identity.bio}</p>}
            <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
              <span>Member since {new Date(identity.joinedAt).getFullYear()}</span>
              <span>·</span>
              <span data-testid="text-passport-followers">{social.followers} followers</span>
              <span>·</span>
              <span>{social.publishedCount} published works</span>
            </div>
          </div>
        </div>

        {/* Headline progression */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <Stat label="Total XP" value={fmt(progression.xp)} testId="stat-xp">
            <div className="w-full h-1 bg-zinc-800 mt-2 rounded">
              <div className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded transition-all" style={{ width: `${xpPercent}%` }} />
            </div>
          </Stat>
          <Stat label="Level" value={String(progression.level)} sub={progression.creatorClass} testId="stat-level" />
          <Stat label="Role" value={ROLE_LABELS[progression.ecosystemRole] || progression.ecosystemRole} small testId="stat-role" />
          <Stat label="Hours Logged" value={String(progression.totalHours)} testId="stat-hours" />
          <Stat label="Certifications" value={String(certifications.length)} testId="stat-certs" />
        </div>

        {/* Skills + tools side-by-side */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Card title="Skills" icon={<Layers className="w-4 h-4" />} testId="section-skills">
            {skillsByTaxonomy.length === 0 ? (
              <Empty text="No skill activity yet." />
            ) : (
              <div className="space-y-3">
                {skillsByTaxonomy.map((s) => (
                  <div key={s.skill} data-testid={`row-skill-${s.skill}`}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-300 font-medium">{s.label}</span>
                      <span className="text-zinc-500 font-mono">{fmt(s.totalXp)} XP · {s.eventCount}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-900 rounded">
                      <div className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-400 rounded transition-all" style={{ width: `${(s.totalXp / maxSkillXp) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Tools Used" icon={<Wrench className="w-4 h-4" />} testId="section-tools">
            {toolsUsed.length === 0 ? (
              <Empty text="No tool usage tracked yet." />
            ) : (
              <div className="space-y-2">
                {toolsUsed.slice(0, 10).map((t) => (
                  <div key={t.toolUsed} className="flex items-center gap-3" data-testid={`row-tool-${t.toolUsed}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-300 capitalize truncate">{t.toolUsed.replace(/_/g, " ")}</span>
                        <span className="text-zinc-500 font-mono">{fmt(t.totalXp)} XP</span>
                      </div>
                      <div className="h-1 bg-zinc-900 rounded">
                        <div className="h-full bg-emerald-500/60 rounded" style={{ width: `${(t.totalXp / maxToolXp) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Ecosystem sources */}
        {sources.length > 0 && (
          <Card title="Ecosystem Activity" icon={<Globe className="w-4 h-4" />} className="mb-8" testId="section-sources">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {sources.map((s) => (
                <div key={s.sourceApp} className="bg-black border border-zinc-800 p-3 rounded" data-testid={`source-${s.sourceApp}`}>
                  <div className="text-zinc-500 text-[10px] uppercase tracking-wider">{SOURCE_LABELS[s.sourceApp] || s.sourceApp}</div>
                  <div className="text-white font-bold mt-1">{fmt(s.totalXp)} <span className="text-xs text-zinc-500 font-normal">XP</span></div>
                  <div className="text-zinc-600 text-[10px] mt-0.5">{s.eventCount} events</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Creator stats */}
        <Card title="Creator Stats" icon={<Sparkles className="w-4 h-4" />} className="mb-8" testId="section-creator-stats">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <CreatorStat label="Creativity" value={stats.creativity} max={100} />
            <CreatorStat label="Storytelling" value={stats.storytelling} max={100} />
            <CreatorStat label="Artistry" value={stats.artistry} max={100} />
            <CreatorStat label="Collaboration" value={stats.collaboration} max={100} />
          </div>
        </Card>

        {/* Published Works */}
        <Card title="Published Works" icon={<BookOpen className="w-4 h-4" />} className="mb-8" testId="section-works">
          {publishedWorks.length === 0 ? (
            <Empty text="No published works yet." />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {publishedWorks.map((w) => (
                <div key={w.id} className="group" data-testid={`work-${w.id}`}>
                  <div className="aspect-[3/4] bg-zinc-900 border border-zinc-800 rounded overflow-hidden mb-1">
                    {w.thumbnail ? (
                      <img src={w.thumbnail} alt={w.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">{w.type}</div>
                    )}
                  </div>
                  <div className="text-xs text-zinc-300 truncate" title={w.title}>{w.title}</div>
                  <div className="text-[10px] text-zinc-600 capitalize">{w.type}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Certifications */}
        {certifications.length > 0 && (
          <Card title="Certifications" icon={<Award className="w-4 h-4" />} className="mb-8" testId="section-certs">
            <div className="grid md:grid-cols-2 gap-3">
              {certifications.map((c: any) => (
                <div key={c.id} className="bg-black border border-zinc-800 p-3 rounded flex items-start gap-3" data-testid={`cert-${c.id}`}>
                  <div className="w-10 h-10 bg-amber-500/15 border border-amber-500/30 rounded flex items-center justify-center flex-shrink-0">
                    <Award className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-semibold truncate">{c.certification?.name || "Certification"}</div>
                    <div className="text-zinc-500 text-xs">{c.certification?.issuer || "Press Start"}</div>
                    {c.earnedAt && <div className="text-zinc-600 text-[10px] mt-0.5">Earned {new Date(c.earnedAt).toLocaleDateString()}</div>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Production credits */}
        {productionCredits.length > 0 && (
          <Card title="Production Credits" icon={<Briefcase className="w-4 h-4" />} className="mb-8" testId="section-credits">
            <div className="space-y-2">
              {productionCredits.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0" data-testid={`credit-${c.id}`}>
                  <div>
                    <div className="text-zinc-300 text-sm">{c.roleName}</div>
                    <div className="text-zinc-600 text-xs">{c.projectName} — {c.department}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${c.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Recent activity (compact) */}
        {recentActivity.length > 0 && (
          <Card title="Recent Activity" icon={<Clock className="w-4 h-4" />} testId="section-activity">
            <div className="space-y-1">
              {recentActivity.slice(0, 8).map((e: any) => (
                <div key={e.id} className="flex items-center justify-between py-1.5 text-xs border-b border-zinc-900 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Zap className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                    <span className="text-zinc-400 capitalize truncate">{e.action?.replace(/_/g, " ")}</span>
                    {e.sourceApp && <span className="text-zinc-700">via {SOURCE_LABELS[e.sourceApp] || e.sourceApp}</span>}
                  </div>
                  <span className="text-zinc-500 font-mono">+{e.xpAmount}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="mt-12 pt-6 border-t border-zinc-900 text-center text-xs text-zinc-600">
          Verified by the Press Start Creative Tech Apprenticeship Program · <Link href="/" className="hover:text-white">presstart.com</Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, small, children, testId }: {
  label: string; value: string; sub?: string; small?: boolean; children?: React.ReactNode; testId?: string;
}) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 p-4 rounded" data-testid={testId}>
      <div className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1">{label}</div>
      <div className={`font-bold text-white ${small ? "text-base" : "text-2xl"}`}>{value}</div>
      {sub && <div className="text-zinc-500 text-xs mt-0.5">{sub}</div>}
      {children}
    </div>
  );
}

function Card({ title, icon, children, className = "", testId }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; className?: string; testId?: string;
}) {
  return (
    <div className={`bg-zinc-950 border border-zinc-800 p-5 rounded ${className}`} data-testid={testId}>
      <h3 className="text-white text-sm font-semibold mb-4 flex items-center gap-2">{icon} {title}</h3>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-zinc-600 text-sm text-center py-6">{text}</p>;
}

function CreatorStat({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-500 font-mono">{value}/{max}</span>
      </div>
      <div className="h-1.5 bg-zinc-900 rounded">
        <div className="h-full bg-white rounded" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
