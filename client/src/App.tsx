import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AssetLibraryProvider } from "@/contexts/AssetLibraryContext";
import { CrossModeAssetProvider } from "@/contexts/CrossModeAssetContext";
import { EcosystemProvider } from "@/contexts/EcosystemContext";
import { LegalGate } from "@/components/LegalGate";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";
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
import PortfolioPage from "@/pages/PortfolioPage";
import ExhibitionsPage from "@/pages/ExhibitionsPage";
import BlogPage from "@/pages/BlogPage";
import ContactPage from "@/pages/ContactPage";
import ShopPage from "@/pages/ShopPage";
import ArtistPage from "@/pages/ArtistPage";
import EcosystemHub from "@/pages/EcosystemHub";
import LearnModule from "@/pages/LearnModule";
import CollaborateModule from "@/pages/CollaborateModule";
import EarnModule from "@/pages/EarnModule";
import EventsModule from "@/pages/EventsModule";
import PublishModule from "@/pages/PublishModule";
import CardBattle from "@/pages/CardBattle";
import SocialFeed from "@/pages/SocialFeed";
import SocialProfile from "@/pages/SocialProfile";
import SocialMessages from "@/pages/SocialMessages";
import CollabHub from "@/pages/CollabHub";
import CollabSession from "@/pages/CollabSession";
import CommunityChains from "@/pages/CommunityChains";
import Notifications from "@/pages/Notifications";
import UserSearch from "@/pages/UserSearch";
import { Spinner } from "@/components/ui/spinner";

function ProtectedRouter() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();
  
  useAnalytics();

  if (location === "/welcome" || location === "/landing") {
    return <LandingPage />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Spinner className="size-12 text-white" />
      </div>
    );
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
        <Route path="/portfolio" component={PortfolioPage} />
        <Route path="/exhibitions" component={ExhibitionsPage} />
        <Route path="/blog" component={BlogPage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/shop" component={ShopPage} />
        <Route path="/artist" component={ArtistPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin-login" component={AdminLogin} />
        <Route path="/ecosystem" component={EcosystemHub} />
        <Route path="/ecosystem/learn" component={LearnModule} />
        <Route path="/ecosystem/collaborate" component={CollaborateModule} />
        <Route path="/ecosystem/earn" component={EarnModule} />
        <Route path="/ecosystem/events" component={EventsModule} />
        <Route path="/ecosystem/events/:id" component={EventsModule} />
        <Route path="/ecosystem/publish" component={PublishModule} />
        <Route path="/battle" component={CardBattle} />
        <Route path="/social" component={SocialFeed} />
        <Route path="/social/profile/:userId" component={SocialProfile} />
        <Route path="/social/messages" component={SocialMessages} />
        <Route path="/social/messages/:threadId" component={SocialMessages} />
        <Route path="/social/collab" component={CollabHub} />
        <Route path="/social/collab/:sessionId" component={CollabSession} />
        <Route path="/social/chains" component={CommunityChains} />
        <Route path="/social/notifications" component={Notifications} />
        <Route path="/social/search" component={UserSearch} />
        <Route component={NotFound} />
      </Switch>
    </LegalGate>
  );
}

function App() {
  useEffect(() => {
    if (import.meta.env.VITE_GA_MEASUREMENT_ID) {
      initGA();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AssetLibraryProvider>
            <CrossModeAssetProvider>
              <EcosystemProvider>
                <TooltipProvider>
                  <Toaster />
                  <ProtectedRouter />
                </TooltipProvider>
              </EcosystemProvider>
            </CrossModeAssetProvider>
          </AssetLibraryProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
