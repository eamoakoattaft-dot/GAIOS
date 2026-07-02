import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import LoginPage from "@/pages/login";
import NoOrgPage from "@/pages/no-org";

/**
 * Wraps app routes and gates them on:
 *   - session present
 *   - at least one active membership
 *
 * Anything below this only renders for a signed-in, org-attached user.
 */
export function ProtectedApp({ children }: { children: ReactNode }) {
  const { loading, session, memberships, activeOrgId } = useAuth();

  if (loading) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) return <LoginPage />;
  if (!memberships.length || !activeOrgId) return <NoOrgPage />;

  return <>{children}</>;
}

/**
 * Lighter gate: session required, but no org membership required.
 * Used by /onboarding.
 */
export function RequireSession({ children }: { children: ReactNode }) {
  const { loading, session } = useAuth();
  if (loading) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!session) return <LoginPage />;
  return <>{children}</>;
}
