export type PortfolioBackground = {
  type: "solid" | "gradient" | "image" | "pattern";
  color?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientAngle?: number;
  imageUrl?: string;
  pattern?: "dots" | "lines" | "halftone" | "grid" | "paper" | "none";
  overlayOpacity?: number;
};

export type PortfolioSurface = {
  color?: string;
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: "solid" | "dashed" | "none";
  radius?: number;
  shadow?: "none" | "soft" | "hard" | "glow";
};

export type PortfolioFonts = {
  display?: string;
  body?: string;
};

export type PortfolioLayout = {
  style: "grid" | "magazine" | "reel" | "compact";
  heroStyle?: "centered" | "split" | "minimal";
};

export type PortfolioSections = {
  showStats?: boolean;
  showAbout?: boolean;
  showSocial?: boolean;
  showWorks?: boolean;
  showArtworks?: boolean;
  showIntro?: boolean;
  order?: string[];
};

export type PortfolioIntro = {
  enabled: boolean;
  headline?: string;
  body?: string;
  imageUrl?: string;
};

export type PortfolioTheme = {
  preset?: string;
  accentColor?: string;
  accent2Color?: string;
  textColor?: string;
  mutedTextColor?: string;
  background?: PortfolioBackground;
  surface?: PortfolioSurface;
  fonts?: PortfolioFonts;
  layout?: PortfolioLayout;
  sections?: PortfolioSections;
  intro?: PortfolioIntro;
};

export const FONT_OPTIONS: Array<{ id: string; label: string; stack: string; sample: string }> = [
  { id: "space-grotesk", label: "Space Grotesk", stack: "'Space Grotesk', system-ui, sans-serif", sample: "Bold modern" },
  { id: "bebas-neue", label: "Bebas Neue", stack: "'Bebas Neue', Impact, sans-serif", sample: "TALL DISPLAY" },
  { id: "playfair", label: "Playfair Display", stack: "'Playfair Display', Georgia, serif", sample: "Elegant serif" },
  { id: "inter", label: "Inter", stack: "'Inter', system-ui, sans-serif", sample: "Clean & quiet" },
  { id: "press-start", label: "Press Start 2P", stack: "'Press Start 2P', 'Courier New', monospace", sample: "8-BIT PIXEL" },
  { id: "comic-neue", label: "Comic Neue", stack: "'Comic Neue', 'Comic Sans MS', cursive", sample: "Friendly comic" },
  { id: "creepster", label: "Creepster", stack: "'Creepster', 'Chiller', cursive", sample: "Spooky horror" },
  { id: "permanent-marker", label: "Permanent Marker", stack: "'Permanent Marker', 'Marker Felt', cursive", sample: "Hand-drawn ink" },
  { id: "monoton", label: "Monoton", stack: "'Monoton', 'Impact', sans-serif", sample: "RETRO NEON" },
  { id: "georgia", label: "Georgia", stack: "Georgia, 'Times New Roman', serif", sample: "Classic editorial" },
  { id: "courier", label: "Courier", stack: "'Courier Prime', 'Courier New', monospace", sample: "Typewriter" },
  { id: "system", label: "System Default", stack: "system-ui, -apple-system, sans-serif", sample: "Native feel" },
];

export const fontStack = (id?: string): string =>
  FONT_OPTIONS.find(f => f.id === id)?.stack || FONT_OPTIONS[0].stack;

const PATTERN_SVGS: Record<string, string> = {
  dots: `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'><circle cx='2' cy='2' r='1.2' fill='%23000' opacity='0.18'/></svg>`,
  lines: `<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M0 12 L12 0' stroke='%23000' stroke-width='0.7' opacity='0.18'/></svg>`,
  halftone: `<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14'><circle cx='7' cy='7' r='2.6' fill='%23000' opacity='0.18'/></svg>`,
  grid: `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><path d='M0 0 H32 M0 0 V32' stroke='%23000' stroke-width='0.6' opacity='0.15' fill='none'/></svg>`,
  paper: `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='5'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.18 0'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>`,
};

