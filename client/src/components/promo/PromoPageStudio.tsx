/**
 * Promo Page Studio
 * School-safe in-comic ad/promo page system. Four types:
 *   - platform: first-party PSCoMiXX promos (no extra label)
 *   - sponsor:  approved sponsor placements (REQUIRES "SPONSORED PAGE" label)
 *   - student:  classroom media-literacy assignments (REQUIRES "STUDENT-CREATED PROMO" label)
 *   - creator:  user-created self-promotion (REQUIRES "CREATOR PROMO" label)
 *
 * Renderer enforces the mandatory label — it cannot be turned off, restyled,
 * or recolored via custom data. The label uses fixed yellow-on-black so it
 * remains legible regardless of template colors.
 *
 * No third-party tracking pixels. Image URLs are restricted to a vetted
 * allowlist of hosts (own backend, R2 storage, public stock CDNs).
 */

// Locked styling for the mandatory promo label. Cannot be overridden.
const MANDATORY_LABEL_BG = "#000000";
const MANDATORY_LABEL_FG = "#fde047"; // yellow-300 — high contrast on black
const MANDATORY_LABEL_BORDER = "#fde047";

// Allowlist of image hosts that may render in promo pages. Anything outside
// this list is replaced with a placeholder. This blocks tracking-pixel style
// requests and ensures students never trigger calls to arbitrary servers.
const PROMO_IMAGE_ALLOWED_HOSTS = [
  // Own infra
  "pscomixx.com",
  "psstreaming.com",
  // Replit dev/prod hosts — allowed for relative paths and our own assets
  "replit.dev",
  "replit.app",
  "repl.co",
  // R2/S3-style storage commonly used for our assets
  "r2.cloudflarestorage.com",
  "s3.amazonaws.com",
  // Free vetted stock CDNs
  "images.unsplash.com",
  "images.pexels.com",
];

function isPromoImageAllowed(url: string | undefined | null): boolean {
  if (!url) return false;
  // Same-origin or relative paths are always allowed (served by our backend).
  if (url.startsWith("/") || url.startsWith("data:") || url.startsWith("blob:")) return true;
  try {
    const u = new URL(url, window.location.origin);
    if (u.origin === window.location.origin) return true;
    return PROMO_IMAGE_ALLOWED_HOSTS.some(h => u.hostname === h || u.hostname.endsWith("." + h));
  } catch {
    return false;
  }
}
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, Megaphone, GraduationCap, User as UserIcon, Loader2, Check, X, Building2 } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/queryClient";

export type PromoType = "platform" | "sponsor" | "student" | "creator";

