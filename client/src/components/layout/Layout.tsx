import { useState } from "react";
import { AppSidebar } from "./AppSidebar";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);

  const isExpanded = sidebarHovered || sidebarPinned;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-black focus:text-white focus:px-4 focus:py-2 focus:border-2 focus:border-white"
      >
        Skip to main content
      </a>
      <div
        className="fixed left-0 top-0 h-screen z-50"
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        style={{ width: isExpanded ? "16rem" : "3rem" }}
      >
        <AppSidebar
          isExpanded={isExpanded}
          isPinned={sidebarPinned}
          onTogglePin={() => setSidebarPinned(!sidebarPinned)}
        />
      </div>
      <main
        id="main-content"
        className="min-h-screen transition-[padding-left] duration-300 ease-in-out"
        role="main"
        tabIndex={-1}
        style={{ paddingLeft: isExpanded ? "16rem" : "3rem" }}
      >
        {children}
      </main>
    </div>
  );
}
