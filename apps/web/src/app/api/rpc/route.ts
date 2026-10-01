import { serverRpcUrl } from "@/lib/config";
import { allowRate } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

/**
 * JSON-RPC for the browser, forwarded to our own RPC (QuickNode). The browser's chain reads and the embedded wallet's
 * sends go here instead of Arc's public RPC: ad blockers (Brave Shields, uBlock) block every *.arc.io request because
 * an old ad network used that domain, which left balances stuck on "…" and transactions failing. Only reads and
 * already-signed transactions pass; signing stays in the wallet.
 */
const METHODS = new Set([
  "eth_chainId", "eth_blockNumber", "eth_call", "eth_getBalance", "eth_getCode", "eth_getStorageAt", "eth_estimateGas",
  "eth_gasPrice", "eth_maxPriorityFeePerGas", "eth_feeHistory", "eth_getTransactionCount", "eth_getTransactionByHash",
  "eth_getTransactionReceipt", "eth_getBlockByNumber", "eth_getBlockByHash", "eth_getLogs", "net_version",
  "eth_fillTransaction", "eth_newFilter", "eth_getFilterChanges", "eth_getFilterLogs", "eth_uninstallFilter", "eth_sendRawTransaction",
]);

// Privy's wallet frame calls this from its own origin.
const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type" };

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

type RpcCall = { jsonrpc?: string; id?: unknown; method?: string; params?: unknown };

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowRate(`rpc:${ip}`, 600, 60_000)) return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32005, message: "Too many requests" } }, { status: 429, headers: CORS });

  const body = (await req.json().catch(() => null)) as RpcCall | RpcCall[] | null;
  const calls = Array.isArray(body) ? body : body ? [body] : [];
  if (!calls.length || calls.length > 20) return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid request" } }, { status: 400, headers: CORS });
  const blocked = calls.find((c) => !c.method || !METHODS.has(c.method));
  if (blocked) return Response.json({ jsonrpc: "2.0", id: blocked.id ?? null, error: { code: -32601, message: `Method not allowed: ${blocked.method}` } }, { status: 403, headers: CORS });

  const res = await fetch(serverRpcUrl(), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
  return new Response(await res.text(), { status: res.status, headers: { ...CORS, "content-type": "application/json", "cache-control": "no-store" } });
}
