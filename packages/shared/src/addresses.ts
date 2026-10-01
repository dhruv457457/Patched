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
  /**
   * Arc's predeployed Multicall3From: batches calls while keeping the sending wallet as `msg.sender` for each one
   * (through Arc's CallFrom precompile). Lets a bid be approve + bid in one transaction. Wallets must call it directly.
   */
  multicallFrom?: Address;
  /** True once this market has `approveProof` and `minDisputeWindow` (brands can accept a proof early). */
  approvals?: boolean;
  /** True when `usdc` is the TestUSD faucet token rather than real USDC. */
  testToken?: boolean;
}

export const DEPLOYMENTS: Record<number, PatchedDeployment | undefined> = {
  // Arc testnet, deployed 2026-09-29. `market` is an upgradeable (UUPS) proxy: the address stays across upgrades.
  // Implementation 0x42CdD8D8c043fFd59e6BBfBB21eE46d57ace4c2B, linked PayeesLib 0x235b0ac9fb93ee4ee91f538c96f8c76407002f97.
  5042002: {
    market: "0x229241c26A49427981AD96A3DF61C00f1CD47869",
    receipt: "0x746F5A4b69db3363A06C17E4D669b0DD26FaA54e",
    usdc: "0x3600000000000000000000000000000000000000",
    deployBlock: 64587940,
    autoBidder: "0x8E150895a6269D9701974fCfB1d6307dC28B8488",
    autoBidderBlock: 64588026,
    sweeper: "0xf0EEb561b1Fcf475FaCdFf00229a0fE363815aBB",
    multicallFrom: "0x522fAf9A91c41c443c66765030741e4AaCe147D0",
    approvals: true,
  },
  // Arc mainnet (5042): after the testnet run.
};
