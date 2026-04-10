import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AssetLibraryProvider } from "@/contexts/AssetLibraryContext";
import { CrossModeAssetProvider } from "@/contexts/CrossModeAssetContext";
import { EcosystemProvider } from "@/contexts/EcosystemContext";
import { PostActionProvider } from "@/contexts/PostActionContext";
import { LegalGate } from "@/components/LegalGate";
import NotFound from "@/pages/not-found";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useEffect, lazy, Suspense } from "react";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";
import { Spinner } from "@/components/ui/spinner";
import { KeyboardShortcutsDialog } from "@/components/KeyboardShortcuts";
import { UpdatePrompt } from "@/components/pwa/UpdatePrompt";
import { NetworkStatusToast } from "@/components/pwa/NetworkStatusToast";
import { InstallBanner } from "@/components/pwa/InstallBanner";

import Dashboard from "@/pages/Dashboard";
import AuthPage from "@/pages/AuthPage";
import LandingPage from "@/pages/LandingPage";

const ComicCreator = lazy(() => import("@/pages/ComicCreator"));
const CardCreator = lazy(() => import("@/pages/CardCreator"));
const VNCreator = lazy(() => import("@/pages/VNCreator"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const MotionStudio = lazy(() => import("@/pages/MotionStudio"));
const CYOABuilder = lazy(() => import("@/pages/CYOABuilder"));
const HopCreator = lazy(() => import("@/pages/HopCreator"));
const PromptFactory = lazy(() => import("@/pages/PromptFactory"));
const StoryForge = lazy(() => import("@/pages/StoryForge"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const AdminLogin = lazy(() => import("@/pages/AdminLogin"));
const PortfolioPage = lazy(() => import("@/pages/PortfolioPage"));
const LibraryPage = lazy(() => import("@/pages/LibraryPage"));
const ExhibitionsPage = lazy(() => import("@/pages/ExhibitionsPage"));
const BlogPage = lazy(() => import("@/pages/BlogPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));
const ShopPage = lazy(() => import("@/pages/ShopPage"));
const ArtistPage = lazy(() => import("@/pages/ArtistPage"));
const EcosystemHub = lazy(() => import("@/pages/EcosystemHub"));
const LearnModule = lazy(() => import("@/pages/LearnModule"));
const CollaborateModule = lazy(() => import("@/pages/CollaborateModule"));
const EarnModule = lazy(() => import("@/pages/EarnModule"));
const EventsModule = lazy(() => import("@/pages/EventsModule"));
const PublishModule = lazy(() => import("@/pages/PublishModule"));
const CardBattle = lazy(() => import("@/pages/CardBattle"));
const SocialFeed = lazy(() => import("@/pages/SocialFeed"));
const SocialProfile = lazy(() => import("@/pages/SocialProfile"));
const SocialMessages = lazy(() => import("@/pages/SocialMessages"));
const CollabHub = lazy(() => import("@/pages/CollabHub"));
const CollabSession = lazy(() => import("@/pages/CollabSession"));
const CommunityChains = lazy(() => import("@/pages/CommunityChains"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const UserSearch = lazy(() => import("@/pages/UserSearch"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const ProfileCard = lazy(() => import("@/pages/ProfileCard"));
const ImportCenter = lazy(() => import("@/pages/ImportCenter"));
const ScriptImport = lazy(() => import("@/pages/ScriptImport"));
const AdminModeration = lazy(() => import("@/pages/AdminModeration"));
const AdminControlRoom = lazy(() => import("@/pages/AdminControlRoom"));
const AdminReviewQueue = lazy(() => import("@/pages/AdminReviewQueue"));
const PricingPage = lazy(() => import("@/pages/PricingPage"));
const AchievementsPage = lazy(() => import("@/pages/AchievementsPage"));
const RewardsPage = lazy(() => import("@/pages/RewardsPage"));
const MarketplacePage = lazy(() => import("@/pages/MarketplacePage"));
const CommunityLibrary = lazy(() => import("@/pages/CommunityLibrary"));
const CommunityViewer = lazy(() => import("@/pages/CommunityViewer"));
const ComicReader = lazy(() => import("@/pages/ComicReader"));
const SeriesPage = lazy(() => import("@/pages/SeriesPage"));
const MarketplaceListingPage = lazy(() => import("@/pages/MarketplaceListingPage"));
const MarketplaceSellPage = lazy(() => import("@/pages/MarketplaceSellPage"));
const MarketplacePurchasesPage = lazy(() => import("@/pages/MarketplacePurchasesPage"));
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));
const TeacherDashboard = lazy(() => import("@/pages/TeacherDashboard"));
const CreatorProfilePage = lazy(() => import("@/pages/CreatorProfilePage"));
const CompliancePage = lazy(() => import("@/pages/CompliancePage"));
const AccessibilityPage = lazy(() => import("@/pages/AccessibilityPage"));
const SecurityPage = lazy(() => import("@/pages/SecurityPage"));
const DisclaimerPage = lazy(() => import("@/pages/DisclaimerPage"));
const DMCAPage = lazy(() => import("@/pages/DMCAPage"));
const PrintStudio = lazy(() => import("@/pages/PrintStudio"));
const ExportDashboard = lazy(() => import("@/pages/ExportDashboard"));
const PrintQuoteRequest = lazy(() => import("@/pages/PrintQuoteRequest"));
const PrintPackages = lazy(() => import("@/pages/PrintPackages"));
const PrintReviews = lazy(() => import("@/pages/PrintReviews"));
const AnalyticsDashboard = lazy(() => import("@/pages/AnalyticsDashboard"));
const CertificationsPage = lazy(() => import("@/pages/CertificationsPage").then(m => ({ default: m.default })));
const VerifyPageLazy = lazy(() => import("@/pages/CertificationsPage").then(m => ({ default: m.VerifyPage })));
const SSOCallbackPage = lazy(() => import("@/pages/SSOCallbackPage"));
const CoverCreator = lazy(() => import("@/pages/CoverCreator"));
const FxStudioPage = lazy(() => import("@/pages/FxStudioPage"));

function LazyFallback() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Spinner className="size-12 text-white" />
    </div>
  );
}

function ProtectedRouter() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();
  
  useAnalytics();

  if (location === "/welcome" || location === "/landing") {
    return <LandingPage />;
  }

  if (isLoading) {
    return <LazyFallback />;
  }

  if (location === "/login" || location === "/signup" || location === "/auth") {
    return <AuthPage />;
  }

  if (location === "/forgot-password") {
    return <Suspense fallback={<LazyFallback />}><ForgotPassword /></Suspense>;
  }

  if (location.startsWith("/reset-password")) {
    return <Suspense fallback={<LazyFallback />}><ResetPassword /></Suspense>;
  }

  if (location.startsWith("/sso/callback") || location === "/sso") {
    return <Suspense fallback={<LazyFallback />}><SSOCallbackPage /></Suspense>;
  }

  const publicPages = ["/portfolio/", "/privacy", "/terms", "/compliance", "/accessibility-statement", "/security", "/disclaimer", "/dmca", "/creator/", "/verify/"];
  const isPublicPage = publicPages.some(p => location === p || location.startsWith(p));

  if (isPublicPage && !isAuthenticated) {
    return (
      <Suspense fallback={<LazyFallback />}>
        <Switch>
          <Route path="/portfolio/:userId" component={PortfolioPage} />
          <Route path="/creator/:username" component={CreatorProfilePage} />
          <Route path="/verify/:code">{(params: any) => <VerifyPageLazy code={params.code} />}</Route>
          <Route path="/privacy" component={PrivacyPage} />
          <Route path="/terms" component={TermsPage} />
          <Route path="/disclaimer" component={DisclaimerPage} />
          <Route path="/dmca" component={DMCAPage} />
          <Route path="/compliance" component={CompliancePage} />
          <Route path="/accessibility-statement" component={AccessibilityPage} />
          <Route path="/security" component={SecurityPage} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <LegalGate>
      <ErrorBoundary>
      <Suspense fallback={<LazyFallback />}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/comic" component={ComicCreator} />
        <Route path="/creator/comic" component={ComicCreator} />
        <Route path="/creator/motion" component={MotionStudio} />
        <Route path="/creator/card" component={CardCreator} />
        <Route path="/creator/vn" component={VNCreator} />
        <Route path="/creator/cyoa" component={CYOABuilder} />
        <Route path="/creator/cover" component={CoverCreator} />
        <Route path="/creator/hop" component={HopCreator} />

        <Route path="/fx-studio" component={FxStudioPage} />
        <Route path="/tools/prompt" component={PromptFactory} />
        <Route path="/tools/story" component={StoryForge} />
        <Route path="/tools/cyoa" component={CYOABuilder} />
        <Route path="/creator/comic/preview">{() => <ComicReader isPreview={true} />}</Route>
        <Route path="/community/read/:id" component={ComicReader} />
        <Route path="/community/view/:id" component={CommunityViewer} />
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
        <Route path="/achievements" component={AchievementsPage} />
        <Route path="/certifications" component={CertificationsPage} />
        <Route path="/verify/:code">{(params: any) => <VerifyPageLazy code={params.code} />}</Route>
        <Route path="/rewards" component={RewardsPage} />
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
        <Route path="/import/script" component={ScriptImport} />
        <Route path="/print-studio" component={PrintStudio} />
        <Route path="/print-studio/export" component={ExportDashboard} />
        <Route path="/print-studio/quote" component={PrintQuoteRequest} />
        <Route path="/print-studio/packages" component={PrintPackages} />
        <Route path="/print-studio/reviews" component={PrintReviews} />
        <Route path="/marketplace" component={MarketplacePage} />
        <Route path="/marketplace/sell" component={MarketplaceSellPage} />
        <Route path="/marketplace/purchases" component={MarketplacePurchasesPage} />
        <Route path="/marketplace/listing/:id" component={MarketplaceListingPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/disclaimer" component={DisclaimerPage} />
        <Route path="/dmca" component={DMCAPage} />
        <Route path="/teacher" component={TeacherDashboard} />
        <Route path="/creator/:username" component={CreatorProfilePage} />
        <Route path="/compliance" component={CompliancePage} />
        <Route path="/accessibility-statement" component={AccessibilityPage} />
        <Route path="/security" component={SecurityPage} />
        <Route component={NotFound} />
      </Switch>
      </Suspense>
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
                <PostActionProvider>
                  <TooltipProvider>
                    <SonnerToaster theme="dark" position="bottom-right" />
                    <KeyboardShortcutsDialog />
                    <InstallBanner />
                    <NetworkStatusToast />
                    <UpdatePrompt />
                    <ProtectedRouter />
                  </TooltipProvider>
                </PostActionProvider>
              </EcosystemProvider>
            </CrossModeAssetProvider>
          </AssetLibraryProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
