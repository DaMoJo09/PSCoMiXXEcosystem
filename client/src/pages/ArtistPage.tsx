import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { 
  User, MapPin, Mail, Instagram, Globe, Palette, Award, 
  FileText, Camera, ChevronRight, ExternalLink
} from "lucide-react";

const ARTIST_DATA = {
  displayName: "Press Start Studio",
  tagline: "Digital & Mixed Media Artist",
  location: "Los Angeles, CA",
  bio: `Press Start Studio is a creative collective dedicated to pushing the boundaries of digital and mixed media art. Founded in 2020, we blend traditional techniques with cutting-edge technology to create immersive visual experiences.

Our work explores themes of technology, identity, and the intersection of digital and physical worlds. Each piece is crafted with meticulous attention to detail, combining hand-drawn elements with digital manipulation and AI-assisted generation.

We believe in the democratization of art creation and are passionate about providing tools and resources for creators of all skill levels to bring their visions to life.`,
  artistStatement: `Art is a conversation between the creator and the viewer, mediated through form, color, and concept. My practice centers on exploring the liminal spaces between analog and digital, past and future, individual and collective experience.

In an age of infinite reproducibility, I seek to create work that retains the aura of the handmade while embracing the possibilities of new media. Each piece is both a product and a critique of our technological moment.

I am particularly interested in how traditional comic art and illustration can evolve through AI collaboration, creating new visual languages that honor the past while reaching toward unexpected futures.`,
  cvHighlights: [
    { year: "2024", event: "Solo Exhibition - 'Digital Dreamscapes' at Gallery X, LA" },
    { year: "2024", event: "Featured Artist - AI Art Week, San Francisco" },
    { year: "2023", event: "Group Show - 'New Frontiers' at Digital Art Museum, Tokyo" },
    { year: "2023", event: "Comic Con Artist Alley - San Diego" },
    { year: "2022", event: "Residency - Blockchain Art Collective, Miami" },
    { year: "2022", event: "Published - 'The Art of Digital Comics' Anthology" },
    { year: "2021", event: "Grant Recipient - Creative Technologies Foundation" },
  ],
  processSteps: [
    { title: "Concept Development", description: "Every piece begins with sketches, notes, and mood boards exploring the core themes and visual language." },
    { title: "AI Collaboration", description: "Using custom prompts and fine-tuned models, we generate initial compositions and explore variations." },
    { title: "Digital Refinement", description: "The AI output is carefully curated and enhanced using professional digital art tools." },
    { title: "Traditional Elements", description: "Hand-drawn details, textures, and finishing touches add the human element that makes each piece unique." },
    { title: "Final Composition", description: "All elements are combined, color-corrected, and prepared for the final medium - whether print, screen, or physical installation." },
  ],
  studioPhotos: [
    "https://image.pollinations.ai/prompt/artist%20studio%20workspace%20computers%20drawing%20tablets%20creative?width=600&height=400&nologo=true&seed=201",
    "https://image.pollinations.ai/prompt/art%20studio%20prints%20on%20wall%20professional%20creative%20space?width=600&height=400&nologo=true&seed=202",
    "https://image.pollinations.ai/prompt/digital%20art%20workspace%20monitors%20tablets%20desk%20setup?width=600&height=400&nologo=true&seed=203",
  ],
  socialLinks: {
    instagram: "https://instagram.com/pressstartstudio",
    website: "https://pressstart.space",
    email: "hello@pressstart.space"
  },
  availableForCommissions: true
};

