import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { Briefcase, Send, Clock, CheckCircle, XCircle, ChevronRight, Users, Star } from "lucide-react";
import { toast } from "sonner";

interface Track {
  id: string;
  name: string;
  description: string;
  department: string;
  minXp: number;
  minLevel: number;
  maxSlots: number;
  currentSlots: number;
  status: string;
  isPaid: boolean;
  duration: string;
}

interface Application {
  id: string;
  trackId: string;
  status: string;
  applicationNote: string;
  reviewNotes: string;
  xpAtApplication: number;
  levelAtApplication: number;
  createdAt: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: any }> = {
  submitted: { bg: "bg-zinc-800", text: "text-zinc-300", icon: Clock },
  reviewing: { bg: "bg-zinc-700", text: "text-white", icon: Clock },
  accepted: { bg: "bg-white/10", text: "text-white", icon: CheckCircle },
  waitlisted: { bg: "bg-zinc-800", text: "text-zinc-400", icon: Clock },
  active: { bg: "bg-white/20", text: "text-white", icon: Star },
  completed: { bg: "bg-white/10", text: "text-white", icon: CheckCircle },
  rejected: { bg: "bg-zinc-900", text: "text-zinc-600", icon: XCircle },
};

export default function ApprenticeshipPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [appNote, setAppNote] = useState("");
  const [applying, setApplying] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tracksRes, appsRes] = await Promise.all([
        fetch("/api/ecosystem/apprenticeships/tracks", { credentials: "include" }),
        fetch("/api/ecosystem/apprenticeships/applications", { credentials: "include" }),
      ]);
      if (tracksRes.ok) setTracks(await tracksRes.json());
      if (appsRes.ok) setApplications(await appsRes.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApply = useCallback(async () => {
    if (!selectedTrack) return;
    setApplying(true);
    try {
      const res = await fetch("/api/ecosystem/apprenticeships/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          trackId: selectedTrack.id,
          applicationNote: appNote,
        }),
      });
      if (res.ok) {
        toast.success("Application submitted!");
        setSelectedTrack(null);
        setAppNote("");
        loadData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to submit application");
      }
    } catch {
      toast.error("Failed to submit application");
    }
    setApplying(false);
  }, [selectedTrack, appNote, loadData]);

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
            <Briefcase className="w-8 h-8 text-white" />
            <h1 className="text-2xl font-bold text-white tracking-wide" data-testid="text-apprenticeship-title">
              APPRENTICESHIP PROGRAM
            </h1>
          </div>
          <p className="text-zinc-500 text-sm mb-8">
            Press Start Creative Tech Apprenticeship Program — real pathways to real creative work at MADMIXEDMEDIA.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            {tracks.map(track => {
              const hasApp = applications.some(a => a.trackId === track.id && !['rejected', 'completed'].includes(a.status));
              const slotsAvail = track.maxSlots - (track.currentSlots || 0);
              return (
                <div key={track.id} className="bg-zinc-900 border border-zinc-800 p-5" data-testid={`card-track-${track.id}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-semibold">{track.name}</h3>
                      {track.department && <span className="text-xs text-zinc-500">{track.department}</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {track.isPaid && <span className="text-xs bg-white/10 text-white px-2 py-0.5">PAID</span>}
                      <span className={`text-xs px-2 py-0.5 ${track.status === 'active' ? 'bg-white/5 text-zinc-400' : 'bg-zinc-800 text-zinc-600'}`}>
                        {track.status}
                      </span>
                    </div>
                  </div>

                  {track.description && <p className="text-zinc-500 text-sm mb-3">{track.description}</p>}

                  <div className="flex items-center gap-4 text-xs text-zinc-600 mb-4">
                    <span>Min XP: {track.minXp?.toLocaleString()}</span>
                    <span>Min Level: {track.minLevel}</span>
                    {track.duration && <span>Duration: {track.duration}</span>}
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {slotsAvail}/{track.maxSlots} slots</span>
                  </div>

                  {hasApp ? (
                    <div className="text-xs text-zinc-400 bg-zinc-800 px-3 py-2">
                      Application submitted — check status below
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedTrack(track)}
                      className="w-full px-4 py-2 bg-white text-black text-sm font-medium hover:bg-zinc-200 transition flex items-center justify-center gap-2"
                      data-testid={`button-apply-${track.id}`}
                    >
                      <Send className="w-3 h-3" /> Apply
                    </button>
                  )}
                </div>
              );
            })}
            {tracks.length === 0 && (
              <div className="col-span-2 text-center py-12 text-zinc-600">
                <Briefcase className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p>No apprenticeship tracks available yet. Check back soon.</p>
              </div>
            )}
          </div>

          {applications.length > 0 && (
            <div>
              <h2 className="text-white font-semibold mb-4">Your Applications</h2>
              <div className="space-y-2">
                {applications.map(app => {
                  const track = tracks.find(t => t.id === app.trackId);
                  const style = STATUS_STYLES[app.status] || STATUS_STYLES.submitted;
                  const StatusIcon = style.icon;
                  return (
                    <div key={app.id} className="bg-zinc-900 border border-zinc-800 p-4 flex items-center justify-between" data-testid={`app-${app.id}`}>
                      <div className="flex items-center gap-3">
                        <StatusIcon className="w-4 h-4 text-zinc-400" />
                        <div>
                          <div className="text-zinc-300 text-sm">{track?.name || "Unknown Track"}</div>
                          <div className="text-zinc-600 text-xs">
                            Applied {new Date(app.createdAt).toLocaleDateString()} · XP: {app.xpAtApplication} · Level: {app.levelAtApplication}
                          </div>
                          {app.reviewNotes && <div className="text-zinc-500 text-xs mt-1">Review: {app.reviewNotes}</div>}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 ${style.bg} ${style.text}`}>{app.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selectedTrack && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg p-6">
                <h3 className="text-white font-semibold text-lg mb-2">Apply: {selectedTrack.name}</h3>
                <p className="text-zinc-500 text-sm mb-4">{selectedTrack.description}</p>

                <label className="block text-zinc-400 text-sm mb-1">Why are you a good fit?</label>
                <textarea
                  value={appNote}
                  onChange={e => setAppNote(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm p-3 h-32 resize-none focus:outline-none focus:border-zinc-500"
                  placeholder="Tell us about your experience, goals, and what you'd bring to this role..."
                  data-testid="input-application-note"
                />

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleApply}
                    disabled={applying}
                    className="flex-1 px-4 py-2 bg-white text-black font-medium text-sm hover:bg-zinc-200 transition disabled:opacity-50"
                    data-testid="button-submit-application"
                  >
                    {applying ? "Submitting..." : "Submit Application"}
                  </button>
                  <button
                    onClick={() => setSelectedTrack(null)}
                    className="px-4 py-2 bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition"
                    data-testid="button-cancel-application"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
