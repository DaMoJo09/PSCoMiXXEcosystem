import { Layout } from "@/components/layout/Layout";
import { Gavel, ArrowLeft, FileText, AlertTriangle, Shield, Mail } from "lucide-react";
import { Link } from "wouter";

export default function DMCAPage() {
  return (
    <Layout>
      <div className="min-h-screen bg-zinc-950 text-white" data-testid="dmca-page">
        <header className="h-14 border-b-2 border-zinc-700 flex items-center justify-between px-6 bg-zinc-900 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 hover:bg-emerald-500 hover:text-black border-2 border-zinc-700 transition-colors" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <div className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-emerald-400" />
              <h1 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }} data-testid="text-page-title">DMCA Policy</h1>
            </div>
          </div>
          <span className="text-xs text-zinc-500" data-testid="text-version">v2.0 · Updated March 2026</span>
        </header>

        <div className="max-w-3xl mx-auto p-8 space-y-8">
          <section className="space-y-4" data-testid="section-overview">
            <div className="flex items-center gap-2 border-b-2 border-zinc-700 pb-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Copyright Protection</h2>
            </div>
            <div className="p-6 border-2 border-emerald-500/30 bg-zinc-900">
              <p className="text-zinc-300 leading-relaxed" data-testid="text-overview">
                MADMixedMedia respects the intellectual property rights of others and expects all users of Press Start CoMiXX to do the same. In accordance with the Digital Millennium Copyright Act of 1998 (17 U.S.C. § 512) ("DMCA"), we will respond expeditiously to valid claims of copyright infringement that are reported to our designated agent.
              </p>
            </div>
          </section>

          <section className="space-y-4" data-testid="section-filing">
            <div className="flex items-center gap-2 border-b-2 border-zinc-700 pb-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Filing a DMCA Takedown Notice</h2>
            </div>
            <div className="p-6 border-2 border-zinc-700 bg-zinc-900 space-y-4">
              <p className="text-zinc-300 leading-relaxed" data-testid="text-filing-intro">
                If you believe that your copyrighted work has been copied or used on the Platform in a way that constitutes copyright infringement, please submit a written DMCA takedown notice to our designated agent containing the following information:
              </p>
              <ul className="space-y-3">
                {[
                  "A physical or electronic signature of the copyright owner or a person authorized to act on their behalf",
                  "Identification of the copyrighted work claimed to have been infringed, or if multiple copyrighted works are covered by a single notification, a representative list of such works",
                  "Identification of the material that is claimed to be infringing or to be the subject of infringing activity, and information reasonably sufficient to permit us to locate the material on the Platform (such as a URL or screenshot)",
                  "Your contact information, including your name, mailing address, telephone number, and email address",
                  "A statement that you have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law",
                  "A statement, made under penalty of perjury, that the above information in your notification is accurate and that you are the copyright owner or are authorized to act on behalf of the copyright owner",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-zinc-300" data-testid={`text-filing-${i}`}>
                    <span className="text-cyan-400 font-black mt-0.5">{i + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="space-y-4" data-testid="section-agent">
            <div className="flex items-center gap-2 border-b-2 border-zinc-700 pb-2">
              <Mail className="w-5 h-5 text-amber-400" />
              <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Designated Agent</h2>
            </div>
            <div className="p-6 border-2 border-amber-500/30 bg-zinc-900 space-y-2">
              <p className="text-zinc-300" data-testid="text-agent-email"><span className="text-amber-400 font-bold">Email:</span> dmca@pscomixx.com</p>
              <p className="text-zinc-300" data-testid="text-agent-subject"><span className="text-amber-400 font-bold">Subject Line:</span> DMCA Takedown Notice - [Description]</p>
              <p className="text-zinc-300 text-sm mt-4" data-testid="text-agent-response">We will respond to valid DMCA notices within 72 hours and may remove or disable access to the allegedly infringing material.</p>
            </div>
          </section>

          <section className="space-y-4" data-testid="section-counter">
            <div className="flex items-center gap-2 border-b-2 border-zinc-700 pb-2">
              <Gavel className="w-5 h-5 text-purple-400" />
              <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Counter-Notification</h2>
            </div>
            <div className="p-6 border-2 border-zinc-700 bg-zinc-900 space-y-4">
              <p className="text-zinc-300 leading-relaxed" data-testid="text-counter-intro">
                If you believe that your content was removed or disabled as a result of mistake or misidentification, you may submit a counter-notification to our designated agent containing:
              </p>
              <ul className="space-y-3">
                {[
                  "Your physical or electronic signature",
                  "Identification of the material that has been removed or to which access has been disabled, and the location at which the material appeared before it was removed or disabled",
                  "A statement, under penalty of perjury, that you have a good faith belief that the material was removed or disabled as a result of mistake or misidentification",
                  "Your name, address, and telephone number, and a statement that you consent to the jurisdiction of the federal court for the judicial district in which your address is located, and that you will accept service of process from the person who provided the original notification",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-zinc-300" data-testid={`text-counter-${i}`}>
                    <span className="text-purple-400 font-black mt-0.5">{i + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="space-y-4" data-testid="section-repeat">
            <div className="flex items-center gap-2 border-b-2 border-zinc-700 pb-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Repeat Infringers</h2>
            </div>
            <div className="p-6 border-2 border-red-500/30 bg-zinc-900">
              <p className="text-zinc-300 leading-relaxed" data-testid="text-repeat">
                In accordance with the DMCA, MADMixedMedia maintains a policy of terminating the accounts of users who are repeat infringers of intellectual property rights. If a user receives multiple valid DMCA takedown notices, their account will be permanently terminated and they will be prohibited from creating new accounts on the Platform. We track all DMCA notices and counter-notifications as part of our compliance records.
              </p>
            </div>
          </section>

          <section className="space-y-4" data-testid="section-good-faith">
            <div className="flex items-center gap-2 border-b-2 border-zinc-700 pb-2">
              <Shield className="w-5 h-5 text-zinc-400" />
              <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Good Faith Warning</h2>
            </div>
            <div className="p-6 border-2 border-zinc-700 bg-zinc-900">
              <p className="text-zinc-300 leading-relaxed" data-testid="text-good-faith">
                Please be aware that under Section 512(f) of the DMCA, any person who knowingly materially misrepresents that material is infringing, or that material was removed or disabled by mistake or misidentification, may be subject to liability for damages, including costs and attorneys' fees. Please do not make false claims. If you are unsure whether the material you are reporting is infringing, please consult with an attorney before submitting a notification.
              </p>
            </div>
          </section>

          <div className="text-center text-xs text-zinc-600 pt-4 border-t-2 border-zinc-800" data-testid="text-legal-links">
            <p>See also: <Link href="/terms" className="text-emerald-400 hover:underline">Terms of Service</Link> · <Link href="/privacy" className="text-emerald-400 hover:underline">Privacy Policy</Link> · <Link href="/disclaimer" className="text-emerald-400 hover:underline">Disclaimer</Link> · <Link href="/compliance" className="text-emerald-400 hover:underline">Compliance</Link></p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
