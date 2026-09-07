import { createAdminClient } from "@/lib/supabase/admin";
import { HttpError } from "@/lib/errors";

export interface WaitlistLeadInput {
  name: string | null;
  company: string | null;
  workEmail: string;
  trackCount: string | null;
  useCase: string | null;
  integration: string | null;
  message: string | null;
}

interface LeadRow {
  name: string | null;
  company: string | null;
  work_email: string;
  track_count: string | null;
  use_case: string | null;
  integration: string | null;
  message: string | null;
  status: "new";
  source?: "waitlist";
}

function isMissingSourceColumn(error: { message?: string; code?: string }): boolean {
  const message = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    message.includes("source")
  );
}

export async function createWaitlistLead(input: WaitlistLeadInput): Promise<{ id: string }> {
  const admin = createAdminClient();
  const row: LeadRow = {
    name: input.name,
    company: input.company,
    work_email: input.workEmail,
    track_count: input.trackCount,
    use_case: input.useCase,
    integration: input.integration,
    message: input.message,
    status: "new",
    source: "waitlist",
  };

  const first = await admin.from("enterprise_leads").insert(row).select("id").single();
  if (!first.error && first.data?.id) {
    return { id: first.data.id as string };
  }

  if (first.error && isMissingSourceColumn(first.error)) {
    const withoutSource = {
      name: row.name,
      company: row.company,
      work_email: row.work_email,
      track_count: row.track_count,
      use_case: row.use_case,
      integration: row.integration,
      message: row.message,
      status: row.status,
    };
    const second = await admin.from("enterprise_leads").insert(withoutSource).select("id").single();
    if (!second.error && second.data?.id) {
      return { id: second.data.id as string };
    }
  }

  throw new HttpError(500, "lead_insert_failed", "Could not save your request. Try again.");
}
