"use client";

import { useCallback, useEffect, useState } from "react";
import { encodeFunctionData } from "viem";
import { patchedMarketAbi } from "@patched/shared";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { DEPLOYMENT, IS_TESTNET, MARKET, publicClient } from "@/lib/config";
import { friendlyError } from "@/lib/market/useBid";
import { useTx } from "@/lib/market/useTx";

interface Params {
  feeBps: number;
  royaltyBps: number;
  minIncrementBps: number;
  minIncrement: bigint;
  minBond: bigint;
  newCreatorCap: bigint;
  snipeWindow: number;
  maxExtension: number;
  disputeWindow: number;
  /** Older deployments don't have this floor (it is one hour there). */
  minDisputeWindow: number;
}

const read = (name: string) => publicClient.readContract({ address: MARKET, abi: patchedMarketAbi, functionName: name as "feeBps" }) as Promise<unknown>;

const words = (s: number) => (s % 3600 === 0 ? `${s / 3600} hour${s === 3600 ? "" : "s"}` : s % 60 === 0 ? `${s / 60} min` : `${s} s`);

/**
 * The review and anti-snipe windows, adjustable so a whole listing can be shown in minutes. On the test network
 * there are one-click presets; on mainnet the values are shown and can only be changed within the contract's
 * one-hour floor for the review window.
 */
export function TimingPanel({ onDone }: { onDone?: () => void }) {
  const send = useTx();
  const [p, setP] = useState<Params | null>(null);
  const [review, setReview] = useState("");
  const [snipe, setSnipe] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [feeBps, royaltyBps, minIncrementBps, minIncrement, minBond, newCreatorCap, snipeWindow, maxExtension, disputeWindow] = await Promise.all(
      ["feeBps", "royaltyBps", "minIncrementBps", "minIncrement", "minBond", "newCreatorCap", "snipeWindow", "maxExtension", "disputeWindow"].map(read),
    );
    const minDisputeWindow = await read("minDisputeWindow").then(Number).catch(() => 3600);
    const next: Params = {
      feeBps: Number(feeBps), royaltyBps: Number(royaltyBps), minIncrementBps: Number(minIncrementBps),
      minIncrement: BigInt(minIncrement as bigint), minBond: BigInt(minBond as bigint), newCreatorCap: BigInt(newCreatorCap as bigint),
      snipeWindow: Number(snipeWindow), maxExtension: Number(maxExtension), disputeWindow: Number(disputeWindow), minDisputeWindow,
    };
    setP(next);
    setReview(String(next.disputeWindow / 60));
    setSnipe(String(next.snipeWindow / 60));
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  /** Set both windows (in seconds), lowering the review floor first when a demo needs a shorter one. */
  async function apply(reviewSec: number, snipeSec: number) {
    if (!p) return;
    setBusy(true);
    try {
      if (reviewSec < p.minDisputeWindow) {
        await send(MARKET, encodeFunctionData({ abi: patchedMarketAbi, functionName: "setMinDisputeWindow", args: [reviewSec] }));
      }
      await send(MARKET, encodeFunctionData({
        abi: patchedMarketAbi, functionName: "setParams",
        args: [p.feeBps, p.royaltyBps, p.minIncrementBps, p.minIncrement, p.minBond, p.newCreatorCap, snipeSec, p.maxExtension, reviewSec],
      }));
      toast(`Review window ${words(reviewSec)}, anti-snipe ${words(snipeSec)}.`);
      await load();
      onDone?.();
    } catch (err) {
      toast(friendlyError(err).replace("The bid didn't", "That didn't"));
    } finally {
      setBusy(false);
    }
  }

  if (!p) return null;
  const canLower = !!DEPLOYMENT.approvals; // older markets keep the one-hour floor
  const testnet = IS_TESTNET;
  const reviewSec = Math.round(Number(review) * 60);
  const snipeSec = Math.round(Number(snipe) * 60);
  const floor = testnet && canLower ? 60 : p.minDisputeWindow;
  const valid = reviewSec >= floor && reviewSec <= 14 * 86_400 && snipeSec >= 0 && snipeSec <= 3600;

  return (
    <section>
      <h2 className="font-extrabold text-3xl tracking-tight mb-4">Timing</h2>
      <Card className="p-5 grid gap-4">
        <p className="text-sm text-[var(--muted)]">
          Right now brands get <b className="text-[var(--ink)]">{words(p.disputeWindow)}</b> to approve or dispute a proof, and a bid in the last{" "}
          <b className="text-[var(--ink)]">{words(p.snipeWindow)}</b> adds that much to the clock. These apply to every listing on this site.
        </p>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end">
          <label className="grid gap-1.5">
            <span className="field-label">Review window (minutes)</span>
            <input className="h-11 px-3.5 rounded-xl border-[1.5px] border-[var(--line)] bg-[var(--paper)] font-mono" inputMode="decimal" value={review} onChange={(e) => setReview(e.target.value)} />
          </label>
          <label className="grid gap-1.5">
            <span className="field-label">Anti-snipe window (minutes)</span>
            <input className="h-11 px-3.5 rounded-xl border-[1.5px] border-[var(--line)] bg-[var(--paper)] font-mono" inputMode="decimal" value={snipe} onChange={(e) => setSnipe(e.target.value)} />
          </label>
          <Button variant="primary" disabled={busy || !valid} onClick={() => apply(reviewSec, snipeSec)}>{busy ? "Saving…" : "Apply"}</Button>
        </div>
        {!valid && <p className="text-xs text-[var(--red)]">The review window must be at least {words(floor)} and at most 14 days; anti-snipe up to 60 minutes.</p>}
        {testnet && canLower && (
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-sm text-[var(--muted)]">Presets</span>
            <Button size="small" disabled={busy} onClick={() => apply(120, 60)}>Demo: 2 min review, 1 min snipe</Button>
            <Button size="small" variant="ghost" disabled={busy} onClick={() => apply(72 * 3600, 300)}>Normal: 72 hours, 5 min</Button>
          </div>
        )}
      </Card>
    </section>
  );
}
