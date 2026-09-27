"use client";

import { useEffect, useState } from "react";

export interface Eip1193 {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?: boolean;
}

/** A browser wallet extension, found through EIP-6963 so every installed wallet shows up, not just the one that won `window.ethereum`. */
export interface InjectedWallet {
  id: string;
  name: string;
  icon?: string;
  rdns?: string;
  provider: Eip1193;
}

interface AnnounceEvent extends Event {
  detail: { info: { uuid: string; name: string; icon: string; rdns: string }; provider: Eip1193 };
}

/** Privy's names for the wallets it knows, so the account shows "MetaMask" instead of "unknown". */
const CLIENT_TYPES: Record<string, string> = {
  "io.metamask": "metamask",
  "io.metamask.flask": "metamask",
  "app.phantom": "phantom",
  "com.brave.wallet": "brave_wallet",
  "me.rainbow": "rainbow",
  "io.rabby": "rabby_wallet",
  "com.coinbase.wallet": "coinbase_wallet",
  "com.bybit": "bybit_wallet",
  "com.bitget.web3": "bitget_wallet",
  "com.binance.wallet": "binance",
  "com.roninchain.wallet": "ronin_wallet",
  "org.uniswap.app": "uniswap_extension",
};

export function walletClientType(w: InjectedWallet) {
  return (w.rdns && CLIENT_TYPES[w.rdns]) ?? (w.provider.isMetaMask ? "metamask" : undefined);
}

/** Every wallet extension in this browser. Falls back to `window.ethereum` for older wallets that don't announce themselves. */
export function useInjectedWallets() {
  const [wallets, setWallets] = useState<InjectedWallet[]>([]);

  useEffect(() => {
    const found = new Map<string, InjectedWallet>();
    const onAnnounce = (e: Event) => {
      const { info, provider } = (e as AnnounceEvent).detail;
      const key = info.rdns || info.uuid;
      if (found.has(key)) return;
      found.set(key, { id: key, name: info.name, icon: info.icon, rdns: info.rdns, provider });
      setWallets([...found.values()]);
    };
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    // Wallets announce synchronously; give slow ones a moment before using the legacy provider.
    const legacy = setTimeout(() => {
      const eth = (window as unknown as { ethereum?: Eip1193 }).ethereum;
      if (found.size === 0 && eth) {
        found.set("injected", { id: "injected", name: eth.isMetaMask ? "MetaMask" : "Browser wallet", provider: eth });
        setWallets([...found.values()]);
      }
    }, 300);

    return () => {
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
      clearTimeout(legacy);
    };
  }, []);

  return wallets;
}
