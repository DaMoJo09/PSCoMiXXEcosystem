import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import {
  BookOpen, Gamepad2, Globe, Film, CreditCard, Award,
  CheckCircle2, Lock, ChevronRight, Shield, Copy, ExternalLink,
  Trophy, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const ICON_MAP: Record<string, any> = {
  BookOpen, Gamepad2, Globe, Film, CreditCard, Award, Trophy, Star, Shield,
};

interface ProgressItem {
  current: number;
  required: number;
  met: boolean;
}

interface CertData {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  requiredXp: number;
  requiredLevel: number;
  requiredPublished: number;
  requiredProjectTypes: string[];
  requiredProjectCount: number;
  earned: boolean;
  earnedAt: string | null;
  verificationCode: string | null;
  eligible: boolean;
  progress: {
    xp: ProgressItem;
    level: ProgressItem;
    projects: ProgressItem;
    published: ProgressItem;
  };
}

function ProgressBar({ current, required, met, label }: { current: number; required: number; met: boolean; label: string }) {
  const pct = required > 0 ? Math.min((current / required) * 100, 100) : 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-bold">
        <span className={met ? "text-green-400" : "text-zinc-400"}>{label}</span>
        <span className={met ? "text-green-400" : "text-zinc-500"}>
          {current}/{required} {met && <CheckCircle2 className="w-3 h-3 inline ml-1" />}
        </span>
      </div>
      <div className="h-2 bg-zinc-800 border border-zinc-700 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${met ? "bg-green-500" : "bg-cyan-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function CertCard({ cert, onClaim, claiming }: { cert: CertData; onClaim: (slug: string) => void; claiming: boolean }) {
  const IconComponent = ICON_MAP[cert.icon] || Award;
  const [showDetails, setShowDetails] = useState(false);
  const { toast } = useToast();

  const typeLabels: Record<string, string> = {
    comic: "Comics", vn: "Visual Novels", cyoa: "CYOA", card: "Cards", motion: "Motion", cover: "Covers",
  };

  const copyCode = () => {
    if (cert.verificationCode) {
      navigator.clipboard.writeText(cert.verificationCode);
      toast({ title: "Verification code copied" });
    }
  };

  return (
    <div
      className={`border-2 bg-card transition-all ${
        cert.earned
          ? "border-green-500 shadow-lg shadow-green-500/10"
          : cert.eligible
          ? "border-cyan-500 shadow-lg shadow-cyan-500/10"
          : "border-border hover:border-zinc-600"
      }`}
      data-testid={`cert-card-${cert.slug}`}
    >
      <div className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className={`p-3 border-2 ${
            cert.earned ? "border-green-500 bg-green-500/10" : cert.eligible ? "border-cyan-500 bg-cyan-500/10" : "border-zinc-600 bg-zinc-800"
          }`}>
            <IconComponent className={`w-8 h-8 ${cert.earned ? "text-green-400" : cert.eligible ? "text-cyan-400" : "text-zinc-500"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-black tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }} data-testid={`cert-title-${cert.slug}`}>
                {cert.title}
              </h3>
              {cert.earned && (
                <span className="px-2 py-0.5 text-xs font-bold bg-green-500/20 text-green-400 border border-green-500">
                  EARNED
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{cert.description}</p>
            {cert.requiredProjectTypes.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {cert.requiredProjectTypes.map(t => (
                  <span key={t} className="px-2 py-0.5 text-[10px] font-bold border border-zinc-600 text-zinc-400 uppercase">
                    {typeLabels[t] || t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {cert.earned ? (
          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Earned {new Date(cert.earnedAt!).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 p-3">
              <Shield className="w-4 h-4 text-green-400 flex-shrink-0" />
              <code className="text-sm font-mono text-green-400 flex-1 truncate" data-testid={`cert-code-${cert.slug}`}>
                {cert.verificationCode}
              </code>
              <button onClick={copyCode} className="text-zinc-400 hover:text-white" data-testid={`btn-copy-code-${cert.slug}`}>
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <a
              href={`/verify/${cert.verificationCode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 font-bold"
              data-testid={`link-verify-${cert.slug}`}
            >
              <ExternalLink className="w-3 h-3" /> VIEW PUBLIC VERIFICATION PAGE
            </a>
          </div>
        ) : (
          <>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-xs font-bold text-cyan-400 hover:text-cyan-300 mb-3"
              data-testid={`btn-details-${cert.slug}`}
            >
              <ChevronRight className={`w-3 h-3 transition-transform ${showDetails ? "rotate-90" : ""}`} />
              {showDetails ? "HIDE" : "SHOW"} REQUIREMENTS
            </button>

            {showDetails && (
              <div className="space-y-2 mb-4">
                <ProgressBar current={cert.progress.xp.current} required={cert.progress.xp.required} met={cert.progress.xp.met} label="XP" />
                <ProgressBar current={cert.progress.level.current} required={cert.progress.level.required} met={cert.progress.level.met} label="Level" />
                <ProgressBar current={cert.progress.projects.current} required={cert.progress.projects.required} met={cert.progress.projects.met} label="Projects Created" />
                <ProgressBar current={cert.progress.published.current} required={cert.progress.published.required} met={cert.progress.published.met} label="Projects Published" />
              </div>
            )}

            {cert.eligible ? (
              <Button
                onClick={() => onClaim(cert.slug)}
                disabled={claiming}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold"
                data-testid={`btn-claim-${cert.slug}`}
              >
                <Trophy className="w-4 h-4 mr-2" />
                {claiming ? "CLAIMING..." : "CLAIM CERTIFICATION"}
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-xs text-zinc-500 font-bold">
                <Lock className="w-4 h-4" />
                REQUIREMENTS NOT MET
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function VerifyPage({ code }: { code: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["verify-cert", code],
    queryFn: async () => {
      const res = await fetch(`/api/certifications/verify/${code}`);
      if (!res.ok) return null;
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 mx-auto text-cyan-400 animate-pulse" />
          <p className="text-muted-foreground">Verifying certification...</p>
        </div>
      </div>
    );
  }

  if (!data || !data.valid) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto px-6">
          <Shield className="w-16 h-16 mx-auto text-red-400" />
          <h1 className="text-2xl font-black" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>INVALID CODE</h1>
          <p className="text-muted-foreground">This verification code is not valid or has expired.</p>
        </div>
      </div>
    );
  }

  const portfolio = data.portfolio as any;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <Shield className="w-20 h-20 mx-auto text-green-400 mb-4" />
          <h1 className="text-3xl font-black tracking-tight mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            VERIFIED CERTIFICATION
          </h1>
          <p className="text-green-400 font-bold text-sm">This credential has been verified by Press Start</p>
        </div>

        <div className="border-2 border-green-500 bg-zinc-900 p-8 space-y-6">
          <div className="text-center border-b border-zinc-700 pb-6">
            <p className="text-xs text-zinc-500 font-bold mb-2 uppercase tracking-widest">Press Start Ecosystem</p>
            <h2 className="text-2xl font-black text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {data.certification}
            </h2>
            <p className="text-lg text-cyan-400 font-bold">{data.holder?.name}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-zinc-500 font-bold block mb-1">EARNED</span>
              <span className="font-bold">{new Date(data.earnedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
            </div>
            <div>
              <span className="text-xs text-zinc-500 font-bold block mb-1">VERIFICATION ID</span>
              <code className="text-green-400 font-mono text-xs">{data.verificationCode}</code>
            </div>
            {portfolio && (
              <>
                <div>
                  <span className="text-xs text-zinc-500 font-bold block mb-1">LEVEL AT CERTIFICATION</span>
                  <span className="font-bold">Level {portfolio.level} — {portfolio.levelTitle}</span>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 font-bold block mb-1">TOTAL XP</span>
                  <span className="font-bold">{portfolio.xp?.toLocaleString()} XP</span>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 font-bold block mb-1">PROJECTS CREATED</span>
                  <span className="font-bold">{portfolio.projectCount}</span>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 font-bold block mb-1">PROJECTS PUBLISHED</span>
                  <span className="font-bold">{portfolio.publishedCount}</span>
                </div>
              </>
            )}
          </div>

          <div className="border-t border-zinc-700 pt-4 text-center">
            <p className="text-xs text-zinc-500">
              Verified by <span className="text-cyan-400 font-bold">pscomixx.com</span> — Press Start Ecosystem
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export { VerifyPage };

export default function CertificationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: certs = [], isLoading } = useQuery<CertData[]>({
    queryKey: ["/api/certifications"],
    queryFn: async () => {
      const res = await fetch("/api/certifications", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  const claimMutation = useMutation({
    mutationFn: async (slug: string) => {
      const res = await fetch(`/api/certifications/${slug}/claim`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/certifications"] });
      toast({ title: `Certification earned! Code: ${data.verificationCode}` });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const earnedCount = certs.filter(c => c.earned).length;
  const eligibleCount = certs.filter(c => c.eligible && !c.earned).length;

  if (!user) {
    return (
      <Layout>
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          <div className="text-center space-y-4">
            <Award className="w-16 h-16 mx-auto text-cyan-400" />
            <h1 className="text-3xl font-black" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>CERTIFICATIONS</h1>
            <p className="text-muted-foreground">Sign in to view and earn certifications</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-black tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }} data-testid="text-certifications-title">
              CERTIFICATIONS
            </h1>
            <p className="text-muted-foreground mt-1">
              Earn industry-recognized credentials by creating and publishing real work across the Press Start ecosystem.
            </p>
            <div className="flex items-center gap-4 mt-3">
              <span className="px-3 py-1 text-xs font-bold border border-green-500 text-green-400 bg-green-500/10">
                {earnedCount} EARNED
              </span>
              {eligibleCount > 0 && (
                <span className="px-3 py-1 text-xs font-bold border border-cyan-500 text-cyan-400 bg-cyan-500/10 animate-pulse">
                  {eligibleCount} READY TO CLAIM
                </span>
              )}
              <span className="px-3 py-1 text-xs font-bold border border-zinc-600 text-zinc-400">
                {certs.length} TOTAL
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="border-2 border-border bg-card animate-pulse p-6">
                  <div className="flex gap-4">
                    <div className="w-14 h-14 bg-zinc-800" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-zinc-800 w-3/4" />
                      <div className="h-4 bg-zinc-800 w-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="cert-grid">
              {certs.map(cert => (
                <CertCard
                  key={cert.id}
                  cert={cert}
                  onClaim={(slug) => claimMutation.mutate(slug)}
                  claiming={claimMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}