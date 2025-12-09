import { AppSidebar } from "./AppSidebar";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-black focus:text-white focus:px-4 focus:py-2 focus:border-2 focus:border-white"
      >
        Skip to main content
      </a>
      <AppSidebar />
      <main id="main-content" className="pl-64 min-h-screen" role="main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
