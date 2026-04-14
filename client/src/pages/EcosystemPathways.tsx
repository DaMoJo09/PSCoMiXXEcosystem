import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { BookOpen, CheckCircle, Play, Clock, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface Pathway {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedHours: number;
  xpReward: number;
  lessonCount: number;
  published: boolean;
  userProgress: {
    status: string;
    percentComplete: number;
    xpEarned: number;
  } | null;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "text-zinc-400",
  intermediate: "text-zinc-300",
  advanced: "text-white",
};

export default function EcosystemPathways() {
  const [pathways, setPathways] = useState<Pathway[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  const loadPathways = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ecosystem/pathways", { credentials: "include" });
      if (res.ok) setPathways(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadPathways(); }, [loadPathways]);

  const handleEnroll = useCallback(async (pathwayId: string) => {
    setEnrolling(pathwayId);
    try {
      const res = await fetch(`/api/ecosystem/pathways/${pathwayId}/enroll`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Enrolled in pathway!");
        loadPathways();
      }
    } catch {}
    setEnrolling(null);
  }, [loadPathways]);

  if (loading) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex-1 overflow-auto bg-black">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-8 h-8 text-white" />
            <h1 className="text-2xl font-bold text-white tracking-wide" data-testid="text-pathways-title">PATHWAYS</h1>
          </div>
          <p className="text-zinc-500 text-sm mb-8">
            Structured learning paths for creative technology mastery. Complete pathways to earn XP, badges, and unlock career opportunities.
          </p>

          <div className="space-y-4">
            {pathways.map(pathway => {
              const progress = pathway.userProgress;
              const isEnrolled = !!progress;
              const isCompleted = progress?.status === 'completed';

              return (
                <div key={pathway.id} className="bg-zinc-900 border border-zinc-800 p-5" data-testid={`pathway-${pathway.slug}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5 text-white" />
                        ) : isEnrolled ? (
                          <Play className="w-5 h-5 text-zinc-400" />
                        ) : (
                          <BookOpen className="w-5 h-5 text-zinc-600" />
                        )}
                        <h3 className="text-white font-semibold">{pathway.title}</h3>
                        <span className={`text-xs ${DIFFICULTY_COLORS[pathway.difficulty] || 'text-zinc-500'}`}>
                          {pathway.difficulty}
                        </span>
                      </div>
                      {pathway.description && (
                        <p className="text-zinc-500 text-sm ml-8 mb-3">{pathway.description}</p>
                      )}

                      <div className="flex items-center gap-4 ml-8 text-xs text-zinc-600">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {pathway.estimatedHours}h</span>
                        <span>{pathway.xpReward} XP Reward</span>
                        <span className="capitalize">{pathway.category}</span>
                      </div>

                      {isEnrolled && !isCompleted && (
                        <div className="ml-8 mt-3">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex-1 h-1.5 bg-zinc-800">
                              <div className="h-full bg-white transition-all" style={{ width: `${progress?.percentComplete || 0}%` }} />
                            </div>
                            <span className="text-xs text-zinc-400">{progress?.percentComplete || 0}%</span>
                          </div>
                          <div className="text-xs text-zinc-600">{progress?.xpEarned || 0} XP earned</div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <span className="text-xs bg-white/10 text-white px-3 py-1.5 font-medium">COMPLETED</span>
                      ) : isEnrolled ? (
                        <span className="text-xs bg-zinc-800 text-zinc-400 px-3 py-1.5">IN PROGRESS</span>
                      ) : (
                        <button
                          onClick={() => handleEnroll(pathway.id)}
                          disabled={enrolling === pathway.id}
                          className="text-xs bg-white text-black px-3 py-1.5 font-medium hover:bg-zinc-200 transition disabled:opacity-50"
                          data-testid={`button-enroll-${pathway.slug}`}
                        >
                          {enrolling === pathway.id ? "..." : "Enroll"}
                        </button>
                      )}
                      <ChevronRight className="w-4 h-4 text-zinc-700" />
                    </div>
                  </div>
                </div>
              );
            })}

            {pathways.length === 0 && (
              <div className="text-center py-12 text-zinc-600">
                <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p>No pathways available yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
