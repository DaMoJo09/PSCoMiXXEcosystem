import { Layout } from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { 
  BookOpen, Play, Clock, Star, ChevronRight,
  Palette, Film, PenTool, Lightbulb, Code, Gamepad2
} from "lucide-react";

const categoryIcons: Record<string, React.ElementType> = {
  comics: BookOpen,
  animation: Film,
  "3d": Gamepad2,
  worldbuilding: Lightbulb,
  writing: PenTool,
  tools: Code,
};

export default function LearnModule() {
  const { isAuthenticated } = useAuth();

  const { data: pathways, isLoading } = useQuery({
    queryKey: ["ecosystem", "pathways"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/ecosystem/pathways");
      return res.json();
    },
  });

  const { data: progress } = useQuery({
    queryKey: ["ecosystem", "progress"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/ecosystem/progress");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const getPathwayProgress = (pathwayId: string) => {
    if (!progress) return 0;
    const pathwayProgress = progress.filter((p: any) => p.pathwayId === pathwayId);
    const completed = pathwayProgress.filter((p: any) => p.status === "completed").length;
    return pathwayProgress.length > 0 ? Math.round((completed / pathwayProgress.length) * 100) : 0;
  };

  const samplePathways = [
    { id: "1", title: "Comic Creation Fundamentals", category: "comics", difficulty: "beginner", estimatedHours: 8, xpReward: 200, description: "Learn the basics of creating compelling comics" },
    { id: "2", title: "Animation Principles", category: "animation", difficulty: "beginner", estimatedHours: 12, xpReward: 300, description: "Master the 12 principles of animation" },
    { id: "3", title: "Worldbuilding Mastery", category: "worldbuilding", difficulty: "intermediate", estimatedHours: 15, xpReward: 400, description: "Create immersive worlds for your stories" },
    { id: "4", title: "Visual Novel Writing", category: "writing", difficulty: "intermediate", estimatedHours: 10, xpReward: 250, description: "Write engaging branching narratives" },
    { id: "5", title: "Motion Graphics", category: "animation", difficulty: "advanced", estimatedHours: 20, xpReward: 500, description: "Create dynamic motion graphics" },
    { id: "6", title: "3D Character Design", category: "3d", difficulty: "advanced", estimatedHours: 25, xpReward: 600, description: "Design and model 3D characters" },
  ];

  const displayPathways = pathways?.length > 0 ? pathways : samplePathways;

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <header className="mb-8">
            <Link 
              href="/ecosystem" 
              className="text-zinc-400 hover:text-white text-sm mb-4 inline-flex items-center gap-2"
              data-testid="link-back-ecosystem"
            >
              <ChevronRight className="w-4 h-4 rotate-180" /> Back to Ecosystem
            </Link>
            <div className="flex items-center gap-3 mt-4">
              <div className="w-12 h-12 bg-white flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-3xl font-black" data-testid="text-page-title">LEARN</h1>
                <p className="text-zinc-400 font-mono text-sm">
                  Master new skills through guided pathways
                </p>
              </div>
            </div>
          </header>

          <section className="mb-8">
            <div className="flex gap-2 flex-wrap">
              {Object.entries(categoryIcons).map(([category, Icon]) => (
                <button
                  key={category}
                  className="px-4 py-2 bg-zinc-900 border-2 border-zinc-700 hover:border-white text-sm font-bold flex items-center gap-2 capitalize"
                  data-testid={`button-category-${category}`}
                >
                  <Icon className="w-4 h-4" />
                  {category}
                </button>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayPathways.map((pathway: any) => {
              const Icon = categoryIcons[pathway.category] || BookOpen;
              const progressPercent = getPathwayProgress(pathway.id);
              
              return (
                <div
                  key={pathway.id}
                  className="bg-zinc-900 border-4 border-zinc-800 hover:border-white transition-all group"
                  data-testid={`card-pathway-${pathway.id}`}
                >
                  <div className="h-2 bg-white" />
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 flex items-center justify-center bg-white">
                        <Icon className="w-5 h-5 text-black" />
                      </div>
                      <span className={`text-xs font-mono px-2 py-1 border ${
                        pathway.difficulty === "beginner" ? "border-zinc-500" :
                        pathway.difficulty === "intermediate" ? "border-zinc-400" :
                        "border-white"
                      }`} data-testid={`text-difficulty-${pathway.id}`}>
                        {pathway.difficulty.toUpperCase()}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-black mb-2" data-testid={`text-pathway-title-${pathway.id}`}>{pathway.title}</h3>
                    <p className="text-zinc-400 text-sm mb-4">{pathway.description}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-zinc-500 mb-4">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {pathway.estimatedHours}h
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        +{pathway.xpReward} XP
                      </span>
                    </div>

                    {isAuthenticated && progressPercent > 0 && (
                      <div className="mb-4">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-zinc-400">Progress</span>
                          <span data-testid={`text-progress-${pathway.id}`}>{progressPercent}%</span>
                        </div>
                        <div className="h-2 bg-zinc-800">
                          <div 
                            className="h-full bg-white"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <button 
                      className="w-full py-3 bg-white text-black font-bold flex items-center justify-center gap-2 hover:bg-zinc-200"
                      data-testid={`button-start-pathway-${pathway.id}`}
                    >
                      <Play className="w-4 h-4" />
                      {progressPercent > 0 ? "Continue" : "Start Learning"}
                    </button>
                  </div>
                </div>
              );
            })}
          </section>

          {isLoading && (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-white border-t-transparent animate-spin mx-auto" />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
