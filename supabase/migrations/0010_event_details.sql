-- V2 event pages: a venue and outside links (website, X), next to the existing slug, city, banner and description.
-- Admins edit these from the admin console; the on-chain event only holds the name and dates.
alter table public.patched_events add column if not exists venue text;
alter table public.patched_events add column if not exists links jsonb not null default '{}'::jsonb;
