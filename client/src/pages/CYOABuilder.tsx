import { Layout } from "@/components/layout/Layout";
import { 
  Save, Download, GitBranch, Plus, AlertCircle, Link as LinkIcon,
  ArrowLeft, Play, Copy, RefreshCw, ChevronRight, Trash2, Image as ImageIcon,
  Upload, Wand2, X, Edit, Search, Maximize2, Minimize2, Map
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { AIGenerator } from "@/components/tools/AIGenerator";
import { useProject, useUpdateProject, useCreateProject } from "@/hooks/useProjects";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";

type NodeColor = "default" | "blue" | "green" | "red" | "yellow" | "purple";

interface CYOANode {
  id: string;
  title?: string;
  text: string;
  choices: { label: string; target: string }[];
  isEnding?: boolean;
  endingType?: "good" | "bad" | "neutral";
  image?: string;
  color?: NodeColor;
}

interface CYOABackground {
  id: string;
  name: string;
  url: string;
}

const NODE_COLORS: Record<NodeColor, { bg: string; border: string; label: string }> = {
  default: { bg: "bg-zinc-900", border: "border-white/30", label: "Default" },
  blue: { bg: "bg-blue-950", border: "border-blue-500", label: "Info" },
  green: { bg: "bg-green-950", border: "border-green-500", label: "Success" },
  red: { bg: "bg-red-950", border: "border-red-500", label: "Danger" },
  yellow: { bg: "bg-yellow-950", border: "border-yellow-500", label: "Warning" },
  purple: { bg: "bg-purple-950", border: "border-purple-500", label: "Special" },
};

const NODE_CARD_W = 280;
const NODE_CARD_H = 200;
const NODE_GAP_X = 60;
const NODE_GAP_Y = 40;
const COLS = 4;

function TypewriterText({ text, speed = 30, onComplete }: { text: string; speed?: number; onComplete?: () => void }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;

    if (speed <= 0) {
      setDisplayed(text);
      setDone(true);
      onComplete?.();
      return;
    }

    const interval = setInterval(() => {
      i++;
      if (i >= text.length) {
        setDisplayed(text);
        setDone(true);
        onComplete?.();
        clearInterval(interval);
      } else {
        setDisplayed(text.slice(0, i));
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {!done && <span className="animate-pulse">|</span>}
    </span>
  );
}

function NodeGraph({ nodes, selectedNodeId, onSelectNode, onEditNode }: {
  nodes: CYOANode[];
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
  onEditNode: (id: string) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const mainNodes = nodes.filter(n => !n.id.startsWith("ending"));
  
  const nodePositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    mainNodes.forEach((node, idx) => {
      const col = idx % COLS;
      const row = Math.floor(idx / COLS);
      positions[node.id] = {
        x: col * (NODE_CARD_W + NODE_GAP_X) + 20,
        y: row * (NODE_CARD_H + NODE_GAP_Y) + 20,
      };
    });
    
    let endingIdx = 0;
    nodes.filter(n => n.id.startsWith("ending")).forEach(node => {
      const col = endingIdx % COLS;
      const row = Math.ceil(mainNodes.length / COLS) + Math.floor(endingIdx / COLS);
      positions[node.id] = {
        x: col * (NODE_CARD_W + NODE_GAP_X) + 20,
        y: row * (NODE_CARD_H + NODE_GAP_Y) + 20,
      };
      endingIdx++;
    });

    return positions;
  }, [nodes]);

  const connections = useMemo(() => {
    const lines: { from: string; to: string; label: string }[] = [];
    nodes.forEach(node => {
      node.choices.forEach(choice => {
        if (nodePositions[node.id] && nodePositions[choice.target]) {
          lines.push({ from: node.id, to: choice.target, label: choice.label });
        }
      });
    });
    return lines;
  }, [nodes, nodePositions]);

  const maxX = Math.max(...Object.values(nodePositions).map(p => p.x + NODE_CARD_W + 40), 800);
  const maxY = Math.max(...Object.values(nodePositions).map(p => p.y + NODE_CARD_H + 40), 600);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-auto">
      <div className="relative" style={{ width: maxX, height: maxY, minWidth: "100%", minHeight: "100%" }}>
        <svg
          ref={svgRef}
          className="absolute inset-0 pointer-events-none"
          style={{ width: maxX, height: maxY }}
        >
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="rgba(255,255,255,0.3)" />
            </marker>
          </defs>
          {connections.map((conn, i) => {
            const fromPos = nodePositions[conn.from];
            const toPos = nodePositions[conn.to];
            if (!fromPos || !toPos) return null;

            const fromX = fromPos.x + NODE_CARD_W / 2;
            const fromY = fromPos.y + NODE_CARD_H;
            const toX = toPos.x + NODE_CARD_W / 2;
            const toY = toPos.y;

            const midY = (fromY + toY) / 2;

            return (
              <g key={i}>
                <path
                  d={`M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`}
                  fill="none"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
              </g>
            );
          })}
        </svg>

        {nodes.map((node) => {
          const pos = nodePositions[node.id];
          if (!pos) return null;
          const colorScheme = NODE_COLORS[node.color || (node.isEnding ? "green" : "default")];

          return (
            <div
              key={node.id}
              className={`absolute p-3 border-2 shadow-lg cursor-pointer transition-all hover:shadow-xl ${colorScheme.bg} ${
                node.isEnding ? "border-green-500" : colorScheme.border
              } ${selectedNodeId === node.id ? "ring-2 ring-white ring-offset-1 ring-offset-zinc-950" : ""}`}
              style={{ left: pos.x, top: pos.y, width: NODE_CARD_W, height: NODE_CARD_H }}
              onClick={() => onSelectNode(node.id)}
              onDoubleClick={() => onEditNode(node.id)}
            >
              {node.image && (
                <div className="absolute inset-0 opacity-20 overflow-hidden">
                  <img src={node.image} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="relative z-10 h-full flex flex-col">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-xs uppercase truncate flex-1">
                    {node.title || (node.isEnding ? "ENDING" : node.id)}
                  </span>
                  <span className="text-[9px] text-zinc-500 ml-1 flex-shrink-0">{node.id}</span>
                </div>
                <p className="text-[11px] font-mono text-zinc-400 line-clamp-4 flex-1">{node.text}</p>
                {node.choices.length > 0 && (
                  <div className="mt-auto pt-2 border-t border-zinc-700/50 space-y-0.5">
                    {node.choices.slice(0, 3).map((choice, i) => (
                      <div key={i} className="text-[9px] text-zinc-500 flex items-center gap-1 truncate">
                        <LinkIcon className="w-2 h-2 flex-shrink-0" />
                        <span className="truncate">{choice.label}</span>
                      </div>
                    ))}
                    {node.choices.length > 3 && (
                      <div className="text-[9px] text-zinc-600">+{node.choices.length - 3} more</div>
                    )}
                  </div>
                )}
                {node.isEnding && (
                  <div className={`text-[9px] font-bold uppercase mt-1 ${
                    node.endingType === "good" ? "text-green-400" : node.endingType === "bad" ? "text-red-400" : "text-yellow-400"
                  }`}>
                    {node.endingType || "neutral"} ending
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CYOABuilder() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const projectId = searchParams.get('id');
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const effectiveProjectId = projectId || createdProjectId;
  
  const { data: project } = useProject(effectiveProjectId || '');
  const updateProject = useUpdateProject();
  const createProject = useCreateProject();

  const [title, setTitle] = useState("Untitled CYOA");
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(!effectiveProjectId);
  const creationAttempted = useRef(false);
  const [storyText, setStoryText] = useState("");
  const [branchPoints, setBranchPoints] = useState(5);
  const [optionsPerBranch, setOptionsPerBranch] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [nodes, setNodes] = useState<CYOANode[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);
  const [currentNode, setCurrentNode] = useState<string | null>(null);
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [backgrounds, setBackgrounds] = useState<CYOABackground[]>([]);
  const [showAIGen, setShowAIGen] = useState(false);
  const [activeTab, setActiveTab] = useState<"story" | "nodes" | "assets">("story");
  const [viewMode, setViewMode] = useState<"cards" | "graph">("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [typewriterDone, setTypewriterDone] = useState(false);
  const [textSpeed, setTextSpeed] = useState(30);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [endingsFound, setEndingsFound] = useState<Set<string>>(new Set());

  const imageInputRef = useRef<HTMLInputElement>(null);
  const autoSaveInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingSaveRef = useRef(false);
  const initialLoadDoneRef = useRef(false);
  const latestDataRef = useRef({ title, nodes, storyText, branchPoints, optionsPerBranch, backgrounds, projectId: effectiveProjectId });
  latestDataRef.current = { title, nodes, storyText, branchPoints, optionsPerBranch, backgrounds, projectId: effectiveProjectId };

  const fireXpAction = (action: string) => {
    fetch("/api/xp/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
      credentials: "include",
    });
  };

  const stats = useMemo(() => {
    const wordCount = nodes.reduce((sum, n) => sum + n.text.split(/\s+/).filter(Boolean).length, 0);
    const endingCount = nodes.filter(n => n.isEnding).length;
    const choiceCount = nodes.reduce((sum, n) => sum + n.choices.length, 0);
    return { nodeCount: nodes.length, wordCount, endingCount, choiceCount };
  }, [nodes]);

  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return nodes;
    const q = searchQuery.toLowerCase();
    return nodes.filter(n => 
      n.text.toLowerCase().includes(q) || 
      n.id.toLowerCase().includes(q) || 
      (n.title || "").toLowerCase().includes(q) ||
      n.choices.some(c => c.label.toLowerCase().includes(q))
    );
  }, [nodes, searchQuery]);

  useEffect(() => {
    if (effectiveProjectId && nodes.length > 0) {
      autoSaveInterval.current = setInterval(() => {
        if (!pendingSaveRef.current) return;
        updateProject.mutateAsync({
          id: effectiveProjectId,
          data: { title, data: { nodes, storyText, branchPoints, optionsPerBranch, backgrounds } },
        }).then(() => {
          pendingSaveRef.current = false;
        }).catch(() => {});
      }, 30000);
    }
    return () => {
      if (autoSaveInterval.current) clearInterval(autoSaveInterval.current);
    };
  }, [effectiveProjectId, nodes, title, storyText, branchPoints, optionsPerBranch, backgrounds]);

  useEffect(() => {
    if (projectId) {
      setIsCreating(false);
      return;
    }
    if (creationAttempted.current) return;

    creationAttempted.current = true;
    setIsCreating(true);

    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      setIsCreating(false);
      toast.error("Project creation timed out");
    }, 15000);

    fetch("/api/projects?fields=meta", { credentials: "include" })
      .then(res => res.ok ? res.json() : Promise.reject(new Error("Failed")))
      .then((allProjects: any[]) => {
        if (cancelled) return;
        const existing = allProjects
          .filter((p: any) => p.type === "cyoa")
          .sort((a: any, b: any) => {
            const aHasData = a.updatedAt !== a.createdAt;
            const bHasData = b.updatedAt !== b.createdAt;
            if (aHasData && !bHasData) return -1;
            if (!aHasData && bHasData) return 1;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          });
        if (existing.length > 0) {
          clearTimeout(timeoutId);
          setCreatedProjectId(existing[0].id);
          setIsCreating(false);
          navigate(`/creator/cyoa?id=${existing[0].id}`, { replace: true });
          return;
        }
        return createProject.mutateAsync({
          title: "Untitled CYOA",
          type: "cyoa",
          status: "draft",
          data: { nodes: [], storyText: "", branchPoints: 5, optionsPerBranch: 3, backgrounds: [] },
        }).then((newProject) => {
          if (cancelled) return;
          clearTimeout(timeoutId);
          setCreatedProjectId(newProject.id);
          setIsCreating(false);
          navigate(`/creator/cyoa?id=${newProject.id}`, { replace: true });
        });
      }).catch((err) => {
        if (cancelled) return;
        clearTimeout(timeoutId);
        toast.error(err?.message || "Failed to create project");
        setIsCreating(false);
        creationAttempted.current = false;
      });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [projectId]);

  useEffect(() => {
    if (project) {
      setTitle(project.title);
      const data = project.data as any;
      if (data?.nodes) setNodes(data.nodes);
      if (data?.storyText) setStoryText(data.storyText);
      if (data?.branchPoints) setBranchPoints(data.branchPoints);
      if (data?.optionsPerBranch) setOptionsPerBranch(data.optionsPerBranch);
      if (data?.backgrounds) setBackgrounds(data.backgrounds);
      initialLoadDoneRef.current = true;
    }
  }, [project]);

  useEffect(() => {
    if (!effectiveProjectId || !initialLoadDoneRef.current) return;
    pendingSaveRef.current = true;
  }, [nodes, title, storyText, branchPoints, optionsPerBranch, backgrounds, effectiveProjectId]);

  useEffect(() => {
    return () => {
      if (pendingSaveRef.current) {
        const d = latestDataRef.current;
        if (d.projectId) {
          navigator.sendBeacon(
            `/api/projects/${d.projectId}/autosave`,
            new Blob([JSON.stringify({ title: d.title, data: { nodes: d.nodes, storyText: d.storyText, branchPoints: d.branchPoints, optionsPerBranch: d.optionsPerBranch, backgrounds: d.backgrounds } })], { type: "application/json" })
          );
        }
      }
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingSaveRef.current) {
        const d = latestDataRef.current;
        if (d.projectId) {
          navigator.sendBeacon(
            `/api/projects/${d.projectId}/autosave`,
            new Blob([JSON.stringify({ title: d.title, data: { nodes: d.nodes, storyText: d.storyText, branchPoints: d.branchPoints, optionsPerBranch: d.optionsPerBranch, backgrounds: d.backgrounds } })], { type: "application/json" })
          );
        }
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (!previewMode) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        exitPreview();
      } else if (e.key === " " || e.key === "Enter") {
        if (!typewriterDone) {
          setTextSpeed(0);
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [previewMode, typewriterDone]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (effectiveProjectId) {
        await updateProject.mutateAsync({
          id: effectiveProjectId,
          data: { title, data: { nodes, storyText, branchPoints, optionsPerBranch, backgrounds } },
        });
      }
      pendingSaveRef.current = false;
      fireXpAction("save");
      toast.success("Project saved");
    } catch (error: any) {
      toast.error(error?.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const validateCYOA = () => {
    if (nodes.length === 0) {
      toast.error("No nodes to validate");
      return;
    }

    const issues: string[] = [];
    const nodeIds = new Set(nodes.map(n => n.id));

    nodes.forEach(node => {
      node.choices.forEach(choice => {
        if (!nodeIds.has(choice.target)) {
          issues.push(`Broken link: "${choice.label}" in ${node.id} points to non-existent node "${choice.target}"`);
        }
      });
    });

    if (nodes.length > 0) {
      const reachable = new Set<string>();
      const queue = [nodes[0].id];
      reachable.add(nodes[0].id);
      while (queue.length > 0) {
        const current = queue.shift()!;
        const currentNode = nodes.find(n => n.id === current);
        if (currentNode) {
          currentNode.choices.forEach(choice => {
            if (nodeIds.has(choice.target) && !reachable.has(choice.target)) {
              reachable.add(choice.target);
              queue.push(choice.target);
            }
          });
        }
      }
      nodes.forEach(node => {
        if (!reachable.has(node.id)) {
          issues.push(`Orphan node: "${node.id}" is not reachable from the start node`);
        }
      });
    }

    nodes.forEach(node => {
      if (!node.isEnding && node.choices.length === 0) {
        issues.push(`Dead end: "${node.id}" has no choices and is not marked as an ending`);
      }
    });

    if (issues.length === 0) {
      toast.success("Validation passed! No issues found.");
    } else {
      issues.forEach(issue => toast.error(issue, { duration: 5000 }));
      toast.warning(`Found ${issues.length} issue(s)`);
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
        title: `Chapter ${i + 1}`,
        text: segment.substring(0, 2000) + (segment.length > 2000 ? "..." : ""),
        choices,
        isEnding: i === branchPoints - 1,
        endingType: i === branchPoints - 1 ? "good" : undefined,
        color: i === 0 ? "blue" : i === branchPoints - 1 ? "green" : "default",
      });

      if (i < branchPoints - 1) {
        for (let j = 1; j < optionsPerBranch; j++) {
          generatedNodes.push({
            id: `ending_${j}_${i}`,
            title: `Alternate Ending ${j}`,
            text: `Your choice leads to an unexpected outcome. The path diverges here, revealing a different fate...`,
            choices: [],
            isEnding: true,
            endingType: j === 1 ? "bad" : "neutral",
            color: j === 1 ? "red" : "yellow",
          });
        }
      }
    }

    setNodes(generatedNodes);
    setIsGenerating(false);
    setActiveTab("nodes");
    fireXpAction("generate");
    toast.success("CYOA structure generated!");
  };

  const addNode = () => {
    const newNode: CYOANode = {
      id: `node_${Date.now()}`,
      title: "New Scene",
      text: "New story segment...",
      choices: [],
      color: "default",
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
    if (editingNode === id) setEditingNode(null);
    toast.success("Node deleted");
  };

  const duplicateNode = (id: string) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    const dup: CYOANode = {
      ...JSON.parse(JSON.stringify(node)),
      id: `node_${Date.now()}`,
      title: `${node.title || node.id} (Copy)`,
    };
    setNodes([...nodes, dup]);
    toast.success("Node duplicated");
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

  const startPreview = (fromNodeId?: string) => {
    if (nodes.length === 0) {
      toast.error("Generate CYOA first");
      return;
    }
    const startId = fromNodeId || nodes[0].id;
    setPreviewMode(true);
    setCurrentNode(startId);
    setPathHistory([startId]);
    setTypewriterDone(false);
    setTextSpeed(30);
    if (!fromNodeId) setEndingsFound(new Set());
  };

  const selectChoice = (targetId: string) => {
    setCurrentNode(targetId);
    setPathHistory([...pathHistory, targetId]);
    setTypewriterDone(false);
    setTextSpeed(30);
    const targetNode = nodes.find(n => n.id === targetId);
    if (targetNode?.isEnding) {
      setEndingsFound(prev => { const s = new Set(Array.from(prev)); s.add(targetId); return s; });
    }
  };

  const goBack = () => {
    if (pathHistory.length > 1) {
      const newHistory = pathHistory.slice(0, -1);
      setPathHistory(newHistory);
      setCurrentNode(newHistory[newHistory.length - 1]);
      setTypewriterDone(false);
      setTextSpeed(30);
    }
  };

  const exitPreview = () => {
    setPreviewMode(false);
    setIsFullscreenPreview(false);
    setCurrentNode(null);
    setPathHistory([]);
  };

  const exportCYOA = (format: "cyoa" | "json" | "txt" | "html") => {
    let data: string;
    let mimeType = "text/plain";

    if (format === "html") {
      mimeType = "text/html";
      data = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#0a0a0a;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center}
.container{max-width:720px;width:100%;padding:2rem;position:relative}
h1{font-size:1.8rem;margin-bottom:2rem;text-align:center;letter-spacing:-0.02em}
.node-img{width:100%;aspect-ratio:16/9;object-fit:cover;margin-bottom:1.5rem;border:2px solid #3f3f46}
.node-title{font-size:1.1rem;font-weight:bold;margin-bottom:0.8rem;text-transform:uppercase;letter-spacing:0.05em;color:rgba(255,255,255,0.9)}
.node-text{background:#18181b;border:2px solid #3f3f46;padding:1.5rem;margin-bottom:1.5rem;white-space:pre-wrap;line-height:1.7;font-size:0.95rem}
.ending{text-transform:uppercase;font-weight:bold;font-size:0.8rem;margin-bottom:1rem;padding:0.5rem 1rem;display:inline-block}
.ending.good{color:#22c55e;border:1px solid #22c55e}.ending.bad{color:#ef4444;border:1px solid #ef4444}.ending.neutral{color:#eab308;border:1px solid #eab308}
.choice{display:block;width:100%;padding:1.2rem;background:rgba(255,255,255,0.05);border:2px solid rgba(255,255,255,0.2);color:#fff;text-align:left;cursor:pointer;margin-bottom:0.5rem;font-size:0.95rem;transition:all 0.2s}
.choice:hover{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.5);transform:translateX(4px)}
.restart{display:block;width:100%;padding:1rem;background:#fff;color:#000;border:none;font-weight:bold;text-transform:uppercase;cursor:pointer;font-size:1rem;margin-top:1.5rem;letter-spacing:0.05em}
.restart:hover{background:#e4e4e7}
.path{text-align:center;font-size:0.7rem;color:rgba(255,255,255,0.25);margin-top:2rem;font-family:monospace}
.tracker{text-align:center;font-size:0.75rem;color:rgba(255,255,255,0.3);margin-top:0.5rem}
.back-btn{position:fixed;top:1rem;left:1rem;padding:0.5rem 1rem;background:rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.2);color:#fff;cursor:pointer;font-size:0.75rem;z-index:10}
.back-btn:hover{background:rgba(255,255,255,0.1)}
</style>
</head>
<body>
<div class="container">
<h1>${title}</h1>
<div id="story"></div>
<div id="path" class="path"></div>
<div id="tracker" class="tracker"></div>
</div>
<button class="back-btn" onclick="goBack()" id="back-btn" style="display:none">← Back</button>
<script>
const nodes=${JSON.stringify(nodes)};
const startId=nodes.length>0?nodes[0].id:null;
let history=[];
const endingsFound=new Set();
const totalEndings=nodes.filter(n=>n.isEnding).length;
function showNode(id){
const node=nodes.find(n=>n.id===id);
if(!node){document.getElementById('story').innerHTML='<p>Node not found.</p>';return;}
history.push(id);
document.getElementById('back-btn').style.display=history.length>1?'block':'none';
let html='';
if(node.image){html+='<img class="node-img" src="'+node.image+'" alt="">';}
if(node.isEnding){
endingsFound.add(id);
html+='<div class="ending '+(node.endingType||'neutral')+'">'+(node.endingType||'neutral').toUpperCase()+' ENDING</div>';
}
if(node.title){html+='<div class="node-title">'+node.title.replace(/</g,'&lt;')+'</div>';}
html+='<div class="node-text">'+node.text.replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</div>';
if(node.choices&&node.choices.length>0){
html+='<div><div style="font-size:0.7rem;text-transform:uppercase;color:rgba(255,255,255,0.5);margin-bottom:0.5rem;font-weight:bold">Choose your path:</div>';
node.choices.forEach(function(c){html+='<button class="choice" onclick="showNode(\\''+c.target+'\\')">'+c.label.replace(/</g,'&lt;')+'</button>';});
html+='</div>';
}
if(node.isEnding){html+='<button class="restart" onclick="history=[];endingsFound.clear();showNode(\\''+startId+'\\')">Restart Story</button>';}
document.getElementById('story').innerHTML=html;
document.getElementById('path').textContent='Path: '+history.join(' → ');
document.getElementById('tracker').textContent='Endings discovered: '+endingsFound.size+' / '+totalEndings;
window.scrollTo(0,0);
}
function goBack(){if(history.length>1){history.pop();showNode(history.pop());}}
if(startId)showNode(startId);
</script>
</body>
</html>`;
    } else if (format === "txt") {
      data = nodes.map(n => `[${n.id}]${n.title ? ' - ' + n.title : ''}\n${n.text}\n${n.choices.map(c => `> ${c.label} -> ${c.target}`).join("\n")}`).join("\n\n---\n\n");
    } else {
      data = JSON.stringify({ title, nodes, metadata: { branchPoints, optionsPerBranch } }, null, 2);
    }
    
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    fireXpAction("export");
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

  const totalEndings = nodes.filter(n => n.isEnding).length;

  const previewContent = (
    <div className={`flex-1 text-white flex flex-col items-center justify-center relative ${isFullscreenPreview ? "fixed inset-0 z-50 bg-black" : "bg-black"}`}>
      {getCurrentNodeData()?.image && (
        <div className="absolute inset-0">
          <img src={getCurrentNodeData()?.image} className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        </div>
      )}
      <div className="max-w-2xl w-full space-y-6 relative z-10 p-8">
        <div className="flex justify-between items-center">
          <h2 className="font-display font-bold text-xl">Interactive Preview</h2>
          <div className="flex gap-2">
            <button
              onClick={goBack}
              disabled={pathHistory.length <= 1}
              className="px-3 py-1 bg-white/10 text-sm disabled:opacity-30 hover:bg-white/20"
            >
              ← Back
            </button>
            <button
              onClick={() => setIsFullscreenPreview(!isFullscreenPreview)}
              className="px-3 py-1 bg-white/10 text-sm hover:bg-white/20"
            >
              {isFullscreenPreview ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={exitPreview}
              className="px-3 py-1 bg-white/10 text-sm hover:bg-white/20"
            >
              Exit Preview
            </button>
          </div>
        </div>

        {totalEndings > 0 && (
          <div className="text-xs text-white/40 font-mono text-center">
            Endings discovered: {endingsFound.size} / {totalEndings}
          </div>
        )}

        {getCurrentNodeData() && (
          <div className="space-y-6">
            {getCurrentNodeData()?.image && (
              <div className="aspect-video overflow-hidden border border-white/10">
                <img src={getCurrentNodeData()?.image} className="w-full h-full object-cover" />
              </div>
            )}

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
              {getCurrentNodeData()?.title && (
                <h3 className="font-display font-bold text-lg mb-3">{getCurrentNodeData()?.title}</h3>
              )}
              <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
                <TypewriterText 
                  text={getCurrentNodeData()?.text || ""}
                  speed={textSpeed}
                  onComplete={() => setTypewriterDone(true)}
                />
              </div>
            </div>

            {typewriterDone && getCurrentNodeData()?.choices && getCurrentNodeData()!.choices.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-white/50">Choose your path:</h4>
                {getCurrentNodeData()!.choices.map((choice, i) => (
                  <button
                    key={i}
                    onClick={() => selectChoice(choice.target)}
                    className="w-full p-4 bg-white/5 border-2 border-white/20 text-left hover:bg-white/10 hover:border-white/40 transition-all hover:translate-x-1 flex items-center justify-between group"
                    data-testid={`button-choice-${i}`}
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
                  setTypewriterDone(false);
                  setTextSpeed(30);
                }}
                className="w-full p-4 bg-white text-black font-bold uppercase hover:bg-zinc-200 transition-colors"
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
  );

  if (isFullscreenPreview && previewMode) {
    return previewContent;
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
            {stats.nodeCount > 0 && (
              <span className="text-[10px] font-mono text-zinc-600 hidden md:flex items-center gap-2">
                <span>{stats.nodeCount} nodes</span>
                <span>•</span>
                <span>{stats.wordCount} words</span>
                <span>•</span>
                <span>{stats.endingCount} endings</span>
                <span>•</span>
                <span>{stats.choiceCount} choices</span>
              </span>
            )}
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
              onClick={validateCYOA}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-medium flex items-center gap-2" 
              data-testid="button-validate"
            >
              <AlertCircle className="w-4 h-4" /> Validate
            </button>
            {nodes.length > 0 && (
              <button
                onClick={() => startPreview()}
                className="px-4 py-2 bg-white text-black text-sm font-bold flex items-center gap-2"
                data-testid="button-preview"
              >
                <Play className="w-4 h-4" /> Preview
              </button>
            )}
          </div>
        </header>

        {previewMode ? previewContent : (
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
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search nodes..."
                          className="w-full pl-7 pr-2 py-1.5 bg-zinc-800 border border-zinc-700 text-xs"
                          data-testid="input-search-nodes"
                        />
                      </div>
                      <button
                        onClick={addNode}
                        className="p-1.5 bg-white text-black"
                        data-testid="button-add-node"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {filteredNodes.filter(n => !n.id.startsWith("ending")).map((node, idx) => (
                      <div
                        key={node.id}
                        onClick={() => { setSelectedNodeId(node.id); setEditingNode(node.id); }}
                        className={`p-3 border cursor-pointer group ${
                          selectedNodeId === node.id 
                            ? "bg-white text-black border-white" 
                            : node.isEnding 
                              ? "border-green-500 bg-green-500/10" 
                              : `${NODE_COLORS[node.color || "default"].border} ${NODE_COLORS[node.color || "default"].bg}`
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs truncate flex-1">
                            {node.title || (node.isEnding ? "ENDING" : `NODE ${idx + 1}`)}
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                            <button
                              onClick={(e) => { e.stopPropagation(); startPreview(node.id); }}
                              className={`p-1 ${selectedNodeId === node.id ? "hover:text-zinc-600" : "hover:text-green-400"}`}
                              title="Play from here"
                            >
                              <Play className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); duplicateNode(node.id); }}
                              className={`p-1 ${selectedNodeId === node.id ? "hover:text-zinc-600" : "hover:text-blue-400"}`}
                            >
                              <Copy className="w-3 h-3" />
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
                    {filteredNodes.length === 0 && searchQuery && (
                      <div className="text-center py-4 text-zinc-500 text-xs">
                        No nodes match "{searchQuery}"
                      </div>
                    )}
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
                  <div className="relative">
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="w-full p-2 bg-zinc-800 text-xs font-bold uppercase hover:bg-zinc-700 flex items-center justify-center gap-2"
                    >
                      <Download className="w-3 h-3" /> Export
                    </button>
                    {showExportMenu && (
                      <div className="absolute bottom-full left-0 right-0 mb-1 bg-zinc-800 border border-zinc-700 z-50">
                        {["cyoa", "json", "txt", "html"].map(format => (
                          <button
                            key={format}
                            onClick={() => { exportCYOA(format as any); setShowExportMenu(false); }}
                            className="w-full px-3 py-2 text-left text-xs hover:bg-zinc-700 uppercase font-bold"
                          >
                            {format === "html" ? "Playable HTML" : format === "cyoa" ? "CYOA Bundle" : format.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify({ title, nodes }, null, 2));
                      toast.success("Copied!");
                    }}
                    className="w-full p-2 bg-zinc-800 text-xs font-bold uppercase hover:bg-zinc-700 flex items-center justify-center gap-2"
                  >
                    <Copy className="w-3 h-3" /> Copy JSON
                  </button>
                </div>
              )}
            </div>

            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div className="flex-1 bg-zinc-950 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                       style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "30px 30px" }} 
                  />

                  {nodes.length > 0 && (
                    <div className="absolute top-4 right-4 z-20 flex gap-1">
                      <button
                        onClick={() => setViewMode("cards")}
                        className={`px-3 py-1 text-xs font-bold ${viewMode === "cards" ? "bg-white text-black" : "bg-zinc-800 text-white border border-zinc-700"}`}
                      >
                        Cards
                      </button>
                      <button
                        onClick={() => setViewMode("graph")}
                        className={`px-3 py-1 text-xs font-bold ${viewMode === "graph" ? "bg-white text-black" : "bg-zinc-800 text-white border border-zinc-700"}`}
                      >
                        <Map className="w-3 h-3 inline mr-1" />Graph
                      </button>
                    </div>
                  )}

                  {editingNode ? (
                    <div className="absolute inset-0 p-8 overflow-auto">
                      {(() => {
                        const node = nodes.find(n => n.id === editingNode);
                        if (!node) return null;
                        return (
                          <div className="max-w-2xl mx-auto space-y-6">
                            <div className="flex justify-between items-center">
                              <h3 className="font-bold text-lg">Edit Node</h3>
                              <button onClick={() => setEditingNode(null)} className="p-2 hover:bg-zinc-800">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase text-zinc-400">Node Title</label>
                              <input
                                value={node.title || ""}
                                onChange={(e) => updateNode(node.id, { title: e.target.value })}
                                className="w-full p-2 border border-zinc-700 bg-zinc-800 text-sm font-bold"
                                placeholder="Scene title..."
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase text-zinc-400">Node Text</label>
                              <textarea
                                value={node.text}
                                onChange={(e) => updateNode(node.id, { text: e.target.value })}
                                className="w-full h-48 p-3 border border-zinc-700 bg-zinc-800 text-sm font-mono resize-none"
                              />
                            </div>
                            <div className="flex gap-4">
                              <div className="space-y-2 flex-1">
                                <label className="text-xs font-bold uppercase text-zinc-400">Color Tag</label>
                                <div className="flex gap-1 flex-wrap">
                                  {(Object.entries(NODE_COLORS) as [NodeColor, typeof NODE_COLORS[NodeColor]][]).map(([key, val]) => (
                                    <button
                                      key={key}
                                      onClick={() => updateNode(node.id, { color: key })}
                                      className={`px-2 py-1 text-[10px] border ${node.color === key || (!node.color && key === "default") ? "border-white bg-white/20" : `${val.border} ${val.bg}`}`}
                                    >
                                      {val.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
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
                                <div className="relative aspect-video bg-zinc-800 overflow-hidden">
                                  <img src={node.image} className="w-full h-full object-cover" />
                                  <button
                                    onClick={() => updateNode(node.id, { image: undefined })}
                                    className="absolute top-2 right-2 p-1 bg-red-500/80 hover:bg-red-500"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <label className="text-xs font-bold uppercase text-zinc-400">Choices</label>
                                <button onClick={() => addChoiceToNode(node.id)} className="p-1 bg-white text-black text-xs flex items-center gap-1">
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
                                      <option key={n.id} value={n.id}>{n.title || n.id}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => { updateNode(node.id, { choices: node.choices.filter((_, j) => j !== i) }); }}
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
                            <div className="flex gap-2 pt-4">
                              <button
                                onClick={() => startPreview(node.id)}
                                className="px-4 py-2 bg-green-600 text-white text-sm font-bold flex items-center gap-2 hover:bg-green-500"
                              >
                                <Play className="w-4 h-4" /> Play from here
                              </button>
                              <button
                                onClick={() => duplicateNode(node.id)}
                                className="px-4 py-2 bg-zinc-800 text-sm flex items-center gap-2 hover:bg-zinc-700"
                              >
                                <Copy className="w-4 h-4" /> Duplicate
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : nodes.length > 0 ? (
                    viewMode === "graph" ? (
                      <NodeGraph 
                        nodes={nodes}
                        selectedNodeId={selectedNodeId}
                        onSelectNode={(id) => setSelectedNodeId(id)}
                        onEditNode={(id) => setEditingNode(id)}
                      />
                    ) : (
                      <div className="absolute inset-0 p-8 overflow-auto">
                        <div className="flex flex-wrap gap-4">
                          {nodes.filter(n => !n.id.startsWith("ending")).map((node, index) => {
                            const colorScheme = NODE_COLORS[node.color || "default"];
                            return (
                              <div 
                                key={node.id} 
                                className={`w-72 border-2 shadow-lg cursor-pointer transition-all hover:shadow-xl ${
                                  node.isEnding ? "border-green-500" : colorScheme.border
                                } ${colorScheme.bg} ${selectedNodeId === node.id ? "ring-2 ring-white" : ""}`}
                                onClick={() => setSelectedNodeId(node.id)}
                                onDoubleClick={() => setEditingNode(node.id)}
                              >
                                {node.image && (
                                  <div className="aspect-video overflow-hidden">
                                    <img src={node.image} className="w-full h-full object-cover" />
                                  </div>
                                )}
                                <div className="p-4">
                                  <div className="flex justify-between mb-2">
                                    <span className="font-bold text-xs uppercase">
                                      {node.title || (node.isEnding ? "ENDING" : `Scene ${index + 1}`)}
                                    </span>
                                    <div className="flex gap-1">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); startPreview(node.id); }}
                                        className="p-0.5 hover:text-green-400"
                                        title="Play from here"
                                      >
                                        <Play className="w-3 h-3" />
                                      </button>
                                      <span className="text-[10px] text-zinc-500">{node.id}</span>
                                    </div>
                                  </div>
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
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )
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
              </ContextMenuTrigger>
              <ContextMenuContent className="w-56 bg-zinc-900 border-zinc-700 text-white">
                <ContextMenuItem onClick={addNode} className="hover:bg-zinc-800 cursor-pointer">
                  <Plus className="w-4 h-4 mr-2" /> Add Node
                </ContextMenuItem>
                <ContextMenuItem onClick={generateCYOA} disabled={!storyText.trim()} className="hover:bg-zinc-800 cursor-pointer">
                  <GitBranch className="w-4 h-4 mr-2" /> Generate CYOA
                </ContextMenuItem>
                <ContextMenuSeparator className="bg-zinc-700" />
                <ContextMenuItem onClick={() => setShowAIGen(true)} className="hover:bg-zinc-800 cursor-pointer">
                  <Wand2 className="w-4 h-4 mr-2" /> AI Generate Image
                </ContextMenuItem>
                <ContextMenuSeparator className="bg-zinc-700" />
                <ContextMenuItem onClick={() => startPreview()} className="hover:bg-zinc-800 cursor-pointer">
                  <Play className="w-4 h-4 mr-2" /> Preview Story
                </ContextMenuItem>
                <ContextMenuSeparator className="bg-zinc-700" />
                <ContextMenuItem onClick={() => setViewMode(viewMode === "cards" ? "graph" : "cards")} className="hover:bg-zinc-800 cursor-pointer">
                  <Map className="w-4 h-4 mr-2" /> Toggle {viewMode === "cards" ? "Graph" : "Cards"} View
                </ContextMenuItem>
                {selectedNodeId && (
                  <>
                    <ContextMenuSeparator className="bg-zinc-700" />
                    <ContextMenuItem onClick={() => setEditingNode(selectedNodeId)} className="hover:bg-zinc-800 cursor-pointer">
                      <Edit className="w-4 h-4 mr-2" /> Edit Node
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => startPreview(selectedNodeId)} className="hover:bg-zinc-800 cursor-pointer">
                      <Play className="w-4 h-4 mr-2" /> Play from Here
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => duplicateNode(selectedNodeId)} className="hover:bg-zinc-800 cursor-pointer">
                      <Copy className="w-4 h-4 mr-2" /> Duplicate Node
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => deleteNode(selectedNodeId)} className="hover:bg-red-900 cursor-pointer text-red-400">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Node
                    </ContextMenuItem>
                  </>
                )}
              </ContextMenuContent>
            </ContextMenu>
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
