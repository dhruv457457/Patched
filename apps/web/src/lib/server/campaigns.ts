import "server-only";
import { encodeFunctionData, erc20Abi, maxUint256 } from "viem";
import { patchedMarketAbi, type ListingMetadata } from "@patched/shared";
import { CHAIN_ID, MARKET, USDC, serverClient } from "@/lib/config";
import { supabaseAdmin } from "@/lib/supabase";
import { formatUsdc } from "@/lib/format";
import { BID_FOR_ABI, ERC20_SPEND_ABI, campaignRules } from "@/lib/market/campaignPolicy";
import { isPolicyViolation, keyOwner, privyServer, sendFromServerWallet } from "./privy";

export interface CampaignRow {
  id: string;
  chain_id: number;
  brand: string;
  event_id: number;
  budget: number;
  max_per_spot: number;
  goal: "most" | "prime";
  ends_at: string;
  wallet_id: string;
  wallet_address: string;
  policy_id: string;
  status: "funding" | "active" | "paused" | "ending" | "ended";
}

const SPONSORED = process.env.KEEPER_GAS_SPONSORED !== "false";
/** Bids a campaign places per keeper tick, so one tick never spends the whole budget on a single rush. */
const BIDS_PER_TICK = 3;

/**
 * A new campaign: one Privy policy written from the brand's settings, and one Privy server wallet that carries it.
 * Both are owned by our authorization key. The brand funds the wallet next, in one transfer.
 */
export async function createCampaign(input: { brand: string; did: string; eventId: number; budget: bigint; maxPerSpot: bigint; goal: "most" | "prime"; endsAt: number }) {
  const privy = privyServer();
  const owner = keyOwner();
  const rules = campaignRules({ chainId: CHAIN_ID, market: MARKET, usdc: USDC, brand: input.brand, maxPerSpot: input.maxPerSpot, endsAt: input.endsAt });
  const policy = await privy.policies().create({
    version: "1.0",
    // Privy names are short: "Campaign 0xabcd12 e1 c10143".
    name: `Campaign ${input.brand.slice(0, 8)} e${input.eventId} c${CHAIN_ID}`,
    chain_type: "ethereum",
    owner,
    rules,
  });
  const wallet = await privy.wallets().create({
    chain_type: "ethereum",
    display_name: `Campaign ${input.brand.slice(0, 8)}`,
    owner,
    policy_ids: [policy.id],
  });
  const { data, error } = await supabaseAdmin().from("brand_campaigns").insert({
    chain_id: CHAIN_ID,
    brand: input.brand,
    privy_did: input.did,
    event_id: input.eventId,
    budget: input.budget.toString(),
    max_per_spot: input.maxPerSpot.toString(),
    goal: input.goal,
    ends_at: new Date(input.endsAt * 1000).toISOString(),
    wallet_id: wallet.id,
    wallet_address: wallet.address.toLowerCase(),
    policy_id: policy.id,
  }).select("id, wallet_address, policy_id").single();
  if (error) throw error;
  return data;
}

async function log(campaignId: string, row: { kind: string; text: string; amount?: bigint; listing_id?: number; patch_id?: number; tx_hash?: string | null }) {
  await supabaseAdmin().from("brand_campaign_actions").insert({
    campaign_id: campaignId,
    kind: row.kind,
    text: row.text,
    amount: row.amount?.toString() ?? null,
    listing_id: row.listing_id ?? null,
    patch_id: row.patch_id ?? null,
    tx_hash: row.tx_hash ?? null,
  });
}

let running: Promise<void> | null = null;

/**
 * One pass over every running campaign: wait for funding, approve the market once, bid on the best open spots at
 * the event within the rules, and when time is up send what's left back to the brand. Concurrent callers share a run.
 */
export function runCampaigns(): Promise<void> {
  if (!process.env.PRIVY_AUTHORIZATION_PRIVATE_KEY) return Promise.resolve();
  running ??= (async () => {
    const { data } = await supabaseAdmin().from("brand_campaigns").select("*")
      .eq("chain_id", CHAIN_ID).in("status", ["funding", "active", "ending"]).limit(50);
    for (const c of (data ?? []) as CampaignRow[]) {
      try {
        await tick(c);
      } catch (err) {
        console.error("campaign tick failed", c.id, err);
      }
    }
  })().finally(() => {
    running = null;
  });
  return running;
}

