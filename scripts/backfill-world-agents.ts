/**
 * One-off backfill: create the Apixis world agent for existing Lyrixis accounts, exactly as signup
 * does (lib/lyrixis-world-agent.ts → Apixis.dev POST /api/agent/provision, idempotent by verified
 * email). Only verified accounts without app_metadata.apixis_world_agent_at are touched; the rollout
 * date is ignored on purpose (that is the backfill).
 *
 *   NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… APIXIS_WORLD_KEY=… \
 *     npx tsx scripts/backfill-world-agents.ts [--apply] [--only a@x.com,b@y.com] [--skip a@x.com]
 *
 * Without --apply it only lists who would be provisioned. Grok (Lyrixis Lead), 2026-10-05.
 */
import { createClient } from "@supabase/supabase-js";
import { hasVerifiedEmail } from "../lib/apixis-world-agent";
import { ensureLyrixisWorldAgent } from "../lib/lyrixis-world-agent";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const listArg = (flag: string) => {
  const i = args.indexOf(flag);
  return i >= 0 ? (args[i + 1] ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) : [];
};
const only = listArg("--only");
const skip = listArg("--skip");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing");
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  for (const user of data.users) {
    const email = (user.email ?? "").toLowerCase();
    const has = Boolean(user.app_metadata?.apixis_world_agent_at);
    let action = "skip";
    if (has) action = "has_agent";
    else if (!hasVerifiedEmail(user)) action = "skip_unverified";
    else if (only.length && !only.includes(email)) action = "skip_not_selected";
    else if (skip.includes(email)) action = "skip_excluded";
    else action = apply ? "provision" : "would_provision";
    if (action === "provision") {
      const view = await ensureLyrixisWorldAgent(user, admin, "1970-01-01T00:00:00.000Z");
      const after = (await admin.auth.admin.getUserById(user.id)).data.user?.app_metadata ?? {};
      console.log(JSON.stringify({ email, action, status: view.status, agent_id: after.apixis_world_agent_id ?? null, agent_name: after.apixis_world_agent_name ?? null }));
    } else {
      console.log(JSON.stringify({ email, action }));
    }
  }
}

main().catch((err) => {
  console.error("backfill failed:", err?.message ?? err);
  process.exit(1);
});
