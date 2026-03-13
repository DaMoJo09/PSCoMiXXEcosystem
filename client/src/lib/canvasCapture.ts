import html2canvas from "html2canvas";

function resolveColor(colorStr: string): string | null {
  try {
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#010101";
    ctx.fillStyle = colorStr;
    const result = ctx.fillStyle;
    if (result === "#010101") return null;
    return result;
  } catch {
    return null;
  }
}

function findClosingParen(css: string, openPos: number): number {
  let depth = 1;
  let i = openPos + 1;
  while (i < css.length && depth > 0) {
    if (css[i] === "(") depth++;
    if (css[i] === ")") depth--;
    i++;
  }
  return i;
}

function replaceModernColors(css: string): string {
  const keywords = ["oklch(", "oklab(", "color-mix("];
  let result = css;

  for (const kw of keywords) {
    let output = "";
    let searchFrom = 0;

    while (searchFrom < result.length) {
      const idx = result.toLowerCase().indexOf(kw.toLowerCase(), searchFrom);
      if (idx === -1) {
        output += result.slice(searchFrom);
        break;
      }
      output += result.slice(searchFrom, idx);
      const parenStart = idx + kw.length - 1;
      const end = findClosingParen(result, parenStart);
      const fullMatch = result.slice(idx, end);
      const resolved = resolveColor(fullMatch);
      output += resolved ?? fullMatch;
      searchFrom = end;
    }

    result = output;
  }

  return result;
}

interface StyleBackup {
  element: HTMLStyleElement;
  original: string;
}

interface LinkBackup {
  link: HTMLLinkElement;
  override: HTMLStyleElement;
}

let captureInProgress = false;

function sanitizeLiveStyles(): { styleBackups: StyleBackup[]; linkBackups: LinkBackup[] } {
  const styleBackups: StyleBackup[] = [];
  const linkBackups: LinkBackup[] = [];

  document.querySelectorAll("style").forEach((styleEl) => {
    const text = styleEl.textContent;
    if (text && (/oklch|oklab|color-mix/i.test(text))) {
      styleBackups.push({ element: styleEl as HTMLStyleElement, original: text });
      (styleEl as HTMLStyleElement).textContent = replaceModernColors(text);
    }
  });

  document.querySelectorAll('link[rel="stylesheet"]').forEach((linkEl) => {
    const link = linkEl as HTMLLinkElement;
    try {
      const sheet = link.sheet;
      if (!sheet) return;
      let cssText = "";
      try {
        for (let i = 0; i < sheet.cssRules.length; i++) {
          cssText += sheet.cssRules[i].cssText + "\n";
        }
      } catch {
        return;
      }
      if (/oklch|oklab|color-mix/i.test(cssText)) {
        const override = document.createElement("style");
        override.textContent = replaceModernColors(cssText);
        link.parentNode?.insertBefore(override, link.nextSibling);
        link.disabled = true;
        linkBackups.push({ link, override });
      }
    } catch {
    }
  });

  return { styleBackups, linkBackups };
}

function restoreLiveStyles(backups: { styleBackups: StyleBackup[]; linkBackups: LinkBackup[] }) {
  for (const b of backups.styleBackups) {
    b.element.textContent = b.original;
  }
  for (const b of backups.linkBackups) {
    b.link.disabled = false;
    b.override.remove();
  }
}

export async function captureElement(
  el: HTMLElement,
  options: {
    scale?: number;
    backgroundColor?: string | null;
  } = {}
): Promise<HTMLCanvasElement> {
  if (captureInProgress) {
    throw new Error("Another capture is already in progress");
  }
  captureInProgress = true;
  const backups = sanitizeLiveStyles();

  try {
    try {
      const canvas = await html2canvas(el, {
        scale: options.scale ?? 1,
        backgroundColor: options.backgroundColor ?? null,
        logging: false,
        useCORS: true,
        allowTaint: false,
      });
      canvas.toDataURL("image/png");
      return canvas;
    } catch {
      return await html2canvas(el, {
        scale: options.scale ?? 1,
        backgroundColor: options.backgroundColor ?? null,
        logging: false,
        useCORS: false,
        allowTaint: true,
      });
    }
  } finally {
    restoreLiveStyles(backups);
    captureInProgress = false;
  }
}
