import { Layout } from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { Shield, ArrowLeft, Lock, Users, Clock, UserCheck, ShieldCheck, Mail, Ban, Globe, Cookie } from "lucide-react";
import { Link } from "wouter";

function LegalSection({ id, title, icon: Icon, color, borderColor, items }: {
  id: string; title: string; icon: any; color: string; borderColor?: string; items: string[];
}) {
  return (
    <section className="space-y-4" data-testid={`section-${id}`}>
      <div className="flex items-center gap-2 border-b-2 border-zinc-700 pb-2">
        <Icon className={`w-5 h-5 ${color}`} />
        <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h2>
      </div>
      <div className={`p-6 border-2 ${borderColor || "border-zinc-700"} bg-zinc-900`}>
        <ul className="space-y-3">
          {items.map((item: string, i: number) => (
            <li key={i} className="flex items-start gap-3 text-zinc-300" data-testid={`text-${id}-${i}`}>
              <span className={`${color} font-black mt-0.5`}>&#9654;</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/legal/privacy-policy"],
    queryFn: async () => {
      const res = await fetch("/api/legal/privacy-policy");
      if (!res.ok) throw new Error("Failed to load privacy policy");
      return res.json();
    },
  });

  return (
    <Layout>
      <div className="min-h-screen bg-zinc-950 text-white" data-testid="privacy-page">
        <header className="h-14 border-b-2 border-zinc-700 flex items-center justify-between px-6 bg-zinc-900 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 hover:bg-emerald-500 hover:text-black border-2 border-zinc-700 transition-colors" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              <h1 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }} data-testid="text-page-title">Privacy Policy</h1>
            </div>
          </div>
          {data && (
            <span className="text-xs text-zinc-500" data-testid="text-version">v{data.version} · Updated {data.lastUpdated}</span>
          )}
        </header>

        <div className="max-w-3xl mx-auto p-8 space-y-8">
          {isLoading && (
            <div className="flex items-center justify-center py-20" data-testid="loading-privacy">
              <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent animate-spin" />
            </div>
          )}

          {error && (
            <div className="p-6 border-2 border-red-500 bg-red-500/10 text-red-400" data-testid="error-privacy">
              Failed to load privacy policy. Please try again later.
            </div>
          )}

          {data && (
            <>
              <section className="space-y-4" data-testid="section-introduction">
                <div className="flex items-center gap-2 border-b-2 border-zinc-700 pb-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Introduction</h2>
                </div>
                <div className="p-6 border-2 border-zinc-700 bg-zinc-900">
                  <p className="text-zinc-300 leading-relaxed" data-testid="text-introduction">{data.content.introduction}</p>
                </div>
              </section>

              <LegalSection id="data-collection" title={data.content.dataCollection.title} icon={Lock} color="text-cyan-400" items={data.content.dataCollection.items} />
              <LegalSection id="student-data" title={data.content.studentData.title} icon={Users} color="text-amber-400" borderColor="border-amber-500/30" items={data.content.studentData.items} />
              <LegalSection id="no-sell" title={data.content.noSell.title} icon={Ban} color="text-red-400" borderColor="border-red-500/30" items={data.content.noSell.items} />
              <LegalSection id="data-retention" title={data.content.dataRetention.title} icon={Clock} color="text-purple-400" items={data.content.dataRetention.items} />
              <LegalSection id="data-rights" title={data.content.dataRights.title} icon={UserCheck} color="text-emerald-400" items={data.content.dataRights.items} />
              <LegalSection id="security" title={data.content.security.title} icon={ShieldCheck} color="text-cyan-400" items={data.content.security.items} />
              <LegalSection id="third-party" title={data.content.thirdParty.title} icon={Globe} color="text-purple-400" items={data.content.thirdParty.items} />
              <LegalSection id="cookies" title={data.content.cookies.title} icon={Cookie} color="text-amber-400" items={data.content.cookies.items} />

              <section className="space-y-4" data-testid="section-contact">
                <div className="flex items-center gap-2 border-b-2 border-zinc-700 pb-2">
                  <Mail className="w-5 h-5 text-emerald-400" />
                  <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Contact</h2>
                </div>
                <div className="p-6 border-2 border-emerald-500/30 bg-zinc-900">
                  <p className="text-zinc-300 leading-relaxed whitespace-pre-line" data-testid="text-contact">{data.content.contact.split(" | ").join("\n")}</p>
                </div>
              </section>

              <div className="text-center text-xs text-zinc-600 pt-4 border-t-2 border-zinc-800" data-testid="text-legal-links">
                <p>See also: <Link href="/terms" className="text-emerald-400 hover:underline">Terms of Service</Link> · <Link href="/disclaimer" className="text-emerald-400 hover:underline">Disclaimer</Link> · <Link href="/dmca" className="text-emerald-400 hover:underline">DMCA Policy</Link> · <Link href="/compliance" className="text-emerald-400 hover:underline">Compliance</Link></p>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
