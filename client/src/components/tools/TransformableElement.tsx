import { useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { Move, RotateCcw, Trash2, Copy, Lock, Unlock } from "lucide-react";

interface TransformState {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

interface TransformableElementProps {
  id: string;
  children: ReactNode;
  initialTransform?: Partial<TransformState>;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onTransformChange?: (id: string, transform: TransformState) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  locked?: boolean;
  onLockToggle?: (id: string) => void;
  minWidth?: number;
  minHeight?: number;
  containerRef?: React.RefObject<HTMLElement | null>;
}

const HANDLE_SIZE = 10;

export function TransformableElement({
  id,
  children,
  initialTransform,
  isSelected = false,
  onSelect,
  onTransformChange,
  onDelete,
  onDuplicate,
  locked = false,
  onLockToggle,
  minWidth = 50,
  minHeight = 50,
  containerRef,
}: TransformableElementProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<TransformState>({
    x: initialTransform?.x ?? 0,
    y: initialTransform?.y ?? 0,
    width: initialTransform?.width ?? 200,
    height: initialTransform?.height ?? 200,
    rotation: initialTransform?.rotation ?? 0,
    scaleX: initialTransform?.scaleX ?? 1,
    scaleY: initialTransform?.scaleY ?? 1,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, startX: 0, startY: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0, startX: 0, startY: 0 });
  const rotateStart = useRef({ angle: 0, startAngle: 0 });

  useEffect(() => {
    if (initialTransform) {
      setTransform(prev => ({ ...prev, ...initialTransform }));
    }
  }, []);

  const getContainerOffset = useCallback(() => {
    if (containerRef?.current) {
      const rect = containerRef.current.getBoundingClientRect();
      return { x: rect.left, y: rect.top };
    }
    return { x: 0, y: 0 };
  }, [containerRef]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (locked) return;
    e.stopPropagation();
    onSelect?.(id);
    
    const offset = getContainerOffset();
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
      startX: transform.x,
      startY: transform.y,
    };
  };

  const handleResizeStart = (e: React.MouseEvent, handle: string) => {
    if (locked) return;
    e.stopPropagation();
    e.preventDefault();
    
    const offset = getContainerOffset();
    setIsResizing(handle);
    resizeStart.current = {
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
      width: transform.width,
      height: transform.height,
      startX: transform.x,
      startY: transform.y,
    };
  };

  const handleRotateStart = (e: React.MouseEvent) => {
    if (locked) return;
    e.stopPropagation();
    e.preventDefault();
    
    const rect = elementRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    
    setIsRotating(true);
    rotateStart.current = {
      angle: transform.rotation,
      startAngle: startAngle * (180 / Math.PI),
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const offset = getContainerOffset();
      
      if (isDragging) {
        const dx = (e.clientX - offset.x) - dragStart.current.x;
        const dy = (e.clientY - offset.y) - dragStart.current.y;
        
        const newTransform = {
          ...transform,
          x: dragStart.current.startX + dx,
          y: dragStart.current.startY + dy,
        };
        setTransform(newTransform);
        onTransformChange?.(id, newTransform);
      }
      
      if (isResizing) {
        const dx = (e.clientX - offset.x) - resizeStart.current.x;
        const dy = (e.clientY - offset.y) - resizeStart.current.y;
        
        let newWidth = resizeStart.current.width;
        let newHeight = resizeStart.current.height;
        let newX = resizeStart.current.startX;
        let newY = resizeStart.current.startY;
        
        if (isResizing.includes('e')) {
          newWidth = Math.max(minWidth, resizeStart.current.width + dx);
        }
        if (isResizing.includes('w')) {
          const proposedWidth = resizeStart.current.width - dx;
          if (proposedWidth >= minWidth) {
            newWidth = proposedWidth;
            newX = resizeStart.current.startX + dx;
          }
        }
        if (isResizing.includes('s')) {
          newHeight = Math.max(minHeight, resizeStart.current.height + dy);
        }
        if (isResizing.includes('n')) {
          const proposedHeight = resizeStart.current.height - dy;
          if (proposedHeight >= minHeight) {
            newHeight = proposedHeight;
            newY = resizeStart.current.startY + dy;
          }
        }
        
        if (e.shiftKey) {
          const aspectRatio = resizeStart.current.width / resizeStart.current.height;
          if (Math.abs(dx) > Math.abs(dy)) {
            newHeight = newWidth / aspectRatio;
          } else {
            newWidth = newHeight * aspectRatio;
          }
        }
        
        const newTransform = { ...transform, x: newX, y: newY, width: newWidth, height: newHeight };
        setTransform(newTransform);
        onTransformChange?.(id, newTransform);
      }
      
      if (isRotating) {
        const rect = elementRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
        
        let newRotation = rotateStart.current.angle + (angle - rotateStart.current.startAngle);
        
        if (e.shiftKey) {
          newRotation = Math.round(newRotation / 15) * 15;
        }
        
        const newTransform = { ...transform, rotation: newRotation };
        setTransform(newTransform);
        onTransformChange?.(id, newTransform);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(null);
      setIsRotating(false);
    };

    if (isDragging || isResizing || isRotating) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, isRotating, transform, id, onTransformChange, minWidth, minHeight, getContainerOffset]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isSelected) return;
      
      const step = e.shiftKey ? 10 : 1;
      let newTransform = { ...transform };
      
      switch (e.key) {
        case 'ArrowUp':
          newTransform.y -= step;
          e.preventDefault();
          break;
        case 'ArrowDown':
          newTransform.y += step;
          e.preventDefault();
          break;
        case 'ArrowLeft':
          newTransform.x -= step;
          e.preventDefault();
          break;
        case 'ArrowRight':
          newTransform.x += step;
          e.preventDefault();
          break;
        case 'Delete':
        case 'Backspace':
          if (!locked) onDelete?.(id);
          e.preventDefault();
          break;
        default:
          return;
      }
      
      setTransform(newTransform);
      onTransformChange?.(id, newTransform);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelected, transform, id, onTransformChange, onDelete, locked]);

  const handles = [
    { position: 'nw', cursor: 'nwse-resize', x: -HANDLE_SIZE/2, y: -HANDLE_SIZE/2 },
    { position: 'n', cursor: 'ns-resize', x: '50%', y: -HANDLE_SIZE/2, translateX: '-50%' },
    { position: 'ne', cursor: 'nesw-resize', x: `calc(100% - ${HANDLE_SIZE/2}px)`, y: -HANDLE_SIZE/2 },
    { position: 'w', cursor: 'ew-resize', x: -HANDLE_SIZE/2, y: '50%', translateY: '-50%' },
    { position: 'e', cursor: 'ew-resize', x: `calc(100% - ${HANDLE_SIZE/2}px)`, y: '50%', translateY: '-50%' },
    { position: 'sw', cursor: 'nesw-resize', x: -HANDLE_SIZE/2, y: `calc(100% - ${HANDLE_SIZE/2}px)` },
    { position: 's', cursor: 'ns-resize', x: '50%', y: `calc(100% - ${HANDLE_SIZE/2}px)`, translateX: '-50%' },
    { position: 'se', cursor: 'nwse-resize', x: `calc(100% - ${HANDLE_SIZE/2}px)`, y: `calc(100% - ${HANDLE_SIZE/2}px)` },
  ];

  return (
    <div
      ref={elementRef}
      className={`absolute transition-shadow ${isSelected ? 'z-50' : ''}`}
      style={{
        left: transform.x,
        top: transform.y,
        width: transform.width,
        height: transform.height,
        transform: `rotate(${transform.rotation}deg)`,
        cursor: locked ? 'not-allowed' : (isDragging ? 'grabbing' : 'grab'),
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => { e.stopPropagation(); onSelect?.(id); }}
      data-testid={`transformable-${id}`}
    >
      <div className="w-full h-full overflow-hidden">
        {children}
      </div>

      {isSelected && (
        <>
          <div className="absolute inset-0 border-2 border-white pointer-events-none" 
               style={{ boxShadow: '0 0 0 1px black' }} />
          
          {!locked && handles.map((handle) => (
            <div
              key={handle.position}
              className="absolute bg-white border-2 border-black hover:bg-blue-500"
              style={{
                width: HANDLE_SIZE,
                height: HANDLE_SIZE,
                left: handle.x,
                top: handle.y,
                cursor: handle.cursor,
                transform: `${handle.translateX ? `translateX(${handle.translateX})` : ''} ${handle.translateY ? `translateY(${handle.translateY})` : ''}`,
              }}
              onMouseDown={(e) => handleResizeStart(e, handle.position)}
            />
          ))}

          {!locked && (
            <div
              className="absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-2 border-black rounded-full flex items-center justify-center cursor-grab hover:bg-blue-500"
              onMouseDown={handleRotateStart}
              title="Rotate"
            >
              <RotateCcw className="w-3 h-3" />
            </div>
          )}

          <div className="absolute -top-10 right-0 flex gap-1">
            {onDuplicate && (
              <button
                className="p-1 bg-white border border-black hover:bg-gray-100"
                onClick={(e) => { e.stopPropagation(); onDuplicate(id); }}
                title="Duplicate"
              >
                <Copy className="w-3 h-3" />
              </button>
            )}
            {onLockToggle && (
              <button
                className="p-1 bg-white border border-black hover:bg-gray-100"
                onClick={(e) => { e.stopPropagation(); onLockToggle(id); }}
                title={locked ? "Unlock" : "Lock"}
              >
                {locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              </button>
            )}
            {onDelete && !locked && (
              <button
                className="p-1 bg-red-500 text-white border border-black hover:bg-red-600"
                onClick={(e) => { e.stopPropagation(); onDelete(id); }}
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export type { TransformState };
