"use client";

import { useState } from "react";
import { BaseError, ContractFunctionRevertedError, createWalletClient, custom, encodeFunctionData, erc20Abi } from "viem";
import { CONTRACT_ERRORS, patchedMarketAbi } from "@patched/shared";
import { CHAIN, CHAIN_ID, MARKET, USDC, publicClient, GAS_SPONSORED, TEST_TOKEN, GAS_RESERVE } from "@/lib/config";
import { usePatchedAuth } from "@/components/providers/PrivyAuthProvider";
import { STEP_UP_USD, useStepUp } from "@/lib/market/stepUp";

export type TxStatus = "idle" | "signing" | "confirming" | "done" | "error";

export const permitAbi = [
  { type: "function", name: "nonces", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "version", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
] as const;

/** Turn any wallet / contract error into one sentence a person understands. */
export function friendlyError(err: unknown): string {
  if (err instanceof BaseError) {
    const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName;
      if (name && CONTRACT_ERRORS[name]) return CONTRACT_ERRORS[name];
    }
    if (/user rejected|denied/i.test(err.message)) return "You cancelled the signature.";
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (err instanceof Error && err.name === "PasskeyRequired")
    return `Moves of $${STEP_UP_USD.toLocaleString("en-US")} or more need a passkey. Set one up in your account menu, then try again.`;
  if (/wallet not connected/i.test(msg)) return "Your wallet isn't connected in this browser. Open MetaMask (or your wallet), connect it to Patched, then try again.";
  if (/mfa/i.test(msg)) return "The passkey check didn't go through. Try again.";
  if (/rejected|denied|cancel/i.test(msg)) return "You cancelled the signature.";
  if (/FaucetCooldown/i.test(msg)) return "You already used the faucet today. Try again tomorrow.";
  if (/no gas/i.test(msg))
    return GAS_SPONSORED
      ? "Your wallet needs a little more USDC: on Arc, gas is paid in USDC too."
      : "Your wallet needs a little more USDC: on Arc, gas is paid in USDC too. Add USDC to your wallet address (in the account menu).";
  if (/insufficient/i.test(msg))
    return TEST_TOKEN
      ? "Not enough test USD in your wallet. Get 1,000 free from the faucet on My bids."
      : "Not enough USDC in your wallet for this bid.";
  return "The bid didn't go through. Try again in a moment.";
}

/**
 * Real bid on Arc: approve the market for the amount (only when the allowance is short), then `bid`. That's up to two
 * transactions; gas comes out of the same USDC. The call
 * is simulated first so a stale bid fails fast with a clear reason. Gas on Arc is paid in USDC.
 */
export function useBid() {
  const { walletAddress, wallet, isEmbeddedWallet, authenticated, login, sendTransaction } = usePatchedAuth();
  const stepUp = useStepUp();
  const [status, setStatus] = useState<TxStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<`0x${string}` | null>(null);

  async function bid(listingId: number, patchId: number, amount: bigint): Promise<boolean> {
    if (!authenticated || !walletAddress) {
      login();
      return false;
    }
    setError(null);
    setHash(null);
    try {
      if (!isEmbeddedWallet && !wallet) throw new Error("wallet not connected");
      // Big bids: passkey check through Privy MFA before anything is signed.
      await stepUp.ensure(amount);
      setStatus("signing");
      const [balance, allowance] = await Promise.all([
        publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: "balanceOf", args: [walletAddress] }),
        publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: "allowance", args: [walletAddress, MARKET] }),
      ]);
      if (balance < amount + GAS_RESERVE) throw new Error("insufficient USDC");

      let external: ReturnType<typeof createWalletClient> | null = null;
      if (!isEmbeddedWallet && wallet) {
        await wallet.switchChain(CHAIN_ID);
        external = createWalletClient({ account: walletAddress, chain: CHAIN, transport: custom(await wallet.getEthereumProvider()) });
      }
      const send = async (to: `0x${string}`, data: `0x${string}`) => {
        const txHash = external
          ? await external.sendTransaction({ account: walletAddress, chain: CHAIN, to, data })
          : (await sendTransaction({ to, data, chainId: CHAIN_ID }, { sponsor: GAS_SPONSORED })).hash;
        setHash(txHash);
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        if (receipt.status !== "success") throw new Error("reverted");
      };

      if (allowance < amount) {
        await send(USDC, encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [MARKET, amount] }));
      }

      const args = [BigInt(listingId), patchId, amount] as const;
      // Fail fast with the contract's own reason (e.g. someone just outbid you).
      await publicClient.simulateContract({ address: MARKET, abi: patchedMarketAbi, functionName: "bid", args, account: walletAddress });

      setStatus("confirming");
      await send(MARKET, encodeFunctionData({ abi: patchedMarketAbi, functionName: "bid", args }));

      setStatus("done");
      // Let the indexer pick it up right away instead of waiting for the next scheduled run.
      fetch("/api/indexer/sync", { method: "POST" }).catch(() => {});
      return true;
    } catch (err) {
      setError(friendlyError(err));
      setStatus("error");
      return false;
    }
  }

  return { bid, status, error, hash, reset: () => (setStatus("idle"), setError(null)) };
}
