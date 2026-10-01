# Patched — agent guide

Read this file first. It is the shared contract between every AI agent working in this repo (Claude Code, Antigravity, Codex). If something here conflicts with your own assumptions, this file wins. If something here is wrong, say so instead of silently working around it.

## What we are building

**Patched** — "Get patched. Get paid."

Creators sell ad space on things people look at. They upload a photo, AI turns it into a clean white canvas, they draw **patches** (logo spots) on it, and brands **bid in USDC** for each patch. The money sits in an on-chain escrow and is released to the creator in milestones after they prove they showed up.

Only three surfaces exist:

| Surface | Pays | Proof |
|---|---|---|
| Outfit | per event (e.g. Token2049) | print photo + ticket, then venue photos |
| Car | per week (1–8 weeks) | dated photo every week + location check-ins |
| Team hoodie | per hackathon, split across the team | team check-in + stage/demo photos |

Every patch is its **own live auction**: floor price, buy-now price, +5% (min +$5) increments, instant refund when outbid, and anti-snipe (a bid in the last 5 minutes adds 5 minutes to the whole listing).

Winning a patch mints a **PatchReceipt NFT**. The NFT *is* the patch spot: its holder gets refunds and dispute rights, and it can be resold on Patched with a 5% royalty to the creator.

Full product spec: [docs/SPEC.md](docs/SPEC.md). Contract API: [docs/contracts.md](docs/contracts.md). Design system: [docs/design-system.md](docs/design-system.md). Data model: [docs/data-model.md](docs/data-model.md).

## Hackathon context

- **Arc Microgrants (Circle, on DoraHacks)** — submissions close **Oct 14 2026, 23:59 ET**, reviews are rolling. Needs a **live deployment on Arc mainnet**, a public repo, a clear description of what Arc is used for, and a public builder profile. Judged on relevance to Arc, technical credibility, build quality and whether it's worth taking further.
- This repo is the **Arc build** of Patched: Arc mainnet and testnet, Privy wallets, USDC as gas (we build on testnet, then deploy to mainnet). The plan, feature by feature, is [docs/arc-plan.md](docs/arc-plan.md).
- Keep chain-specific values in config (`packages/shared`), never hard-coded.

## Repo layout and ownership

```
Patched/
├─ AGENTS.md            ← this file (CLAUDE.md imports it)
├─ docs/                ← specs; any agent may propose edits, keep them in sync with code
├─ contracts/           ← Foundry. OWNER: Claude
├─ packages/shared/     ← ABIs, TS types, chain config, addresses. OWNER: Claude
├─ packages/ai/         ← OpenRouter client + prompts (canvas, layout, moderation, disputes, copy). OWNER: Claude
├─ apps/web/            ← Next.js app. OWNER: Claude (since 2026-09-23; Antigravity only on explicitly assigned tasks)
└─ supabase/            ← migrations. OWNER: Claude
```

Rules:
- **Stay in your folder.** If you need a change in someone else's folder, write it down in `docs/requests.md` (who, what, why) instead of editing it.
- `packages/shared` is the only bridge between contracts and the web app. The web app imports ABIs, types and addresses from `@patched/shared`, never from `contracts/out`.
- Until contracts are deployed, the web app runs on **mock data** behind the same interfaces (see docs/data-model.md → "Mock mode"). Switching to real data must be a config change, not a rewrite.

## Tech stack

- pnpm workspaces, Node 22, TypeScript strict everywhere.
- Contracts: Solidity 0.8.28, Foundry, OpenZeppelin v5.4.
- Web: Next.js (App Router) + React 19, Tailwind CSS v4, `motion` (motion.dev), `@number-flow/react`, `react-konva`, `sonner`, `lucide-react` icons, `viem`, `@privy-io/react-auth`, Supabase JS (reads + Realtime).
- Chain: Arc testnet (5042002) and mainnet (5042). USDC `0x3600000000000000000000000000000000000000`: 6 decimals through the ERC-20 interface, 18 as the native gas balance (the same money). RPC in `ARC_TESTNET_RPC_URL` / `ARC_RPC_URL`.
- AI: **OpenRouter only**, through `packages/ai` (owned by Claude), using the cheapest model that does each job (models set by env vars). Called only from server routes, never from the browser.

## Conventions

- **No emojis anywhere in the UI or copy.** Use lucide icons.
- USDC amounts are `bigint` with 6 decimals in code; format only at the edge (`formatUsdc`).
- All secrets live in `.env.local` (never committed). Every new variable goes into `.env.example` with a comment.
- No banks or fiat: no card or bank on-ramps, no off-ramps or cash-out to a bank, no KYC/KYB. Wallets hold USDC only.
- Money logic never lives in the frontend. The UI shows what the contract/indexer says.
- Copy is short, active and specific: "Place bid", then a toast "You lead Neckline · $420 locked in escrow".
- Respect `prefers-reduced-motion` in every animation.
- Commit messages: imperative, one topic per commit.

## Commands

```bash
pnpm install                 # workspace deps
pnpm contracts:setup         # install Foundry libs (lib/ is not committed)
pnpm contracts:test          # forge test
pnpm web:dev                  # Next.js dev server (Arc testnet, chain from NEXT_PUBLIC_CHAIN_ID)
pnpm web:dev:mainnet          # same app on Arc mainnet, port 3200
pnpm indexer -- --chain 5042  # sync Arc mainnet events into Supabase
```
