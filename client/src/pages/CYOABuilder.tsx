import { Layout } from "@/components/layout/Layout";
import { 
  Save, 
  Download, 
  GitBranch, 
  Plus, 
  AlertCircle, 
  BookOpen,
  Link as LinkIcon,
  ArrowLeft,
  Play,
  Copy,
  RefreshCw,
  ChevronRight
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useProject, useUpdateProject, useCreateProject } from "@/hooks/useProjects";
import { toast } from "sonner";

interface CYOANode {
  id: string;
  text: string;
  choices: { label: string; target: string }[];
  isEnding?: boolean;
  endingType?: "good" | "bad" | "neutral";
}

export default function CYOABuilder() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const projectId = searchParams.get('id');
  
  const { data: project } = useProject(projectId || '');
  const updateProject = useUpdateProject();
  const createProject = useCreateProject();

  const [title, setTitle] = useState("Untitled CYOA");
  const [isSaving, setIsSaving] = useState(false);
  const [storyText, setStoryText] = useState("");
  const [branchPoints, setBranchPoints] = useState(5);
  const [optionsPerBranch, setOptionsPerBranch] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [nodes, setNodes] = useState<CYOANode[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [currentNode, setCurrentNode] = useState<string | null>(null);
  const [pathHistory, setPathHistory] = useState<string[]>([]);

  useEffect(() => {
    const savedStory = localStorage.getItem("cyoa_story");
    if (savedStory) {
      setStoryText(savedStory);
      localStorage.removeItem("cyoa_story");
      toast.success("Story imported from Story Forge!");
    }
  }, []);

  useEffect(() => {
    if (project) {
      setTitle(project.title);
      const data = project.data as any;
      if (data?.nodes) setNodes(data.nodes);
      if (data?.storyText) setStoryText(data.storyText);
    }
  }, [project]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (projectId) {
        await updateProject.mutateAsync({
          id: projectId,
          data: { title, data: { nodes, storyText, branchPoints, optionsPerBranch } },
        });
      } else {
        await createProject.mutateAsync({
          title,
          type: "cyoa",
          status: "draft",
          data: { nodes, storyText, branchPoints, optionsPerBranch },
        });
      }
      toast.success("Project saved");
    } catch (error: any) {
      toast.error(error.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const generateCYOA = async () => {
    if (!storyText.trim()) {
      toast.error("Please paste a story first");
      return;
    }

    setIsGenerating(true);
    await new Promise(r => setTimeout(r, 1500));

    const paragraphs = storyText.split(/\n\n+/).filter(p => p.trim());
    const segmentSize = Math.ceil(paragraphs.length / branchPoints);
    
    const generatedNodes: CYOANode[] = [];
    
    for (let i = 0; i < branchPoints; i++) {
      const startIdx = i * segmentSize;
      const segment = paragraphs.slice(startIdx, startIdx + segmentSize).join("\n\n");
      
      if (!segment) continue;
      
      const nodeId = `node_${i}`;
      const choices: { label: string; target: string }[] = [];
      
      if (i < branchPoints - 1) {
        for (let j = 0; j < optionsPerBranch; j++) {
          const choiceLabels = [
            ["Continue forward", "Take a different path", "Wait and observe", "Retreat"],
            ["Accept the challenge", "Decline politely", "Ask for more information", "Negotiate terms"],
            ["Trust your instincts", "Follow the evidence", "Seek help", "Go alone"],
          ];
          choices.push({
            label: choiceLabels[j % choiceLabels.length][i % 4],
            target: j === 0 ? `node_${i + 1}` : `ending_${j}_${i}`,
          });
        }
      }
      
      generatedNodes.push({
        id: nodeId,
        text: segment.substring(0, 500) + (segment.length > 500 ? "..." : ""),
        choices,
        isEnding: i === branchPoints - 1,
        endingType: i === branchPoints - 1 ? "good" : undefined,
      });

      if (i < branchPoints - 1) {
        for (let j = 1; j < optionsPerBranch; j++) {
          generatedNodes.push({
            id: `ending_${j}_${i}`,
            text: `Your choice leads to an unexpected outcome. The path diverges here, revealing a different fate...`,
            choices: [],
            isEnding: true,
            endingType: j === 1 ? "bad" : "neutral",
          });
        }
      }
    }

    setNodes(generatedNodes);
    setIsGenerating(false);
    toast.success("CYOA structure generated!");
  };

  const startPreview = () => {
    if (nodes.length === 0) {
      toast.error("Generate CYOA first");
      return;
    }
    setPreviewMode(true);
    setCurrentNode(nodes[0].id);
    setPathHistory([nodes[0].id]);
  };

  const selectChoice = (targetId: string) => {
    setCurrentNode(targetId);
    setPathHistory([...pathHistory, targetId]);
  };

  const goBack = () => {
    if (pathHistory.length > 1) {
      const newHistory = pathHistory.slice(0, -1);
      setPathHistory(newHistory);
      setCurrentNode(newHistory[newHistory.length - 1]);
    }
  };

  const exitPreview = () => {
    setPreviewMode(false);
    setCurrentNode(null);
    setPathHistory([]);
  };

  const exportCYOA = (format: "cyoa" | "json" | "txt") => {
    const data = format === "txt" 
      ? nodes.map(n => `[${n.id}]\n${n.text}\n${n.choices.map(c => `> ${c.label} -> ${c.target}`).join("\n")}`).join("\n\n---\n\n")
      : JSON.stringify({ title, nodes, metadata: { branchPoints, optionsPerBranch } }, null, 2);
    
    const blob = new Blob([data], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported as .${format}`);
  };

  const copyToClipboard = () => {
    const data = JSON.stringify({ title, nodes }, null, 2);
    navigator.clipboard.writeText(data);
    toast.success("Copied to clipboard!");
  };

  const getCurrentNodeData = () => nodes.find(n => n.id === currentNode);

  return (
    <Layout>
      <div className="h-screen flex flex-col">
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 hover:bg-muted border border-transparent hover:border-border transition-colors" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <div className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              <input 
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="font-display font-bold text-lg bg-transparent border-none outline-none hover:bg-muted px-2 py-1"
                data-testid="input-cyoa-title"
              />
            </div>
            <span className="text-xs font-mono text-muted-foreground">Interactive Fiction Engine</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-secondary hover:bg-border border border-border text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              data-testid="button-save"
            >
              <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save"}
            </button>
            <button 
              onClick={() => nodes.length > 0 && toast.success("Logic validated!")}
              className="px-4 py-2 bg-secondary hover:bg-border border border-border text-sm font-medium flex items-center gap-2" 
              data-testid="button-validate"
            >
              <AlertCircle className="w-4 h-4" /> Validate Logic
            </button>
          </div>
        </header>

        {previewMode ? (
          <div className="flex-1 bg-black text-white p-8 flex flex-col items-center justify-center">
            <div className="max-w-2xl w-full space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="font-display font-bold text-xl">Interactive Preview</h2>
                <div className="flex gap-2">
                  <button
                    onClick={goBack}
                    disabled={pathHistory.length <= 1}
                    className="px-3 py-1 bg-white/10 text-sm disabled:opacity-30"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={exitPreview}
                    className="px-3 py-1 bg-white/10 text-sm"
                  >
                    Exit Preview
                  </button>
                </div>
              </div>

              {getCurrentNodeData() && (
                <div className="space-y-6">
                  <div className={`p-6 border ${
                    getCurrentNodeData()?.isEnding 
                      ? getCurrentNodeData()?.endingType === "good" 
                        ? "border-green-500 bg-green-500/10" 
                        : getCurrentNodeData()?.endingType === "bad"
                          ? "border-red-500 bg-red-500/10"
                          : "border-yellow-500 bg-yellow-500/10"
                      : "border-white/20"
                  }`}>
                    {getCurrentNodeData()?.isEnding && (
                      <div className={`text-xs font-bold uppercase mb-4 ${
                        getCurrentNodeData()?.endingType === "good" ? "text-green-500" :
                        getCurrentNodeData()?.endingType === "bad" ? "text-red-500" : "text-yellow-500"
                      }`}>
                        {getCurrentNodeData()?.endingType?.toUpperCase()} ENDING
                      </div>
                    )}
                    <p className="font-mono text-sm leading-relaxed">{getCurrentNodeData()?.text}</p>
                  </div>

                  {getCurrentNodeData()?.choices && getCurrentNodeData()!.choices.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase text-white/50">Choose your path:</h4>
                      {getCurrentNodeData()!.choices.map((choice, i) => (
                        <button
                          key={i}
                          onClick={() => selectChoice(choice.target)}
                          className="w-full p-4 bg-white/5 border border-white/20 text-left hover:bg-white/10 hover:border-white/40 transition-colors flex items-center justify-between group"
                        >
                          <span>{choice.label}</span>
                          <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  )}

                  {getCurrentNodeData()?.isEnding && (
                    <button
                      onClick={() => {
                        setCurrentNode(nodes[0].id);
                        setPathHistory([nodes[0].id]);
                      }}
                      className="w-full p-4 bg-white text-black font-bold uppercase"
                    >
                      Restart Story
                    </button>
                  )}
                </div>
              )}

              <div className="text-xs text-white/30 text-center">
                Path: {pathHistory.join(" → ")}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            <div className="w-1/2 p-6 border-r border-border overflow-auto space-y-6">
              <div className="space-y-4">
                <h2 className="font-display font-bold text-lg flex items-center gap-2">
                  <BookOpen className="w-5 h-5" /> Paste Your Story
                </h2>
                <textarea
                  value={storyText}
                  onChange={(e) => setStoryText(e.target.value)}
                  placeholder="Paste your story text here. This can be from Story Forge or any other source..."
                  className="w-full h-64 p-4 border border-border bg-background text-sm font-mono resize-none focus:ring-1 focus:ring-primary outline-none"
                  data-testid="input-story-text"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase">Branch Points</label>
                  <div className="flex gap-2">
                    {[3, 5, 7, 10].map(n => (
                      <button
                        key={n}
                        onClick={() => setBranchPoints(n)}
                        className={`flex-1 py-2 text-sm font-medium border ${
                          branchPoints === n 
                            ? "bg-primary text-primary-foreground border-primary" 
                            : "bg-secondary border-border hover:border-primary"
                        }`}
                        data-testid={`branch-${n}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase">Options Per Branch</label>
                  <div className="flex gap-2">
                    {[2, 3, 4].map(n => (
                      <button
                        key={n}
                        onClick={() => setOptionsPerBranch(n)}
                        className={`flex-1 py-2 text-sm font-medium border ${
                          optionsPerBranch === n 
                            ? "bg-primary text-primary-foreground border-primary" 
                            : "bg-secondary border-border hover:border-primary"
                        }`}
                        data-testid={`options-${n}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={generateCYOA}
                disabled={isGenerating || !storyText.trim()}
                className="w-full py-4 bg-primary text-primary-foreground font-bold uppercase tracking-wider shadow-hard disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="button-generate-cyoa"
              >
                {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <GitBranch className="w-5 h-5" />}
                Generate CYOA
              </button>

              {nodes.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm uppercase">Export Options</h3>
                    <button
                      onClick={startPreview}
                      className="px-4 py-2 bg-green-500 text-white text-sm font-medium flex items-center gap-2"
                      data-testid="button-preview"
                    >
                      <Play className="w-4 h-4" /> Preview Story
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => exportCYOA("cyoa")}
                      className="p-3 bg-secondary border border-border text-sm font-medium hover:bg-muted flex flex-col items-center gap-1"
                    >
                      <Download className="w-4 h-4" />
                      .CYOA
                    </button>
                    <button
                      onClick={() => exportCYOA("json")}
                      className="p-3 bg-secondary border border-border text-sm font-medium hover:bg-muted flex flex-col items-center gap-1"
                    >
                      <Download className="w-4 h-4" />
                      JSON
                    </button>
                    <button
                      onClick={() => exportCYOA("txt")}
                      className="p-3 bg-secondary border border-border text-sm font-medium hover:bg-muted flex flex-col items-center gap-1"
                    >
                      <Download className="w-4 h-4" />
                      Text
                    </button>
                    <button
                      onClick={copyToClipboard}
                      className="p-3 bg-secondary border border-border text-sm font-medium hover:bg-muted flex flex-col items-center gap-1"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 bg-secondary/20 relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.1]" 
                   style={{ backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)", backgroundSize: "30px 30px" }} 
              />

              {nodes.length > 0 ? (
                <div className="absolute inset-0 p-8 overflow-auto">
                  <div className="space-y-4">
                    {nodes.filter(n => !n.id.startsWith("ending")).map((node, index) => (
                      <div key={node.id} className="flex items-start gap-4">
                        <div className={`w-64 p-4 bg-background border shadow-hard-sm ${
                          node.isEnding ? "border-green-500" : "border-black"
                        }`}>
                          <div className="flex justify-between mb-2">
                            <span className="font-bold text-xs">{node.isEnding ? "ENDING" : `SCENE ${index + 1}`}</span>
                          </div>
                          <p className="text-xs font-mono line-clamp-3">{node.text}</p>
                          {node.choices.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {node.choices.map((choice, i) => (
                                <div key={i} className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <LinkIcon className="w-2 h-2" />
                                  {choice.label}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {node.choices.length > 0 && (
                          <div className="flex flex-col gap-2 mt-4">
                            {node.choices.map((_, i) => (
                              <div key={i} className="w-8 h-px bg-border" />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <GitBranch className="w-16 h-16 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Generate a CYOA to see the branch structure</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
