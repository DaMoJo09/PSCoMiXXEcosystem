import { useState, useRef, useEffect } from "react";

interface TextElementProps {
  id: string;
  text: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  padding?: number;
  borderRadius?: number;
  bubbleStyle?: BubbleStyleType;
  textEffect?: TextEffectType;
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  onChange?: (id: string, text: string) => void;
  onStyleChange?: (id: string, styles: TextStyles) => void;
  isEditing?: boolean;
  onEditStart?: () => void;
  onEditEnd?: () => void;
}

type BubbleStyleType = "none" | "speech" | "thought" | "shout" | "whisper" | "burst" | "scream" | "robot" | "drip" | "glitch" | "retro" | "neon" | "graffiti" | "caption" | "starburst";

type TextEffectType = "none" | "outline" | "shadow" | "glow" | "3d" | "emboss" | "neon" | "comic" | "retro" | "fire" | "ice" | "gold" | "chrome";

interface TextStyles {
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor: string;
  padding: number;
  borderRadius: number;
  bubbleStyle: BubbleStyleType;
  textEffect?: TextEffectType;
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
}

const FONT_OPTIONS = [
  { value: "Inter, sans-serif", label: "Inter", category: "clean" },
  { value: "'Space Grotesk', sans-serif", label: "Space Grotesk", category: "clean" },
  
  { value: "'Bangers', cursive", label: "Bangers", category: "comic" },
  { value: "'Permanent Marker', cursive", label: "Permanent Marker", category: "comic" },
  { value: "'Luckiest Guy', cursive", label: "Luckiest Guy", category: "comic" },
  { value: "'Londrina Solid', cursive", label: "Londrina Solid", category: "comic" },
  { value: "'Londrina Sketch', cursive", label: "Londrina Sketch", category: "comic" },
  { value: "'Kranky', cursive", label: "Kranky", category: "comic" },
  { value: "'Gloria Hallelujah', cursive", label: "Gloria Hallelujah", category: "comic" },
  { value: "'Caveat', cursive", label: "Caveat", category: "comic" },
  { value: "'Rock Salt', cursive", label: "Rock Salt", category: "comic" },
  
  { value: "'Bungee', cursive", label: "Bungee", category: "bold" },
  { value: "'Black Ops One', cursive", label: "Black Ops One", category: "bold" },
  { value: "'Russo One', sans-serif", label: "Russo One", category: "bold" },
  { value: "'Righteous', cursive", label: "Righteous", category: "bold" },
  { value: "'Bebas Neue', sans-serif", label: "Bebas Neue", category: "bold" },
  { value: "'Anton', sans-serif", label: "Anton", category: "bold" },
  { value: "'Oswald', sans-serif", label: "Oswald", category: "bold" },
  { value: "'Titan One', cursive", label: "Titan One", category: "bold" },
  { value: "'Alfa Slab One', cursive", label: "Alfa Slab One", category: "bold" },
  { value: "'Sigmar One', cursive", label: "Sigmar One", category: "bold" },
  { value: "'Ultra', serif", label: "Ultra", category: "bold" },
  { value: "'Archivo Black', sans-serif", label: "Archivo Black", category: "bold" },
  { value: "'Carter One', cursive", label: "Carter One", category: "bold" },
  { value: "'Viga', sans-serif", label: "Viga", category: "bold" },
  { value: "'Teko', sans-serif", label: "Teko", category: "bold" },
  { value: "'Passion One', cursive", label: "Passion One", category: "bold" },
  { value: "'Lilita One', cursive", label: "Lilita One", category: "bold" },
  { value: "'Dela Gothic One', cursive", label: "Dela Gothic One", category: "bold" },
  
  { value: "'Audiowide', cursive", label: "Audiowide", category: "scifi" },
  { value: "'Orbitron', sans-serif", label: "Orbitron", category: "scifi" },
  { value: "'Press Start 2P', cursive", label: "Press Start 2P", category: "scifi" },
  { value: "'Silkscreen', cursive", label: "Silkscreen", category: "scifi" },
  { value: "'VT323', monospace", label: "VT323", category: "scifi" },
  { value: "'Share Tech Mono', monospace", label: "Share Tech Mono", category: "scifi" },
  { value: "'DotGothic16', sans-serif", label: "DotGothic16", category: "scifi" },
  { value: "'Rubik Mono One', sans-serif", label: "Rubik Mono One", category: "scifi" },
  
  { value: "'Fugaz One', cursive", label: "Fugaz One", category: "action" },
  { value: "'Racing Sans One', cursive", label: "Racing Sans One", category: "action" },
  { value: "'Faster One', cursive", label: "Faster One", category: "action" },
  { value: "'Rampart One', cursive", label: "Rampart One", category: "action" },
  
  { value: "'Creepster', cursive", label: "Creepster", category: "horror" },
  { value: "'Nosifer', cursive", label: "Nosifer", category: "horror" },
  { value: "'Metal Mania', cursive", label: "Metal Mania", category: "horror" },
  { value: "'Butcherman', cursive", label: "Butcherman", category: "horror" },
  { value: "'Eater', cursive", label: "Eater", category: "horror" },
  
  { value: "'Special Elite', cursive", label: "Special Elite", category: "vintage" },
  { value: "'Rye', cursive", label: "Rye", category: "vintage" },
  { value: "'Fascinate Inline', cursive", label: "Fascinate Inline", category: "vintage" },
  { value: "'Monoton', cursive", label: "Monoton", category: "vintage" },
  
  { value: "'Satisfy', cursive", label: "Satisfy", category: "script" },
  { value: "'Pacifico', cursive", label: "Pacifico", category: "script" },
  { value: "'Lobster', cursive", label: "Lobster", category: "script" },
  { value: "'Shadows Into Light', cursive", label: "Shadows Into Light", category: "script" },
  { value: "'Amatic SC', cursive", label: "Amatic SC", category: "script" },
  
  { value: "'Fredoka', sans-serif", label: "Fredoka", category: "fun" },
  { value: "'Bowlby One SC', cursive", label: "Bowlby One SC", category: "fun" },
  { value: "'Hachi Maru Pop', cursive", label: "Hachi Maru Pop", category: "fun" },
  { value: "'Cute Font', cursive", label: "Cute Font", category: "fun" },
  { value: "'East Sea Dokdo', cursive", label: "East Sea Dokdo", category: "fun" },
  { value: "'Gaegu', cursive", label: "Gaegu", category: "fun" },
  { value: "'Hi Melody', cursive", label: "Hi Melody", category: "fun" },
  { value: "'Jua', sans-serif", label: "Jua", category: "fun" },
  { value: "'Sunflower', sans-serif", label: "Sunflower", category: "fun" },
  
  { value: "'Impact', sans-serif", label: "Impact", category: "system" },
  { value: "'Arial Black', sans-serif", label: "Arial Black", category: "system" },
  { value: "Georgia, serif", label: "Georgia", category: "system" },
  { value: "'Courier New', monospace", label: "Courier New", category: "system" },
  { value: "'JetBrains Mono', monospace", label: "JetBrains Mono", category: "system" },
];

