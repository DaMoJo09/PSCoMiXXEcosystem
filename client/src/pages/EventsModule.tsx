import { Layout } from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useRoute } from "wouter";
import { useState } from "react";
import { 
  Calendar, Trophy, Users, Play, ChevronRight, 
  Star, Award, Clock, Video, Vote, Send, X, Check, Upload
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function EventsModule() {
  const { isAuthenticated, user } = useAuth();
  const [, params] = useRoute("/ecosystem/events/:id");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [registerData, setRegisterData] = useState({ name: "", email: "" });
  const [submitData, setSubmitData] = useState({ title: "", description: "", category: "best_comic", projectUrl: "" });

  const { data: festivals, isLoading } = useQuery({
    queryKey: ["ecosystem", "festivals"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/ecosystem/festivals");
      return res.json();
    },
  });

  const { data: selectedFestival } = useQuery({
    queryKey: ["ecosystem", "festival", params?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/ecosystem/festivals/${params?.id}`);
      return res.json();
    },
    enabled: !!params?.id,
  });

  const { data: submissions } = useQuery({
    queryKey: ["ecosystem", "submissions", params?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/ecosystem/festivals/${params?.id}/submissions`);
      return res.json();
    },
    enabled: !!params?.id,
  });

  const sampleFestivals = [
    {
      id: "1",
      name: "Press Play Festival 2025",
      year: 2025,
      theme: "New Horizons",
      description: "The ultimate celebration of creator talent and storytelling",
      status: "upcoming",
      summitStartDate: "2025-03-15",
      screeningStartDate: "2025-03-22",
      submissionDeadline: "2025-03-01",
      votingEnabled: false,
    },
  ];

  const displayFestivals = festivals?.length > 0 ? festivals : sampleFestivals;

  if (params?.id) {
    const festival = selectedFestival || displayFestivals.find((f: any) => f.id === params.id);
    
    return (
      <Layout>
        <div className="min-h-screen bg-black text-white">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <header className="mb-8">
              <Link 
                href="/ecosystem/events" 
                className="text-zinc-400 hover:text-white text-sm mb-4 inline-flex items-center gap-2"
                data-testid="link-back-events"
              >
                <ChevronRight className="w-4 h-4 rotate-180" /> Back to Events
              </Link>
              
              <div className="bg-zinc-900 border-4 border-white p-8 mt-4">
                <div className="inline-block bg-white text-black px-3 py-1 text-sm font-black mb-4">
                  PRESS PLAY FESTIVAL
                </div>
                <h1 className="text-4xl font-black mb-2" data-testid="text-festival-name">{festival?.name || "Festival"}</h1>
                <p className="text-zinc-300 mb-4">{festival?.theme && `Theme: ${festival.theme}`}</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="flex items-center gap-2 bg-black/30 px-3 py-1 border border-zinc-700">
                    <Calendar className="w-4 h-4" />
                    {festival?.submissionDeadline && `Deadline: ${new Date(festival.submissionDeadline).toLocaleDateString()}`}
                  </span>
                  <span className="flex items-center gap-2 px-3 py-1 border border-zinc-600" data-testid="text-festival-status">
                    {festival?.status?.replace("_", " ").toUpperCase() || "UPCOMING"}
                  </span>
                </div>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              <div className="bg-zinc-900 border-4 border-zinc-800 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white flex items-center justify-center">
                    <Users className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black">CREATOR CONNECT SUMMIT</h2>
                    <p className="text-zinc-400 text-sm">Part One: Workshops & Networking</p>
                  </div>
                </div>
                <ul className="space-y-3 mb-4">
                  <li className="flex items-center gap-2 text-sm">
                    <Play className="w-4 h-4 text-zinc-400" /> Live workshops with industry pros
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-zinc-400" /> Team formation sessions
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Video className="w-4 h-4 text-zinc-400" /> Tool tutorials & demos
                  </li>
                </ul>
                <button 
                  className="w-full py-3 bg-white text-black font-bold"
                  onClick={() => setShowRegisterModal(true)}
                  data-testid="button-register-summit"
                >
                  Register for Summit
                </button>
              </div>

              <div className="bg-zinc-900 border-4 border-zinc-800 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black">SCREENING FESTIVAL</h2>
                    <p className="text-zinc-400 text-sm">Part Two: Showcase & Awards</p>
                  </div>
                </div>
                <ul className="space-y-3 mb-4">
                  <li className="flex items-center gap-2 text-sm">
                    <Star className="w-4 h-4 text-zinc-400" /> Submit your best work
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Vote className="w-4 h-4 text-zinc-400" /> Community voting
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Award className="w-4 h-4 text-zinc-400" /> Awards ceremony
                  </li>
                </ul>
                <button 
                  className="w-full py-3 bg-white text-black font-bold"
                  onClick={() => setShowSubmitModal(true)}
                  data-testid="button-submit-work"
                >
                  Submit Your Work
                </button>
              </div>
            </div>

            {showRegisterModal && (
              <Dialog open={showRegisterModal} onOpenChange={() => { setShowRegisterModal(false); setRegisterData({ name: "", email: "" }); }}>
                <DialogContent className="bg-black border-4 border-white text-white max-w-md">
                  <DialogHeader>
                    <DialogTitle className="font-black">REGISTER FOR SUMMIT</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-zinc-400">Register for the Creator Connect Summit workshops and networking events.</p>
                    <div>
                      <label className="block text-sm font-bold mb-2">Your Name</label>
                      <input
                        type="text"
                        value={registerData.name}
                        onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                        className="w-full bg-zinc-900 border-2 border-zinc-700 px-4 py-2 focus:border-white outline-none"
                        placeholder="Enter your name"
                        data-testid="input-register-name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Email</label>
                      <input
                        type="email"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        className="w-full bg-zinc-900 border-2 border-zinc-700 px-4 py-2 focus:border-white outline-none"
                        placeholder="your@email.com"
                        data-testid="input-register-email"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (!registerData.name || !registerData.email) {
                          toast.error("Please fill in all fields");
                          return;
                        }
                        toast.success("Registered! Check your email for confirmation and event details.");
                        setShowRegisterModal(false);
                        setRegisterData({ name: "", email: "" });
                      }}
                      className="w-full py-3 bg-white text-black font-bold hover:bg-zinc-200"
                      data-testid="button-confirm-register"
                    >
                      <Check className="w-4 h-4 inline mr-2" />
                      CONFIRM REGISTRATION
                    </button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {showSubmitModal && (
              <Dialog open={showSubmitModal} onOpenChange={() => { setShowSubmitModal(false); setSubmitData({ title: "", description: "", category: "best_comic", projectUrl: "" }); }}>
                <DialogContent className="bg-black border-4 border-white text-white max-w-md">
                  <DialogHeader>
                    <DialogTitle className="font-black">SUBMIT YOUR WORK</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-zinc-400">Submit your best work for the Screening Festival competition.</p>
                    <div>
                      <label className="block text-sm font-bold mb-2">Title</label>
                      <input
                        type="text"
                        value={submitData.title}
                        onChange={(e) => setSubmitData({ ...submitData, title: e.target.value })}
                        className="w-full bg-zinc-900 border-2 border-zinc-700 px-4 py-2 focus:border-white outline-none"
                        placeholder="Enter your project title"
                        data-testid="input-submit-title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Category</label>
                      <select
                        value={submitData.category}
                        onChange={(e) => setSubmitData({ ...submitData, category: e.target.value })}
                        className="w-full bg-zinc-900 border-2 border-zinc-700 px-4 py-2 focus:border-white outline-none"
                        data-testid="select-submit-category"
                      >
                        <option value="best_comic">Best Comic</option>
                        <option value="best_animation">Best Animation</option>
                        <option value="best_vn">Best Visual Novel</option>
                        <option value="best_cyoa">Best CYOA</option>
                        <option value="peoples_choice">People's Choice</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Description</label>
                      <textarea
                        value={submitData.description}
                        onChange={(e) => setSubmitData({ ...submitData, description: e.target.value })}
                        className="w-full bg-zinc-900 border-2 border-zinc-700 px-4 py-2 focus:border-white outline-none h-20 resize-none"
                        placeholder="Describe your work..."
                        data-testid="input-submit-description"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Project URL (optional)</label>
                      <input
                        type="url"
                        value={submitData.projectUrl}
                        onChange={(e) => setSubmitData({ ...submitData, projectUrl: e.target.value })}
                        className="w-full bg-zinc-900 border-2 border-zinc-700 px-4 py-2 focus:border-white outline-none"
                        placeholder="https://..."
                        data-testid="input-submit-url"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (!submitData.title) {
                          toast.error("Please enter a title");
                          return;
                        }
                        toast.success("Submission received! You'll be notified when voting begins.");
                        setShowSubmitModal(false);
                        setSubmitData({ title: "", description: "", category: "best_comic", projectUrl: "" });
                      }}
                      className="w-full py-3 bg-white text-black font-bold hover:bg-zinc-200"
                      data-testid="button-confirm-submit"
                    >
                      <Upload className="w-4 h-4 inline mr-2" />
                      SUBMIT ENTRY
                    </button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            <section>
              <h2 className="text-2xl font-black mb-6" data-testid="text-section-submissions">SUBMISSIONS</h2>
              {submissions?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {submissions.map((submission: any) => (
                    <div
                      key={submission.id}
                      className="bg-zinc-900 border-4 border-zinc-800 overflow-hidden"
                      data-testid={`card-submission-${submission.id}`}
                    >
                      <div className="aspect-video bg-zinc-800 flex items-center justify-center">
                        {submission.thumbnail ? (
                          <img src={submission.thumbnail} alt={submission.title} className="w-full h-full object-cover" />
                        ) : (
                          <Play className="w-12 h-12 text-zinc-600" />
                        )}
                      </div>
                      <div className="p-4">
                        <span className="text-xs bg-zinc-700 px-2 py-1 mb-2 inline-block">{submission.category}</span>
                        <h3 className="font-bold mb-1" data-testid={`text-submission-title-${submission.id}`}>{submission.title}</h3>
                        <p className="text-sm text-zinc-400 line-clamp-2">{submission.description}</p>
                        <div className="flex items-center justify-between mt-4">
                          <span className="flex items-center gap-1 text-sm" data-testid={`text-votes-${submission.id}`}>
                            <Star className="w-4 h-4" />
                            {submission.voteCount} votes
                          </span>
                          <button 
                            className="px-3 py-1 bg-white text-black text-sm font-bold"
                            data-testid={`button-vote-${submission.id}`}
                          >
                            Vote
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-zinc-900 border-2 border-zinc-800">
                  <Send className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
                  <h3 className="font-bold mb-2">No Submissions Yet</h3>
                  <p className="text-zinc-400 text-sm mb-4">Be the first to submit your work!</p>
                  {isAuthenticated && (
                    <button 
                      className="px-6 py-2 bg-white text-black font-bold"
                      data-testid="button-submit-now"
                    >
                      Submit Now
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </Layout>
    );
  }

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
                <Calendar className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-3xl font-black" data-testid="text-page-title">EVENTS</h1>
                <p className="text-zinc-400 font-mono text-sm">
                  Press Play Festival & Workshops
                </p>
              </div>
            </div>
          </header>

          <section className="mb-12">
            <h2 className="text-xl font-black mb-6" data-testid="text-section-festivals">UPCOMING FESTIVALS</h2>
            <div className="space-y-6">
              {displayFestivals.map((festival: any) => (
                <Link
                  key={festival.id}
                  href={`/ecosystem/events/${festival.id}`}
                  className="block bg-zinc-900 border-4 border-zinc-800 hover:border-white p-8 transition-all"
                  data-testid={`link-festival-${festival.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="inline-block bg-white text-black px-3 py-1 text-sm font-black mb-4">
                        {festival.year}
                      </div>
                      <h3 className="text-3xl font-black mb-2" data-testid={`text-festival-name-${festival.id}`}>{festival.name}</h3>
                      <p className="text-zinc-300 mb-4">{festival.description}</p>
                      <div className="flex gap-4 text-sm text-zinc-400">
                        {festival.submissionDeadline && (
                          <span className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Deadline: {new Date(festival.submissionDeadline).toLocaleDateString()}
                          </span>
                        )}
                        <span className="px-2 py-0.5 border border-zinc-600" data-testid={`text-status-${festival.id}`}>
                          {festival.status?.replace("_", " ").toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <Trophy className="w-16 h-16 text-white" />
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-zinc-900 border-4 border-zinc-700 p-6">
              <h3 className="text-lg font-black mb-2 flex items-center gap-2">
                <Users className="w-5 h-5" />
                CREATOR CONNECT SUMMIT
              </h3>
              <p className="text-zinc-400 text-sm mb-4">
                Part One of Press Play Festival. Join workshops, form teams, and prepare your submissions.
              </p>
              <ul className="space-y-2 text-sm text-zinc-300">
                <li>Live workshops with industry professionals</li>
                <li>Team formation and networking</li>
                <li>Tool tutorials and demos</li>
                <li>Festival prep sessions</li>
              </ul>
            </div>

            <div className="bg-zinc-900 border-4 border-zinc-700 p-6">
              <h3 className="text-lg font-black mb-2 flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                SCREENING FESTIVAL
              </h3>
              <p className="text-zinc-400 text-sm mb-4">
                Part Two of Press Play Festival. Submit your work, vote, and celebrate at the awards ceremony.
              </p>
              <ul className="space-y-2 text-sm text-zinc-300">
                <li>Submit your best creative work</li>
                <li>Community voting and judging</li>
                <li>Live screening events</li>
                <li>Awards and recognition</li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
