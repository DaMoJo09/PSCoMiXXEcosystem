import { Layout } from "@/components/layout/Layout";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Users,
  ClipboardList,
  FileCheck,
  Plus,
  Star,
  Award,
  Calendar,
  ChevronRight,
  ArrowLeft,
  Send,
  GraduationCap,
  BookOpen,
  Eye,
  FolderOpen,
  BarChart3,
  Clock,
  Activity,
} from "lucide-react";

const SCHOOL_ID = "default";

const PROJECT_TYPES = [
  { value: "comic", label: "Comic" },
  { value: "card", label: "Card" },
  { value: "vn", label: "Visual Novel" },
  { value: "cyoa", label: "CYOA" },
  { value: "cover", label: "Cover" },
  { value: "motion", label: "Motion" },
];

type Tab = "students" | "assignments" | "submissions" | "projects" | "analytics";

interface Student {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  xp: number;
  level: number;
  totalMinutes: number | null;
  lastActiveAt: string | null;
  schoolRole: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  projectType: string;
  dueDate: string | null;
  status: string;
  createdAt: string;
}

interface Submission {
  id: string;
  studentName: string;
  studentAvatar: string | null;
  projectUrl: string | null;
  submittedAt: string;
  grade: number | null;
  feedback: string | null;
  status: string;
}

interface StudentProject {
  id: string;
  title: string;
  type: string;
  studentName: string;
  studentId: string;
  updatedAt: string;
  status: string;
}

interface TeacherAnalytics {
  totalStudents: number;
  totalXp: number;
  totalMinutes: number;
  activeToday: number;
  topStudents: Array<{ id: string; name: string; avatar: string | null; xp: number; level: number }>;
  toolUsage: Record<string, number>;
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatMinutes(mins: number | null): string {
  if (!mins) return "0m";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

export default function TeacherDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("students");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [gradeForm, setGradeForm] = useState<Record<string, { grade: string; feedback: string }>>({});

  const [newAssignment, setNewAssignment] = useState({
    title: "",
    description: "",
    projectType: "comic",
    dueDate: "",
  });

  const { data: students = [], isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ["teacher", "students", SCHOOL_ID],
    queryFn: async () => {
      const res = await fetch(`/api/teacher/students?schoolId=${SCHOOL_ID}`);
      if (!res.ok) throw new Error("Failed to fetch students");
      return res.json();
    },
    enabled: activeTab === "students" || activeTab === "analytics",
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<Assignment[]>({
    queryKey: ["teacher", "assignments", SCHOOL_ID],
    queryFn: async () => {
      const res = await fetch(`/api/teacher/assignments?schoolId=${SCHOOL_ID}`);
      if (!res.ok) throw new Error("Failed to fetch assignments");
      return res.json();
    },
    enabled: activeTab === "assignments" || activeTab === "submissions",
  });

  const { data: submissions = [], isLoading: submissionsLoading } = useQuery<Submission[]>({
    queryKey: ["teacher", "submissions", selectedAssignmentId],
    queryFn: async () => {
      const res = await fetch(`/api/teacher/assignments/${selectedAssignmentId}/submissions`);
      if (!res.ok) throw new Error("Failed to fetch submissions");
      return res.json();
    },
    enabled: activeTab === "submissions" && !!selectedAssignmentId,
  });

  const { data: studentProjects = [], isLoading: projectsLoading } = useQuery<StudentProject[]>({
    queryKey: ["teacher", "student-projects", SCHOOL_ID],
    queryFn: async () => {
      const res = await fetch(`/api/teacher/student-projects?schoolId=${SCHOOL_ID}`);
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
    enabled: activeTab === "projects",
  });

  const { data: analytics } = useQuery<TeacherAnalytics>({
    queryKey: ["teacher", "analytics", SCHOOL_ID],
    queryFn: async () => {
      const res = await fetch(`/api/teacher/analytics?schoolId=${SCHOOL_ID}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: activeTab === "analytics",
  });

  const createAssignment = useMutation({
    mutationFn: async (data: typeof newAssignment) => {
      const res = await fetch("/api/teacher/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, schoolId: SCHOOL_ID }),
      });
      if (!res.ok) throw new Error("Failed to create assignment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher", "assignments"] });
      toast.success("Assignment created successfully");
      setShowCreateForm(false);
      setNewAssignment({ title: "", description: "", projectType: "comic", dueDate: "" });
    },
    onError: () => {
      toast.error("Failed to create assignment");
    },
  });

  const gradeSubmission = useMutation({
    mutationFn: async ({ submissionId, grade, feedback }: { submissionId: string; grade: number; feedback: string }) => {
      const res = await fetch(`/api/teacher/submissions/${submissionId}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade, feedback }),
      });
      if (!res.ok) throw new Error("Failed to grade submission");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher", "submissions"] });
      toast.success("Submission graded successfully");
    },
    onError: () => {
      toast.error("Failed to grade submission");
    },
  });

