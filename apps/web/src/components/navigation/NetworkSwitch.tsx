"use client";

import { usePathname } from "next/navigation";
import { Check } from "lucide-react";
import { DEPLOYMENTS } from "@patched/shared";
import { CHAIN_ID, NETWORK_SITES } from "@/lib/config";
import { cn } from "@/lib/utils";

/**
 * Where the same page lives on the other network's site. Listings, receipts and events have their own numbers
 * on each chain, so those pages fall back to the matching list.
 */
function samePageOn(path: string): string {
  if (/^\/e\//.test(path)) return "/events";
  if (/^\/(studio|share)\/\d+/.test(path) || /^\/[^/]+\/\d+\/?$/.test(path)) return "/explore";
  return path;
}

export function networkUrl(chain: 10143 | 143, path: string) {
  return `${NETWORK_SITES[chain].url.replace(/\/$/, "")}${samePageOn(path)}`;
}

const DOT = { 10143: "bg-[#F5B400]", 143: "bg-[var(--green)]" } as const;

/** The two networks as a list; used by the account menu and Settings. */
export function NetworkOptions({ onPick }: { onPick?: () => void }) {
  const pathname = usePathname();
  const notes = {
    10143: "Monad testnet with test USDC. Try everything for free.",
    143: DEPLOYMENTS[143]?.testToken ? "Monad mainnet, test run with the TestUSD token." : "Monad mainnet with real USDC.",
  } as const;
  return (
    <ul className="grid gap-1">
      {([10143, 143] as const).map((chain) => {
        const active = chain === CHAIN_ID;
        return (
          <li key={chain}>
            <a
              href={active ? undefined : networkUrl(chain, pathname)}
              onClick={(e) => {
                if (active) e.preventDefault();
                onPick?.();
              }}
              aria-current={active ? "true" : undefined}
              className={cn("flex gap-2.5 items-start rounded-lg px-2.5 py-2 no-underline", active ? "bg-[var(--soft)]" : "hover:bg-[var(--soft)]")}
            >
              <span className={cn("w-2.5 h-2.5 rounded-full mt-1.5 flex-none", DOT[chain])} />
              <span className="grid min-w-0">
                <b className="text-sm flex items-center gap-1.5">{NETWORK_SITES[chain].label}{active && <Check size={13} />}</b>
                <span className="text-xs text-[var(--muted)]">{notes[chain]}</span>
              </span>
            </a>
          </li>
        );
      })}
      <li className="px-2.5 pt-1 pb-1 text-[11px] text-[var(--muted)]">Same account and wallet on both. You sign in once per network.</li>
    </ul>
  );
}
