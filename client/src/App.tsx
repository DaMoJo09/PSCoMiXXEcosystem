import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
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
import SettingsPage from "@/pages/SettingsPage";
import AuthPage from "@/pages/AuthPage";
import { Spinner } from "@/components/ui/spinner";

function ProtectedRouter() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Spinner className="size-12 text-white" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/creator/comic" component={ComicCreator} />
      <Route path="/creator/motion" component={MotionStudio} />
      <Route path="/creator/card" component={CardCreator} />
      <Route path="/creator/vn" component={VNCreator} />
      <Route path="/creator/cyoa" component={CYOABuilder} />
      <Route path="/creator/cover" component={CoverCreator} />
      <Route path="/tools/prompt" component={PromptFactory} />
      <Route path="/tools/story" component={StoryForge} />
      <Route path="/tools/cyoa" component={CYOABuilder} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/admin" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <ProtectedRouter />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
