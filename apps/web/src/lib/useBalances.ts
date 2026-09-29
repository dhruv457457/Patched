"use client";

import { useEffect, useState } from "react";
import { erc20Abi, formatUnits } from "viem";
import { USDC, publicClient } from "@/lib/config";

/**
 * A wallet's USDC balance, formatted for display and refreshed every 10 seconds. On Arc gas is paid out of the same
 * USDC, so there is no separate gas balance to show. Read through the ERC-20 interface (6 decimals).
 */
export function useBalances(wallet?: `0x${string}`) {
  const [usdc, setUsdc] = useState<string | null>(null);

  useEffect(() => {
    if (!wallet) return;
    let alive = true;
    const load = async () => {
      const u = await publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: "balanceOf", args: [wallet] }).catch(() => null);
      if (!alive || u === null) return;
      setUsdc(Number(formatUnits(u, 6)).toLocaleString("en-US", { maximumFractionDigits: 2 }));
    };
    void load();
    const t = setInterval(load, 10_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [wallet]);

  return { usdc };
}
