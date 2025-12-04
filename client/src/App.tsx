import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import ComicCreator from "@/pages/ComicCreator";
import CardCreator from "@/pages/CardCreator";
import VNCreator from "@/pages/VNCreator";
import AdminDashboard from "@/pages/AdminDashboard";
import MotionStudio from "@/pages/MotionStudio";
import CYOABuilder from "@/pages/CYOABuilder";
import CoverCreator from "@/pages/CoverCreator";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/creator/comic" component={ComicCreator} />
      <Route path="/creator/motion" component={MotionStudio} />
      <Route path="/creator/card" component={CardCreator} />
      <Route path="/creator/vn" component={VNCreator} />
      <Route path="/creator/cyoa" component={CYOABuilder} />
      <Route path="/creator/cover" component={CoverCreator} />
      <Route path="/admin" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
