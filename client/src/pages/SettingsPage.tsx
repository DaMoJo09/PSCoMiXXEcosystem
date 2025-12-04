import { Layout } from "@/components/layout/Layout";
import { useState, useEffect } from "react";
import { 
  Settings, 
  Key, 
  Sparkles, 
  Image as ImageIcon, 
  Crown, 
  Save,
  Check,
  ExternalLink,
  ArrowLeft,
  Trash2
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface AppSettings {
  textProvider: "gemini" | "claude";
  imageProvider: "pollinations" | "getimg" | "stablehorde";
  geminiApiKey: string;
  licenseTier: "free" | "pro";
  theme: "dark" | "light";
  autoSave: boolean;
}

const defaultSettings: AppSettings = {
  textProvider: "gemini",
  imageProvider: "pollinations",
  geminiApiKey: "",
  licenseTier: "free",
  theme: "dark",
  autoSave: true,
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("pscomixx_settings");
    if (saved) {
      setSettings({ ...defaultSettings, ...JSON.parse(saved) });
    }
  }, []);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 500));
    localStorage.setItem("pscomixx_settings", JSON.stringify(settings));
    setIsSaving(false);
    toast.success("Settings saved");
  };

  const clearApiKey = () => {
    updateSetting("geminiApiKey", "");
    toast.success("API key cleared");
  };

  const activatePro = () => {
    updateSetting("licenseTier", "pro");
    toast.success("Pro license activated!");
  };

  const clearPro = () => {
    updateSetting("licenseTier", "free");
    updateSetting("textProvider", "gemini");
    toast.success("Pro license cleared");
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
              <Settings className="w-5 h-5" />
              <h1 className="font-display font-bold text-lg">Settings</h1>
            </div>
          </div>
          <button
            onClick={saveSettings}
            disabled={isSaving}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-hard-sm disabled:opacity-50"
            data-testid="button-save-settings"
          >
            {isSaving ? <Sparkles className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </header>

        <div className="max-w-3xl mx-auto p-8 space-y-8">
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <Crown className="w-5 h-5" />
              <h2 className="font-display font-bold text-lg">License / Mode</h2>
            </div>

            <div className="p-6 border border-border bg-card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold">Current License</h3>
                  <p className="text-sm text-muted-foreground">
                    {settings.licenseTier === "pro" ? "Pro features unlocked" : "Free version with limited features"}
                  </p>
                </div>
                <div className={`px-4 py-2 font-bold uppercase text-sm ${
                  settings.licenseTier === "pro" 
                    ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-black" 
                    : "bg-secondary"
                }`}>
                  {settings.licenseTier === "pro" ? "PRO LICENSE" : "FREE VERSION"}
                </div>
              </div>

              <div className="flex gap-2">
                {settings.licenseTier === "free" ? (
                  <button
                    onClick={activatePro}
                    className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold text-sm"
                    data-testid="button-activate-pro"
                  >
                    Activate Pro
                  </button>
                ) : (
                  <button
                    onClick={clearPro}
                    className="px-4 py-2 bg-secondary border border-border text-sm"
                    data-testid="button-clear-pro"
                  >
                    Clear License
                  </button>
                )}
              </div>

              {settings.licenseTier === "pro" && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 text-sm">
                  <Check className="w-4 h-4 inline mr-2 text-green-500" />
                  Claude AI is now available as a text provider
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <Sparkles className="w-5 h-5" />
              <h2 className="font-display font-bold text-lg">Text AI Provider</h2>
            </div>

            <div className="p-6 border border-border bg-card space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => updateSetting("textProvider", "gemini")}
                  className={`p-4 border text-left ${
                    settings.textProvider === "gemini"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary"
                  }`}
                  data-testid="provider-gemini"
                >
                  <div className="font-bold">Gemini</div>
                  <div className="text-xs text-muted-foreground">Free tier available</div>
                </button>
                <button
                  onClick={() => settings.licenseTier === "pro" && updateSetting("textProvider", "claude")}
                  disabled={settings.licenseTier !== "pro"}
                  className={`p-4 border text-left ${
                    settings.textProvider === "claude"
                      ? "border-primary bg-primary/10"
                      : settings.licenseTier !== "pro"
                        ? "border-border opacity-50 cursor-not-allowed"
                        : "border-border hover:border-primary"
                  }`}
                  data-testid="provider-claude"
                >
                  <div className="font-bold flex items-center gap-2">
                    Claude
                    {settings.licenseTier !== "pro" && (
                      <span className="text-[10px] bg-yellow-500 text-black px-1">PRO</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">Pro license required</div>
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold uppercase flex items-center gap-2">
                  <Key className="w-4 h-4" /> Gemini API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={settings.geminiApiKey}
                    onChange={(e) => updateSetting("geminiApiKey", e.target.value)}
                    placeholder="Enter your Gemini API key..."
                    className="flex-1 p-3 border border-border bg-background text-sm font-mono"
                    data-testid="input-gemini-key"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="px-4 py-2 bg-secondary border border-border text-sm"
                  >
                    {showApiKey ? "Hide" : "Show"}
                  </button>
                  {settings.geminiApiKey && (
                    <button
                      onClick={clearApiKey}
                      className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-500 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  Get free Gemini API key <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <ImageIcon className="w-5 h-5" />
              <h2 className="font-display font-bold text-lg">Image Generation Provider</h2>
            </div>

            <div className="p-6 border border-border bg-card space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => updateSetting("imageProvider", "pollinations")}
                  className={`p-4 border text-left ${
                    settings.imageProvider === "pollinations"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary"
                  }`}
                  data-testid="img-pollinations"
                >
                  <div className="font-bold">Pollinations.ai</div>
                  <div className="text-xs text-muted-foreground">Free, fast, no key needed</div>
                </button>
                <button
                  onClick={() => updateSetting("imageProvider", "getimg")}
                  className={`p-4 border text-left ${
                    settings.imageProvider === "getimg"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary"
                  }`}
                  data-testid="img-getimg"
                >
                  <div className="font-bold">GetImg.ai</div>
                  <div className="text-xs text-muted-foreground">High quality, API key required</div>
                </button>
                <button
                  onClick={() => updateSetting("imageProvider", "stablehorde")}
                  className={`p-4 border text-left ${
                    settings.imageProvider === "stablehorde"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary"
                  }`}
                  data-testid="img-stablehorde"
                >
                  <div className="font-bold">Stable Horde</div>
                  <div className="text-xs text-muted-foreground">Community-powered, free</div>
                </button>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/30 text-sm">
                <strong>Pollinations.ai</strong> is recommended for quick concept art. It's free, fast, and requires no API key. 
                For production-quality sprites and animations, use MidJourney or Higgsfield.
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <Settings className="w-5 h-5" />
              <h2 className="font-display font-bold text-lg">Preferences</h2>
            </div>

            <div className="p-6 border border-border bg-card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold">Auto-Save Projects</h3>
                  <p className="text-sm text-muted-foreground">Automatically save changes every 30 seconds</p>
                </div>
                <button
                  onClick={() => updateSetting("autoSave", !settings.autoSave)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.autoSave ? "bg-primary" : "bg-secondary"
                  }`}
                  data-testid="toggle-autosave"
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    settings.autoSave ? "translate-x-6" : "translate-x-0.5"
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold">Theme</h3>
                  <p className="text-sm text-muted-foreground">Application color scheme</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateSetting("theme", "dark")}
                    className={`px-4 py-2 text-sm ${
                      settings.theme === "dark" ? "bg-primary text-primary-foreground" : "bg-secondary"
                    }`}
                  >
                    Dark
                  </button>
                  <button
                    onClick={() => updateSetting("theme", "light")}
                    className={`px-4 py-2 text-sm ${
                      settings.theme === "light" ? "bg-primary text-primary-foreground" : "bg-secondary"
                    }`}
                  >
                    Light
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="p-4 bg-secondary/30 border border-border text-sm text-muted-foreground">
            <p><strong>Note:</strong> Settings are stored locally in your browser. To sync settings across devices, sign in with your PSCoMiXX account.</p>
            <p className="mt-2">Logged in as: <strong>{user?.email || "Guest"}</strong></p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
