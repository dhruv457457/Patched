// Which chain and contracts this build talks to. Everything chain-specific comes from here.
import { createPublicClient, fallback, http, type PublicClient } from "viem";
import { arcMainnet, arcTestnet, DEPLOYMENTS, USDC_DECIMALS } from "@patched/shared";

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 5042002) as 5042002 | 5042;
export const CHAIN = CHAIN_ID === 5042 ? arcMainnet : arcTestnet;
/** Arc testnet: demo timing (minute-long auctions and reviews) is allowed here. */
export const IS_TESTNET = CHAIN_ID === 5042002;

const deployment = DEPLOYMENTS[CHAIN_ID];
if (!deployment) throw new Error(`No Patched deployment for chain ${CHAIN_ID}`);
export const DEPLOYMENT = deployment;
export const MARKET = deployment.market;
export const RECEIPT = deployment.receipt;
/** PatchAutoBidder for this market, if deployed. */
export const AUTO_BIDDER = deployment.autoBidder ?? null;
/** PatchSweeper for this market, if deployed. */
export const SWEEPER = deployment.sweeper ?? null;
/** Arc's Multicall3From, if this chain has it: one transaction for approve + bid (see lib/market/batch.ts). */
export const MULTICALL_FROM = deployment.multicallFrom ?? null;
export const USDC = deployment.usdc;
/** The dollar token is the TestUSD faucet token (mainnet test run), not real USDC. */
export const TEST_TOKEN = deployment.testToken === true;
export { USDC_DECIMALS };

/** Whether gas is sponsored for user wallets. Off on Arc (Privy has no Arc sponsorship): every wallet, server wallets included, pays its own gas in USDC. */
export const GAS_SPONSORED = process.env.NEXT_PUBLIC_GAS_SPONSORED !== "false";
/**
 * On Arc, gas comes out of the same USDC a wallet bids with. When gas isn't sponsored, balance checks keep this much
 * (6-decimal USDC, $0.05) aside so a bid of exactly the balance doesn't fail on gas.
 */
export const GAS_RESERVE = GAS_SPONSORED ? 0n : 50_000n;

export const EXPLORER = CHAIN.blockExplorers.default.url;

/**
 * Testnet and mainnet run as two sites from this same code. The navbar's network switch sends people to the
 * other one; set both URLs in production (testnet: https://arc.patched.world). The defaults are local dev servers.
 */
export const NETWORK_SITES: Record<5042002 | 5042, { label: string; url: string }> = {
  5042002: { label: "Testnet", url: process.env.NEXT_PUBLIC_TESTNET_URL ?? "http://localhost:3100" },
  5042: { label: "Mainnet", url: process.env.NEXT_PUBLIC_MAINNET_URL ?? "http://localhost:3200" },
};

/**
 * Browser-side chain reads. In the browser they go through our own /api/rpc (read-only, forwarded to our RPC) first:
 * ad blockers block every *.arc.io request, so Arc's public RPC can't be relied on from a visitor's browser. Arc's
 * public RPC stays as the fallback. Server code uses serverClient() with the private QuickNode URL.
 */
export const publicClient = createPublicClient({
  chain: CHAIN,
  transport: typeof window === "undefined" ? http() : fallback([http(`${window.location.origin}/api/rpc`), http()]),
}) as PublicClient;

export function serverRpcUrl(): string {
  const url = CHAIN_ID === 5042 ? process.env.ARC_RPC_URL : process.env.ARC_TESTNET_RPC_URL;
  if (!url) throw new Error("RPC url missing in .env.local");
  return url;
}

export function serverClient(): PublicClient {
  return createPublicClient({ chain: CHAIN, transport: http(serverRpcUrl()) }) as PublicClient;
}
