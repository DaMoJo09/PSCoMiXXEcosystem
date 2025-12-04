import { useRef, useEffect, useState } from "react";
import { Pen, Eraser, MousePointer } from "lucide-react";

interface DrawingCanvasProps {
  width: number;
  height: number;
  tool: "pen" | "eraser" | "select";
  color?: string;
  brushSize?: number;
}

export function DrawingCanvas({ 
  width, 
  height, 
  tool, 
  color = "#000000", 
  brushSize = 3 
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef<{x: number, y: number} | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    // Clear canvas on init if empty (optional)
    // ctx.fillStyle = "#ffffff";
    // ctx.fillRect(0, 0, width, height);
  }, []);

  const getCoordinates = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.PointerEvent) => {
    if (tool === "select") return;
    
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    lastPos.current = { x, y };
    
    // Capture pointer for smooth drawing outside canvas bounds
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawing || !lastPos.current || tool === "select") return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    const { x, y } = getCoordinates(e);
    
    // Pressure sensitivity (0.5 default if not supported)
    const pressure = e.pressure || 0.5;
    const currentLineWidth = tool === "eraser" ? brushSize * 5 : brushSize * (pressure * 2);

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(x, y);
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.lineWidth = currentLineWidth;
    ctx.stroke();

    lastPos.current = { x, y };
  };

  const stopDrawing = (e: React.PointerEvent) => {
    setIsDrawing(false);
    lastPos.current = null;
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`touch-none ${tool === "select" ? "cursor-default" : "cursor-crosshair"}`}
      onPointerDown={startDrawing}
      onPointerMove={draw}
      onPointerUp={stopDrawing}
      onPointerLeave={stopDrawing}
      style={{ width, height }}
    />
  );
}
