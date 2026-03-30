import { Layout } from "@/components/layout/Layout";
import { useFxStudio } from "@/hooks/useFxStudio";
import { useLocation } from "wouter";
import { useCallback, useEffect, useState } from "react";
import { Zap, ExternalLink, Sparkles, Wifi, WifiOff, CheckCircle } from "lucide-react";

export default function FxStudioPage() {
  const [, navigate] = useLocation();
  const fxStudio = useFxStudio({});
  const [apiStatus, setApiStatus] = useState<"checking" | "ok" | "error">("checking");

  useEffect(() => {
    fxStudio.openFxStudio({ mode: "fx" });
    fxStudio.checkApiConnection().then(ok => setApiStatus(ok ? "ok" : "error"));
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

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            {fxStudio.connected ? (
              <><Wifi className="w-3 h-3 text-green-400" /><span className="text-green-400">Tab Connected</span></>
            ) : fxStudio.isOpen ? (
              <><WifiOff className="w-3 h-3 text-yellow-400 animate-pulse" /><span className="text-yellow-400">Tab Open — Handshaking...</span></>
            ) : (
              <><WifiOff className="w-3 h-3 text-zinc-500" /><span className="text-zinc-500">Tab Closed</span></>
            )}
          </div>
          <span className="text-zinc-700">|</span>
          <div className="flex items-center gap-1.5">
            {apiStatus === "checking" ? (
              <><span className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse" /><span className="text-zinc-400">Checking API...</span></>
            ) : apiStatus === "ok" ? (
              <><CheckCircle className="w-3 h-3 text-green-400" /><span className="text-green-400">API Connected</span></>
            ) : (
              <><WifiOff className="w-3 h-3 text-red-400" /><span className="text-red-400">API Unreachable</span></>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {fxStudio.isOpen ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-purple-900/30 border border-purple-500/50 text-purple-300 text-sm">
              <span className={`w-2 h-2 rounded-full ${fxStudio.connected ? "bg-green-400" : "bg-yellow-400 animate-pulse"}`} />
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

        {!fxStudio.isOpen && (
          <p className="text-[11px] text-zinc-600 text-center max-w-sm">
            If the tab didn't open, your browser may have blocked the popup. Allow popups for this site and try again.
          </p>
        )}
      </div>
    </Layout>
  );
}
