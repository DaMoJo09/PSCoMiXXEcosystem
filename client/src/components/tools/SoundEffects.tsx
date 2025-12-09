import { useState } from "react";
import { X, Sparkles } from "lucide-react";

export interface SoundEffect {
  text: string;
  color: string;
}

const SOUND_EFFECTS: SoundEffect[] = [
  { text: "POW!", color: "#ff0000" },
  { text: "BANG!", color: "#ff9800" },
  { text: "BOOM!", color: "#ffeb3b" },
  { text: "ZAP!", color: "#2196f3" },
  { text: "WHAM!", color: "#9c27b0" },
  { text: "CRASH!", color: "#4caf50" },
  { text: "KAPOW!", color: "#e91e63" },
  { text: "SMASH!", color: "#f44336" },
  { text: "SLAM!", color: "#ff5722" },
  { text: "THWACK!", color: "#795548" },
  { text: "WHOOSH!", color: "#00bcd4" },
  { text: "ZOOM!", color: "#3f51b5" },
  { text: "SPLAT!", color: "#8bc34a" },
  { text: "CRACK!", color: "#ffc107" },
  { text: "SNAP!", color: "#ff4081" },
  { text: "POP!", color: "#7c4dff" },
  { text: "BIFF!", color: "#00e676" },
  { text: "BONK!", color: "#ff6e40" },
  { text: "SIZZLE!", color: "#ff1744" },
  { text: "BUZZ!", color: "#ffea00" },
  { text: "CRUNCH!", color: "#d500f9" },
  { text: "SWOOSH!", color: "#00b0ff" },
  { text: "THUD!", color: "#6d4c41" },
  { text: "CLICK!", color: "#b388ff" },
  { text: "SLAY!", color: "#e040fb" },
  { text: "RIZZ!", color: "#ff80ab" },
  { text: "BUSSIN!", color: "#69f0ae" },
  { text: "NO CAP!", color: "#40c4ff" },
  { text: "FIRE!", color: "#ff6d00" },
  { text: "GOAT!", color: "#ffd600" },
  { text: "YEET!", color: "#76ff03" },
  { text: "BRUH!", color: "#ea80fc" },
  { text: "SHEESH!", color: "#18ffff" },
  { text: "W!", color: "#00e5ff" },
  { text: "L!", color: "#ff1744" },
  { text: "NPC!", color: "#b2ff59" },
];

interface SoundEffectsPickerProps {
  onSelect: (effect: SoundEffect) => void;
  onClose: () => void;
}

export function SoundEffectsPicker({ onSelect, onClose }: SoundEffectsPickerProps) {
  const [customText, setCustomText] = useState("");
  const [customColor, setCustomColor] = useState("#ff0000");
  const [filter, setFilter] = useState<"all" | "classic" | "action" | "slang">("all");

  const filteredEffects = SOUND_EFFECTS.filter((_, i) => {
    if (filter === "all") return true;
    if (filter === "classic") return i < 6;
    if (filter === "action") return i >= 6 && i < 24;
    if (filter === "slang") return i >= 24;
    return true;
  });

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111] border border-white/20 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-bold uppercase tracking-wider">Sound Effects</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-white/10 flex gap-2 flex-wrap">
          {(["all", "classic", "action", "slang"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === f ? "bg-white text-black" : "bg-white/10 hover:bg-white/20"
              }`}
            >
              {f === "all" ? "All" : f === "classic" ? "Classic" : f === "action" ? "Action" : "Gen-Z"}
            </button>
          ))}
        </div>

        <div className="p-4 overflow-y-auto max-h-[40vh]">
          <div className="grid grid-cols-4 gap-2">
            {filteredEffects.map((effect, i) => (
              <button
                key={i}
                onClick={() => onSelect(effect)}
                className="p-2 rounded-lg border border-white/10 hover:border-white/30 transition-all hover:scale-105 text-center"
                style={{
                  background: `${effect.color}20`,
                }}
              >
                <span
                  className="text-sm font-black"
                  style={{
                    color: effect.color,
                    fontFamily: "'Bangers', cursive",
                    textShadow: `1px 1px 0 rgba(0,0,0,0.5)`,
                    WebkitTextStroke: "0.5px black",
                  }}
                >
                  {effect.text}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-white/10">
          <h3 className="text-sm font-medium text-white/60 mb-2">Custom Effect</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value.toUpperCase())}
              placeholder="CUSTOM!"
              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
              maxLength={12}
            />
            <input
              type="color"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border-0"
            />
            <button
              onClick={() => {
                if (customText.trim()) {
                  onSelect({ text: customText.trim(), color: customColor });
                }
              }}
              disabled={!customText.trim()}
              className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SoundEffectElementProps {
  text: string;
  color: string;
  scale?: number;
  rotation?: number;
}

export function SoundEffectElement({ text, color, scale = 1, rotation = -10 }: SoundEffectElementProps) {
  return (
    <div
      className="cursor-grab select-none"
      style={{
        fontFamily: "'Bangers', cursive",
        fontSize: `${32 * scale}px`,
        color: color,
        textShadow: `2px 2px 0 rgba(0,0,0,0.3)`,
        WebkitTextStroke: "1px black",
        transform: `rotate(${rotation}deg) skew(-5deg)`,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
}

export { SOUND_EFFECTS };
