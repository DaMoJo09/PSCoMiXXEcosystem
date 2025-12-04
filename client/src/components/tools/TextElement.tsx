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
  { value: "Inter, sans-serif", label: "Inter" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "'Comic Sans MS', cursive", label: "Comic Sans" },
  { value: "'Courier New', monospace", label: "Courier" },
  { value: "'Impact', sans-serif", label: "Impact" },
  { value: "'Arial Black', sans-serif", label: "Arial Black" },
  { value: "'Space Grotesk', sans-serif", label: "Space Grotesk" },
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
