import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ImageUpload";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Palette, Type, Layout as LayoutIcon, Layers, RotateCcw, Sparkles,
  ArrowUp, ArrowDown, Eye, EyeOff, Image as ImageIcon
} from "lucide-react";
import {
  PortfolioTheme, PORTFOLIO_PRESETS, FONT_OPTIONS, mergeTheme, fontStack,
  DEFAULT_SECTIONS,
} from "@/lib/portfolioTheme";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTheme: PortfolioTheme | null | undefined;
  onSave: (theme: PortfolioTheme) => void;
  saving?: boolean;
}

const SECTION_LABELS: Record<string, string> = {
  intro: "Featured Intro",
  about: "About / Bio",
  works: "Published Works",
  artworks: "Artworks Gallery",
};

export function PortfolioCustomizer({ open, onOpenChange, initialTheme, onSave, saving }: Props) {
  const [theme, setTheme] = useState<PortfolioTheme>(() => mergeTheme(initialTheme));

  useEffect(() => {
    if (open) setTheme(mergeTheme(initialTheme));
  }, [open, initialTheme]);

  const update = (patch: Partial<PortfolioTheme>) => setTheme(t => ({ ...t, ...patch }));
  const updateBg = (patch: Partial<NonNullable<PortfolioTheme["background"]>>) =>
    setTheme(t => ({ ...t, background: { ...(t.background || { type: "solid" }), ...patch } as any }));
  const updateSurface = (patch: Partial<NonNullable<PortfolioTheme["surface"]>>) =>
    setTheme(t => ({ ...t, surface: { ...(t.surface || {}), ...patch } as any }));
  const updateFonts = (patch: Partial<NonNullable<PortfolioTheme["fonts"]>>) =>
    setTheme(t => ({ ...t, fonts: { ...(t.fonts || {}), ...patch } as any }));
  const updateLayout = (patch: Partial<NonNullable<PortfolioTheme["layout"]>>) =>
    setTheme(t => ({ ...t, layout: { ...(t.layout || { style: "grid" }), ...patch } as any }));
  const updateSections = (patch: Partial<NonNullable<PortfolioTheme["sections"]>>) =>
    setTheme(t => ({ ...t, sections: { ...DEFAULT_SECTIONS, ...(t.sections || {}), ...patch } as any }));
  const updateIntro = (patch: Partial<NonNullable<PortfolioTheme["intro"]>>) =>
    setTheme(t => ({ ...t, intro: { enabled: false, ...(t.intro || {}), ...patch } as any }));

  const applyPreset = (presetId: string) => {
    const preset = PORTFOLIO_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    const sections = theme.sections || DEFAULT_SECTIONS;
    const intro = theme.intro;
    setTheme({ ...mergeTheme(preset.theme), sections, intro });
  };

  const moveSection = (id: string, dir: -1 | 1) => {
    const order = [...(theme.sections?.order || DEFAULT_SECTIONS.order!)];
    const i = order.indexOf(id);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    updateSections({ order });
  };

  const sectionOrder = theme.sections?.order || DEFAULT_SECTIONS.order!;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-2 border-cyan-500 text-white max-w-3xl max-h-[88vh] p-0">
        <DialogHeader className="p-6 pb-2 border-b border-zinc-800">
          <DialogTitle className="text-2xl font-black text-cyan-400 flex items-center gap-2">
            <Sparkles className="w-6 h-6" /> CUSTOMIZE YOUR PORTFOLIO
          </DialogTitle>
          <p className="text-sm text-zinc-400">
            Pick a preset, then tweak colors, fonts, layout, and sections. This is your space — make it feel like you.
          </p>
        </DialogHeader>

        <Tabs defaultValue="presets" className="flex-1 flex flex-col">
          <TabsList className="mx-6 mt-4 bg-zinc-900 border border-zinc-800 grid grid-cols-6">
            <TabsTrigger value="presets" data-testid="tab-presets"><Sparkles className="w-3.5 h-3.5 mr-1" />Presets</TabsTrigger>
            <TabsTrigger value="colors" data-testid="tab-colors"><Palette className="w-3.5 h-3.5 mr-1" />Colors</TabsTrigger>
            <TabsTrigger value="fonts" data-testid="tab-fonts"><Type className="w-3.5 h-3.5 mr-1" />Fonts</TabsTrigger>
            <TabsTrigger value="background" data-testid="tab-background"><ImageIcon className="w-3.5 h-3.5 mr-1" />Background</TabsTrigger>
            <TabsTrigger value="layout" data-testid="tab-layout"><LayoutIcon className="w-3.5 h-3.5 mr-1" />Layout</TabsTrigger>
            <TabsTrigger value="sections" data-testid="tab-sections"><Layers className="w-3.5 h-3.5 mr-1" />Sections</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 max-h-[55vh]">
            <div className="p-6">

              <TabsContent value="presets" className="mt-0 space-y-3">
                <p className="text-xs text-zinc-500 mb-3">Tap a preset to apply its full look. You can fine-tune anything afterwards.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PORTFOLIO_PRESETS.map(p => {
                    const isActive = theme.preset === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => applyPreset(p.id)}
                        className={`text-left p-4 border-2 transition-all hover:scale-[1.01] ${isActive ? "border-cyan-500 ring-2 ring-cyan-500/40" : "border-zinc-800 hover:border-zinc-600"}`}
                        style={{
                          background: p.theme.background?.type === "gradient"
                            ? `linear-gradient(${p.theme.background.gradientAngle ?? 135}deg, ${p.theme.background.gradientFrom}, ${p.theme.background.gradientTo})`
                            : p.theme.background?.color || "#000",
                          color: p.theme.textColor || "#fff",
                          fontFamily: fontStack(p.theme.fonts?.body),
                        }}
                        data-testid={`preset-${p.id}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div style={{ fontFamily: fontStack(p.theme.fonts?.display), fontWeight: 900, fontSize: 18, color: p.theme.accentColor }}>
                            {p.label}
                          </div>
                          <div className="flex gap-1">
                            <span className="w-3 h-3 rounded-full border border-black/20" style={{ background: p.theme.accentColor }} />
                            <span className="w-3 h-3 rounded-full border border-black/20" style={{ background: p.theme.accent2Color }} />
                          </div>
                        </div>
                        <div className="text-xs opacity-80">{p.description}</div>
                      </button>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="colors" className="mt-0 space-y-5">
                <ColorRow label="Primary Accent" value={theme.accentColor || "#22d3ee"} onChange={(v) => update({ accentColor: v })} testId="color-accent" />
                <ColorRow label="Secondary Accent" value={theme.accent2Color || "#a855f7"} onChange={(v) => update({ accent2Color: v })} testId="color-accent2" />
                <ColorRow label="Text Color" value={theme.textColor || "#ffffff"} onChange={(v) => update({ textColor: v })} testId="color-text" />
                <ColorRow label="Muted / Subtle Text" value={theme.mutedTextColor || "#a1a1aa"} onChange={(v) => update({ mutedTextColor: v })} testId="color-muted" />

                <div className="border-t border-zinc-800 pt-4">
                  <h4 className="text-sm font-bold text-cyan-400 mb-3">CARD / SURFACE</h4>
                  <ColorRow label="Card Background" value={theme.surface?.color || "#18181b"} onChange={(v) => updateSurface({ color: v })} testId="color-surface" />
                  <ColorRow label="Card Border" value={theme.surface?.borderColor || "#3f3f46"} onChange={(v) => updateSurface({ borderColor: v })} testId="color-border" />

                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <Label className="text-xs text-zinc-500">Border width</Label>
                      <Slider min={0} max={6} step={1} value={[theme.surface?.borderWidth ?? 1]} onValueChange={(v) => updateSurface({ borderWidth: v[0] })} className="mt-2" />
                      <div className="text-xs text-zinc-500 mt-1">{theme.surface?.borderWidth ?? 1}px</div>
                    </div>
                    <div>
                      <Label className="text-xs text-zinc-500">Corner roundness</Label>
                      <Slider min={0} max={32} step={1} value={[theme.surface?.radius ?? 0]} onValueChange={(v) => updateSurface({ radius: v[0] })} className="mt-2" />
                      <div className="text-xs text-zinc-500 mt-1">{theme.surface?.radius ?? 0}px</div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <Label className="text-xs text-zinc-500">Card shadow</Label>
                    <Select value={theme.surface?.shadow || "none"} onValueChange={(v) => updateSurface({ shadow: v as any })}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-700 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                        <SelectItem value="none">None — flat</SelectItem>
                        <SelectItem value="soft">Soft — subtle drop shadow</SelectItem>
                        <SelectItem value="hard">Hard — bold offset shadow</SelectItem>
                        <SelectItem value="glow">Glow — neon halo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="fonts" className="mt-0 space-y-4">
                <div>
                  <Label className="text-zinc-300 font-bold">Display font (headlines)</Label>
                  <Select value={theme.fonts?.display || "space-grotesk"} onValueChange={(v) => updateFonts({ display: v })}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-700 mt-1" data-testid="select-display-font"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700 text-white max-h-72">
                      {FONT_OPTIONS.map(f => (
                        <SelectItem key={f.id} value={f.id}>
                          <span style={{ fontFamily: f.stack }}>{f.label} — <span className="opacity-70">{f.sample}</span></span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="mt-2 p-4 border border-zinc-800 bg-zinc-900/50" style={{ fontFamily: fontStack(theme.fonts?.display) }}>
                    <div className="text-3xl font-black" style={{ color: theme.accentColor }}>The quick brown fox</div>
                    <div className="text-xs text-zinc-500 mt-1">Sample headline preview</div>
                  </div>
                </div>

                <div>
                  <Label className="text-zinc-300 font-bold">Body font (paragraphs)</Label>
                  <Select value={theme.fonts?.body || "inter"} onValueChange={(v) => updateFonts({ body: v })}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-700 mt-1" data-testid="select-body-font"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700 text-white max-h-72">
                      {FONT_OPTIONS.map(f => (
                        <SelectItem key={f.id} value={f.id}>
                          <span style={{ fontFamily: f.stack }}>{f.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="mt-2 p-4 border border-zinc-800 bg-zinc-900/50" style={{ fontFamily: fontStack(theme.fonts?.body) }}>
                    <p className="text-sm text-zinc-300">
                      I make weird little stories about ghosts and old radio shows. Most of my work starts as marker scribbles in the back of a notebook.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="background" className="mt-0 space-y-4">
                <div>
                  <Label className="text-zinc-300 font-bold">Background style</Label>
                  <Select value={theme.background?.type || "solid"} onValueChange={(v) => updateBg({ type: v as any })}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-700 mt-1" data-testid="select-bg-type"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                      <SelectItem value="solid">Solid color</SelectItem>
                      <SelectItem value="gradient">Gradient</SelectItem>
                      <SelectItem value="pattern">Pattern (dots / paper / grid…)</SelectItem>
                      <SelectItem value="image">Image</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {theme.background?.type === "solid" && (
                  <ColorRow label="Background color" value={theme.background?.color || "#000000"} onChange={(v) => updateBg({ color: v })} testId="color-bg" />
                )}

                {theme.background?.type === "gradient" && (
                  <>
                    <ColorRow label="Gradient — from" value={theme.background?.gradientFrom || "#0a0a0a"} onChange={(v) => updateBg({ gradientFrom: v })} testId="color-grad-from" />
                    <ColorRow label="Gradient — to" value={theme.background?.gradientTo || "#1a1a1a"} onChange={(v) => updateBg({ gradientTo: v })} testId="color-grad-to" />
                    <div>
                      <Label className="text-xs text-zinc-500">Angle: {theme.background?.gradientAngle ?? 135}°</Label>
                      <Slider min={0} max={360} step={5} value={[theme.background?.gradientAngle ?? 135]} onValueChange={(v) => updateBg({ gradientAngle: v[0] })} className="mt-2" />
                    </div>
                  </>
                )}

                {theme.background?.type === "pattern" && (
                  <>
                    <ColorRow label="Paper color" value={theme.background?.color || "#fff7d6"} onChange={(v) => updateBg({ color: v })} testId="color-pattern-bg" />
                    <div>
                      <Label className="text-zinc-300">Pattern</Label>
                      <Select value={theme.background?.pattern || "dots"} onValueChange={(v) => updateBg({ pattern: v as any })}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-700 mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                          <SelectItem value="dots">Dots</SelectItem>
                          <SelectItem value="lines">Diagonal lines</SelectItem>
                          <SelectItem value="halftone">Halftone (comic)</SelectItem>
                          <SelectItem value="grid">Grid</SelectItem>
                          <SelectItem value="paper">Paper grain</SelectItem>
                          <SelectItem value="none">None (just color)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {theme.background?.type === "image" && (
                  <>
                    <ImageUpload
                      label="Background image"
                      value={theme.background?.imageUrl || ""}
                      onChange={(v) => updateBg({ imageUrl: v })}
                    />
                    <ColorRow label="Fallback color" value={theme.background?.color || "#000000"} onChange={(v) => updateBg({ color: v })} testId="color-bg-fallback" />
                  </>
                )}
              </TabsContent>

              <TabsContent value="layout" className="mt-0 space-y-4">
                <div>
                  <Label className="text-zinc-300 font-bold">Hero / cover style</Label>
                  <Select value={theme.layout?.heroStyle || "split"} onValueChange={(v) => updateLayout({ heroStyle: v as any })}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-700 mt-1" data-testid="select-hero-style"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                      <SelectItem value="split">Split — avatar overlapping cover image</SelectItem>
                      <SelectItem value="centered">Centered — avatar above name, big and bold</SelectItem>
                      <SelectItem value="minimal">Minimal — text-only, no cover</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-zinc-300 font-bold">Works gallery layout</Label>
                  <Select value={theme.layout?.style || "grid"} onValueChange={(v) => updateLayout({ style: v as any })}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-700 mt-1" data-testid="select-gallery-layout"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                      <SelectItem value="grid">Grid — even tiles</SelectItem>
                      <SelectItem value="magazine">Magazine — varied sizes, editorial feel</SelectItem>
                      <SelectItem value="reel">Reel — wide cards, horizontal swipe</SelectItem>
                      <SelectItem value="compact">Compact — small thumbnail rows</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="sections" className="mt-0 space-y-4">
                <div className="border border-zinc-800 p-4 bg-zinc-900/30">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-zinc-300 font-bold flex items-center gap-2"><Sparkles className="w-4 h-4 text-cyan-400" /> Featured Intro Block</Label>
                    <Switch
                      checked={!!theme.intro?.enabled}
                      onCheckedChange={(v) => updateIntro({ enabled: v })}
                      data-testid="switch-intro-enabled"
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mb-3">A pinned headline + paragraph + image at the top — your manifesto, a featured project, or a hello.</p>
                  {theme.intro?.enabled && (
                    <div className="space-y-3 pt-2 border-t border-zinc-800">
                      <Input
                        value={theme.intro?.headline || ""}
                        onChange={(e) => updateIntro({ headline: e.target.value })}
                        placeholder="Headline (e.g. 'Currently making a horror webcomic about a haunted radio')"
                        className="bg-zinc-900 border-zinc-700"
                        data-testid="input-intro-headline"
                      />
                      <Textarea
                        value={theme.intro?.body || ""}
                        onChange={(e) => updateIntro({ body: e.target.value })}
                        placeholder="A short paragraph — what you're working on, what you're about, who you want to hear from..."
                        className="bg-zinc-900 border-zinc-700 min-h-[80px]"
                        data-testid="input-intro-body"
                      />
                      <ImageUpload
                        label="Intro image (optional)"
                        value={theme.intro?.imageUrl || ""}
                        onChange={(v) => updateIntro({ imageUrl: v })}
                      />
                    </div>
                  )}
                </div>

                <div className="border-t border-zinc-800 pt-4">
                  <Label className="text-zinc-300 font-bold mb-2 block">Show / hide sections</Label>
                  <div className="space-y-2">
                    {[
                      ["showStats", "Stats row (level, followers, time)"],
                      ["showAbout", "About / bio section"],
                      ["showSocial", "Social media links"],
                      ["showWorks", "Published comics & motion"],
                      ["showArtworks", "Standalone artworks gallery"],
                    ].map(([key, label]) => {
                      const isOn = (theme.sections as any)?.[key] !== false;
                      return (
                        <div key={key as string} className="flex items-center justify-between p-2 bg-zinc-900/50 border border-zinc-800">
                          <span className="text-sm flex items-center gap-2">
                            {isOn ? <Eye className="w-4 h-4 text-cyan-400" /> : <EyeOff className="w-4 h-4 text-zinc-600" />}
                            {label as string}
                          </span>
                          <Switch
                            checked={isOn}
                            onCheckedChange={(v) => updateSections({ [key as string]: v } as any)}
                            data-testid={`switch-${key as string}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-zinc-800 pt-4">
                  <Label className="text-zinc-300 font-bold mb-2 block">Section order</Label>
                  <p className="text-xs text-zinc-500 mb-3">Reorder how sections appear top-to-bottom. The hero / cover always stays at the top.</p>
                  <div className="space-y-2">
                    {sectionOrder.map((id, idx) => (
                      <div key={id} className="flex items-center justify-between p-2 bg-zinc-900/50 border border-zinc-800">
                        <span className="text-sm">
                          <span className="text-zinc-500 mr-2">{idx + 1}.</span>
                          {SECTION_LABELS[id] || id}
                        </span>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => moveSection(id, -1)} disabled={idx === 0} data-testid={`btn-section-up-${id}`}>
                            <ArrowUp className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => moveSection(id, 1)} disabled={idx === sectionOrder.length - 1} data-testid={`btn-section-down-${id}`}>
                            <ArrowDown className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

            </div>
          </ScrollArea>

          <div className="flex items-center justify-between p-4 border-t border-zinc-800 bg-zinc-950">
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-500 hover:text-zinc-300"
              onClick={() => setTheme(mergeTheme(PORTFOLIO_PRESETS[0].theme))}
              data-testid="btn-reset-theme"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset to default
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="border-zinc-700 text-zinc-400" data-testid="btn-cancel-customize">
                Cancel
              </Button>
              <Button
                onClick={() => onSave(theme)}
                disabled={saving}
                className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold"
                data-testid="btn-save-theme"
              >
                {saving ? "Saving..." : "Save look"}
              </Button>
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function ColorRow({ label, value, onChange, testId }: { label: string; value: string; onChange: (v: string) => void; testId?: string }) {
  return (
    <div className="flex items-center gap-3">
      <Label className="text-zinc-300 flex-1">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 cursor-pointer border border-zinc-700 bg-zinc-900 rounded-none"
          data-testid={testId}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-zinc-900 border-zinc-700 text-white w-28 font-mono text-xs"
        />
      </div>
    </div>
  );
}
