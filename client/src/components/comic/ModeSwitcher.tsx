import { LayoutGrid, Pen, Palette, Film, Sparkles, Type } from "lucide-react";
import type { ModeId } from "@/lib/inkblade/types";

/**
 * UNIFIED CREATION ENGINE — mode switcher.
 * Same canvas, same tools — different capabilities layered on top.
 * Six modes per spec: Layout / Ink / Color / Motion / FX / Text.
 */
const MODES: { id: ModeId; label: string; icon: typeof LayoutGrid; hint: string }[] = [
  { id: "layout", label: "Layout", icon: LayoutGrid, hint: "Panels, gutters, templates" },
  { id: "ink",    label: "Ink",    icon: Pen,        hint: "INKBLADE stylus drawing — pressure & tilt" },
  { id: "color",  label: "Color",  icon: Palette,    hint: "Fill, gradients, palettes" },
  { id: "motion", label: "Motion", icon: Film,       hint: "Animate this panel or layer" },
  { id: "fx",     label: "FX",     icon: Sparkles,   hint: "Smears, overlays, motion accents" },
  { id: "text",   label: "Text",   icon: Type,       hint: "Bubbles & dialogue" },
];

interface Props {
  active: ModeId;
  onChange: (id: ModeId) => void;
  disabled?: ModeId[];
}

export function ModeSwitcher({ active, onChange, disabled = [] }: Props) {
  return (
    <div
      className="inline-flex items-center gap-0 border border-zinc-700 bg-zinc-900 overflow-hidden"
      data-testid="mode-switcher"
    >
      {MODES.map(m => {
        const Icon = m.icon;
        const isActive = m.id === active;
        const isDisabled = disabled.includes(m.id);
        return (
          <button
            key={m.id}
            onClick={() => !isDisabled && onChange(m.id)}
            disabled={isDisabled}
            title={m.hint}
            data-testid={`mode-${m.id}`}
            data-active={isActive}
            className={[
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider border-r border-zinc-700 last:border-r-0 transition",
              isActive
                ? "bg-white text-black"
                : isDisabled
                  ? "text-zinc-600 cursor-not-allowed"
                  : "text-zinc-300 hover:bg-zinc-800 hover:text-white",
            ].join(" ")}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
