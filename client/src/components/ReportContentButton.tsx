import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ReportableContentType = "post" | "comment" | "project" | "user";

interface ReportContentButtonProps {
  contentType: ReportableContentType;
  contentId: string;
  variant?: "icon" | "ghost" | "subtle";
  className?: string;
}

const REASONS: { value: string; label: string }[] = [
  { value: "spam", label: "Spam or scam" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "inappropriate", label: "Inappropriate / NSFW / hateful" },
  { value: "copyright", label: "Copyright infringement" },
  { value: "other", label: "Other" },
];

export function ReportContentButton({
  contentType,
  contentId,
  variant = "subtle",
  className,
}: ReportContentButtonProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) {
      toast.error("Please sign in to report content");
      return;
    }
    if (!reason) {
      toast.error("Please pick a reason");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType,
          contentId,
          reason,
          description: description.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Report submitted. Our moderators will review it.");
      setOpen(false);
      setReason("");
      setDescription("");
    } catch (e: any) {
      toast.error(e?.message || "Could not submit report");
    } finally {
      setSubmitting(false);
    }
  };

  const buttonClasses =
    variant === "icon"
      ? "p-2 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-zinc-700 transition-colors"
      : variant === "ghost"
        ? "px-2 py-1 text-xs text-zinc-400 hover:text-red-400 transition-colors flex items-center gap-1"
        : "px-3 py-1.5 text-xs text-zinc-300 hover:text-white border border-zinc-700 hover:border-red-500/60 hover:bg-red-500/10 transition-colors flex items-center gap-1.5";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`${buttonClasses} ${className || ""}`}
        data-testid={`button-report-${contentType}-${contentId}`}
        aria-label={`Report this ${contentType}`}
        title="Report"
      >
        <Flag className="w-3.5 h-3.5" />
        {variant !== "icon" && <span>Report</span>}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="bg-zinc-950 border-2 border-zinc-700 text-white max-w-md"
          data-testid="dialog-report-content"
        >
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-wide text-white">
              Report {contentType}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Reports are reviewed by our moderation team. False or abusive
              reports may affect your account standing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs uppercase font-bold text-zinc-400 mb-2">
                Reason
              </label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger
                  className="bg-zinc-900 border-zinc-700 text-white"
                  data-testid="select-report-reason"
                >
                  <SelectValue placeholder="Pick a reason..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                  {REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs uppercase font-bold text-zinc-400 mb-2">
                Details (optional)
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Anything else moderators should know..."
                className="bg-zinc-900 border-zinc-700 text-white min-h-[80px]"
                maxLength={500}
                data-testid="textarea-report-description"
              />
              <p className="text-[10px] text-zinc-500 mt-1">
                {description.length}/500
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
              className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-900"
              data-testid="button-cancel-report"
            >
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={submitting || !reason}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
              data-testid="button-submit-report"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Flag className="w-4 h-4 mr-2" />
              )}
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
