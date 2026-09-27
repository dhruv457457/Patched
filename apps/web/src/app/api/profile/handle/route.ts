import { getSessionUser } from "@/lib/server/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { handleProblem } from "@/lib/handles";

export const runtime = "nodejs";

/** Is a handle free? `?h=name`. Your own current handle counts as free. */
export async function GET(req: Request) {
  const h = (new URL(req.url).searchParams.get("h") ?? "").trim().toLowerCase();
  const problem = handleProblem(h);
  if (problem) return Response.json({ available: false, reason: problem });
  const [user, { data }] = await Promise.all([
    getSessionUser(req).catch(() => null),
    supabaseAdmin().from("profiles").select("privy_did").eq("handle", h).maybeSingle(),
  ]);
  const available = !data || (user !== null && data.privy_did === user.did);
  return Response.json({ available, reason: available ? null : "That handle is taken." });
}
