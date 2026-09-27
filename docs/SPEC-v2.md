# Patched V2: product spec

Status: agreed direction, 2026-09-27. Clickable prototype of every screen:
https://claude.ai/artifact/7MoYXSet9Dn62tTaosmYDF (private to the project lead; ask for access). V1 is [SPEC.md](SPEC.md); this file replaces its app structure and extends its deals. The
contracts, the brand look (colours, fonts, hard shadows) and the three-surface idea stay.

## 1. What Patched is

**Brands buy real-world attention at events. X is the scoreboard.**

Patched is where brands find the creators, vehicles and teams going to an event, lock a deal for a logo spot, and pay in
USDC from escrow once the logo showed up and the post went out. The attention itself lives on X; Patched makes the
deal safe and shows the proof.

The loop every screen serves:

1. **Find:** a brand discovers who is going to an event.
2. **Lock:** it bids on spots (or lets a campaign bid for it). USDC waits in escrow.
3. **Show up:** the logo is physically at the event.
4. **Prove:** the creator posts on X tagging the brand; that post is the proof.
5. **Get paid:** escrow pays in steps; a reach bonus pays extra if the post hits its target.

## 2. What changes from V1

| Area | V1 | V2 |
|---|---|---|
| Feel | A website: top navbar, dashboards, tables, many cards and buttons | A social app: persistent shell, feed first, one clear action per item |
| Navigation | Top navbar, account dropdown, separate Dashboard and My bids | Left sidebar (desktop) and bottom tabs (phone); dashboards become profile tabs |
| First visit | Straight into pages | Landing page, then sign-in and a 3-step onboarding |
| Events | A list and a plain page | The centre: cover image, about, links, attendees, live wall |
| Car | Paid per week, 1 to 8 weeks | **Vehicle** (car, van or bus) for 1 to 3 event days, parked at or looping the venue |
| Payouts | Fixed 40/60 (events) or weekly (car) | Creator picks a schedule, e.g. 30% upfront for printing |
| Proof | Photos | Photos plus the **X post**, which also drives the reach bonus |
| Brands | Bid spot by spot | Also **campaigns**: a budget that spreads bids across an event |
| Privy policies | Only guard our keeper | Brands set them up: each campaign is a policy-limited Privy wallet |
| Social | None | Follows, feed, spotting, leaderboards, brand pages |

## 3. App structure

### Landing (signed out)
**The current landing page stays.** Its "Get patched" button opens sign-in. Signed-in visitors skip it and land on Home.

### Sign-in (first time only), two steps
1. **Privy's login window, styled as Patched:** our logo, orange accent, "Welcome to Patched", X first, then email,
   then "I have a wallet".
2. **One profile screen:** name and @handle (prefilled from X, checked live) and "I'm here to: sell spots, sponsor,
   or both". Then straight into Home.

### The app shell (laptop first)
- **Laptop and desktop:** centred like X. A slim sidebar (Home, Events, Activity, Profile and a Create pill), the
  feed in the middle, and a quiet right column (search, "Ending soon", your events). No top navbar, no boxed nav
  buttons.
- **Wallet:** your balance shows under your name at the bottom of the sidebar. Tapping it opens a small wallet panel:
  balance, Add money, Send, network, settings, sign out. Crypto words stay out of the main screens: "$62.00", not
  "62 USDC".
- **Phone:** bottom tabs Home, Events, Create, Activity, Profile. The listing page swaps them for its bid bar.
- **Fewer places:** Explore is the search box; campaigns live in Profile and in Create. Four nav items in total.
- The shell never reloads; only the content area changes.

### Routes

| Route | Screen |
|---|---|
| `/` | Landing (signed out) or Home feed (signed in) |
| `/welcome` | Onboarding |
| `/events`, `/e/<slug>` | Events, event page |
| `/<handle>` | Unified profile |
| `/<handle>/<id>` | Listing (a post with a live auction) |
| `/create` | Create a listing |
| `/campaigns/<id>` | A brand campaign (listed in Profile) |
| `/notifications`, `/settings` | As in V1 |

## 4. Screens

