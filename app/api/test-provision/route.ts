// TEST ENDPOINT - Generate sign-in link and test provision
// DELETE AFTER VERIFICATION
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = body.email || "awad+lyrixis-w1@apixis.dev";
  
  try {
    const admin = createAdminClient();
    
    // Generate magic link
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: "https://lyrixis.vercel.app/auth/callback?next=/dashboard",
      },
    });
    
    if (linkError) throw linkError;
    
    // Get user to check provision status
    const { data: userData } = await admin.auth.admin.listUsers();
    const user = userData?.users?.find((u) => u.email === email);
    
    return NextResponse.json({
      ok: true,
      email,
      hashed_token: linkData.properties.hashed_token,
      signin_url: `https://lyrixis.vercel.app/auth/callback?token_hash=${linkData.properties.hashed_token}&type=magiclink&next=/dashboard`,
      user_exists: !!user,
      user_metadata: user?.app_metadata || null,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
