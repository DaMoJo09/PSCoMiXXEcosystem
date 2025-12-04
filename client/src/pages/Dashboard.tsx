import { Layout } from "@/components/layout/Layout";
import { Plus, ArrowRight, Clock, Star, MoreHorizontal } from "lucide-react";
import { Link } from "wouter";
import noirComic from "@assets/generated_images/noir_comic_panel.png";
import cardArt from "@assets/generated_images/cyberpunk_trading_card_art.png";
import vnBg from "@assets/generated_images/visual_novel_background.png";
import coverArt from "@assets/generated_images/comic_cover_art.png";

const recentProjects = [
  {
    id: 1,
    title: "Neon Rain: Vol 1",
    type: "Comic",
    updated: "2 hours ago",
    image: noirComic,
    progress: 45,
  },
  {
    id: 2,
    title: "Cyber Samurai Deck",
    type: "Card Set",
    updated: "5 hours ago",
    image: cardArt,
    progress: 80,
  },
  {
    id: 3,
    title: "Academy Days",
    type: "Visual Novel",
    updated: "1 day ago",
    image: vnBg,
    progress: 12,
  },
  {
    id: 4,
    title: "Issue #4 Cover",
    type: "Cover Art",
    updated: "2 days ago",
    image: coverArt,
    progress: 100,
  },
];

const quickActions = [
  { title: "New Comic", href: "/creator/comic", desc: "Create a sequential story" },
  { title: "New Card", href: "/creator/card", desc: "Design a trading card" },
  { title: "New Visual Novel", href: "/creator/vn", desc: "Interactive story engine" },
  { title: "New Cover", href: "/creator/cover", desc: "Poster & cover art" },
];

export default function Dashboard() {
  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex items-end justify-between border-b border-border pb-6">
          <div>
            <h1 className="text-4xl font-display font-bold uppercase tracking-tighter">
              Creator Hub
            </h1>
            <p className="text-muted-foreground mt-2 font-mono">
              Welcome back. Ready to create?
            </p>
          </div>
          <div className="flex gap-4">
            <button className="px-4 py-2 bg-secondary hover:bg-border transition-colors font-medium text-sm border border-border flex items-center gap-2">
              <Clock className="w-4 h-4" />
              History
            </button>
            <button className="px-4 py-2 bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium text-sm flex items-center gap-2 shadow-hard-sm">
              <Plus className="w-4 h-4" />
              New Project
            </button>
          </div>
        </div>

        {/* Quick Start */}
        <section>
          <h2 className="text-xl font-display font-bold mb-6 flex items-center gap-2">
            <Star className="w-5 h-5" /> Quick Start
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action) => (
              <Link key={action.title} href={action.href}>
                <a className="group block p-6 border border-border hover:border-primary hover:shadow-hard transition-all bg-card h-full flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold font-display uppercase group-hover:underline decoration-2 underline-offset-4">
                      {action.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      {action.desc}
                    </p>
                  </div>
                  <div className="mt-8 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </a>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent Projects */}
        <section>
          <h2 className="text-xl font-display font-bold mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5" /> Recent Projects
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recentProjects.map((project) => (
              <div key={project.id} className="group border border-border bg-card hover:shadow-hard transition-all cursor-pointer">
                <div className="aspect-[4/3] overflow-hidden border-b border-border relative">
                  <img 
                    src={project.image} 
                    alt={project.title}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                  />
                  <div className="absolute top-2 right-2 bg-background border border-border px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider">
                    {project.type}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold font-display truncate pr-2">{project.title}</h3>
                    <button className="text-muted-foreground hover:text-foreground">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mb-4">Edited {project.updated}</p>
                  
                  <div className="w-full h-1 bg-secondary">
                    <div 
                      className="h-full bg-primary transition-all duration-500" 
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}
