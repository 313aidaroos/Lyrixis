// Server only (service-role key + APIXIS_WORLD_KEY). Wires lib/apixis-world-agent.ts to Supabase auth
// (app_metadata.apixis_world_agent_id / _at / _name) and Apixis.dev POST /api/agent/provision.
// Mirrors Renoxis lib/renoxis/world-agent-server.ts. Used by GET /api/apixis/world-agent and by the
// Apixis ID sign-in callback, so the agent exists from the first sign-in. Grok (Lyrixis Lead), 2026-09-29.
import { createAdminClient } from "@/lib/supabase/admin";
import { provisionApixisWorldAgent } from "@/lib/apixis-world-provision";
import { ensureWorldAgent, type WorldAgentUser, type WorldAgentView } from "@/lib/apixis-world-agent";

export const LYRIXIS_WORLD_CLIENT = "lyrixis";
// Accounts created before Lyrixis shipped this are not auto-provisioned (no backfill).
export const LYRIXIS_WORLD_ROLLOUT_AT = "2026-09-28T07:30:00.000Z";

export async function saveUserAppMetadata(userId: string, appMetadata: Record<string, unknown>) {
  const { error } = await createAdminClient().auth.admin.updateUserById(userId, { app_metadata: appMetadata });
  if (error) throw error;
}

/** Idempotent: skips when app_metadata.apixis_world_agent_at is set; Apixis.dev dedupes by verified email. Never throws. */
export function ensureLyrixisWorldAgent(user: WorldAgentUser): Promise<WorldAgentView> {
  return ensureWorldAgent(
    user,
    {
      client: LYRIXIS_WORLD_CLIENT,
      provision: (input) => provisionApixisWorldAgent({ ...input, emailVerified: true, timeoutMs: 6000 }),
      saveAppMetadata: saveUserAppMetadata,
    },
    LYRIXIS_WORLD_ROLLOUT_AT,
  );
}
