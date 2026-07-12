-- 0005_pg_cron.sql
-- Recurring jobs that call the deployed edge functions.
-- Requires extensions pg_cron and pg_net (enable in the Supabase dashboard
-- under Database > Extensions before running this migration).
--
-- The publishable apikey below is safe to commit (it is the same anon key
-- shipped to the browser bundle) - it is NOT the service role key.
-- To rotate later: replace 'sb_publishable_...' in each command.

BEGIN;

-- Guard: unschedule any pre-existing jobs with the same name before recreating.
SELECT cron.unschedule('gaios-sync-grants-gov') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'gaios-sync-grants-gov'
);
SELECT cron.unschedule('gaios-sync-sam-gov')    WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'gaios-sync-sam-gov'
);
SELECT cron.unschedule('gaios-score-opps')      WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'gaios-score-opps'
);
SELECT cron.unschedule('gaios-hydrate-backfill') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'gaios-hydrate-backfill'
);

-- Grants.gov ingest every 6h at :05
SELECT cron.schedule(
  'gaios-sync-grants-gov',
  '5 */6 * * *',
  $$ SELECT net.http_post(
       url:='https://mxixvyvigajojyrabpfe.supabase.co/functions/v1/sync-grants-gov',
       headers:=jsonb_build_object('content-type','application/json','apikey','sb_publishable_ZdCynKWNXtE0xA7GMwY0kA_xyKV9AY_'),
       body:='{}'::jsonb
     ) $$
);

-- SAM.gov ingest every 6h at :15 (function skips cleanly if SAM_GOV_API_KEY unset)
SELECT cron.schedule(
  'gaios-sync-sam-gov',
  '15 */6 * * *',
  $$ SELECT net.http_post(
       url:='https://mxixvyvigajojyrabpfe.supabase.co/functions/v1/sync-sam-gov',
       headers:=jsonb_build_object('content-type','application/json','apikey','sb_publishable_ZdCynKWNXtE0xA7GMwY0kA_xyKV9AY_'),
       body:='{}'::jsonb
     ) $$
);

-- Score every hour at :30 (skips already-scored rows via scorer_version)
SELECT cron.schedule(
  'gaios-score-opps',
  '30 * * * *',
  $$ SELECT net.http_post(
       url:='https://mxixvyvigajojyrabpfe.supabase.co/functions/v1/score-opportunities',
       headers:=jsonb_build_object('content-type','application/json','apikey','sb_publishable_ZdCynKWNXtE0xA7GMwY0kA_xyKV9AY_'),
       body:='{}'::jsonb
     ) $$
);

-- Nightly hydrate backfill for any rows still missing descriptions
SELECT cron.schedule(
  'gaios-hydrate-backfill',
  '45 3 * * *',
  $$ SELECT net.http_post(
       url:='https://mxixvyvigajojyrabpfe.supabase.co/functions/v1/hydrate-grants-gov-details',
       headers:=jsonb_build_object('content-type','application/json','apikey','sb_publishable_ZdCynKWNXtE0xA7GMwY0kA_xyKV9AY_'),
       body:='{"limit":300}'::jsonb
     ) $$
);

COMMIT;
