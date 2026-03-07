import { useState, useEffect, useCallback } from "react";
import { X, Keyboard } from "lucide-react";

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: "General",
    shortcuts: [
      { keys: ["?"], description: "Open keyboard shortcuts help" },
      { keys: ["Ctrl", "S"], description: "Save current project" },
      { keys: ["Ctrl", "Z"], description: "Undo last action" },
      { keys: ["Ctrl", "Shift", "Z"], description: "Redo last action" },
      { keys: ["Escape"], description: "Close dialog / Deselect" },
    ],
  },
  {
    title: "Comic Builder",
    shortcuts: [
      { keys: ["V"], description: "Select / Move tool" },
      { keys: ["T"], description: "Text tool" },
      { keys: ["B"], description: "Brush / Draw tool" },
      { keys: ["E"], description: "Eraser tool" },
      { keys: ["Delete"], description: "Delete selected element" },
      { keys: ["Ctrl", "+"], description: "Zoom in" },
      { keys: ["Ctrl", "-"], description: "Zoom out" },
      { keys: ["Ctrl", "0"], description: "Reset zoom" },
    ],
  },
  {
    title: "Motion Studio",
    shortcuts: [
      { keys: ["Space"], description: "Play / Pause preview" },
      { keys: ["←"], description: "Previous frame" },
      { keys: ["→"], description: "Next frame" },
      { keys: ["Home"], description: "Go to first frame" },
      { keys: ["End"], description: "Go to last frame" },
    ],
  },
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["Alt", "1"], description: "Go to Dashboard" },
      { keys: ["Alt", "2"], description: "Go to Comic Builder" },
      { keys: ["Alt", "3"], description: "Go to Motion Studio" },
      { keys: ["Alt", "S"], description: "Go to Settings" },
    ],
  },
];

export function KeyboardShortcutsDialog() {
  const [isOpen, setIsOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }
      e.preventDefault();
      setIsOpen(prev => !prev);
    }
    if (e.key === "Escape" && isOpen) {
      setIsOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      data-testid="dialog-keyboard-shortcuts"
    >
      <div
        className="bg-background border-4 border-foreground w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-hard"
        role="document"
      >
        <div className="sticky top-0 bg-background border-b-2 border-foreground flex items-center justify-between px-6 py-4 z-10">
          <div className="flex items-center gap-3">
            <Keyboard className="w-5 h-5" aria-hidden="true" />
            <h2 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-muted border-2 border-transparent hover:border-border transition-colors"
            aria-label="Close keyboard shortcuts dialog"
            data-testid="button-close-shortcuts"
            autoFocus
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {shortcutGroups.map((group) => (
            <section key={group.title}>
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3 border-b border-border pb-2">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-1.5"
                    data-testid={`shortcut-row-${group.title.toLowerCase().replace(/\s/g, '-')}-${idx}`}
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, kidx) => (
                        <span key={kidx}>
                          <kbd className="px-2 py-1 text-xs font-mono font-bold bg-muted border-2 border-border min-w-[28px] text-center inline-block">
                            {key}
                          </kbd>
                          {kidx < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground mx-0.5">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

          <div className="pt-4 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted border border-border">?</kbd> anytime to toggle this dialog
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
