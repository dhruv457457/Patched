import { encodeFunctionData, erc20Abi, parseAbi } from "viem";
import { patchedMarketAbi } from "@patched/shared";
import { MARKET, MULTICALL_FROM, USDC } from "@/lib/config";

/**
 * One-tap bids on Arc. Arc's predeployed Multicall3From runs each call as the wallet that sent the transaction (Arc's
 * CallFrom precompile keeps it as msg.sender), so approve + bid, or approve + several bids, fit in one transaction and
 * the market still sees the brand as the bidder. The wallet must send it directly, which Privy and outside wallets do.
 */
export const multicallFromAbi = parseAbi([
  "struct Call3 { address target; bool allowFailure; bytes callData; }",
  "struct Result { bool success; bytes returnData; }",
  "function aggregate3(Call3[] calls) returns (Result[])",
]);

/** Approve the market for `approve` (skipped when 0n), then place every bid, all in one transaction. */
export function batchedBids(approve: bigint, bids: { listingId: number; patchId: number; amount: bigint }[]) {
  if (!MULTICALL_FROM) throw new Error("no Multicall3From on this chain");
  const calls = [
    ...(approve > 0n ? [{ target: USDC, allowFailure: false, callData: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [MARKET, approve] }) }] : []),
    ...bids.map((b) => ({
      target: MARKET,
      allowFailure: false,
      callData: encodeFunctionData({ abi: patchedMarketAbi, functionName: "bid", args: [BigInt(b.listingId), b.patchId, b.amount] }),
    })),
  ];
  return { to: MULTICALL_FROM, calls, data: encodeFunctionData({ abi: multicallFromAbi, functionName: "aggregate3", args: [calls] }) };
}
