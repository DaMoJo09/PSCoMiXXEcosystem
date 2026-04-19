import { useMemo } from "react";
import { Eye, EyeOff, Pencil, Spline, Type as TypeIcon, Sparkles, Film, Lock, Unlock, ChevronDown, ChevronRight, Layers } from "lucide-react";
import { SortableLayerList, LayerDragHandle } from "./SortableLayerList";

/**
 * Typed layer system for vector panels.
 *
 * Each panel owns a stack of layers. The layer kind drives:
 *   - the icon shown next to the row
 *   - what tools are available when the layer is selected
 *   - which renderer pipeline is used (raster strokes vs vector shapes vs text vs FX vs motion)
 *
 * Persisted in `project.data.spreads[*].pages[*].panels[*].layers` so it
 * does NOT require a schema migration — keeps the foundation incremental.
 */
export type LayerKind = "drawing" | "vector" | "text" | "fx" | "motion";

export interface PanelLayer {
  id: string;
  name: string;
  kind: LayerKind;
  visible: boolean;
  locked: boolean;
  /** 0..1 layer opacity, multiplied with content opacity. */
  opacity: number;
  /** Free-form payload — schema depends on `kind`. */
  data?: unknown;
}

const KIND_META: Record<LayerKind, { icon: typeof Pencil; label: string; tint: string }> = {
  drawing: { icon: Pencil,   label: "Drawing", tint: "text-cyan-400" },
  vector:  { icon: Spline,   label: "Vector",  tint: "text-emerald-400" },
  text:    { icon: TypeIcon, label: "Text",    tint: "text-amber-400" },
  fx:      { icon: Sparkles, label: "FX",      tint: "text-violet-400" },
  motion:  { icon: Film,     label: "Motion",  tint: "text-pink-400" },
};

interface Props {
  /** Layer stack, top of stack drawn LAST (so highest visual z-index). */
  layers: PanelLayer[];
  selectedId?: string | null;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onSelect?: (id: string) => void;
  onChange: (next: PanelLayer[]) => void;
}

/**
 * Each panel shows its own layer stack. Reordering, hiding, locking, and
 * grouping all flow through the single `onChange` callback so the parent
 * persists once.
 */
export function LayerStackPanel({ layers, selectedId, collapsed = false, onToggleCollapsed, onSelect, onChange }: Props) {
  // Visual order is TOP layer first — newest on top, oldest at bottom.
  const visualOrder = useMemo(() => [...layers].reverse(), [layers]);
  const ids = useMemo(() => visualOrder.map(l => l.id), [visualOrder]);

  const handleReorder = (visualFrom: number, visualTo: number) => {
    // Translate visual indices (TOP=0) back to storage indices (BOTTOM=0)
    const N = layers.length;
    const storageFrom = N - 1 - visualFrom;
    const storageTo = N - 1 - visualTo;
    const next = [...layers];
    const [moved] = next.splice(storageFrom, 1);
    next.splice(storageTo, 0, moved);
    onChange(next);
  };

  const updateLayer = (id: string, patch: Partial<PanelLayer>) => {
    onChange(layers.map(l => (l.id === id ? { ...l, ...patch } : l)));
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300" data-testid="layer-stack-panel">
      <button
        onClick={onToggleCollapsed}
        className="w-full flex items-center gap-2 px-3 py-2 border-b border-zinc-800 hover:bg-zinc-800/60"
        data-testid="layers-toggle"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        <Layers className="w-3.5 h-3.5" />
        <span className="uppercase tracking-wider text-[10px] flex-1 text-left">Layers</span>
        <span className="text-zinc-500 text-[10px]">{layers.length}</span>
      </button>

      {!collapsed && (
        layers.length === 0 ? (
          <div className="px-3 py-4 text-center text-zinc-500 text-[10px]" data-testid="layers-empty">
            No layers yet. Draw, type, or apply an effect to create one.
          </div>
        ) : (
          <SortableLayerList
            ids={ids}
            onReorder={handleReorder}
            renderRow={(id, { dragHandleProps }) => {
              const layer = layers.find(l => l.id === id)!;
              const meta = KIND_META[layer.kind];
              const Icon = meta.icon;
              const isSelected = selectedId === id;
              return (
                <div
                  className={`flex items-center gap-1 px-2 py-1.5 border-b border-zinc-800/60 ${isSelected ? "bg-zinc-800" : "hover:bg-zinc-800/40"}`}
                  data-testid={`layer-row-${id}`}
                  data-active={isSelected}
                  onClick={() => onSelect?.(id)}
                >
                  <LayerDragHandle dragHandleProps={dragHandleProps} />
                  <Icon className={`w-3.5 h-3.5 ${meta.tint}`} />
                  <span className={`flex-1 truncate ${layer.visible ? "" : "line-through opacity-50"}`}>
                    {layer.name}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); updateLayer(id, { visible: !layer.visible }); }}
                    title={layer.visible ? "Hide" : "Show"}
                    className="opacity-50 hover:opacity-100"
                    data-testid={`layer-visibility-${id}`}
                  >
                    {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); updateLayer(id, { locked: !layer.locked }); }}
                    title={layer.locked ? "Unlock" : "Lock"}
                    className="opacity-50 hover:opacity-100"
                    data-testid={`layer-lock-${id}`}
                  >
                    {layer.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </button>
                </div>
              );
            }}
          />
        )
      )}
    </div>
  );
}

/** Convenience factory used when a tool implicitly creates a new layer. */
export function makeLayer(kind: LayerKind, name?: string): PanelLayer {
  return {
    id: `layer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: name ?? `${KIND_META[kind].label} layer`,
    kind,
    visible: true,
    locked: false,
    opacity: 1,
  };
}