export interface PromoTemplate {
  id: string;
  title: string;
  type: PromoType;
  status: "draft" | "pending_review" | "approved" | "rejected";
  audience: "all" | "creator" | "student" | "teacher" | "school";
  layoutStyle: string;
  thumbnailUrl: string | null;
  templateJson: PromoTemplateData;
  isSchoolSafe: boolean;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromoTemplateData {
  headline?: string;
  subheadline?: string;
  bodyCopy?: string;
  ctaText?: string;
  ctaUrl?: string;
  imageUrl?: string;
  logoUrl?: string;
  qrUrl?: string;
  backgroundColor?: string;
  accentColor?: string;
  textColor?: string;
}

export type PromoCustomData = Partial<PromoTemplateData>;

export const PROMO_TYPE_META: Record<PromoType, { label: string; icon: typeof Sparkles; required: string | null; description: string }> = {
  platform: { label: "Platform", icon: Sparkles, required: null, description: "Official PSCoMiXX promos" },
  sponsor:  { label: "Sponsored", icon: Building2, required: "SPONSORED PAGE", description: "Approved sponsor placements" },
  student:  { label: "Student-Created", icon: GraduationCap, required: "STUDENT-CREATED PROMO", description: "Classroom media-literacy assignments" },
  creator:  { label: "Creator Promo", icon: UserIcon, required: "CREATOR PROMO", description: "Promote your work" },
};

/* ==========================================================================
 * RENDERER — the actual promo page output. Used in studio preview, in the
 * comic creator overview between spreads, and in the export pipeline.
 * The required label is rendered ALWAYS for sponsor/student/creator types
 * and cannot be suppressed by custom data.
 * ========================================================================== */
export function PromoPageRenderer({
  template,
  customData,
  className,
}: {
  template: PromoTemplate | { type: PromoType; layoutStyle: string; templateJson: PromoTemplateData; title?: string };
  customData?: PromoCustomData;
  className?: string;
}) {
  const data: PromoTemplateData = useMemo(() => ({
    ...template.templateJson,
    ...(customData || {}),
  }), [template, customData]);

  const requiredLabel = PROMO_TYPE_META[template.type].required;
  const bg = data.backgroundColor || "#1a1a1a";
  const accent = data.accentColor || "#fbbf24";
  const text = data.textColor || "#ffffff";

  return (
    <div
      className={`relative w-full h-full flex flex-col ${className || ""}`}
      style={{ backgroundColor: bg, color: text, aspectRatio: "8.5 / 11" }}
      data-testid="promo-page-render"
    >
      {/* Mandatory label — strip across the top, always visible.
          Colors are HARDCODED and cannot be overridden by template/custom data,
          so a malicious editor cannot hide the label by recoloring the accent. */}
      {requiredLabel && (
        <div
          className="w-full px-3 py-1.5 text-[10px] font-bold tracking-widest text-center uppercase border-b-2"
          style={{
            backgroundColor: MANDATORY_LABEL_BG,
            color: MANDATORY_LABEL_FG,
            borderColor: MANDATORY_LABEL_BORDER,
          }}
          data-testid="promo-required-label"
        >
          {requiredLabel}
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3 overflow-hidden">
        {data.logoUrl && isPromoImageAllowed(data.logoUrl) && (
          <img src={data.logoUrl} alt="logo" className="max-h-12 mb-2 object-contain" referrerPolicy="no-referrer" />
        )}

        {data.headline && (
          <h1
            className="text-3xl md:text-4xl font-black uppercase leading-tight tracking-tight"
            style={{ color: accent, textShadow: "2px 2px 0 rgba(0,0,0,0.4)" }}
          >
            {data.headline}
          </h1>
        )}

        {data.subheadline && (
          <p className="text-base md:text-lg font-bold uppercase opacity-90">
            {data.subheadline}
          </p>
        )}

        {data.imageUrl && isPromoImageAllowed(data.imageUrl) && (
          <img src={data.imageUrl} alt="" className="max-h-48 my-2 object-contain" referrerPolicy="no-referrer" />
        )}

        {data.bodyCopy && (
          <p className="text-sm md:text-base max-w-md opacity-90 leading-relaxed">
            {data.bodyCopy}
          </p>
        )}

        {data.ctaText && (
          <div
            className="mt-3 px-6 py-2.5 font-bold uppercase tracking-wider text-sm border-2"
            style={{ backgroundColor: accent, color: bg, borderColor: text }}
          >
            {data.ctaText}
          </div>
        )}

        {data.qrUrl && (
          <div className="mt-2 text-xs opacity-70">{data.qrUrl}</div>
        )}
      </div>

      {/* Footer brand mark — minimal, just identifies what this is. */}
      <div className="px-3 py-1.5 text-[9px] uppercase tracking-widest opacity-50 text-center border-t border-white/10">
        Promo Page · PSCoMiXX
      </div>
    </div>
  );
}

/* ==========================================================================
 * STUDIO — gallery + editor + insertion. Modal dialog opened from the
 * Comic Creator. Lists templates the current user is allowed to use
 * (server enforces school-safe + role + approval filters).
 * ========================================================================== */
export interface PromoInsertPayload {
  templateId: string;
  templateSnapshot: PromoTemplate;
  customData: PromoCustomData;
  pageIndex: number;
}

interface StudioProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insertAtPageIndex: number;
  onInsert: (payload: PromoInsertPayload) => void;
  projectId?: string | null;
}

export function PromoPageStudio({ open, onOpenChange, insertAtPageIndex, onInsert, projectId }: StudioProps) {
  const [activeType, setActiveType] = useState<PromoType>("platform");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customData, setCustomData] = useState<PromoCustomData>({});
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery<PromoTemplate[]>({
    queryKey: ["promo-templates", activeType],
    queryFn: async () => {
      const res = await fetch(`/api/promo/templates?type=${encodeURIComponent(activeType)}`);
      if (res.status === 403) return [];
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: open,
  });

  // Reset selection when type changes or dialog reopens.
  useEffect(() => { setSelectedId(null); setCustomData({}); }, [activeType, open]);

  const selected = useMemo(() => templates.find(t => t.id === selectedId) || null, [templates, selectedId]);

  const insertMutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("No template selected");
      // Best-effort tracking record; if no projectId yet, skip silently.
      if (projectId) {
        try {
          await apiRequest("POST", `/api/promo/projects/${projectId}/instances`, {
            templateId: selected.id,
            pageIndex: insertAtPageIndex,
            customDataJson: customData,
          });
        } catch (err) {
          // Don't block insertion — local insertion is the source of truth.
          console.warn("[promo] instance tracking failed (non-fatal):", err);
        }
      }
      return selected;
    },
    onSuccess: (template) => {
      onInsert({
        templateId: template.id,
        templateSnapshot: template,
        customData,
        pageIndex: insertAtPageIndex,
      });
      queryClient.invalidateQueries({ queryKey: ["promo-templates"] });
      toast.success("Promo page added to your comic");
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to add promo page");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] bg-zinc-950 border-zinc-700 text-white flex flex-col" data-testid="dialog-promo-studio">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Megaphone className="w-5 h-5 text-amber-400" /> Promo Page Studio
          </DialogTitle>
          <p className="text-xs text-zinc-400">
            School-safe promo pages. No tracking pixels. No behavioral targeting.
            Inserts between page {insertAtPageIndex} and {insertAtPageIndex + 1}.
          </p>
        </DialogHeader>

        <Tabs value={activeType} onValueChange={(v) => setActiveType(v as PromoType)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="bg-zinc-900 border border-zinc-700 self-start">
            {(Object.keys(PROMO_TYPE_META) as PromoType[]).map(t => {
              const m = PROMO_TYPE_META[t];
              const Icon = m.icon;
              return (
                <TabsTrigger key={t} value={t} data-testid={`tab-promo-${t}`} className="text-xs data-[state=active]:bg-zinc-700">
                  <Icon className="w-3.5 h-3.5 mr-1.5" /> {m.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={activeType} className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 min-h-0 overflow-hidden">
            {/* GALLERY */}
            <ScrollArea className="border border-zinc-800 rounded p-2 h-[55vh]">
              {isLoading ? (
                <div className="flex items-center gap-2 p-4 text-sm text-zinc-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading templates...
                </div>
              ) : templates.length === 0 ? (
                <div className="p-4 text-sm text-zinc-500 text-center">
                  {activeType === "sponsor"
                    ? "No sponsor templates available right now."
                    : "No templates yet."}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {templates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setSelectedId(t.id); setCustomData({}); }}
                      data-testid={`promo-template-${t.id}`}
                      data-active={t.id === selectedId}
                      className={`text-left p-2 border transition rounded ${t.id === selectedId ? "border-amber-500 bg-amber-950/30" : "border-zinc-800 hover:border-zinc-600 bg-zinc-900"}`}
                    >
                      <div className="aspect-[8.5/11] bg-zinc-800 mb-1 overflow-hidden flex items-center justify-center">
                        {t.thumbnailUrl ? (
                          <img src={t.thumbnailUrl} alt={t.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full scale-[0.95] origin-center">
                            <PromoPageRenderer template={t} />
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-bold truncate">{t.title}</p>
                      <p className="text-[10px] text-zinc-500">{t.layoutStyle}</p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* EDITOR */}
            <div className="flex flex-col h-[55vh] gap-3 overflow-hidden">
              {selected ? (
                <>
                  <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
                    <div>
                      <Label className="text-xs text-zinc-400">Headline</Label>
                      <Input
                        value={customData.headline ?? selected.templateJson.headline ?? ""}
                        onChange={(e) => setCustomData(d => ({ ...d, headline: e.target.value }))}
                        className="bg-zinc-900 border-zinc-700 text-white"
                        data-testid="input-promo-headline"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-zinc-400">Subheadline</Label>
                      <Input
                        value={customData.subheadline ?? selected.templateJson.subheadline ?? ""}
                        onChange={(e) => setCustomData(d => ({ ...d, subheadline: e.target.value }))}
                        className="bg-zinc-900 border-zinc-700 text-white"
                        data-testid="input-promo-subheadline"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-zinc-400">Body</Label>
                      <Textarea
                        rows={3}
                        value={customData.bodyCopy ?? selected.templateJson.bodyCopy ?? ""}
                        onChange={(e) => setCustomData(d => ({ ...d, bodyCopy: e.target.value }))}
                        className="bg-zinc-900 border-zinc-700 text-white"
                        data-testid="input-promo-body"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-zinc-400">CTA text</Label>
                        <Input
                          value={customData.ctaText ?? selected.templateJson.ctaText ?? ""}
                          onChange={(e) => setCustomData(d => ({ ...d, ctaText: e.target.value }))}
                          className="bg-zinc-900 border-zinc-700 text-white"
                          data-testid="input-promo-cta-text"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-400">CTA / QR URL</Label>
                        <Input
                          value={customData.ctaUrl ?? selected.templateJson.ctaUrl ?? ""}
                          onChange={(e) => setCustomData(d => ({ ...d, ctaUrl: e.target.value, qrUrl: e.target.value }))}
                          placeholder="https://..."
                          className="bg-zinc-900 border-zinc-700 text-white"
                          data-testid="input-promo-cta-url"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-zinc-400">Background</Label>
                        <Input
                          type="color"
                          value={customData.backgroundColor ?? selected.templateJson.backgroundColor ?? "#1a1a1a"}
                          onChange={(e) => setCustomData(d => ({ ...d, backgroundColor: e.target.value }))}
                          className="bg-zinc-900 border-zinc-700 h-9 p-1"
                          data-testid="input-promo-bg"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-400">Accent</Label>
                        <Input
                          type="color"
                          value={customData.accentColor ?? selected.templateJson.accentColor ?? "#fbbf24"}
                          onChange={(e) => setCustomData(d => ({ ...d, accentColor: e.target.value }))}
                          className="bg-zinc-900 border-zinc-700 h-9 p-1"
                          data-testid="input-promo-accent"
                        />
                      </div>
                    </div>
                    <div className="border border-zinc-800 rounded">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider px-2 py-1 border-b border-zinc-800">Preview</div>
                      <div className="aspect-[8.5/11] max-h-[300px] mx-auto">
                        <PromoPageRenderer template={selected} customData={customData} />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-zinc-500 border border-dashed border-zinc-800 rounded">
                  Pick a template to start editing.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t border-zinc-800 pt-3 mt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} data-testid="button-promo-cancel">
            <X className="w-4 h-4 mr-1.5" /> Cancel
          </Button>
          <Button
            onClick={() => insertMutation.mutate()}
            disabled={!selected || insertMutation.isPending}
            className="bg-amber-600 hover:bg-amber-700 text-white"
            data-testid="button-promo-insert"
          >
            {insertMutation.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
            Add to Comic
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
