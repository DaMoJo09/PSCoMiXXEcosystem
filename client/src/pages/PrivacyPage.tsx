import { Layout } from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { Shield, ArrowLeft, Lock, Users, Clock, UserCheck, ShieldCheck, Mail } from "lucide-react";
import { Link } from "wouter";

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

              <section className="space-y-4" data-testid="section-data-collection">
                <div className="flex items-center gap-2 border-b-2 border-zinc-700 pb-2">
                  <Lock className="w-5 h-5 text-cyan-400" />
                  <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{data.content.dataCollection.title}</h2>
                </div>
                <div className="p-6 border-2 border-zinc-700 bg-zinc-900">
                  <ul className="space-y-3">
                    {data.content.dataCollection.items.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-zinc-300" data-testid={`text-data-collection-${i}`}>
                        <span className="text-cyan-400 font-black mt-0.5">▸</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              <section className="space-y-4" data-testid="section-student-data">
                <div className="flex items-center gap-2 border-b-2 border-zinc-700 pb-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{data.content.studentData.title}</h2>
                </div>
                <div className="p-6 border-2 border-amber-500/30 bg-zinc-900">
                  <ul className="space-y-3">
                    {data.content.studentData.items.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-zinc-300" data-testid={`text-student-data-${i}`}>
                        <span className="text-amber-400 font-black mt-0.5">▸</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              <section className="space-y-4" data-testid="section-data-retention">
                <div className="flex items-center gap-2 border-b-2 border-zinc-700 pb-2">
                  <Clock className="w-5 h-5 text-purple-400" />
                  <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{data.content.dataRetention.title}</h2>
                </div>
                <div className="p-6 border-2 border-zinc-700 bg-zinc-900">
                  <ul className="space-y-3">
                    {data.content.dataRetention.items.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-zinc-300" data-testid={`text-data-retention-${i}`}>
                        <span className="text-purple-400 font-black mt-0.5">▸</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              <section className="space-y-4" data-testid="section-data-rights">
                <div className="flex items-center gap-2 border-b-2 border-zinc-700 pb-2">
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                  <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{data.content.dataRights.title}</h2>
                </div>
                <div className="p-6 border-2 border-zinc-700 bg-zinc-900">
                  <ul className="space-y-3">
                    {data.content.dataRights.items.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-zinc-300" data-testid={`text-data-rights-${i}`}>
                        <span className="text-emerald-400 font-black mt-0.5">▸</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              <section className="space-y-4" data-testid="section-security">
                <div className="flex items-center gap-2 border-b-2 border-zinc-700 pb-2">
                  <ShieldCheck className="w-5 h-5 text-cyan-400" />
                  <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{data.content.security.title}</h2>
                </div>
                <div className="p-6 border-2 border-zinc-700 bg-zinc-900">
                  <ul className="space-y-3">
                    {data.content.security.items.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-zinc-300" data-testid={`text-security-${i}`}>
                        <span className="text-cyan-400 font-black mt-0.5">▸</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              <section className="space-y-4" data-testid="section-contact">
                <div className="flex items-center gap-2 border-b-2 border-zinc-700 pb-2">
                  <Mail className="w-5 h-5 text-emerald-400" />
                  <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Contact</h2>
                </div>
                <div className="p-6 border-2 border-emerald-500/30 bg-zinc-900">
                  <p className="text-zinc-300 leading-relaxed" data-testid="text-contact">{data.content.contact}</p>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
