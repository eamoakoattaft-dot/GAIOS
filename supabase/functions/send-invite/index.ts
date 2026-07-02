// supabase/functions/send-invite/index.ts
//
// Called from the /team page. Auth: caller must be an active admin (ed/rso/it)
// of the org. We use the service_role client to:
//   1. Verify the caller is an admin of the requested org
//   2. Generate a unique token + insert into invitations
//   3. Send the actual email via supabase.auth.admin.inviteUserByEmail()
//      which uses the project's Auth email settings (free tier ok).
//
// Body: { org_id: string, email: string, role: string }
// Returns: { invitation_id, token, invite_url, email_sent }
//
// If the Auth admin invite fails (e.g. user already exists), we still return
// the invite row so the admin can copy the link and share manually.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") ?? "https://gaios.cstemglobal.org";

const ALLOWED_ROLES = new Set([
  "ed", "rso", "gm", "fco", "pi", "reviewer", "compliance", "board", "it",
]);

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "*";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    // 1. Get caller from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonError("Missing Authorization header", 401, origin);
    }
    const jwt = authHeader.replace(/^Bearer\s+/i, "");

    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(jwt);
    if (userErr || !userData.user) {
      return jsonError("Not authenticated", 401, origin);
    }
    const callerId = userData.user.id;

    // 2. Parse + validate body
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonError("Invalid body", 400, origin);
    }
    const { org_id, email, role } = body as {
      org_id?: string;
      email?: string;
      role?: string;
    };
    if (!org_id) return jsonError("org_id is required", 400, origin);
    if (!email) return jsonError("email is required", 400, origin);
    if (!role || !ALLOWED_ROLES.has(role)) {
      return jsonError("valid role is required", 400, origin);
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 3. Verify caller is an admin of the org
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: membership, error: memErr } = await admin
      .from("memberships")
      .select("role, status")
      .eq("user_id", callerId)
      .eq("org_id", org_id)
      .eq("status", "active")
      .maybeSingle();
    if (memErr) return jsonError(memErr.message, 500, origin);
    if (!membership || !["ed", "rso", "it"].includes(membership.role)) {
      return jsonError("Only admins can send invites", 403, origin);
    }

    // 4. Guard: no existing active membership for this email in the org
    const { data: existingUser } = await admin
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();
    if (existingUser) {
      const { data: existingMem } = await admin
        .from("memberships")
        .select("id")
        .eq("user_id", existingUser.id)
        .eq("org_id", org_id)
        .eq("status", "active")
        .maybeSingle();
      if (existingMem) {
        return jsonError("This person is already a member of the organization", 409, origin);
      }
    }

    // 5. Guard: replace any prior unaccepted invitation for the same (org, email)
    await admin
      .from("invitations")
      .delete()
      .eq("org_id", org_id)
      .eq("email", normalizedEmail)
      .is("accepted_at", null);

    // 6. Create invitation row
    const token = randomToken();
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: inv, error: invErr } = await admin
      .from("invitations")
      .insert({
        org_id,
        email: normalizedEmail,
        role,
        token,
        invited_by_user_id: callerId,
        expires_at,
      })
      .select("id, token")
      .single();
    if (invErr) return jsonError(invErr.message, 500, origin);

    const invite_url = `${APP_URL}/#/accept-invite?token=${token}`;

    // 7. Fire the email via Supabase Auth admin API.
    // This works whether or not the recipient already has an account:
    //   - New user: sends a signup magic link
    //   - Existing user: still emails them (they'll sign in normally, then hit the accept URL)
    // We include the invite URL as the redirect target.
    let email_sent = false;
    let email_error: string | null = null;
    try {
      const { error: mailErr } = await admin.auth.admin.inviteUserByEmail(
        normalizedEmail,
        { redirectTo: invite_url }
      );
      if (mailErr) {
        // Fall back to magic link for existing users
        const { error: mlErr } = await admin.auth.signInWithOtp({
          email: normalizedEmail,
          options: { emailRedirectTo: invite_url, shouldCreateUser: true },
        });
        if (mlErr) {
          email_error = mailErr.message + " / " + mlErr.message;
        } else {
          email_sent = true;
        }
      } else {
        email_sent = true;
      }
    } catch (e) {
      email_error = (e as Error).message;
    }

    return new Response(
      JSON.stringify({
        invitation_id: inv.id,
        token: inv.token,
        invite_url,
        email_sent,
        email_error,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } }
    );
  } catch (e) {
    return jsonError((e as Error).message, 500, origin);
  }
});

function jsonError(message: string, status: number, origin: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}
