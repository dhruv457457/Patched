import { CHAIN_ID } from "@/lib/config";
import { formatShortAddress, formatUsdc } from "@/lib/format";
import { fetchListingCards } from "@/lib/market/server";
import { fetchHomeFeed } from "@/lib/market/feed";
import { toWire } from "@/lib/market/types";
import { supabase } from "@/lib/supabase";
import { LandingView, type LandingData, type TickerItem } from "./LandingView";
import { HomeFeed } from "./HomeFeed";
import { HomeGate } from "./HomeGate";

// Landing and the Home feed are cached for 15s and rebuilt in the background; live bids still stream in over Realtime.
export const revalidate = 15;

export default async function LandingPage() {
  const db = supabase();
  // The ticker needs a second lookup after the bids, so run that chain alongside the listings.
  const tickerP = (async (): Promise<TickerItem[]> => {
    const { data: bids } = await db.from("bids").select("listing_id, patch_id, bidder, amount")
      .eq("chain_id", CHAIN_ID).order("block_number", { ascending: false }).limit(16);
    if (!bids?.length) return [];
    const ids = [...new Set(bids.map((b) => b.listing_id))];
    const wallets = [...new Set(bids.map((b) => b.bidder))];
    const [{ data: patches }, { data: brands }] = await Promise.all([
      db.from("patches").select("listing_id, patch_id, label").eq("chain_id", CHAIN_ID).in("listing_id", ids),
      db.from("profiles").select("wallet, brand_name").in("wallet", wallets),
    ]);
    return bids.map((b) => ({
      who: brands?.find((x) => x.wallet === b.bidder)?.brand_name ?? formatShortAddress(b.bidder),
      label: patches?.find((p) => p.listing_id === b.listing_id && p.patch_id === b.patch_id)?.label ?? `Patch ${b.patch_id + 1}`,
      amount: formatUsdc(b.amount / 1e6),
    }));
  })();
  const [live, ticker, { count: bidCount }, feed, { data: brands }] = await Promise.all([
    fetchListingCards({ statuses: [1], limit: 12 }),
    tickerP,
    db.from("bids").select("*", { count: "exact", head: true }).eq("chain_id", CHAIN_ID),
    fetchHomeFeed(),
    // Real sponsors' logos for the hero's 3D patches.
    db.from("profiles").select("brand_logo_url").not("brand_logo_url", "is", null).limit(6),
  ]);

  // The hero's "live now" chip: the open auction ending soonest.
  const now = Date.now();
  const hero = [...live].filter((c) => c.biddingEndsAt > now).sort((x, y) => x.biddingEndsAt - y.biddingEndsAt)[0] ?? null;

  const escrowed = live.reduce((sum, c) => sum + c.topBidsTotal, 0n);

  const data: LandingData = {
    featured: hero && {
      href: hero.href,
      title: hero.title,
      biddingEndsAt: hero.biddingEndsAt,
      topBidsUsd: Number(hero.topBidsTotal) / 1e6,
    },
    stats: {
      liveListings: live.length,
      escrowedUsd: Number(escrowed) / 1e6,
      bids: bidCount ?? 0,
    },
    ticker,
    brandLogos: (brands ?? []).map((b) => b.brand_logo_url as string).filter((u) => /^https:\/\//.test(u)),
  };
  return (
    <HomeGate
      landing={<LandingView {...data} />}
      feed={<HomeFeed cards={toWire(feed.cards)} items={feed.items} events={feed.events} />}
    />
  );
}
