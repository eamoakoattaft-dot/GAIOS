import { useEffect, useState } from "react";
import { useAuth, type Role } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, UserPlus, Copy, Check, Trash2 } from "lucide-react";

type Member = {
  id: string;
  role: Role;
  status: string;
  joined_at: string | null;
  profile: {
    id: string;
    email: string;
    display_name: string | null;
  } | null;
};

type Invitation = {
  id: string;
  email: string;
  role: Role;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

const ROLES: { value: Role; label: string; description: string }[] = [
  { value: "ed", label: "Executive Director", description: "Top authority. Full admin." },
  { value: "rso", label: "Research Sponsored Officer", description: "Research office lead. Full admin." },
  { value: "it", label: "IT / Tech", description: "Setup + technical admin." },
  { value: "gm", label: "Grants Manager", description: "Manages grants and proposals." },
  { value: "fco", label: "Finance & Compliance Officer", description: "Budgets, compliance." },
  { value: "pi", label: "Principal Investigator", description: "Leads specific projects." },
  { value: "reviewer", label: "Reviewer", description: "Read + score proposals." },
  { value: "compliance", label: "Compliance Officer", description: "Compliance review." },
  { value: "board", label: "Board Observer", description: "Read-only board view." },
];

function roleLabel(role: Role) {
  return ROLES.find((r) => r.value === role)?.label ?? role;
}

export default function TeamPage() {
  const { activeOrgId, activeRole, user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("gm");
  const [sending, setSending] = useState(false);

  const isAdmin = activeRole === "ed" || activeRole === "rso" || activeRole === "it";

  async function loadAll() {
    if (!activeOrgId) return;
    setLoading(true);
    try {
      const [membersRes, invitesRes] = await Promise.all([
        supabase
          .from("memberships")
          .select(
            "id, role, status, joined_at, profile:profiles(id, email, display_name)"
          )
          .eq("org_id", activeOrgId)
          .eq("status", "active")
          .order("joined_at", { ascending: true }),
        supabase
          .from("invitations")
          .select("id, email, role, token, expires_at, accepted_at, created_at")
          .eq("org_id", activeOrgId)
          .is("accepted_at", null)
          .order("created_at", { ascending: false }),
      ]);
      if (membersRes.error) throw membersRes.error;
      if (invitesRes.error) throw invitesRes.error;
      setMembers((membersRes.data as unknown as Member[]) ?? []);
      setInvitations((invitesRes.data as Invitation[]) ?? []);
    } catch (e: any) {
      toast({
        title: "Couldn't load team",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId]);

  async function handleSendInvite() {
    if (!inviteEmail.trim()) {
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-invite", {
        body: {
          org_id: activeOrgId,
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
        },
      });
      if (error) throw error;
      const emailSent = (data as any)?.email_sent;
      toast({
        title: "Invite created",
        description: emailSent
          ? `Email sent to ${inviteEmail}. They have 7 days to accept.`
          : `Invite created but email delivery isn't configured yet. Copy the link below to share it manually.`,
      });
      setInviteEmail("");
      setInviteRole("gm");
      setInviteOpen(false);
      await loadAll();
    } catch (e: any) {
      toast({
        title: "Couldn't send invite",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  async function handleRevokeInvite(id: string) {
    if (!confirm("Revoke this invitation?")) return;
    const { error } = await supabase.from("invitations").delete().eq("id", id);
    if (error) {
      toast({ title: "Couldn't revoke", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Invitation revoked" });
    loadAll();
  }

  function copyInviteLink(token: string) {
    const link = `${window.location.origin}/#/accept-invite?token=${token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedToken(token);
      toast({ title: "Link copied", description: "Share it with the invitee." });
      setTimeout(() => setCopiedToken(null), 2000);
    });
  }

  return (
    <>
      <PageHeader
        title="Team"
        subtitle="Manage members and pending invitations."
        actions={
          isAdmin && (
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-invite">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite teammate
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite a teammate</DialogTitle>
                  <DialogDescription>
                    They'll receive an email with a link that expires in 7 days.
                    The link is bound to the email address you enter.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="teammate@example.com"
                      disabled={sending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-role">Role</Label>
                    <Select
                      value={inviteRole}
                      onValueChange={(v) => setInviteRole(v as Role)}
                      disabled={sending}
                    >
                      <SelectTrigger id="invite-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            <div className="flex flex-col">
                              <span className="font-medium">{r.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {r.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={sending}>
                    Cancel
                  </Button>
                  <Button onClick={handleSendInvite} disabled={sending}>
                    {sending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Send invite
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Members */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Members ({members.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
                        {m.profile?.display_name || "—"}
                        {m.profile?.id === user?.id && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">
                            You
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {m.profile?.email ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{roleLabel(m.role)}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {m.joined_at
                          ? new Date(m.joined_at).toLocaleDateString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pending invites */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Pending invitations ({invitations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No pending invitations.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((inv) => {
                      const expired = new Date(inv.expires_at) < new Date();
                      return (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">{inv.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{roleLabel(inv.role)}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {expired ? (
                              <Badge variant="destructive" className="text-[10px]">
                                Expired
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">
                                {new Date(inv.expires_at).toLocaleDateString()}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {isAdmin && (
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyInviteLink(inv.token)}
                                  title="Copy invite link"
                                >
                                  {copiedToken === inv.token ? (
                                    <Check className="h-3.5 w-3.5" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRevokeInvite(inv.id)}
                                  title="Revoke"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
