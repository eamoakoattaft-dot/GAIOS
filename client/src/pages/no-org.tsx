import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogoWordmark } from "@/components/logo";
import { Building2, Rocket } from "lucide-react";

export default function NoOrgPage() {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-dvh grid place-items-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4"><LogoWordmark /></div>
          <div className="flex justify-center mb-2"><Building2 className="h-10 w-10 text-muted-foreground" /></div>
          <CardTitle>You're not on any team yet</CardTitle>
          <CardDescription>
            You're signed in as <strong>{user?.email}</strong>. Set up a new organization,
            or wait for someone to invite you to theirs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="w-full"
            onClick={() => {
              // Hash router: navigate to /onboarding
              window.location.hash = "/onboarding";
            }}
          >
            <Rocket className="mr-2 h-4 w-4" />
            Set up your organization
          </Button>
          <p className="text-xs text-muted-foreground text-center pt-1">
            Or ask your Executive Director / Research Sponsored Officer for an invite link.
          </p>
          <Button variant="outline" className="w-full" onClick={signOut}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
