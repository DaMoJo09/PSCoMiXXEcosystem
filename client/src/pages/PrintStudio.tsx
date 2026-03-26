import { Layout } from "@/components/layout/Layout";
import { useLocation } from "wouter";
import {
  Book,
  CreditCard,
  Image,
  Sticker,
  Shirt,
  Megaphone,
  Upload,
  Printer,
  Package,
  GraduationCap,
  Palette,
  Building2,
  ArrowRight,
  ChevronRight,
  Zap,
  Star,
  Sparkles,
} from "lucide-react";

const outputs = [
  { icon: Book, label: "Comic Books", description: "Full-color saddle-stitched or perfect-bound comic books. Standard 6.625×10.25\" format." },
  { icon: Book, label: "Books & Novels", description: "Kids books, graphic novels, and prose books. Pocket to full-size formats with perfect binding." },
  { icon: CreditCard, label: "Trading Cards", description: "Standard 2.5×3.5\" cards on premium cardstock. Glossy or matte finish." },
  { icon: Image, label: "Posters", description: "11×17\", 18×24\", or 24×36\" full-bleed posters. Archival quality prints." },
  { icon: Sticker, label: "Stickers", description: "Die-cut, kiss-cut, or sheet stickers. Vinyl or paper stock options." },
  { icon: Shirt, label: "T-Shirts", description: "DTG or screen-printed apparel. Upload your panel art directly." },
  { icon: Megaphone, label: "Promo Materials", description: "Flyers, postcards, banners, and event signage. Convention-ready." },
];

const audiences = [
  {
    icon: GraduationCap,
    title: "Schools & Classrooms",
    tag: "EDU",
    description: "Turn student projects into real printed comics and zines. Perfect for end-of-year showcases, literacy programs, and art class portfolios.",
    useCases: ["Student anthology books", "Classroom zine collections", "Art show prints & posters", "Award certificates & cards"],
  },
  {
    icon: Palette,
    title: "Indie Creators",
    tag: "CREATOR",
    description: "Launch your comic, sell merch at cons, and build your brand with professional print products — no minimum orders, no hassle.",
    useCases: ["Convention table inventory", "Online store fulfillment", "Kickstarter reward tiers", "Artist alley merch bundles"],
  },
  {
    icon: Building2,
    title: "Programs & Organizations",
    tag: "PROGRAM",
    description: "Youth media programs, after-school clubs, and nonprofits can publish participant work as real printed products.",
    useCases: ["Program showcase books", "Fundraiser merchandise", "Community event materials", "Grant deliverables"],
  },
];

const steps = [
  { number: "01", title: "CREATE", description: "Build your comic, card, or design using CoMiXX studio tools. AI-assisted or hand-crafted.", icon: Sparkles },
  { number: "02", title: "EXPORT", description: "Use the Export Dashboard to generate print-ready files with proper bleed, trim, and resolution.", icon: Upload },
  { number: "03", title: "PRINT", description: "Request a quote or order directly. We handle production and ship to your door.", icon: Printer },
];

const bundles = [
  {
    title: "Comic Launch Pack",
    tag: "LAUNCH",
    items: ["25 saddle-stitched comic books", "50 promotional postcards", "100 die-cut stickers", "1 banner for events"],
    description: "Everything you need to launch your first issue at a convention or online store.",
  },
  {
    title: "School Showcase Pack",
    tag: "EDU",
    items: ["Class set of 30 student comics", "10 poster prints for display", "Sticker sheets for each student", "Teacher edition hardcover"],
    description: "Celebrate student creativity with a full print package for classrooms and school events.",
  },
  {
    title: "Creator Merch Pack",
    tag: "MERCH",
    items: ["10 T-shirts with your art", "50 trading card packs", "25 poster prints", "100 vinyl stickers"],
    description: "Build your merch table with a curated bundle of print products featuring your artwork.",
  },
  {
    title: "Fundraiser Pack",
    tag: "FUND",
    items: ["50 comic books for resale", "200 stickers", "25 posters", "Custom order forms"],
    description: "Turn your creative project into a fundraiser. Great for schools, clubs, and nonprofits.",
  },
  {
    title: "Book Publishing Pack",
    tag: "BOOK",
    items: ["10 perfect-bound books (trade 6×9\")", "5 poster prints of cover art", "50 bookmarks", "Digital proof & press check"],
    description: "Publish your kids book, graphic novel, or prose novel as a real printed book.",
  },
  {
    title: "Poster Pack",
    tag: "POSTER",
    items: ["10 large format posters (18×24\")", "25 mini posters (11×17\")", "5 banner prints", "Custom sizing available"],
    description: "Event posters, art prints, infographics, and promotional signage. Convention and classroom ready.",
  },
];

