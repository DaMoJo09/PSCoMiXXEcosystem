import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";

export default function SSOCallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const source = params.get("source");

    if (!token) {
      setError("No SSO token received");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/auth/sso/ecosystem-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, source }),
          credentials: "include",
        });
        if (!res.ok) {
          const data = await res.json();
          const detail = data.detail || data.message || "SSO login failed";
          const errorCode = data.error || "UNKNOWN";
          console.error(`[sso-callback] Login failed: ${errorCode} — ${detail} (request_id: ${data.request_id})`);
          setError(`${detail} (${errorCode})`);
          return;
        }
        const data = await res.json();
        console.log(`[sso-callback] Login success from ${source}, request_id: ${data.request_id}`);
        if (window.opener && source) {
          const OPENER_ORIGINS: Record<string, string> = {
            fxstudio: "https://www.pscomixx.online",
            streaming: "https://psstreaming.com",
            lms: "https://pressstart.tech",
          };
          const targetOrigin = OPENER_ORIGINS[source];
          if (targetOrigin) {
            try {
              window.opener.postMessage({ type: "sso-login-complete", source: "pscomixx", userId: data.user?.id }, targetOrigin);
            } catch {}
          }
        }
        window.location.href = "/";
      } catch (err) {
        console.error("[sso-callback] Connection error:", err);
        setError("Connection error during SSO login");
      }
    })();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center" data-testid="sso-error">
        <div className="border-2 border-red-500 bg-zinc-950 p-8 max-w-md text-center">
          <h2 className="text-red-400 font-bold text-xl mb-3 font-grotesk">SSO Login Failed</h2>
          <p className="text-zinc-400 mb-6">{error}</p>
          <a href="/auth" className="px-6 py-2 bg-white text-black font-bold hover:bg-zinc-200 transition" data-testid="sso-login-fallback">
            Sign in manually
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4" data-testid="sso-loading">
      <Spinner className="size-10 text-white" />
      <p className="text-zinc-400 font-grotesk">Signing you in across the ecosystem...</p>
    </div>
  );
}
