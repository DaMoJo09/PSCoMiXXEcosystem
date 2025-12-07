import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { 
  GraduationCap, Rocket, Users, Trophy, DollarSign, Calendar, 
  School, Building2, Sparkles, TrendingUp, Award, Star,
  BookOpen, Palette, Film, Gamepad2, PenTool, ChevronRight,
  Zap, Target, Crown, Heart
} from "lucide-react";

type CreatorTier = "learner" | "creator" | "mentor" | "professional" | "founder" | "community_builder";

const tierThresholds: Record<CreatorTier, number> = {
  learner: 0,
  creator: 500,
  mentor: 2000,
  professional: 5000,
  founder: 15000,
  community_builder: 50000,
};

const tierDisplayNames: Record<CreatorTier, string> = {
  learner: "Learner",
  creator: "Creator",
  mentor: "Mentor",
  professional: "Professional",
  founder: "Founder",
  community_builder: "Community Builder",
};

export default function EcosystemHub() {
  const { user, isAuthenticated } = useAuth();

  const { data: progression, isLoading: progressionLoading } = useQuery({
    queryKey: ["ecosystem", "progression"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/ecosystem/progression");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const { data: pathways } = useQuery({
    queryKey: ["ecosystem", "pathways"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/ecosystem/pathways");
      return res.json();
    },
  });

  const { data: festivals } = useQuery({
    queryKey: ["ecosystem", "festivals"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/ecosystem/festivals");
      return res.json();
    },
  });

  const { data: teams } = useQuery({
    queryKey: ["ecosystem", "teams"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/ecosystem/teams");
      return res.json();
    },
  });

  const currentTier: CreatorTier = progression?.xp?.currentTier || "learner";
  const totalXp = progression?.xp?.totalXp || 0;
  const level = progression?.xp?.level || 1;

  const getNextTierXp = () => {
    const tiers = Object.keys(tierThresholds) as CreatorTier[];
    const currentIndex = tiers.indexOf(currentTier);
    if (currentIndex < tiers.length - 1) {
      return tierThresholds[tiers[currentIndex + 1]];
    }
    return tierThresholds.community_builder;
  };

  const getProgressToNextTier = () => {
    const nextXp = getNextTierXp();
    const currentThreshold = tierThresholds[currentTier];
    const xpInCurrentTier = totalXp - currentThreshold;
    const xpNeededForNext = nextXp - currentThreshold;
    return Math.min(100, Math.round((xpInCurrentTier / xpNeededForNext) * 100));
  };

  const modules = [
    {
      id: "learn",
      title: "LEARN",
      description: "Master new skills through guided pathways",
      icon: GraduationCap,
      href: "/ecosystem/learn",
      stats: `${pathways?.length || 0} Pathways`,
    },
    {
      id: "create",
      title: "CREATE",
      description: "Build comics, animations, and more",
      icon: Palette,
      href: "/dashboard",
      stats: `${progression?.xp?.projectsCompleted || 0} Projects`,
    },
    {
      id: "publish",
      title: "PUBLISH",
      description: "Share your work with the world",
      icon: Rocket,
      href: "/ecosystem/publish",
      stats: "Multi-platform",
    },
    {
      id: "collaborate",
      title: "COLLABORATE",
      description: "Find teammates and build together",
      icon: Users,
      href: "/ecosystem/collaborate",
      stats: `${teams?.length || 0} Teams`,
    },
    {
      id: "earn",
      title: "EARN",
      description: "Monetize your creative work",
      icon: DollarSign,
      href: "/ecosystem/earn",
      stats: "Revenue Dashboard",
    },
    {
      id: "events",
      title: "EVENTS",
      description: "Press Play Festival & workshops",
      icon: Calendar,
      href: "/ecosystem/events",
      stats: `${festivals?.length || 0} Festivals`,
    },
  ];

  const creatorTools = [
    { name: "Comic Creator", icon: BookOpen, href: "/comic/new" },
    { name: "Trading Cards", icon: Gamepad2, href: "/card/new" },
    { name: "Visual Novel", icon: Film, href: "/vn/new" },
    { name: "CYOA Stories", icon: Target, href: "/cyoa/new" },
    { name: "Cover Design", icon: PenTool, href: "/cover/new" },
    { name: "Motion Comics", icon: Sparkles, href: "/motion/new" },
  ];

  const progressionLadder: { tier: CreatorTier; icon: React.ElementType }[] = [
    { tier: "learner", icon: BookOpen },
    { tier: "creator", icon: Palette },
    { tier: "mentor", icon: GraduationCap },
    { tier: "professional", icon: Award },
    { tier: "founder", icon: Crown },
    { tier: "community_builder", icon: Heart },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <header className="mb-12">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white text-black flex items-center justify-center font-black text-xl">
                PS
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight" data-testid="text-page-title">ECOSYSTEM HUB</h1>
                <p className="text-zinc-400 font-mono text-sm">
                  Learn / Create / Publish / Earn / Collaborate
                </p>
              </div>
            </div>
          </header>

          {isAuthenticated && (
            <section className="mb-12 bg-zinc-900 border-4 border-white p-6" data-testid="section-creator-progression">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-black mb-1">CREATOR PROGRESSION</h2>
                  <p className="text-zinc-400 text-sm font-mono" data-testid="text-welcome">
                    Welcome back, {user?.name}
                  </p>
                </div>
                <div 
                  className="px-4 py-2 text-sm font-black flex items-center gap-2 bg-white text-black"
                  data-testid="text-current-tier"
                >
                  <Zap className="w-4 h-4" />
                  {tierDisplayNames[currentTier].toUpperCase()}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-black border-2 border-zinc-700 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-5 h-5" />
                    <span className="text-zinc-400 text-sm">Total XP</span>
                  </div>
                  <p className="text-3xl font-black" data-testid="text-total-xp">{totalXp.toLocaleString()}</p>
                </div>
                <div className="bg-black border-2 border-zinc-700 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5" />
                    <span className="text-zinc-400 text-sm">Level</span>
                  </div>
                  <p className="text-3xl font-black" data-testid="text-level">{level}</p>
                </div>
                <div className="bg-black border-2 border-zinc-700 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-5 h-5" />
                    <span className="text-zinc-400 text-sm">Badges Earned</span>
                  </div>
                  <p className="text-3xl font-black" data-testid="text-badges">{progression?.badges?.length || 0}</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-400">Progress to {tierDisplayNames[currentTier === "community_builder" ? "community_builder" : (Object.keys(tierThresholds) as CreatorTier[])[Object.keys(tierThresholds).indexOf(currentTier) + 1] as CreatorTier]}</span>
                  <span className="font-mono" data-testid="text-xp-progress">{totalXp} / {getNextTierXp()} XP</span>
                </div>
                <div className="h-4 bg-zinc-800 border border-zinc-700">
                  <div 
                    className="h-full transition-all duration-500 bg-white"
                    style={{ width: `${getProgressToNextTier()}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {progressionLadder.map((step, index) => {
                  const isActive = currentTier === step.tier;
                  const isPast = Object.keys(tierThresholds).indexOf(currentTier) > index;
                  const Icon = step.icon;
                  return (
                    <div 
                      key={step.tier}
                      className="flex items-center"
                      data-testid={`tier-step-${step.tier}`}
                    >
                      <div 
                        className={`w-10 h-10 flex items-center justify-center border-2 ${
                          isActive ? "border-white bg-white text-black" :
                          isPast ? "border-zinc-400 bg-zinc-700 text-white" :
                          "border-zinc-700 bg-zinc-900 text-zinc-500"
                        }`}
                        title={tierDisplayNames[step.tier]}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      {index < progressionLadder.length - 1 && (
                        <div className={`w-4 h-0.5 ${isPast ? "bg-zinc-400" : "bg-zinc-700"}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="mb-12">
            <h2 className="text-2xl font-black mb-6 flex items-center gap-3" data-testid="text-section-modules">
              <div className="w-2 h-8 bg-white" />
              ECOSYSTEM MODULES
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map((module) => {
                const Icon = module.icon;
                return (
                  <Link 
                    key={module.id}
                    href={module.href}
                    className="group bg-zinc-900 border-4 border-zinc-800 hover:border-white p-6 transition-all"
                    data-testid={`link-module-${module.id}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 flex items-center justify-center bg-white">
                        <Icon className="w-6 h-6 text-black" />
                      </div>
                      <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-white transition-colors" />
                    </div>
                    <h3 className="text-xl font-black mb-2">{module.title}</h3>
                    <p className="text-zinc-400 text-sm mb-4">{module.description}</p>
                    <div className="text-xs font-mono text-zinc-500 bg-zinc-800 px-2 py-1 inline-block">
                      {module.stats}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-black mb-6 flex items-center gap-3" data-testid="text-section-tools">
              <div className="w-2 h-8 bg-white" />
              CREATOR TOOLS
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {creatorTools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.name}
                    href={tool.href}
                    className="group bg-zinc-900 border-2 border-zinc-800 hover:border-white p-4 text-center transition-all"
                    data-testid={`link-tool-${tool.name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform bg-white">
                      <Icon className="w-6 h-6 text-black" />
                    </div>
                    <p className="text-sm font-bold">{tool.name}</p>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="mb-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-zinc-900 border-4 border-zinc-800 p-6">
              <div className="flex items-center gap-3 mb-4">
                <School className="w-6 h-6" />
                <h3 className="text-xl font-black">SCHOOL STATIONS</h3>
              </div>
              <p className="text-zinc-400 text-sm mb-4">
                Connect your school, upload student projects, and participate in challenges.
              </p>
              <Link 
                href="/ecosystem/schools"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black font-bold text-sm hover:bg-zinc-200"
                data-testid="link-school-stations"
              >
                Explore Schools <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-zinc-900 border-4 border-zinc-800 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Building2 className="w-6 h-6" />
                <h3 className="text-xl font-black">CREATOR HUBS</h3>
              </div>
              <p className="text-zinc-400 text-sm mb-4">
                Access local studios, equipment, and collaborate with nearby creators.
              </p>
              <Link 
                href="/ecosystem/hubs"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black font-bold text-sm hover:bg-zinc-200"
                data-testid="link-creator-hubs"
              >
                Find Hubs <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </section>

          {festivals && festivals.length > 0 && (
            <section className="mb-12">
              <div className="bg-zinc-900 border-4 border-white p-8">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="inline-block bg-white text-black px-3 py-1 text-sm font-black mb-4">
                      PRESS PLAY FESTIVAL
                    </div>
                    <h3 className="text-3xl font-black mb-2" data-testid="text-festival-name">{festivals[0].name}</h3>
                    <p className="text-zinc-300 mb-4">{festivals[0].description || "The ultimate showcase for creators"}</p>
                    <div className="flex gap-4">
                      <Link 
                        href={`/ecosystem/events/${festivals[0].id}`}
                        className="px-6 py-3 bg-white text-black font-bold hover:bg-zinc-200"
                        data-testid="link-festival-learn"
                      >
                        Learn More
                      </Link>
                      <Link 
                        href={`/ecosystem/events/${festivals[0].id}/submit`}
                        className="px-6 py-3 border-2 border-white font-bold hover:bg-white/10"
                        data-testid="link-festival-submit"
                      >
                        Submit Work
                      </Link>
                    </div>
                  </div>
                  <Trophy className="w-24 h-24 text-white" />
                </div>
              </div>
            </section>
          )}

          <section className="text-center py-12 border-t border-zinc-800">
            <p className="text-zinc-500 font-mono text-sm mb-4">
              PRESS START | MMM ECOSYSTEM
            </p>
            <div className="flex items-center justify-center gap-6 text-zinc-600 text-sm">
              <span>PSCoMiXX</span>
              <span className="text-zinc-700">|</span>
              <span>PSStreaming</span>
              <span className="text-zinc-700">|</span>
              <span>MAD-Ts</span>
              <span className="text-zinc-700">|</span>
              <span>Creator Hubs</span>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
