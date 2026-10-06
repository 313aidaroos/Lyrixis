/**
 * Lyrixis wiring for the shared Apixis world agent flow (lib/apixis-world-agent.ts +
 * lib/apixis-world-provision.ts). SERVER ONLY (service role + APIXIS_WORLD_KEY).
 * Used by GET /api/apixis/world-agent (dashboard card), the Apixis ID sign-in callback
 * (so every new account gets its agent right after sign-in), and scripts/backfill-world-agents.ts.
 * Grok (Lyrixis Lead), 2026-10-05.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { provisionApixisWorldAgent } from "./apixis-world-provision";
import { ensureWorldAgent, type WorldAgentUser, type WorldAgentView } from "./apixis-world-agent";

export const LYRIXIS_WORLD_CLIENT = "lyrixis";
// Accounts created before Lyrixis shipped this are not auto-provisioned on load; the 2026-10-05
// backfill (scripts/backfill-world-agents.ts) covered existing verified accounts.
export const LYRIXIS_WORLD_ROLLOUT_AT = "2026-09-28T07:30:00.000Z";

export function saveAppMetadataWith(admin: SupabaseClient) {
  return async (userId: string, appMetadata: Record<string, unknown>) => {
    const { error } = await admin.auth.admin.updateUserById(userId, { app_metadata: appMetadata });
    if (error) throw error;
  };
}

/** Provision (once) and record the agent for this user. Never throws. */
export function ensureLyrixisWorldAgent(
  user: WorldAgentUser,
  admin: SupabaseClient,
  rolloutAt: string = LYRIXIS_WORLD_ROLLOUT_AT,
): Promise<WorldAgentView> {
  return ensureWorldAgent(
    user,
    {
      client: LYRIXIS_WORLD_CLIENT,
      provision: (input) => provisionApixisWorldAgent({ ...input, emailVerified: true, timeoutMs: 6000 }),
      saveAppMetadata: saveAppMetadataWith(admin),
    },
    rolloutAt,
  );
}
