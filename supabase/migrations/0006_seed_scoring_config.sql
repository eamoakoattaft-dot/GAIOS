-- 0006_seed_scoring_config.sql
-- Seed CSTEM Global grant-manager scoring configuration.
-- Idempotent: uses ON CONFLICT (org_id, agent_id) DO UPDATE.

BEGIN;

INSERT INTO public.agent_scoring_config (
  org_id, agent_id,
  keywords, naics_codes, agencies, exclude_set_asides,
  min_days_to_deadline, max_days_to_deadline,
  weights, thresholds
) VALUES (
  'b333f317-68b4-4f11-b053-0d8116e3335c'::uuid,
  'grant-manager',
  ARRAY[
    'biodiversity','ecosystem','conservation','restoration','landscape ecology',
    'ecosystem services','natural resource','wildlife','habitat',
    'climate resilience','climate adaptation','climate change',
    'sustainability','sustainable development','circular economy','renewable',
    'environmental education',
    'ecotourism','sustainable tourism','destination management',
    'cultural heritage','heritage preservation',
    'livelihoods','community development','workforce training','small enterprise',
    'poverty reduction','rural development',
    'women empowerment','youth development',
    'applied research','impact assessment','policy','monitoring and evaluation',
    'Africa','West Africa','Ghana','Global South','sub-Saharan',
    'capacity building','emerging organizations','planning grant','seed grant'
  ]::text[],
  ARRAY[
    '541620','541690','541712','541720','541990',
    '813312','813311','813319','624310',
    '611430','611710','927110'
  ]::text[],
  ARRAY[
    'USAID','DOS','State','EPA',
    'DOI','DOI-NPS','DOI-FWS','DOI-BLM',
    'USDA','USDA-NRCS','USDA-FS','USDA-NIFA',
    'NSF','NOAA','DOC','ED','MCC','DFC'
  ]::text[],
  ARRAY[
    'Total Small Business Set-Aside',
    '8(a) Set-Aside',
    'WOSB Set-Aside',
    'HUBZone Set-Aside',
    'Service-Disabled Veteran-Owned Small Business Set-Aside'
  ]::text[],
  7,
  180,
  '{"keyword":40,"naics":25,"agency":15,"deadline":10,"set_aside":10}'::jsonb,
  '{"pursue":70,"partner":50,"monitor":30}'::jsonb
)
ON CONFLICT (org_id, agent_id) DO UPDATE SET
  keywords            = EXCLUDED.keywords,
  naics_codes         = EXCLUDED.naics_codes,
  agencies            = EXCLUDED.agencies,
  exclude_set_asides  = EXCLUDED.exclude_set_asides,
  min_days_to_deadline = EXCLUDED.min_days_to_deadline,
  max_days_to_deadline = EXCLUDED.max_days_to_deadline,
  weights             = EXCLUDED.weights,
  thresholds          = EXCLUDED.thresholds,
  updated_at          = now();

COMMIT;
