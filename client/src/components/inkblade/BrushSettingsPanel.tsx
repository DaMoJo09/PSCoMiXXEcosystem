import { INKBLADE_BRUSHES } from "@/lib/inkblade/brushes";
import type { BrushProfile, StabilizationLevel } from "@/lib/inkblade/types";
import { PRESSURE_PRESETS } from "@/lib/inkblade/types";

interface Props {
  brush: BrushProfile;
  onChange: (next: BrushProfile) => void;
}

const STABILIZATION_OPTIONS: StabilizationLevel[] = ["none", "light", "standard", "heavy"];
const PRESSURE_PRESET_KEYS: Array<keyof typeof PRESSURE_PRESETS> = ["light", "medium", "heavy", "wacom"];

const PRESET_LABELS: Record<string, string> = {
  light: "Light Hand",
  medium: "Medium Hand",
  heavy: "Heavy Hand",
  wacom: "Match Wacom Driver",
};

export function BrushSettingsPanel({ brush, onChange }: Props) {
  const setField = <K extends keyof BrushProfile>(k: K, v: BrushProfile[K]) =>
    onChange({ ...brush, [k]: v });

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-3 w-64 font-mono text-xs text-zinc-300 space-y-3" data-testid="brush-settings">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Brush</div>
        <div className="grid grid-cols-3 gap-1">
          {INKBLADE_BRUSHES.map(b => (
            <button
              key={b.id}
              onClick={() => onChange({ ...b, color: brush.color, opacity: brush.opacity, size: brush.size })}
              data-testid={`brush-${b.id}`}
              className={`px-2 py-1.5 border text-[10px] uppercase ${brush.id === b.id ? "bg-white text-black border-white" : "border-zinc-700 hover:border-zinc-500"}`}
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">Size — {brush.size.toFixed(0)}px</span>
        <input
          type="range" min={1} max={80} value={brush.size}
          onChange={e => setField("size", Number(e.target.value))}
          className="w-full" data-testid="brush-size"
        />
      </label>

      <label className="block">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">Color</span>
        <input
          type="color" value={brush.color}
          onChange={e => setField("color", e.target.value)}
          className="w-full h-8 bg-transparent border border-zinc-700"
          data-testid="brush-color"
        />
      </label>

      <label className="block">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">Opacity — {(brush.opacity * 100).toFixed(0)}%</span>
        <input
          type="range" min={0} max={1} step={0.05} value={brush.opacity}
          onChange={e => setField("opacity", Number(e.target.value))}
          className="w-full" data-testid="brush-opacity"
        />
      </label>

      <div>
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Pressure Curve</div>
        <div className="grid grid-cols-2 gap-1">
          {PRESSURE_PRESET_KEYS.map(k => {
            // Reference equality fails after serialization round-trips, so
            // compare the curve values structurally.
            const isActive = JSON.stringify(brush.pressureCurve) === JSON.stringify(PRESSURE_PRESETS[k]);
            return (
              <button
                key={k}
                onClick={() => setField("pressureCurve", PRESSURE_PRESETS[k])}
                data-testid={`pressure-${k}`}
                className={`px-2 py-1 border text-[10px] ${isActive ? "bg-white text-black border-white" : "border-zinc-700 hover:border-zinc-500"}`}
              >
                {PRESET_LABELS[k]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Stabilization</div>
        <div className="grid grid-cols-4 gap-1">
          {STABILIZATION_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setField("stabilization", s)}
              data-testid={`stabilization-${s}`}
              className={`px-1 py-1 border text-[10px] uppercase ${brush.stabilization === s ? "bg-white text-black border-white" : "border-zinc-700 hover:border-zinc-500"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">Taper Start — {(brush.taperStart * 100).toFixed(0)}%</span>
        <input
          type="range" min={0} max={1} step={0.05} value={brush.taperStart}
          onChange={e => setField("taperStart", Number(e.target.value))}
          className="w-full" data-testid="brush-taper-start"
        />
      </label>

      <label className="block">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">Taper End — {(brush.taperEnd * 100).toFixed(0)}%</span>
        <input
          type="range" min={0} max={1} step={0.05} value={brush.taperEnd}
          onChange={e => setField("taperEnd", Number(e.target.value))}
          className="w-full" data-testid="brush-taper-end"
        />
      </label>
    </div>
  );
}
