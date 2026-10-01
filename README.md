# Patched

**Get patched. Get paid.**

Creators sell ad space on things people look at: their outfit at an event, their car for a few weeks, or their team's hoodie at a hackathon. They upload a photo, AI turns it into a clean canvas, and they mark **patches** (logo spots) on it. Brands **bid in USDC** for each patch in its own live auction. The money waits in an on-chain escrow on **Arc**, Circle's stablecoin chain, and is paid to the creator step by step, only after they post proof that they showed up. Everything is in USDC, gas included.

- Product spec: [docs/SPEC.md](docs/SPEC.md)
- Contracts: [docs/contracts.md](docs/contracts.md)
- Design system: [docs/design-system.md](docs/design-system.md)
- Data model: [docs/data-model.md](docs/data-model.md)
- Agent guide: [AGENTS.md](AGENTS.md)
- Arc and Circle plan: [docs/arc-plan.md](docs/arc-plan.md)

## Surfaces

| Surface | What | Proof |
|---|---|---|
| Outfit | A person at an event (for example Token2049) | Print photo, venue photos, an X post |
| Vehicle | A car, van or bus for 1 to 3 event days, parked at the venue or looping it | Dated, located photos each day, an X post |
| Team hoodie | A team at a hackathon, paid out across the team | Team check-in, stage or demo photos, an X post |
| Your own idea | Anything people will see at the event: a laptop lid on stage, a booth wall, a board | Photos with the logo in view, an X post |

## Features

### For creators

- **AI canvas.** Upload a photo and AI turns the outfit, car or hoodie into a clean white canvas, with the background removed.
- **AI outfit looks.** AI suggests outfit styles from your photo and generates front and back model shots in the style you pick.
- **AI car views.** Upload one photo of your car and AI generates the other sides (front, left, right, back, roof), so brands can bid on every panel.
- **AI spot suggestions.** AI proposes where the patches should go. You can drag, resize and rename every spot yourself.
- **Your terms.** For each spot, set a starting price, a buy-now price and a tier (mini, prime or mega). Pick the event.
- **Your deal.** Choose how you get paid: part before the event for printing (10% to 50%), all after, per event day, or a custom split of up to 4 steps. A live payout bar shows the split and the proof date of each step. Pick what every brand gets (photos, parked hours, route check-ins, an X post); brands see it before they bid.
- **Stake.** You lock a small bond when you publish. It comes back when you deliver.
- **Editable sponsor page.** Edit your listing page in place: headline, intro, perks per spot, section titles, accent colour, and which sections are shown. The FAQ is editable too.
- **Share kit.** A poster maker with templates, a QR code and downloadable images. Every listing also gets its own link preview image for X and chats.
- **Creator studio.** Close bidding, see the winners, upload proof for each milestone and release your payments.
- **One profile.** `/<handle>` shows your listings, the spots you sponsor and your record. As the owner you also get your Earnings (what needs doing, payouts) and Bids tabs there, so there's no separate dashboard to find.

### For brands

- **One-tap bidding.** Tap a spot on the photo and a bubble shows the price, who leads and the last few bids. One button bids the minimum to take the lead. Quick chips add +$5, +$10 or buy it now.
- **Full bid sheet.** Enter a custom amount or buy the spot outright.
- **Auto-bid.** "Keep me on top up to $X." When you're outbid, Patched bids the next step for you within seconds, and never above your maximum. It shows "Paused" and tells you what to fix if your wallet runs out of USDC or of spending permission.
- **Sweep.** Pick several spots and bid on all of them with one signature. Either every bid lands or none do.
- **Instant refunds.** When you're outbid, your USDC comes straight back in the same transaction.
- **One-tap rebid.** The outbid toast has a "Bid $X" button that bids the new minimum in one tap.
- **Verified brand badge.** Link your work email. If its domain matches your website, your bids and patches show "Verified brand".
- **Brand profile.** Your brand name and logo appear on the patches you lead.
- **Campaigns.** "Spend up to $300 at Token2049, never more than $40 a spot, until the event ends." A campaign wallet bids across the event for you, cheapest spots first (or prime spots only), and returns what's left at the end. Its rules are a Privy policy you can read in plain words or as JSON, and Privy itself keeps the running total within the budget.
- **Patch anyone on X.** Offer money to any X account for a spot at an event, even if they've never used Patched. Privy creates their account and wallet on the spot; the offer waits in its own policy-limited wallet, can pay their listing stake if their wallet is empty, and buys their spot when they list. Share the offer on X in one tap.
- **Bids tab.** Spots you lead, spots where you were outbid, your receipts, and resale, on your profile.

