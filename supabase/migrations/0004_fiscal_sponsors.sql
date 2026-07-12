-- 0004_fiscal_sponsors.sql
-- Fiscal sponsor directory table (public read, no writes from client).
-- Rows are seeded by 0006_seed_fiscal_sponsors.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS public.fiscal_sponsors (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  website               text,
  model                 text,
  admin_fee             text,
  sector_focus          text,
  minimum_project_size  text,
  application_process   text,
  geographic_scope      text,
  contact               text,
  fit_rationale         text,
  fit_tier              text DEFAULT 'consider'
                          CHECK (fit_tier IN ('top','strong','consider','excluded')),
  sort_order            int  DEFAULT 100,
  sources               jsonb DEFAULT '[]'::jsonb,
  created_at            timestamptz DEFAULT now()
);

ALTER TABLE public.fiscal_sponsors ENABLE ROW LEVEL SECURITY;

CREATE POLICY fiscal_sponsors_read ON public.fiscal_sponsors
  FOR SELECT TO public USING (true);

COMMIT;
