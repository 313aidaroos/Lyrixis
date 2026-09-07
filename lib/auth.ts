import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { HttpError } from "@/lib/errors";
import type { AppUser } from "@/types";

interface UserRow {
  id: string;
  auth_id: string | null;
  email: string;
  full_name: string | null;
  stripe_customer_id: string | null;
}

function toAppUser(row: UserRow): AppUser {
  return {
    id: row.id,
    authId: row.auth_id ?? "",
    email: row.email,
    fullName: row.full_name,
    stripeCustomerId: row.stripe_customer_id,
  };
}

export async function requireUser(): Promise<AppUser> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new HttpError(401, "unauthorized", "Sign in to continue.");
  }

  const admin = createAdminClient();
  const { data, error: profileError } = await admin
    .from("users")
    .select("id, auth_id, email, full_name, stripe_customer_id")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new HttpError(500, "profile_lookup_failed", profileError.message);
  }

  if (data) {
    return toAppUser(data as UserRow);
  }

  const email = user.email;
  if (!email) {
    throw new HttpError(400, "missing_email", "This account has no email address.");
  }

  const { data: created, error: insertError } = await admin
    .from("users")
    .insert({
      auth_id: user.id,
      email,
      full_name:
        typeof user.user_metadata.full_name === "string"
          ? user.user_metadata.full_name
          : typeof user.user_metadata.name === "string"
            ? user.user_metadata.name
            : null,
    })
    .select("id, auth_id, email, full_name, stripe_customer_id")
    .single();

  if (insertError || !created) {
    throw new HttpError(
      500,
      "profile_create_failed",
      insertError?.message ?? "Could not create user profile."
    );
  }

  return toAppUser(created as UserRow);
}
