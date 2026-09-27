-- Named brand_campaigns: this database already has an unrelated "campaigns" table.
-- Brand campaigns: a budget that spreads bids across an event. Each campaign has its own Privy server wallet whose
-- policy only lets it bid for this brand on our market (up to the per-spot maximum, until the end time), approve
-- the market, and send what's left back to the brand. Rows are written by the API and the keeper (service role).
create table if not exists public.brand_campaigns (
  id              uuid primary key default gen_random_uuid(),
  chain_id        int not null,
  brand           text not null,                 -- lowercase wallet that gets the receipts and refunds
  privy_did       text not null,
  event_id        int not null,
  budget          bigint not null,               -- USDC (6 decimals) the brand said it would put in
  max_per_spot    bigint not null,
  goal            text not null default 'most',  -- most | prime
  ends_at         timestamptz not null,
  wallet_id       text not null,
  wallet_address  text not null,
  policy_id       text not null,
  status          text not null default 'funding', -- funding | active | paused | ending | ended
  created_at      timestamptz not null default now()
);
create index if not exists brand_campaigns_brand on public.brand_campaigns (chain_id, brand, created_at desc);
create index if not exists brand_campaigns_status on public.brand_campaigns (chain_id, status);

-- What the campaign did, in plain words, for its page (bids, skips, Privy refusals, the end).
create table if not exists public.brand_campaign_actions (
  id           bigserial primary key,
  campaign_id  uuid not null references public.brand_campaigns on delete cascade,
  kind         text not null,                    -- funded | bid | skip | blocked | returned | ended
  text         text not null,
  amount       bigint,
  listing_id   bigint,
  patch_id     smallint,
  tx_hash      text,
  created_at   timestamptz not null default now()
);
create index if not exists brand_campaign_actions_campaign on public.brand_campaign_actions (campaign_id, created_at desc);

alter table public.brand_campaigns        enable row level security;
alter table public.brand_campaign_actions enable row level security;
-- Like bids, campaigns describe public on-chain activity, so reads are public; writes are service role only.
create policy "public read" on public.brand_campaigns        for select using (true);
create policy "public read" on public.brand_campaign_actions for select using (true);
alter publication supabase_realtime add table public.brand_campaign_actions;