### Live auctions

- Every spot is its own auction, with a starting price, a buy-now price and a minimum step of +5% (at least +$5).
- **Anti-snipe:** a bid in the last 5 minutes adds 5 minutes to the whole listing, and everyone on the page is told.
- Live updates within about 2 seconds: prices, leaders and patches move on screen as bids land.
- "N watching now" through Supabase Realtime presence.
- **Bidding war** labels when brands trade the lead, plus recent activity on each spot.
- A live activity feed on every listing, and a live ticker on the landing page.

### Escrow and trust

- **Paid only on proof.** Money is released in milestones (for example 40% after the print proof and 60% after the show-up proof), each only after proof is posted.
- **72-hour disputes.** Each patch holder can dispute a proof for their own patch within 72 hours. An admin settles it, and can split the payment between creator and brand.
- **No-shows are refunded.** If a creator misses a proof deadline, the unpaid escrow and the creator's stake go to the patch holders.
- **Creator record.** On-chain delivered and missed counts plus total earned, shown on every listing next to the stake and the payout plan.
- **Safe onboarding.** New creators have a spending cap until their first delivery, and listings are approved by an admin before bidding opens.
- **Receipt NFTs.** Winning a spot mints a receipt NFT whose image is drawn on-chain as SVG. The receipt *is* the spot: its holder gets refunds and dispute rights.
- **Resale.** A receipt can be listed, bought or delisted on Patched, with a 5% royalty to the creator. Receipts can't move outside the market, so the royalty always applies.
- **Fallback payouts.** If a payment to a wallet ever fails, the money waits in the contract and the owner withdraws it. The market can be paused in an emergency.

### Discovery and social

- **Home feed.** Signed in, `/` is a feed of new listings, bids ("Kite took Chest on Dhruv · $120", with Outbid) and proofs, with upcoming events, what's ending soon and search alongside.
- **Explore board.** Live listings with search, surface filters, bid counts and a live activity feed.
- **Events.** `/events` lists every event with its cover. `/e/<slug>` has the cover, venue and links, who's going, leaderboards (most sponsored, brand on the most spots, biggest bidding war), every spot and a live wall of bids. Admins edit the cover and details.
- **Notifications.** A live bell and a full `/notifications` page for outbid, new bid, auto-bid placed or paused, won, listing live or rejected, bidding closed, proof posted, dispute opened, payment made, no-show refund and resale sold.

### Getting around

- **An app shell like X.** A slim sidebar (Home, Events, Explore, Activity, Profile and Create) that never reloads. Your name and dollar balance sit at the bottom; tapping it opens the wallet: Add money, My bids, Campaigns, Earnings, Settings, theme, network and sign out.
- **Phone navigation:** bottom tabs (Home, Events, Create, Activity, Profile) and your avatar at the top for the wallet.
- **A creator's page stands alone.** A listing page is the creator's own site with only a small "Made with Patched" mark, so sharing it on X feels like sharing a site they built.
- **Welcome.** New visitors sign in on a page that plays the whole story (sign in, draw spots, brands bid, show up, get paid) across outfits, vehicles and team hoodies, then pick a name, a handle (checked live) and whether they sell spots, sponsor or both.
- **Settings** (`/settings`): profile, brand (name, logo, website, verified badge), security (passkey, wallet export) and network, in one place.
- **Listing tools:** a creator's listing page, Manage screen and Share kit are tabs of one bar.
- **Testnet and mainnet:** each runs as its own site from the same code. A switch in the wallet panel and Settings moves between them and keeps you on the same page where it exists.

