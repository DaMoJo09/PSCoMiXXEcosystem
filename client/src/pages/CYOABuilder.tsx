import { Layout } from "@/components/layout/Layout";
import { 
  Save, Download, GitBranch, Plus, AlertCircle, BookOpen, Link as LinkIcon,
  ArrowLeft, Play, Copy, RefreshCw, ChevronRight, Trash2, Image as ImageIcon,
  Upload, Wand2, X, Edit, Eye
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { AIGenerator } from "@/components/tools/AIGenerator";
import { useProject, useUpdateProject, useCreateProject } from "@/hooks/useProjects";
import { toast } from "sonner";

interface CYOANode {
  id: string;
  text: string;
  choices: { label: string; target: string }[];
  isEnding?: boolean;
  endingType?: "good" | "bad" | "neutral";
  image?: string;
}

interface CYOABackground {
  id: string;
  name: string;
  url: string;
}

export default function CYOABuilder() {
  const [location, navigate] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const projectId = searchParams.get('id');
  
  const { data: project } = useProject(projectId || '');
  const updateProject = useUpdateProject();
  const createProject = useCreateProject();

  const [title, setTitle] = useState("Untitled CYOA");
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [storyText, setStoryText] = useState("");
  const [branchPoints, setBranchPoints] = useState(5);
  const [optionsPerBranch, setOptionsPerBranch] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [nodes, setNodes] = useState<CYOANode[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [currentNode, setCurrentNode] = useState<string | null>(null);
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [backgrounds, setBackgrounds] = useState<CYOABackground[]>([]);
  const [showAIGen, setShowAIGen] = useState(false);
  const [activeTab, setActiveTab] = useState<"story" | "nodes" | "assets">("story");

  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const creatingFlag = sessionStorage.getItem('cyoa_creating');
    if (!projectId && !creatingFlag && !createProject.isPending) {
      sessionStorage.setItem('cyoa_creating', 'true');
      setIsCreating(true);
      createProject.mutateAsync({
        title: "Untitled CYOA",
        type: "cyoa",
        status: "draft",
        data: { nodes: [], storyText: "", backgrounds: [] },
      }).then((newProject) => {
        sessionStorage.removeItem('cyoa_creating');
        setIsCreating(false);
        navigate(`/creator/cyoa?id=${newProject.id}`, { replace: true });
      }).catch(() => {
        toast.error("Failed to create project");
        sessionStorage.removeItem('cyoa_creating');
        setIsCreating(false);
      });
    } else if (projectId) {
      sessionStorage.removeItem('cyoa_creating');
      setIsCreating(false);
    }
  }, [projectId]);

  useEffect(() => {
    const savedStory = localStorage.getItem("cyoa_story");
    const autoBranch = localStorage.getItem("cyoa_auto_branch");
    const branchCount = localStorage.getItem("cyoa_branch_count");
    
    if (savedStory) {
      setStoryText(savedStory);
      localStorage.removeItem("cyoa_story");
      
      if (autoBranch === "true") {
        localStorage.removeItem("cyoa_auto_branch");
        localStorage.removeItem("cyoa_branch_count");
        
        const count = branchCount ? parseInt(branchCount) : 5;
        setBranchPoints(count);
        setOptionsPerBranch(3);
        
        setTimeout(() => {
          const paragraphs = savedStory.split(/\n\n+/).filter(p => p.trim());
          const segmentSize = Math.ceil(paragraphs.length / count);
          const generatedNodes: CYOANode[] = [];
          
          for (let i = 0; i < count; i++) {
            const startIdx = i * segmentSize;
            const segment = paragraphs.slice(startIdx, startIdx + segmentSize).join("\n\n");
            if (!segment) continue;
            
            const nodeId = `node_${i}`;
            const choices: { label: string; target: string }[] = [];
            
            if (i < count - 1) {
              for (let j = 0; j < 3; j++) {
                const choiceLabels = [
                  ["Continue the journey", "Take a different path", "Wait and observe"],
                  ["Accept this fate", "Fight against it", "Seek another way"],
                  ["Trust your instincts", "Follow the signs", "Ask for guidance"],
                ];
                choices.push({
                  label: choiceLabels[j % choiceLabels.length][i % 3],
                  target: j === 0 ? `node_${i + 1}` : `ending_${j}_${i}`,
                });
              }
            }
            
            generatedNodes.push({
              id: nodeId,
              text: segment.substring(0, 600) + (segment.length > 600 ? "..." : ""),
              choices,
              isEnding: i === count - 1,
              endingType: i === count - 1 ? "good" : undefined,
            });

            if (i < count - 1) {
              for (let j = 1; j < 3; j++) {
                generatedNodes.push({
                  id: `ending_${j}_${i}`,
                  text: `Your choice leads to an unexpected outcome...`,
                  choices: [],
                  isEnding: true,
                  endingType: j === 1 ? "bad" : "neutral",
                });
              }
            }
          }
          
          setNodes(generatedNodes);
          setCurrentNode(generatedNodes[0]?.id || null);
          toast.success(`Auto-generated ${count} branch points with ${generatedNodes.length} nodes!`);
        }, 500);
      } else {
        toast.success("Story imported from Story Forge!");
      }
    }
  }, []);

  useEffect(() => {
    if (project) {
      setTitle(project.title);
      const data = project.data as any;
      if (data?.nodes) setNodes(data.nodes);
      if (data?.storyText) setStoryText(data.storyText);
      if (data?.backgrounds) setBackgrounds(data.backgrounds);
    }
  }, [project]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (projectId) {
        await updateProject.mutateAsync({
          id: projectId,
          data: { title, data: { nodes, storyText, branchPoints, optionsPerBranch, backgrounds } },
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
    setActiveTab("nodes");
    toast.success("CYOA structure generated!");
  };

  const addNode = () => {
    const newNode: CYOANode = {
      id: `node_${Date.now()}`,
      text: "New story segment...",
      choices: [],
    };
    setNodes([...nodes, newNode]);
    setSelectedNodeId(newNode.id);
    setEditingNode(newNode.id);
  };

  const updateNode = (id: string, updates: Partial<CYOANode>) => {
    setNodes(nodes.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  const deleteNode = (id: string) => {
    setNodes(nodes.filter(n => n.id !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
    toast.success("Node deleted");
  };

  const addChoiceToNode = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      updateNode(nodeId, {
        choices: [...node.choices, { label: "New choice", target: nodes[0]?.id || "" }],
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      if (selectedNodeId) {
        updateNode(selectedNodeId, { image: url });
        toast.success("Image added to node");
      } else {
        const newBg: CYOABackground = {
          id: `bg_${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ""),
          url,
        };
        setBackgrounds([...backgrounds, newBg]);
        toast.success("Background added");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleAIGenerated = (url: string) => {
    if (selectedNodeId) {
      updateNode(selectedNodeId, { image: url });
      toast.success("AI image added to node");
    } else {
      const newBg: CYOABackground = {
        id: `bg_${Date.now()}`,
        name: "AI Background",
        url,
      };
      setBackgrounds([...backgrounds, newBg]);
      toast.success("AI background added");
    }
    setShowAIGen(false);
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

  const getCurrentNodeData = () => nodes.find(n => n.id === currentNode);

  if (isCreating) {
    return (
      <Layout>
        <div className="h-screen flex items-center justify-center bg-black">
          <div className="text-center text-white">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-400">Creating CYOA project...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-screen flex flex-col bg-zinc-950 text-white">
        <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 hover:bg-zinc-800" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <div className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              <input 
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="font-display font-bold text-lg bg-transparent border-none outline-none hover:bg-zinc-800 px-2 py-1"
                data-testid="input-cyoa-title"
              />
            </div>
            <span className="text-xs font-mono text-zinc-500">Interactive Fiction Engine</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              data-testid="button-save"
            >
              <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save"}
            </button>
            <button 
              onClick={() => nodes.length > 0 && toast.success("Logic validated!")}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-medium flex items-center gap-2" 
              data-testid="button-validate"
            >
              <AlertCircle className="w-4 h-4" /> Validate
            </button>
            {nodes.length > 0 && (
              <button
                onClick={startPreview}
                className="px-4 py-2 bg-white text-black text-sm font-bold flex items-center gap-2"
                data-testid="button-preview"
              >
                <Play className="w-4 h-4" /> Preview
              </button>
            )}
          </div>
        </header>

        {previewMode ? (
          <div className="flex-1 bg-black text-white p-8 flex flex-col items-center justify-center relative">
            {getCurrentNodeData()?.image && (
              <div className="absolute inset-0">
                <img src={getCurrentNodeData()?.image} className="w-full h-full object-cover opacity-30" />
              </div>
            )}
            <div className="max-w-2xl w-full space-y-8 relative z-10">
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
                  <div className={`p-6 border-2 ${
                    getCurrentNodeData()?.isEnding 
                      ? getCurrentNodeData()?.endingType === "good" 
                        ? "border-green-500 bg-green-500/10" 
                        : getCurrentNodeData()?.endingType === "bad"
                          ? "border-red-500 bg-red-500/10"
                          : "border-yellow-500 bg-yellow-500/10"
                      : "border-white/30 bg-zinc-900/80"
                  }`}>
                    {getCurrentNodeData()?.isEnding && (
                      <div className={`text-xs font-bold uppercase mb-4 ${
                        getCurrentNodeData()?.endingType === "good" ? "text-green-500" :
                        getCurrentNodeData()?.endingType === "bad" ? "text-red-500" : "text-yellow-500"
                      }`}>
                        {getCurrentNodeData()?.endingType?.toUpperCase()} ENDING
                      </div>
                    )}
                    <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap">{getCurrentNodeData()?.text}</p>
                  </div>

                  {getCurrentNodeData()?.choices && getCurrentNodeData()!.choices.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase text-white/50">Choose your path:</h4>
                      {getCurrentNodeData()!.choices.map((choice, i) => (
                        <button
                          key={i}
                          onClick={() => selectChoice(choice.target)}
                          className="w-full p-4 bg-white/5 border-2 border-white/20 text-left hover:bg-white/10 hover:border-white/40 transition-colors flex items-center justify-between group"
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

              <div className="text-xs text-white/30 text-center font-mono">
                Path: {pathHistory.join(" → ")}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            <div className="w-80 border-r border-zinc-800 bg-zinc-900 flex flex-col">
              <div className="border-b border-zinc-800 p-1 flex">
                {(["story", "nodes", "assets"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 text-xs font-bold uppercase ${activeTab === tab ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-4">
                {activeTab === "story" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-zinc-400">Paste Your Story</label>
                      <textarea
                        value={storyText}
                        onChange={(e) => setStoryText(e.target.value)}
                        placeholder="Paste your story text here..."
                        className="w-full h-48 p-3 border border-zinc-700 bg-zinc-800 text-sm font-mono resize-none"
                        data-testid="input-story-text"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-zinc-400">Branch Points</label>
                      <div className="flex gap-1">
                        {[3, 5, 7, 10].map(n => (
                          <button
                            key={n}
                            onClick={() => setBranchPoints(n)}
                            className={`flex-1 py-2 text-sm font-medium border ${
                              branchPoints === n 
                                ? "bg-white text-black border-white" 
                                : "bg-zinc-800 border-zinc-700 hover:border-zinc-500"
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-zinc-400">Choices per Branch</label>
                      <div className="flex gap-1">
                        {[2, 3, 4].map(n => (
                          <button
                            key={n}
                            onClick={() => setOptionsPerBranch(n)}
                            className={`flex-1 py-2 text-sm font-medium border ${
                              optionsPerBranch === n 
                                ? "bg-white text-black border-white" 
                                : "bg-zinc-800 border-zinc-700 hover:border-zinc-500"
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={generateCYOA}
                      disabled={isGenerating || !storyText.trim()}
                      className="w-full py-3 bg-white text-black font-bold uppercase disabled:opacity-50 flex items-center justify-center gap-2"
                      data-testid="button-generate-cyoa"
                    >
                      {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <GitBranch className="w-5 h-5" />}
                      Generate CYOA
                    </button>
                  </>
                )}

                {activeTab === "nodes" && (
                  <>
                    <button
                      onClick={addNode}
                      className="w-full p-3 border border-dashed border-zinc-700 hover:border-white text-sm flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add Node
                    </button>
                    {nodes.filter(n => !n.id.startsWith("ending")).map((node, idx) => (
                      <div
                        key={node.id}
                        onClick={() => setSelectedNodeId(node.id)}
                        className={`p-3 border cursor-pointer group ${
                          selectedNodeId === node.id 
                            ? "bg-white text-black border-white" 
                            : node.isEnding 
                              ? "border-green-500 bg-green-500/10" 
                              : "border-zinc-700 hover:border-zinc-500"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs">
                            {node.isEnding ? "ENDING" : `NODE ${idx + 1}`}
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingNode(node.id); }}
                              className={`p-1 ${selectedNodeId === node.id ? "hover:text-zinc-600" : "hover:text-white"}`}
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                              className={`p-1 ${selectedNodeId === node.id ? "hover:text-red-600" : "hover:text-red-500"}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <p className={`text-xs line-clamp-2 ${selectedNodeId === node.id ? "text-zinc-600" : "text-zinc-400"}`}>
                          {node.text}
                        </p>
                        <div className={`mt-2 text-[10px] ${selectedNodeId === node.id ? "text-zinc-500" : "text-zinc-600"}`}>
                          {node.choices.length} choices
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {activeTab === "assets" && (
                  <>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setSelectedNodeId(null); imageInputRef.current?.click(); }}
                        className="flex-1 p-2 bg-zinc-800 text-xs flex items-center justify-center gap-1 hover:bg-zinc-700"
                      >
                        <Upload className="w-3 h-3" /> Import
                      </button>
                      <button
                        onClick={() => { setSelectedNodeId(null); setShowAIGen(true); }}
                        className="flex-1 p-2 bg-white text-black text-xs flex items-center justify-center gap-1"
                      >
                        <Wand2 className="w-3 h-3" /> AI Gen
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {backgrounds.map(bg => (
                        <div key={bg.id} className="aspect-video bg-zinc-800 overflow-hidden border border-zinc-700">
                          <img src={bg.url} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                    {backgrounds.length === 0 && (
                      <div className="text-center py-8 text-zinc-500">
                        <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-xs">No assets yet. Import or generate some.</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {nodes.length > 0 && (
                <div className="border-t border-zinc-800 p-4 space-y-2">
                  <div className="grid grid-cols-4 gap-1">
                    {["cyoa", "json", "txt"].map(format => (
                      <button
                        key={format}
                        onClick={() => exportCYOA(format as any)}
                        className="p-2 bg-zinc-800 text-[10px] font-bold uppercase hover:bg-zinc-700"
                      >
                        {format}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify({ title, nodes }, null, 2));
                        toast.success("Copied!");
                      }}
                      className="p-2 bg-zinc-800 text-[10px] font-bold uppercase hover:bg-zinc-700"
                    >
                      <Copy className="w-3 h-3 mx-auto" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 bg-zinc-950 relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03]" 
                   style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "30px 30px" }} 
              />

              {editingNode ? (
                <div className="absolute inset-0 p-8 overflow-auto">
                  {(() => {
                    const node = nodes.find(n => n.id === editingNode);
                    if (!node) return null;
                    return (
                      <div className="max-w-2xl mx-auto space-y-6">
                        <div className="flex justify-between items-center">
                          <h3 className="font-bold text-lg">Edit Node</h3>
                          <button
                            onClick={() => setEditingNode(null)}
                            className="p-2 hover:bg-zinc-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase text-zinc-400">Node Text</label>
                          <textarea
                            value={node.text}
                            onChange={(e) => updateNode(node.id, { text: e.target.value })}
                            className="w-full h-48 p-3 border border-zinc-700 bg-zinc-800 text-sm font-mono resize-none"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase text-zinc-400">Node Image</label>
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setSelectedNodeId(node.id); imageInputRef.current?.click(); }}
                              className="flex-1 p-3 bg-zinc-800 text-sm flex items-center justify-center gap-2 hover:bg-zinc-700"
                            >
                              <Upload className="w-4 h-4" /> Upload
                            </button>
                            <button
                              onClick={() => { setSelectedNodeId(node.id); setShowAIGen(true); }}
                              className="flex-1 p-3 bg-white text-black text-sm flex items-center justify-center gap-2"
                            >
                              <Wand2 className="w-4 h-4" /> AI Generate
                            </button>
                          </div>
                          {node.image && (
                            <div className="aspect-video bg-zinc-800 overflow-hidden">
                              <img src={node.image} className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold uppercase text-zinc-400">Choices</label>
                            <button
                              onClick={() => addChoiceToNode(node.id)}
                              className="p-1 bg-white text-black text-xs flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Add
                            </button>
                          </div>
                          {node.choices.map((choice, i) => (
                            <div key={i} className="flex gap-2">
                              <input
                                value={choice.label}
                                onChange={(e) => {
                                  const newChoices = [...node.choices];
                                  newChoices[i] = { ...choice, label: e.target.value };
                                  updateNode(node.id, { choices: newChoices });
                                }}
                                className="flex-1 p-2 border border-zinc-700 bg-zinc-800 text-sm"
                                placeholder="Choice text"
                              />
                              <select
                                value={choice.target}
                                onChange={(e) => {
                                  const newChoices = [...node.choices];
                                  newChoices[i] = { ...choice, target: e.target.value };
                                  updateNode(node.id, { choices: newChoices });
                                }}
                                className="w-40 p-2 border border-zinc-700 bg-zinc-800 text-sm"
                              >
                                {nodes.map(n => (
                                  <option key={n.id} value={n.id}>{n.id}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => {
                                  updateNode(node.id, { choices: node.choices.filter((_, j) => j !== i) });
                                }}
                                className="p-2 hover:text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={node.isEnding || false}
                              onChange={(e) => updateNode(node.id, { isEnding: e.target.checked })}
                              className="w-4 h-4"
                            />
                            <span className="text-sm">Is Ending</span>
                          </label>
                          {node.isEnding && (
                            <select
                              value={node.endingType || "neutral"}
                              onChange={(e) => updateNode(node.id, { endingType: e.target.value as any })}
                              className="p-2 border border-zinc-700 bg-zinc-800 text-sm"
                            >
                              <option value="good">Good Ending</option>
                              <option value="bad">Bad Ending</option>
                              <option value="neutral">Neutral Ending</option>
                            </select>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : nodes.length > 0 ? (
                <div className="absolute inset-0 p-8 overflow-auto">
                  <div className="flex flex-wrap gap-4">
                    {nodes.filter(n => !n.id.startsWith("ending")).map((node, index) => (
                      <div 
                        key={node.id} 
                        className={`w-72 p-4 bg-zinc-900 border-2 shadow-lg cursor-pointer ${
                          node.isEnding ? "border-green-500" : "border-white/30"
                        } ${selectedNodeId === node.id ? "ring-2 ring-white" : ""}`}
                        onClick={() => setSelectedNodeId(node.id)}
                        onDoubleClick={() => setEditingNode(node.id)}
                      >
                        <div className="flex justify-between mb-2">
                          <span className="font-bold text-xs uppercase">{node.isEnding ? "ENDING" : `Scene ${index + 1}`}</span>
                          <span className="text-[10px] text-zinc-500">{node.id}</span>
                        </div>
                        {node.image && (
                          <div className="aspect-video bg-zinc-800 overflow-hidden mb-2">
                            <img src={node.image} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <p className="text-xs font-mono text-zinc-400 line-clamp-3">{node.text}</p>
                        {node.choices.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-zinc-700 space-y-1">
                            {node.choices.map((choice, i) => (
                              <div key={i} className="text-[10px] text-zinc-500 flex items-center gap-1">
                                <LinkIcon className="w-2 h-2" />
                                {choice.label} → {choice.target}
                              </div>
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
                    <GitBranch className="w-16 h-16 mx-auto text-zinc-700" />
                    <p className="text-sm text-zinc-500">Generate a CYOA to see the branch structure</p>
                    <p className="text-xs text-zinc-600">Paste a story and click Generate</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

        {showAIGen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-zinc-700 p-6 w-[500px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Wand2 className="w-5 h-5" /> AI Generate Image
                </h3>
                <button onClick={() => setShowAIGen(false)} className="p-2 hover:bg-zinc-800">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <AIGenerator type="cyoa" onImageGenerated={handleAIGenerated} />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