async function tick(c: CampaignRow) {
  const client = serverClient();
  const wallet = c.wallet_address as `0x${string}`;
  const brand = c.brand as `0x${string}`;
  const balance = await client.readContract({ address: USDC, abi: erc20Abi, functionName: "balanceOf", args: [wallet] });
  const db = supabaseAdmin();

  if (c.status === "funding") {
    if (balance === 0n) return;
    await db.from("brand_campaigns").update({ status: "active" }).eq("id", c.id);
    await log(c.id, { kind: "funded", text: `Funded with ${formatUsdc(Number(balance) / 1e6)}. Bidding starts now.`, amount: balance });
    c.status = "active";
  }

  // Time's up (or the brand ended it): send the rest back.
  if (c.status === "ending" || Date.now() > new Date(c.ends_at).getTime()) {
    if (balance > 0n) {
      const { hash } = await sendFromServerWallet(c.wallet_id, {
        to: USDC, chainId: CHAIN_ID,
        data: encodeFunctionData({ abi: ERC20_SPEND_ABI, functionName: "transfer", args: [brand, balance] }),
      }, { idempotencyKey: `patched:${CHAIN_ID}:campaign:${c.id}:return:${balance}`, sponsor: SPONSORED, signed: true });
      await log(c.id, { kind: "returned", text: `Sent the unspent ${formatUsdc(Number(balance) / 1e6)} back to your wallet.`, amount: balance, tx_hash: hash });
    }
    await db.from("brand_campaigns").update({ status: "ended" }).eq("id", c.id);
    await log(c.id, { kind: "ended", text: "The campaign ended." });
    return;
  }
  if (c.status !== "active" || balance === 0n) return;

  // The market pulls USDC from the campaign wallet: approve it once, for everything.
  const allowance = await client.readContract({ address: USDC, abi: erc20Abi, functionName: "allowance", args: [wallet, MARKET] });
  if (allowance < balance) {
    await sendFromServerWallet(c.wallet_id, {
      to: USDC, chainId: CHAIN_ID,
      data: encodeFunctionData({ abi: ERC20_SPEND_ABI, functionName: "approve", args: [MARKET, maxUint256] }),
    }, { idempotencyKey: `patched:${CHAIN_ID}:campaign:${c.id}:approve`, sponsor: SPONSORED, signed: true });
  }

  const picks = await pickSpots(c, balance);
  let left = balance;
  for (const p of picks.slice(0, BIDS_PER_TICK)) {
    if (p.amount > left) continue;
    try {
      const { hash } = await sendFromServerWallet(c.wallet_id, {
        to: MARKET, chainId: CHAIN_ID,
        data: encodeFunctionData({ abi: BID_FOR_ABI, functionName: "bidFor", args: [brand, BigInt(p.listingId), p.patchId, p.amount] }),
      }, { idempotencyKey: `patched:${CHAIN_ID}:campaign:${c.id}:${p.listingId}:${p.patchId}:${p.topBid}`, sponsor: SPONSORED, signed: true });
      left -= p.amount;
      await log(c.id, { kind: "bid", text: `Bid ${formatUsdc(Number(p.amount) / 1e6)} on ${p.label} (${p.title}).`, amount: p.amount, listing_id: p.listingId, patch_id: p.patchId, tx_hash: hash });
    } catch (err) {
      if (isPolicyViolation(err)) {
        await log(c.id, { kind: "blocked", text: `Privy blocked a ${formatUsdc(Number(p.amount) / 1e6)} bid on ${p.label}: outside your rules.`, amount: p.amount, listing_id: p.listingId, patch_id: p.patchId });
      } else {
        console.error("campaign bid failed", c.id, err);
      }
    }
  }
}

interface Pick { listingId: number; patchId: number; amount: bigint; topBid: string; label: string; title: string; score: number }

/**
 * Open spots at the campaign's event that the brand doesn't lead yet, priced within the rules. "Most spots" takes the
 * cheapest first; "prime spots" only takes mega and prime spots, the most visible first.
 */
async function pickSpots(c: CampaignRow, balance: bigint): Promise<Pick[]> {
  const db = supabaseAdmin();
  const { data: listings } = await db.from("listing_cards").select("listing_id, creator, metadata")
    .eq("chain_id", CHAIN_ID).eq("event_id", c.event_id).eq("status", 1).gt("bidding_ends_at", new Date().toISOString()).limit(40);
  const live = (listings ?? []).filter((l) => l.creator !== c.brand);
  if (!live.length) return [];
  const { data: patches } = await db.from("patches").select("listing_id, patch_id, label, top_bid, top_bidder, bought")
    .eq("chain_id", CHAIN_ID).in("listing_id", live.map((l) => l.listing_id));
  const open = (patches ?? []).filter((p) => !p.bought && p.top_bidder !== c.brand);
  const client = serverClient();
  const cap = BigInt(c.max_per_spot);

  const picks = await Promise.all(open.map(async (p): Promise<Pick | null> => {
    const meta = live.find((l) => l.listing_id === p.listing_id)?.metadata as ListingMetadata | null;
    const spot = meta?.patches.find((m) => m.id === p.patch_id);
    const tier = spot?.tier ?? "prime";
    if (c.goal === "prime" && tier === "mini") return null;
    const need = await client.readContract({ address: MARKET, abi: patchedMarketAbi, functionName: "minNextBid", args: [BigInt(p.listing_id), p.patch_id] }).catch(() => null);
    if (need === null || need > cap || need > balance) return null;
    return {
      listingId: p.listing_id,
      patchId: p.patch_id,
      amount: need,
      topBid: String(p.top_bid),
      label: spot?.name ?? p.label,
      title: meta?.title ?? `listing #${p.listing_id}`,
      // Cheapest first for reach; for prime, bigger spots first.
      score: c.goal === "prime" ? -(spot ? spot.w * spot.h : 0) : Number(need),
    };
  }));
  return picks.filter((p): p is Pick => p !== null).sort((a, b) => a.score - b.score);
}
