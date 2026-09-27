import { CHAIN_ID } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { CampaignBuilder, type BuilderEvent } from "./CampaignBuilder";

export const metadata = { title: "New campaign · Patched" };
export const revalidate = 30;

/** Start a campaign: events that still take bids, with the price of every open spot for the estimate. */
export default async function NewCampaignPage() {
  const db = supabase();
  const now = new Date().toISOString();
  const [{ data: events }, { data: listings }] = await Promise.all([
    db.from("patched_events").select("event_id, name, starts_at, ends_at").eq("chain_id", CHAIN_ID).eq("active", true).gte("ends_at", now).order("starts_at"),
    db.from("listings").select("listing_id, event_id").eq("chain_id", CHAIN_ID).eq("status", 1).gt("bidding_ends_at", now),
  ]);
  const ids = (listings ?? []).map((l) => l.listing_id);
  const { data: patches } = ids.length
    ? await db.from("patches").select("listing_id, floor, top_bid, bought").eq("chain_id", CHAIN_ID).in("listing_id", ids)
    : { data: [] as { listing_id: number; floor: number; top_bid: number; bought: boolean }[] };

  const list: BuilderEvent[] = (events ?? []).map((e) => {
    const mine = new Set((listings ?? []).filter((l) => l.event_id === e.event_id).map((l) => l.listing_id));
    // Roughly what the next bid costs: the floor, or 5% (at least $5) over the top bid.
    const prices = (patches ?? []).filter((p) => mine.has(p.listing_id) && !p.bought).map((p) => {
      const top = Number(p.top_bid) / 1e6;
      return top > 0 ? Math.max(top * 1.05, top + 5) : Number(p.floor) / 1e6;
    });
    return { id: e.event_id, name: e.name, startsAt: new Date(e.starts_at).getTime(), endsAt: new Date(e.ends_at).getTime(), prices };
  });
  return <CampaignBuilder events={list} />;
}
