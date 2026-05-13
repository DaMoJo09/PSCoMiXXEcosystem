import { CoverData, defaultCover } from "./tools/CoverEditorPanel";

interface T {
  x: number; y: number; width: number; height: number;
  rotation?: number; scaleX?: number; scaleY?: number;
}

const W = 600;
const H = 900;

function pct(t: T | undefined, fallback: T): React.CSSProperties {
  const tr = t || fallback;
  return {
    position: "absolute",
    left: `${(tr.x / W) * 100}%`,
    top: `${(tr.y / H) * 100}%`,
    width: `${(tr.width / W) * 100}%`,
    height: `${(tr.height / H) * 100}%`,
    transform: tr.rotation ? `rotate(${tr.rotation}deg)` : undefined,
  };
}

interface Props {
  cd: Partial<CoverData> | null | undefined;
  side: "front" | "back";
  className?: string;
  style?: React.CSSProperties;
}

export function CoverRender({ cd: cdIn, side, className, style }: Props) {
  if (!cdIn) return null;
  const cd = { ...defaultCover, ...cdIn } as CoverData;
  const isFront = side === "front";
  const hidden = new Set(cd.hiddenElements || []);
  const zOrder = cd.elementZOrder || [];
  const z = (id: string, base = 2) => Math.max(zOrder.indexOf(id), 0) + base;

  const bgColor = isFront ? cd.frontBgColor : cd.backBgColor;
  const bgImage = isFront ? cd.frontImage : cd.backImage;
  const bgKey = isFront ? "front" : "back";
  const bgTransform = (cd as any)[`${bgKey}BgTransform`] as T | undefined;
  const imageLayers = (isFront ? cd.frontImageLayers : cd.backImageLayers) || [];
  const textLayers = (isFront ? cd.frontLayers : cd.backLayers) || [];

  const allUserIds = new Set([...imageLayers.map(l => l.id), ...textLayers.map(l => l.id)]);
  const orderedUserIds = [...zOrder.filter(id => allUserIds.has(id))];
  allUserIds.forEach(id => { if (!orderedUserIds.includes(id)) orderedUserIds.push(id); });
  const imgMap = new Map(imageLayers.map(l => [l.id, l]));
  const txtMap = new Map(textLayers.map(l => [l.id, l]));

  return (
    <div
      className={`relative overflow-hidden ${className || ""}`}
      style={{ backgroundColor: bgColor, containerType: "size" as any, ...style }}
    >
      {bgImage && !hidden.has(`bg-${bgKey}`) && (
        <img
          src={bgImage}
          alt=""
          draggable={false}
          className="object-cover pointer-events-none select-none"
          style={{ ...pct(bgTransform, { x: 0, y: 0, width: W, height: H }), zIndex: z(`bg-${bgKey}`, 1) }}
        />
      )}

      {isFront ? (
        <>
          {cd.bannerText && !hidden.has("master-banner") && (
            <div
              className="flex items-center justify-center text-center font-bold tracking-widest uppercase"
              style={{
                ...pct(cd.bannerTransform, defaultCover.bannerTransform!),
                backgroundColor: cd.bannerBgColor || "#000",
                color: cd.titleColor,
                fontSize: "max(6px, 2.5cqi)",
                letterSpacing: "0.15em",
                zIndex: z("master-banner"),
              }}
            >{cd.bannerText}</div>
          )}

          {cd.publisherName && !hidden.has("master-publisher") && (
            <div
              className="flex items-center justify-center font-bold uppercase tracking-wider opacity-80"
              style={{
                ...pct(cd.publisherTransform, defaultCover.publisherTransform!),
                color: cd.titleColor,
                fontSize: "max(5px, 2.5cqi)",
                zIndex: z("master-publisher"),
              }}
            >{cd.publisherName}</div>
          )}

          {cd.issueNumber && !hidden.has("master-issue") && (
            <div
              className="flex flex-col items-center justify-center font-bold"
              style={{
                ...pct(cd.issueNumberTransform, defaultCover.issueNumberTransform!),
                color: cd.titleColor,
                fontSize: "max(6px, 3cqi)",
                zIndex: z("master-issue"),
              }}
            >
              <span>{cd.issueNumber}</span>
              {cd.issueDate && <span style={{ fontSize: "max(4px, 1.8cqi)", fontWeight: "normal", opacity: 0.7 }}>{cd.issueDate}</span>}
            </div>
          )}

          {cd.title && !hidden.has("master-title") && !cd.titleImage && (
            <div
              className="flex items-center justify-center text-center leading-none break-words"
              style={{
                ...pct(cd.titleTransform, defaultCover.titleTransform!),
                fontFamily: cd.titleFont,
                color: cd.titleColor,
                fontSize: "max(12px, 8cqi)",
                fontWeight: cd.titleBold !== false ? "bold" : "normal",
                fontStyle: cd.titleItalic ? "italic" : "normal",
                textTransform: cd.titleUppercase !== false ? "uppercase" : "none",
                WebkitTextStroke: cd.titleStrokeWidth ? `${Math.max(0.5, cd.titleStrokeWidth * 0.4)}px ${cd.titleStrokeColor || "#000"}` : undefined,
                textShadow: "2px 2px 4px rgba(0,0,0,0.6)",
                zIndex: z("master-title"),
              }}
            >{cd.title}</div>
          )}

          {cd.subtitle && !hidden.has("master-subtitle") && (
            <div
              className="flex items-center justify-center text-center break-words"
              style={{
                ...pct(cd.subtitleTransform, defaultCover.subtitleTransform!),
                fontFamily: cd.subtitleFont,
                color: cd.subtitleColor,
                fontSize: "max(5px, 3cqi)",
                fontWeight: cd.subtitleBold ? "bold" : "normal",
                fontStyle: cd.subtitleItalic ? "italic" : "normal",
                textTransform: cd.subtitleUppercase ? "uppercase" : "none",
                zIndex: z("master-subtitle"),
              }}
            >{cd.subtitle}</div>
          )}

          {cd.tagline && !hidden.has("master-tagline") && (
            <div
              className="flex items-center justify-center italic opacity-80 text-center"
              style={{
                ...pct(cd.taglineTransform, defaultCover.taglineTransform!),
                color: cd.subtitleColor,
                fontSize: "max(4px, 2cqi)",
                zIndex: z("master-tagline"),
              }}
            >{cd.tagline}</div>
          )}

          {cd.author && !hidden.has("master-author") && (
            <div
              className="flex items-center justify-center text-center"
              style={{
                ...pct(cd.authorTransform, defaultCover.authorTransform!),
                fontFamily: cd.authorFont,
                color: cd.authorColor,
                fontSize: "max(6px, 3.5cqi)",
                fontWeight: cd.authorBold ? "bold" : "normal",
                fontStyle: cd.authorItalic ? "italic" : "normal",
                textTransform: cd.authorUppercase ? "uppercase" : "none",
                zIndex: z("master-author"),
              }}
            >{cd.author}</div>
          )}

          {cd.titleImage && !hidden.has("master-title-image") && (
            <img
              src={cd.titleImage}
              alt=""
              draggable={false}
              className="object-contain pointer-events-none select-none"
              style={{ ...pct(cd.titleImageTransform, defaultCover.titleImageTransform!), zIndex: z("master-title-image", 3) }}
            />
          )}

          {cd.heroImage && !hidden.has("master-hero") && (
            <img
              src={cd.heroImage}
              alt=""
              draggable={false}
              className="object-contain pointer-events-none select-none"
              style={{ ...pct(cd.heroImageTransform, defaultCover.heroImageTransform!), zIndex: z("master-hero") }}
            />
          )}

          {cd.frontBarcodeImage && !hidden.has("master-front-barcode") && (
            <img
              src={cd.frontBarcodeImage}
              alt=""
              draggable={false}
              className="object-contain pointer-events-none select-none bg-white"
              style={{ ...pct(cd.frontBarcodeTransform, defaultCover.frontBarcodeTransform!), zIndex: z("master-front-barcode", 3) }}
            />
          )}

          {cd.showPriceBox && (cd.priceText || cd.priceTagImage) && !hidden.has("master-price") && (() => {
            const hasImg = !!cd.priceTagImage;
            const isDiamond = cd.priceBoxShape === "diamond" && !hasImg;
            const base = pct(cd.priceBoxTransform, defaultCover.priceBoxTransform!);
            const tr = cd.priceBoxTransform || defaultCover.priceBoxTransform!;
            return (
              <div
                className="flex items-center justify-center"
                style={{
                  ...base,
                  transform: `rotate(${(tr.rotation || 0) + (isDiamond ? 45 : 0)}deg)`,
                  backgroundColor: hasImg ? "transparent" : (cd.priceBoxColor || cd.bannerBgColor || "#FFD700"),
                  color: cd.priceBoxTextColor || "#000",
                  fontWeight: "bold",
                  fontSize: "max(6px, 3cqi)",
                  border: hasImg ? "none" : "1px solid #000",
                  borderRadius: hasImg ? 0 : (cd.priceBoxShape === "circle" ? "50%" : undefined),
                  zIndex: z("master-price"),
                }}
              >
                {hasImg ? (
                  <img src={cd.priceTagImage} alt="" draggable={false} className="w-full h-full object-contain pointer-events-none select-none" />
                ) : (
                  <span style={{ transform: isDiamond ? "rotate(-45deg)" : undefined, display: "block" }}>{cd.priceText}</span>
                )}
              </div>
            );
          })()}
        </>
      ) : (
        <>
          {cd.title && !hidden.has("master-back-title") && !cd.titleImage && (
            <div
              className="flex items-center justify-center text-center break-words font-bold uppercase"
              style={{
                ...pct(cd.backTitleTransform, defaultCover.backTitleTransform!),
                fontFamily: cd.titleFont,
                color: cd.titleColor,
                fontSize: "max(8px, 5cqi)",
                textShadow: "1px 1px 3px rgba(0,0,0,0.5)",
                zIndex: z("master-back-title"),
              }}
            >{cd.title}</div>
          )}

          {cd.backBlurb && !hidden.has("master-blurb") && (
            <div
              className="flex items-start justify-center leading-relaxed break-words text-center overflow-hidden"
              style={{
                ...pct(cd.backBlurbTransform, defaultCover.backBlurbTransform!),
                padding: "4%",
                fontFamily: cd.backBlurbFont || "Georgia, serif",
                color: cd.backBlurbColor || cd.authorColor,
                fontSize: "max(4px, 2.2cqi)",
                lineHeight: "1.5",
                fontWeight: cd.backBlurbBold ? "bold" : "normal",
                fontStyle: cd.backBlurbItalic ? "italic" : "normal",
                zIndex: z("master-blurb"),
              }}
            >{cd.backBlurb}</div>
          )}

          {cd.author && !hidden.has("master-back-author") && (
            <div
              className="flex items-center justify-center text-center"
              style={{
                ...pct(cd.backAuthorTransform, defaultCover.backAuthorTransform!),
                fontFamily: cd.authorFont,
                color: cd.authorColor,
                fontSize: "max(5px, 2.5cqi)",
                zIndex: z("master-back-author"),
              }}
            >by {cd.author}</div>
          )}

          {cd.isbn && !hidden.has("master-isbn") && !cd.backBarcodeImage && (
            <div
              className="flex flex-col items-center justify-center"
              style={{
                ...pct(cd.isbnTransform, defaultCover.isbnTransform!),
                backgroundColor: cd.showBarcode !== false ? "#fff" : "transparent",
                padding: cd.showBarcode !== false ? "2px" : 0,
                zIndex: z("master-isbn"),
              }}
            >
              {cd.showBarcode !== false && (
                <div style={{ display: "flex", gap: "0.5px", height: "60%", alignItems: "flex-end", marginBottom: "1px" }}>
                  {cd.isbn.split("").map((ch, i) => {
                    const w = ((parseInt(ch, 10) || 1) % 3) + 1;
                    return <div key={i} style={{ width: `${w}px`, height: `${60 + ((parseInt(ch, 10) || 0) * 3)}%`, backgroundColor: "#000", minWidth: "0.5px" }} />;
                  })}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={`p${i}`} style={{ width: "1px", height: `${70 + (i * 3)}%`, backgroundColor: "#000", minWidth: "0.5px" }} />
                  ))}
                </div>
              )}
              <div className="text-center font-mono" style={{
                color: cd.showBarcode !== false ? "#000" : (cd.authorColor || "#fff"),
                fontSize: "max(4px, 1.5cqi)",
                lineHeight: 1,
              }}>ISBN {cd.isbn}</div>
            </div>
          )}

          {cd.backHeroImage && !hidden.has("master-back-hero") && (
            <img
              src={cd.backHeroImage}
              alt=""
              draggable={false}
              className="object-contain pointer-events-none select-none"
              style={{ ...pct(cd.backHeroImageTransform, defaultCover.backHeroImageTransform!), zIndex: z("master-back-hero") }}
            />
          )}

          {cd.backBarcodeImage && !hidden.has("master-back-barcode") && (
            <img
              src={cd.backBarcodeImage}
              alt=""
              draggable={false}
              className="object-contain pointer-events-none select-none bg-white"
              style={{ ...pct(cd.backBarcodeTransform, defaultCover.backBarcodeTransform!), zIndex: z("master-back-barcode", 3) }}
            />
          )}

          {cd.publisherName && !hidden.has("master-back-publisher") && (
            <div
              className="flex items-center justify-center font-bold uppercase tracking-wider opacity-60"
              style={{
                ...pct(cd.backPublisherTransform, defaultCover.backPublisherTransform!),
                color: cd.authorColor,
                fontSize: "max(4px, 1.8cqi)",
                zIndex: z("master-back-publisher"),
              }}
            >{cd.publisherName}</div>
          )}
        </>
      )}

      {orderedUserIds.filter(id => !hidden.has(id)).map(id => {
        const il = imgMap.get(id);
        const zi = z(id);
        if (il) {
          const tr: T = il.transform || { x: 0, y: 0, width: 100, height: 100 };
          return (
            <img
              key={il.id}
              src={il.url}
              alt={il.name || ""}
              draggable={false}
              className="object-contain pointer-events-none select-none"
              style={{
                position: "absolute",
                left: `${(tr.x / W) * 100}%`,
                top: `${(tr.y / H) * 100}%`,
                width: `${(tr.width / W) * 100}%`,
                height: `${(tr.height / H) * 100}%`,
                transform: tr.rotation ? `rotate(${tr.rotation}deg)` : undefined,
                opacity: il.opacity ?? 1,
                mixBlendMode: (il.blendMode || "normal") as any,
                zIndex: zi,
              }}
            />
          );
        }
        const tl = txtMap.get(id);
        if (tl) {
          const tr: T = tl.transform || { x: 0, y: 0, width: 100, height: 30 };
          return (
            <div
              key={tl.id}
              className="flex items-center justify-center text-center pointer-events-none"
              style={{
                position: "absolute",
                left: `${(tr.x / W) * 100}%`,
                top: `${(tr.y / H) * 100}%`,
                width: `${(tr.width / W) * 100}%`,
                height: `${(tr.height / H) * 100}%`,
                transform: tr.rotation ? `rotate(${tr.rotation}deg)` : undefined,
                fontSize: `max(6px, ${(tl.fontSize || 24) * 0.05}cqi)`,
                fontFamily: tl.fontFamily,
                color: tl.color,
                fontWeight: tl.fontWeight || "normal",
                fontStyle: tl.fontStyle || "normal",
                textTransform: (tl.textTransform as any) || "none",
                WebkitTextStroke: tl.strokeWidth ? `${tl.strokeWidth * 0.5}px ${tl.strokeColor || "#000"}` : undefined,
                zIndex: zi,
              }}
            >{tl.text}</div>
          );
        }
        return null;
      })}
    </div>
  );
}
