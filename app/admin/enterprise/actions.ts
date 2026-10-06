"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { approveEnterpriseInquiry } from "@/services/enterprise";

export async function approveInquiryAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("inquiryId") ?? "");
  await approveEnterpriseInquiry(user, id);
  revalidatePath("/admin/enterprise");
}
