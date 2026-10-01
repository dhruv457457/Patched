# Arc Microgrants: plan for the Patched mirror (Arc mainnet + Circle, no Monad, no Privy)

Researched 2026-09-29. This is for the **separate mirrored repo** (see AGENTS.md: "a mirrored repo for Arc (Circle) Microgrants on Arc mainnet").

> **Decision, Oct 1 2026: stay on Privy.** Circle wallets on Arc mainnet need a paid Circle Console upgrade, so the
> Arc build keeps Privy for sign-in and wallets (Arc is a supported chain for Privy). Privy has no gas sponsorship on
> Arc, so wallets pay their own gas in USDC. The Circle wallet sections below are kept for reference only.
> We build and test on Arc testnet, then deploy to Arc mainnet.

## The grant in one paragraph

- **Prize:** 20 microgrants of 500 USDC each.
- **Deadline:** submissions close **Oct 14 2026, 23:59 ET (Oct 15, 09:29 IST)**, one day after Metropolis. Reviews are **rolling**, so an earlier submission gets an earlier answer.
- **Needed:** a **live deployment on Arc mainnet** (a link judges can open), a **public repo**, a short description of what it does and **what it uses Arc for**, and a public builder profile (GitHub, X or Farcaster).
- **Not eligible:** testnet-only builds, mockups, decks, projects with no Arc component, and work already funded by Circle or Arc.
- **Judged on:** relevance to Arc, technical credibility, build quality, and whether it's worth taking further. "Promise counts for more than traction."

## Arc facts we need

| | Value |
|---|---|
| Mainnet chain id | `5042` (testnet `5042002`) |
| RPC | `https://rpc.mainnet.arc.io`; also QuickNode `https://rpc.quicknode.mainnet.arc.io` (we already use QuickNode), Alchemy, dRPC, Blockdaemon |
| Explorer | `https://explorer.arc.io` |
| USDC | `0x3600000000000000000000000000000000000000` (the same address on testnet) |
| Gas | **Paid in USDC.** There's no separate gas token. |
| CCTP (domain 26) | TokenMessengerV2 `0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d`, MessageTransmitterV2 `0x81D40F21F12A8F0E3252Bccb954D722d4c464B64` |
| Gateway | GatewayWallet `0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE`, GatewayMinter `0x2222222d7164433c4C09B0b0D809a9b52C04C205` |
| Permit2 | `0x000000000022D473030F116dDEE9F6B43aC78BA3` |
| EURC | `0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1` |

**USDC gotchas on Arc (these will break things if ignored):**

1. **One balance, two decimal systems.** The ERC-20 interface uses **6 decimals**; the native gas balance uses **18 decimals**. It's the same money.
   - Our contracts only use `transferFrom` / `approve` (6 decimals), so they're fine.
   - Never mix `msg.value` or `eth_getBalance` (18 decimals) into amounts.
2. **Gas comes out of the same USDC balance.** A brand bidding "everything I have" will fail unless gas is sponsored or we keep a small reserve. The UI's max-bid must subtract a gas buffer when gas isn't sponsored.
3. **The permit domain is different.** On Arc, `name()` is `"USDC"` and `version()` is `"2"` (Ethereum mainnet uses "USD Coin"). Our `useBid` reads `name()` / `version()` from the contract, so it should work. **Test one real `bidWithPermit` on Arc before relying on it.**

## Privy → Circle: feature-by-feature

