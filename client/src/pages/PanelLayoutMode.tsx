import { useState, useRef, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { LayoutToolbar } from "@/components/layout-tool/LayoutToolbar";
import { TemplatePanel } from "@/components/layout-tool/TemplatePanel";
import { LayoutCanvas } from "@/components/layout-tool/LayoutCanvas";
import { PanelProperties } from "@/components/layout-tool/PanelProperties";
import { PageSettings } from "@/components/layout-tool/PageSettings";
import type { ComicPage, PanelCell } from "@/types/layout-types";
import { createDefaultPage, createDefaultPanel } from "@/types/layout-types";
import { PAGE_TEMPLATES } from "@/data/page-templates";

export default function PanelLayoutMode() {
  const [page, setPage] = useState<ComicPage>(() => {
    const p = createDefaultPage("2x2");
    const tmpl = PAGE_TEMPLATES.find(t => t.id === "2x2")!;
    p.panels = tmpl.panels.map(tp => createDefaultPanel(tp));
    return p;
  });
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [canvasZoom, setCanvasZoom] = useState(100);
  const [showSettings, setShowSettings] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const selectedPanel = page.panels.find(p => p.id === selectedPanelId) || null;

  const updatePage = useCallback((updates: Partial<ComicPage>) => {
    setPage(prev => ({ ...prev, ...updates }));
  }, []);

  const updatePanel = useCallback((panelId: string, updates: Partial<PanelCell>) => {
    setPage(prev => ({
      ...prev,
      panels: prev.panels.map(p => p.id === panelId ? { ...p, ...updates } : p),
    }));
  }, []);

  const deletePanel = useCallback((panelId: string) => {
    setPage(prev => ({
      ...prev,
      panels: prev.panels.filter(p => p.id !== panelId),
    }));
    if (selectedPanelId === panelId) setSelectedPanelId(null);
  }, [selectedPanelId]);

  const applyTemplate = useCallback((templateId: string) => {
    const tmpl = PAGE_TEMPLATES.find(t => t.id === templateId);
    if (!tmpl) return;
    const hasContent = page.panels.some(p => p.imageUrl || p.caption);
    if (hasContent && !confirm("Applying a template will clear existing panel content. Continue?")) return;
    const newPanels = tmpl.panels.map(tp => createDefaultPanel(tp));
    setPage(prev => ({ ...prev, template: templateId, panels: newPanels }));
    setSelectedPanelId(null);
  }, [page.panels]);

  const addPanel = useCallback(() => {
    const tmpl = PAGE_TEMPLATES.find(t => t.id === page.template);
    const maxRow = Math.max(...page.panels.map(p => p.row + p.rowSpan - 1), 0);
    const maxCol = tmpl ? tmpl.cols : 2;
    const newPanel = createDefaultPanel({
      row: maxRow + 1,
      col: 1,
      rowSpan: 1,
      colSpan: maxCol,
    });
    setPage(prev => ({ ...prev, panels: [...prev.panels, newPanel] }));
    setSelectedPanelId(newPanel.id);
  }, [page.panels, page.template]);

  const dropImageOnPanel = useCallback((panelId: string, imageUrl: string) => {
    updatePanel(panelId, { imageUrl });
  }, [updatePanel]);

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-3rem)] bg-zinc-950 text-white" data-testid="panel-layout-mode">
        <LayoutToolbar
          pageName={page.name}
          onNameChange={(name) => updatePage({ name })}
          onAddPanel={addPanel}
          canvasZoom={canvasZoom}
          onZoomChange={setCanvasZoom}
          canvasRef={canvasRef}
          onToggleSettings={() => setShowSettings(prev => !prev)}
          page={page}
        />
        <div className="flex flex-1 overflow-hidden">
          <TemplatePanel
            currentTemplate={page.template}
            onApplyTemplate={applyTemplate}
            onDropAsset={dropImageOnPanel}
            selectedPanelId={selectedPanelId}
          />
          <LayoutCanvas
            ref={canvasRef}
            page={page}
            zoom={canvasZoom}
            selectedPanelId={selectedPanelId}
            onSelectPanel={setSelectedPanelId}
            onDropImage={dropImageOnPanel}
            onUpdatePanel={updatePanel}
          />
          <div className="w-[260px] border-l border-zinc-800 bg-zinc-900 overflow-y-auto shrink-0">
            {showSettings && (
              <PageSettings
                page={page}
                onUpdate={updatePage}
                onClose={() => setShowSettings(false)}
              />
            )}
            <PanelProperties
              panel={selectedPanel}
              onUpdate={(updates) => selectedPanelId && updatePanel(selectedPanelId, updates)}
              onDelete={() => selectedPanelId && deletePanel(selectedPanelId)}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
