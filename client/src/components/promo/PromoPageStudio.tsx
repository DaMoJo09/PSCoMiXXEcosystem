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
import { Sparkles, Send, Megaphone, GraduationCap, User as UserIcon, Loader2, Check, X, Building2, ImageIcon, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/queryClient";
import { ImageUpload } from "@/components/ImageUpload";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Vintage filter presets — applied as a CSS `filter:` string to all promo
// images. Picked to evoke specific old-school looks without re-rendering.
export const VINTAGE_FILTERS: Record<string, { label: string; css: string }> = {
  none:        { label: "None",                   css: "" },
  sepia:       { label: "Sepia (yellowed paper)", css: "sepia(80%) contrast(95%) brightness(95%) saturate(110%)" },
  bw:          { label: "Black & White",          css: "grayscale(100%) contrast(110%)" },
  newsprint:   { label: "Newsprint",              css: "grayscale(100%) contrast(180%) brightness(95%)" },
  faded:       { label: "Faded Vintage",          css: "saturate(40%) brightness(105%) contrast(85%)" },
  punchy:      { label: "Punchy Comic",           css: "saturate(160%) contrast(125%) brightness(98%)" },
  warmComic:   { label: "Warm Comic",             css: "sepia(35%) saturate(150%) brightness(105%) contrast(110%)" },
  coolComic:   { label: "Cool Comic",             css: "hue-rotate(15deg) saturate(115%) contrast(115%) brightness(102%)" },
  cyanotype:   { label: "Cyanotype Blueprint",    css: "grayscale(100%) sepia(60%) hue-rotate(160deg) saturate(280%)" },
  noir:        { label: "Noir Halftone",          css: "grayscale(100%) contrast(160%) brightness(85%)" },
};

// Build the image style object once per image. Returns CSS that applies the
// chosen vintage filter, scale, and object-position pulled from the merged
// promo data. Safe to spread into any inline style — falls back to defaults
// when fields are missing.
export function getPromoImageStyle(data: PromoTemplateData): React.CSSProperties {
  const filterKey = (data.imageFilter && VINTAGE_FILTERS[data.imageFilter]) ? data.imageFilter : "none";
  const filterCss = VINTAGE_FILTERS[filterKey].css;
  const scale = typeof data.imageScale === "number" ? Math.max(25, Math.min(250, data.imageScale)) / 100 : 1;
  const px = typeof data.imagePositionX === "number" ? Math.max(0, Math.min(100, data.imagePositionX)) : 50;
  const py = typeof data.imagePositionY === "number" ? Math.max(0, Math.min(100, data.imagePositionY)) : 50;
  return {
    filter: filterCss || undefined,
    objectPosition: `${px}% ${py}%`,
    transform: scale !== 1 ? `scale(${scale})` : undefined,
    transformOrigin: "center center",
  };
}

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
  // Image transform / look controls (apply to ALL images in the page)
  imageFilter?: string;          // key into VINTAGE_FILTERS
  imageScale?: number;           // 25..250 (% of natural size)
  imagePositionX?: number;       // 0..100 — object-position X %
  imagePositionY?: number;       // 0..100 — object-position Y %
  // Used by the vintage-triple-feature layout for per-strip content.
  strips?: PromoStrip[];
}

export interface PromoStrip {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  badge?: string;
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

  // The vintage layouts have their own complete looks (paper textures, fixed
  // palettes), so they ignore the editable color fields. The classic/magazine/
  // trading-card/event-flyer layouts still respect them.
  const layoutStyle = template.layoutStyle || "classic-comic";

