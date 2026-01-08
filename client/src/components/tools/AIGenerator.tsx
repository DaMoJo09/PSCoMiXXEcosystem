import { useState } from "react";
import { Wand2, Loader2, Info, Sparkles, Zap, Star, PenTool, Pencil, Palette, User, Smile, ChevronDown, ChevronUp, Check, Download, RefreshCw, Camera, Shapes, Grid3X3, Droplets, Lock } from "lucide-react";
import { AI_MODELS, AIModel, generateImageUrl } from "@/lib/aiModels";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSubscription } from "@/hooks/use-subscription";
import { UpgradeModal } from "@/components/UpgradeModal";

interface AIGeneratorProps {
  onImageGenerated: (url: string) => void;
  type: "comic" | "card" | "cover" | "character" | "background" | "motion" | "cyoa" | "vn";
}

const iconMap: Record<string, React.ReactNode> = {
  sparkles: <Sparkles className="w-4 h-4" />,
  zap: <Zap className="w-4 h-4" />,
  star: <Star className="w-4 h-4" />,
  "pen-tool": <PenTool className="w-4 h-4" />,
  pencil: <Pencil className="w-4 h-4" />,
  palette: <Palette className="w-4 h-4" />,
  user: <User className="w-4 h-4" />,
  smile: <Smile className="w-4 h-4" />,
  camera: <Camera className="w-4 h-4" />,
  shapes: <Shapes className="w-4 h-4" />,
  grid: <Grid3X3 className="w-4 h-4" />,
  droplets: <Droplets className="w-4 h-4" />,
};

const categoryColors: Record<AIModel["category"], string> = {
  pro: "border-yellow-500 bg-yellow-500/10",
  fast: "border-green-500 bg-green-500/10",
  anime: "border-pink-500 bg-pink-500/10",
  comic: "border-blue-500 bg-blue-500/10",
  artistic: "border-purple-500 bg-purple-500/10",
  character: "border-orange-500 bg-orange-500/10",
  photo: "border-cyan-500 bg-cyan-500/10",
  abstract: "border-red-500 bg-red-500/10",
};

const categoryLabels: Record<AIModel["category"], string> = {
  pro: "PRO",
  fast: "FAST",
  anime: "ANIME",
  comic: "COMIC",
  artistic: "ART",
  character: "CHAR",
  photo: "PHOTO",
  abstract: "ABSTRACT",
};

