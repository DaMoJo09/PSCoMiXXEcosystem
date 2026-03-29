import { Layout } from "@/components/layout/Layout";
import { useFxStudio } from "@/hooks/useFxStudio";
import { useLocation } from "wouter";
import { useCallback, useEffect } from "react";
import { Zap, ExternalLink, Sparkles } from "lucide-react";

export default function FxStudioPage() {
  const [, navigate] = useLocation();
  const fxStudio = useFxStudio({});

  useEffect(() => {
    fxStudio.openFxStudio({ mode: "fx" });
  }, []);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate("/");
    }
  }, [navigate]);

  return (
    <Layout>
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
        <div className="flex items-center gap-3">
          <Zap className="w-8 h-8 text-purple-400" />
          <h1 className="text-2xl font-bold text-white tracking-wide">FX STUDIO</h1>
        </div>
        <p className="text-zinc-400 text-sm text-center max-w-md">
          FX Studio opens in a separate tab at www.pscomixx.online. Any assets you create will sync back to your projects automatically.
        </p>
        <div className="flex items-center gap-3">
          {fxStudio.isOpen ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-purple-900/30 border border-purple-500/50 text-purple-300 text-sm">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              FX Studio is open in another tab
              <button
                onClick={() => fxStudio.openFxStudio()}
                className="ml-2 flex items-center gap-1 px-2 py-1 text-xs bg-purple-600 hover:bg-purple-500 text-white transition"
                data-testid="button-fx-focus"
              >
                <ExternalLink className="w-3 h-3" />
                Focus Tab
              </button>
            </div>
          ) : (
            <button
              onClick={() => fxStudio.openFxStudio({ mode: "fx" })}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium transition"
              data-testid="button-open-fx-studio"
            >
              <Sparkles className="w-5 h-5" />
              Open FX Studio
            </button>
          )}
          <button
            onClick={handleBack}
            className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition"
            data-testid="button-fx-back"
          >
            Back
          </button>
        </div>
      </div>
    </Layout>
  );
}
