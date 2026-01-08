import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { Flag, CheckCircle, XCircle, Eye, AlertTriangle, Ban, Trash2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

interface ContentReport {
  id: string;
  reporterId: string;
  contentType: string;
  contentId: string;
  reason: string;
  description: string | null;
  status: string;
  resolvedBy: string | null;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

const reasonLabels: Record<string, string> = {
  spam: "Spam",
  harassment: "Harassment / Bullying",
  inappropriate: "Inappropriate Content",
  copyright: "Copyright Violation",
  other: "Other",
};

const resolutionOptions = [
  { value: "removed", label: "Remove Content", icon: Trash2 },
  { value: "warned", label: "Warn User", icon: AlertTriangle },
  { value: "banned", label: "Ban User", icon: Ban },
  { value: "no_action", label: "No Action Needed", icon: XCircle },
];

function ReportCard({ report, onResolve, onDismiss }: { 
  report: ContentReport; 
  onResolve: (id: string, resolution: string) => void;
  onDismiss: (id: string) => void;
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div 
      className="bg-white/5 border-4 border-black p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
      data-testid={`report-card-${report.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Flag className="w-4 h-4 text-white" />
            <span className="font-bold text-white capitalize">{report.contentType}</span>
            <span className={`px-2 py-0.5 text-xs font-bold border-2 border-black ${
              report.status === "pending" ? "bg-yellow-500 text-black" :
              report.status === "resolved" ? "bg-green-500 text-black" :
              report.status === "dismissed" ? "bg-zinc-400 text-black" :
              "bg-zinc-500 text-white"
            }`}>
              {report.status.toUpperCase()}
            </span>
          </div>
          <p className="text-sm text-white/70 mb-1">
            <span className="font-bold">Reason:</span> {reasonLabels[report.reason] || report.reason}
          </p>
          {report.description && (
            <p className="text-sm text-white/60 mb-2">
              <span className="font-bold">Details:</span> {report.description}
            </p>
          )}
          <p className="text-xs text-white/50">
            Reported {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
          </p>
          {report.resolution && (
            <p className="text-xs text-white/50 mt-1">
              Resolution: <span className="font-bold capitalize">{report.resolution.replace("_", " ")}</span>
            </p>
          )}
        </div>
        {report.status === "pending" && (
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => setShowActions(true)}
              className="bg-white text-black border-2 border-black hover:bg-white/90 font-bold text-sm"
              data-testid={`report-resolve-${report.id}`}
            >
              <CheckCircle className="w-4 h-4 mr-1" /> Resolve
            </Button>
            <Button
              onClick={() => onDismiss(report.id)}
              variant="ghost"
              className="text-white/50 hover:text-white text-sm"
              data-testid={`report-dismiss-${report.id}`}
            >
              <XCircle className="w-4 h-4 mr-1" /> Dismiss
            </Button>
          </div>
        )}
      </div>

      <Dialog open={showActions} onOpenChange={setShowActions}>
        <DialogContent className="bg-zinc-900 border-4 border-black text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Choose Resolution</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {resolutionOptions.map((option) => (
              <Button
                key={option.value}
                onClick={() => {
                  onResolve(report.id, option.value);
                  setShowActions(false);
                }}
                className="bg-white/10 border-2 border-black hover:bg-white/20 text-white font-bold flex flex-col items-center gap-2 p-4 h-auto"
                data-testid={`resolution-${option.value}`}
              >
                <option.icon className="w-6 h-6" />
                <span>{option.label}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminModeration() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");

  const { data: reports = [], isLoading } = useQuery<ContentReport[]>({
    queryKey: ["/api/admin/reports", statusFilter],
    queryFn: async () => {
      const url = statusFilter === "all" 
        ? "/api/admin/reports" 
        : `/api/admin/reports?status=${statusFilter}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, resolution }: { id: string; resolution: string }) => {
      return apiRequest("POST", `/api/admin/reports/${id}/resolve`, { resolution });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      toast({
        title: "Report Resolved",
        description: "The report has been resolved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to resolve report.",
        variant: "destructive",
      });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/admin/reports/${id}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      toast({
        title: "Report Dismissed",
        description: "The report has been dismissed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to dismiss report.",
        variant: "destructive",
      });
    },
  });

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-white/50 font-bold">Access Denied</p>
      </div>
    );
  }

  const pendingCount = reports.filter(r => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/admin")}
            className="p-2 text-white/70 hover:text-white border-2 border-black bg-white/5"
            data-testid="back-to-admin"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">CONTENT MODERATION</h1>
            <p className="text-white/50">
              {pendingCount > 0 ? `${pendingCount} reports pending review` : "All reports reviewed"}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48 bg-white/10 border-2 border-black text-white" data-testid="status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-2 border-black">
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
              <SelectItem value="all">All Reports</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-white/50">Loading reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 bg-white/5 border-4 border-black">
            <Flag className="w-12 h-12 text-white/30 mx-auto mb-4" />
            <p className="text-white/50 font-bold">No reports found</p>
            <p className="text-white/30 text-sm mt-1">
              {statusFilter === "pending" 
                ? "Great! No pending reports to review." 
                : "No reports match this filter."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onResolve={(id, resolution) => resolveMutation.mutate({ id, resolution })}
                onDismiss={(id) => dismissMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