  // Always wrap in the safety frame: mandatory disclosure label on top, brand
  // mark on bottom. The inner body changes per layoutStyle.
  return (
    <div
      className={`relative w-full h-full flex flex-col ${className || ""}`}
      style={{ aspectRatio: "8.5 / 11" }}
      data-testid="promo-page-render"
    >
      {/* Mandatory label — strip across the top, always visible.
          Colors are HARDCODED and cannot be overridden by template/custom data,
          so a malicious editor cannot hide the label by recoloring the accent. */}
      {requiredLabel && (
        <div
          className="w-full px-3 py-1.5 text-[10px] font-bold tracking-widest text-center uppercase border-b-2 z-10"
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

      <div className="flex-1 relative overflow-hidden">
        {layoutStyle === "vintage-mail-order"   && <VintageMailOrderBody data={data} />}
        {layoutStyle === "vintage-novelty"      && <VintageNoveltyBody data={data} />}
        {layoutStyle === "vintage-triple-feature" && <VintageTripleFeatureBody data={data} />}
        {(layoutStyle !== "vintage-mail-order" &&
          layoutStyle !== "vintage-novelty" &&
          layoutStyle !== "vintage-triple-feature") && <ModernBody data={data} />}
      </div>

      {/* Footer brand mark — minimal, just identifies what this is. */}
      <div className="px-3 py-1.5 text-[9px] uppercase tracking-widest text-center border-t z-10"
        style={{ backgroundColor: "rgba(0,0,0,0.85)", color: "#9ca3af", borderColor: "rgba(255,255,255,0.1)" }}>
        Promo Page · PSCoMiXX
      </div>
    </div>
  );
}

/* ---- Layout body components ---- */

// Original layout, kept for backward compat with existing seeds.
function ModernBody({ data }: { data: PromoTemplateData }) {
  const bg = data.backgroundColor || "#1a1a1a";
  const accent = data.accentColor || "#fbbf24";
  const text = data.textColor || "#ffffff";
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 gap-3"
      style={{ backgroundColor: bg, color: text }}>
      {data.logoUrl && isPromoImageAllowed(data.logoUrl) && (
        <img src={data.logoUrl} alt="logo" className="max-h-12 mb-2 object-contain" referrerPolicy="no-referrer" />
      )}
      {data.headline && (
        <h1 className="text-3xl md:text-4xl font-black uppercase leading-tight tracking-tight"
          style={{ color: accent, textShadow: "2px 2px 0 rgba(0,0,0,0.4)" }}>
          {data.headline}
        </h1>
      )}
      {data.subheadline && (
        <p className="text-base md:text-lg font-bold uppercase opacity-90">{data.subheadline}</p>
      )}
      {data.imageUrl && isPromoImageAllowed(data.imageUrl) && (
        <img src={data.imageUrl} alt="" className="max-h-48 my-2 object-contain" referrerPolicy="no-referrer" style={getPromoImageStyle(data)} />
      )}
      {data.bodyCopy && (
        <p className="text-sm md:text-base max-w-md opacity-90 leading-relaxed">{data.bodyCopy}</p>
      )}
      {data.ctaText && (
        <div className="mt-3 px-6 py-2.5 font-bold uppercase tracking-wider text-sm border-2"
          style={{ backgroundColor: accent, color: bg, borderColor: text }}>
          {data.ctaText}
        </div>
      )}
      {data.qrUrl && <div className="mt-2 text-xs opacity-70">{data.qrUrl}</div>}
    </div>
  );
}

/* Vintage palettes are fixed — they're the whole point of the look.
   Cream paper, classic comic-ad red, mustard-yellow accent panel. */
const VINTAGE_PAPER_BG     = "#f4ecd5";
const VINTAGE_PAPER_BG_ALT = "#f5d83d"; // yellow novelty paper
const VINTAGE_INK          = "#1a1a1a";
const VINTAGE_RED          = "#c8342b";
const VINTAGE_RED_DARK     = "#8a1f18";
const VINTAGE_COUPON_BG    = "#e8c93a";

// Subtle paper-grain via SVG noise — keeps file size tiny, no external asset.
const PAPER_GRAIN_BG: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.55  0 0 0 0 0.45  0 0 0 0 0.25  0 0 0 0.18 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
  backgroundBlendMode: "multiply",
};

/**
 * "How to Hypnotize" style — single bold red headline arcing top, big
 * illustration on the right, body paragraph + mail-order coupon along the
 * bottom. Cream paper texture throughout.
 */
