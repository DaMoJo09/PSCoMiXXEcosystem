import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ReportButtonProps {
  contentType: "post" | "comment" | "project" | "user";
  contentId: string;
  variant?: "icon" | "text";
}

export function ReportButton({ contentType, contentId, variant = "icon" }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  const reportMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/reports", { contentType, contentId, reason, description });
    },
    onSuccess: () => {
      toast({
        title: "Report Submitted",
        description: "Thank you for helping keep our community safe. We'll review this shortly.",
      });
      setOpen(false);
      setReason("");
      setDescription("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!reason) {
      toast({
        title: "Select a reason",
        description: "Please select a reason for your report.",
        variant: "destructive",
      });
      return;
    }
    reportMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "icon" ? (
          <button 
            className="text-white/50 hover:text-white transition-colors p-1"
            title="Report content"
            data-testid={`report-button-${contentType}-${contentId}`}
          >
            <Flag className="w-4 h-4" />
          </button>
        ) : (
          <Button 
            variant="ghost" 
            size="sm"
            className="text-white/50 hover:text-white"
            data-testid={`report-button-${contentType}-${contentId}`}
          >
            <Flag className="w-4 h-4 mr-2" />
            Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-4 border-black text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Report Content</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-bold text-white/70 mb-2 block">Reason</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="bg-white/10 border-2 border-black text-white" data-testid="report-reason-select">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-2 border-black">
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="harassment">Harassment or bullying</SelectItem>
                <SelectItem value="inappropriate">Inappropriate content</SelectItem>
                <SelectItem value="copyright">Copyright violation</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-bold text-white/70 mb-2 block">Additional details (optional)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide any additional context..."
              className="bg-white/10 border-2 border-black text-white placeholder:text-white/50 min-h-[100px]"
              data-testid="report-description-input"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={reportMutation.isPending || !reason}
              className="bg-white text-black border-2 border-black hover:bg-white/90 font-bold"
              data-testid="report-submit-button"
            >
              {reportMutation.isPending ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
