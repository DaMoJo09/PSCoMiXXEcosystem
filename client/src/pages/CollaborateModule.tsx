import { Layout } from "@/components/layout/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { useState } from "react";
import { 
  Users, Plus, ChevronRight, Search, UserPlus, Crown,
  MessageSquare, Folder, Settings, Globe, Lock
} from "lucide-react";
import { toast } from "sonner";

export default function CollaborateModule() {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const { data: publicTeams, isLoading } = useQuery({
    queryKey: ["ecosystem", "teams"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/ecosystem/teams");
      return res.json();
    },
  });

  const { data: myTeams } = useQuery({
    queryKey: ["ecosystem", "my-teams"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/ecosystem/my-teams");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const createTeamMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; isPublic: boolean }) => {
      const res = await apiRequest("POST", "/api/ecosystem/teams", data);
      return res.json();
    },
    onSuccess: () => {
      toast.success("Team created successfully!");
      setShowCreateTeam(false);
      setTeamName("");
      setTeamDescription("");
      queryClient.invalidateQueries({ queryKey: ["ecosystem", "teams"] });
      queryClient.invalidateQueries({ queryKey: ["ecosystem", "my-teams"] });
    },
    onError: () => {
      toast.error("Failed to create team");
    },
  });

  const handleCreateTeam = () => {
    if (!teamName.trim()) {
      toast.error("Team name is required");
      return;
    }
    createTeamMutation.mutate({ name: teamName, description: teamDescription, isPublic });
  };

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
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white flex items-center justify-center">
                  <Users className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h1 className="text-3xl font-black" data-testid="text-page-title">COLLABORATE</h1>
                  <p className="text-zinc-400 font-mono text-sm">
                    Find teammates and build together
                  </p>
                </div>
              </div>
              {isAuthenticated && (
                <button
                  onClick={() => setShowCreateTeam(true)}
                  className="px-4 py-2 bg-white text-black font-bold flex items-center gap-2 hover:bg-zinc-200"
                  data-testid="button-open-create-team"
                >
                  <Plus className="w-4 h-4" /> Create Team
                </button>
              )}
            </div>
          </header>

          {showCreateTeam && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
              <div className="bg-zinc-900 border-4 border-white max-w-md w-full p-6">
                <h2 className="text-xl font-black mb-4" data-testid="text-modal-title">CREATE NEW TEAM</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">Team Name</label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="w-full bg-black border-2 border-zinc-700 px-4 py-2 focus:border-white outline-none"
                      placeholder="Enter team name"
                      data-testid="input-team-name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Description</label>
                    <textarea
                      value={teamDescription}
                      onChange={(e) => setTeamDescription(e.target.value)}
                      className="w-full bg-black border-2 border-zinc-700 px-4 py-2 focus:border-white outline-none h-24 resize-none"
                      placeholder="What will your team create?"
                      data-testid="input-team-description"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setIsPublic(true)}
                      className={`flex-1 py-2 border-2 ${isPublic ? "border-white bg-white text-black" : "border-zinc-700"} font-bold flex items-center justify-center gap-2`}
                      data-testid="button-visibility-public"
                    >
                      <Globe className="w-4 h-4" /> Public
                    </button>
                    <button
                      onClick={() => setIsPublic(false)}
                      className={`flex-1 py-2 border-2 ${!isPublic ? "border-white bg-white text-black" : "border-zinc-700"} font-bold flex items-center justify-center gap-2`}
                      data-testid="button-visibility-private"
                    >
                      <Lock className="w-4 h-4" /> Private
                    </button>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowCreateTeam(false)}
                      className="flex-1 py-3 border-2 border-zinc-700 font-bold hover:border-white"
                      data-testid="button-cancel-create-team"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateTeam}
                      disabled={createTeamMutation.isPending}
                      className="flex-1 py-3 bg-white text-black font-bold hover:bg-zinc-200 disabled:opacity-50"
                      data-testid="button-create-team"
                    >
                      {createTeamMutation.isPending ? "Creating..." : "Create Team"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isAuthenticated && myTeams?.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-black mb-4 flex items-center gap-2" data-testid="text-section-my-teams">
                <Crown className="w-5 h-5" />
                MY TEAMS
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myTeams.map((team: any) => (
                  <div
                    key={team.id}
                    className="bg-zinc-900 border-4 border-zinc-600 p-4"
                    data-testid={`card-my-team-${team.id}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-white text-black flex items-center justify-center font-black">
                        {team.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold" data-testid={`text-team-name-${team.id}`}>{team.name}</h3>
                        <p className="text-xs text-zinc-400">
                          {team.isPublic ? "Public" : "Private"} Team
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-400 mb-4">{team.description || "No description"}</p>
                    <div className="flex gap-2">
                      <button 
                        className="flex-1 py-2 bg-zinc-800 text-sm font-bold hover:bg-zinc-700 flex items-center justify-center gap-1"
                        data-testid={`button-projects-${team.id}`}
                      >
                        <Folder className="w-3 h-3" /> Projects
                      </button>
                      <button 
                        className="flex-1 py-2 bg-zinc-800 text-sm font-bold hover:bg-zinc-700 flex items-center justify-center gap-1"
                        data-testid={`button-chat-${team.id}`}
                      >
                        <MessageSquare className="w-3 h-3" /> Chat
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black" data-testid="text-section-discover">DISCOVER TEAMS</h2>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search teams..."
                  className="bg-zinc-900 border-2 border-zinc-700 pl-10 pr-4 py-2 text-sm focus:border-white outline-none"
                  data-testid="input-search-teams"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-white border-t-transparent animate-spin mx-auto" />
              </div>
            ) : publicTeams?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {publicTeams.map((team: any) => (
                  <div
                    key={team.id}
                    className="bg-zinc-900 border-4 border-zinc-800 hover:border-white p-4 transition-all"
                    data-testid={`card-public-team-${team.id}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-zinc-700 flex items-center justify-center font-black">
                        {team.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold" data-testid={`text-public-team-name-${team.id}`}>{team.name}</h3>
                        <p className="text-xs text-zinc-400">
                          {team.maxMembers || 10} max members
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-400 mb-4">{team.description || "No description"}</p>
                    <button 
                      className="w-full py-2 border-2 border-zinc-700 hover:border-white font-bold text-sm flex items-center justify-center gap-2"
                      data-testid={`button-join-${team.id}`}
                    >
                      <UserPlus className="w-4 h-4" /> Request to Join
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-zinc-900 border-2 border-zinc-800">
                <Users className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
                <h3 className="text-lg font-bold mb-2">No Public Teams Yet</h3>
                <p className="text-zinc-400 text-sm mb-4">Be the first to create a team and start collaborating!</p>
                {isAuthenticated && (
                  <button
                    onClick={() => setShowCreateTeam(true)}
                    className="px-6 py-2 bg-white text-black font-bold"
                    data-testid="button-create-first-team"
                  >
                    Create First Team
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