### Admin

- Approve or reject listings. A rejected listing returns the creator's stake.
- Review proofs, fast-track milestones and settle disputes.
- Create events, and give each one a cover, venue, city, description and links.

### Behind the scenes

- **Keeper.** A server wallet closes auctions when they end, releases payments after the review window, marks no-shows and runs auto-bids. It also runs campaigns. Every send carries an idempotency key, so a retry never acts twice.
- **Indexer.** Syncs every contract event into Supabase: bids, patches, receipts, payouts and notifications. It's rate-limited when called from the app.
- **Server-side AI.** All AI runs on the server through OpenRouter, with the cheapest model that does each job.
- **Themes and motion.** Light and dark themes. Every animation respects reduced-motion settings.
- **USDC only.** No banks or fiat anywhere: wallets hold USDC, and on Arc gas is paid in USDC too, so nobody needs a second token.

## How Patched uses Arc

Arc is Circle's L1 for stablecoin finance. Patched is a USDC-native marketplace, so it fits: brands only ever hold dollars.

| | What it does in Patched | Status |
|---|---|---|
| **USDC as gas** | Brands and creators hold one token. Bids, escrow, payouts and gas are all USDC, from the same balance. | Live on Arc testnet |
| **Fast finality** | A bid is final in under a second, so live auctions, outbid refunds and the anti-snipe clock feel instant. | Live on Arc testnet |
| **Upgradeable market** | `PatchedMarket` runs behind a UUPS proxy (sized under Arc's 24 KB contract limit), so fixes keep the same address and escrowed money. | Live on Arc testnet |
| **Wallets by Privy** | Sign in with X or email; Privy makes the wallet. Arc is a supported chain for Privy wallets. | Working |
| **One-tap bids (Arc `Multicall3From`)** | Arc's predeployed `Multicall3From` runs each call as the sending wallet (its CallFrom precompile keeps the brand as `msg.sender`), so approve + bid is one transaction, and a sweep is approve + every bid in one transaction with no permit. | Working on Arc testnet: a bid from the app went out as one transaction ([tx](https://explorer.testnet.arc.io/tx/0xc544545f4941d5593c1b769267160ea7c3462dbb07e761723b8cfefb4d07b9cb)) |
| **Auto-bid from the brand's own wallet (Privy signers)** | "Keep me on top up to $X" adds our key quorum to the brand's Privy wallet as a signer, limited by a Privy policy: `bid` on the chosen spots only, never above the maximum, and `approve` of the market up to the largest maximum. When the brand is outbid, the keeper bids from their wallet within seconds, and the wallet pays that gas in USDC. One-tap revoke in Settings. Outside wallets (MetaMask) use the `PatchAutoBidder` contract instead. | Working on Arc testnet: outbid at $1, the brand's wallet bid $2 fifteen seconds later ([tx](https://explorer.testnet.arc.io/tx/0x3e400f0f7666b9e0aa6b5b486a270a561009eaf82e6789469745a4d848843d5b)) |
| **Patch anyone on X** | A brand offers money to any X account for a spot at an event, even someone who has never used Patched: Privy creates their account and wallet ahead of time, and when they sign in with X the offer and wallet are already theirs. | Built, on Arc testnet |
| **Profiles from X** | A creator's name, picture and follower count come from their X account, so brands see real reach. | Built |
| **Campaign budgets (Privy aggregation)** | Each campaign's spend is tracked by a Privy aggregation and checked before every bid; the campaign wallet only ever holds the budget, and pays its gas in USDC. | Built |
| **Open admin (demo)** | Anyone signed in can approve listings and settle disputes during judging, through a Privy wallet whose policy allows only those calls. | Built; switch off after judging |
| **Campaign rules on-chain** | A `PatchCampaign` contract holds a brand's budget and enforces the brand as bidder, a per-spot maximum, an end time and the total. Anyone can read the rules. | To build |
| **Arc mainnet** | The same contracts on chain 5042 with Arc's USDC. | After testnet |

Gas: Privy doesn't sponsor gas on Arc, so every wallet pays its own gas in USDC. On Arc that's the same dollars a brand bids with, so nobody needs a second token.

## Contracts

| Contract | What it does |
|---|---|
| `PatchedMarket` | Listings, per-patch auctions with anti-snipe, permit bids, escrow, milestones, proofs, disputes, no-show refunds, creator stakes and records, events, resale with royalties |
| `PatchReceipt` | The receipt NFT for each won patch, with its image drawn on-chain and ERC-2981 royalties. It only moves through the market. |
| `PatchAutoBidder` | Holds each brand's auto-bid maximum and bids for them. It never goes above the maximum. |
| `PatchSweeper` | Bids on several patches in one transaction, all or nothing |
| `TestUSD` | A USDC-style test token with permit and a daily faucet, for the mainnet test run |

Deployments on Arc testnet (5042002) and Arc mainnet (5042) are listed in [docs/contracts.md](docs/contracts.md) once they're live. `PatchedMarket` runs behind an upgradeable (UUPS) proxy, so its address and data stay put across upgrades.

## Tech stack

- **Contracts:** Solidity 0.8.28, Foundry, OpenZeppelin v5.4, with unit, fuzz and invariant tests.
- **Web:** Next.js (App Router), React 19, Tailwind CSS v4, Motion, NumberFlow, Three.js, viem, Circle wallets.
- **Data:** Supabase (Postgres, Storage, Realtime), with our own indexer in `packages/indexer`.
- **AI:** OpenRouter, through `packages/ai`.
- **Chain:** Arc testnet (5042002) and Arc mainnet (5042). USDC at `0x3600000000000000000000000000000000000000` on both. Chain values live in config.

```
Patched/
├─ contracts/         Foundry contracts and tests
├─ packages/shared/   ABIs, types, chain config and addresses
├─ packages/ai/       OpenRouter client and prompts
├─ packages/indexer/  Chain events → Supabase
├─ apps/web/          Next.js app
└─ supabase/          Database migrations
```

## Testing the UI

`pnpm --filter web test:ui` runs Playwright against the dev server (start it first with `pnpm web:dev`), in the
Chrome installed on the machine, on a laptop size and a phone size:

- **Every page** ([pages.spec.ts](apps/web/e2e/pages.spec.ts)): it loads, nothing scrolls sideways, no broken
  images, every button and link has a name, and nothing crashes or logs an error. Every internal link on the main
  pages opens. Each page is also saved as a screenshot in `apps/web/e2e/screens/` for a visual review.
- **What people click** ([flows.spec.ts](apps/web/e2e/flows.spec.ts)): sign-in, the app's navigation, the Studio
  deal, the campaign builder, a listing, an event, Explore search and profile tabs.
- **Signed in** ([signed-in.spec.ts](apps/web/e2e/signed-in.spec.ts)): runs when `E2E_TEST_EMAIL` and
  `E2E_TEST_CODE` hold a test account.

The report is in `apps/web/e2e/report/` (`npx playwright show-report e2e/report` from `apps/web`).

## Setup

```bash
pnpm install
pnpm contracts:setup
pnpm contracts:test
cp .env.example .env.local   # then fill in the values
pnpm web:dev                 # the app on Arc testnet
pnpm web:dev:mainnet         # the app on Arc mainnet, http://localhost:3200
```
