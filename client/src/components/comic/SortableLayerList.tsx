import { ReactNode, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface RowRenderArgs {
  /** Spread these onto a DOM element to make it the drag handle. */
  dragHandleProps: React.HTMLAttributes<HTMLElement> & React.RefAttributes<any>;
  isDragging: boolean;
}

interface Props {
  /** Stable string IDs in the visual order they should be displayed. */
  ids: string[];
  /** Called when the user drops a row in a new position. (visualFromIdx, visualToIdx) */
  onReorder: (fromIdx: number, toIdx: number) => void;
  /** Render a row given its id. Spread `dragHandleProps` on whatever should be the grab handle. */
  renderRow: (id: string, args: RowRenderArgs) => ReactNode;
  /** Optional outer wrapper className. */
  className?: string;
  /** Disable drag entirely (e.g. when the panel is locked). */
  disabled?: boolean;
}

/**
 * A keyboard-accessible, animated sortable list built on dnd-kit.
 * Used everywhere layers can be reordered (panels, panel contents, cover elements).
 *
 * Why this exists: native HTML5 drag-and-drop has no animation, no a11y story,
 * and a flickery "border-t" drop indicator. dnd-kit gives us FLIP-style row
 * transitions and a real grab-feel that matches Photoshop / Clip Studio Paint.
 */
export function SortableLayerList({ ids, onReorder, renderRow, className, disabled }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const from = ids.indexOf(String(active.id));
      const to = ids.indexOf(String(over.id));
      if (from === -1 || to === -1) return;
      onReorder(from, to);
    },
    [ids, onReorder]
  );

  if (disabled) {
    return (
      <div className={className}>
        {ids.map(id => renderRow(id, { dragHandleProps: { ref: () => {} } as any, isDragging: false }))}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {ids.map(id => (
            <SortableRow key={id} id={id} renderRow={renderRow} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({ id, renderRow }: { id: string; renderRow: Props["renderRow"] }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : "auto",
    position: "relative",
  };
  return (
    <div ref={setNodeRef} style={style}>
      {renderRow(id, {
        dragHandleProps: {
          ...attributes,
          ...listeners,
          ref: undefined,
        } as any,
        isDragging,
      })}
    </div>
  );
}

/**
 * Default drag-handle button. Use as a child anywhere you want the standard
 * grip icon. Spread the `dragHandleProps` from `renderRow` onto it.
 */
export function LayerDragHandle({ dragHandleProps, className = "" }: { dragHandleProps: any; className?: string }) {
  return (
    <button
      {...dragHandleProps}
      type="button"
      className={`touch-none cursor-grab active:cursor-grabbing opacity-40 hover:opacity-100 transition-opacity ${className}`}
      aria-label="Drag to reorder"
      onClick={(e) => e.stopPropagation()}
      data-testid="layer-drag-handle"
    >
      <GripVertical className="w-3 h-3" />
    </button>
  );
}
