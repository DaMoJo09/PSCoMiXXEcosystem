import { Layout } from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { Scale, ArrowLeft, FileText, UserCheck, Pencil, ShieldAlert, XCircle, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

export default function TermsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/legal/terms"],
    queryFn: async () => {
      const res = await fetch("/api/legal/terms");
      if (!res.ok) throw new Error("Failed to load terms of service");
      return res.json();
    },
  });

  const sections = data ? [
    { key: "acceptance", title: "Acceptance of Terms", icon: FileText, color: "text-emerald-400", borderColor: "border-emerald-500/30", content: data.content.acceptance },
    { key: "eligibility", title: "Eligibility", icon: UserCheck, color: "text-cyan-400", borderColor: "border-zinc-700", content: data.content.eligibility },
    { key: "content", title: "Content & Intellectual Property", icon: Pencil, color: "text-purple-400", borderColor: "border-zinc-700", content: data.content.content },
    { key: "prohibited", title: "Prohibited Conduct", icon: ShieldAlert, color: "text-red-400", borderColor: "border-red-500/30", content: data.content.prohibited },
    { key: "termination", title: "Termination", icon: XCircle, color: "text-amber-400", borderColor: "border-zinc-700", content: data.content.termination },
    { key: "liability", title: "Limitation of Liability", icon: AlertTriangle, color: "text-zinc-400", borderColor: "border-zinc-700", content: data.content.liability },
  ] : [];

  return (
    <Layout>
      <div className="min-h-screen bg-zinc-950 text-white" data-testid="terms-page">
        <header className="h-14 border-b-2 border-zinc-700 flex items-center justify-between px-6 bg-zinc-900 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 hover:bg-emerald-500 hover:text-black border-2 border-zinc-700 transition-colors" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-400" />
              <h1 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }} data-testid="text-page-title">Terms of Service</h1>
            </div>
          </div>
          {data && (
            <span className="text-xs text-zinc-500" data-testid="text-version">v{data.version} · Updated {data.lastUpdated}</span>
          )}
        </header>

        <div className="max-w-3xl mx-auto p-8 space-y-8">
          {isLoading && (
            <div className="flex items-center justify-center py-20" data-testid="loading-terms">
              <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent animate-spin" />
            </div>
          )}

          {error && (
            <div className="p-6 border-2 border-red-500 bg-red-500/10 text-red-400" data-testid="error-terms">
              Failed to load terms of service. Please try again later.
            </div>
          )}

          {sections.map(({ key, title, icon: Icon, color, borderColor, content }) => (
            <section key={key} className="space-y-4" data-testid={`section-${key}`}>
              <div className="flex items-center gap-2 border-b-2 border-zinc-700 pb-2">
                <Icon className={`w-5 h-5 ${color}`} />
                <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h2>
              </div>
              <div className={`p-6 border-2 ${borderColor} bg-zinc-900`}>
                <p className="text-zinc-300 leading-relaxed" data-testid={`text-${key}`}>{content}</p>
              </div>
            </section>
          ))}
        </div>
      </div>
    </Layout>
  );
}
