import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogoWordmark } from "@/components/logo";
import { Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";

/**
 * /accept-invite?token=xxx
 *
 * Flow:
 *   1. Read token from URL
 *   2. If not signed in: prompt to sign up/log in with the invited email
 *   3. If signed in: call accept_invitation(_token) RPC
 *   4. On success, refresh and redirect to /
 */

function getTokenFromHash(): string | null {
  // Hash router URL looks like: #/accept-invite?token=xxx
  const hash = window.location.hash;
  const q = hash.indexOf("?");
  if (q === -1) return null;
  const params = new URLSearchParams(hash.slice(q + 1));
  return params.get("token");
}

type State =
  | { kind: "loading" }
  | { kind: "no-token" }
  | { kind: "not-signed-in"; token: string; invEmail: string | null }
  | { kind: "accepting"; token: string }
  | { kind: "success" }
  | { kind: "error"; message: string };

export default function AcceptInvitePage() {
  const { session, refresh, user } = useAuth();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    const token = getTokenFromHash();
    if (!token) {
      setState({ kind: "no-token" });
      return;
    }
    if (!session) {
      // Fetch the invite email so we can show it and hint at signup
      // (invitations RLS blocks anon reads, so we call a light RPC in future — for now show generic)
      setState({ kind: "not-signed-in", token, invEmail: null });
      return;
    }
    // Signed in — try to accept
    setState({ kind: "accepting", token });
    (async () => {
      const { error } = await supabase.rpc("accept_invitation", { _token: token });
      if (error) {
        setState({ kind: "error", message: error.message });
        return;
      }
      await refresh();
      setState({ kind: "success" });
      setTimeout(() => {
        window.location.hash = "/";
        window.location.reload();
      }, 1500);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  return (
    <div className="min-h-dvh grid place-items-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4"><LogoWordmark /></div>
          <div className="flex justify-center mb-2">
            {state.kind === "success" ? (
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            ) : state.kind === "error" || state.kind === "no-token" ? (
              <XCircle className="h-10 w-10 text-destructive" />
            ) : (
              <Mail className="h-10 w-10 text-muted-foreground" />
            )}
          </div>
          <CardTitle>
            {state.kind === "loading" && "Loading invitation…"}
            {state.kind === "no-token" && "Invalid invitation link"}
            {state.kind === "not-signed-in" && "Accept your invitation"}
            {state.kind === "accepting" && "Accepting invitation…"}
            {state.kind === "success" && "Welcome to GAIOS"}
            {state.kind === "error" && "Couldn't accept invitation"}
          </CardTitle>
          <CardDescription>
            {state.kind === "no-token" &&
              "This link is missing an invitation token. Ask whoever invited you to resend it."}
            {state.kind === "not-signed-in" &&
              "Sign in or sign up with the email address the invitation was sent to."}
            {state.kind === "accepting" && `Signed in as ${user?.email}…`}
            {state.kind === "success" && "Redirecting to your dashboard…"}
            {state.kind === "error" && state.message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {state.kind === "loading" || state.kind === "accepting" ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : null}

          {state.kind === "not-signed-in" && (
            <>
              <Button
                className="w-full"
                onClick={() => {
                  // Preserve token so we come back here after auth
                  localStorage.setItem("gaios-pending-invite", state.token);
                  window.location.hash = "/login";
                }}
              >
                Sign in
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  localStorage.setItem("gaios-pending-invite", state.token);
                  window.location.hash = "/signup";
                }}
              >
                Create an account
              </Button>
              <p className="text-xs text-muted-foreground text-center pt-2">
                Important: use the same email the invitation was sent to.
              </p>
            </>
          )}

          {state.kind === "error" && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                window.location.hash = "/";
                window.location.reload();
              }}
            >
              Go back
            </Button>
          )}

          {state.kind === "no-token" && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => (window.location.hash = "/login")}
            >
              Go to sign in
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
