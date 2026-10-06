"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { inviteTeammate } from "@/services/enterprise";

export async function inviteTeammateAction(formData: FormData) {
  const user = await requireUser();
  await inviteTeammate(user, String(formData.get("organizationId") ?? ""), String(formData.get("email") ?? ""));
  revalidatePath("/team");
}
