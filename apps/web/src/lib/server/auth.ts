import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;
const jwks = createRemoteJWKSet(new URL(process.env.PRIVY_JWKS_URL ?? `https://auth.privy.io/api/v1/apps/${appId}/jwks.json`));

export interface SessionUser {
  did: string;
  wallet: `0x${string}` | null;
  xHandle: string | null;
  /** Emails Privy has verified for this user (email login/link or Google). */
  emails: string[];
}

interface PrivyLinkedAccount {
  type: string;
  address?: string;
  wallet_client_type?: string;
  chain_type?: string;
  username?: string;
  email?: string;
  /** Unix seconds when this account was first linked. */
  first_verified_at?: number | null;
}

/**
 * Verify the Privy access token from `Authorization: Bearer <token>` and look up the user's wallet.
 * Returns null if the request is not signed in. Server routes use this instead of trusting the client.
 */
export async function getSessionUser(req: Request, opts: { fresh?: boolean } = {}): Promise<SessionUser | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  let did: string;
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer: "privy.io", audience: appId });
    did = payload.sub as string;
  } catch {
    return null;
  }

  // Privy's user lookup is a network round trip on every signed-in request; reuse it for a minute per user.
  // fresh: skip the cache (e.g. right after linking an email, to verify a brand).
  const hit = opts.fresh ? undefined : userCache.get(did);
  if (hit && hit.at > Date.now() - 60_000) return hit.user;
  const user = await lookupUser(did);
  if (user.wallet !== null || user.xHandle !== null) userCache.set(did, { at: Date.now(), user });
  if (userCache.size > 500) userCache.delete(userCache.keys().next().value!);
  return user;
}

const userCache = new Map<string, { at: number; user: SessionUser }>();

async function lookupUser(did: string): Promise<SessionUser> {
  const res = await fetch(`https://auth.privy.io/api/v1/users/${encodeURIComponent(did)}`, {
    headers: {
      "privy-app-id": appId,
      authorization: `Basic ${Buffer.from(`${appId}:${process.env.PRIVY_APP_SECRET}`).toString("base64")}`,
    },
    cache: "no-store",
  });
  if (!res.ok) return { did, wallet: null, xHandle: null, emails: [] };
  const user = (await res.json()) as { linked_accounts?: PrivyLinkedAccount[] };
  const accounts = user.linked_accounts ?? [];
  const evm = accounts.filter((a) => a.type === "wallet" && (a.chain_type ?? "ethereum") === "ethereum" && a.address);
  // The account's wallet is the one linked first: a MetaMask user keeps their MetaMask wallet (where their money,
  // listings and bids are) even if Privy later adds an embedded wallet; an X or email user keeps their embedded one.
  const first = [...evm].sort((a, b) => (a.first_verified_at ?? Infinity) - (b.first_verified_at ?? Infinity))[0];
  const wallet = first?.address?.toLowerCase() ?? null;
  const x = accounts.find((a) => a.type === "twitter_oauth");
  const emails = accounts
    .map((a) => (a.type === "email" ? a.address : a.type === "google_oauth" ? a.email : undefined))
    .filter((e): e is string => !!e)
    .map((e) => e.toLowerCase());
  return { did, wallet: wallet as `0x${string}` | null, xHandle: x?.username ?? null, emails };
}

export function unauthorized() {
  return Response.json({ error: "Sign in first." }, { status: 401 });
}
