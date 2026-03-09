import { Layout } from "@/components/layout/Layout";
import { useState } from "react";
import { Link } from "wouter";
import {
  GraduationCap,
  Users,
  Palette,
  Book,
  CreditCard,
  Shirt,
  Image,
  Sticker,
  Package,
  ArrowRight,
  Check,
  Crown,
  Megaphone,
  Star,
} from "lucide-react";

type AudienceTab = "schools" | "programs" | "creators";

const schoolPackage = {
  title: "CoMiXX Classroom Print Package",
  subtitle: "Turn student comics into real printed books",
  details: [
    "Full-color saddle-stitched comic books (8.5x11\" or 6.625x10.25\")",
    "Minimum 25 copies per title",
    "Student name on cover & credits page",
    "Classroom bundle pricing",
    "Bulk shipping to one address",
    "Teacher-approved content review step",
  ],
  useCases: [
    "End-of-year anthology showcase",
    "Literacy & creative writing programs",
    "STEAM curriculum projects",
    "School fundraiser products",
    "Student portfolio keepsakes",
  ],
  valueProps: [
    "COPPA-compliant workflow",
    "Teacher dashboard for approvals",
    "Curriculum-aligned templates",
    "Volume discounts for 100+ copies",
  ],
};

const programPackage = {
  title: "Youth Media Print Package",
  subtitle: "Professional print runs for youth programs & organizations",
  details: [
    "Comic books, zines, and graphic novels",
    "Trading card sets with custom backs",
    "Posters and promotional materials",
    "Custom packaging options",
    "Drop-ship to multiple locations",
    "Dedicated account manager",
  ],
  greatFor: [
    "After-school art programs",
    "Community centers & libraries",
    "Youth mentorship organizations",
    "Summer camp creative projects",
    "Non-profit fundraising campaigns",
    "Cultural arts initiatives",
  ],
};

const creatorPackage = {
  title: "Creator Launch Print Package",
  subtitle: "Everything you need to launch your comic or merch line",
  details: [
    "Short-run comic printing (as low as 10 copies)",
    "Trading card packs with foil options",
    "Sticker sheets and die-cut stickers",
    "T-shirt transfers and DTG prints",
    "Convention-ready poster prints",
    "Custom business cards with comic art",
  ],
  greatFor: [
    "Indie comic launches",
    "Convention & pop-up shop inventory",
    "Patreon & Kickstarter reward fulfillment",
    "Online store merchandise",
    "Portfolio & promo materials",
    "Gift & limited edition drops",
  ],
};

const bundles = [
  {
    name: "Comic Launch Pack",
    tag: "LAUNCH",
    items: [
      "25 saddle-stitched comic books",
      "50 promotional postcards",
      "10 poster prints (11x17\")",
      "100 die-cut stickers",
      "Digital proof & press check",
    ],
  },
  {
    name: "School Showcase Pack",
    tag: "EDU",
    items: [
      "30 student comic anthologies",
      "Classroom poster set (5 designs)",
      "100 bookmark prints",
      "Certificate of publication for each student",
      "Teacher resource binder",
    ],
  },
  {
    name: "Creator Merch Pack",
    tag: "MERCH",
    items: [
      "10 comic books (perfect bound)",
      "50 trading card packs (5 cards each)",
      "25 T-shirt transfers",
      "200 sticker sheets",
      "50 button/pin designs",
    ],
  },
  {
    name: "Fundraiser Pack",
    tag: "FUND",
    items: [
      "50 comic books with custom covers",
      "100 trading card packs",
      "50 poster prints",
      "Fundraiser pricing guide",
      "Order form templates",
    ],
  },
];

