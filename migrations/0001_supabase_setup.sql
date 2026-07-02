-- Supabase-specific setup: auth integration, RLS scaffolding, helper functions.
-- Run this AFTER 0000_v1_foundation.sql.
--> statement-breakpoint

-- ============================================================
-- Drop the toy users table if it still exists
-- ============================================================
DROP TABLE IF EXISTS "users" CASCADE;
--> statement-breakpoint

-- ============================================================
-- profiles: mirror auth.users
-- ============================================================
-- Add FK from profiles.id to auth.users.id
ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_id_fkey"
  FOREIGN KEY ("id") REFERENCES auth.users("id") ON DELETE CASCADE;
--> statement-breakpoint

-- Function that inserts a profile row when a new auth.user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
--> statement-breakpoint

-- ============================================================
-- FOREIGN KEYS to profiles (drizzle doesn't emit these because
-- profiles.id references auth.users, not the other way around).
-- ============================================================
ALTER TABLE "memberships"
  ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "memberships_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "memberships_invited_by_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "profiles"("id") ON DELETE SET NULL;
--> statement-breakpoint

ALTER TABLE "invitations"
  ADD CONSTRAINT "invitations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "invitations_invited_by_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "profiles"("id") ON DELETE CASCADE;
--> statement-breakpoint

ALTER TABLE "donors"
  ADD CONSTRAINT "donors_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "donors_created_by_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "profiles"("id") ON DELETE SET NULL;
--> statement-breakpoint

ALTER TABLE "donor_registrations"
  ADD CONSTRAINT "donor_reg_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "donor_reg_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "donors"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "donor_reg_owner_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "profiles"("id") ON DELETE SET NULL;
--> statement-breakpoint

ALTER TABLE "opportunities"
  ADD CONSTRAINT "opp_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "opp_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "donors"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "opp_owner_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "profiles"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "opp_created_by_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "profiles"("id") ON DELETE SET NULL;
--> statement-breakpoint

ALTER TABLE "screenings"
  ADD CONSTRAINT "screenings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "screenings_opp_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "screenings_scored_by_fkey" FOREIGN KEY ("scored_by_user_id") REFERENCES "profiles"("id") ON DELETE SET NULL;
--> statement-breakpoint

ALTER TABLE "proposals"
  ADD CONSTRAINT "proposals_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "proposals_opp_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "proposals_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "donors"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "proposals_pi_fkey" FOREIGN KEY ("pi_user_id") REFERENCES "profiles"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "proposals_created_by_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "profiles"("id") ON DELETE SET NULL;
--> statement-breakpoint

ALTER TABLE "proposal_files"
  ADD CONSTRAINT "propfiles_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "propfiles_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "propfiles_uploaded_by_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "profiles"("id") ON DELETE SET NULL;
--> statement-breakpoint

ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "tasks_assignee_fkey" FOREIGN KEY ("assignee_user_id") REFERENCES "profiles"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "profiles"("id") ON DELETE SET NULL;
--> statement-breakpoint

ALTER TABLE "notifications"
  ADD CONSTRAINT "notif_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "notif_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE;
--> statement-breakpoint

ALTER TABLE "audit_log"
  ADD CONSTRAINT "audit_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "audit_actor_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "profiles"("id") ON DELETE SET NULL;
--> statement-breakpoint

-- ============================================================
-- RLS helper functions (SECURITY DEFINER, live in public schema)
-- ============================================================

-- Returns true if the caller is a member of the given org (any role).
CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.org_id = target_org_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
  );
$$;
--> statement-breakpoint

-- Returns the caller's role in the given org, or NULL.
CREATE OR REPLACE FUNCTION public.org_role(target_org_id uuid)
RETURNS "role"
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM memberships
  WHERE org_id = target_org_id
    AND user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;
$$;
--> statement-breakpoint

-- True if caller can administer the org (ed, rso).
CREATE OR REPLACE FUNCTION public.is_org_admin(target_org_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.org_role(target_org_id) IN ('ed', 'rso');
$$;
--> statement-breakpoint

-- ============================================================
-- Enable RLS on every table
-- ============================================================
ALTER TABLE organizations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships         ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE donors              ENABLE ROW LEVEL SECURITY;
ALTER TABLE donor_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities       ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals           ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_files      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log           ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- ============================================================
-- RLS Policies
-- Pattern: any org member can read; only admins (ed/rso) can write
-- for the core admin surfaces. Others (donors, opportunities, etc.)
-- allow any active member to write; audit_log is insert-only via server.
-- ============================================================

-- organizations: members can see; only admins can update.
CREATE POLICY "org_select_members" ON organizations
  FOR SELECT USING (public.is_org_member(id));
CREATE POLICY "org_update_admin" ON organizations
  FOR UPDATE USING (public.is_org_admin(id));
--> statement-breakpoint

-- profiles: users can see own, and members of shared orgs.
CREATE POLICY "profiles_select_self" ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM memberships m1
      JOIN memberships m2 ON m1.org_id = m2.org_id
      WHERE m1.user_id = auth.uid()
        AND m2.user_id = profiles.id
        AND m1.status = 'active' AND m2.status = 'active'
    )
  );
CREATE POLICY "profiles_update_self" ON profiles
  FOR UPDATE USING (id = auth.uid());
--> statement-breakpoint

-- memberships: members can see membership rows in their org; admins can insert/update/delete.
CREATE POLICY "memberships_select" ON memberships
  FOR SELECT USING (public.is_org_member(org_id));
CREATE POLICY "memberships_insert_admin" ON memberships
  FOR INSERT WITH CHECK (public.is_org_admin(org_id));
CREATE POLICY "memberships_update_admin" ON memberships
  FOR UPDATE USING (public.is_org_admin(org_id));
CREATE POLICY "memberships_delete_admin" ON memberships
  FOR DELETE USING (public.is_org_admin(org_id));
--> statement-breakpoint

-- invitations: admins only.
CREATE POLICY "inv_admin_all" ON invitations
  FOR ALL USING (public.is_org_admin(org_id))
  WITH CHECK (public.is_org_admin(org_id));
--> statement-breakpoint

-- donors: members read + write (all roles collaborate on donor registry).
CREATE POLICY "donors_select_members" ON donors
  FOR SELECT USING (public.is_org_member(org_id));
CREATE POLICY "donors_write_members" ON donors
  FOR ALL USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));
--> statement-breakpoint

-- donor_registrations: same as donors.
CREATE POLICY "donor_reg_select" ON donor_registrations
  FOR SELECT USING (public.is_org_member(org_id));
CREATE POLICY "donor_reg_write" ON donor_registrations
  FOR ALL USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));
--> statement-breakpoint

-- opportunities / screenings / proposals / proposal_files: members read+write.
CREATE POLICY "opp_all" ON opportunities
  FOR ALL USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "screen_all" ON screenings
  FOR ALL USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "prop_all" ON proposals
  FOR ALL USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "propfiles_all" ON proposal_files
  FOR ALL USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
--> statement-breakpoint

-- tasks: members read+write.
CREATE POLICY "tasks_all" ON tasks
  FOR ALL USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
--> statement-breakpoint

-- notifications: users see only their own; server (service_role) inserts.
CREATE POLICY "notif_select_self" ON notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notif_update_self" ON notifications
  FOR UPDATE USING (user_id = auth.uid());
--> statement-breakpoint

-- audit_log: members can READ, only server (service_role) can INSERT.
CREATE POLICY "audit_select_members" ON audit_log
  FOR SELECT USING (public.is_org_member(org_id));
-- No insert policy = only service_role bypasses RLS can write.
