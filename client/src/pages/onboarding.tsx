import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LogoWordmark } from "@/components/logo";
import { Loader2, Rocket, ArrowRight, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * /onboarding — two-step "Set up your organization" flow.
 *
 * Step 1: pick your role — Executive Director OR IT (setting up on behalf of ED).
 * Step 2: org details. If IT, an ED email field appears (optional per user's spec).
 *
 * Submits via RPC `create_org_and_membership` which creates org + membership +
 * (optionally) an ED invitation in one transaction as SECURITY DEFINER.
 */

type SetupRole = "ed" | "it";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export default function OnboardingPage() {
  const { user, refresh, signOut } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<SetupRole>("it");
  const [orgName, setOrgName] = useState("CSTEM Global");
  const [orgSlug, setOrgSlug] = useState("cstem-global");
  const [slugTouched, setSlugTouched] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [edEmail, setEdEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleOrgNameChange(v: string) {
    setOrgName(v);
    if (!slugTouched) setOrgSlug(slugify(v));
  }

  async function handleSubmit() {
    if (!orgName.trim()) {
      toast({ title: "Organization name is required", variant: "destructive" });
      return;
    }
    if (!orgSlug.trim()) {
      toast({ title: "Slug is required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("create_org_and_membership", {
        _org_name: orgName.trim(),
        _org_slug: slugify(orgSlug),
        _my_role: role,
        _ed_email: role === "it" && edEmail.trim() ? edEmail.trim() : null,
        _display_name: displayName.trim() || null,
      });
      if (error) throw error;
      await refresh();
      toast({
        title: "Organization created",
        description: `${orgName} is set up. Welcome to GAIOS.`,
      });
      // Land on dashboard
      window.location.hash = "/";
      // Belt & suspenders: reload so all providers re-read fresh memberships
      setTimeout(() => window.location.reload(), 150);
    } catch (e: any) {
      toast({
        title: "Couldn't create organization",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh grid place-items-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4"><LogoWordmark /></div>
          <CardTitle className="flex items-center justify-center gap-2">
            <Rocket className="h-5 w-5" />
            Set up your organization
          </CardTitle>
          <CardDescription>
            Signed in as <strong>{user?.email}</strong> · Step {step} of 2
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {step === 1 && (
            <>
              <div className="space-y-3">
                <Label className="text-sm font-medium">Which best describes you?</Label>
                <RadioGroup
                  value={role}
                  onValueChange={(v) => setRole(v as SetupRole)}
                  className="space-y-2"
                >
                  <label
                    htmlFor="role-ed"
                    className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/40"
                  >
                    <RadioGroupItem value="ed" id="role-ed" className="mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">I'm the Executive Director</div>
                      <div className="text-xs text-muted-foreground">
                        You'll be assigned the top role (ed) and full admin powers.
                      </div>
                    </div>
                  </label>
                  <label
                    htmlFor="role-it"
                    className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/40"
                  >
                    <RadioGroupItem value="it" id="role-it" className="mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">
                        I'm setting this up for someone else (IT / tech)
                      </div>
                      <div className="text-xs text-muted-foreground">
                        You'll be assigned the <strong>it</strong> role (admin-equivalent). You can queue
                        an invite for the real Executive Director on the next step.
                      </div>
                    </div>
                  </label>
                </RadioGroup>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={signOut} disabled={submitting}>
                  Sign out
                </Button>
                <Button onClick={() => setStep(2)} disabled={submitting}>
                  Next <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization name</Label>
                <Input
                  id="org-name"
                  value={orgName}
                  onChange={(e) => handleOrgNameChange(e.target.value)}
                  placeholder="e.g. CSTEM Global"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-slug">URL slug</Label>
                <Input
                  id="org-slug"
                  value={orgSlug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setOrgSlug(slugify(e.target.value));
                  }}
                  placeholder="cstem-global"
                  disabled={submitting}
                />
                <p className="text-xs text-muted-foreground">
                  Used internally. Lowercase letters, numbers, dashes.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="display-name">Your display name (optional)</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How your name appears in the app"
                  disabled={submitting}
                />
              </div>
              {role === "it" && (
                <div className="space-y-2">
                  <Label htmlFor="ed-email">Executive Director's email (optional)</Label>
                  <Input
                    id="ed-email"
                    type="email"
                    value={edEmail}
                    onChange={(e) => setEdEmail(e.target.value)}
                    placeholder="Leave blank to invite them later"
                    disabled={submitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    We'll queue an ED invitation. Email delivery is wired in the next task; for now
                    the invite is stored and can be sent manually.
                  </p>
                </div>
              )}
              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(1)} disabled={submitting}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…
                    </>
                  ) : (
                    <>Create organization</>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