export default function PrintPackages() {
  const [activeTab, setActiveTab] = useState<AudienceTab>("schools");

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white">
        <header className="h-14 border-b-4 border-white flex items-center justify-between px-6 bg-black sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <Link href="/print-studio">
              <button className="p-2 hover:bg-white hover:text-black border-2 border-white transition-colors" data-testid="button-back-print-studio">
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
            </Link>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              <h1 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Print Packages</h1>
            </div>
          </div>
          <Link href="/print-studio/quote">
            <button
              className="px-4 py-2 bg-white text-black text-sm font-black flex items-center gap-2 border-2 border-white hover:bg-zinc-200 uppercase transition-colors"
              data-testid="button-request-quote-header"
            >
              Request Quote
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </header>

        <div className="max-w-6xl mx-auto p-8">
          <div className="text-center mb-12">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.3em] block mb-4" data-testid="text-section-label">PRINT PACKAGES</span>
            <h2
              className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              data-testid="text-packages-headline"
            >
              PACKAGES BUILT FOR YOU
            </h2>
            <p className="text-zinc-400 font-mono max-w-2xl mx-auto" data-testid="text-packages-subheadline">
              Pre-configured print bundles for schools, programs, and independent creators. Pick a package or customize your own.
            </p>
            <div className="w-24 h-1 bg-white mx-auto mt-6" />
          </div>

          <div className="flex justify-center gap-2 mb-12" data-testid="tabs-audience">
            {([
              { key: "schools" as AudienceTab, label: "Schools", icon: GraduationCap },
              { key: "programs" as AudienceTab, label: "Programs", icon: Users },
              { key: "creators" as AudienceTab, label: "Creators", icon: Palette },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-3 font-black uppercase text-sm tracking-wider flex items-center gap-2 border-2 transition-colors ${
                  activeTab === tab.key
                    ? "bg-white text-black border-white"
                    : "bg-transparent text-zinc-400 border-zinc-700 hover:border-white hover:text-white"
                }`}
                data-testid={`tab-${tab.key}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "schools" && (
            <div className="border-4 border-white bg-zinc-900 p-8 mb-12" data-testid="section-school-package">
              <div className="flex items-center gap-3 mb-2">
                <GraduationCap className="w-7 h-7" />
                <h3 className="font-black text-2xl uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }} data-testid="text-school-title">
                  {schoolPackage.title}
                </h3>
              </div>
              <p className="text-zinc-400 font-mono mb-8" data-testid="text-school-subtitle">{schoolPackage.subtitle}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-black text-sm uppercase tracking-wider mb-4 text-zinc-300">What's Included</h4>
                  <ul className="space-y-3">
                    {schoolPackage.details.map((detail, i) => (
                      <li key={i} className="flex items-start gap-2" data-testid={`text-school-detail-${i}`}>
                        <Check className="w-4 h-4 mt-1 flex-shrink-0 text-green-400" />
                        <span className="text-sm">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-black text-sm uppercase tracking-wider mb-4 text-zinc-300">Use Cases</h4>
                  <ul className="space-y-3">
                    {schoolPackage.useCases.map((uc, i) => (
                      <li key={i} className="flex items-start gap-2" data-testid={`text-school-usecase-${i}`}>
                        <Star className="w-4 h-4 mt-1 flex-shrink-0 text-yellow-400" />
                        <span className="text-sm">{uc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-zinc-700">
                <h4 className="font-black text-sm uppercase tracking-wider mb-4 text-zinc-300">Value Props</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {schoolPackage.valueProps.map((vp, i) => (
                    <div key={i} className="flex items-center gap-2 bg-zinc-800 px-4 py-3 border border-zinc-700" data-testid={`text-school-value-${i}`}>
                      <Crown className="w-4 h-4 text-zinc-400" />
                      <span className="text-sm font-mono">{vp}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "programs" && (
            <div className="border-4 border-white bg-zinc-900 p-8 mb-12" data-testid="section-program-package">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-7 h-7" />
                <h3 className="font-black text-2xl uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }} data-testid="text-program-title">
                  {programPackage.title}
                </h3>
              </div>
              <p className="text-zinc-400 font-mono mb-8" data-testid="text-program-subtitle">{programPackage.subtitle}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-black text-sm uppercase tracking-wider mb-4 text-zinc-300">What's Included</h4>
                  <ul className="space-y-3">
                    {programPackage.details.map((detail, i) => (
                      <li key={i} className="flex items-start gap-2" data-testid={`text-program-detail-${i}`}>
                        <Check className="w-4 h-4 mt-1 flex-shrink-0 text-green-400" />
                        <span className="text-sm">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-black text-sm uppercase tracking-wider mb-4 text-zinc-300">Great For</h4>
                  <ul className="space-y-3">
                    {programPackage.greatFor.map((gf, i) => (
                      <li key={i} className="flex items-start gap-2" data-testid={`text-program-greatfor-${i}`}>
                        <Star className="w-4 h-4 mt-1 flex-shrink-0 text-yellow-400" />
                        <span className="text-sm">{gf}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === "creators" && (
            <div className="border-4 border-white bg-zinc-900 p-8 mb-12" data-testid="section-creator-package">
              <div className="flex items-center gap-3 mb-2">
                <Palette className="w-7 h-7" />
                <h3 className="font-black text-2xl uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }} data-testid="text-creator-title">
                  {creatorPackage.title}
                </h3>
              </div>
              <p className="text-zinc-400 font-mono mb-8" data-testid="text-creator-subtitle">{creatorPackage.subtitle}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-black text-sm uppercase tracking-wider mb-4 text-zinc-300">What's Included</h4>
                  <ul className="space-y-3">
                    {creatorPackage.details.map((detail, i) => (
                      <li key={i} className="flex items-start gap-2" data-testid={`text-creator-detail-${i}`}>
                        <Check className="w-4 h-4 mt-1 flex-shrink-0 text-green-400" />
                        <span className="text-sm">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-black text-sm uppercase tracking-wider mb-4 text-zinc-300">Great For</h4>
                  <ul className="space-y-3">
                    {creatorPackage.greatFor.map((gf, i) => (
                      <li key={i} className="flex items-start gap-2" data-testid={`text-creator-greatfor-${i}`}>
                        <Star className="w-4 h-4 mt-1 flex-shrink-0 text-yellow-400" />
                        <span className="text-sm">{gf}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="mb-12">
            <div className="text-center mb-10">
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.3em] block mb-4">BUNDLES</span>
              <h3
                className="text-2xl sm:text-4xl font-black uppercase tracking-tight mb-4"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                data-testid="text-bundles-headline"
              >
                PRE-BUILT PRINT BUNDLES
              </h3>
              <div className="w-24 h-1 bg-white mx-auto" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {bundles.map((bundle, idx) => (
                <div
                  key={bundle.name}
                  className="border-4 border-white bg-zinc-900 p-6 flex flex-col hover:bg-zinc-800 transition-colors"
                  data-testid={`card-bundle-${idx}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-black text-lg uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }} data-testid={`text-bundle-name-${idx}`}>
                      {bundle.name}
                    </h4>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest border border-zinc-700 px-2 py-1" data-testid={`text-bundle-tag-${idx}`}>
                      {bundle.tag}
                    </span>
                  </div>
                  <ul className="space-y-2 flex-1">
                    {bundle.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2" data-testid={`text-bundle-item-${idx}-${i}`}>
                        <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-zinc-500" />
                        <span className="text-sm text-zinc-300 font-mono">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/print-studio/quote">
                    <button
                      className="mt-6 w-full py-3 border-2 border-white font-black uppercase text-sm hover:bg-white hover:text-black transition-colors"
                      data-testid={`button-bundle-quote-${idx}`}
                    >
                      Get a Quote
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div className="border-4 border-white bg-zinc-900 p-8 text-center" data-testid="section-cta">
            <Megaphone className="w-10 h-10 mx-auto mb-4" />
            <h3
              className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              data-testid="text-cta-headline"
            >
              READY TO PRINT?
            </h3>
            <p className="text-zinc-400 font-mono max-w-lg mx-auto mb-8" data-testid="text-cta-description">
              Tell us what you need and we'll put together a custom quote. No minimums for creators. Volume discounts for schools and programs.
            </p>
            <Link href="/print-studio/quote">
              <button
                className="group inline-flex items-center gap-3 px-8 py-4 bg-white text-black font-bold text-lg uppercase tracking-wider hover:bg-zinc-200 transition-all relative border-none cursor-pointer"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                data-testid="button-request-quote-cta"
              >
                REQUEST A PRINT QUOTE
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 border-2 border-white translate-x-2 translate-y-2 -z-10 group-hover:translate-x-3 group-hover:translate-y-3 transition-transform" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