const BUBBLE_STYLES = {
  none: { bg: "transparent", border: "none", tail: false },
  speech: { bg: "white", border: "2px solid black", tail: true, tailType: "triangle" },
  thought: { bg: "white", border: "2px solid black", tail: true, tailType: "bubbles" },
  shout: { bg: "#ffeb3b", border: "3px solid #999", tail: true, tailType: "jagged" },
  whisper: { bg: "rgba(200,200,200,0.7)", border: "2px dashed #999", tail: true, tailType: "small" },
  burst: { bg: "#ff5722", border: "none", tail: false, clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)" },
  scream: { bg: "#ff1744", border: "4px solid #b71c1c", tail: true, tailType: "triangle", textColor: "white", animation: "shake" },
  robot: { bg: "#263238", border: "2px solid #4fc3f7", tail: true, tailType: "triangle", textColor: "#4fc3f7", fontFamily: "'Courier New', monospace" },
  drip: { bg: "linear-gradient(180deg, #e040fb, #7c4dff)", border: "none", tail: true, tailType: "triangle", textColor: "white" },
  glitch: { bg: "#000", border: "2px solid #0f0", tail: true, tailType: "triangle", textColor: "#0f0", fontFamily: "'Courier New', monospace", animation: "glitch" },
  retro: { bg: "#f5e6d3", border: "3px solid #8d6e63", tail: true, tailType: "triangle", textColor: "#5d4037", boxShadow: "4px 4px 0 #5d4037" },
  neon: { bg: "#0a0a1a", border: "2px solid #00ffff", tail: true, tailType: "triangle", textColor: "white", boxShadow: "0 0 10px #00ffff, inset 0 0 10px rgba(0,255,255,0.1)", textShadow: "0 0 10px #00ffff" },
  graffiti: { bg: "linear-gradient(135deg, #ff6b35, #f7931e, #ffeb3b)", border: "3px solid #000", tail: false, textColor: "#000" },
  caption: { bg: "#fef3c7", border: "2px solid #000", tail: false, textColor: "#000", fontFamily: "'Special Elite', cursive", boxShadow: "2px 2px 0 #000" },
  starburst: { bg: "#ff9800", border: "none", tail: false, textColor: "#000", clipPath: "polygon(50% 0%, 61% 25%, 98% 15%, 75% 40%, 100% 50%, 75% 60%, 98% 85%, 61% 75%, 50% 100%, 39% 75%, 2% 85%, 25% 60%, 0% 50%, 25% 40%, 2% 15%, 39% 25%)" },
};

