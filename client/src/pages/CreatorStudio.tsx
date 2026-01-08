import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BookOpen, Layers, Film, Gamepad2, Image, Wand2,
  FileText, Sparkles, Boxes, ChevronRight, Zap,
  ArrowLeft
} from "lucide-react";

type CreatorMode = "comic" | "card" | "vn" | "cyoa" | "cover" | "motion";
type ToolMode = "prompt" | "story" | "assets";

interface ModeInfo {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
  route?: string;
}

const CREATOR_MODES: ModeInfo[] = [
  { 
    id: "comic", 
    label: "COMIC CREATOR", 
    icon: BookOpen, 
    description: "Build comic pages with panels, speech bubbles, and effects",
    color: "bg-red-600",
    route: "/creator/comic"
  },
  { 
    id: "card", 
    label: "CARD MAKER", 
    icon: Layers, 
    description: "Design trading cards, game cards, and collectibles",
    color: "bg-blue-600",
    route: "/creator/card"
  },
  { 
    id: "vn", 
    label: "VISUAL NOVEL", 
    icon: Gamepad2, 
    description: "Create interactive visual novel scenes and stories",
    color: "bg-purple-600",
    route: "/creator/vn"
  },
  { 
    id: "cyoa", 
    label: "CYOA BUILDER", 
    icon: FileText, 
    description: "Build branching Choose Your Own Adventure stories",
    color: "bg-green-600",
    route: "/creator/cyoa"
  },
  { 
    id: "cover", 
    label: "COVER ART", 
    icon: Image, 
    description: "Design stunning cover art for your projects",
    color: "bg-amber-600",
    route: "/creator/cover"
  },
  { 
    id: "motion", 
    label: "MOTION STUDIO", 
    icon: Film, 
    description: "Animate your comics with motion and sound",
    color: "bg-cyan-600",
    route: "/creator/motion"
  },
];

const AI_TOOLS: ModeInfo[] = [
  { 
    id: "prompt", 
    label: "PROMPT FACTORY", 
    icon: Wand2, 
    description: "Generate and refine AI prompts for image generation",
    color: "bg-pink-600",
    route: "/tools/prompt"
  },
  { 
    id: "story", 
    label: "STORY FORGE", 
    icon: Sparkles, 
    description: "AI-assisted creative writing and story development",
    color: "bg-violet-600",
    route: "/tools/story"
  },
  { 
    id: "assets", 
    label: "ASSET BUILDER", 
    icon: Boxes, 
    description: "Generate and manage AI-created assets",
    color: "bg-orange-600",
    route: "/tools/assets"
  },
];

export default function CreatorStudio() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"create" | "tools">("create");

  const handleModeSelect = (route?: string) => {
    if (route) {
      navigate(route);
    }
  };

  return (
      <div className="min-h-screen bg-black text-white">
        <div className="sticky top-0 z-40 bg-black border-b-4 border-red-600">
          <div className="flex items-center justify-between p-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/")}
              className="text-white hover:bg-red-600/20"
              data-testid="back-button"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="font-black text-xl tracking-[0.2em] uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              CREATOR STUDIO
            </h1>
            <div className="w-10" />
          </div>
          
          <div className="flex border-t-2 border-white/20">
            <button
              onClick={() => setActiveTab("create")}
              className={`flex-1 py-3 font-black text-sm tracking-wider transition-all ${
                activeTab === "create" 
                  ? "bg-red-600 text-white" 
                  : "bg-black text-white/50 hover:text-white hover:bg-white/5"
              }`}
              data-testid="tab-create"
            >
              <Zap className="w-4 h-4 inline mr-2" />
              CREATE
            </button>
            <button
              onClick={() => setActiveTab("tools")}
              className={`flex-1 py-3 font-black text-sm tracking-wider transition-all ${
                activeTab === "tools" 
                  ? "bg-red-600 text-white" 
                  : "bg-black text-white/50 hover:text-white hover:bg-white/5"
              }`}
              data-testid="tab-tools"
            >
              <Wand2 className="w-4 h-4 inline mr-2" />
              AI TOOLS
            </button>
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="p-4 pb-24">
            {activeTab === "create" ? (
              <>
                <p className="text-white/50 text-sm mb-6 text-center">
                  Choose a creator mode to start building
                </p>
                <div className="space-y-3">
                  {CREATOR_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => handleModeSelect(mode.route)}
                      className="w-full group"
                      data-testid={`mode-${mode.id}`}
                    >
                      <div 
                        className="relative bg-zinc-900 border-4 border-white hover:border-red-500 transition-all p-4 overflow-hidden"
                        style={{
                          clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)"
                        }}
                      >
                        <div className={`absolute top-0 right-0 w-24 h-full ${mode.color} opacity-20 transform skew-x-[-15deg] translate-x-8`} />
                        
                        <div className="relative flex items-center gap-4">
                          <div className={`w-14 h-14 ${mode.color} border-2 border-white flex items-center justify-center transform -skew-x-6`}>
                            <mode.icon className="w-7 h-7 text-white" />
                          </div>
                          <div className="flex-1 text-left">
                            <h3 className="font-black text-lg tracking-wide group-hover:text-red-500 transition-colors">
                              {mode.label}
                            </h3>
                            <p className="text-white/50 text-sm">{mode.description}</p>
                          </div>
                          <ChevronRight className="w-6 h-6 text-white/30 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
                        </div>
                        
                        <div className="absolute bottom-0 right-0 w-0 h-0 border-l-[12px] border-l-transparent border-b-[12px] border-b-white/30" />
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="text-white/50 text-sm mb-6 text-center">
                  AI-powered tools to enhance your creativity
                </p>
                <div className="space-y-3">
                  {AI_TOOLS.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => handleModeSelect(tool.route)}
                      className="w-full group"
                      data-testid={`tool-${tool.id}`}
                    >
                      <div 
                        className="relative bg-zinc-900 border-4 border-white hover:border-red-500 transition-all p-4 overflow-hidden"
                        style={{
                          clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)"
                        }}
                      >
                        <div className={`absolute top-0 right-0 w-24 h-full ${tool.color} opacity-20 transform skew-x-[-15deg] translate-x-8`} />
                        
                        <div className="relative flex items-center gap-4">
                          <div className={`w-14 h-14 ${tool.color} border-2 border-white flex items-center justify-center transform -skew-x-6`}>
                            <tool.icon className="w-7 h-7 text-white" />
                          </div>
                          <div className="flex-1 text-left">
                            <h3 className="font-black text-lg tracking-wide group-hover:text-red-500 transition-colors">
                              {tool.label}
                            </h3>
                            <p className="text-white/50 text-sm">{tool.description}</p>
                          </div>
                          <ChevronRight className="w-6 h-6 text-white/30 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
                        </div>
                        
                        <div className="absolute bottom-0 right-0 w-0 h-0 border-l-[12px] border-l-transparent border-b-[12px] border-b-white/30" />
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="mt-8 p-4 border-2 border-dashed border-white/20 text-center">
              <p className="text-white/40 text-sm">
                More creator modes coming soon...
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="fixed bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-white to-red-600" />
      </div>
  );
}
