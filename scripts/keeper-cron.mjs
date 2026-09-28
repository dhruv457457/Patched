// Points the Supabase cron job (migration 0013) at the deployed app: stores the site URL and KEEPER_SECRET in
// Supabase Vault. Run once after deploying, and again if the URL or secret changes.
// Usage: node scripts/keeper-cron.mjs https://patched.world      (or "off" to stop the job from calling anything)
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const site = process.argv[2];
if (!site || (site !== "off" && !/^https:\/\//.test(site))) {
  console.error("Usage: node scripts/keeper-cron.mjs https://your-site   (or: off)");
  process.exit(1);
}
if (site !== "off" && !process.env.KEEPER_SECRET) {
  console.error("KEEPER_SECRET is missing from .env.local");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice: () => {} });

/** Create or replace a Vault secret by name. */
async function put(name, value) {
  const [row] = await sql`select id from vault.secrets where name = ${name}`;
  if (row) await sql`select vault.update_secret(${row.id}::uuid, ${value})`;
  else await sql`select vault.create_secret(${value}, ${name})`;
}

try {
  if (site === "off") {
    await sql`delete from vault.secrets where name in ('patched_keeper_url', 'patched_keeper_secret')`;
    console.log("Keeper cron stopped: it no longer calls any site.");
  } else {
    await put("patched_keeper_url", site);
    await put("patched_keeper_secret", process.env.KEEPER_SECRET);
    console.log(`Keeper cron now calls ${site.replace(/\/$/, "")}/api/keeper/run every minute.`);
  }
} finally {
  await sql.end();
}
