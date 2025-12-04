import { useState, useRef, useEffect } from "react";
import { Wand2, Loader2, X } from "lucide-react";

interface AIGeneratorProps {
  onImageGenerated: (url: string) => void;
  type: "comic" | "card" | "cover" | "character" | "background" | "motion" | "cyoa" | "vn";
}

export function AIGenerator({ onImageGenerated, type }: AIGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const generateImage = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    
    // Encode prompt for Pollinations.ai
    const encodedPrompt = encodeURIComponent(`${prompt}, ${type} style, high quality, sharp details, black and white, noir, ink drawing`);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 10000)}`;
    
    // Simulate loading for better UX (since image loads instantly usually)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setGeneratedImage(url);
    setIsGenerating(false);
  };

  return (
    <div className="p-4 bg-card border border-border shadow-hard">
      <h3 className="font-display font-bold text-sm mb-3 flex items-center gap-2">
        <Wand2 className="w-4 h-4" /> AI Asset Generator
      </h3>
      
      <div className="space-y-3">
        <textarea 
          className="w-full bg-background border border-border p-2 text-xs min-h-[80px] focus:ring-1 focus:ring-primary outline-none resize-none"
          placeholder={`Describe your ${type}... (e.g. "Cyberpunk detective in rain")`}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        
        <button 
          className="w-full py-2 bg-primary text-primary-foreground text-xs font-bold uppercase flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
          onClick={generateImage}
          disabled={isGenerating || !prompt}
        >
          {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
          {isGenerating ? "Dreaming..." : "Generate"}
        </button>

        {generatedImage && (
          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
            <div className="aspect-square w-full bg-black relative group border border-border">
              <img src={generatedImage} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button 
                  onClick={() => onImageGenerated(generatedImage)}
                  className="bg-primary text-primary-foreground px-3 py-1 text-xs font-bold"
                >
                  USE
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
