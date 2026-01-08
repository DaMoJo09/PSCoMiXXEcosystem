import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Play,
  Clock,
  Star,
  ChevronRight,
  GraduationCap,
  Zap
} from "lucide-react";

interface Pathway {
  id: string;
  title: string;
  description: string | null;
  category: string;
  difficulty: string;
  estimatedHours: number | null;
  thumbnail: string | null;
  xpReward: number;
  published: boolean | null;
  sortOrder: number | null;
  createdAt: string;
}

interface Lesson {
  id: string;
  pathwayId: string;
  title: string;
  description: string | null;
  content: string | null;
  videoUrl: string | null;
  duration: number | null;
  xpReward: number;
  sortOrder: number | null;
  hasChallenge: boolean | null;
  challengePrompt: string | null;
  createdAt: string;
}

const CATEGORIES = ["comics", "animation", "3d", "worldbuilding", "writing", "tools"];
const DIFFICULTIES = ["beginner", "intermediate", "advanced"];

export default function LearnModule() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin";
  
  const [selectedPathway, setSelectedPathway] = useState<Pathway | null>(null);
  const [isPathwayDialogOpen, setIsPathwayDialogOpen] = useState(false);
  const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false);
  const [editingPathway, setEditingPathway] = useState<Pathway | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  
  const [pathwayForm, setPathwayForm] = useState({
    title: "",
    description: "",
    category: "comics",
    difficulty: "beginner",
    estimatedHours: 1,
    thumbnail: "",
    xpReward: 100,
    published: true
  });
  
  const [lessonForm, setLessonForm] = useState({
    pathwayId: "",
    title: "",
    description: "",
    content: "",
    videoUrl: "",
    duration: 10,
    xpReward: 25,
    sortOrder: 0,
    hasChallenge: false,
    challengePrompt: ""
  });

  const { data: pathways = [], isLoading: pathwaysLoading } = useQuery({
    queryKey: ["/api/pathways"],
    queryFn: async () => {
      const res = await fetch("/api/pathways", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: lessons = [], isLoading: lessonsLoading } = useQuery({
    queryKey: ["/api/lessons"],
    queryFn: async () => {
      const res = await fetch("/api/lessons", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createPathwayMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/pathways", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create pathway");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pathways"] });
      setIsPathwayDialogOpen(false);
      resetPathwayForm();
      toast.success("Pathway created");
    },
    onError: () => toast.error("Failed to create pathway"),
  });

  const updatePathwayMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/pathways/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update pathway");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pathways"] });
      setEditingPathway(null);
      resetPathwayForm();
      toast.success("Pathway updated");
    },
    onError: () => toast.error("Failed to update pathway"),
  });

  const deletePathwayMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/pathways/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete pathway");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pathways"] });
      toast.success("Pathway deleted");
    },
    onError: () => toast.error("Failed to delete pathway"),
  });

  const createLessonMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create lesson");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
      setIsLessonDialogOpen(false);
      resetLessonForm();
      toast.success("Lesson created");
    },
    onError: () => toast.error("Failed to create lesson"),
  });

  const updateLessonMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/lessons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update lesson");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
      setEditingLesson(null);
      resetLessonForm();
      toast.success("Lesson updated");
    },
    onError: () => toast.error("Failed to update lesson"),
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/lessons/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete lesson");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
      toast.success("Lesson deleted");
    },
    onError: () => toast.error("Failed to delete lesson"),
  });

  const resetPathwayForm = () => {
    setPathwayForm({
      title: "",
      description: "",
      category: "comics",
      difficulty: "beginner",
      estimatedHours: 1,
      thumbnail: "",
      xpReward: 100,
      published: true
    });
  };

  const resetLessonForm = () => {
    setLessonForm({
      pathwayId: "",
      title: "",
      description: "",
      content: "",
      videoUrl: "",
      duration: 10,
      xpReward: 25,
      sortOrder: 0,
      hasChallenge: false,
      challengePrompt: ""
    });
  };

  const openEditPathway = (pathway: Pathway) => {
    setEditingPathway(pathway);
    setPathwayForm({
      title: pathway.title,
      description: pathway.description || "",
      category: pathway.category,
      difficulty: pathway.difficulty,
      estimatedHours: pathway.estimatedHours || 1,
      thumbnail: pathway.thumbnail || "",
      xpReward: pathway.xpReward,
      published: pathway.published ?? true
    });
  };

  const openEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setLessonForm({
      pathwayId: lesson.pathwayId,
      title: lesson.title,
      description: lesson.description || "",
      content: lesson.content || "",
      videoUrl: lesson.videoUrl || "",
      duration: lesson.duration || 10,
      xpReward: lesson.xpReward,
      sortOrder: lesson.sortOrder || 0,
      hasChallenge: lesson.hasChallenge ?? false,
      challengePrompt: lesson.challengePrompt || ""
    });
  };

  const handleSubmitPathway = () => {
    if (editingPathway) {
      updatePathwayMutation.mutate({ id: editingPathway.id, data: pathwayForm });
    } else {
      createPathwayMutation.mutate(pathwayForm);
    }
  };

  const handleSubmitLesson = () => {
    if (editingLesson) {
      updateLessonMutation.mutate({ id: editingLesson.id, data: lessonForm });
    } else {
      createLessonMutation.mutate(lessonForm);
    }
  };

  const getPathwayLessons = (pathwayId: string) => {
    return lessons.filter((l: Lesson) => l.pathwayId === pathwayId);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner": return "border-green-500 text-green-500";
      case "intermediate": return "border-yellow-500 text-yellow-500";
      case "advanced": return "border-red-500 text-red-500";
      default: return "border-white text-white";
    }
  };

  return (
    <div className="flex min-h-screen bg-black text-white">
      <AppSidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                LEARN
              </h1>
              <p className="text-zinc-400 mt-1">Master new skills through guided pathways and earn XP</p>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <Dialog open={isPathwayDialogOpen || !!editingPathway} onOpenChange={(open) => {
                  if (!open) {
                    setIsPathwayDialogOpen(false);
                    setEditingPathway(null);
                    resetPathwayForm();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={() => setIsPathwayDialogOpen(true)}
                      className="bg-white text-black hover:bg-zinc-200 font-bold border-2 border-white"
                      data-testid="btn-add-pathway"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      ADD PATHWAY
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-black border-2 border-white text-white max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-black">{editingPathway ? "EDIT PATHWAY" : "ADD PATHWAY"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label className="text-white">Title *</Label>
                        <Input
                          value={pathwayForm.title}
                          onChange={(e) => setPathwayForm({ ...pathwayForm, title: e.target.value })}
                          className="bg-zinc-900 border-white text-white"
                          data-testid="input-pathway-title"
                        />
                      </div>
                      <div>
                        <Label className="text-white">Description</Label>
                        <Textarea
                          value={pathwayForm.description}
                          onChange={(e) => setPathwayForm({ ...pathwayForm, description: e.target.value })}
                          className="bg-zinc-900 border-white text-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-white">Category</Label>
                          <Select value={pathwayForm.category} onValueChange={(v) => setPathwayForm({ ...pathwayForm, category: v })}>
                            <SelectTrigger className="bg-zinc-900 border-white text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-black border-white">
                              {CATEGORIES.map(cat => (
                                <SelectItem key={cat} value={cat} className="text-white capitalize">{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-white">Difficulty</Label>
                          <Select value={pathwayForm.difficulty} onValueChange={(v) => setPathwayForm({ ...pathwayForm, difficulty: v })}>
                            <SelectTrigger className="bg-zinc-900 border-white text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-black border-white">
                              {DIFFICULTIES.map(d => (
                                <SelectItem key={d} value={d} className="text-white capitalize">{d}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-white">Est. Hours</Label>
                          <Input
                            type="number"
                            value={pathwayForm.estimatedHours}
                            onChange={(e) => setPathwayForm({ ...pathwayForm, estimatedHours: parseInt(e.target.value) })}
                            className="bg-zinc-900 border-white text-white"
                          />
                        </div>
                        <div>
                          <Label className="text-white">XP Reward</Label>
                          <Input
                            type="number"
                            value={pathwayForm.xpReward}
                            onChange={(e) => setPathwayForm({ ...pathwayForm, xpReward: parseInt(e.target.value) })}
                            className="bg-zinc-900 border-white text-white"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-white">Thumbnail URL</Label>
                        <Input
                          value={pathwayForm.thumbnail}
                          onChange={(e) => setPathwayForm({ ...pathwayForm, thumbnail: e.target.value })}
                          className="bg-zinc-900 border-white text-white"
                          placeholder="https://..."
                        />
                      </div>
                      <Button
                        onClick={handleSubmitPathway}
                        disabled={!pathwayForm.title || createPathwayMutation.isPending || updatePathwayMutation.isPending}
                        className="w-full bg-white text-black hover:bg-zinc-200 font-bold"
                        data-testid="btn-save-pathway"
                      >
                        {editingPathway ? "UPDATE PATHWAY" : "CREATE PATHWAY"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={isLessonDialogOpen || !!editingLesson} onOpenChange={(open) => {
                  if (!open) {
                    setIsLessonDialogOpen(false);
                    setEditingLesson(null);
                    resetLessonForm();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={() => setIsLessonDialogOpen(true)}
                      variant="outline"
                      className="border-2 border-white text-white hover:bg-white hover:text-black font-bold"
                      data-testid="btn-add-lesson"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      ADD LESSON
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-black border-2 border-white text-white max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-black">{editingLesson ? "EDIT LESSON" : "ADD LESSON"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label className="text-white">Pathway *</Label>
                        <Select value={lessonForm.pathwayId} onValueChange={(v) => setLessonForm({ ...lessonForm, pathwayId: v })}>
                          <SelectTrigger className="bg-zinc-900 border-white text-white">
                            <SelectValue placeholder="Select pathway" />
                          </SelectTrigger>
                          <SelectContent className="bg-black border-white">
                            {pathways.map((p: Pathway) => (
                              <SelectItem key={p.id} value={p.id} className="text-white">{p.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-white">Title *</Label>
                        <Input
                          value={lessonForm.title}
                          onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                          className="bg-zinc-900 border-white text-white"
                          data-testid="input-lesson-title"
                        />
                      </div>
                      <div>
                        <Label className="text-white">Description</Label>
                        <Textarea
                          value={lessonForm.description}
                          onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                          className="bg-zinc-900 border-white text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-white">Content (Markdown)</Label>
                        <Textarea
                          value={lessonForm.content}
                          onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                          className="bg-zinc-900 border-white text-white min-h-[120px]"
                          placeholder="Lesson content in markdown..."
                        />
                      </div>
                      <div>
                        <Label className="text-white">Video URL</Label>
                        <Input
                          value={lessonForm.videoUrl}
                          onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })}
                          className="bg-zinc-900 border-white text-white"
                          placeholder="https://youtube.com/..."
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-white">Duration (min)</Label>
                          <Input
                            type="number"
                            value={lessonForm.duration}
                            onChange={(e) => setLessonForm({ ...lessonForm, duration: parseInt(e.target.value) })}
                            className="bg-zinc-900 border-white text-white"
                          />
                        </div>
                        <div>
                          <Label className="text-white">XP Reward</Label>
                          <Input
                            type="number"
                            value={lessonForm.xpReward}
                            onChange={(e) => setLessonForm({ ...lessonForm, xpReward: parseInt(e.target.value) })}
                            className="bg-zinc-900 border-white text-white"
                          />
                        </div>
                        <div>
                          <Label className="text-white">Sort Order</Label>
                          <Input
                            type="number"
                            value={lessonForm.sortOrder}
                            onChange={(e) => setLessonForm({ ...lessonForm, sortOrder: parseInt(e.target.value) })}
                            className="bg-zinc-900 border-white text-white"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={lessonForm.hasChallenge}
                          onChange={(e) => setLessonForm({ ...lessonForm, hasChallenge: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <Label className="text-white">Has Challenge</Label>
                      </div>
                      {lessonForm.hasChallenge && (
                        <div>
                          <Label className="text-white">Challenge Prompt</Label>
                          <Textarea
                            value={lessonForm.challengePrompt}
                            onChange={(e) => setLessonForm({ ...lessonForm, challengePrompt: e.target.value })}
                            className="bg-zinc-900 border-white text-white"
                            placeholder="Describe the challenge..."
                          />
                        </div>
                      )}
                      <Button
                        onClick={handleSubmitLesson}
                        disabled={!lessonForm.title || !lessonForm.pathwayId || createLessonMutation.isPending || updateLessonMutation.isPending}
                        className="w-full bg-white text-black hover:bg-zinc-200 font-bold"
                        data-testid="btn-save-lesson"
                      >
                        {editingLesson ? "UPDATE LESSON" : "CREATE LESSON"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>

          {pathwaysLoading ? (
            <div className="text-center py-12 text-zinc-500">Loading...</div>
          ) : pathways.length === 0 ? (
            <div className="text-center py-12 border-2 border-zinc-800">
              <GraduationCap className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
              <p className="text-zinc-500 mb-4">No learning pathways available yet</p>
              {isAdmin && (
                <Button onClick={() => setIsPathwayDialogOpen(true)} className="bg-white text-black">
                  <Plus className="w-4 h-4 mr-2" /> Create First Pathway
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pathways.map((pathway: Pathway) => {
                const pathwayLessons = getPathwayLessons(pathway.id);
                return (
                  <Card key={pathway.id} className="bg-black border-2 border-white hover:border-zinc-400 transition-all group">
                    <CardHeader className="p-0">
                      {pathway.thumbnail ? (
                        <div className="h-40 overflow-hidden">
                          <img 
                            src={pathway.thumbnail} 
                            alt={pathway.title}
                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                          />
                        </div>
                      ) : (
                        <div className="h-40 bg-zinc-900 flex items-center justify-center">
                          <BookOpen className="w-12 h-12 text-zinc-700" />
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-black text-lg">{pathway.title}</h3>
                          <p className="text-zinc-400 text-sm capitalize">{pathway.category}</p>
                        </div>
                        <Badge variant="outline" className={`text-xs ${getDifficultyColor(pathway.difficulty)}`}>
                          {pathway.difficulty}
                        </Badge>
                      </div>
                      <p className="text-zinc-500 text-sm mb-4 line-clamp-2">{pathway.description}</p>
                      <div className="flex items-center gap-4 text-xs text-zinc-400 mb-4">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {pathway.estimatedHours}h
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {pathwayLessons.length} lessons
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {pathway.xpReward} XP
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <Button
                          onClick={() => setSelectedPathway(pathway)}
                          className="bg-white text-black hover:bg-zinc-200 font-bold text-sm"
                          data-testid={`btn-view-pathway-${pathway.id}`}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          START
                        </Button>
                        {isAdmin && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditPathway(pathway)}
                              className="p-2 border border-white hover:bg-white hover:text-black transition-colors"
                              data-testid={`btn-edit-pathway-${pathway.id}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deletePathwayMutation.mutate(pathway.id)}
                              className="p-2 border border-white hover:bg-white hover:text-black transition-colors"
                              data-testid={`btn-delete-pathway-${pathway.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {selectedPathway && (
            <Dialog open={!!selectedPathway} onOpenChange={() => setSelectedPathway(null)}>
              <DialogContent className="bg-black border-2 border-white text-white max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black">{selectedPathway.title}</DialogTitle>
                </DialogHeader>
                <p className="text-zinc-400">{selectedPathway.description}</p>
                <div className="space-y-3 mt-4">
                  <h3 className="font-bold text-lg">Lessons</h3>
                  {getPathwayLessons(selectedPathway.id).length === 0 ? (
                    <p className="text-zinc-500">No lessons in this pathway yet</p>
                  ) : (
                    getPathwayLessons(selectedPathway.id).map((lesson: Lesson, idx: number) => (
                      <div key={lesson.id} className="flex items-center gap-4 p-4 border border-zinc-800 hover:border-white transition-colors">
                        <div className="w-8 h-8 border-2 border-white flex items-center justify-center font-bold text-sm">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold">{lesson.title}</h4>
                          <p className="text-zinc-400 text-sm">{lesson.description}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                            {lesson.duration && <span>{lesson.duration} min</span>}
                            <span>{lesson.xpReward} XP</span>
                            {lesson.hasChallenge && <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-500">Challenge</Badge>}
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditLesson(lesson)}
                              className="p-2 border border-white hover:bg-white hover:text-black"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => deleteLessonMutation.mutate(lesson.id)}
                              className="p-2 border border-white hover:bg-white hover:text-black"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <ChevronRight className="w-5 h-5 text-zinc-600" />
                      </div>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </main>
    </div>
  );
}
