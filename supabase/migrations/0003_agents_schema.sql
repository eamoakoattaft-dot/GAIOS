-- 0003_agents_schema.sql
-- GAIOS Grant Manager agent tables + supporting helpers.
-- Extracted from deployed state on 2026-07-12.
--
-- Dependencies:
--   - public.organizations(id)                 -- from 0000_v1_foundation
--   - public.opportunities(id)                 -- from 0000_v1_foundation
--   - public.audit_log                         -- from 0000_v1_foundation
--   - public.opportunity_status enum           -- from 0000_v1_foundation
--   - extension pgcrypto (for gen_random_uuid) -- typically already enabled
--
-- All *_demo_* RLS policies pin access to the fixed demo org id:
--   b333f317-68b4-4f11-b053-0d8116e3335c (CSTEM Global)
-- and are appropriate for the current public demo mode only.

BEGIN;

-- ---------------------------------------------------------------------------
-- Helper: is_demo_org(uuid)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_demo_org(target_org_id uuid)
RETURNS boolean
LANGUAGE sql
IMMUTABLE PARALLEL SAFE
AS $$
  SELECT target_org_id = 'b333f317-68b4-4f11-b053-0d8116e3335c'::uuid;
$$;

-- ---------------------------------------------------------------------------
-- external_opportunities
--   Raw ingest table for Grants.gov + SAM.gov postings.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.external_opportunities (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source             text NOT NULL CHECK (source IN ('grants.gov','sam.gov')),
  notice_id          text NOT NULL,
  title              text NOT NULL,
  agency             text,
  sub_agency         text,
  opportunity_number text,
  naics_codes        text[] DEFAULT '{}'::text[],
  psc_codes          text[] DEFAULT '{}'::text[],
  set_aside          text,
  posted_date        date,
  response_deadline  timestamptz,
  award_ceiling      numeric,
  award_floor        numeric,
  description        text,
  url                text,
  raw_json           jsonb,
  synced_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, notice_id)
);

CREATE INDEX IF NOT EXISTS ext_opp_agency_idx   ON public.external_opportunities (agency);
CREATE INDEX IF NOT EXISTS ext_opp_deadline_idx ON public.external_opportunities (response_deadline);
CREATE INDEX IF NOT EXISTS ext_opp_posted_idx   ON public.external_opportunities (posted_date DESC);
CREATE INDEX IF NOT EXISTS ext_opp_source_idx   ON public.external_opportunities (source);

ALTER TABLE public.external_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY ext_opp_public_read ON public.external_opportunities
  FOR SELECT TO public USING (true);

CREATE POLICY ext_opp_public_write ON public.external_opportunities
  FOR ALL TO public USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- agent_scoring_config
--   Per (org, agent) rule-based scoring configuration.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_scoring_config (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id              text NOT NULL DEFAULT 'grant-manager',
  keywords              text[]  DEFAULT '{}'::text[],
  naics_codes           text[]  DEFAULT '{}'::text[],
  agencies              text[]  DEFAULT '{}'::text[],
  exclude_set_asides    text[]  DEFAULT '{}'::text[],
  min_days_to_deadline  int     DEFAULT 7,
  max_days_to_deadline  int     DEFAULT 180,
  weights               jsonb   DEFAULT '{"keyword":40,"naics":25,"agency":15,"deadline":10,"set_aside":10}'::jsonb,
  thresholds            jsonb   DEFAULT '{"pursue":70,"partner":50,"monitor":30}'::jsonb,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, agent_id)
);

ALTER TABLE public.agent_scoring_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY asc_demo_read ON public.agent_scoring_config
  FOR SELECT TO public USING (public.is_demo_org(org_id));

CREATE POLICY asc_demo_write ON public.agent_scoring_config
  FOR ALL TO public USING (public.is_demo_org(org_id)) WITH CHECK (public.is_demo_org(org_id));

-- ---------------------------------------------------------------------------
-- agent_recommendations
--   Scored recommendation per (opportunity, agent, scorer_version).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_recommendations (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  external_opportunity_id  uuid NOT NULL REFERENCES public.external_opportunities(id) ON DELETE CASCADE,
  agent_id                 text NOT NULL DEFAULT 'grant-manager',
  recommendation           text NOT NULL CHECK (recommendation IN ('Pursue','Partner','Monitor','Decline')),
  score                    numeric NOT NULL CHECK (score >= 0 AND score <= 100),
  rationale                jsonb NOT NULL DEFAULT '{}'::jsonb,
  scorer_version           text NOT NULL DEFAULT 'rules-v1',
  status                   text NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','approved','declined','partner_review')),
  approved_by_name         text,
  approved_by_email        text,
  approved_at              timestamptz,
  linked_opportunity_id    uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  notes                    text,
  generated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (external_opportunity_id, agent_id, scorer_version)
);