function VintageMailOrderBody({ data }: { data: PromoTemplateData }) {
  return (
    <div className="absolute inset-0 flex flex-col p-3 sm:p-4"
      style={{ backgroundColor: VINTAGE_PAPER_BG, color: VINTAGE_INK, ...PAPER_GRAIN_BG }}>
      {/* Top half: headline + hero illustration on a black panel */}
      <div className="relative flex-[1.2] border-2 overflow-hidden"
        style={{ backgroundColor: "#0a0a0a", borderColor: VINTAGE_INK }}>
        {data.headline && (
          <h1
            className="absolute top-2 left-3 right-3 font-black uppercase leading-none z-10"
            style={{
              color: VINTAGE_RED,
              fontFamily: "'Bangers', 'Anton', 'Impact', sans-serif",
              fontSize: "clamp(2.4rem, 7vw, 5rem)",
              letterSpacing: "0.01em",
              textShadow: "3px 3px 0 #000, 5px 5px 0 rgba(0,0,0,0.4)",
              transform: "rotate(-2deg)",
            }}
          >
            {data.headline}
          </h1>
        )}
        {data.imageUrl && isPromoImageAllowed(data.imageUrl) && (
          <img src={data.imageUrl} alt="" referrerPolicy="no-referrer"
            className="absolute right-2 bottom-2 max-h-[85%] max-w-[60%] object-contain"
            style={getPromoImageStyle(data)} />
        )}
      </div>

      {/* Sub headline strip */}
      {data.subheadline && (
        <div className="my-1 italic font-bold text-base sm:text-lg leading-tight"
          style={{ color: VINTAGE_INK, fontFamily: "Georgia, serif" }}>
          {data.subheadline}
        </div>
      )}

      {/* Bottom half: body copy left, coupon box right */}
      <div className="flex-1 flex gap-2 mt-1">
        <div className="flex-[1.4] text-[11px] sm:text-xs leading-snug overflow-hidden"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif", columnCount: 1 }}>
          {data.bodyCopy && <p className="whitespace-pre-line">{data.bodyCopy}</p>}
        </div>
        <div className="flex-1 border-2 p-2 flex flex-col"
          style={{ backgroundColor: VINTAGE_COUPON_BG, borderColor: VINTAGE_INK }}>
          <div className="text-center font-black text-xs uppercase border-b-2 pb-1 mb-1"
            style={{ backgroundColor: VINTAGE_RED, color: "#fff", borderColor: VINTAGE_INK,
              fontFamily: "'Bangers', 'Anton', sans-serif" }}>
            {data.ctaText || "Mail Coupon Today"}
          </div>
          <div className="text-[9px] sm:text-[10px] leading-tight space-y-0.5"
            style={{ fontFamily: "Georgia, serif" }}>
            <div>Name: ____________________</div>
            <div>Address: __________________</div>
            <div>City: ______ State: ____ Zip: ____</div>
            {data.qrUrl && <div className="mt-1 italic">Visit: {data.qrUrl}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * "X-Ray Spex" style — bright yellow background, bold red headline, dense
 * column copy in 2 sub-sections, small product illo strip at bottom.
 */
function VintageNoveltyBody({ data }: { data: PromoTemplateData }) {
  return (
    <div className="absolute inset-0 flex flex-col p-3 sm:p-4"
      style={{ backgroundColor: VINTAGE_PAPER_BG_ALT, color: VINTAGE_INK, ...PAPER_GRAIN_BG }}>
      {/* Banner */}
      <div className="border-2 px-3 py-2 mb-2 flex items-center gap-3"
        style={{ borderColor: VINTAGE_INK, backgroundColor: VINTAGE_PAPER_BG_ALT }}>
        <div className="flex-1">
          {data.headline && (
            <h1 className="font-black uppercase leading-none"
              style={{
                color: VINTAGE_RED,
                fontFamily: "'Bangers', 'Anton', 'Impact', sans-serif",
                fontSize: "clamp(1.8rem, 5.5vw, 3.6rem)",
                letterSpacing: "0.01em",
                textShadow: "2px 2px 0 #000",
              }}>
              {data.headline}
            </h1>
          )}
          {data.subheadline && (
            <p className="text-xs sm:text-sm font-bold italic mt-1" style={{ fontFamily: "Georgia, serif" }}>
              {data.subheadline}
            </p>
          )}
        </div>
        {data.logoUrl && isPromoImageAllowed(data.logoUrl) && (
          <img src={data.logoUrl} alt="" referrerPolicy="no-referrer" className="max-h-20 max-w-[35%] object-contain" style={getPromoImageStyle(data)} />
        )}
      </div>

      {/* Two-column body */}
      {data.bodyCopy && (
        <div className="flex-1 text-[10px] sm:text-xs leading-snug overflow-hidden"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif", columnCount: 2, columnGap: "0.75rem" }}>
          <p className="whitespace-pre-line">{data.bodyCopy}</p>
        </div>
      )}

      {/* Bottom strip: product image + CTA box */}
      <div className="mt-2 flex gap-2 items-stretch">
        {data.imageUrl && isPromoImageAllowed(data.imageUrl) && (
          <div className="flex-1 border-2 overflow-hidden"
            style={{ borderColor: VINTAGE_INK, backgroundColor: "#000" }}>
            <img src={data.imageUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full max-h-32 object-contain" style={getPromoImageStyle(data)} />
          </div>
        )}
        <div className="flex-1 flex flex-col justify-center px-3 py-2 border-2 text-center"
          style={{ backgroundColor: VINTAGE_RED, color: "#fff", borderColor: VINTAGE_INK }}>
          <div className="font-black uppercase text-base sm:text-xl leading-tight"
            style={{ fontFamily: "'Bangers', 'Anton', sans-serif" }}>
            {data.ctaText || "Send No Money!"}
          </div>
          {data.qrUrl && <div className="text-[10px] mt-1 opacity-90">{data.qrUrl}</div>}
        </div>
      </div>
    </div>
  );
}

/**
 * "My Son the Man-Wolf!" style — three horizontal strips, each promoting a
 * different title. Strips come from `data.strips: { title, subtitle, imageUrl,
 * badge }[]`. If no strips are provided, a default 3-strip placeholder shows.
 */
function VintageTripleFeatureBody({ data }: { data: PromoTemplateData }) {
  const strips: PromoStrip[] = Array.isArray(data.strips) ? data.strips : [];
  const padded: PromoStrip[] = [0, 1, 2].map(i => strips[i] || {});
  const stripBgs = ["#fff7d6", "#0a0a0a", "#ffd9d9"]; // light, dark, pink — vintage variety

  return (
    <div className="absolute inset-0 flex flex-col"
      style={{ backgroundColor: VINTAGE_PAPER_BG, ...PAPER_GRAIN_BG }}>
      {padded.map((s, i) => {
        const dark = i === 1;
        const stripBg = stripBgs[i];
        return (
          <div key={i}
            className="flex-1 flex items-stretch border-b-2 overflow-hidden"
            style={{ backgroundColor: stripBg, borderColor: VINTAGE_INK, color: dark ? "#fff" : VINTAGE_INK }}>
            {/* Image / illustration */}
            <div className="w-2/5 border-r-2 flex items-center justify-center"
              style={{ borderColor: VINTAGE_INK, backgroundColor: dark ? "#000" : "rgba(0,0,0,0.04)" }}>
              {s.imageUrl && isPromoImageAllowed(s.imageUrl) ? (
                <img src={s.imageUrl} alt="" referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain" style={getPromoImageStyle(data)} />
              ) : (
                <div className="text-xs italic opacity-60 text-center px-2">Cover art slot {i + 1}</div>
              )}
            </div>
            {/* Title block */}
            <div className="flex-1 relative p-2 sm:p-3 flex flex-col justify-center">
              {s.subtitle && (
                <p className="text-[10px] sm:text-xs italic font-bold mb-1 leading-tight"
                  style={{ fontFamily: "Georgia, serif", color: dark ? "#fde047" : VINTAGE_RED_DARK }}>
                  {s.subtitle}
                </p>
              )}
              <h2 className="font-black uppercase leading-none"
                style={{
                  fontFamily: "'Bangers', 'Anton', 'Impact', sans-serif",
                  fontSize: "clamp(1.3rem, 4vw, 2.6rem)",
                  color: dark ? VINTAGE_RED : VINTAGE_RED,
                  textShadow: dark ? "2px 2px 0 #000" : "2px 2px 0 rgba(0,0,0,0.3)",
                  letterSpacing: "0.01em",
                  transform: "rotate(-1deg)",
                }}>
                {s.title || `Title ${i + 1}`}
              </h2>
              {s.badge && (
                <div className="absolute top-1 right-1 px-2 py-0.5 border-2 font-black text-[10px] uppercase rotate-[8deg]"
                  style={{ backgroundColor: VINTAGE_COUPON_BG, color: VINTAGE_INK, borderColor: VINTAGE_INK,
                    fontFamily: "'Bangers', 'Anton', sans-serif" }}>
                  {s.badge}
                </div>
              )}
            </div>
          </div>
        );
      })}
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

                    {/* IMAGES — upload from device. Triple-feature uses 3 strip slots. */}
                    {selected.layoutStyle === "vintage-triple-feature" ? (
                      <div className="border border-zinc-800 rounded p-2 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-wider">
                          <ImageIcon className="w-3.5 h-3.5 text-amber-400" /> Cover Strips
                        </div>
                        {[0, 1, 2].map(i => {
                          const baseStrip = (selected.templateJson.strips || [])[i] || {};
                          const customStrip = (customData.strips || [])[i] || {};
                          const strip = { ...baseStrip, ...customStrip };
                          const updateStrip = (patch: Partial<PromoStrip>) => {
                            setCustomData(d => {
                              const merged = (d.strips ?? selected.templateJson.strips ?? [{}, {}, {}]).slice();
                              for (let k = merged.length; k < 3; k++) merged[k] = {};
                              merged[i] = { ...merged[i], ...patch };
                              return { ...d, strips: merged };
                            });
                          };
                          return (
                            <div key={i} className="border border-zinc-800 rounded p-2 space-y-2 bg-zinc-950" data-testid={`strip-editor-${i}`}>
                              <div className="text-[10px] uppercase tracking-wider text-amber-400 font-mono">Strip {i + 1}</div>
                              <div className="grid grid-cols-2 gap-2">
                                <Input
                                  placeholder="Title"
                                  value={strip.title ?? ""}
                                  onChange={(e) => updateStrip({ title: e.target.value })}
                                  className="bg-zinc-900 border-zinc-700 text-white text-xs h-8"
                                  data-testid={`input-strip-title-${i}`}
                                />
                                <Input
                                  placeholder="Subtitle"
                                  value={strip.subtitle ?? ""}
                                  onChange={(e) => updateStrip({ subtitle: e.target.value })}
                                  className="bg-zinc-900 border-zinc-700 text-white text-xs h-8"
                                  data-testid={`input-strip-subtitle-${i}`}
                                />
                              </div>
                              <Input
                                placeholder="Badge (e.g. ON SALE!)"
                                value={strip.badge ?? ""}
                                onChange={(e) => updateStrip({ badge: e.target.value })}
                                className="bg-zinc-900 border-zinc-700 text-white text-xs h-8"
                                data-testid={`input-strip-badge-${i}`}
                              />
                              <ImageUpload
                                value={strip.imageUrl}
                                onChange={(v) => updateStrip({ imageUrl: v })}
                                className="text-xs"
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-zinc-400 flex items-center gap-1.5">
                            <ImageIcon className="w-3 h-3" /> Hero Image
                          </Label>
                          <ImageUpload
                            value={customData.imageUrl ?? selected.templateJson.imageUrl}
                            onChange={(v) => setCustomData(d => ({ ...d, imageUrl: v }))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-400 flex items-center gap-1.5">
                            <ImageIcon className="w-3 h-3" /> Logo
                          </Label>
                          <ImageUpload
                            value={customData.logoUrl ?? selected.templateJson.logoUrl}
                            onChange={(v) => setCustomData(d => ({ ...d, logoUrl: v }))}
                          />
                        </div>
                      </div>
                    )}

                    {/* VINTAGE FILTER + TRANSFORM CONTROLS — apply to all images */}
                    <div className="border border-amber-900/40 rounded p-3 space-y-3 bg-amber-950/10">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
                        <Wand2 className="w-3.5 h-3.5" /> Old-School Look
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-400">Vintage Filter</Label>
                        <Select
                          value={customData.imageFilter ?? selected.templateJson.imageFilter ?? "none"}
                          onValueChange={(v) => setCustomData(d => ({ ...d, imageFilter: v }))}
                        >
                          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white h-9" data-testid="select-promo-filter">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                            {Object.entries(VINTAGE_FILTERS).map(([key, f]) => (
                              <SelectItem key={key} value={key} className="text-xs" data-testid={`option-filter-${key}`}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-xs text-zinc-400">Image Scale</Label>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {customData.imageScale ?? selected.templateJson.imageScale ?? 100}%
                          </span>
                        </div>
                        <Slider
                          value={[customData.imageScale ?? selected.templateJson.imageScale ?? 100]}
                          onValueChange={([v]) => setCustomData(d => ({ ...d, imageScale: v }))}
                          min={25} max={250} step={5}
                          data-testid="slider-promo-scale"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-xs text-zinc-400">Position X</Label>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {customData.imagePositionX ?? selected.templateJson.imagePositionX ?? 50}%
                            </span>
                          </div>
                          <Slider
                            value={[customData.imagePositionX ?? selected.templateJson.imagePositionX ?? 50]}
                            onValueChange={([v]) => setCustomData(d => ({ ...d, imagePositionX: v }))}
                            min={0} max={100} step={1}
                            data-testid="slider-promo-pos-x"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-xs text-zinc-400">Position Y</Label>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {customData.imagePositionY ?? selected.templateJson.imagePositionY ?? 50}%
                            </span>
                          </div>
                          <Slider
                            value={[customData.imagePositionY ?? selected.templateJson.imagePositionY ?? 50]}
                            onValueChange={([v]) => setCustomData(d => ({ ...d, imagePositionY: v }))}
                            min={0} max={100} step={1}
                            data-testid="slider-promo-pos-y"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCustomData(d => ({ ...d, imageFilter: "none", imageScale: 100, imagePositionX: 50, imagePositionY: 50 }))}
                        className="text-[10px] text-zinc-500 hover:text-zinc-300 underline-offset-2 hover:underline"
                        data-testid="button-reset-image-look"
                      >
                        Reset look to defaults
                      </button>
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
