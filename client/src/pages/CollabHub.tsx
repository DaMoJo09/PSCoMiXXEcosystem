import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { formatDistanceToNow } from "date-fns";
import { 
  ArrowLeft, Plus, Users, Link2, Copy, Zap, Play, Pause, 
  CheckCircle, Clock, Sparkles, Shield, Crown, UserMinus,
  RefreshCw, Share2, ExternalLink, UserPlus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CollabSession {
  id: string;
  ownerId: string;
  projectId: string | null;
  title: string;
  description: string | null;
  inviteCode: string;
  maxEditors: number;
  pageCount: number;
  status: string;
  settings: any;
  createdAt: string;
  updatedAt: string;
  members?: CollabMember[];
}

interface CollabMember {
  id: string;
  sessionId: string;
  userId: string;
  role: string;
  color: string;
  joinedAt: string;
  user?: {
    id: string;
    name: string;
  };
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  avatar: string | null;
  leaderId: string;
  isPublic: boolean;
  maxMembers: number;
  inviteCode: string | null;
  tags: any;
  createdAt: string;
  updatedAt: string;
  members?: TeamMember[];
  isMember?: boolean;
}

interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: string;
  joinedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

function CreateSessionDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pageCount, setPageCount] = useState(4);
  const [maxEditors, setMaxEditors] = useState(4);
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/collab/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, pageCount, maxEditors }),
      });
      if (!res.ok) throw new Error("Failed to create session");
      return res.json();
    },
    onSuccess: (session) => {
      toast({ 
        title: "Session created!", 
        description: `Share code: ${session.inviteCode}` 
      });
      onSuccess();
      setOpen(false);
      setTitle("");
      setDescription("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create session", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-white text-black border-4 border-black font-bold hover:bg-white/90 shadow-[4px_4px_0_0_rgba(255,255,255,0.3)]">
          <Plus className="w-5 h-5 mr-2" />
          START NEW COLLAB
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-neutral-900 border-4 border-black text-white">
        <DialogHeader>
          <DialogTitle className="font-black text-xl">CREATE COLLAB SESSION</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="font-bold">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Epic Comic Collab"
              className="bg-white/10 border-2 border-black text-white placeholder:text-white/50"
              data-testid="collab-title-input"
            />
          </div>
          <div>
            <Label className="font-bold">Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this collab about?"
              className="bg-white/10 border-2 border-black text-white placeholder:text-white/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-bold">Pages</Label>
              <Input
                type="number"
                value={pageCount}
                onChange={(e) => setPageCount(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                max={20}
                className="bg-white/10 border-2 border-black text-white"
              />
            </div>
            <div>
              <Label className="font-bold">Max Editors</Label>
              <Input
                type="number"
                value={maxEditors}
                onChange={(e) => setMaxEditors(Math.max(2, parseInt(e.target.value) || 2))}
                min={2}
                max={10}
                className="bg-white/10 border-2 border-black text-white"
              />
            </div>
          </div>
          <Button 
            onClick={() => createMutation.mutate()}
            disabled={!title.trim() || createMutation.isPending}
            className="w-full bg-white text-black border-4 border-black font-bold hover:bg-white/90"
            data-testid="create-collab-submit"
          >
            {createMutation.isPending ? "CREATING..." : "CREATE SESSION"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function JoinSessionDialog({ onSuccess }: { onSuccess: () => void }) {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const { toast } = useToast();

  const joinMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/collab/join/${code.toUpperCase()}`, {
        method: "POST",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Joined!", description: `Welcome to ${data.session.title}` });
      onSuccess();
      setOpen(false);
      navigate(`/social/collab/${data.session.id}`);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full border-4 border-white text-white hover:bg-white/10 font-bold">
          <Link2 className="w-5 h-5 mr-2" />
          JOIN WITH CODE
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-neutral-900 border-4 border-black text-white">
        <DialogHeader>
          <DialogTitle className="font-black text-xl">JOIN COLLAB SESSION</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="font-bold">Invite Code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="bg-white/10 border-2 border-black text-white text-center text-2xl font-mono tracking-widest placeholder:text-white/50"
              data-testid="join-code-input"
            />
          </div>
          <Button 
            onClick={() => joinMutation.mutate()}
            disabled={code.length !== 6 || joinMutation.isPending}
            className="w-full bg-white text-black border-4 border-black font-bold hover:bg-white/90"
            data-testid="join-collab-submit"
          >
            {joinMutation.isPending ? "JOINING..." : "JOIN SESSION"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateTeamDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/ecosystem/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, isPublic }),
      });
      if (!res.ok) throw new Error("Failed to create team");
      return res.json();
    },
    onSuccess: (team) => {
      toast({ 
        title: "Team created!", 
        description: `Invite code: ${team.inviteCode}` 
      });
      onSuccess();
      setOpen(false);
      setName("");
      setDescription("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create team", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-white text-black border-4 border-black font-bold hover:bg-white/90 shadow-[4px_4px_0_0_rgba(255,255,255,0.3)]">
          <Plus className="w-5 h-5 mr-2" />
          CREATE TEAM
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-neutral-900 border-4 border-black text-white">
        <DialogHeader>
          <DialogTitle className="font-black text-xl">CREATE NEW TEAM</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="font-bold">Team Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="The Ink Masters"
              className="bg-white/10 border-2 border-black text-white placeholder:text-white/50"
              data-testid="team-name-input"
            />
          </div>
          <div>
            <Label className="font-bold">Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="We create awesome comics together!"
              className="bg-white/10 border-2 border-black text-white placeholder:text-white/50"
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-white/5 border-2 border-black">
            <div>
              <p className="font-bold">Public Team</p>
              <p className="text-xs text-white/50">Anyone can find and request to join</p>
            </div>
            <Switch 
              checked={isPublic} 
              onCheckedChange={setIsPublic}
              data-testid="team-public-switch"
            />
          </div>
          <Button 
            onClick={() => createMutation.mutate()}
            disabled={!name.trim() || createMutation.isPending}
            className="w-full bg-white text-black border-4 border-black font-bold hover:bg-white/90"
            data-testid="create-team-submit"
          >
            {createMutation.isPending ? "CREATING..." : "CREATE TEAM"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function JoinTeamDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const { toast } = useToast();

  const joinMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/ecosystem/teams/join/${code.toUpperCase()}`, {
        method: "POST",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Joined!", description: `Welcome to ${data.team.name}` });
      onSuccess();
      setOpen(false);
      setCode("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full border-4 border-white text-white hover:bg-white/10 font-bold">
          <UserPlus className="w-5 h-5 mr-2" />
          JOIN TEAM
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-neutral-900 border-4 border-black text-white">
        <DialogHeader>
          <DialogTitle className="font-black text-xl">JOIN A TEAM</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="font-bold">Team Invite Code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="bg-white/10 border-2 border-black text-white text-center text-2xl font-mono tracking-widest placeholder:text-white/50"
              data-testid="join-team-code-input"
            />
          </div>
          <Button 
            onClick={() => joinMutation.mutate()}
            disabled={code.length !== 6 || joinMutation.isPending}
            className="w-full bg-white text-black border-4 border-black font-bold hover:bg-white/90"
            data-testid="join-team-submit"
          >
            {joinMutation.isPending ? "JOINING..." : "JOIN TEAM"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TeamCard({ team, onRefresh }: { team: Team; onRefresh: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showMembers, setShowMembers] = useState(false);
  const isLeader = team.leaderId === user?.id;

  const { data: teamDetails } = useQuery<Team>({
    queryKey: ["/api/ecosystem/teams", team.id],
    queryFn: async () => {
      const res = await fetch(`/api/ecosystem/teams/${team.id}`);
      if (!res.ok) throw new Error("Failed to fetch team");
      return res.json();
    },
    enabled: showMembers,
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/ecosystem/teams/${team.id}/regenerate-invite`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to regenerate");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "New code generated!", description: "Share the new invite link" });
      onRefresh();
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/ecosystem/teams/${team.id}/leave`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Left team", description: "You've left the team" });
      onRefresh();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const copyInviteLink = () => {
    const link = `${window.location.origin}/social/collab?join=${team.inviteCode}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copied!", description: "Share this link to invite teammates" });
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(team.inviteCode || "");
    toast({ title: "Code copied!", description: team.inviteCode });
  };

  return (
    <div className="bg-white/5 border-4 border-black p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]" data-testid={`team-card-${team.id}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {isLeader ? (
            <Crown className="w-5 h-5 text-yellow-500" />
          ) : (
            <Users className="w-5 h-5 text-white/50" />
          )}
          <span className="text-xs font-bold text-white/50 uppercase">
            {isLeader ? "LEADER" : "MEMBER"}
          </span>
        </div>
        {team.isPublic && (
          <span className="text-xs font-bold bg-green-500/20 text-green-400 px-2 py-0.5 border border-green-500/50">
            PUBLIC
          </span>
        )}
      </div>
      
      <h3 className="font-black text-lg mb-1">{team.name}</h3>
      {team.description && (
        <p className="text-white/70 text-sm mb-3 line-clamp-2">{team.description}</p>
      )}
      
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 bg-white/10 border-2 border-black p-2 font-mono text-center">
          {team.inviteCode || "------"}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={copyInviteCode}
          className="text-white/70 hover:text-white hover:bg-white/10"
          data-testid={`copy-team-code-${team.id}`}
        >
          <Copy className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={copyInviteLink}
          className="text-white/70 hover:text-white hover:bg-white/10"
          data-testid={`share-team-link-${team.id}`}
        >
          <Share2 className="w-4 h-4" />
        </Button>
        {isLeader && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending}
            className="text-white/70 hover:text-white hover:bg-white/10"
            data-testid={`regenerate-code-${team.id}`}
          >
            <RefreshCw className={`w-4 h-4 ${regenerateMutation.isPending ? "animate-spin" : ""}`} />
          </Button>
        )}
      </div>

      <Button
        variant="ghost"
        onClick={() => setShowMembers(!showMembers)}
        className="w-full text-white/70 hover:text-white hover:bg-white/10 text-sm"
      >
        <Users className="w-4 h-4 mr-2" />
        {showMembers ? "Hide Members" : "Show Members"}
      </Button>

      {showMembers && teamDetails?.members && (
        <div className="mt-3 space-y-2 border-t-2 border-white/20 pt-3">
          {teamDetails.members.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-2 bg-white/5 border border-white/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 border border-black flex items-center justify-center font-bold text-sm">
                  {member.user?.name?.charAt(0).toUpperCase() || "?"}
                </div>
                <div>
                  <p className="text-sm font-bold">{member.user?.name || "Unknown"}</p>
                  <p className="text-xs text-white/50 flex items-center gap-1">
                    {member.role === "leader" && <Crown className="w-3 h-3 text-yellow-500" />}
                    {member.role === "co-leader" && <Shield className="w-3 h-3 text-blue-500" />}
                    {member.role.toUpperCase()}
                  </p>
                </div>
              </div>
              {isLeader && member.userId !== user?.id && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={async () => {
                    const res = await fetch(`/api/ecosystem/teams/${team.id}/members/${member.userId}`, { method: "DELETE" });
                    if (res.ok) {
                      toast({ title: "Member removed" });
                      onRefresh();
                    }
                  }}
                >
                  <UserMinus className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {!isLeader && (
        <Button
          variant="ghost"
          onClick={() => leaveMutation.mutate()}
          disabled={leaveMutation.isPending}
          className="w-full mt-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-sm"
        >
          Leave Team
        </Button>
      )}
      
      <p className="text-xs text-white/30 mt-3">
        Created {formatDistanceToNow(new Date(team.createdAt), { addSuffix: true })}
      </p>
    </div>
  );
}

function SessionCard({ session }: { session: CollabSession }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isOwner = session.ownerId === user?.id;

  const copyInviteCode = () => {
    navigator.clipboard.writeText(session.inviteCode);
    toast({ title: "Copied!", description: "Invite code copied to clipboard" });
  };

  const getStatusIcon = () => {
    switch (session.status) {
      case "active": return <Play className="w-4 h-4 text-green-500" />;
      case "paused": return <Pause className="w-4 h-4 text-yellow-500" />;
      case "completed": return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default: return <Clock className="w-4 h-4 text-white/50" />;
    }
  };

  return (
    <div 
      className="bg-white/5 border-4 border-black p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)] cursor-pointer hover:bg-white/10 transition-colors"
      onClick={() => navigate(`/social/collab/${session.id}`)}
      data-testid={`session-card-${session.id}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-xs font-bold text-white/50 uppercase">{session.status}</span>
        </div>
        {isOwner && (
          <span className="text-xs font-bold bg-white text-black px-2 py-0.5 border border-black">
            OWNER
          </span>
        )}
      </div>
      
      <h3 className="font-black text-lg mb-1">{session.title}</h3>
      {session.description && (
        <p className="text-white/70 text-sm mb-3 line-clamp-2">{session.description}</p>
      )}
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-white/50">
            {session.pageCount} pages
          </span>
          <span className="text-white/50">
            <Users className="w-4 h-4 inline mr-1" />
            {session.members?.length || 1}/{session.maxEditors}
          </span>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); copyInviteCode(); }}
          className="text-white/70 hover:text-white hover:bg-white/10"
          data-testid={`copy-code-${session.id}`}
        >
          <Copy className="w-4 h-4 mr-1" />
          {session.inviteCode}
        </Button>
      </div>
      
      <p className="text-xs text-white/30 mt-3">
        Updated {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
      </p>
    </div>
  );
}

export default function CollabHub() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("sessions");
  const [sessionFilter, setSessionFilter] = useState("active");

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<CollabSession[]>({
    queryKey: ["/api/collab/my-sessions"],
    queryFn: async () => {
      const res = await fetch("/api/collab/my-sessions");
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
  });

  const { data: myTeams = [], isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/ecosystem/my-teams"],
    queryFn: async () => {
      const res = await fetch("/api/ecosystem/my-teams");
      if (!res.ok) throw new Error("Failed to fetch teams");
      return res.json();
    },
  });

  const activeSessions = sessions.filter(s => s.status === "active");
  const completedSessions = sessions.filter(s => s.status === "completed" || s.status === "paused");

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/collab/my-sessions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/ecosystem/my-teams"] });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 z-40 bg-black border-b-4 border-white p-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/social")}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="font-black text-xl tracking-tight flex items-center gap-2">
            <Zap className="w-5 h-5" />
            COLLAB HUB
          </h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2 bg-white/5 border-4 border-black rounded-none h-12 mb-6">
            <TabsTrigger 
              value="sessions" 
              className="data-[state=active]:bg-white data-[state=active]:text-black font-bold"
            >
              <Zap className="w-4 h-4 mr-2" />
              SESSIONS
            </TabsTrigger>
            <TabsTrigger 
              value="teams" 
              className="data-[state=active]:bg-white data-[state=active]:text-black font-bold"
            >
              <Users className="w-4 h-4 mr-2" />
              TEAMS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sessions">
            <div className="bg-gradient-to-br from-white/10 to-white/5 border-4 border-black p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-8 h-8 text-white" />
                <div>
                  <h2 className="font-black text-lg">REAL-TIME COLLABORATION</h2>
                  <p className="text-white/70 text-sm">Create comics together, live!</p>
                </div>
              </div>
              <div className="space-y-3">
                <CreateSessionDialog onSuccess={handleRefresh} />
                <JoinSessionDialog onSuccess={handleRefresh} />
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <Button
                variant={sessionFilter === "active" ? "default" : "outline"}
                onClick={() => setSessionFilter("active")}
                className={sessionFilter === "active" ? "bg-white text-black" : "border-white/50 text-white"}
                size="sm"
              >
                <Play className="w-4 h-4 mr-1" />
                Active ({activeSessions.length})
              </Button>
              <Button
                variant={sessionFilter === "past" ? "default" : "outline"}
                onClick={() => setSessionFilter("past")}
                className={sessionFilter === "past" ? "bg-white text-black" : "border-white/50 text-white"}
                size="sm"
              >
                <Clock className="w-4 h-4 mr-1" />
                Past ({completedSessions.length})
              </Button>
            </div>

            <div className="space-y-4">
              {sessionsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto" />
                </div>
              ) : sessionFilter === "active" ? (
                activeSessions.length === 0 ? (
                  <div className="text-center py-12">
                    <Zap className="w-12 h-12 mx-auto text-white/30 mb-4" />
                    <p className="text-white/70">No active collabs</p>
                    <p className="text-white/50 text-sm">Start or join a session above!</p>
                  </div>
                ) : (
                  activeSessions.map((session) => (
                    <SessionCard key={session.id} session={session} />
                  ))
                )
              ) : (
                completedSessions.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 mx-auto text-white/30 mb-4" />
                    <p className="text-white/50">No past sessions</p>
                  </div>
                ) : (
                  completedSessions.map((session) => (
                    <SessionCard key={session.id} session={session} />
                  ))
                )
              )}
            </div>
          </TabsContent>

          <TabsContent value="teams">
            <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/10 border-4 border-black p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-8 h-8 text-white" />
                <div>
                  <h2 className="font-black text-lg">YOUR TEAMS</h2>
                  <p className="text-white/70 text-sm">Build your creative crew!</p>
                </div>
              </div>
              <div className="space-y-3">
                <CreateTeamDialog onSuccess={handleRefresh} />
                <JoinTeamDialog onSuccess={handleRefresh} />
              </div>
            </div>

            <div className="space-y-4">
              {teamsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto" />
                </div>
              ) : myTeams.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto text-white/30 mb-4" />
                  <p className="text-white/70">No teams yet</p>
                  <p className="text-white/50 text-sm">Create or join a team above!</p>
                </div>
              ) : (
                myTeams.map((team) => (
                  <TeamCard key={team.id} team={team} onRefresh={handleRefresh} />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
