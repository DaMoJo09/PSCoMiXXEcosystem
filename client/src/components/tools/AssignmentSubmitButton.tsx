import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, ClipboardList, X } from "lucide-react";

interface Assignment {
  id: string;
  title: string;
  projectType: string;
  dueDate: string | null;
  status: string;
}

interface AssignmentSubmitButtonProps {
  projectId: string;
  projectType: string;
}

export default function AssignmentSubmitButton({ projectId, projectType }: AssignmentSubmitButtonProps) {
  const [showModal, setShowModal] = useState(false);

  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: ["student", "active-assignments"],
    queryFn: async () => {
      const res = await fetch("/api/student/active-assignments");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: showModal,
  });

  const submitMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const res = await fetch(`/api/assignments/${assignmentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Submitted to assignment");
      setShowModal(false);
    },
    onError: () => {
      toast.error("Failed to submit to assignment");
    },
  });

  const filteredAssignments = assignments.filter(
    (a) => a.projectType === projectType || a.projectType === "any"
  );

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold border-2 border-blue-400 transition-colors"
        data-testid="button-submit-assignment"
      >
        <ClipboardList className="w-4 h-4" />
        Submit to Assignment
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border-2 border-zinc-700 p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Submit to Assignment</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white" data-testid="button-close-assignment-modal">
                <X className="w-5 h-5" />
              </button>
            </div>

            {filteredAssignments.length === 0 ? (
              <p className="text-zinc-400 text-sm" data-testid="text-no-assignments">
                No active assignments available for this project type.
              </p>
            ) : (
              <div className="space-y-2">
                {filteredAssignments.map((assignment) => (
                  <button
                    key={assignment.id}
                    onClick={() => submitMutation.mutate(assignment.id)}
                    disabled={submitMutation.isPending}
                    className="w-full text-left p-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 transition-colors"
                    data-testid={`button-submit-to-${assignment.id}`}
                  >
                    <div className="font-bold text-white text-sm">{assignment.title}</div>
                    {assignment.dueDate && (
                      <div className="text-xs text-zinc-400 mt-1">
                        Due: {new Date(assignment.dueDate).toLocaleDateString()}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