CREATE INDEX IF NOT EXISTS agent_rec_org_idx    ON public.agent_recommendations (org_id);
CREATE INDEX IF NOT EXISTS agent_rec_score_idx  ON public.agent_recommendations (score DESC);
CREATE INDEX IF NOT EXISTS agent_rec_status_idx ON public.agent_recommendations (status);

ALTER TABLE public.agent_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_rec_demo_read ON public.agent_recommendations
  FOR SELECT TO public USING (public.is_demo_org(org_id));

CREATE POLICY agent_rec_demo_write ON public.agent_recommendations
  FOR ALL TO public USING (public.is_demo_org(org_id)) WITH CHECK (public.is_demo_org(org_id));

-- ---------------------------------------------------------------------------
-- agent_sync_runs
--   Audit trail for edge-function sync/hydrate/score runs.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_sync_runs (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source                   text NOT NULL CHECK (source IN ('grants.gov','sam.gov','scorer')),
  started_at               timestamptz NOT NULL DEFAULT now(),
  finished_at              timestamptz,
  opportunities_fetched    int DEFAULT 0,
  opportunities_new        int DEFAULT 0,
  opportunities_updated    int DEFAULT 0,
  recommendations_created  int DEFAULT 0,
  status                   text NOT NULL DEFAULT 'running'
                             CHECK (status IN ('running','success','error','skipped')),
  error                    text,
  meta                     jsonb
);

CREATE INDEX IF NOT EXISTS sync_runs_source_idx  ON public.agent_sync_runs (source);
CREATE INDEX IF NOT EXISTS sync_runs_started_idx ON public.agent_sync_runs (started_at DESC);

ALTER TABLE public.agent_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY sync_runs_public_read ON public.agent_sync_runs
  FOR SELECT TO public USING (true);

CREATE POLICY sync_runs_public_write ON public.agent_sync_runs
  FOR ALL TO public USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- RPC: approve_recommendation
--   Moves a pending recommendation to approved/declined/partner_review and,
--   on approve, creates a public.opportunities row for the pipeline.
--   SECURITY DEFINER so unauthenticated demo callers can still write audit_log.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_recommendation(
  p_recommendation_id uuid,
  p_approver_name     text,
  p_approver_email    text,
  p_action            text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rec public.agent_recommendations;
  ext public.external_opportunities;
  new_status text;
  new_opp_id uuid;
BEGIN
  IF p_action NOT IN ('approve','decline','partner_review') THEN
    RAISE EXCEPTION 'invalid action: %', p_action;
  END IF;

  SELECT * INTO rec FROM public.agent_recommendations WHERE id = p_recommendation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'recommendation % not found', p_recommendation_id; END IF;

  IF rec.status <> 'pending' THEN
    RAISE EXCEPTION 'recommendation already resolved: %', rec.status;
  END IF;

  new_status := CASE p_action
    WHEN 'approve' THEN 'approved'
    WHEN 'decline' THEN 'declined'
    WHEN 'partner_review' THEN 'partner_review'
  END;

  IF p_action = 'approve' THEN
    SELECT * INTO ext FROM public.external_opportunities WHERE id = rec.external_opportunity_id;
    INSERT INTO public.opportunities (
      org_id, title, foa_number, deadline, status, submission_url, description
    ) VALUES (
      rec.org_id,
      ext.title,
      COALESCE(ext.opportunity_number, ext.source || ':' || ext.notice_id),
      COALESCE(ext.response_deadline, now() + interval '90 days'),
      'screening'::opportunity_status,
      ext.url,
      COALESCE(ext.description, '') ||
        E'\n\n[Source: ' || ext.source || ' · ' || ext.notice_id ||
        ' · Agency: ' || COALESCE(ext.agency,'?') || ']'
    )
    RETURNING id INTO new_opp_id;
  END IF;

  UPDATE public.agent_recommendations
    SET status = new_status,
        approved_by_name  = p_approver_name,
        approved_by_email = p_approver_email,
        approved_at       = now(),
        linked_opportunity_id = new_opp_id
    WHERE id = p_recommendation_id;

  INSERT INTO public.audit_log (org_id, actor_user_id, action, target_kind, target_id, diff)
  VALUES (
    rec.org_id,
    NULL,
    p_action || '_recommendation',
    'agent_recommendation',
    rec.id,
    jsonb_build_object(
      'approver_name',  p_approver_name,
      'approver_email', p_approver_email,
      'score',          rec.score,
      'recommendation', rec.recommendation,
      'linked_opportunity_id', new_opp_id
    )
  );

  RETURN COALESCE(new_opp_id, rec.id);
END;
$function$;

COMMIT;
