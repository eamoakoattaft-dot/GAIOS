import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogoWordmark } from "@/components/logo";
import { Building2 } from "lucide-react";

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
            You're signed in as <strong>{user?.email}</strong>, but no organization has added you yet.
            Ask your Executive Director or Research Sponsored Officer to send you an invite.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground text-center">
            Once you accept an invite, you'll see your GAIOS workspace here.
          </p>
          <Button variant="outline" className="w-full" onClick={signOut}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
