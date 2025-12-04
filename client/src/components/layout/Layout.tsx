import { AppSidebar } from "./AppSidebar";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
      <AppSidebar />
      <main className="pl-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}