export function AIGenerator({ onImageGenerated, type }: AIGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("classic-freestyle");
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  
  const { hasFeature, isAdmin } = useSubscription();
  const hasAIAccess = hasFeature("ai") || isAdmin;

  const currentModel = AI_MODELS.find(m => m.id === selectedModel) || AI_MODELS[1];

  const generateImage = async () => {
    if (!hasAIAccess) {
      setShowUpgrade(true);
      return;
    }
    if (!prompt) return;
    setIsGenerating(true);
    
    const url = generateImageUrl(selectedModel, `${prompt}, ${type} style`, 1024, 1024);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setGeneratedImage(url);
    setIsGenerating(false);
  };

  const useStyleTip = () => {
    setPrompt(currentModel.samplePrompt);
  };

  const downloadImage = async () => {
    if (!generatedImage) return;
    
    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pscomixx-${type}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `pscomixx-${type}-${Date.now()}.png`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border border-border bg-card">
        <button
          onClick={() => setShowModelSelector(!showModelSelector)}
          className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
          data-testid="model-selector-toggle"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 border ${categoryColors[currentModel.category]}`}>
              {iconMap[currentModel.icon]}
            </div>
            <div className="text-left">
              <div className="font-bold text-sm flex items-center gap-2">
                {currentModel.name}
                <span className={`text-[10px] px-1.5 py-0.5 border ${categoryColors[currentModel.category]}`}>
                  {categoryLabels[currentModel.category]}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">{currentModel.engineLabel}</div>
            </div>
          </div>
          {showModelSelector ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showModelSelector && (
          <div className="border-t border-border max-h-[300px] overflow-y-auto">
            {AI_MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  setSelectedModel(model.id);
                  setShowModelSelector(false);
                }}
                className={`w-full p-3 flex items-start gap-3 hover:bg-muted/50 transition-colors border-b border-border last:border-0 ${
                  selectedModel === model.id ? "bg-muted" : ""
                }`}
                data-testid={`model-option-${model.id}`}
              >
                <div className={`p-2 border ${categoryColors[model.category]} shrink-0`}>
                  {iconMap[model.icon]}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-bold text-sm flex items-center gap-2">
                    {model.name}
                    <span className={`text-[10px] px-1.5 py-0.5 border ${categoryColors[model.category]}`}>
                      {categoryLabels[model.category]}
                    </span>
                    {selectedModel === model.id && <Check className="w-3 h-3 text-green-500" />}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{model.description}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {model.bestFor.slice(0, 3).map((use, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 bg-muted border border-border">
                        {use}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border border-border bg-card p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-bold text-xs uppercase tracking-wide">Your Prompt</h4>
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={() => setShowTips(!showTips)}
                className="p-1 hover:bg-muted"
              >
                <Info className="w-3 h-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[250px]">
              <p className="text-xs">{currentModel.styleTip}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {showTips && (
          <div className="mb-3 p-2 bg-muted border border-border text-xs">
            <p className="font-bold mb-1">Style Tip for {currentModel.name}:</p>
            <p className="text-muted-foreground mb-2">{currentModel.styleTip}</p>
            <button
              onClick={useStyleTip}
              className="text-[10px] px-2 py-1 bg-primary text-primary-foreground font-bold"
            >
              USE SAMPLE PROMPT
            </button>
          </div>
        )}

        <textarea 
          className="w-full bg-background border border-border p-2 text-xs min-h-[80px] focus:ring-1 focus:ring-primary outline-none resize-none"
          placeholder={`Describe your ${type}... Try: "${currentModel.samplePrompt.slice(0, 50)}..."`}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          data-testid="ai-prompt-input"
        />

        <div className="flex gap-2 mt-2">
          <button 
            className="flex-1 py-2 bg-primary text-primary-foreground text-xs font-bold uppercase flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
            onClick={generateImage}
            disabled={isGenerating || !prompt}
            data-testid="ai-generate-button"
          >
            {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
            {isGenerating ? "Creating..." : "Generate"}
          </button>
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          {currentModel.bestFor.map((use, i) => (
            <span key={i} className="text-[9px] px-1.5 py-0.5 bg-muted text-muted-foreground border border-border">
              {use}
            </span>
          ))}
        </div>
      </div>

      {generatedImage && (
        <div className="border border-border bg-card p-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-xs uppercase tracking-wide">Generated Art</h4>
            <span className="text-[10px] text-muted-foreground">{currentModel.name}</span>
          </div>
          <div className="aspect-square w-full bg-black relative group border border-border overflow-hidden">
            <img src={generatedImage} className="w-full h-full object-cover" alt="Generated artwork" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
              <div className="flex gap-2">
                <button 
                  onClick={() => onImageGenerated(generatedImage)}
                  className="bg-primary text-primary-foreground px-4 py-2 text-xs font-bold hover:opacity-90"
                  data-testid="ai-use-image-button"
                  aria-label="Use this image in your project"
                >
                  USE IMAGE
                </button>
                <button 
                  onClick={downloadImage}
                  className="bg-green-600 text-white px-4 py-2 text-xs font-bold hover:opacity-90 flex items-center gap-1"
                  data-testid="ai-download-image-button"
                  aria-label="Download generated image"
                >
                  <Download className="w-3 h-3" />
                  DOWNLOAD
                </button>
              </div>
              <button 
                onClick={generateImage}
                disabled={isGenerating}
                className="bg-muted text-foreground px-4 py-2 text-xs font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
                data-testid="ai-regenerate-button"
                aria-label="Generate a new image"
              >
                <RefreshCw className="w-3 h-3" />
                REGENERATE
              </button>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Powered by {currentModel.engineLabel} via Pollinations - Free AI Image Generation
          </p>
        </div>
      )}
      
      <UpgradeModal 
        isOpen={showUpgrade} 
        onClose={() => setShowUpgrade(false)} 
        feature="AI Image Generation"
        requiredTier="creator"
      />
    </div>
  );
}
