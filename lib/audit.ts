import { createAdminClient } from "@/lib/supabase/admin";

export async function writeAudit(input: {
  actorUserId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, string | number | boolean | null>;
  ip?: string | null;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("audit_logs").insert({
    actor_user_id: input.actorUserId ?? null,
    action: input.action,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? null,
    ip: input.ip ?? null,
  });
  if (error) {
    console.error("audit_logs insert failed", error.message);
  }
}
