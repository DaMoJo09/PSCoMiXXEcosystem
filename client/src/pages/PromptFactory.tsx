import { Layout } from "@/components/layout/Layout";
import { useState } from "react";
import { 
  Wand2, 
  Upload, 
  Sparkles, 
  Copy, 
  Check, 
  RefreshCw,
  Image as ImageIcon,
  User,
  Mountain,
  Box,
  Grid3X3,
  Play,
  Palette,
  ArrowLeft
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

const stylePresets = [
  { id: "anime", label: "Anime", color: "bg-pink-500" },
  { id: "pixar", label: "Pixar", color: "bg-blue-500" },
  { id: "3d", label: "3D Render", color: "bg-purple-500" },
  { id: "comic", label: "Comic Book", color: "bg-yellow-500" },
  { id: "manga", label: "Manga", color: "bg-red-500" },
  { id: "chibi", label: "Chibi", color: "bg-green-500" },
  { id: "ghibli", label: "Ghibli", color: "bg-teal-500" },
  { id: "pixel", label: "Pixel Art", color: "bg-orange-500" },
  { id: "cyberpunk", label: "Cyberpunk", color: "bg-cyan-500" },
  { id: "watercolor", label: "Watercolor", color: "bg-indigo-500" },
  { id: "noir", label: "Noir", color: "bg-zinc-700" },
  { id: "flat", label: "Flat Vector", color: "bg-lime-500" },
];

const assetTypes = [
  { id: "character", label: "Character", icon: User },
  { id: "environment", label: "Environment", icon: Mountain },
  { id: "props", label: "Props", icon: Box },
  { id: "ui", label: "UI Elements", icon: Grid3X3 },
  { id: "sprite", label: "Sprite Sheet", icon: Grid3X3 },
  { id: "animation", label: "Animation Pack", icon: Play },
];

const animationTypes = [
  "Idle", "Walk", "Run", "Jump", "Wave", "Talk", "Attack", "Death", "Custom"
];

const imageProviders = [
  { id: "pollinations", label: "Pollinations.ai", desc: "Free, fast, good for concepts" },
  { id: "getimg", label: "GetImg.ai", desc: "High quality, requires API key" },
  { id: "stablehorde", label: "Stable Horde", desc: "Community-powered, free" },
];

export default function PromptFactory() {
  const [selectedStyles, setSelectedStyles] = useState<string[]>(["noir"]);
  const [assetType, setAssetType] = useState("character");
  const [animationType, setAnimationType] = useState("Idle");
  const [description, setDescription] = useState("");
  const [enhancedDescription, setEnhancedDescription] = useState("");
  const [styleDNA, setStyleDNA] = useState("");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [generatedPrompts, setGeneratedPrompts] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [imageProvider, setImageProvider] = useState("pollinations");
  const [copied, setCopied] = useState<number | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const toggleStyle = (styleId: string) => {
    setSelectedStyles(prev => 
      prev.includes(styleId) 
        ? prev.filter(s => s !== styleId)
        : [...prev, styleId]
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImage(reader.result as string);
        analyzeImage();
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = () => {
    const styleNames = selectedStyles.map(s => stylePresets.find(p => p.id === s)?.label).join(", ");
    setStyleDNA(`High-contrast ${styleNames} style with dramatic lighting, sharp ink lines, deep shadows, and limited color palette. Emphasizes mood and atmosphere through stark contrasts and expressive linework. Suitable for ${assetType} assets with ${animationType} poses.`);
  };

  const enhanceDescription = async () => {
    if (!description.trim()) {
      toast.error("Please enter a description first");
      return;
    }
    
    setIsEnhancing(true);
    await new Promise(r => setTimeout(r, 1500));
    
    const styleNames = selectedStyles.map(s => stylePresets.find(p => p.id === s)?.label).join(" and ");
    setEnhancedDescription(
      `${description}. Rendered in ${styleNames} style with meticulous attention to detail. ` +
      `Features dramatic lighting, expressive poses, and dynamic composition. ` +
      `High quality, sharp details, professional ${assetType} design suitable for ${animationType} animation.`
    );
    setIsEnhancing(false);
    toast.success("Description enhanced!");
  };

  const generatePrompts = async () => {
    setIsGenerating(true);
    await new Promise(r => setTimeout(r, 1000));
    
    const styleNames = selectedStyles.map(s => stylePresets.find(p => p.id === s)?.label).join(", ");
    const baseDesc = enhancedDescription || description || "A detailed character";
    
    const prompts = [
      `${baseDesc}, ${styleNames} style, high quality, sharp details, professional artwork --ar 1:1`,
      `${baseDesc}, ${styleNames} aesthetic, dramatic lighting, cinematic composition, masterpiece quality --ar 16:9`,
      `${baseDesc}, in the style of ${styleNames}, detailed ${assetType}, ${animationType} pose, concept art --ar 4:5`,
      `Full body ${baseDesc}, ${styleNames} art style, clean lines, vibrant colors, game-ready asset --ar 9:16`,
    ];
    
    setGeneratedPrompts(prompts);
    setIsGenerating(false);
    toast.success("Prompts generated!");
  };

  const generateImage = async (prompt: string) => {
    const encodedPrompt = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 10000);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${seed}`;
    setGeneratedImage(url);
    toast.success("Image generating...");
  };

  const copyPrompt = (index: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
    toast.success("Copied to clipboard!");
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 hover:bg-muted border border-transparent hover:border-border transition-colors" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <div className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              <h1 className="font-display font-bold text-lg">Prompt Factory</h1>
            </div>
            <span className="text-xs font-mono text-muted-foreground">Concept Generator</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={imageProvider}
              onChange={(e) => setImageProvider(e.target.value)}
              className="bg-secondary border border-border text-sm p-2"
              data-testid="select-provider"
            >
              {imageProviders.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
        </header>

        <div className="flex">
          <div className="flex-1 p-6 space-y-8 max-w-4xl">
            <section className="space-y-4">
              <h2 className="font-display font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                <Palette className="w-4 h-4" /> Style Presets
              </h2>
              <div className="flex flex-wrap gap-2">
                {stylePresets.map(style => (
                  <button
                    key={style.id}
                    onClick={() => toggleStyle(style.id)}
                    className={`px-4 py-2 text-sm font-medium border transition-all ${
                      selectedStyles.includes(style.id)
                        ? "bg-primary text-primary-foreground border-primary shadow-hard-sm"
                        : "bg-secondary border-border hover:border-primary"
                    }`}
                    data-testid={`style-${style.id}`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="font-display font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                <Upload className="w-4 h-4" /> Reference Image (Optional)
              </h2>
              <div className="border-2 border-dashed border-border p-8 text-center hover:border-primary transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  data-testid="input-reference-image"
                />
                {referenceImage ? (
                  <img src={referenceImage} alt="Reference" className="max-h-48 mx-auto" />
                ) : (
                  <div className="space-y-2">
                    <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Drop image or click to upload</p>
                    <p className="text-xs text-muted-foreground">Analyze for Style DNA</p>
                  </div>
                )}
              </div>
              {referenceImage && (
                <button
                  onClick={analyzeImage}
                  className="px-4 py-2 bg-secondary border border-border text-sm font-medium hover:bg-muted"
                  data-testid="button-analyze"
                >
                  <Sparkles className="w-4 h-4 inline mr-2" />
                  Analyze Image → Generate DNA
                </button>
              )}
            </section>

            <section className="space-y-4">
              <h2 className="font-display font-bold text-sm uppercase tracking-wider">Asset Configuration</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase">Asset Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {assetTypes.map(type => (
                      <button
                        key={type.id}
                        onClick={() => setAssetType(type.id)}
                        className={`p-3 text-xs font-medium border flex flex-col items-center gap-1 ${
                          assetType === type.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary border-border hover:border-primary"
                        }`}
                        data-testid={`asset-${type.id}`}
                      >
                        <type.icon className="w-4 h-4" />
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase">Animation Type</label>
                  <select
                    value={animationType}
                    onChange={(e) => setAnimationType(e.target.value)}
                    className="w-full p-3 bg-secondary border border-border text-sm"
                    data-testid="select-animation"
                  >
                    {animationTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {styleDNA && (
              <section className="space-y-2 p-4 bg-secondary/50 border border-border">
                <h3 className="font-bold text-sm uppercase">Style DNA</h3>
                <p className="text-sm font-mono">{styleDNA}</p>
              </section>
            )}

            <section className="space-y-4">
              <h2 className="font-display font-bold text-sm uppercase tracking-wider">Character / Asset Description</h2>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your character or asset in detail..."
                className="w-full h-32 p-4 border border-border bg-background text-sm font-mono resize-none focus:ring-1 focus:ring-primary outline-none"
                data-testid="input-description"
              />
              <div className="flex gap-2">
                <button
                  onClick={enhanceDescription}
                  disabled={isEnhancing}
                  className="px-4 py-2 bg-secondary border border-border text-sm font-medium hover:bg-muted disabled:opacity-50 flex items-center gap-2"
                  data-testid="button-enhance"
                >
                  {isEnhancing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Enhance with AI
                </button>
              </div>

              {enhancedDescription && (
                <div className="p-4 bg-green-500/10 border border-green-500/30">
                  <h4 className="font-bold text-sm uppercase mb-2 text-green-600">Enhanced Version</h4>
                  <p className="text-sm font-mono">{enhancedDescription}</p>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => setDescription(enhancedDescription)}
                      className="px-3 py-1 bg-green-500 text-white text-xs font-medium"
                    >
                      Use This
                    </button>
                    <button
                      onClick={() => setEnhancedDescription("")}
                      className="px-3 py-1 bg-secondary border border-border text-xs font-medium"
                    >
                      Keep Original
                    </button>
                  </div>
                </div>
              )}
            </section>

            <button
              onClick={generatePrompts}
              disabled={isGenerating || !description.trim()}
              className="w-full py-4 bg-primary text-primary-foreground font-bold uppercase tracking-wider shadow-hard disabled:opacity-50 flex items-center justify-center gap-2"
              data-testid="button-generate-prompts"
            >
              {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
              Generate Prompts
            </button>

            {generatedPrompts.length > 0 && (
              <section className="space-y-4">
                <h2 className="font-display font-bold text-sm uppercase tracking-wider">Output Ready to Copy</h2>
                <div className="space-y-3">
                  {generatedPrompts.map((prompt, index) => (
                    <div key={index} className="p-4 bg-secondary border border-border group">
                      <div className="flex justify-between items-start gap-4">
                        <p className="text-sm font-mono flex-1">{prompt}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyPrompt(index, prompt)}
                            className="p-2 hover:bg-muted border border-transparent hover:border-border"
                            data-testid={`copy-prompt-${index}`}
                          >
                            {copied === index ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => generateImage(prompt)}
                            className="p-2 hover:bg-muted border border-transparent hover:border-border"
                            data-testid={`generate-image-${index}`}
                          >
                            <ImageIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="w-80 border-l border-border p-6 bg-secondary/20 sticky top-14 h-[calc(100vh-56px)] overflow-auto">
            <h3 className="font-display font-bold text-sm uppercase mb-4">Preview</h3>
            {generatedImage ? (
              <div className="space-y-4">
                <img src={generatedImage} alt="Generated" className="w-full border border-border" />
                <button
                  onClick={() => setGeneratedImage(null)}
                  className="w-full py-2 bg-secondary border border-border text-sm"
                >
                  Clear Preview
                </button>
              </div>
            ) : (
              <div className="aspect-square bg-secondary/50 border border-dashed border-border flex items-center justify-center">
                <p className="text-xs text-muted-foreground text-center px-4">
                  Generated images will appear here
                </p>
              </div>
            )}

            <div className="mt-8 space-y-4">
              <h4 className="font-bold text-xs uppercase">Recommendations</h4>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p><strong>Concept Art:</strong> Use Prompt Factory → MidJourney</p>
                <p><strong>Sprite Sheets:</strong> MidJourney only</p>
                <p><strong>Animation:</strong> Higgsfield</p>
                <p><strong>Production:</strong> MidJourney → Photoshop polish</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
