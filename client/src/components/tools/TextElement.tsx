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
  bubbleStyle?: "none" | "speech" | "thought" | "shout" | "whisper";
  onChange?: (id: string, text: string) => void;
  onStyleChange?: (id: string, styles: TextStyles) => void;
  isEditing?: boolean;
  onEditStart?: () => void;
  onEditEnd?: () => void;
}

interface TextStyles {
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor: string;
  padding: number;
  borderRadius: number;
  bubbleStyle: "none" | "speech" | "thought" | "shout" | "whisper";
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
  shout: { bg: "yellow", border: "3px solid red", tail: true, tailType: "jagged" },
  whisper: { bg: "#f0f0f0", border: "1px dashed gray", tail: true, tailType: "small" },
};

export function TextElement({
  id,
  text,
  fontSize = 16,
  fontFamily = "Inter, sans-serif",
  color = "#000000",
  backgroundColor = "transparent",
  padding = 8,
  borderRadius = 0,
  bubbleStyle = "none",
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
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalText(text);
  }, [text]);

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

  const getBubbleClasses = () => {
    switch (styles.bubbleStyle) {
      case "speech":
        return "relative";
      case "thought":
        return "relative rounded-full";
      case "shout":
        return "relative";
      case "whisper":
        return "relative opacity-80";
      default:
        return "";
    }
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
          style={{
            fontSize: styles.fontSize,
            fontFamily: styles.fontFamily,
            color: styles.color,
            lineHeight: 1.4,
          }}
        />
      ) : (
        <p
          className="w-full text-center whitespace-pre-wrap break-words"
          style={{
            fontSize: styles.fontSize,
            fontFamily: styles.fontFamily,
            color: styles.color,
            lineHeight: 1.4,
          }}
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

export { FONT_OPTIONS, BUBBLE_STYLES };
export type { TextStyles };
