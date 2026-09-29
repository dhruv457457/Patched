/**
 * Runs the keeper every minute from the app server itself, so bidding closes and milestone payments go out
 * without a separate scheduler. On by default on testnet; on mainnet only with KEEPER_AUTORUN=true (production
 * can keep using an external cron against /api/keeper/run instead). KEEPER_AUTORUN=false turns it off.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.KEEPER_SECRET) return;
  // Serverless hosts (Vercel) freeze the process between requests, so a timer can't run there: production is
  // ticked by the Supabase cron job instead (migration 0013).
  if (process.env.VERCEL) return;
  const testnet = (process.env.NEXT_PUBLIC_CHAIN_ID ?? "5042002") === "5042002";
  const setting = process.env.KEEPER_AUTORUN;
  if (setting === "false" || (!testnet && setting !== "true")) return;

  // One timer per process, even when dev reloads this module.
  const g = globalThis as { __patchedKeeper?: ReturnType<typeof setInterval> };
  if (g.__patchedKeeper) return;
  let running = false;
  g.__patchedKeeper = setInterval(async () => {
    // PORT is set once the server is listening; skip ticks before that and while one is still running.
    if (running || !process.env.PORT) return;
    running = true;
    try {
      const res = await fetch(`http://localhost:${process.env.PORT}/api/keeper/run`, {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.KEEPER_SECRET}` },
      });
      const body = (await res.json().catch(() => null)) as { actions?: { kind: string; listingId: number; status: string }[] } | null;
      const done = body?.actions?.filter((a) => a.status !== "skipped") ?? [];
      if (done.length) console.log("keeper:", done.map((a) => `${a.kind} #${a.listingId} ${a.status}`).join(", "));
    } catch (err) {
      console.error("keeper tick failed", err instanceof Error ? err.message : err);
    } finally {
      running = false;
    }
  }, 60_000);
}