const TEXT_EFFECTS = {
  none: (color: string) => ({
    textShadow: "none",
    WebkitTextStroke: "0",
  }),
  outline: (color: string, strokeColor = "#000000", strokeWidth = 2) => ({
    textShadow: `
      -${strokeWidth}px -${strokeWidth}px 0 ${strokeColor},
      ${strokeWidth}px -${strokeWidth}px 0 ${strokeColor},
      -${strokeWidth}px ${strokeWidth}px 0 ${strokeColor},
      ${strokeWidth}px ${strokeWidth}px 0 ${strokeColor},
      0 -${strokeWidth}px 0 ${strokeColor},
      0 ${strokeWidth}px 0 ${strokeColor},
      -${strokeWidth}px 0 0 ${strokeColor},
      ${strokeWidth}px 0 0 ${strokeColor}
    `,
  }),
  shadow: (color: string, shadowColor = "rgba(0,0,0,0.8)", shadowBlur = 4) => ({
    textShadow: `${shadowBlur}px ${shadowBlur}px ${shadowBlur * 2}px ${shadowColor}`,
  }),
  glow: (color: string, glowColor = "#ffffff") => ({
    textShadow: `
      0 0 10px ${glowColor},
      0 0 20px ${glowColor},
      0 0 30px ${glowColor},
      0 0 40px ${glowColor}
    `,
  }),
  "3d": (color: string, shadowColor = "#000000") => ({
    textShadow: `
      1px 1px 0 ${shadowColor},
      2px 2px 0 ${shadowColor},
      3px 3px 0 ${shadowColor},
      4px 4px 0 ${shadowColor},
      5px 5px 0 ${shadowColor},
      6px 6px 8px rgba(0,0,0,0.5)
    `,
  }),
  emboss: (color: string) => ({
    textShadow: `
      -1px -1px 1px rgba(255,255,255,0.5),
      1px 1px 1px rgba(0,0,0,0.5)
    `,
  }),
  neon: (color: string, glowColor = "#00ffff") => ({
    textShadow: `
      0 0 5px ${glowColor},
      0 0 10px ${glowColor},
      0 0 20px ${glowColor},
      0 0 40px ${glowColor},
      0 0 80px ${glowColor}
    `,
  }),
  comic: (color: string) => ({
    textShadow: `
      3px 3px 0 #000,
      -1px -1px 0 #000,
      1px -1px 0 #000,
      -1px 1px 0 #000,
      1px 1px 0 #000,
      4px 4px 0 rgba(0,0,0,0.3)
    `,
    fontWeight: "900",
  }),
  retro: (color: string) => ({
    textShadow: `
      3px 3px 0 #ff6b6b,
      6px 6px 0 #4ecdc4,
      9px 9px 0 rgba(0,0,0,0.2)
    `,
  }),
  fire: (color: string) => ({
    textShadow: `
      0 0 10px #ff0,
      0 0 20px #ff0,
      0 0 30px #ff8c00,
      0 0 40px #ff4500,
      0 0 50px #ff0000,
      0 0 60px #ff0000
    `,
  }),
  ice: (color: string) => ({
    textShadow: `
      0 0 10px #fff,
      0 0 20px #00bfff,
      0 0 30px #00bfff,
      0 0 40px #1e90ff,
      0 0 50px #1e90ff
    `,
  }),
  gold: (color: string) => ({
    background: "linear-gradient(180deg, #f9d423 0%, #ff4e00 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
    filter: "drop-shadow(2px 2px 2px rgba(0,0,0,0.5))",
  }),
  chrome: (color: string) => ({
    background: "linear-gradient(180deg, #fff 0%, #aaa 50%, #fff 51%, #ccc 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    textShadow: "2px 2px 4px rgba(0,0,0,0.4)",
    filter: "drop-shadow(1px 1px 1px rgba(0,0,0,0.3))",
  }),
};

