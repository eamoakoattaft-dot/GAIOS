import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AppLayout } from "@/components/layout";

import Overview from "@/pages/overview";
import Grants from "@/pages/grants";
import ITPage from "@/pages/it";
import Training from "@/pages/training";
import Donors from "@/pages/donors";
import Curriculum from "@/pages/curriculum";
import Agents from "@/pages/agents";
import Templates from "@/pages/templates";
import Launch from "@/pages/launch";
import NotFound from "@/pages/not-found";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Overview} />
      <Route path="/grants" component={Grants} />
      <Route path="/it" component={ITPage} />
      <Route path="/training" component={Training} />
      <Route path="/donors" component={Donors} />
      <Route path="/curriculum" component={Curriculum} />
      <Route path="/agents" component={Agents} />
      <Route path="/templates" component={Templates} />
      <Route path="/launch" component={Launch} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router hook={useHashLocation}>
            <AppLayout>
              <AppRouter />
            </AppLayout>
          </Router>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
