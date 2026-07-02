-- 0002_add_it_role_and_org_setup.sql
-- Adds:
--   1. 'it' value to role enum (9th role, admin-equivalent for tech/setup)
--   2. Extends is_org_admin() to include 'it'
--   3. create_org_and_membership() RPC — atomic org creation + self-membership + optional ED invite
--   4. accept_invitation() RPC — atomic membership creation from invite token

-- ============================================================
-- 1. Add 'it' to role enum
-- ============================================================
ALTER TYPE role ADD VALUE IF NOT EXISTS 'it';

COMMIT;

-- ============================================================
-- 2. Update is_org_admin() to include 'it' as admin
--    (Previously only ed + rso. Now: ed, rso, it.)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_org_admin(_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = auth.uid()
      AND m.org_id = _org_id
      AND m.status = 'active'
      AND m.role IN ('ed', 'rso', 'it')
  );
$$;

-- ============================================================
-- 3. create_org_and_membership()
--    Called by the /onboarding page. Runs as SECURITY DEFINER so
--    the caller doesn't need INSERT perms on organizations/memberships
--    (RLS on those tables blocks direct inserts).
--
--    Args:
--      _org_name        text  — display name, e.g. "CSTEM Global"
--      _org_slug        text  — URL slug, e.g. "cstem-global"
--      _my_role         role  — role for the caller (typically 'it' or 'ed')
--      _ed_email        text  — optional; if set + caller is 'it', create an ED invite
--      _display_name    text  — optional; update the caller's profile
--
--    Returns: uuid of the new organization
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_org_and_membership(
  _org_name text,
  _org_slug text,
  _my_role role,
  _ed_email text DEFAULT NULL,
  _display_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _new_org_id uuid;
  _invite_token text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _org_name IS NULL OR length(trim(_org_name)) = 0 THEN
    RAISE EXCEPTION 'Organization name is required';
  END IF;

  IF _org_slug IS NULL OR length(trim(_org_slug)) = 0 THEN
    RAISE EXCEPTION 'Organization slug is required';
  END IF;

  -- Guard: caller must not already belong to any org (single-org MVP)
  IF EXISTS (SELECT 1 FROM memberships WHERE user_id = _uid AND status = 'active') THEN
    RAISE EXCEPTION 'You already belong to an organization';
  END IF;

  -- Optionally update display name on caller's profile
  IF _display_name IS NOT NULL AND length(trim(_display_name)) > 0 THEN
    UPDATE profiles SET display_name = _display_name WHERE id = _uid;
  END IF;

  -- Create org
  INSERT INTO organizations (name, slug)
  VALUES (trim(_org_name), lower(trim(_org_slug)))
  RETURNING id INTO _new_org_id;

  -- Create caller's membership
  INSERT INTO memberships (user_id, org_id, role, status, joined_at)
  VALUES (_uid, _new_org_id, _my_role, 'active', now());

  -- If caller isn't ED and provided an ED email, create an invitation
  IF _my_role <> 'ed' AND _ed_email IS NOT NULL AND length(trim(_ed_email)) > 0 THEN
    _invite_token := encode(gen_random_bytes(24), 'hex');
    INSERT INTO invitations (org_id, email, role, token, invited_by_user_id, expires_at)
    VALUES (
      _new_org_id,
      lower(trim(_ed_email)),
      'ed'::role,
      _invite_token,
      _uid,
      now() + interval '7 days'
    );

    -- Notify caller (audit trail; not an email — we'll wire email in Task #6b)
    INSERT INTO notifications (org_id, user_id, kind, title, body, payload)
    VALUES (
      _new_org_id,
      _uid,
      'invite_created',
      'Executive Director invite queued',
      'An invite for ' || lower(trim(_ed_email)) || ' will be sent when email is configured.',
      jsonb_build_object('email', lower(trim(_ed_email)), 'role', 'ed', 'token', _invite_token)
    );
  END IF;

  -- Audit
  INSERT INTO audit_log (org_id, actor_user_id, action, target_kind, target_id, diff)
  VALUES (
    _new_org_id,
    _uid,
    'create',
    'organization',
    _new_org_id,
    jsonb_build_object('name', _org_name, 'slug', _org_slug, 'my_role', _my_role)
  );

  RETURN _new_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_org_and_membership(text, text, role, text, text) TO authenticated;

-- ============================================================
-- 4. accept_invitation() — for the invite-accept flow (Task #6b)
--    Included now so the whole flow is atomic when we build the UI.
-- ============================================================
CREATE OR REPLACE FUNCTION public.accept_invitation(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _uemail text;
  _inv invitations%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO _uemail FROM auth.users WHERE id = _uid;

  SELECT * INTO _inv FROM invitations WHERE token = _token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;
  IF _inv.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invitation already accepted';
  END IF;
  IF _inv.expires_at < now() THEN
    RAISE EXCEPTION 'Invitation expired';
  END IF;
  IF lower(_inv.email) <> lower(_uemail) THEN
    RAISE EXCEPTION 'This invitation was issued to a different email';
  END IF;

  -- Create membership (or reactivate if suspended)
  INSERT INTO memberships (user_id, org_id, role, status, invited_by_user_id, invited_at, joined_at)
  VALUES (_uid, _inv.org_id, _inv.role, 'active', _inv.invited_by_user_id, _inv.created_at, now())
  ON CONFLICT (user_id, org_id) DO UPDATE
    SET role = EXCLUDED.role, status = 'active', joined_at = now();

  UPDATE invitations SET accepted_at = now() WHERE id = _inv.id;

  INSERT INTO audit_log (org_id, actor_user_id, action, target_kind, target_id, diff)
  VALUES (_inv.org_id, _uid, 'accept_invite', 'invitation', _inv.id,
          jsonb_build_object('email', _inv.email, 'role', _inv.role));

  RETURN _inv.org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;
