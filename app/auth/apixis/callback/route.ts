import { after } from "next/server";
import { finishApixisLogin } from "@/lib/apixis-login";
import { ensureLyrixisWorldAgent } from "@/lib/lyrixis-world-agent";

// Apixis ID is the only way to create a Lyrixis account (#31), so this callback is where every new
// account first exists. Right after sign-in, create the person's Apixis world agent (same shared flow
// as the dashboard card; idempotent on Apixis.dev) without delaying the redirect.
export async function GET(request: Request) {
  return finishApixisLogin(request, {
    onSignedIn: (user, admin) => {
      after(async () => {
        await ensureLyrixisWorldAgent(user, admin);
      });
    },
  });
}
