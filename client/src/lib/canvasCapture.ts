import html2canvas from "html2canvas";

export function sanitizeColorsForCapture(clonedDoc: Document) {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return;
  const colorProps = [
    "color", "background-color", "border-color",
    "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
    "outline-color",
  ];
  const resolve = (val: string): string => {
    ctx.fillStyle = "#000000";
    ctx.fillStyle = val;
    return ctx.fillStyle;
  };
  clonedDoc.querySelectorAll("*").forEach((el) => {
    const computed = getComputedStyle(el);
    const htmlEl = el as HTMLElement;
    colorProps.forEach((prop) => {
      const val = computed.getPropertyValue(prop);
      if (val && (val.includes("oklab") || val.includes("oklch") || val.includes("color-mix"))) {
        htmlEl.style.setProperty(prop, resolve(val));
      }
    });
    const bg = computed.getPropertyValue("background");
    if (bg && (bg.includes("oklab") || bg.includes("oklch") || bg.includes("color-mix"))) {
      htmlEl.style.setProperty("background-color", resolve(computed.getPropertyValue("background-color")));
      htmlEl.style.setProperty("background-image", computed.getPropertyValue("background-image"));
    }
    const bs = computed.getPropertyValue("box-shadow");
    if (bs && (bs.includes("oklab") || bs.includes("oklch") || bs.includes("color-mix"))) {
      htmlEl.style.setProperty("box-shadow", "none");
    }
  });
}

export async function captureElement(
  el: HTMLElement,
  options: {
    scale?: number;
    backgroundColor?: string | null;
  } = {}
): Promise<HTMLCanvasElement> {
  const baseOpts = {
    scale: options.scale ?? 1,
    backgroundColor: options.backgroundColor ?? null,
    logging: false,
    onclone: (_doc: Document) => sanitizeColorsForCapture(_doc),
  };

  try {
    const canvas = await html2canvas(el, {
      ...baseOpts,
      useCORS: true,
      allowTaint: false,
    });
    canvas.toDataURL("image/png");
    return canvas;
  } catch {
    return html2canvas(el, {
      ...baseOpts,
      useCORS: false,
      allowTaint: true,
    });
  }
}