What we use today (from the Monad app's README table) and the Circle equivalent on Arc:

| # | What Patched uses (Privy) | Circle on Arc | Status |
|---|---|---|---|
| 1 | Sign-in with **X** and email, in our own design (headless hooks) | User-controlled wallets: **Google, Apple, Facebook, email OTP, PIN**. **No X.** Modular wallets: **passkeys only.** | **Gap.** We need our own login (see "Login" below) |
| 2 | Embedded wallet created at login | **Modular wallets** (passkey smart account, `ARC` mainnet supported), or **user-controlled wallets** (EOA/SCA) | Yes |
| 3 | Gas sponsorship | **Gas Station / Circle Paymaster** (`paymaster: true` on modular-wallet user operations; SCA wallets for developer wallets). Circle charges gas + 5%. | Yes. **Confirm Gas Station is enabled for `ARC` mainnet in Circle Console.** |
| 4 | **Silent** permit signing (one tap, no pop-up) | User-controlled wallets **always show Circle's confirmation UI** (challenge + PIN or confirm). Modular wallets prompt a **passkey** per operation. | **Changed.** Not silent, but modular wallets can **batch approve + bid in one user operation**, so it's still one confirmation |
| 5 | Keeper server wallet + **policy engine** (only `closeBidding` / `release` / `markFailed`) | **Developer-controlled wallets** (entity secret, `createContractExecutionTransaction`). **No policy engine.** | **Gap.** The allowlist moves into our code, and ideally a role check in the contracts |
| 6 | Idempotency keys | **Built in:** every mutating Circle request *requires* an `idempotencyKey` (UUID) | Yes, stronger |
| 7 | **Campaign wallets whose policy checks `bidFor.bidder`, `bidFor.amount`, and an end time** | Developer-controlled wallets have no calldata rules | **Gap.** Build the **`PatchCampaign` contract** from SPEC-v2 (budget, per-spot max, end time, bidder = brand), and have the campaign wallet only call it |
| 8 | Auto-bid (`PatchAutoBidder` + keeper) | Same contract; keeper runs on a developer-controlled wallet | Yes |
| 9 | Sweep (`PatchSweeper`) | Same contract, or a native **batched user operation** in modular wallets | Yes (batching makes it simpler) |
| 10 | Passkey step-up for large bids | Modular wallets **are** passkeys; every operation is passkey-confirmed | Yes (built in) |
| 11 | Linked accounts: verified brand by work email | No account linking | **Gap.** Our own email-code check (Resend or Supabase Auth OTP) |
| 12 | Wallet export | User-controlled: **no key export** (MPC). Modular: a passkey-owned smart account, recoverable through the Circle recovery flow, but no raw key export | **Gap.** Drop it and explain in the README |
| 13 | Server-side auth (Privy access token + linked accounts) | Circle isn't an identity provider | **Gap.** Our own sessions |
| 14 | Polling `transactions().get` | **Webhooks** for transaction states (`X-Circle-Signature`), included | Yes, better (Privy webhooks needed Enterprise) |
| 15 | "How we use Privy" README table | Becomes "How Patched uses Arc + Circle" | Rewrite |

**Summary:**
- **7 of 15 map directly** (some better): wallets, gas, idempotency, auto-bid, sweep, passkeys, webhooks.
- **8 need replacing or dropping:** X login, branded headless login, silent signing, the policy engine (keeper + campaigns), linked-account verification, wallet export, server auth, and the README.

## What Arc + Circle give us that Privy + Monad didn't

- **USDC is gas.** A brand only ever holds dollars. "No second token" is Arc's core pitch and it fits Patched perfectly.
- **CCTP / Gateway funding.** Brands bring USDC from Base, Ethereum, etc. natively. This fixes the "no way to fund on Monad" gap without banks or fiat. Circle's Bridge Kit or App Kits cover the UI.
- **Webhooks included**, plus required idempotency.
- **Batched, sponsored user operations** (approve + bid in one passkey confirmation).
- **Optional Arc-native extra: EURC.** Brands could bid in EURC with Arc's on-chain FX. Only if time allows.

## Recommended architecture for the mirror

**Login (the biggest change):**
- Use our own auth: **Supabase Auth with X (Twitter) OAuth + email magic link**. Supabase is already in the stack.
- It gives the creator's X handle (our identity and page URL) and verified emails (for brand verification), and issues the session our API routes check. This replaces `lib/server/auth.ts`.
- After login, create or load the user's **Circle modular wallet** (passkey) and store the address on the profile.

**User wallets: Circle Modular Wallets** (`@circle-fin/modular-wallets-core` + viem).
- Passkey smart account, gas via `paymaster: true`, batched calls.
- **Bid:** `[approve(market, amount), bid(listing, patch, amount)]` in one sponsored user operation. This replaces the permit flow, though `bidWithPermit` stays as a fallback.
- **Sweep:** the same approach with several `bid` calls.
- If the passkey setup blocks anyone during testing, fall back to user-controlled wallets with email OTP.

**Server wallets: Circle developer-controlled wallets** (`@circle-fin/developer-controlled-wallets`).
- Keeper: `closeBidding`, `release`, `markFailed`, auto-bid `execute`.
- Uses `createContractExecutionTransaction` with named function signatures and the required idempotency key.
- Transaction states come from **Circle webhooks** instead of polling.
- **Allowlist in code**, plus contract-side checks. The contracts are already permissionless for these calls; that's fine.

**Campaigns:** a new **`PatchCampaign`** contract (the SPEC-v2 fallback).
- Holds the brand's budget and enforces `bidder == brand`, `amount <= maxPerSpot`, `block.timestamp <= endsAt`, and the total ≤ budget.
- Leftover budget returns to the brand. The keeper just calls `campaign.bid(...)`.
- This is actually *more* verifiable than a Privy policy, because judges can read the rules on-chain.

**Indexer:**
- **Keep our own indexer** (`services/indexer`) pointed at Arc through QuickNode's Arc RPC. It's the least work, since only the chain config changes.
- Optionally add **Alchemy webhooks** (Arc is supported) or **Envio / Goldsky** later.
- **Circle webhooks** cover our own wallets' transactions.

**Contracts:**
- Redeploy `PatchedMarket`, `PatchReceipt`, `PatchAutoBidder`, `PatchSweeper` (+ `PatchCampaign`) on chain `5042` with USDC `0x3600…0000`.
- Verify them on the Arc explorer.
- Set a sensible `minBond` / `newCreatorCap` in USDC.

**Config:**
- `packages/shared`: add `arcMainnet` (5042) to the chain config and `DEPLOYMENTS[5042]`.
- Remove the Monad chains from the mirror.
- **Keep chain values in config only** (AGENTS.md rule).

## Timeline (grant closes Oct 14 23:59 ET, Metropolis closes Oct 14 09:29 IST)

Monad work comes first, since Metropolis closes earlier. Split the Arc work so an eligible submission exists early:

| When | Arc work | Result |
|---|---|---|
| Day 1 (after Metropolis core is safe) | Create the mirror repo. Fund a deployer with a few USDC on Arc. Deploy and verify the contracts on 5042. Point the indexer at Arc. | **Eligible:** "deployed and working on Arc mainnet" |
| Days 2–3 | Supabase Auth (X + email). Circle modular wallets for users (passkey, sponsored, batched approve+bid). | Users can list and bid gaslessly on Arc |
| Day 4 | Circle developer-controlled wallet keeper + webhooks. `PatchCampaign` contract + campaign flow. | Auctions close and pay out automatically |
| Day 5 | CCTP / Gateway "bring USDC from another chain". README "How Patched uses Arc + Circle". A real listing + bid + payout on Arc mainnet. | Submit (rolling review, so earlier is better) |

**Fast fallback if time runs out:**
- Arc's docs list **Privy as a supported provider on Arc**, so the mirror could ship on Privy first and swap to Circle wallets after.
- The grant doesn't require Circle Wallets, only a working Arc mainnet deployment with a clear Arc use.
- The Circle swap mainly raises "relevance to Arc" and "technical credibility".

## Before starting: set up in Circle Console
- API key + **entity secret** (registered and stored securely; never commit it).
- Modular wallets: **Client Key** + **passkey domain** (our production domain).
- **Gas Station** enabled for `ARC` mainnet, with a spending policy.
- A webhook endpoint (public HTTPS) for transaction notifications.
- Add each new variable to `.env.example` with a comment.

## Open questions to verify during the build
1. Is Gas Station / Paymaster **live on Arc mainnet** for both modular wallets and developer SCA wallets? (The supported-chains table confirms wallets, not Gas Station.)
2. Does a real `bidWithPermit` on Arc succeed with the "USDC" / "2" domain? (Needed only as a fallback.)
3. Are session-key modules for modular wallets available on Arc? If so, auto-bid could run from the brand's own smart account, like Privy signers.

Sources: [Arc connect](https://docs.arc.io/arc/references/connect-to-arc), [Arc contract addresses](https://docs.arc.io/arc/references/contract-addresses), [Arc EVM compatibility](https://docs.arc.io/arc/references/evm-compatibility), [Arc account abstraction providers](https://docs.arc.io/arc/tools/account-abstraction), [Arc data indexers](https://docs.arc.io/arc/tools/data-indexers), [Circle supported blockchains](https://developers.circle.com/wallets/supported-blockchains), [Circle Wallets](https://www.circle.com/wallets), [Circle skills: user-controlled](https://github.com/circlefin/skills/blob/master/plugins/circle/skills/use-user-controlled-wallets/SKILL.md), [modular](https://github.com/circlefin/skills/blob/master/plugins/circle/skills/use-modular-wallets/SKILL.md), [developer-controlled](https://github.com/circlefin/skills/blob/master/plugins/circle/skills/use-developer-controlled-wallets/SKILL.md) wallets, [Arc USDC permit docs PR](https://github.com/circlefin/arc-node/pull/290).
