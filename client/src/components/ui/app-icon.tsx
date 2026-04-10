import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type AppIconVariant = "dark" | "light" | "ghost";
type AppIconSize = "xs" | "sm" | "md" | "lg";

interface AppIconProps {
  icon: LucideIcon;
  variant?: AppIconVariant;
  size?: AppIconSize;
  active?: boolean;
  className?: string;
}

const sizeMap: Record<AppIconSize, { container: string; icon: string }> = {
  xs: { container: "w-6 h-6 rounded-md", icon: "w-3 h-3" },
  sm: { container: "w-8 h-8 rounded-lg", icon: "w-4 h-4" },
  md: { container: "w-10 h-10 rounded-xl", icon: "w-5 h-5" },
  lg: { container: "w-12 h-12 rounded-xl", icon: "w-6 h-6" },
};

export function AppIcon({ icon: Icon, variant = "light", size = "sm", active = false, className }: AppIconProps) {
  const s = sizeMap[size];
  const resolvedVariant = active ? "dark" : variant;

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center shrink-0 transition-all duration-200",
        s.container,
        resolvedVariant === "dark" && "bg-foreground text-background shadow-[0_2px_8px_rgba(0,0,0,0.3)]",
        resolvedVariant === "light" && "bg-muted/60 text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-border/50",
        resolvedVariant === "ghost" && "text-muted-foreground",
        className
      )}
      aria-hidden="true"
    >
      <Icon className={s.icon} strokeWidth={2} />
    </div>
  );
}

export function AppIconInline({ icon: Icon, active = false, className }: { icon: LucideIcon; active?: boolean; className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center shrink-0 w-7 h-7 rounded-lg transition-all duration-200",
        active
          ? "bg-foreground text-background shadow-[0_2px_6px_rgba(0,0,0,0.25)]"
          : "bg-muted/50 text-foreground border border-border/40",
        className
      )}
      aria-hidden="true"
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2} />
    </div>
  );
}