### Home feed
One column of moments, newest first, from people and events you follow plus trending ones:
- **New listing:** the photo with its spots, the event, "7 spots from $10", **Bid** and **Follow**.
- **Bid moment:** "Nike took Chest on @dhruv · $120", with **Outbid** as the action.
- **Won, proof and X post:** the creator's post embedded, "Nike on @dhruv at Token2049".
- **Spotted:** an attendee's photo of a patched person or vehicle.
- **Event:** "Token2049 starts in 3 days · 24 creators going".

Every item has at most two actions. Tapping anywhere else opens the item.

### Events and the event page
- An admin creates an event with a **cover image, description, dates, venue, city and links** (website, X, tickets).
- The event page has the cover, about and links, then **Going** (creators, vehicles and teams with listings), then open
  spots, then the event feed. During the event it becomes a **live wall** of posts and spotted photos.
- **Leaderboards per event:** most sponsored fit, brand on the most people, biggest bidding war.

### Listing (a post with a live auction)
Photo with the spots up top, the creator, the event, the deal terms (deliverables, payout schedule, reach bonus), then
the spots. Tapping a spot opens the one-tap bid bubble from V1. Live bids, watchers and bidding wars stay.

### Create
A guided flow: surface → photo (AI canvas) → spots → **deal terms** (event days, deliverables, payout schedule) →
preview → publish.

### Unified profile
One page per person with tabs: **Listings**, **Sponsoring** (spots won as a brand), **Wins**, **Activity**. The owner
sees private stats (earnings, escrow, payouts to claim) on the same page. There's no separate Dashboard or My bids.
Brands get the same page, which shows the logos they've placed and the events they've sponsored.

### Campaigns (brands)
The list of campaigns, then one campaign's page: budget spent, spots held, spots lost, the logo map for the event, and
Pause or Top up.

## 5. Deals

### Surfaces
| Surface | What | Duration | Proof |
|---|---|---|---|
| Outfit | A person at an event | The event | Print photo, venue photos, X post |
| Vehicle | Car, van or bus | **1 to 3 event days**, parked at the venue or looping it | Dated, located photos each day, X post |
| Team hoodie | A hackathon team | The hackathon | Team check-in, stage or demo photo, X post |

In the contracts, Vehicle is the existing `car` surface label, and the vehicle type goes in the listing metadata. No
contract change.

### Payout schedule (creator's choice)
The market already supports up to 8 steps with any split, so this is a Studio change only. The creator picks one:
- **Printing upfront:** 30% after the print proof (before the event), 70% after the event and the X post.
- **All after the event:** 100% after proof. Safest for brands, so it tends to draw higher bids.
- **Per day (vehicles):** equal steps, one per event day.
- **Custom:** up to 4 steps, with the percentage and proof for each.

Brands see the schedule before they bid. Every step still needs proof, has a 72-hour dispute window and goes to an
admin on dispute, as in V1.

### Deliverables
The creator picks what each spot includes from a menu per surface, e.g. "X post tagging the brand", "5 venue photos",
"parked at the entrance for 4 hours", "worn on stage". They show on the listing and become the proof checklist.

### X post as proof
- The last step of every deal is an **X post** with a photo of the patch at the event, tagging the brand and #patched.
- The creator pastes the post link as part of the proof. Patched shows the post inside the deal.
- **Reach bonus:** a brand can add "+$50 if the post reaches 10k views". The bonus sits in its own escrow (see
  `PatchBonus` below) and releases when the number is confirmed.
- **Confirming numbers:** reading view counts needs X's API with the author's own X login. Until that's verified, the
  creator uploads the X analytics screenshot and the brand approves, or it auto-approves after 72 hours. Disputes go
  to an admin.

### Bundles
A creator can offer "all spots for $X" as a one-tap buy next to the per-spot auctions.

## 6. Brand campaigns: a budget that spreads itself

"I have $300 and want my logo everywhere at Token2049."

**The brand sets:** budget, event, goal (most spots, or prime spots only), maximum per spot, and end date.

**How it runs:**
1. Patched creates a **Privy server wallet for the campaign** and the brand funds it with the budget, in one
   signature.
2. The keeper picks spots by value per dollar and bids through the market's existing `bidFor(brand, …)`. The
   campaign wallet pays, but **the receipt NFT and any outbid refund go to the brand's own wallet**.
3. Outbid? The keeper re-bids elsewhere or higher, within the rules. It stops when the wallet is empty or the campaign
   ends.
