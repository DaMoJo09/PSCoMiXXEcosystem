import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Zap,
  Trophy,
  Star,
  Clock,
  Target,
  Sparkles,
  Lock,
  ExternalLink,
} from "lucide-react";

export default function CurriculumViewer() {
  const [, params] = useRoute("/ecosystem/learn/curriculum/:slug");
  const slug = params?.slug || "";
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedWeek, setExpandedWeek] = useState<number | null>(1);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/curriculum", slug],
    queryFn: async () => {
      const res = await fetch(`/api/curriculum/${slug}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load curriculum");
      return res.json();
    },
    enabled: !!slug,
  });

  const completeMutation = useMutation({
    mutationFn: async (objectiveId: string) => {
      const res = await fetch(`/api/curriculum/${slug}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ objectiveId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/curriculum", slug] });
      queryClient.invalidateQueries({ queryKey: ["/api/curriculum"] });
      toast.success(`+${result.xpAwarded} XP earned!`, { duration: 3000 });
      if (result.challengeCompleted) {
        setTimeout(() => {
          toast.success(`🏆 Weekly Challenge Complete! +${result.challengeCompleted.xpAwarded} XP`, { duration: 5000 });
        }, 1000);
      }
    },
    onError: (err: any) => toast.error(err.message || "Already completed"),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">Loading curriculum...</div>
      </div>
    );
  }

  if (!data?.curriculum) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-zinc-400 text-lg">Curriculum not found</p>
          <Link href="/ecosystem/learn">
            <button className="px-6 py-2 border-2 border-white font-bold hover:bg-white hover:text-black transition-colors" data-testid="btn-back-learn">
              BACK TO LEARN
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const { curriculum: curr, progress } = data;
  const completedSet = new Set(progress.completedObjectives);
  const overallPct = progress.totalObjectives > 0
    ? Math.round((progress.completedObjectives.length / progress.totalObjectives) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 z-50 bg-zinc-950 border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/ecosystem/learn">
              <button className="p-2 hover:bg-zinc-800 transition-colors" data-testid="btn-back-learn">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-sm font-black tracking-wide" style={{ color: curr.accent }}>{curr.title}</h1>
              <p className="text-[10px] text-zinc-500 tracking-widest uppercase">{curr.subtitle} — 6-Week Curriculum</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4" style={{ color: curr.accent }} />
              <span className="font-bold" style={{ color: curr.accent }}>{progress.totalXpEarned}</span>
              <span className="text-zinc-500">/ {progress.totalXpAvailable} XP</span>
            </div>
            <a
              href={`/curricula/${slug}.html`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              title="View original curriculum"
              data-testid="btn-open-external"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${overallPct}%`, backgroundColor: curr.accent }}
              />
            </div>
            <span className="text-xs font-bold min-w-[3rem] text-right" style={{ color: curr.accent }}>
              {overallPct}%
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {curr.weeks.map((week: any, wi: number) => {
          const wp = progress.weekProgress[wi];
          const weekPct = wp && wp.total > 0 ? Math.round((wp.completed / wp.total) * 100) : 0;
          const isExpanded = expandedWeek === week.number;
          const allDone = wp && wp.completed === wp.total && wp.total > 0;

          return (
            <div key={week.number} className="border border-zinc-800 bg-zinc-950" data-testid={`week-${week.number}`}>
              <button
                onClick={() => setExpandedWeek(isExpanded ? null : week.number)}
                className="w-full p-5 flex items-center gap-4 text-left hover:bg-zinc-900 transition-colors"
                data-testid={`btn-toggle-week-${week.number}`}
              >
                <div
                  className="w-12 h-12 border-2 flex items-center justify-center font-black text-lg shrink-0"
                  style={{
                    borderColor: allDone ? curr.accent : "rgb(63 63 70)",
                    color: allDone ? curr.accent : "rgb(161 161 170)",
                    backgroundColor: allDone ? `${curr.accent}15` : "transparent",
                  }}
                >
                  {allDone ? <Trophy className="w-5 h-5" /> : week.number}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] text-zinc-500 tracking-widest uppercase">{week.tag}</span>
                  </div>
                  <h2 className="font-black text-lg tracking-tight">{week.title}</h2>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Deliverable: <span className="text-zinc-400">{week.deliverable}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-bold" style={{ color: allDone ? curr.accent : "rgb(161 161 170)" }}>
                      {wp?.completed || 0}/{wp?.total || 0}
                    </div>
                    <div className="w-20 h-1.5 bg-zinc-800 mt-1">
                      <div
                        className="h-full transition-all duration-500"
                        style={{ width: `${weekPct}%`, backgroundColor: curr.accent }}
                      />
                    </div>
                  </div>
                  {wp?.challengeDone && (
                    <div className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold" style={{ color: curr.accent, backgroundColor: `${curr.accent}15`, border: `1px solid ${curr.accent}30` }}>
                      <Star className="w-3 h-3" />
                      +{week.challengeXp}
                    </div>
                  )}
                  {isExpanded ? <ChevronDown className="w-5 h-5 text-zinc-500" /> : <ChevronRight className="w-5 h-5 text-zinc-500" />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-zinc-800">
                  {week.sessions.map((session: any) => {
                    const isSessionExpanded = expandedSession === session.id;
                    const sessionComplete = session.objectives.every((o: any) => completedSet.has(o.id));
                    const sessionProgress = session.objectives.filter((o: any) => completedSet.has(o.id)).length;

                    return (
                      <div key={session.id} className="border-b border-zinc-800/50 last:border-0" data-testid={`session-${session.id}`}>
                        <button
                          onClick={() => setExpandedSession(isSessionExpanded ? null : session.id)}
                          className="w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-zinc-900/50 transition-colors"
                          data-testid={`btn-toggle-session-${session.id}`}
                        >
                          <div className="w-6 h-6 flex items-center justify-center shrink-0">
                            {sessionComplete ? (
                              <CheckCircle2 className="w-5 h-5" style={{ color: curr.accent }} />
                            ) : (
                              <Circle className="w-5 h-5 text-zinc-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-zinc-500">{session.number}</span>
                              <span className="font-bold text-sm">{session.title}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-[10px] text-zinc-600 tracking-wider uppercase">{session.type}</span>
                              <span className="text-[10px] text-zinc-600 flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" /> {session.duration}m
                              </span>
                            </div>
                          </div>
                          <div className="text-[10px] text-zinc-500 font-bold shrink-0">
                            {sessionProgress}/{session.objectives.length}
                          </div>
                          {isSessionExpanded ? <ChevronDown className="w-4 h-4 text-zinc-600" /> : <ChevronRight className="w-4 h-4 text-zinc-600" />}
                        </button>

                        {isSessionExpanded && (
                          <div className="px-5 pb-4 pl-14 space-y-1">
                            <p className="text-zinc-400 text-xs mb-3 leading-relaxed">{session.summary}</p>
                            {session.objectives.map((obj: any) => {
                              const done = completedSet.has(obj.id);
                              const hasAutoTrigger = !!obj.trigger;

                              return (
                                <div
                                  key={obj.id}
                                  className={`flex items-center gap-3 p-2.5 border transition-all ${
                                    done
                                      ? "border-zinc-800 bg-zinc-900/30"
                                      : "border-zinc-800 hover:border-zinc-700"
                                  }`}
                                  data-testid={`objective-${obj.id}`}
                                >
                                  {done ? (
                                    <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: curr.accent }} />
                                  ) : hasAutoTrigger ? (
                                    <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                                      <Target className="w-4 h-4 text-zinc-600" />
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => completeMutation.mutate(obj.id)}
                                      disabled={completeMutation.isPending}
                                      className="w-5 h-5 shrink-0 border border-zinc-600 hover:border-white transition-colors cursor-pointer flex items-center justify-center"
                                      data-testid={`btn-complete-${obj.id}`}
                                    >
                                    </button>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className={`text-sm font-medium ${done ? "text-zinc-500 line-through" : "text-white"}`}>
                                      {obj.title}
                                    </div>
                                    <div className="text-[10px] text-zinc-600 mt-0.5">{obj.description}</div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {hasAutoTrigger && !done && (
                                      <span className="text-[9px] px-1.5 py-0.5 border border-zinc-700 text-zinc-500 tracking-wider uppercase flex items-center gap-1">
                                        <Sparkles className="w-2.5 h-2.5" /> AUTO
                                      </span>
                                    )}
                                    <span className={`text-[10px] font-bold flex items-center gap-0.5 ${done ? "text-zinc-600" : ""}`} style={done ? {} : { color: curr.accent }}>
                                      <Zap className="w-3 h-3" /> {obj.xpReward}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {wp && !wp.challengeDone && wp.completed === wp.total && wp.total > 0 && (
                    <div className="px-5 py-4 border-t border-zinc-800" style={{ backgroundColor: `${curr.accent}08` }}>
                      <div className="flex items-center gap-3">
                        <Trophy className="w-6 h-6" style={{ color: curr.accent }} />
                        <div className="flex-1">
                          <div className="font-black text-sm" style={{ color: curr.accent }}>WEEKLY CHALLENGE COMPLETE!</div>
                          <div className="text-[11px] text-zinc-400">{week.challengeTitle}</div>
                        </div>
                        <div className="flex items-center gap-1 text-sm font-bold" style={{ color: curr.accent }}>
                          <Zap className="w-4 h-4" /> +{week.challengeXp} XP
                        </div>
                      </div>
                    </div>
                  )}

                  {wp && wp.challengeDone && (
                    <div className="px-5 py-3 border-t border-zinc-800 flex items-center gap-3" style={{ backgroundColor: `${curr.accent}08` }}>
                      <CheckCircle2 className="w-5 h-5" style={{ color: curr.accent }} />
                      <span className="text-sm font-bold" style={{ color: curr.accent }}>Week {week.number} Challenge Complete</span>
                      <span className="text-[10px] text-zinc-500">+{week.challengeXp} XP earned</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {overallPct === 100 && (
          <div className="border-2 p-8 text-center" style={{ borderColor: curr.accent, backgroundColor: `${curr.accent}10` }}>
            <Trophy className="w-16 h-16 mx-auto mb-4" style={{ color: curr.accent }} />
            <h2 className="text-2xl font-black mb-2" style={{ color: curr.accent }}>CURRICULUM COMPLETE!</h2>
            <p className="text-zinc-400 mb-2">You've mastered every objective in {curr.title} — {curr.subtitle}</p>
            <div className="flex items-center justify-center gap-2 text-lg font-bold" style={{ color: curr.accent }}>
              <Zap className="w-5 h-5" /> {progress.totalXpEarned} XP Total
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
