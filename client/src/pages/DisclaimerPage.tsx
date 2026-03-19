import { Layout } from "@/components/layout/Layout";
import { AlertTriangle, ArrowLeft, Shield, Users, Zap, Globe, Scale } from "lucide-react";
import { Link } from "wouter";

const sections = [
  {
    id: "general",
    title: "General Disclaimer",
    icon: AlertTriangle,
    color: "text-amber-400",
    borderColor: "border-amber-500/30",
    content: "Press Start CoMiXX (the \"Platform\"), operated by MADMixedMedia, is an educational and creative tool designed for students, educators, and independent creators. The Platform is provided on an \"AS IS\" and \"AS AVAILABLE\" basis. MADMixedMedia makes no representations or warranties of any kind, express or implied, regarding the operation of the Platform, the accuracy or completeness of content, or the suitability of the Platform for any particular purpose."
  },
  {
    id: "no-guarantee",
    title: "No Guarantees",
    icon: Zap,
    color: "text-red-400",
    borderColor: "border-red-500/30",
    content: "MADMixedMedia does not guarantee: (a) uninterrupted or error-free access to the Platform; (b) that defects will be corrected; (c) that the Platform is free from viruses or other harmful components; (d) any specific career outcomes, financial success, or educational results from using the Platform; (e) the accuracy of AI-generated content, suggestions, or outputs. Users are solely responsible for their use of the Platform and any decisions made based on Platform content."
  },
  {
    id: "ugc",
    title: "User-Generated Content",
    icon: Users,
    color: "text-cyan-400",
    borderColor: "border-zinc-700",
    content: "The Platform allows users to create and share content. MADMixedMedia is not responsible for any user-generated content including but not limited to comics, visual novels, trading cards, stories, images, comments, or reviews posted by users. Views expressed in user-generated content do not represent the views of MADMixedMedia. While we implement content moderation and safety filters, we cannot guarantee that all inappropriate content will be caught or removed immediately. If you encounter objectionable content, please report it through the Platform's reporting tools."
  },
  {
    id: "ai",
    title: "AI-Generated Content",
    icon: Zap,
    color: "text-purple-400",
    borderColor: "border-zinc-700",
    content: "The Platform uses third-party AI services (Pollinations.ai) for image and text generation. AI-generated outputs may be inaccurate, inappropriate, or offensive despite our safety filters. MADMixedMedia does not claim ownership of AI-generated content and makes no guarantees about the originality, accuracy, or appropriateness of AI outputs. Users are responsible for reviewing and taking responsibility for any AI-generated content they choose to incorporate into their projects. AI-generated content for student accounts undergoes additional safety filtering."
  },
  {
    id: "third-party",
    title: "Third-Party Services & Links",
    icon: Globe,
    color: "text-emerald-400",
    borderColor: "border-zinc-700",
    content: "The Platform may contain links to or integrations with third-party websites, services, and tools (including but not limited to Stripe for payments, PressPlays/FX Studio for effects, and external creative resources). MADMixedMedia is not responsible for the content, privacy practices, or availability of any third-party services. Your use of third-party services is governed by their respective terms of service and privacy policies. MADMixedMedia is not liable for any damages or losses resulting from your use of third-party services."
  },
  {
    id: "education",
    title: "Educational Use",
    icon: Shield,
    color: "text-amber-400",
    borderColor: "border-amber-500/30",
    content: "The Platform is designed to support creative education but is not a substitute for formal instruction, professional guidance, or accredited education programs. MADMixedMedia does not guarantee any specific educational outcomes. Schools and educators using the Platform are responsible for supervising student use and ensuring compliance with their institution's policies. The Platform should be used as a supplementary creative tool, not as a primary educational curriculum."
  },
  {
    id: "liability",
    title: "Limitation of Liability",
    icon: Scale,
    color: "text-zinc-400",
    borderColor: "border-zinc-700",
    content: "TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, MADMIXEDMEDIA SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM: (A) YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE PLATFORM; (B) ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE PLATFORM; (C) ANY CONTENT OBTAINED FROM THE PLATFORM; (D) UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT; (E) ANY LOSS OF STUDENT DATA BEYOND WHAT IS WITHIN MADMIXEDMEDIA'S REASONABLE CONTROL. IN NO EVENT SHALL MADMIXEDMEDIA'S TOTAL LIABILITY EXCEED THE AMOUNT YOU HAVE PAID TO MADMIXEDMEDIA IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM, OR ONE HUNDRED DOLLARS ($100), WHICHEVER IS GREATER."
  },
];

export default function DisclaimerPage() {
  return (
    <Layout>
      <div className="min-h-screen bg-zinc-950 text-white" data-testid="disclaimer-page">
        <header className="h-14 border-b-2 border-zinc-700 flex items-center justify-between px-6 bg-zinc-900 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 hover:bg-emerald-500 hover:text-black border-2 border-zinc-700 transition-colors" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h1 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }} data-testid="text-page-title">Platform Disclaimer</h1>
            </div>
          </div>
          <span className="text-xs text-zinc-500" data-testid="text-version">v2.0 · Updated March 2026</span>
        </header>

        <div className="max-w-3xl mx-auto p-8 space-y-8">
          {sections.map(({ id, title, icon: Icon, color, borderColor, content }) => (
            <section key={id} className="space-y-4" data-testid={`section-${id}`}>
              <div className="flex items-center gap-2 border-b-2 border-zinc-700 pb-2">
                <Icon className={`w-5 h-5 ${color}`} />
                <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h2>
              </div>
              <div className={`p-6 border-2 ${borderColor} bg-zinc-900`}>
                <p className="text-zinc-300 leading-relaxed" data-testid={`text-${id}`}>{content}</p>
              </div>
            </section>
          ))}

          <div className="text-center text-xs text-zinc-600 pt-4 border-t-2 border-zinc-800" data-testid="text-legal-links">
            <p>See also: <Link href="/terms" className="text-emerald-400 hover:underline">Terms of Service</Link> · <Link href="/privacy" className="text-emerald-400 hover:underline">Privacy Policy</Link> · <Link href="/dmca" className="text-emerald-400 hover:underline">DMCA Policy</Link> · <Link href="/compliance" className="text-emerald-400 hover:underline">Compliance</Link></p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