export default function ArtistPage() {
  const [activeSection, setActiveSection] = useState<"bio" | "statement" | "cv" | "process" | "studio">("bio");

  const sections = [
    { id: "bio" as const, label: "Biography", icon: User },
    { id: "statement" as const, label: "Artist Statement", icon: Palette },
    { id: "cv" as const, label: "CV / Resume", icon: Award },
    { id: "process" as const, label: "Creative Process", icon: FileText },
    { id: "studio" as const, label: "Studio", icon: Camera },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <header className="border-b-4 border-border">
          <div className="relative h-48 bg-gradient-to-br from-zinc-900 to-black overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: `url("https://image.pollinations.ai/prompt/abstract%20art%20studio%20background%20creative%20moody?width=1200&height=400&nologo=true&seed=200")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }} />
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          </div>
          <div className="relative -mt-16 px-6 pb-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="w-32 h-32 border-4 border-border bg-foreground text-background flex items-center justify-center text-4xl font-black">
                PS
              </div>
              <div className="flex-1">
                <h1 className="text-4xl font-black font-display tracking-tight mb-1">{ARTIST_DATA.displayName}</h1>
                <p className="text-muted-foreground text-lg mb-3">{ARTIST_DATA.tagline}</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {ARTIST_DATA.location}
                  </span>
                  {ARTIST_DATA.availableForCommissions && (
                    <span className="flex items-center gap-2 text-green-500">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      Available for Commissions
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <a 
                  href={ARTIST_DATA.socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 border-2 border-border hover:border-foreground transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                </a>
                <a 
                  href={ARTIST_DATA.socialLinks.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 border-2 border-border hover:border-foreground transition-colors"
                >
                  <Globe className="w-5 h-5" />
                </a>
                <a 
                  href={`mailto:${ARTIST_DATA.socialLinks.email}`}
                  className="p-3 border-2 border-border hover:border-foreground transition-colors"
                >
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-col md:flex-row">
          <nav className="md:w-64 border-b-4 md:border-b-0 md:border-r-4 border-border p-4">
            <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible">
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-3 px-4 py-3 font-bold text-sm whitespace-nowrap transition-colors ${
                    activeSection === section.id
                      ? "bg-foreground text-background"
                      : "border-2 border-border hover:border-foreground"
                  }`}
                  data-testid={`section-${section.id}`}
                >
                  <section.icon className="w-4 h-4" />
                  {section.label}
                </button>
              ))}
            </div>
          </nav>

          <main className="flex-1 p-6">
            {activeSection === "bio" && (
              <div className="max-w-3xl">
                <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
                  <User className="w-6 h-6" />
                  BIOGRAPHY
                </h2>
                <div className="prose prose-invert max-w-none">
                  {ARTIST_DATA.bio.split('\n\n').map((paragraph, i) => (
                    <p key={i} className="text-muted-foreground leading-relaxed mb-4">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {activeSection === "statement" && (
              <div className="max-w-3xl">
                <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
                  <Palette className="w-6 h-6" />
                  ARTIST STATEMENT
                </h2>
                <div className="border-l-4 border-foreground pl-6">
                  {ARTIST_DATA.artistStatement.split('\n\n').map((paragraph, i) => (
                    <p key={i} className="text-muted-foreground leading-relaxed mb-4 italic">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {activeSection === "cv" && (
              <div className="max-w-3xl">
                <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
                  <Award className="w-6 h-6" />
                  CV / RESUME
                </h2>
                <div className="space-y-4">
                  {ARTIST_DATA.cvHighlights.map((item, i) => (
                    <div key={i} className="flex gap-4 p-4 border-2 border-border hover:border-foreground transition-colors">
                      <span className="font-black text-lg w-16 shrink-0">{item.year}</span>
                      <span className="text-muted-foreground">{item.event}</span>
                    </div>
                  ))}
                </div>
                <button className="mt-6 px-6 py-3 border-2 border-border hover:border-foreground font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  DOWNLOAD FULL CV
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            )}

            {activeSection === "process" && (
              <div className="max-w-3xl">
                <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
                  <FileText className="w-6 h-6" />
                  CREATIVE PROCESS
                </h2>
                <div className="space-y-6">
                  {ARTIST_DATA.processSteps.map((step, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-10 h-10 bg-foreground text-background flex items-center justify-center font-black shrink-0">
                        {i + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg mb-1">{step.title}</h3>
                        <p className="text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === "studio" && (
              <div>
                <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
                  <Camera className="w-6 h-6" />
                  STUDIO
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ARTIST_DATA.studioPhotos.map((photo, i) => (
                    <div key={i} className="aspect-video border-4 border-border overflow-hidden">
                      <img 
                        src={photo} 
                        alt={`Studio photo ${i + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-muted-foreground mt-6">
                  Interested in visiting the studio? <a href="/contact" className="underline hover:text-foreground">Schedule a visit</a>
                </p>
              </div>
            )}
          </main>
        </div>

        <div className="border-t-4 border-border p-6 bg-card">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-black mb-4">WORK WITH ME</h2>
            <p className="text-muted-foreground mb-6">
              Interested in commissions, collaborations, or purchasing artwork? Let's create something amazing together.
            </p>
            <a 
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 bg-foreground text-background font-bold hover:opacity-90"
            >
              GET IN TOUCH
              <ChevronRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
