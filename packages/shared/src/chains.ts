import { defineChain } from "viem";

/**
 * Arc (Circle's L1). Gas is paid in USDC: the native balance is USDC with 18 decimals, and the same money is the
 * USDC ERC-20 at 0x3600...0000 with 6 decimals. Our contracts only use the ERC-20 side (6 decimals).
 */
export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.io"] } },
  blockExplorers: { default: { name: "Arc Explorer", url: "https://explorer.testnet.arc.io" } },
  testnet: true,
});

export const arcMainnet = defineChain({
  id: 5042,
  name: "Arc",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.arc.io"] } },
  blockExplorers: { default: { name: "Arc Explorer", url: "https://explorer.arc.io" } },
});

/** Circle USDC per chain (the ERC-20 interface, 6 decimals). The same address on Arc mainnet and testnet. */
export const USDC: Record<number, `0x${string}`> = {
  5042002: "0x3600000000000000000000000000000000000000",
  5042: "0x3600000000000000000000000000000000000000",
};

export const USDC_DECIMALS = 6;
