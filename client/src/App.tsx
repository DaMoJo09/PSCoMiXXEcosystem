import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AssetLibraryProvider } from "@/contexts/AssetLibraryContext";
import { CrossModeAssetProvider } from "@/contexts/CrossModeAssetContext";
import { EcosystemProvider } from "@/contexts/EcosystemContext";
import { LegalGate } from "@/components/LegalGate";
import NotFound from "@/pages/not-found";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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

import PromptFactory from "@/pages/PromptFactory";
import StoryForge from "@/pages/StoryForge";
import SettingsPage from "@/pages/SettingsPage";
import AuthPage from "@/pages/AuthPage";
import AdminLogin from "@/pages/AdminLogin";
import LandingPage from "@/pages/LandingPage";
import PortfolioPage from "@/pages/PortfolioPage";
import LibraryPage from "@/pages/LibraryPage";
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
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import ProfileCard from "@/pages/ProfileCard";
import ImportCenter from "@/pages/ImportCenter";
import AdminModeration from "@/pages/AdminModeration";
import AdminControlRoom from "@/pages/AdminControlRoom";
import AdminReviewQueue from "@/pages/AdminReviewQueue";
import PricingPage from "@/pages/PricingPage";
import MarketplacePage from "@/pages/MarketplacePage";
import CommunityLibrary from "@/pages/CommunityLibrary";
import ComicReader from "@/pages/ComicReader";
import SeriesPage from "@/pages/SeriesPage";
import MarketplaceListingPage from "@/pages/MarketplaceListingPage";
import MarketplaceSellPage from "@/pages/MarketplaceSellPage";
import MarketplacePurchasesPage from "@/pages/MarketplacePurchasesPage";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import TeacherDashboard from "@/pages/TeacherDashboard";
import CompliancePage from "@/pages/CompliancePage";
import AccessibilityPage from "@/pages/AccessibilityPage";
import SecurityPage from "@/pages/SecurityPage";
import PrintStudio from "@/pages/PrintStudio";
import ExportDashboard from "@/pages/ExportDashboard";
import PrintQuoteRequest from "@/pages/PrintQuoteRequest";
import PrintPackages from "@/pages/PrintPackages";
import AnalyticsDashboard from "@/pages/AnalyticsDashboard";
import { Spinner } from "@/components/ui/spinner";
import { KeyboardShortcutsDialog } from "@/components/KeyboardShortcuts";
import { UpdatePrompt } from "@/components/pwa/UpdatePrompt";
import { NetworkStatusToast } from "@/components/pwa/NetworkStatusToast";
import { InstallBanner } from "@/components/pwa/InstallBanner";

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

  if (location === "/login" || location === "/signup" || location === "/auth") {
    return <AuthPage />;
  }

  if (location === "/forgot-password") {
    return <ForgotPassword />;
  }

  if (location.startsWith("/reset-password")) {
    return <ResetPassword />;
  }

  const publicPages = ["/portfolio/", "/privacy", "/terms", "/compliance", "/accessibility-statement", "/security"];
  const isPublicPage = publicPages.some(p => location === p || location.startsWith(p));

  if (isPublicPage && !isAuthenticated) {
    return (
      <Switch>
        <Route path="/portfolio/:userId" component={PortfolioPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/compliance" component={CompliancePage} />
        <Route path="/accessibility-statement" component={AccessibilityPage} />
        <Route path="/security" component={SecurityPage} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <LegalGate>
      <ErrorBoundary>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/comic" component={ComicCreator} />
        <Route path="/creator/comic" component={ComicCreator} />
        <Route path="/creator/motion" component={MotionStudio} />
        <Route path="/creator/card" component={CardCreator} />
        <Route path="/creator/vn" component={VNCreator} />
        <Route path="/creator/cyoa" component={CYOABuilder} />

        <Route path="/tools/prompt" component={PromptFactory} />
        <Route path="/tools/story" component={StoryForge} />
        <Route path="/tools/cyoa" component={CYOABuilder} />
        <Route path="/creator/comic/preview">{() => <ComicReader isPreview={true} />}</Route>
        <Route path="/community/read/:id" component={ComicReader} />
        <Route path="/community/series/:id" component={SeriesPage} />
        <Route path="/community" component={CommunityLibrary} />
        <Route path="/library" component={LibraryPage} />
        <Route path="/portfolio" component={PortfolioPage} />
        <Route path="/portfolio/:userId" component={PortfolioPage} />
        <Route path="/exhibitions" component={ExhibitionsPage} />
        <Route path="/blog" component={BlogPage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/shop" component={ShopPage} />
        <Route path="/artist" component={ArtistPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/control" component={AdminControlRoom} />
        <Route path="/admin/moderation" component={AdminModeration} />
        <Route path="/admin/review-queue" component={AdminReviewQueue} />
        <Route path="/analytics" component={AnalyticsDashboard} />
        <Route path="/pricing" component={PricingPage} />
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
        <Route path="/profile" component={ProfileCard} />
        <Route path="/social/profile/:userId" component={SocialProfile} />
        <Route path="/social/messages" component={SocialMessages} />
        <Route path="/social/messages/:threadId" component={SocialMessages} />
        <Route path="/social/collab" component={CollabHub} />
        <Route path="/social/collab/:sessionId" component={CollabSession} />
        <Route path="/social/chains" component={CommunityChains} />
        <Route path="/social/notifications" component={Notifications} />
        <Route path="/social/search" component={UserSearch} />
        <Route path="/tools/import" component={ImportCenter} />
        <Route path="/print-studio" component={PrintStudio} />
        <Route path="/print-studio/export" component={ExportDashboard} />
        <Route path="/print-studio/quote" component={PrintQuoteRequest} />
        <Route path="/print-studio/packages" component={PrintPackages} />
        <Route path="/marketplace" component={MarketplacePage} />
        <Route path="/marketplace/sell" component={MarketplaceSellPage} />
        <Route path="/marketplace/purchases" component={MarketplacePurchasesPage} />
        <Route path="/marketplace/listing/:id" component={MarketplaceListingPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/teacher" component={TeacherDashboard} />
        <Route path="/compliance" component={CompliancePage} />
        <Route path="/accessibility-statement" component={AccessibilityPage} />
        <Route path="/security" component={SecurityPage} />
        <Route component={NotFound} />
      </Switch>
      </ErrorBoundary>
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
                  <SonnerToaster theme="dark" position="bottom-right" />
                  <KeyboardShortcutsDialog />
                  <InstallBanner />
                  <NetworkStatusToast />
                  <UpdatePrompt />
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
