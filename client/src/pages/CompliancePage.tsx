import { Layout } from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft,
  Shield,
  CheckCircle,
  AlertTriangle,
  Clock,
  Lock,
  Eye,
  FileText,
  Server,
  Users,
  Bell,
} from "lucide-react";

interface Certification {
  name: string;
  status: "compliant" | "in-progress" | "planned";
  description: string;
}

interface ComplianceData {
  certifications: Certification[];
  securityMeasures: string[];
  dataProtection: string[];
  incidentResponse: { step: string; description: string }[];
  lastUpdated: string;
}

const fallbackData: ComplianceData = {
  certifications: [
    { name: "FERPA", status: "in-progress", description: "Family Educational Rights and Privacy Act — DPA template, school admin role, and audit logging in active development. Not yet certified." },
    { name: "COPPA", status: "in-progress", description: "Children's Online Privacy Protection Act — verifiable parental consent flow and under-13 data handling are being built. Do not enroll users under 13 until this is marked compliant." },
    { name: "CIPA", status: "in-progress", description: "Children's Internet Protection Act — content filtering controls in development." },
    { name: "SOC 2 Type II", status: "planned", description: "Service Organization Control 2 audit for security, availability, and confidentiality" },
    { name: "WCAG 2.1 AA", status: "compliant", description: "Web Content Accessibility Guidelines Level AA conformance" },
  ],
  securityMeasures: [
    "AES-256 encryption at rest for all stored data",
    "TLS 1.3 encryption in transit for all API communications",
    "Multi-factor authentication (MFA) support",
    "Role-based access control (RBAC)",
    "Regular penetration testing and vulnerability assessments",
    "Automated security patch management",
    "IP-based rate limiting and DDoS protection",
    "Content Security Policy (CSP) headers enforced",
  ],
  dataProtection: [
    "Data minimization — only essential data collected",
    "Right to erasure — users can request full data deletion",
    "Data portability — export all user data in standard formats",
    "Consent management — granular opt-in/opt-out controls",
    "Data retention policies — automatic purging of inactive data",
    "Privacy by design — privacy considerations in every feature",
  ],
  incidentResponse: [
    { step: "Detection", description: "Automated monitoring and alerting systems detect anomalies within 5 minutes" },
    { step: "Triage", description: "Security team assesses severity and scope within 30 minutes" },
    { step: "Containment", description: "Isolate affected systems and prevent further exposure" },
    { step: "Notification", description: "Affected users notified within 72 hours per regulatory requirements" },
    { step: "Recovery", description: "Restore systems from verified clean backups" },
    { step: "Post-Mortem", description: "Root cause analysis and preventive measures documented" },
  ],
  lastUpdated: new Date().toISOString(),
};

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
    compliant: { bg: "bg-emerald-500/20 border-emerald-500", text: "text-emerald-400", icon: CheckCircle },
    "in-progress": { bg: "bg-amber-500/20 border-amber-500", text: "text-amber-400", icon: Clock },
    planned: { bg: "bg-cyan-500/20 border-cyan-500", text: "text-cyan-400", icon: AlertTriangle },
  };
  const c = config[status] || config.planned;
  const Icon = c.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-black uppercase border-2 ${c.bg} ${c.text} ${c.bg.includes("border") ? "" : "border-zinc-600"}`}
      style={{ borderColor: c.bg.includes("emerald") ? "#10b981" : c.bg.includes("amber") ? "#f59e0b" : "#06b6d4" }}
      data-testid={`badge-status-${status}`}
    >
      <Icon className="w-3 h-3" />
      {status.replace("-", " ")}
    </span>
  );
}

export default function CompliancePage() {
  const { data, isLoading, error } = useQuery<ComplianceData>({
    queryKey: ["compliance-overview"],
    queryFn: async () => {
      const res = await fetch("/api/compliance/overview");
      if (!res.ok) throw new Error("Failed to fetch compliance data");
      return res.json();
    },
    retry: 1,
    staleTime: 300000,
  });

  const compliance = data || fallbackData;

  return (
    <Layout>
      <div className="min-h-screen bg-zinc-950 text-white">
        <header className="h-14 border-b-4 border-emerald-500 flex items-center justify-between px-6 bg-zinc-900 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 hover:bg-emerald-500 hover:text-black border-2 border-emerald-500 transition-colors" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              <h1 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Compliance Overview</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/accessibility">
              <button className="px-3 py-1.5 text-xs font-black uppercase border-2 border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-black transition-colors" data-testid="link-accessibility">
                Accessibility
              </button>
            </Link>
            <Link href="/security">
              <button className="px-3 py-1.5 text-xs font-black uppercase border-2 border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-black transition-colors" data-testid="link-security">
                Security
              </button>
            </Link>
          </div>
        </header>

        {isLoading && (
          <div className="flex items-center justify-center py-20" data-testid="loading-compliance">
            <div className="animate-pulse text-emerald-400 font-black uppercase tracking-widest">Loading compliance data...</div>
          </div>
        )}

        <div className="max-w-4xl mx-auto p-8 space-y-10">
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b-2 border-emerald-500 pb-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Certifications & Standards</h2>
            </div>

            <div className="grid gap-4">
              {compliance.certifications.map((cert, i) => (
                <div
                  key={cert.name}
                  className="p-5 border-4 border-zinc-700 bg-zinc-900 hover:border-emerald-500/50 transition-colors"
                  data-testid={`card-certification-${i}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-black text-base uppercase tracking-wide">{cert.name}</h3>
                    <StatusBadge status={cert.status} />
                  </div>
                  <p className="text-sm text-zinc-400">{cert.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b-2 border-emerald-500 pb-2">
              <Lock className="w-5 h-5 text-emerald-400" />
              <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Security Measures</h2>
            </div>

            <div className="p-6 border-4 border-zinc-700 bg-zinc-900">
              <ul className="space-y-3">
                {compliance.securityMeasures.map((measure, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm" data-testid={`text-security-measure-${i}`}>
                    <Shield className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span className="text-zinc-300">{measure}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b-2 border-emerald-500 pb-2">
              <Eye className="w-5 h-5 text-emerald-400" />
              <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Data Protection</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {compliance.dataProtection.map((feature, i) => (
                <div
                  key={i}
                  className="p-4 border-4 border-zinc-700 bg-zinc-900 hover:border-cyan-500/50 transition-colors"
                  data-testid={`card-data-protection-${i}`}
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                    <span className="text-sm text-zinc-300">{feature}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b-2 border-emerald-500 pb-2">
              <Bell className="w-5 h-5 text-emerald-400" />
              <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Incident Response Plan</h2>
            </div>

            <div className="p-6 border-4 border-zinc-700 bg-zinc-900 space-y-4">
              {compliance.incidentResponse.map((item, i) => (
                <div key={i} className="flex items-start gap-4" data-testid={`text-incident-step-${i}`}>
                  <div className="w-8 h-8 border-2 border-amber-500 bg-amber-500/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-black text-amber-400">{i + 1}</span>
                  </div>
                  <div>
                    <h4 className="font-black text-sm uppercase text-amber-400">{item.step}</h4>
                    <p className="text-sm text-zinc-400">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="text-center text-xs text-zinc-600 pb-8" data-testid="text-last-updated">
            Last updated: {new Date(compliance.lastUpdated).toLocaleDateString()}
          </div>
        </div>
      </div>
    </Layout>
  );
}
