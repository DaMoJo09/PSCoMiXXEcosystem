import { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { InkbladeCanvas } from "@/components/inkblade/InkbladeCanvas";
import { BrushSettingsPanel } from "@/components/inkblade/BrushSettingsPanel";
import { getBrush } from "@/lib/inkblade/brushes";
import type { BrushProfile, RawInputPoint } from "@/lib/inkblade/types";
import { Trash2, PenTool } from "lucide-react";

/**
 * INKBLADE Sandbox — quick "feel it on your Wacom" page.
 * No project, no save, just pure brush feel for testing pressure / tilt /
 * stabilization without risking the existing comic editor.
 */
export default function InkbladeSandbox() {
  const [brush, setBrush] = useState<BrushProfile>(getBrush("core"));
  const [resetKey, setResetKey] = useState(0);
  const [debug, setDebug] = useState<RawInputPoint | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const handler = (e: PointerEvent) => {
      setDebug({
        x: e.offsetX, y: e.offsetY,
        pressure: e.pressure,
        tiltX: e.tiltX ?? 0, tiltY: e.tiltY ?? 0,
        twist: e.twist ?? 0,
        width: e.width ?? 0, height: e.height ?? 0,
        pointerId: e.pointerId,
        pointerType: e.pointerType === "pen" ? "pen" : e.pointerType === "touch" ? "touch" : "mouse",
        timestamp: e.timeStamp,
        hasPressureData: !(e.pointerType === "mouse" || (e.pointerType === "pen" && e.pressure === 0.5 && e.buttons === 1)),
      });
    };
    el.addEventListener("pointermove", handler);
    el.addEventListener("pointerdown", handler);
    return () => {
      el.removeEventListener("pointermove", handler);
      el.removeEventListener("pointerdown", handler);
    };
  }, []);

  return (
    <Layout>
      <div className="flex flex-col h-screen bg-black text-white font-mono">
        <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <PenTool className="w-5 h-5" />
            <div>
              <div className="text-sm font-bold uppercase tracking-wider" data-testid="text-sandbox-title">INKBLADE Sandbox</div>
              <div className="text-[10px] text-zinc-500 uppercase">Wacom test surface · raw stylus input · zero normalization</div>
            </div>
          </div>
          <button
            onClick={() => setResetKey(k => k + 1)}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-xs uppercase hover:bg-zinc-800"
            data-testid="button-clear-canvas"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <aside className="border-r border-zinc-800 p-3 overflow-y-auto">
            <BrushSettingsPanel brush={brush} onChange={setBrush} />
            <div className="mt-3 p-2 bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 space-y-0.5" data-testid="stylus-readout">
              <div className="uppercase tracking-wider text-zinc-500 mb-1">Live stylus readout</div>
              <div>type: <span className="text-cyan-400">{debug?.pointerType ?? "—"}</span></div>
              <div>pressure: <span className="text-cyan-400">{debug ? debug.pressure.toFixed(3) : "—"}</span></div>
              <div>tiltX/Y: <span className="text-cyan-400">{debug ? `${debug.tiltX}° / ${debug.tiltY}°` : "—"}</span></div>
              <div>twist: <span className="text-cyan-400">{debug?.twist ?? "—"}</span></div>
              <div>real pressure: <span className="text-cyan-400">{debug ? String(debug.hasPressureData) : "—"}</span></div>
            </div>
          </aside>

          <main className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            <div ref={wrapperRef} className="bg-white shadow-xl">
              <InkbladeCanvas
                key={resetKey}
                width={1100}
                height={720}
                brush={brush}
              />
            </div>
          </main>
        </div>
      </div>
    </Layout>
  );
}
