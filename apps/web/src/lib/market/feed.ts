import "server-only";
import { CHAIN_ID } from "@/lib/config";
import { formatShortAddress } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { fetchListingCards, type ListingCard } from "./server";

/** One moment in the Home feed. Listings are referenced by id; the cards travel alongside. */
export type FeedItem =
  | { kind: "listing"; key: string; time: number; listingId: number }
  | { kind: "bid"; key: string; time: number; listingId: number; patchId: number; wallet: string; who: string; verified: boolean; logo: string | null; amount: number; buyNow: boolean }
  | { kind: "proof"; key: string; time: number; listingId: number; milestone: number; milestoneName: string; files: string[]; note: string | null };

export interface FeedEvent {
  id: number;
  name: string;
  href: string;
  startsAt: number;
  endsAt: number;
  city: string | null;
  banner: string | null;
  going: number;
}

export interface HomeFeedData {
  cards: ListingCard[];
  items: FeedItem[];
  events: FeedEvent[];
}

/**
 * The public Home feed: new listings, bids (the latest per spot) and proofs, newest first, plus upcoming events.
 * Built from the indexed tables only, so it needs no new chain data.
 */
export async function fetchHomeFeed(): Promise<HomeFeedData> {
  const db = supabase();
  const cards = await fetchListingCards({ statuses: [1, 2, 3], limit: 40 });
  const ids = cards.map((c) => c.id);
  const now = Date.now();

  const [{ data: bids }, { data: proofs }, { data: events }] = await Promise.all([
    ids.length
      ? db.from("bids").select("tx_hash, log_index, listing_id, patch_id, bidder, amount, is_buy_now, block_time")
          .eq("chain_id", CHAIN_ID).in("listing_id", ids).order("block_number", { ascending: false }).limit(60)
      : Promise.resolve({ data: [] as { tx_hash: string; log_index: number; listing_id: number; patch_id: number; bidder: string; amount: number; is_buy_now: boolean; block_time: string }[] }),
    ids.length
      ? db.from("proof_files").select("listing_id, milestone, files, note, created_at").eq("chain_id", CHAIN_ID).in("listing_id", ids)
          .order("created_at", { ascending: false }).limit(12)
      : Promise.resolve({ data: [] as { listing_id: number; milestone: number; files: unknown; note: string | null; created_at: string }[] }),
    db.from("patched_events").select("event_id, name, slug, starts_at, ends_at, city, banner_url")
      .eq("chain_id", CHAIN_ID).eq("active", true).gte("ends_at", new Date(now).toISOString()).order("starts_at").limit(6),
  ]);

  const bidders = [...new Set((bids ?? []).map((b) => b.bidder))];
  const { data: brands } = bidders.length
    ? await db.from("profiles").select("wallet, brand_name, brand_logo_url, brand_verified_domain").in("wallet", bidders)
    : { data: [] as { wallet: string; brand_name: string | null; brand_logo_url: string | null; brand_verified_domain: string | null }[] };

  const items: FeedItem[] = cards.map((c) => ({ kind: "listing", key: `l:${c.id}`, time: c.createdAt, listingId: c.id }));

  // A bidding war would flood the feed: keep only the newest bid per spot.
  const seen = new Set<string>();
  for (const b of bids ?? []) {
    const spot = `${b.listing_id}:${b.patch_id}`;
    if (seen.has(spot)) continue;
    seen.add(spot);
    const brand = brands?.find((x) => x.wallet === b.bidder);
    items.push({
      kind: "bid",
      key: `b:${b.tx_hash}:${b.log_index}`,
      time: new Date(b.block_time).getTime(),
      listingId: b.listing_id,
      patchId: b.patch_id,
      wallet: b.bidder,
      who: brand?.brand_name ?? formatShortAddress(b.bidder),
      verified: Boolean(brand?.brand_verified_domain),
      logo: brand?.brand_logo_url ?? null,
      amount: Number(b.amount) / 1e6,
      buyNow: b.is_buy_now,
    });
  }

  for (const p of proofs ?? []) {
    const card = cards.find((c) => c.id === p.listing_id);
    if (!card) continue;
    items.push({
      kind: "proof",
      key: `p:${p.listing_id}:${p.milestone}`,
      time: new Date(p.created_at).getTime(),
      listingId: p.listing_id,
      milestone: p.milestone,
      milestoneName: card.milestoneNames[p.milestone] ?? `Step ${p.milestone + 1}`,
      files: Array.isArray(p.files) ? (p.files as string[]).slice(0, 4) : [],
      note: p.note,
    });
  }

  items.sort((a, b) => b.time - a.time);

  // Creators going = distinct creators with a listing at the event.
  const going = (id: number) => new Set(cards.filter((c) => c.eventId === id).map((c) => c.creator)).size;

  return {
    cards,
    items: items.slice(0, 50),
    events: (events ?? []).map((e) => ({
      id: e.event_id,
      name: e.name,
      href: `/e/${e.slug ?? e.event_id}`,
      startsAt: new Date(e.starts_at).getTime(),
      endsAt: new Date(e.ends_at).getTime(),
      city: e.city,
      banner: e.banner_url,
      going: going(e.event_id),
    })),
  };
}
