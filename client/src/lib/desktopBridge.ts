/**
 * Desktop bridge — abstracts Tauri filesystem access so the same code runs in
 * both browser (web) and Tauri (desktop) contexts. In the browser we fall back
 * to standard download/upload via Blob + <input type="file">.
 *
 * Desktop adds:
 *  - Save project as .pscomixx (zip of project.json + assets/)
 *  - Open .pscomixx from disk
 *  - Native file/save dialogs
 */
import JSZip from "jszip";

export interface PscomixxProject {
  title: string;
  type: string;
  data: any; // tool-specific payload (spreads, scenes, slides, etc.)
  assets?: Array<{ name: string; mimeType: string; base64: string }>;
  meta?: Record<string, any>;
  exportedAt: string;
  formatVersion: number;
}

export const PSCOMIXX_FORMAT_VERSION = 1;

export function isDesktop(): boolean {
  if (typeof window === "undefined") return false;
  // Tauri v2 exposes window.__TAURI_INTERNALS__; v1 used window.__TAURI__
  return Boolean(
    (window as any).__TAURI_INTERNALS__ ||
    (window as any).__TAURI__ ||
    (window as any).isTauri
  );
}

async function getTauriDialog() {
  if (!isDesktop()) return null;
  try {
    const mod = "@tauri-apps/plugin-dialog";
    return await import(/* @vite-ignore */ mod);
  } catch {
    return null;
  }
}

async function getTauriFs() {
  if (!isDesktop()) return null;
  try {
    const mod = "@tauri-apps/plugin-fs";
    return await import(/* @vite-ignore */ mod);
  } catch {
    return null;
  }
}

/**
 * Build a .pscomixx zip blob from a PscomixxProject. Browser-safe.
 */
export async function buildPscomixxZip(project: PscomixxProject): Promise<Uint8Array> {
  const zip = new JSZip();

  const projectMeta = {
    title: project.title,
    type: project.type,
    formatVersion: project.formatVersion ?? PSCOMIXX_FORMAT_VERSION,
    exportedAt: project.exportedAt,
    meta: project.meta || {},
  };
  zip.file("manifest.json", JSON.stringify(projectMeta, null, 2));
  zip.file("project.json", JSON.stringify(project.data, null, 2));

  if (project.assets && project.assets.length > 0) {
    const assetsFolder = zip.folder("assets");
    if (assetsFolder) {
      for (const asset of project.assets) {
        assetsFolder.file(asset.name, asset.base64, { base64: true });
      }
    }
  }

  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

/**
 * Parse a .pscomixx zip into a PscomixxProject.
 */
export async function parsePscomixxZip(bytes: Uint8Array | ArrayBuffer): Promise<PscomixxProject> {
  const zip = await JSZip.loadAsync(bytes);

  const manifestFile = zip.file("manifest.json");
  const projectFile = zip.file("project.json");
  if (!projectFile) {
    throw new Error("Invalid .pscomixx file: missing project.json");
  }

  const manifestRaw = manifestFile ? await manifestFile.async("string") : "{}";
  const projectRaw = await projectFile.async("string");
  const manifest = JSON.parse(manifestRaw);
  const data = JSON.parse(projectRaw);

  const assets: PscomixxProject["assets"] = [];
  const assetsFolder = zip.folder("assets");
  if (assetsFolder) {
    const entries = Object.keys(zip.files).filter(
      (k) => k.startsWith("assets/") && !zip.files[k].dir
    );
    for (const entryName of entries) {
      const file = zip.file(entryName);
      if (!file) continue;
      const base64 = await file.async("base64");
      const name = entryName.replace(/^assets\//, "");
      const ext = name.split(".").pop()?.toLowerCase() || "";
      const mimeType = ext === "png" ? "image/png" :
        ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
        ext === "webp" ? "image/webp" :
        ext === "gif" ? "image/gif" :
        ext === "svg" ? "image/svg+xml" :
        "application/octet-stream";
      assets.push({ name, mimeType, base64 });
    }
  }

  return {
    title: manifest.title || "Untitled",
    type: manifest.type || "unknown",
    data,
    assets,
    meta: manifest.meta || {},
    exportedAt: manifest.exportedAt || new Date().toISOString(),
    formatVersion: manifest.formatVersion ?? PSCOMIXX_FORMAT_VERSION,
  };
}

/**
 * Save a project as .pscomixx. On desktop, opens a save dialog and writes
 * locally. On web, triggers a browser download.
 */
export async function saveProjectToFile(project: PscomixxProject): Promise<{ saved: boolean; path?: string }> {
  const bytes = await buildPscomixxZip(project);
  const safeName = (project.title || "project").replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "project";

  if (isDesktop()) {
    const dialog = await getTauriDialog();
    const fs = await getTauriFs();
    if (dialog && fs) {
      const filePath = await dialog.save({
        defaultPath: `${safeName}.pscomixx`,
        filters: [{ name: "PSCoMiXX Project", extensions: ["pscomixx"] }],
      });
      if (!filePath) return { saved: false };
      await fs.writeFile(filePath, bytes);
      return { saved: true, path: filePath };
    }
  }

  // Web fallback — trigger download
  const blob = new Blob([bytes], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName}.pscomixx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { saved: true };
}

/**
 * Open a .pscomixx file. On desktop, opens a native open dialog. On web,
 * uses an <input type="file">. Returns null if user cancels.
 */
export async function openProjectFromFile(): Promise<PscomixxProject | null> {
  if (isDesktop()) {
    const dialog = await getTauriDialog();
    const fs = await getTauriFs();
    if (dialog && fs) {
      const selected = await dialog.open({
        multiple: false,
        filters: [{ name: "PSCoMiXX Project", extensions: ["pscomixx", "zip"] }],
      });
      if (!selected || Array.isArray(selected)) return null;
      const bytes = await fs.readFile(selected as string);
      return parsePscomixxZip(bytes);
    }
  }

  // Web fallback — file input
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pscomixx,.zip,application/zip";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const buf = await file.arrayBuffer();
      try {
        const project = await parsePscomixxZip(new Uint8Array(buf));
        resolve(project);
      } catch (err) {
        console.error("Failed to parse .pscomixx file:", err);
        resolve(null);
      }
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