export function TextElement({
  id,
  text,
  fontSize = 16,
  fontFamily = "'Bangers', cursive",
  color = "#ffffff",
  backgroundColor = "transparent",
  padding = 8,
  borderRadius = 0,
  bubbleStyle = "none",
  textEffect = "comic",
  strokeColor = "#000000",
  strokeWidth = 2,
  shadowColor = "rgba(0,0,0,0.8)",
  shadowBlur = 4,
  onChange,
  onStyleChange,
  isEditing = false,
  onEditStart,
  onEditEnd,
}: TextElementProps) {
  const [localText, setLocalText] = useState(text);
  const [styles, setStyles] = useState<TextStyles>({
    fontSize,
    fontFamily,
    color,
    backgroundColor,
    padding,
    borderRadius,
    bubbleStyle,
    textEffect,
    strokeColor,
    strokeWidth,
    shadowColor,
    shadowBlur,
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalText(text);
  }, [text]);

  useEffect(() => {
    setStyles({
      fontSize,
      fontFamily,
      color,
      backgroundColor,
      padding,
      borderRadius,
      bubbleStyle,
      textEffect,
      strokeColor,
      strokeWidth,
      shadowColor,
      shadowBlur,
    });
  }, [fontSize, fontFamily, color, backgroundColor, padding, borderRadius, bubbleStyle, textEffect, strokeColor, strokeWidth, shadowColor, shadowBlur]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleTextChange = (newText: string) => {
    setLocalText(newText);
    onChange?.(id, newText);
  };

  const handleBlur = () => {
    onEditEnd?.();
  };

  const bubbleConfig = BUBBLE_STYLES[styles.bubbleStyle];
  
  const getTextEffectStyles = () => {
    const effect = styles.textEffect || "comic";
    const effectFn = TEXT_EFFECTS[effect] || TEXT_EFFECTS.comic;
    return effectFn(styles.color, styles.strokeColor, styles.strokeWidth);
  };

  const getBubbleClasses = () => {
    switch (styles.bubbleStyle) {
      case "speech":
        return "relative";
      case "thought":
        return "relative rounded-full";
      case "shout":
        return "relative";
      case "whisper":
        return "relative opacity-80 italic";
      case "burst":
        return "relative flex items-center justify-center";
      case "scream":
        return "relative font-black uppercase animate-pulse";
      case "robot":
        return "relative rounded";
      case "drip":
        return "relative rounded-2xl";
      case "glitch":
        return "relative rounded";
      case "retro":
        return "relative rounded";
      case "neon":
        return "relative rounded";
      case "graffiti":
        return "relative rounded-lg font-black";
      default:
        return "";
    }
  };

  const textStyles = {
    fontSize: styles.fontSize,
    fontFamily: styles.fontFamily,
    color: styles.color,
    lineHeight: 1.3,
    letterSpacing: "0.02em",
    fontWeight: 700,
    ...getTextEffectStyles(),
  };

  return (
    <div
      className={`w-full h-full flex items-center justify-center ${getBubbleClasses()}`}
      style={{
        backgroundColor: bubbleConfig.bg === "transparent" ? styles.backgroundColor : bubbleConfig.bg,
        border: bubbleConfig.border,
        borderRadius: styles.bubbleStyle === "thought" ? "50%" : styles.borderRadius,
        padding: styles.padding,
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEditStart?.();
      }}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={localText}
          onChange={(e) => handleTextChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              onEditEnd?.();
            }
          }}
          className="w-full h-full bg-transparent outline-none resize-none text-center"
          style={textStyles as React.CSSProperties}
        />
      ) : (
        <p
          className="w-full text-center whitespace-pre-wrap break-words"
          style={textStyles as React.CSSProperties}
        >
          {localText || "Double-click to edit"}
        </p>
      )}

      {bubbleConfig.tail && styles.bubbleStyle === "speech" && (
        <div
          className="absolute -bottom-4 left-1/4 w-0 h-0"
          style={{
            borderLeft: "10px solid transparent",
            borderRight: "10px solid transparent",
            borderTop: "16px solid black",
          }}
        />
      )}
      {bubbleConfig.tail && styles.bubbleStyle === "speech" && (
        <div
          className="absolute -bottom-3 left-1/4 w-0 h-0"
          style={{
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderTop: "14px solid white",
            marginLeft: "2px",
          }}
        />
      )}

      {bubbleConfig.tail && styles.bubbleStyle === "thought" && (
        <>
          <div className="absolute -bottom-2 left-1/4 w-3 h-3 bg-white border-2 border-black rounded-full" />
          <div className="absolute -bottom-5 left-1/5 w-2 h-2 bg-white border-2 border-black rounded-full" />
        </>
      )}
    </div>
  );
}

export { FONT_OPTIONS, BUBBLE_STYLES, TEXT_EFFECTS };
export type { TextStyles, TextEffectType };
