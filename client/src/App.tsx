import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AppLayout } from "@/components/layout";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ProtectedApp, RequireSession } from "@/components/protected-route";

import Overview from "@/pages/overview";
import Grants from "@/pages/grants";
import ITPage from "@/pages/it";
import Training from "@/pages/training";
import Donors from "@/pages/donors";
import Curriculum from "@/pages/curriculum";
import Agents from "@/pages/agents";
import Templates from "@/pages/templates";
import Launch from "@/pages/launch";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import OnboardingPage from "@/pages/onboarding";
import TeamPage from "@/pages/team";
import AcceptInvitePage from "@/pages/accept-invite";
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
      <Route path="/team" component={TeamPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

/** Routes that must be reachable without a session (login/signup). */
function PublicRouter() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      {/* Onboarding + accept-invite need a session but NOT a membership. */}
      <Route path="/onboarding">
        <RequireSession>
          <OnboardingPage />
        </RequireSession>
      </Route>
      <Route path="/accept-invite">
        <AcceptInvitePage />
      </Route>
      <Route>
        <ProtectedApp>
          <AppLayout>
            <AppRouter />
          </AppLayout>
        </ProtectedApp>
      </Route>
    </Switch>
  );
}

function Shell() {
  // Reads session so a signed-in user hitting /login gets bounced to /.
  const { session, loading } = useAuth();
  if (loading) return null;
  return <PublicRouter />;
  void session; // reserved for future redirect logic
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <AuthProvider>
            <Router hook={useHashLocation}>
              <Shell />
            </Router>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
