import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft, CheckCircle, XCircle, Eye, Clock, FileText,
  Image, Film, BookOpen, Layers, Palette
} from "lucide-react";

interface ReviewProject {
  id: string;
  userId: string;
  title: string;
  type: string;
  status: string;
  thumbnail: string | null;
  data: any;
  createdAt: string;
  updatedAt: string;
}

const typeIcons: Record<string, any> = {
  comic: Layers,
  card: Palette,
  vn: BookOpen,
  cyoa: FileText,
  cover: Image,
  motion: Film,
};

const typeLabels: Record<string, string> = {
  comic: "Comic",
  card: "Trading Card",
  vn: "Visual Novel",
  cyoa: "CYOA",
  cover: "Cover Art",
  motion: "Motion Comic",
};

export default function AdminReviewQueue() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<ReviewProject | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);

  const isAdmin = user?.role === "admin" || user?.email === "mojocreative1@gmail.com";

  const { data: queue = [], isLoading } = useQuery<ReviewProject[]>({
    queryKey: ["/api/admin/review-queue"],
    enabled: isAdmin,
  });

  const approveMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const res = await apiRequest("POST", `/api/admin/projects/${projectId}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/review-queue"] });
      toast.success("Project approved");
    },
    onError: (err: any) => toast.error(err.message || "Failed to approve"),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ projectId, reason }: { projectId: string; reason: string }) => {
      const res = await apiRequest("POST", `/api/admin/projects/${projectId}/reject`, { reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/review-queue"] });
      setShowRejectDialog(false);
      setRejectReason("");
      toast.success("Project rejected");
    },
    onError: (err: any) => toast.error(err.message || "Failed to reject"),
  });

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-white text-xl">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/admin")}
            className="border-2 border-black bg-zinc-800 text-white hover:bg-zinc-700"
            data-testid="button-back-admin"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-white font-['Space_Grotesk']">
            Review Queue
          </h1>
          <Badge className="bg-cyan-500/20 text-cyan-400 border-2 border-cyan-500">
            {queue.length} Pending
          </Badge>
        </div>

        {isLoading ? (
          <div className="text-center text-zinc-400 py-16">Loading review queue...</div>
        ) : queue.length === 0 ? (
          <Card className="bg-zinc-900 border-4 border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
            <CardContent className="py-16 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-xl text-white font-bold">All caught up!</p>
              <p className="text-zinc-400 mt-2">No projects waiting for review.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {queue.map((project) => {
              const TypeIcon = typeIcons[project.type] || FileText;
              return (
                <Card
                  key={project.id}
                  className="bg-zinc-900 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition-shadow"
                  data-testid={`review-card-${project.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {project.thumbnail ? (
                        <img
                          src={project.thumbnail}
                          alt={project.title}
                          className="w-20 h-20 object-cover border-2 border-black rounded"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-zinc-800 border-2 border-black rounded flex items-center justify-center">
                          <TypeIcon className="w-8 h-8 text-zinc-500" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <TypeIcon className="w-4 h-4 text-cyan-400" />
                          <span className="text-xs text-cyan-400 font-bold uppercase">
                            {typeLabels[project.type] || project.type}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white truncate">{project.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedProject(project)}
                          className="border-2 border-black bg-zinc-800 text-white hover:bg-zinc-700"
                          data-testid={`button-preview-${project.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => approveMutation.mutate(project.id)}
                          disabled={approveMutation.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                          data-testid={`button-approve-${project.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setRejectTarget(project.id);
                            setShowRejectDialog(true);
                          }}
                          className="border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                          data-testid={`button-reject-${project.id}`}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="bg-zinc-900 border-4 border-black max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-['Space_Grotesk']">
              {selectedProject?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedProject && (
            <div className="space-y-4">
              {selectedProject.thumbnail && (
                <img
                  src={selectedProject.thumbnail}
                  alt={selectedProject.title}
                  className="w-full max-h-64 object-contain border-2 border-black rounded"
                />
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-zinc-400">Type:</span>
                  <span className="text-white ml-2 font-bold">{typeLabels[selectedProject.type]}</span>
                </div>
                <div>
                  <span className="text-zinc-400">Submitted:</span>
                  <span className="text-white ml-2">
                    {formatDistanceToNow(new Date(selectedProject.updatedAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
              <div className="bg-zinc-800 p-3 rounded border-2 border-black max-h-48 overflow-auto">
                <pre className="text-xs text-zinc-300 whitespace-pre-wrap">
                  {JSON.stringify(selectedProject.data, null, 2).slice(0, 2000)}
                </pre>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => {
                    approveMutation.mutate(selectedProject.id);
                    setSelectedProject(null);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white border-2 border-black"
                  data-testid="button-approve-dialog"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setRejectTarget(selectedProject.id);
                    setShowRejectDialog(true);
                    setSelectedProject(null);
                  }}
                  className="border-2 border-black"
                  data-testid="button-reject-dialog"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="bg-zinc-900 border-4 border-black">
          <DialogHeader>
            <DialogTitle className="text-white font-['Space_Grotesk']">Reject Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="bg-zinc-800 border-2 border-black text-white"
              data-testid="input-reject-reason"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowRejectDialog(false)}
                className="border-2 border-black"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (rejectTarget) {
                    rejectMutation.mutate({ projectId: rejectTarget, reason: rejectReason });
                  }
                }}
                disabled={rejectMutation.isPending}
                className="border-2 border-black"
                data-testid="button-confirm-reject"
              >
                Confirm Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