4. When the campaign ends, what's left goes back to the brand.

**The Privy policy on each campaign wallet** is written from the brand's settings, and Privy refuses anything else:
- calls only the USDC token (approve the market; transfer only to the brand) and the market's `bidFor`;
- `bidFor`'s `bidder` must be the brand, and its `amount` at most the per-spot maximum.
- The total is capped by the wallet only ever holding the budget.

The brand sees this as plain rules ("Only Patched · at most $40 a spot · your wallet gets the receipts"). This is
Privy's policy engine as a feature users configure, not just something that guards our backend.

**Confirmed by research** ([privy-winners-research.md](privy-winners-research.md)): Privy policies can check decoded
calldata (`bidFor.bidder`, `bidFor.amount`), the time (`current_unix_timestamp`) and a running total across
transactions (aggregations). So all four rules are enforced by Privy itself: only `bidFor` for this brand, at most $X
per bid, at most $Y in total, and nothing after the end date. One policy with `{{wallet.address}}` serves every
campaign wallet. No `PatchCampaign` contract is needed.

**Also from the research:**
- **Auto-bid through Privy signers:** "Let Patched bid for me up to $X" adds a signer with a policy
  (`addSigners` with `policyIds`), and Settings has a one-tap Revoke (`removeSigners`). `PatchAutoBidder` stays as the
  fallback.
- **Idempotency keys** on every keeper and campaign send (e.g. `release:<listing>:<milestone>`), so a retry can't pay twice.
- **Test accounts** in the Privy dashboard so judges can sign in.

## 7. Social layer
- **Follow** creators, brands and events; the feed follows your follows.
- **Spotting:** anyone at an event posts "Spotted @dhruv" with a photo. Brands can fund small rewards for spotters.
  The crowd becomes free reach.
- **Brand pages:** logos worn, events sponsored, total reach.
- **Leaderboards** per event (see above).
- Likes and comments: later, only if time allows.

## 8. It must feel fast
- A persistent shell: the sidebar or tabs never reload.
- Data is cached on the client and pages are fetched before you tap, so going back is instant.
- Optimistic actions: a bid appears the moment you tap and is confirmed on-chain a second later.
- Screen transitions (View Transitions) and skeletons shaped like the real content. No blank screens and no spinners
  in the middle of the page.
- Live everywhere: bids, feed and notifications update without refreshing.
- Every action looks like a button, with a visible shape and hover state. Plain text is never clickable.

## 9. Contracts
- **PatchedMarket, PatchReceipt, PatchAutoBidder, PatchSweeper:** unchanged. Payout schedules, vehicles, deliverables
  and X proof all fit the current market.
- **New `PatchBonus`** (additive, no redeploy of the market): a brand deposits a bonus for a spot it holds. The creator
  claims it with proof; it releases on the brand's approval or after 72 hours without dispute; an admin settles
  disputes. Refunded to the brand if the deal fails.
- **`PatchCampaign`:** not needed; Privy policies cover the campaign rules (see section 6).

## 10. Data (Supabase)
- `patched_events`: add `cover_url`, `venue`, `links` (website, X, tickets).
- `follows` (follower, target type, target).
- `campaigns` (brand, event, budget, max per spot, goal, ends, Privy wallet id, policy id, status).
- `spotted` (event, poster, subject, photo, X post link).
- Listing metadata: vehicle type, event days, deliverables, payout preset.
- The feed is built from existing indexed events (listings, bids, receipts, proofs) plus spotted posts. No new chain data.

## 11. Build order (deadline Oct 14)
1. **HTML prototype** of every screen (this spec). About 1–2 days.
2. **Shell, onboarding and the feel-fast work.** About 3 days.
3. **Event-first model:** event pages with cover and links, vehicles for 1–3 days, payout presets, deliverables. About 2 days.
4. **Campaigns** on Privy policy wallets. About 3 days.
5. **X proof and reach bonus** (`PatchBonus`). About 2 days.
6. Spotting, leaderboards and bundles with the time left.

Out of scope: banks and fiat, KYC/KYB, likes and comments (unless time allows), surfaces beyond outfit, vehicle and team hoodie.

## 12. Open questions to check
- X API: can we read a post's view count with the author's X login, and on which paid tier?
- Gas sponsorship on Monad mainnet for campaign wallets.
