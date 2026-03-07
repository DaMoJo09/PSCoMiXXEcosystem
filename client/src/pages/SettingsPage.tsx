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
  Trash2,
  Code,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Accessibility,
  Contrast,
  Zap
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  expiresAt: string | null;
  createdAt: string;
  lastUsed: string | null;
  isActive: boolean;
}

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
  const { highContrast, toggleHighContrast, reducedMotion, toggleReducedMotion } = useTheme();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Developer API Key state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("pressstart_settings");
    if (saved) {
      setSettings({ ...defaultSettings, ...JSON.parse(saved) });
    }
  }, []);

  // Load API keys on mount
  useEffect(() => {
    if (user) {
      loadApiKeys();
    }
  }, [user]);

  const loadApiKeys = async () => {
    setIsLoadingKeys(true);
    try {
      const res = await fetch("/api/v1/keys", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        // API returns array directly
        setApiKeys(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to load API keys:", error);
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }
    setIsCreatingKey(true);
    try {
      const res = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewlyCreatedKey(data.key);
        setNewKeyName("");
        await loadApiKeys();
        toast.success("API key created! Copy it now - it won't be shown again.");
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create API key");
      }
    } catch (error) {
      toast.error("Failed to create API key");
    } finally {
      setIsCreatingKey(false);
    }
  };

  const deleteApiKey = async (keyId: string) => {
    try {
      const res = await fetch(`/api/v1/keys/${keyId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        await loadApiKeys();
        toast.success("API key deleted");
      } else {
        toast.error("Failed to delete API key");
      }
    } catch (error) {
      toast.error("Failed to delete API key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 500));
    localStorage.setItem("pressstart_settings", JSON.stringify(settings));
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
      <div className="min-h-screen bg-black text-white">
        <header className="h-14 border-b-4 border-white flex items-center justify-between px-6 bg-black sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 hover:bg-white hover:text-black border-2 border-white transition-colors" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              <h1 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Settings</h1>
            </div>
          </div>
          <button
            onClick={saveSettings}
            disabled={isSaving}
            className="px-4 py-2 bg-white text-black text-sm font-black flex items-center gap-2 border-2 border-white hover:bg-zinc-200 disabled:opacity-50 uppercase"
            data-testid="button-save-settings"
          >
            {isSaving ? <Sparkles className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </header>

        <div className="max-w-3xl mx-auto p-8 space-y-8">
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b-2 border-white pb-2">
              <Crown className="w-5 h-5" />
              <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>License / Mode</h2>
            </div>

            <div className="p-6 border-4 border-white bg-zinc-900 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold">Current License</h3>
                  <p className="text-sm text-zinc-400">
                    {settings.licenseTier === "pro" ? "Pro features unlocked" : "Free version with limited features"}
                  </p>
                </div>
                <div className={`px-4 py-2 font-black uppercase text-sm border-2 ${
                  settings.licenseTier === "pro" 
                    ? "bg-white text-black border-white" 
                    : "bg-zinc-800 border-zinc-600"
                }`}>
                  {settings.licenseTier === "pro" ? "PRO LICENSE" : "FREE VERSION"}
                </div>
              </div>

              <div className="flex gap-2">
                {settings.licenseTier === "free" ? (
                  <button
                    onClick={activatePro}
                    className="px-4 py-2 bg-white text-black font-black text-sm border-2 border-white hover:bg-zinc-200"
                    data-testid="button-activate-pro"
                  >
                    Activate Pro
                  </button>
                ) : (
                  <button
                    onClick={clearPro}
                    className="px-4 py-2 bg-zinc-800 border-2 border-zinc-600 text-sm hover:border-white"
                    data-testid="button-clear-pro"
                  >
                    Clear License
                  </button>
                )}
              </div>

              {settings.licenseTier === "pro" && (
                <div className="p-3 bg-white/10 border-2 border-white/30 text-sm">
                  <Check className="w-4 h-4 inline mr-2" />
                  Claude AI is now available as a text provider
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b-2 border-white pb-2">
              <Sparkles className="w-5 h-5" />
              <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Text AI Provider</h2>
            </div>

            <div className="p-6 border-4 border-white bg-zinc-900 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => updateSetting("textProvider", "gemini")}
                  className={`p-4 border-4 text-left transition-colors ${
                    settings.textProvider === "gemini"
                      ? "border-white bg-white/10"
                      : "border-zinc-600 hover:border-white"
                  }`}
                  data-testid="provider-gemini"
                >
                  <div className="font-bold">Gemini</div>
                  <div className="text-xs text-zinc-400">Free tier available</div>
                </button>
                <button
                  onClick={() => settings.licenseTier === "pro" && updateSetting("textProvider", "claude")}
                  disabled={settings.licenseTier !== "pro"}
                  className={`p-4 border-4 text-left transition-colors ${
                    settings.textProvider === "claude"
                      ? "border-white bg-white/10"
                      : settings.licenseTier !== "pro"
                        ? "border-zinc-700 opacity-50 cursor-not-allowed"
                        : "border-zinc-600 hover:border-white"
                  }`}
                  data-testid="provider-claude"
                >
                  <div className="font-bold flex items-center gap-2">
                    Claude
                    {settings.licenseTier !== "pro" && (
                      <span className="text-[10px] bg-white text-black px-1 font-black">PRO</span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-400">Pro license required</div>
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
                    className="flex-1 p-3 border-2 border-white bg-black text-sm font-mono focus:outline-none"
                    data-testid="input-gemini-key"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="px-4 py-2 bg-zinc-800 border-2 border-zinc-600 text-sm hover:border-white"
                  >
                    {showApiKey ? "Hide" : "Show"}
                  </button>
                  {settings.geminiApiKey && (
                    <button
                      onClick={clearApiKey}
                      className="px-4 py-2 bg-zinc-800 border-2 border-zinc-600 text-sm hover:border-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-white hover:underline flex items-center gap-1"
                >
                  Get free Gemini API key <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b-2 border-white pb-2">
              <ImageIcon className="w-5 h-5" />
              <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Image Generation Provider</h2>
            </div>

            <div className="p-6 border-4 border-white bg-zinc-900 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => updateSetting("imageProvider", "pollinations")}
                  className={`p-4 border-4 text-left transition-colors ${
                    settings.imageProvider === "pollinations"
                      ? "border-white bg-white/10"
                      : "border-zinc-600 hover:border-white"
                  }`}
                  data-testid="img-pollinations"
                >
                  <div className="font-bold">Pollinations.ai</div>
                  <div className="text-xs text-zinc-400">Free, fast, no key needed</div>
                </button>
                <button
                  onClick={() => updateSetting("imageProvider", "getimg")}
                  className={`p-4 border-4 text-left transition-colors ${
                    settings.imageProvider === "getimg"
                      ? "border-white bg-white/10"
                      : "border-zinc-600 hover:border-white"
                  }`}
                  data-testid="img-getimg"
                >
                  <div className="font-bold">GetImg.ai</div>
                  <div className="text-xs text-zinc-400">High quality, API key required</div>
                </button>
                <button
                  onClick={() => updateSetting("imageProvider", "stablehorde")}
                  className={`p-4 border-4 text-left transition-colors ${
                    settings.imageProvider === "stablehorde"
                      ? "border-white bg-white/10"
                      : "border-zinc-600 hover:border-white"
                  }`}
                  data-testid="img-stablehorde"
                >
                  <div className="font-bold">Stable Horde</div>
                  <div className="text-xs text-zinc-400">Community-powered, free</div>
                </button>
              </div>

              <div className="p-3 bg-white/10 border-2 border-white/30 text-sm">
                <strong>Pollinations.ai</strong> is recommended for quick concept art. It's free, fast, and requires no API key. 
                For production-quality sprites and animations, use MidJourney or Higgsfield.
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b-2 border-white pb-2">
              <Settings className="w-5 h-5" />
              <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Preferences</h2>
            </div>

            <div className="p-6 border-4 border-white bg-zinc-900 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold">Auto-Save Projects</h3>
                  <p className="text-sm text-zinc-400">Automatically save changes every 30 seconds</p>
                </div>
                <button
                  onClick={() => updateSetting("autoSave", !settings.autoSave)}
                  className={`w-12 h-6 border-2 transition-colors ${
                    settings.autoSave ? "bg-white border-white" : "bg-zinc-800 border-zinc-600"
                  }`}
                  data-testid="toggle-autosave"
                >
                  <div className={`w-4 h-4 bg-black rounded-none transition-transform ${
                    settings.autoSave ? "translate-x-6" : "translate-x-0.5"
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold">Theme</h3>
                  <p className="text-sm text-zinc-400">Application color scheme</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateSetting("theme", "dark")}
                    className={`px-4 py-2 text-sm font-bold border-2 ${
                      settings.theme === "dark" ? "bg-white text-black border-white" : "bg-zinc-800 border-zinc-600 hover:border-white"
                    }`}
                  >
                    Dark
                  </button>
                  <button
                    onClick={() => updateSetting("theme", "light")}
                    className={`px-4 py-2 text-sm font-bold border-2 ${
                      settings.theme === "light" ? "bg-white text-black border-white" : "bg-zinc-800 border-zinc-600 hover:border-white"
                    }`}
                  >
                    Light
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b-2 border-white pb-2">
              <Accessibility className="w-5 h-5" />
              <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Accessibility</h2>
            </div>

            <div className="p-6 border-4 border-white bg-zinc-900 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold flex items-center gap-2"><Contrast className="w-4 h-4" /> High Contrast Mode</h3>
                  <p className="text-sm text-zinc-400">Increase contrast for better visibility</p>
                </div>
                <button
                  onClick={toggleHighContrast}
                  className={`w-12 h-6 border-2 transition-colors ${
                    highContrast ? "bg-white border-white" : "bg-zinc-800 border-zinc-600"
                  }`}
                  data-testid="toggle-high-contrast"
                  aria-label={highContrast ? "Disable high contrast mode" : "Enable high contrast mode"}
                  role="switch"
                  aria-checked={highContrast}
                >
                  <div className={`w-4 h-4 bg-black rounded-none transition-transform ${
                    highContrast ? "translate-x-6" : "translate-x-0.5"
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold flex items-center gap-2"><Zap className="w-4 h-4" /> Reduced Motion</h3>
                  <p className="text-sm text-zinc-400">Minimize animations and transitions</p>
                </div>
                <button
                  onClick={toggleReducedMotion}
                  className={`w-12 h-6 border-2 transition-colors ${
                    reducedMotion ? "bg-white border-white" : "bg-zinc-800 border-zinc-600"
                  }`}
                  data-testid="toggle-reduced-motion"
                  aria-label={reducedMotion ? "Disable reduced motion" : "Enable reduced motion"}
                  role="switch"
                  aria-checked={reducedMotion}
                >
                  <div className={`w-4 h-4 bg-black rounded-none transition-transform ${
                    reducedMotion ? "translate-x-6" : "translate-x-0.5"
                  }`} />
                </button>
              </div>

              <div className="p-3 bg-white/10 border-2 border-white/30 text-sm">
                Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-black border border-zinc-600">?</kbd> anywhere to view all keyboard shortcuts.
              </div>
            </div>
          </section>

          {/* Developer Settings - API Keys */}
          {user && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b-2 border-white pb-2">
                <Code className="w-5 h-5" />
                <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Developer Settings</h2>
              </div>

              <div className="p-6 border-4 border-white bg-zinc-900 space-y-4">
                <div>
                  <h3 className="font-bold mb-2">External API Keys</h3>
                  <p className="text-sm text-zinc-400 mb-4">
                    Create API keys to integrate external applications with Press Start CoMixx. 
                    Use these keys to publish asset packs from third-party tools.
                  </p>
                </div>

                {/* Create new key */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Key name (e.g., My App)"
                    className="flex-1 p-3 border-2 border-white bg-black text-sm font-mono focus:outline-none"
                    data-testid="input-new-key-name"
                  />
                  <button
                    onClick={createApiKey}
                    disabled={isCreatingKey}
                    className="px-4 py-2 bg-white text-black font-black text-sm border-2 border-white hover:bg-zinc-200 disabled:opacity-50 flex items-center gap-2"
                    data-testid="button-create-api-key"
                  >
                    <Plus className="w-4 h-4" />
                    Create Key
                  </button>
                </div>

                {/* Newly created key display */}
                {newlyCreatedKey && (
                  <div className="p-4 bg-white/10 border-2 border-white space-y-2">
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <Key className="w-4 h-4" />
                      New API Key Created
                    </div>
                    <p className="text-xs text-zinc-400">Copy this key now. It won't be shown again!</p>
                    <div className="flex gap-2">
                      <input
                        type={showNewKey ? "text" : "password"}
                        value={newlyCreatedKey}
                        readOnly
                        className="flex-1 p-2 border-2 border-white bg-black text-sm font-mono"
                      />
                      <button
                        onClick={() => setShowNewKey(!showNewKey)}
                        className="px-3 py-2 bg-zinc-800 border-2 border-zinc-600 hover:border-white"
                      >
                        {showNewKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(newlyCreatedKey)}
                        className="px-3 py-2 bg-zinc-800 border-2 border-zinc-600 hover:border-white"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => setNewlyCreatedKey(null)}
                      className="text-xs text-zinc-400 hover:text-white"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Existing keys list */}
                <div className="space-y-2">
                  <h4 className="text-sm font-bold uppercase">Your API Keys</h4>
                  {isLoadingKeys ? (
                    <div className="text-sm text-zinc-400">Loading...</div>
                  ) : apiKeys.length === 0 ? (
                    <div className="text-sm text-zinc-400">No API keys yet. Create one above.</div>
                  ) : (
                    <div className="space-y-2">
                      {apiKeys.map((key) => (
                        <div key={key.id} className="flex items-center justify-between p-3 bg-black border-2 border-zinc-600">
                          <div className="flex-1">
                            <div className="font-bold text-sm">{key.name}</div>
                            <div className="text-xs text-zinc-400 font-mono">{key.keyPrefix}...</div>
                            <div className="text-xs text-zinc-500">
                              Created: {new Date(key.createdAt).toLocaleDateString()}
                              {key.lastUsed && ` • Last used: ${new Date(key.lastUsed).toLocaleDateString()}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs font-bold ${key.isActive ? 'bg-white text-black' : 'bg-zinc-700 text-zinc-400'}`}>
                              {key.isActive ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                            <button
                              onClick={() => deleteApiKey(key.id)}
                              className="p-2 bg-zinc-800 border-2 border-zinc-600 hover:border-white"
                              data-testid={`delete-key-${key.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-white/10 border-2 border-white/30 text-sm">
                  <strong>API Base URL:</strong> <code className="font-mono text-xs bg-black px-2 py-1">{window.location.origin}/api/v1</code>
                </div>
              </div>
            </section>
          )}

          <section className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Settings className="w-5 h-5" /> DATA & PRIVACY
            </h3>

            <div className="p-4 bg-zinc-900 border-4 border-zinc-700 space-y-4">
              <div>
                <h4 className="font-bold mb-2">Export Your Data</h4>
                <p className="text-sm text-zinc-400 mb-3">Download a copy of all your data including projects, assets, posts, and profile information.</p>
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch("/api/auth/export-data", { credentials: "include" });
                      if (!response.ok) throw new Error("Export failed");
                      const blob = await response.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `pscomixx-data-export-${Date.now()}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success("Data exported successfully");
                    } catch {
                      toast.error("Failed to export data");
                    }
                  }}
                  className="px-4 py-2 bg-white text-black font-bold border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all"
                  data-testid="button-export-data"
                >
                  EXPORT MY DATA
                </button>
              </div>

              <div className="border-t border-zinc-700 pt-4">
                <h4 className="font-bold mb-2 text-red-400">Delete Account</h4>
                <p className="text-sm text-zinc-400 mb-3">Permanently delete your account and all associated data. This action cannot be undone.</p>
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 bg-red-600 text-white font-bold border-4 border-red-800 shadow-[4px_4px_0px_0px_rgba(127,0,0,1)] hover:shadow-none transition-all"
                    data-testid="button-delete-account"
                  >
                    DELETE MY ACCOUNT
                  </button>
                ) : (
                  <div className="p-3 bg-red-900/30 border-2 border-red-600 space-y-3">
                    <p className="text-sm text-red-300 font-bold">Are you absolutely sure? This will permanently delete:</p>
                    <ul className="text-sm text-red-300 list-disc list-inside">
                      <li>All your projects and assets</li>
                      <li>Your social posts and messages</li>
                      <li>Your marketplace listings and reviews</li>
                      <li>Your profile and account data</li>
                    </ul>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch("/api/auth/account", { method: "DELETE", credentials: "include" });
                            if (!response.ok) throw new Error("Deletion failed");
                            toast.success("Account deleted. Redirecting...");
                            setTimeout(() => window.location.href = "/", 2000);
                          } catch {
                            toast.error("Failed to delete account");
                          }
                        }}
                        className="px-4 py-2 bg-red-600 text-white font-bold border-2 border-red-800 hover:bg-red-700"
                        data-testid="button-confirm-delete"
                      >
                        YES, DELETE EVERYTHING
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-4 py-2 bg-zinc-700 text-white font-bold border-2 border-zinc-600 hover:bg-zinc-600"
                        data-testid="button-cancel-delete"
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="p-4 bg-zinc-900 border-4 border-zinc-700 text-sm text-zinc-400">
            <p><strong className="text-white">Note:</strong> Settings are stored locally in your browser. To sync settings across devices, sign in with your Press Start CoMixx account.</p>
            <p className="mt-2">Logged in as: <strong className="text-white">{user?.email || "Guest"}</strong></p>
            <div className="mt-3 flex gap-4 text-xs">
              <a href="/privacy" className="text-zinc-300 hover:text-white underline" data-testid="link-privacy">Privacy Policy</a>
              <a href="/terms" className="text-zinc-300 hover:text-white underline" data-testid="link-terms">Terms of Service</a>
              <a href="/compliance" className="text-zinc-300 hover:text-white underline" data-testid="link-compliance">Compliance</a>
              <a href="/accessibility-statement" className="text-zinc-300 hover:text-white underline" data-testid="link-accessibility">Accessibility</a>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
