import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Loader2, Shield } from "lucide-react";
import { authApi } from "@/lib/api";
import { toast } from "sonner";

const LOCAL_KEY = "pscomixx_ai_consent_accepted_v1";

export function hasLocalAiConsent(): boolean {
  try { return localStorage.getItem(LOCAL_KEY) === "1"; } catch { return false; }
}

function setLocalAiConsent() {
  try { localStorage.setItem(LOCAL_KEY, "1"); } catch {}
}

export function useAiConsent() {
  const [hasConsent, setHasConsent] = useState<boolean>(hasLocalAiConsent());
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (hasLocalAiConsent()) return;
    let cancelled = false;
    authApi.getLegalStatus()
      .then((s) => {
        if (cancelled) return;
        if (s.aiConsentAcceptedAt) {
          setLocalAiConsent();
          setHasConsent(true);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Returns true if consent is in place. If not, opens the modal and returns
  // false; the caller should bail and let the modal flow drive the next step.
  const requireConsent = useCallback((): boolean => {
    if (hasConsent || hasLocalAiConsent()) return true;
    setShowModal(true);
    return false;
  }, [hasConsent]);

  const acceptConsent = useCallback(async () => {
    try {
      await authApi.acceptAiConsent();
      setLocalAiConsent();
      setHasConsent(true);
      setShowModal(false);
      return true;
    } catch (e: any) {
      toast.error(e?.message || "Could not record consent — please try again");
      return false;
    }
  }, []);

  return { hasConsent, showModal, setShowModal, requireConsent, acceptConsent };
}

interface AiConsentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => Promise<boolean> | boolean;
}

export function AiConsentModal({ open, onOpenChange, onAccept }: AiConsentModalProps) {
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (!open) setAgreed(false); }, [open]);

  const handleAccept = async () => {
    if (!agreed) {
      toast.error("Please confirm the checkbox to continue");
      return;
    }
    setSubmitting(true);
    try { await onAccept(); } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-4 border-white max-w-2xl max-h-[90vh] p-0" data-testid="ai-consent-modal">
        <DialogHeader className="p-6 border-b-4 border-white">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-purple-400" />
            <div>
              <DialogTitle className="text-xl font-black text-white font-display tracking-tight">
                AI TOOLS — TRANSPARENCY & CONSENT
              </DialogTitle>
              <DialogDescription className="text-gray-400 font-mono text-xs mt-1">
                Required before using any AI-powered creation tool
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[400px] p-6">
          <div className="space-y-5 text-white font-mono text-sm">
            <section>
              <h3 className="text-base font-bold mb-2 border-b border-gray-700 pb-1">WHAT AI WE USE</h3>
              <p className="text-gray-300 leading-relaxed">
                Press Start CoMiXX, FX Studio, and Motion Studio use AI models to:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
                <li>Stylize, restyle, and transform images you upload or capture</li>
                <li>Remove backgrounds and isolate characters</li>
                <li>Generate visual effects, sprites, and motion frames</li>
                <li>Suggest text, dialogue, and story prompts</li>
              </ul>
            </section>

            <section>
              <h3 className="text-base font-bold mb-2 border-b border-gray-700 pb-1">DATA SENT TO AI PROVIDERS</h3>
              <p className="text-gray-300 leading-relaxed">
                When you use an AI tool, the input you provide (images, drawings, text prompts)
                is transmitted to third-party AI providers to perform the requested operation.
                We do not sell your content. We do not use your private projects to train AI
                models without your explicit, separate opt-in.
              </p>
            </section>

            <section>
              <h3 className="text-base font-bold mb-2 border-b border-gray-700 pb-1">PROVIDERS</h3>
              <p className="text-gray-300 leading-relaxed">
                AI requests may be routed to one or more of: OpenAI, Stability AI, Replicate,
                and other approved providers, depending on the feature. Provider selection is
                logged with each generation for audit. The full current provider list is in
                our Privacy Policy.
              </p>
            </section>

            <section>
              <h3 className="text-base font-bold mb-2 border-b border-gray-700 pb-1">OWNERSHIP & USAGE RIGHTS</h3>
              <p className="text-gray-300 leading-relaxed">
                You retain ownership of inputs you create. AI-generated outputs are licensed
                to you for use in your projects. You are responsible for ensuring inputs do
                not infringe third-party rights and that AI outputs are used in compliance
                with applicable law.
              </p>
            </section>

            <section>
              <h3 className="text-base font-bold mb-2 border-b border-gray-700 pb-1">MINORS (UNDER 18)</h3>
              <p className="text-gray-300 leading-relaxed">
                If you are under 18, a parent, guardian, or supervising educator must
                provide consent before AI tools are enabled on your account. If you are
                under 13, AI tool access is restricted by default and requires verifiable
                parental consent under COPPA.
              </p>
            </section>

            <section>
              <h3 className="text-base font-bold mb-2 border-b border-gray-700 pb-1">YOUR CONTROL</h3>
              <p className="text-gray-300 leading-relaxed">
                You may withdraw AI consent at any time from{" "}
                <span className="text-white font-bold">Settings → Privacy</span>.
                Withdrawing consent disables AI features but does not delete prior outputs.
                You may delete your account and all associated data at any time.
              </p>
            </section>

            <section>
              <p className="text-gray-500 leading-relaxed text-xs">
                For full details see our <a href="/privacy" target="_blank" className="text-cyan-400 underline">Privacy Policy</a> and{" "}
                <a href="/terms" target="_blank" className="text-cyan-400 underline">Terms of Service</a>.
              </p>
            </section>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t-4 border-white bg-gray-950">
          <div className="w-full space-y-4">
            <div className="flex items-start gap-3 p-4 bg-gray-900 border border-gray-700">
              <Checkbox
                id="ai-consent-agree"
                checked={agreed}
                onCheckedChange={(c) => setAgreed(c === true)}
                className="mt-1 border-white data-[state=checked]:bg-white data-[state=checked]:text-black"
                data-testid="ai-consent-checkbox"
              />
              <label htmlFor="ai-consent-agree" className="text-sm text-gray-300 font-mono leading-relaxed cursor-pointer">
                I understand that AI tools will process my inputs through third-party
                providers, I have read the disclosures above, and I consent to this
                processing. I confirm I have authority to provide this consent
                (including parental/guardian consent if I am under 18).
              </label>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
                className="flex-1 bg-transparent border-2 border-gray-700 text-gray-300 hover:bg-gray-900 font-bold py-3"
                data-testid="ai-consent-decline"
              >
                NOT NOW
              </Button>
              <Button
                onClick={handleAccept}
                disabled={!agreed || submitting}
                className="flex-1 bg-white text-black hover:bg-gray-200 font-bold py-3 border-4 border-black disabled:opacity-50"
                data-testid="ai-consent-accept"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
                ACCEPT & CONTINUE
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