export const backgroundCss = (bg?: PortfolioBackground): React.CSSProperties => {
  if (!bg || bg.type === "solid") {
    return { backgroundColor: bg?.color || "#000000" };
  }
  if (bg.type === "gradient") {
    const angle = typeof bg.gradientAngle === "number" ? bg.gradientAngle : 135;
    return {
      background: `linear-gradient(${angle}deg, ${bg.gradientFrom || "#0a0a0a"}, ${bg.gradientTo || "#1a1a1a"})`,
    };
  }
  if (bg.type === "image" && bg.imageUrl) {
    return {
      backgroundImage: `url(${bg.imageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundColor: bg.color || "#000000",
    };
  }
  if (bg.type === "pattern") {
    const pattern = bg.pattern && bg.pattern !== "none" ? PATTERN_SVGS[bg.pattern] : null;
    if (pattern) {
      return {
        backgroundColor: bg.color || "#fff7d6",
        backgroundImage: `url("data:image/svg+xml;utf8,${pattern}")`,
        backgroundRepeat: "repeat",
      };
    }
    return { backgroundColor: bg.color || "#fff7d6" };
  }
  return { backgroundColor: "#000000" };
};

export const surfaceCss = (s?: PortfolioSurface): React.CSSProperties => {
  const shadows: Record<string, string> = {
    none: "none",
    soft: "0 6px 24px rgba(0,0,0,0.18)",
    hard: "6px 6px 0 rgba(0,0,0,0.85)",
    glow: "0 0 18px rgba(0,255,255,0.35), 0 0 4px rgba(0,255,255,0.6)",
  };
  return {
    backgroundColor: s?.color || "rgba(24,24,27,0.55)",
    borderColor: s?.borderColor || "rgba(255,255,255,0.08)",
    borderWidth: typeof s?.borderWidth === "number" ? s.borderWidth : 1,
    borderStyle: s?.borderStyle || "solid",
    borderRadius: typeof s?.radius === "number" ? s.radius : 0,
    boxShadow: shadows[s?.shadow || "none"],
  };
};

export const PORTFOLIO_PRESETS: Array<{ id: string; label: string; description: string; theme: PortfolioTheme }> = [
  {
    id: "cyber-noir",
    label: "Cyber Noir",
    description: "Black + neon cyan, sharp display type. The default look.",
    theme: {
      preset: "cyber-noir",
      accentColor: "#22d3ee",
      accent2Color: "#a855f7",
      textColor: "#ffffff",
      mutedTextColor: "#a1a1aa",
      background: { type: "solid", color: "#000000" },
      surface: { color: "rgba(24,24,27,0.7)", borderColor: "rgba(34,211,238,0.35)", borderWidth: 1, borderStyle: "solid", radius: 0, shadow: "glow" },
      fonts: { display: "space-grotesk", body: "inter" },
      layout: { style: "grid", heroStyle: "split" },
    },
  },
  {
    id: "vintage-pulp",
    label: "Vintage Pulp",
    description: "Cream paper, oxblood red, classic pulp serif. Old-newsstand feel.",
    theme: {
      preset: "vintage-pulp",
      accentColor: "#b91c1c",
      accent2Color: "#1e3a8a",
      textColor: "#1c1917",
      mutedTextColor: "#57534e",
      background: { type: "pattern", color: "#fef3c7", pattern: "paper" },
      surface: { color: "#fffbeb", borderColor: "#1c1917", borderWidth: 2, borderStyle: "solid", radius: 0, shadow: "hard" },
      fonts: { display: "bebas-neue", body: "georgia" },
      layout: { style: "magazine", heroStyle: "centered" },
    },
  },
  {
    id: "sunday-funnies",
    label: "Sunday Funnies",
    description: "Bright yellow + red, halftone dots, friendly hand-lettered feel.",
    theme: {
      preset: "sunday-funnies",
      accentColor: "#dc2626",
      accent2Color: "#2563eb",
      textColor: "#000000",
      mutedTextColor: "#374151",
      background: { type: "pattern", color: "#fde047", pattern: "halftone" },
      surface: { color: "#ffffff", borderColor: "#000000", borderWidth: 3, borderStyle: "solid", radius: 12, shadow: "hard" },
      fonts: { display: "permanent-marker", body: "comic-neue" },
      layout: { style: "grid", heroStyle: "centered" },
    },
  },
  {
    id: "indie-pastel",
    label: "Indie Pastel",
    description: "Soft off-white, lilac accents, airy minimal layout.",
    theme: {
      preset: "indie-pastel",
      accentColor: "#a78bfa",
      accent2Color: "#fb7185",
      textColor: "#1f2937",
      mutedTextColor: "#6b7280",
      background: { type: "gradient", gradientFrom: "#faf5ff", gradientTo: "#fdf2f8", gradientAngle: 135 },
      surface: { color: "#ffffff", borderColor: "#e5e7eb", borderWidth: 1, borderStyle: "solid", radius: 16, shadow: "soft" },
      fonts: { display: "playfair", body: "inter" },
      layout: { style: "magazine", heroStyle: "centered" },
    },
  },
  {
    id: "brutalist-print",
    label: "Brutalist Print",
    description: "Stark white + black, hard borders, no nonsense.",
    theme: {
      preset: "brutalist-print",
      accentColor: "#000000",
      accent2Color: "#dc2626",
      textColor: "#000000",
      mutedTextColor: "#525252",
      background: { type: "solid", color: "#ffffff" },
      surface: { color: "#ffffff", borderColor: "#000000", borderWidth: 4, borderStyle: "solid", radius: 0, shadow: "hard" },
      fonts: { display: "bebas-neue", body: "system" },
      layout: { style: "grid", heroStyle: "minimal" },
    },
  },
  {
    id: "noir-ink",
    label: "Noir Ink",
    description: "Deep ink-black with white type, typewriter mood.",
    theme: {
      preset: "noir-ink",
      accentColor: "#fafafa",
      accent2Color: "#fbbf24",
      textColor: "#fafafa",
      mutedTextColor: "#a3a3a3",
      background: { type: "pattern", color: "#0a0a0a", pattern: "grid" },
      surface: { color: "rgba(20,20,20,0.8)", borderColor: "#3f3f46", borderWidth: 1, borderStyle: "solid", radius: 2, shadow: "soft" },
      fonts: { display: "courier", body: "courier" },
      layout: { style: "compact", heroStyle: "minimal" },
    },
  },
  {
    id: "horror-vintage",
    label: "Horror Vintage",
    description: "EC-Comics dread: blood red on bone, drippy display type.",
    theme: {
      preset: "horror-vintage",
      accentColor: "#7f1d1d",
      accent2Color: "#000000",
      textColor: "#1c1917",
      mutedTextColor: "#57534e",
      background: { type: "pattern", color: "#e7e0d3", pattern: "paper" },
      surface: { color: "#f5efe2", borderColor: "#7f1d1d", borderWidth: 2, borderStyle: "solid", radius: 0, shadow: "hard" },
      fonts: { display: "creepster", body: "georgia" },
      layout: { style: "magazine", heroStyle: "split" },
    },
  },
  {
    id: "neon-arcade",
    label: "Neon Arcade",
    description: "80s synthwave purples and pinks, grid horizon glow.",
    theme: {
      preset: "neon-arcade",
      accentColor: "#ec4899",
      accent2Color: "#22d3ee",
      textColor: "#fdf4ff",
      mutedTextColor: "#c4b5fd",
      background: { type: "gradient", gradientFrom: "#1e1b4b", gradientTo: "#831843", gradientAngle: 180 },
      surface: { color: "rgba(30,27,75,0.7)", borderColor: "#ec4899", borderWidth: 1, borderStyle: "solid", radius: 6, shadow: "glow" },
      fonts: { display: "monoton", body: "inter" },
      layout: { style: "reel", heroStyle: "centered" },
    },
  },
];

// DEFAULT_THEME is used when a creator has NOT set any portfolioTheme yet.
// It must visually match the legacy pre-customizer portfolio look so existing
// portfolios are not regressed by the new system.
export const DEFAULT_THEME: PortfolioTheme = {
  preset: undefined,
  accentColor: "#22d3ee",
  accent2Color: "#a855f7",
  textColor: "#ffffff",
  mutedTextColor: "#a1a1aa",
  background: { type: "solid", color: "#000000" },
  surface: {
    color: "rgba(24,24,27,0.5)",
    borderColor: "#3f3f46",
    borderWidth: 2,
    borderStyle: "solid",
    radius: 0,
    shadow: "none",
  },
  fonts: { display: "space-grotesk", body: "inter" },
  layout: { style: "grid", heroStyle: "split" },
};

export const DEFAULT_SECTIONS: PortfolioSections = {
  showStats: true,
  showAbout: true,
  showSocial: true,
  showWorks: true,
  showArtworks: true,
  showIntro: false,
  order: ["intro", "about", "works", "artworks"],
};

export const mergeTheme = (override?: PortfolioTheme | null): PortfolioTheme => {
  const base = DEFAULT_THEME;
  if (!override) return { ...base, sections: DEFAULT_SECTIONS };
  return {
    ...base,
    ...override,
    accentColor: override.accentColor || base.accentColor,
    accent2Color: override.accent2Color || base.accent2Color,
    textColor: override.textColor || base.textColor,
    mutedTextColor: override.mutedTextColor || base.mutedTextColor,
    background: { ...(base.background || {}), ...(override.background || {}) } as PortfolioBackground,
    surface: { ...(base.surface || {}), ...(override.surface || {}) } as PortfolioSurface,
    fonts: { ...(base.fonts || {}), ...(override.fonts || {}) } as PortfolioFonts,
    layout: { ...(base.layout || { style: "grid" }), ...(override.layout || {}) } as PortfolioLayout,
    sections: { ...DEFAULT_SECTIONS, ...(override.sections || {}) } as PortfolioSections,
    intro: override.intro,
  };
};

export const themeToCssVars = (theme: PortfolioTheme): React.CSSProperties => {
  const vars: Record<string, string> = {
    "--pf-accent": theme.accentColor || "#22d3ee",
    "--pf-accent-2": theme.accent2Color || "#a855f7",
    "--pf-text": theme.textColor || "#ffffff",
    "--pf-muted": theme.mutedTextColor || "#a1a1aa",
    "--pf-display-font": fontStack(theme.fonts?.display),
    "--pf-body-font": fontStack(theme.fonts?.body),
  };
  return vars as React.CSSProperties;
};

export const ensureGoogleFonts = () => {
  if (typeof document === "undefined") return;
  const id = "pf-google-fonts";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700;900&family=Bebas+Neue&family=Playfair+Display:wght@400;700;900&family=Inter:wght@400;500;700&family=Press+Start+2P&family=Comic+Neue:wght@400;700&family=Creepster&family=Permanent+Marker&family=Monoton&family=Courier+Prime:wght@400;700&display=swap";
  document.head.appendChild(link);
};