  const handleCreateAssignment = () => {
    if (!newAssignment.title.trim()) {
      toast.error("Title is required");
      return;
    }
    createAssignment.mutate(newAssignment);
  };

  const handleGradeSubmission = (submissionId: string) => {
    const form = gradeForm[submissionId];
    if (!form?.grade) {
      toast.error("Please enter a grade");
      return;
    }
    const grade = parseInt(form.grade, 10);
    if (isNaN(grade) || grade < 0 || grade > 100) {
      toast.error("Grade must be between 0 and 100");
      return;
    }
    gradeSubmission.mutate({ submissionId, grade, feedback: form.feedback || "" });
  };

  const tabs = [
    { id: "students" as Tab, label: "Students", icon: Users },
    { id: "assignments" as Tab, label: "Assignments", icon: ClipboardList },
    { id: "submissions" as Tab, label: "Submissions", icon: FileCheck },
    { id: "projects" as Tab, label: "Projects", icon: FolderOpen },
    { id: "analytics" as Tab, label: "Analytics", icon: BarChart3 },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-zinc-950 text-white">
        <header className="h-14 border-b-4 border-cyan-400 flex items-center justify-between px-6 bg-zinc-900 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-6 h-6 text-cyan-400" />
            <h1 className="font-black text-lg uppercase tracking-wide" data-testid="text-teacher-title">
              Teacher Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-400 bg-zinc-800 px-3 py-1 border border-zinc-700" data-testid="text-school-id">
              School: {SCHOOL_ID}
            </span>
          </div>
        </header>

        <div className="flex border-b-2 border-zinc-800 bg-zinc-900/50 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id !== "submissions") setSelectedAssignmentId(null);
              }}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wide transition-colors border-b-4 whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-cyan-400 text-cyan-400 bg-zinc-900"
                  : "border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="max-w-6xl mx-auto p-6">
          {activeTab === "students" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black uppercase flex items-center gap-2" data-testid="text-students-heading">
                  <Users className="w-5 h-5 text-cyan-400" />
                  Student Roster
                </h2>
                <span className="text-sm text-zinc-500 font-mono" data-testid="text-student-count">
                  {students.length} students
                </span>
              </div>

              {studentsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent animate-spin" />
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-16 border-4 border-dashed border-zinc-800" data-testid="text-no-students">
                  <Users className="w-12 h-12 mx-auto text-zinc-700 mb-4" />
                  <p className="text-zinc-500 font-bold">No students found in this school</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {students.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center gap-4 p-4 bg-zinc-900 border-2 border-zinc-800 hover:border-cyan-400/50 transition-colors shadow-[4px_4px_0_rgba(0,0,0,0.5)]"
                      data-testid={`card-student-${student.id}`}
                    >
                      <div className="w-12 h-12 bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center overflow-hidden">
                        {student.avatar ? (
                          <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" data-testid={`img-avatar-${student.id}`} />
                        ) : (
                          <Users className="w-6 h-6 text-zinc-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white" data-testid={`text-student-name-${student.id}`}>{student.name}</h3>
                        <div className="flex items-center gap-4 mt-1 flex-wrap">
                          <span className="text-xs font-mono text-cyan-400 flex items-center gap-1" data-testid={`text-student-xp-${student.id}`}>
                            <Star className="w-3 h-3" /> {student.xp || 0} XP
                          </span>
                          <span className="text-xs font-mono text-amber-400 flex items-center gap-1" data-testid={`text-student-level-${student.id}`}>
                            <Award className="w-3 h-3" /> Level {student.level || 1}
                          </span>
                          <span className="text-xs font-mono text-emerald-400 flex items-center gap-1" data-testid={`text-student-time-${student.id}`}>
                            <Clock className="w-3 h-3" /> {formatMinutes(student.totalMinutes)}
                          </span>
                          <span className="text-xs font-mono text-zinc-500 flex items-center gap-1" data-testid={`text-student-active-${student.id}`}>
                            <Activity className="w-3 h-3" /> {formatTimeAgo(student.lastActiveAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "assignments" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black uppercase flex items-center gap-2" data-testid="text-assignments-heading">
                  <ClipboardList className="w-5 h-5 text-cyan-400" />
                  Assignments
                </h2>
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-400 text-black font-black text-sm border-2 border-cyan-400 hover:bg-cyan-300 shadow-[4px_4px_0_rgba(0,0,0,0.5)] transition-colors"
                  data-testid="button-create-assignment"
                >
                  <Plus className="w-4 h-4" />
                  New Assignment
                </button>
              </div>

              {showCreateForm && (
                <div className="p-6 bg-zinc-900 border-4 border-cyan-400/50 shadow-[6px_6px_0_rgba(0,0,0,0.5)] space-y-4 mb-6">
                  <h3 className="font-black uppercase text-sm text-cyan-400 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Create Assignment
                  </h3>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-zinc-400">Title *</label>
                    <input
                      type="text"
                      value={newAssignment.title}
                      onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                      placeholder="Enter assignment title..."
                      className="w-full p-3 bg-zinc-950 border-2 border-zinc-700 text-white text-sm focus:outline-none focus:border-cyan-400"
                      data-testid="input-assignment-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-zinc-400">Description</label>
                    <textarea
                      value={newAssignment.description}
                      onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                      placeholder="Describe the assignment..."
                      rows={3}
                      className="w-full p-3 bg-zinc-950 border-2 border-zinc-700 text-white text-sm focus:outline-none focus:border-cyan-400 resize-none"
                      data-testid="input-assignment-description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-zinc-400">Project Type</label>
                      <select
                        value={newAssignment.projectType}
                        onChange={(e) => setNewAssignment({ ...newAssignment, projectType: e.target.value })}
                        className="w-full p-3 bg-zinc-950 border-2 border-zinc-700 text-white text-sm focus:outline-none focus:border-cyan-400"
                        data-testid="select-assignment-project-type"
                      >
                        {PROJECT_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-zinc-400">Due Date</label>
                      <input
                        type="datetime-local"
                        value={newAssignment.dueDate}
                        onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                        className="w-full p-3 bg-zinc-950 border-2 border-zinc-700 text-white text-sm focus:outline-none focus:border-cyan-400"
                        data-testid="input-assignment-due-date"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleCreateAssignment}
                      disabled={createAssignment.isPending}
                      className="flex items-center gap-2 px-6 py-2 bg-cyan-400 text-black font-black text-sm border-2 border-cyan-400 hover:bg-cyan-300 disabled:opacity-50 shadow-[4px_4px_0_rgba(0,0,0,0.5)]"
                      data-testid="button-submit-assignment"
                    >
                      <Send className="w-4 h-4" />
                      {createAssignment.isPending ? "Creating..." : "Create"}
                    </button>
                    <button
                      onClick={() => setShowCreateForm(false)}
                      className="px-6 py-2 bg-zinc-800 text-zinc-400 font-bold text-sm border-2 border-zinc-700 hover:border-zinc-500"
                      data-testid="button-cancel-assignment"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {assignmentsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent animate-spin" />
                </div>
              ) : assignments.length === 0 ? (
                <div className="text-center py-16 border-4 border-dashed border-zinc-800" data-testid="text-no-assignments">
                  <ClipboardList className="w-12 h-12 mx-auto text-zinc-700 mb-4" />
                  <p className="text-zinc-500 font-bold">No assignments yet</p>
                  <p className="text-zinc-600 text-sm mt-1">Create your first assignment to get started</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="p-4 bg-zinc-900 border-2 border-zinc-800 hover:border-cyan-400/50 transition-colors shadow-[4px_4px_0_rgba(0,0,0,0.5)]"
                      data-testid={`card-assignment-${assignment.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-bold text-white" data-testid={`text-assignment-title-${assignment.id}`}>
                              {assignment.title}
                            </h3>
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-400" data-testid={`text-assignment-type-${assignment.id}`}>
                              {assignment.projectType}
                            </span>
                            <span
                              className={`text-[10px] font-mono uppercase px-2 py-0.5 border ${
                                assignment.status === "active"
                                  ? "bg-emerald-400/10 border-emerald-400/30 text-emerald-400"
                                  : assignment.status === "closed"
                                  ? "bg-red-400/10 border-red-400/30 text-red-400"
                                  : "bg-zinc-800 border-zinc-700 text-zinc-400"
                              }`}
                              data-testid={`text-assignment-status-${assignment.id}`}
                            >
                              {assignment.status}
                            </span>
                          </div>
                          {assignment.description && (
                            <p className="text-sm text-zinc-400 mt-1" data-testid={`text-assignment-desc-${assignment.id}`}>
                              {assignment.description}
                            </p>
                          )}
                          {assignment.dueDate && (
                            <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1" data-testid={`text-assignment-due-${assignment.id}`}>
                              <Calendar className="w-3 h-3" />
                              Due: {new Date(assignment.dueDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setSelectedAssignmentId(assignment.id);
                            setActiveTab("submissions");
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-cyan-400 border border-cyan-400/30 hover:bg-cyan-400/10 transition-colors"
                          data-testid={`button-view-submissions-${assignment.id}`}
                        >
                          <Eye className="w-3 h-3" />
                          Submissions
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "submissions" && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={() => {
                    setActiveTab("assignments");
                    setSelectedAssignmentId(null);
                  }}
                  className="p-2 hover:bg-zinc-800 border-2 border-zinc-700 hover:border-zinc-500 transition-colors"
                  data-testid="button-back-to-assignments"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-xl font-black uppercase flex items-center gap-2" data-testid="text-submissions-heading">
                  <FileCheck className="w-5 h-5 text-cyan-400" />
                  Submissions
                </h2>
              </div>

              {!selectedAssignmentId ? (
                <div className="space-y-3">
                  <p className="text-sm text-zinc-400 mb-4">Select an assignment to view submissions:</p>
                  {assignments.map((assignment) => (
                    <button
                      key={assignment.id}
                      onClick={() => setSelectedAssignmentId(assignment.id)}
                      className="w-full text-left p-4 bg-zinc-900 border-2 border-zinc-800 hover:border-cyan-400/50 transition-colors flex items-center justify-between shadow-[4px_4px_0_rgba(0,0,0,0.5)]"
                      data-testid={`button-select-assignment-${assignment.id}`}
                    >
                      <div>
                        <h3 className="font-bold">{assignment.title}</h3>
                        <span className="text-xs text-zinc-500 font-mono uppercase">{assignment.projectType}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-zinc-600" />
                    </button>
                  ))}
                </div>
              ) : submissionsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent animate-spin" />
                </div>
              ) : submissions.length === 0 ? (
                <div className="text-center py-16 border-4 border-dashed border-zinc-800" data-testid="text-no-submissions">
                  <FileCheck className="w-12 h-12 mx-auto text-zinc-700 mb-4" />
                  <p className="text-zinc-500 font-bold">No submissions yet for this assignment</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {submissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="p-5 bg-zinc-900 border-2 border-zinc-800 shadow-[4px_4px_0_rgba(0,0,0,0.5)]"
                      data-testid={`card-submission-${submission.id}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center overflow-hidden">
                          {submission.studentAvatar ? (
                            <img src={submission.studentAvatar} alt={submission.studentName} className="w-full h-full object-cover" />
                          ) : (
                            <Users className="w-5 h-5 text-zinc-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold" data-testid={`text-submission-student-${submission.id}`}>
                              {submission.studentName}
                            </h3>
                            <span
                              className={`text-[10px] font-mono uppercase px-2 py-0.5 border ${
                                submission.status === "graded"
                                  ? "bg-emerald-400/10 border-emerald-400/30 text-emerald-400"
                                  : "bg-amber-400/10 border-amber-400/30 text-amber-400"
                              }`}
                              data-testid={`text-submission-status-${submission.id}`}
                            >
                              {submission.status}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 mt-1" data-testid={`text-submission-date-${submission.id}`}>
                            Submitted: {new Date(submission.submittedAt).toLocaleString()}
                          </p>

                          {submission.grade !== null && (
                            <div className="mt-3 p-3 bg-zinc-950 border border-zinc-800">
                              <p className="text-sm font-bold text-cyan-400" data-testid={`text-submission-grade-${submission.id}`}>
                                Grade: {submission.grade}/100
                              </p>
                              {submission.feedback && (
                                <p className="text-sm text-zinc-400 mt-1" data-testid={`text-submission-feedback-${submission.id}`}>
                                  {submission.feedback}
                                </p>
                              )}
                            </div>
                          )}

                          {submission.grade === null && (
                            <div className="mt-3 p-3 bg-zinc-950 border border-zinc-800 space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold uppercase text-zinc-500">Grade (0-100)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={gradeForm[submission.id]?.grade || ""}
                                    onChange={(e) =>
                                      setGradeForm({
                                        ...gradeForm,
                                        [submission.id]: {
                                          ...gradeForm[submission.id],
                                          grade: e.target.value,
                                          feedback: gradeForm[submission.id]?.feedback || "",
                                        },
                                      })
                                    }
                                    placeholder="85"
                                    className="w-full p-2 bg-zinc-900 border border-zinc-700 text-white text-sm focus:outline-none focus:border-cyan-400"
                                    data-testid={`input-grade-${submission.id}`}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold uppercase text-zinc-500">Feedback</label>
                                  <input
                                    type="text"
                                    value={gradeForm[submission.id]?.feedback || ""}
                                    onChange={(e) =>
                                      setGradeForm({
                                        ...gradeForm,
                                        [submission.id]: {
                                          ...gradeForm[submission.id],
                                          grade: gradeForm[submission.id]?.grade || "",
                                          feedback: e.target.value,
                                        },
                                      })
                                    }
                                    placeholder="Great work on the panel layouts..."
                                    className="w-full p-2 bg-zinc-900 border border-zinc-700 text-white text-sm focus:outline-none focus:border-cyan-400"
                                    data-testid={`input-feedback-${submission.id}`}
                                  />
                                </div>
                              </div>
                              <button
                                onClick={() => handleGradeSubmission(submission.id)}
                                disabled={gradeSubmission.isPending}
                                className="flex items-center gap-2 px-4 py-1.5 bg-cyan-400 text-black font-bold text-xs border-2 border-cyan-400 hover:bg-cyan-300 disabled:opacity-50 shadow-[3px_3px_0_rgba(0,0,0,0.5)]"
                                data-testid={`button-submit-grade-${submission.id}`}
                              >
                                <Send className="w-3 h-3" />
                                {gradeSubmission.isPending ? "Grading..." : "Submit Grade"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "projects" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black uppercase flex items-center gap-2" data-testid="text-projects-heading">
                  <FolderOpen className="w-5 h-5 text-cyan-400" />
                  Student Projects
                </h2>
                <span className="text-sm text-zinc-500 font-mono" data-testid="text-project-count">
                  {studentProjects.length} projects
                </span>
              </div>

              {projectsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent animate-spin" />
                </div>
              ) : studentProjects.length === 0 ? (
                <div className="text-center py-16 border-4 border-dashed border-zinc-800" data-testid="text-no-projects">
                  <FolderOpen className="w-12 h-12 mx-auto text-zinc-700 mb-4" />
                  <p className="text-zinc-500 font-bold">No student projects yet</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {studentProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center gap-4 p-4 bg-zinc-900 border-2 border-zinc-800 hover:border-cyan-400/50 transition-colors shadow-[4px_4px_0_rgba(0,0,0,0.5)]"
                      data-testid={`card-project-${project.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-white truncate" data-testid={`text-project-title-${project.id}`}>
                            {project.title}
                          </h3>
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-400 shrink-0">
                            {project.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                          <span data-testid={`text-project-student-${project.id}`}>{project.studentName}</span>
                          <span>{formatTimeAgo(project.updatedAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="space-y-6">
              <h2 className="text-xl font-black uppercase flex items-center gap-2" data-testid="text-analytics-heading">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
                Class Analytics
              </h2>

              {analytics ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Total Students" value={analytics.totalStudents} icon={Users} color="cyan" testId="stat-total-students" />
                    <StatCard label="Active Today" value={analytics.activeToday} icon={Activity} color="emerald" testId="stat-active-today" />
                    <StatCard label="Total XP" value={analytics.totalXp.toLocaleString()} icon={Star} color="amber" testId="stat-total-xp" />
                    <StatCard label="Total Time" value={formatMinutes(analytics.totalMinutes)} icon={Clock} color="purple" testId="stat-total-time" />
                  </div>

                  {analytics.toolUsage && Object.keys(analytics.toolUsage).length > 0 && (
                    <div className="bg-zinc-900 border-2 border-zinc-800 p-6 shadow-[4px_4px_0_rgba(0,0,0,0.5)]">
                      <h3 className="font-black uppercase text-sm text-zinc-400 mb-4">Projects by Tool</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {Object.entries(analytics.toolUsage).map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800">
                            <span className="text-xs font-mono uppercase text-zinc-400">{type}</span>
                            <span className="text-sm font-bold text-white" data-testid={`stat-type-${type}`}>{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {analytics.topStudents && analytics.topStudents.length > 0 && (
                    <div className="bg-zinc-900 border-2 border-zinc-800 p-6 shadow-[4px_4px_0_rgba(0,0,0,0.5)]">
                      <h3 className="font-black uppercase text-sm text-zinc-400 mb-4">Top Students by XP</h3>
                      <div className="space-y-2">
                        {analytics.topStudents.map((s, i) => (
                          <div key={s.id} className="flex items-center gap-3 p-3 bg-zinc-950 border border-zinc-800">
                            <span className="text-xs font-mono text-zinc-600 w-6">#{i + 1}</span>
                            <div className="w-8 h-8 bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                              {s.avatar ? (
                                <img src={s.avatar} alt={s.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xs font-bold text-zinc-500">{s.name.charAt(0)}</span>
                              )}
                            </div>
                            <span className="flex-1 text-sm font-bold text-white">{s.name}</span>
                            <span className="text-xs font-mono text-cyan-400">{s.xp} XP</span>
                            <span className="text-xs font-mono text-amber-400">Lv{s.level}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent animate-spin" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

const COLOR_MAP: Record<string, string> = {
  cyan: "text-cyan-400 border-cyan-400/30",
  emerald: "text-emerald-400 border-emerald-400/30",
  amber: "text-amber-400 border-amber-400/30",
  purple: "text-purple-400 border-purple-400/30",
};

function StatCard({ label, value, icon: Icon, color, testId }: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  testId: string;
}) {
  const colors = COLOR_MAP[color] || COLOR_MAP.cyan;
  return (
    <div className={`p-4 bg-zinc-900 border-2 border-zinc-800 shadow-[4px_4px_0_rgba(0,0,0,0.5)]`}>
      <div className={`flex items-center gap-2 mb-2 ${colors.split(" ")[0]}`}>
        <Icon className="w-4 h-4" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</span>
      </div>
      <p className="text-2xl font-black text-white" data-testid={testId}>{value}</p>
    </div>
  );
}