export default function PrintStudio() {
  const [, navigate] = useLocation();

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white">
        <section className="relative py-20 sm:py-32 px-4 sm:px-8 overflow-hidden" data-testid="section-hero">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)`,
          }} />
          <div className="max-w-5xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 border-2 border-white/20 mb-8" data-testid="badge-print-studio">
              <Printer className="w-4 h-4" />
              <span className="text-xs font-mono uppercase tracking-widest">Print Studio</span>
            </div>

            <h1
              className="text-4xl sm:text-6xl md:text-8xl font-black uppercase tracking-tight mb-6"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              data-testid="text-hero-headline"
            >
              CREATE IT IN COMIXX.
              <br />
              <span style={{
                background: "linear-gradient(to right, #00ffff, #ff00ff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                PRINT IT FOR REAL.
              </span>
            </h1>

            <p className="text-sm sm:text-lg text-zinc-400 font-mono max-w-2xl mx-auto mb-12" data-testid="text-hero-subheadline">
              From screen to paper. Export print-ready files, request bulk quotes, and turn your digital creations into physical products.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <button
                data-testid="button-export-dashboard"
                onClick={() => navigate("/print-studio/export")}
                className="group px-6 sm:px-8 py-3 sm:py-4 bg-white text-black font-bold text-sm sm:text-base uppercase tracking-wider flex items-center gap-2 hover:bg-zinc-200 transition-all relative border-none cursor-pointer"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <Upload className="w-5 h-5" />
                GO TO EXPORT DASHBOARD
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 border-2 border-white translate-x-2 translate-y-2 -z-10 group-hover:translate-x-3 group-hover:translate-y-3 transition-transform" />
              </button>
              <button
                data-testid="button-request-quote"
                onClick={() => navigate("/print-studio/quote")}
                className="group px-6 sm:px-8 py-3 sm:py-4 border-2 border-white text-white font-bold text-sm sm:text-base uppercase tracking-wider flex items-center gap-2 hover:bg-white hover:text-black transition-all cursor-pointer bg-transparent"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <Printer className="w-5 h-5" />
                REQUEST A PRINT QUOTE
              </button>
            </div>
          </div>
        </section>

        <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-8 bg-zinc-950" data-testid="section-outputs">
          <div className="max-w-6xl mx-auto">
            <div className="mb-16 text-center">
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.3em] block mb-4">WHAT YOU CAN PRINT</span>
              <h2
                className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                data-testid="text-outputs-heading"
              >
                {outputs.length} SUPPORTED OUTPUTS
              </h2>
              <div className="w-24 h-1 bg-white mx-auto" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {outputs.map((output) => (
                <div
                  key={output.label}
                  className="border border-white/10 bg-white/[0.02] p-6 sm:p-8 hover:border-white/30 hover:bg-white/[0.05] transition-all group"
                  data-testid={`card-output-${output.label.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <div className="w-12 h-12 border border-white/20 flex items-center justify-center mb-4 group-hover:border-white/50 transition-colors">
                    <output.icon className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
                  </div>
                  <h4 className="text-lg font-black uppercase tracking-wider mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {output.label}
                  </h4>
                  <p className="text-sm text-zinc-500 font-mono leading-relaxed">
                    {output.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-8 bg-black" data-testid="section-audiences">
          <div className="max-w-6xl mx-auto">
            <div className="mb-16 text-center">
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.3em] block mb-4">WHO IT'S FOR</span>
              <h2
                className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                data-testid="text-audiences-heading"
              >
                PRINT FOR EVERY CREATOR
              </h2>
              <div className="w-24 h-1 bg-white mx-auto" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {audiences.map((audience) => (
                <div
                  key={audience.title}
                  className="border border-white/10 p-8 relative group hover:border-white/30 transition-all"
                  data-testid={`card-audience-${audience.tag.toLowerCase()}`}
                >
                  <span className="absolute top-4 right-4 text-[10px] font-mono text-zinc-600 uppercase tracking-widest border border-zinc-800 px-2 py-1">
                    {audience.tag}
                  </span>
                  <div className="w-14 h-14 border-2 border-white/20 flex items-center justify-center mb-6 group-hover:border-white/50 transition-colors">
                    <audience.icon className="w-7 h-7 text-zinc-400 group-hover:text-white transition-colors" />
                  </div>
                  <h4 className="text-xl font-black uppercase tracking-wider mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {audience.title}
                  </h4>
                  <p className="text-sm text-zinc-500 font-mono leading-relaxed mb-4">
                    {audience.description}
                  </p>
                  <ul className="space-y-2">
                    {audience.useCases.map((useCase, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-zinc-400 font-mono">
                        <Zap className="w-3 h-3 flex-shrink-0" />
                        {useCase}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-8 bg-zinc-950" data-testid="section-how-it-works">
          <div className="max-w-5xl mx-auto">
            <div className="mb-16 text-center">
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.3em] block mb-4">THE PIPELINE</span>
              <h2
                className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                data-testid="text-how-heading"
              >
                HOW IT WORKS
              </h2>
              <div className="w-24 h-1 bg-white mx-auto" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-px bg-zinc-800" />
              {steps.map((step) => (
                <div key={step.number} className="text-center relative" data-testid={`step-${step.number}`}>
                  <div className="w-24 h-24 border-2 border-white/20 flex items-center justify-center mx-auto mb-6 relative bg-zinc-950">
                    <span className="text-3xl font-black text-zinc-600" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {step.number}
                    </span>
                    <step.icon className="w-5 h-5 text-zinc-500 absolute -bottom-2 -right-2 bg-zinc-950 p-0.5" />
                  </div>
                  <h4 className="text-base font-black uppercase tracking-wider mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {step.title}
                  </h4>
                  <p className="text-sm text-zinc-500 font-mono leading-relaxed max-w-xs mx-auto">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-8 bg-black" data-testid="section-bundles">
          <div className="max-w-6xl mx-auto">
            <div className="mb-16 text-center">
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.3em] block mb-4">PRODUCT BUNDLES</span>
              <h2
                className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                data-testid="text-bundles-heading"
              >
                PRINT PACKAGES
              </h2>
              <div className="w-24 h-1 bg-white mx-auto" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {bundles.map((bundle) => (
                <div
                  key={bundle.title}
                  className="border border-white/10 bg-white/[0.02] p-6 sm:p-8 hover:border-white/30 transition-all group"
                  data-testid={`card-bundle-${bundle.tag.toLowerCase()}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Package className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
                      <h4 className="text-lg font-black uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {bundle.title}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest border border-zinc-800 px-2 py-1">
                      {bundle.tag}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500 font-mono leading-relaxed mb-4">
                    {bundle.description}
                  </p>
                  <ul className="space-y-2">
                    {bundle.items.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-zinc-400 font-mono">
                        <Star className="w-3 h-3 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <button
                data-testid="button-view-packages"
                onClick={() => navigate("/print-studio/packages")}
                className="group inline-flex items-center gap-3 px-8 py-4 border-2 border-white text-white font-bold text-sm uppercase tracking-wider hover:bg-white hover:text-black transition-all cursor-pointer bg-transparent"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                VIEW ALL PACKAGES
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </section>

        <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-8 bg-zinc-950" data-testid="section-cta">
          <div className="max-w-3xl mx-auto text-center">
            <h2
              className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-6"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              data-testid="text-cta-heading"
            >
              READY TO PRINT?
            </h2>
            <p className="text-sm sm:text-base text-zinc-500 font-mono leading-relaxed mb-10 max-w-xl mx-auto">
              Export your print-ready files or request a custom quote. We handle production so you can focus on creating.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                data-testid="button-cta-export"
                onClick={() => navigate("/print-studio/export")}
                className="group px-8 py-4 bg-white text-black font-bold text-base uppercase tracking-wider flex items-center gap-3 hover:bg-zinc-200 transition-all relative border-none cursor-pointer"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <Upload className="w-5 h-5" />
                EXPORT DASHBOARD
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 border-2 border-white translate-x-2 translate-y-2 -z-10 group-hover:translate-x-3 group-hover:translate-y-3 transition-transform" />
              </button>
              <button
                data-testid="button-cta-quote"
                onClick={() => navigate("/print-studio/quote")}
                className="group px-8 py-4 border-2 border-white text-white font-bold text-base uppercase tracking-wider flex items-center gap-3 hover:bg-white hover:text-black transition-all cursor-pointer bg-transparent"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <Printer className="w-5 h-5" />
                REQUEST A QUOTE
              </button>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
