import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AssetLibraryProvider } from "@/contexts/AssetLibraryContext";
import { LegalGate } from "@/components/LegalGate";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import ComicCreator from "@/pages/ComicCreator";
import CardCreator from "@/pages/CardCreator";
import VNCreator from "@/pages/VNCreator";
import AdminDashboard from "@/pages/AdminDashboard";
import MotionStudio from "@/pages/MotionStudio";
import CYOABuilder from "@/pages/CYOABuilder";
import CoverCreator from "@/pages/CoverCreator";
import PromptFactory from "@/pages/PromptFactory";
import StoryForge from "@/pages/StoryForge";
import AssetBuilder from "@/pages/AssetBuilder";
import SettingsPage from "@/pages/SettingsPage";
import AuthPage from "@/pages/AuthPage";
import AdminLogin from "@/pages/AdminLogin";
import LandingPage from "@/pages/LandingPage";
import { Spinner } from "@/components/ui/spinner";

function ProtectedRouter() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Spinner className="size-12 text-white" />
      </div>
    );
  }

  if (location === "/welcome") {
    return <LandingPage />;
  }

  if (location === "/login" || location === "/signup") {
    return <AuthPage />;
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <LegalGate>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/comic" component={ComicCreator} />
        <Route path="/creator/comic" component={ComicCreator} />
        <Route path="/creator/motion" component={MotionStudio} />
        <Route path="/creator/card" component={CardCreator} />
        <Route path="/creator/vn" component={VNCreator} />
        <Route path="/creator/cyoa" component={CYOABuilder} />
        <Route path="/creator/cover" component={CoverCreator} />
        <Route path="/tools/prompt" component={PromptFactory} />
        <Route path="/tools/story" component={StoryForge} />
        <Route path="/tools/assets" component={AssetBuilder} />
        <Route path="/tools/cyoa" component={CYOABuilder} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin-login" component={AdminLogin} />
        <Route component={NotFound} />
      </Switch>
    </LegalGate>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AssetLibraryProvider>
            <TooltipProvider>
              <Toaster />
              <ProtectedRouter />
            </TooltipProvider>
          </AssetLibraryProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
