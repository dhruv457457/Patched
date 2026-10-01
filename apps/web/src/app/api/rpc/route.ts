import { serverRpcUrl } from "@/lib/config";
import { allowRate } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

/**
 * Read-only JSON-RPC for the browser, forwarded to our own RPC (QuickNode). The browser's chain reads go here instead
 * of Arc's public RPC: ad blockers (Brave Shields, uBlock) block every *.arc.io request because an old ad network used
 * that domain, which left balances stuck on "…". Only read methods pass; sending transactions stays in the wallet.
 */
const READS = new Set([
  "eth_chainId", "eth_blockNumber", "eth_call", "eth_getBalance", "eth_getCode", "eth_getStorageAt", "eth_estimateGas",
  "eth_gasPrice", "eth_maxPriorityFeePerGas", "eth_feeHistory", "eth_getTransactionCount", "eth_getTransactionByHash",
  "eth_getTransactionReceipt", "eth_getBlockByNumber", "eth_getBlockByHash", "eth_getLogs", "net_version",
]);

type RpcCall = { jsonrpc?: string; id?: unknown; method?: string; params?: unknown };

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowRate(`rpc:${ip}`, 600, 60_000)) return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32005, message: "Too many requests" } }, { status: 429 });

  const body = (await req.json().catch(() => null)) as RpcCall | RpcCall[] | null;
  const calls = Array.isArray(body) ? body : body ? [body] : [];
  if (!calls.length || calls.length > 20) return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid request" } }, { status: 400 });
  const blocked = calls.find((c) => !c.method || !READS.has(c.method));
  if (blocked) return Response.json({ jsonrpc: "2.0", id: blocked.id ?? null, error: { code: -32601, message: `Method not allowed: ${blocked.method}` } }, { status: 403 });

  const res = await fetch(serverRpcUrl(), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
  return new Response(await res.text(), { status: res.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}
