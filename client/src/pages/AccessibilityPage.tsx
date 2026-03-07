import { Layout } from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft,
  Accessibility,
  CheckCircle,
  AlertCircle,
  Mail,
  Phone,
  Globe,
  Eye,
} from "lucide-react";

interface WcagCriterion {
  id: string;
  name: string;
  level: "A" | "AA" | "AAA";
  status: "supports" | "partially-supports" | "does-not-support" | "not-applicable";
  notes: string;
}

interface AccessibilityData {
  statement: string;
  evaluationDate: string;
  wcagVersion: string;
  conformanceLevel: string;
  criteria: WcagCriterion[];
  accommodations: string[];
  contact: {
    email: string;
    phone: string;
    responseTime: string;
  };
}

const fallbackData: AccessibilityData = {
  statement: "Press Start CoMixx is committed to ensuring digital accessibility for people with disabilities. We continually improve the user experience for everyone and apply the relevant accessibility standards.",
  evaluationDate: new Date().toISOString(),
  wcagVersion: "2.1",
  conformanceLevel: "AA",
  criteria: [
    { id: "1.1.1", name: "Non-text Content", level: "A", status: "supports", notes: "All images include alt text. Decorative images are marked appropriately." },
    { id: "1.2.1", name: "Audio-only and Video-only", level: "A", status: "supports", notes: "Transcripts provided for audio content; descriptions for video-only content." },
    { id: "1.3.1", name: "Info and Relationships", level: "A", status: "supports", notes: "Semantic HTML used throughout. Headings, lists, and tables are properly structured." },
    { id: "1.4.1", name: "Use of Color", level: "A", status: "supports", notes: "Color is not the sole means of conveying information." },
    { id: "1.4.3", name: "Contrast (Minimum)", level: "AA", status: "supports", notes: "Text contrast ratios meet or exceed 4.5:1 for normal text and 3:1 for large text." },
    { id: "1.4.4", name: "Resize Text", level: "AA", status: "supports", notes: "Content can be resized up to 200% without loss of functionality." },
    { id: "2.1.1", name: "Keyboard", level: "A", status: "supports", notes: "All functionality accessible via keyboard. Custom keyboard shortcuts documented." },
    { id: "2.1.2", name: "No Keyboard Trap", level: "A", status: "supports", notes: "Focus can be moved away from all components using standard navigation." },
    { id: "2.4.1", name: "Bypass Blocks", level: "A", status: "supports", notes: "Skip navigation links provided on all pages." },
    { id: "2.4.3", name: "Focus Order", level: "A", status: "supports", notes: "Tab order follows logical reading order of content." },
    { id: "2.4.6", name: "Headings and Labels", level: "AA", status: "supports", notes: "Descriptive headings and labels used throughout the interface." },
    { id: "2.4.7", name: "Focus Visible", level: "AA", status: "supports", notes: "Visible focus indicators on all interactive elements." },
    { id: "3.1.1", name: "Language of Page", level: "A", status: "supports", notes: "Page language declared in HTML lang attribute." },
    { id: "3.2.1", name: "On Focus", level: "A", status: "supports", notes: "No unexpected context changes on focus." },
    { id: "3.3.1", name: "Error Identification", level: "A", status: "partially-supports", notes: "Most form errors are identified; some complex canvas operations may not fully announce errors." },
    { id: "3.3.2", name: "Labels or Instructions", level: "A", status: "supports", notes: "Form inputs have associated labels and instructions." },
    { id: "4.1.1", name: "Parsing", level: "A", status: "supports", notes: "Valid HTML markup used throughout." },
    { id: "4.1.2", name: "Name, Role, Value", level: "A", status: "partially-supports", notes: "ARIA roles used for custom widgets. Canvas-based comic editor has limited screen reader support." },
  ],
  accommodations: [
    "High contrast mode toggle available in Settings",
    "Reduced motion mode for users sensitive to animations",
    "Keyboard shortcuts for all major actions (press ? to view)",
    "Skip navigation links on every page",
    "Screen reader optimized navigation and announcements",
    "Resizable text up to 200% without loss of content",
    "Focus indicators visible on all interactive elements",
    "Alternative text descriptions for all meaningful images",
    "Captions and transcripts for multimedia content",
    "Error messages associated with form controls",
  ],
  contact: {
    email: "accessibility@pressstartcomixx.com",
    phone: "+1 (555) 123-4567",
    responseTime: "We aim to respond to accessibility feedback within 2 business days.",
  },
};

function ConformanceBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    supports: { color: "border-emerald-500 text-emerald-400 bg-emerald-500/20", label: "Supports" },
    "partially-supports": { color: "border-amber-500 text-amber-400 bg-amber-500/20", label: "Partially Supports" },
    "does-not-support": { color: "border-red-500 text-red-400 bg-red-500/20", label: "Does Not Support" },
    "not-applicable": { color: "border-zinc-600 text-zinc-400 bg-zinc-700/20", label: "N/A" },
  };
  const c = config[status] || config["not-applicable"];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-black uppercase border-2 ${c.color}`} data-testid={`badge-conformance-${status}`}>
      {c.label}
    </span>
  );
}

export default function AccessibilityPage() {
  const { data, isLoading } = useQuery<AccessibilityData>({
    queryKey: ["compliance-accessibility"],
    queryFn: async () => {
      const res = await fetch("/api/compliance/accessibility");
      if (!res.ok) throw new Error("Failed to fetch accessibility data");
      return res.json();
    },
    retry: 1,
    staleTime: 300000,
  });

  const a11y = data || fallbackData;

  return (
    <Layout>
      <div className="min-h-screen bg-zinc-950 text-white">
        <header className="h-14 border-b-4 border-cyan-500 flex items-center justify-between px-6 bg-zinc-900 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 hover:bg-cyan-500 hover:text-black border-2 border-cyan-500 transition-colors" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <div className="flex items-center gap-2">
              <Accessibility className="w-5 h-5 text-cyan-400" />
              <h1 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Accessibility Statement</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/compliance">
              <button className="px-3 py-1.5 text-xs font-black uppercase border-2 border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-colors" data-testid="link-compliance">
                Compliance
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
          <div className="flex items-center justify-center py-20" data-testid="loading-accessibility">
            <div className="animate-pulse text-cyan-400 font-black uppercase tracking-widest">Loading accessibility data...</div>
          </div>
        )}

        <div className="max-w-4xl mx-auto p-8 space-y-10">
          <section className="space-y-4">
            <div className="p-6 border-4 border-cyan-500/50 bg-zinc-900">
              <h2 className="font-black text-base uppercase tracking-wide text-cyan-400 mb-3">Voluntary Product Accessibility Template (VPAT)</h2>
              <p className="text-sm text-zinc-300 leading-relaxed" data-testid="text-a11y-statement">{a11y.statement}</p>
              <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500">
                <span>WCAG {a11y.wcagVersion} Level {a11y.conformanceLevel}</span>
                <span>•</span>
                <span>Evaluated: {new Date(a11y.evaluationDate).toLocaleDateString()}</span>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b-2 border-cyan-500 pb-2">
              <Eye className="w-5 h-5 text-cyan-400" />
              <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>WCAG Conformance Table</h2>
            </div>

            <div className="border-4 border-zinc-700 bg-zinc-900 overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-wcag-criteria">
                <thead>
                  <tr className="border-b-2 border-zinc-700 bg-zinc-800">
                    <th className="text-left p-3 font-black uppercase text-xs text-zinc-400">Criterion</th>
                    <th className="text-left p-3 font-black uppercase text-xs text-zinc-400">Name</th>
                    <th className="text-center p-3 font-black uppercase text-xs text-zinc-400">Level</th>
                    <th className="text-center p-3 font-black uppercase text-xs text-zinc-400">Status</th>
                    <th className="text-left p-3 font-black uppercase text-xs text-zinc-400 hidden md:table-cell">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {a11y.criteria.map((criterion, i) => (
                    <tr
                      key={criterion.id}
                      className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors"
                      data-testid={`row-wcag-${criterion.id}`}
                    >
                      <td className="p-3 font-mono text-cyan-400 font-bold">{criterion.id}</td>
                      <td className="p-3 text-zinc-300">{criterion.name}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 text-[10px] font-black border-2 border-zinc-600 text-zinc-300">
                          {criterion.level}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <ConformanceBadge status={criterion.status} />
                      </td>
                      <td className="p-3 text-xs text-zinc-500 hidden md:table-cell">{criterion.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b-2 border-cyan-500 pb-2">
              <CheckCircle className="w-5 h-5 text-cyan-400" />
              <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Accommodations</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {a11y.accommodations.map((item, i) => (
                <div
                  key={i}
                  className="p-4 border-4 border-zinc-700 bg-zinc-900 hover:border-cyan-500/50 transition-colors flex items-start gap-3"
                  data-testid={`card-accommodation-${i}`}
                >
                  <CheckCircle className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-zinc-300">{item}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b-2 border-cyan-500 pb-2">
              <Mail className="w-5 h-5 text-cyan-400" />
              <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Contact Information</h2>
            </div>

            <div className="p-6 border-4 border-zinc-700 bg-zinc-900 space-y-4">
              <p className="text-sm text-zinc-400">{a11y.contact.responseTime}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a
                  href={`mailto:${a11y.contact.email}`}
                  className="flex items-center gap-3 p-4 border-2 border-cyan-500/50 hover:border-cyan-500 transition-colors group"
                  data-testid="link-contact-email"
                >
                  <Mail className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300" />
                  <div>
                    <div className="text-xs font-black uppercase text-zinc-500">Email</div>
                    <div className="text-sm text-cyan-400">{a11y.contact.email}</div>
                  </div>
                </a>
                <a
                  href={`tel:${a11y.contact.phone}`}
                  className="flex items-center gap-3 p-4 border-2 border-cyan-500/50 hover:border-cyan-500 transition-colors group"
                  data-testid="link-contact-phone"
                >
                  <Phone className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300" />
                  <div>
                    <div className="text-xs font-black uppercase text-zinc-500">Phone</div>
                    <div className="text-sm text-cyan-400">{a11y.contact.phone}</div>
                  </div>
                </a>
              </div>
            </div>
          </section>

          <div className="text-center text-xs text-zinc-600 pb-8" data-testid="text-evaluation-date">
            Evaluation date: {new Date(a11y.evaluationDate).toLocaleDateString()}
          </div>
        </div>
      </div>
    </Layout>
  );
}
