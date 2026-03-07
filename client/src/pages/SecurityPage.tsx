import { Layout } from "@/components/layout/Layout";
import { Link } from "wouter";
import {
  ArrowLeft,
  Shield,
  Lock,
  Key,
  Server,
  Globe,
  FileText,
  AlertTriangle,
  CheckCircle,
  Eye,
  Clock,
  Zap,
} from "lucide-react";

const securitySections = [
  {
    icon: Lock,
    title: "Encryption",
    color: "amber",
    items: [
      { label: "Data at Rest", value: "AES-256-GCM encryption for all stored user data, projects, and assets" },
      { label: "Data in Transit", value: "TLS 1.3 enforced on all connections with HSTS preloading" },
      { label: "Key Management", value: "Hardware Security Module (HSM) backed key storage with automatic rotation" },
      { label: "Database Encryption", value: "Transparent Data Encryption (TDE) enabled on all database instances" },
      { label: "File Storage", value: "Server-side encryption with customer-managed keys for uploaded assets" },
    ],
  },
  {
    icon: Key,
    title: "Authentication & Authorization",
    color: "amber",
    items: [
      { label: "Authentication", value: "OAuth 2.0 / OpenID Connect with support for Google, GitHub, and email/password" },
      { label: "Multi-Factor Auth", value: "TOTP-based MFA available for all accounts; enforced for admin roles" },
      { label: "Session Management", value: "Secure, httpOnly, SameSite=Strict cookies with 24-hour expiration" },
      { label: "API Authentication", value: "Bearer token authentication with scoped permissions and automatic expiry" },
      { label: "RBAC", value: "Role-based access control: Admin, Creator, Viewer with granular permissions" },
    ],
  },
  {
    icon: Zap,
    title: "Rate Limiting & DDoS Protection",
    color: "amber",
    items: [
      { label: "API Rate Limits", value: "100 requests/minute for authenticated users, 20/minute for anonymous" },
      { label: "Upload Limits", value: "10MB per file, 100MB total per project, with virus scanning" },
      { label: "Brute Force Protection", value: "Account lockout after 5 failed login attempts with exponential backoff" },
      { label: "DDoS Mitigation", value: "Cloudflare-based DDoS protection with automatic traffic analysis" },
      { label: "Geo-blocking", value: "Optional IP-based geographic restrictions for enterprise accounts" },
    ],
  },
  {
    icon: Globe,
    title: "Security Headers",
    color: "amber",
    items: [
      { label: "Content-Security-Policy", value: "Strict CSP preventing XSS, inline scripts, and unauthorized resource loading" },
      { label: "X-Frame-Options", value: "DENY — prevents clickjacking by disallowing iframe embedding" },
      { label: "X-Content-Type-Options", value: "nosniff — prevents MIME type sniffing attacks" },
      { label: "Referrer-Policy", value: "strict-origin-when-cross-origin for privacy-preserving referrer handling" },
      { label: "Permissions-Policy", value: "Restricted camera, microphone, geolocation, and payment access" },
    ],
  },
  {
    icon: FileText,
    title: "Audit Logging",
    color: "amber",
    items: [
      { label: "Authentication Events", value: "All login attempts, logouts, MFA events, and session changes logged" },
      { label: "Data Access", value: "Read/write operations on sensitive data tracked with user identity and timestamp" },
      { label: "Admin Actions", value: "All administrative operations logged with before/after state snapshots" },
      { label: "API Usage", value: "Full request/response metadata logged for API key usage and rate limit events" },
      { label: "Retention", value: "Audit logs retained for 90 days with tamper-evident checksums" },
    ],
  },
];

export default function SecurityPage() {
  return (
    <Layout>
      <div className="min-h-screen bg-zinc-950 text-white">
        <header className="h-14 border-b-4 border-amber-500 flex items-center justify-between px-6 bg-zinc-900 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 hover:bg-amber-500 hover:text-black border-2 border-amber-500 transition-colors" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" />
              <h1 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Security Overview</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/compliance">
              <button className="px-3 py-1.5 text-xs font-black uppercase border-2 border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-colors" data-testid="link-compliance">
                Compliance
              </button>
            </Link>
            <Link href="/accessibility">
              <button className="px-3 py-1.5 text-xs font-black uppercase border-2 border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-black transition-colors" data-testid="link-accessibility">
                Accessibility
              </button>
            </Link>
          </div>
        </header>

        <div className="max-w-4xl mx-auto p-8 space-y-10">
          <section className="p-6 border-4 border-amber-500/50 bg-zinc-900">
            <div className="flex items-start gap-4">
              <Shield className="w-8 h-8 text-amber-400 shrink-0" />
              <div>
                <h2 className="font-black text-base uppercase tracking-wide text-amber-400 mb-2">Security First Architecture</h2>
                <p className="text-sm text-zinc-300 leading-relaxed" data-testid="text-security-intro">
                  Press Start CoMixx implements defense-in-depth security across all layers of the application stack.
                  Our security practices are aligned with industry standards including OWASP Top 10, NIST Cybersecurity Framework,
                  and SOC 2 requirements. All infrastructure runs on isolated, hardened containers with automated vulnerability scanning.
                </p>
              </div>
            </div>
          </section>

          {securitySections.map((section, sectionIndex) => {
            const Icon = section.icon;
            return (
              <section key={section.title} className="space-y-4">
                <div className="flex items-center gap-2 border-b-2 border-amber-500 pb-2">
                  <Icon className="w-5 h-5 text-amber-400" />
                  <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {section.title}
                  </h2>
                </div>

                <div className="p-6 border-4 border-zinc-700 bg-zinc-900 space-y-4">
                  {section.items.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-4 pb-4 border-b border-zinc-800 last:border-b-0 last:pb-0"
                      data-testid={`text-security-${sectionIndex}-${i}`}
                    >
                      <CheckCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="text-sm font-black uppercase text-amber-400">{item.label}</h4>
                        <p className="text-sm text-zinc-400 mt-0.5">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b-2 border-amber-500 pb-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Responsible Disclosure</h2>
            </div>

            <div className="p-6 border-4 border-zinc-700 bg-zinc-900 space-y-3">
              <p className="text-sm text-zinc-300" data-testid="text-disclosure-policy">
                If you discover a security vulnerability, please report it responsibly. We appreciate the security research
                community and will acknowledge valid reports.
              </p>
              <div className="flex items-center gap-3">
                <a
                  href="mailto:security@pressstartcomixx.com"
                  className="inline-flex items-center gap-2 px-4 py-2 border-2 border-amber-500 text-amber-400 text-sm font-black uppercase hover:bg-amber-500 hover:text-black transition-colors"
                  data-testid="link-report-vulnerability"
                >
                  <Lock className="w-4 h-4" />
                  Report a Vulnerability
                </a>
              </div>
              <p className="text-xs text-zinc-500">
                PGP key available upon request. We aim to acknowledge reports within 24 hours and provide
                resolution timelines within 72 hours.
              </p>
            </div>
          </section>

          <div className="text-center text-xs text-zinc-600 pb-8" data-testid="text-security-updated">
            Security practices last reviewed: {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    </Layout>
  );
}
