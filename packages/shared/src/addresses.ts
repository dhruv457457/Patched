// Updated after each deploy (contracts/script/Deploy.s.sol). See docs/contracts.md → Deployments.
import type { Address } from "./types";

export interface PatchedDeployment {
  market: Address;
  receipt: Address;
  usdc: Address;
  deployBlock: number;
  /** PatchAutoBidder for this market ("keep me on top up to $X"), and the block it was deployed in. */
  autoBidder?: Address;
  autoBidderBlock?: number;
  /** PatchSweeper for this market (several patches in one transaction). */
  sweeper?: Address;
  /** True once this market has `approveProof` and `minDisputeWindow` (brands can accept a proof early). */
  approvals?: boolean;
  /** True when `usdc` is the TestUSD faucet token rather than real USDC. */
  testToken?: boolean;
}

export const DEPLOYMENTS: Record<number, PatchedDeployment | undefined> = {
  // Arc testnet (5042002) and Arc mainnet (5042): filled in after contracts/script/Deploy.s.sol runs on each.
};
