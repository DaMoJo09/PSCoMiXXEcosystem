import { useCallback, useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import {
  isDesktop,
  saveProjectToFile,
  openProjectFromFile,
  PSCOMIXX_FORMAT_VERSION,
  type PscomixxProject,
} from "@/lib/desktopBridge";

export interface UsePscomixxFileOptions<TData> {
  type: string;
  route: string;
  getSnapshot: () => { title: string; data: TData; meta?: Record<string, any>; assets?: PscomixxProject["assets"] };
  applySnapshot: (snapshot: { title: string; data: TData; assets?: PscomixxProject["assets"] }) => void;
  onSaved?: () => void;
  defaultTitle?: string;
}

const SESSION_KEY = "pscomixx:pending-import";

export function usePscomixxFile<TData = any>(opts: UsePscomixxFileOptions<TData>) {
  const { type, route, getSnapshot, applySnapshot, onSaved, defaultTitle = "Untitled" } = opts;
  const search = useSearch();
  const [, navigate] = useLocation();
  const importHydratedRef = useRef(false);

  const handleSaveToComputer = useCallback(async () => {
    try {
      const snapshot = getSnapshot();
      const result = await saveProjectToFile({
        title: snapshot.title || defaultTitle,
        type,
        formatVersion: PSCOMIXX_FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        data: snapshot.data,
        assets: snapshot.assets,
        meta: snapshot.meta || { tool: type },
      });
      if (result.saved) {
        toast.success(
          isDesktop()
            ? `Saved to ${result.path || "your computer"}`
            : "Project downloaded as .pscomixx file"
        );
        onSaved?.();
      }
    } catch (err) {
      console.error(`[${type}] Save to computer failed:`, err);
      toast.error("Failed to save project to your computer");
    }
  }, [type, route, getSnapshot, onSaved, defaultTitle]);

  const handleOpenFromComputer = useCallback(async () => {
    try {
      const project = await openProjectFromFile();
      if (!project) return;
      if (project.type !== type) {
        toast.error(`This file is a "${project.type}" project, not a ${type}.`);
        return;
      }
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
          source: "pscomixx-file",
          type: project.type,
          title: project.title,
          data: project.data,
          assets: project.assets,
          importedAt: new Date().toISOString(),
        }));
      } catch (storageErr) {
        console.error(`[${type}] Could not stash import payload:`, storageErr);
        toast.error("Couldn't import: your browser blocked session storage. Try a different browser or disable private mode.");
        return;
      }
      toast.success(`Opening "${project.title}" as a new project…`);
      navigate(`${route}?import=pending`);
    } catch (err) {
      console.error(`[${type}] Open from computer failed:`, err);
      toast.error("Failed to open project file");
    }
  }, [type, route, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("import") !== "pending") return;
    if (importHydratedRef.current) return;
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) {
        navigate(route, { replace: true });
        return;
      }
      const payload = JSON.parse(raw);
      if (payload.type !== type) {
        sessionStorage.removeItem(SESSION_KEY);
        navigate(route, { replace: true });
        return;
      }
      applySnapshot({
        title: payload.title || defaultTitle,
        data: payload.data,
        assets: payload.assets,
      });
      sessionStorage.removeItem(SESSION_KEY);
      try { sessionStorage.setItem(`pscomixx:just-imported:${type}`, '1'); } catch {}
      importHydratedRef.current = true;
      toast.success(`Imported "${payload.title}" from .pscomixx file`);
      navigate(route, { replace: true });
    } catch (err) {
      console.error(`[${type}] Pending import hydration failed:`, err);
      toast.error("Could not load imported project");
      try { sessionStorage.removeItem(SESSION_KEY); } catch {}
      navigate(route, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return { handleSaveToComputer, handleOpenFromComputer, isDesktop: isDesktop() };
}
