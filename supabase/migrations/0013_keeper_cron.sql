-- Production keeper tick: Supabase calls the deployed app's /api/keeper/run every minute (Vercel can't keep a timer
-- running). The URL and KEEPER_SECRET live in Supabase Vault, set by `node scripts/keeper-cron.mjs <site url>`, so no
-- secret is in this file. Until both are set, the tick does nothing.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create or replace function public.tick_keeper() returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  site text;
  secret text;
begin
  select decrypted_secret into site from vault.decrypted_secrets where name = 'patched_keeper_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'patched_keeper_secret';
  if site is null or secret is null then
    return;
  end if;
  perform net.http_post(
    url := rtrim(site, '/') || '/api/keeper/run',
    headers := jsonb_build_object('Authorization', 'Bearer ' || secret, 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
end;
$$;

revoke execute on function public.tick_keeper() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'patched-keeper';
select cron.schedule('patched-keeper', '* * * * *', 'select public.tick_keeper()');
