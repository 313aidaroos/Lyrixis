// Wires the Voices service for the current request: demo (preview/local) or live (production).
import { cookies } from "next/headers";
import { VoicesService, type Actor } from "./service";
import { MemoryRepo } from "./memory-repo";
import { SupabaseRepo } from "./supabase-repo";
import { DemoWallet, liveWallet } from "./wallet-port";
import { createDemoProvider } from "./providers/demo";
import { createElevenLabsProvider } from "./providers/elevenlabs";
import { seedDemo, DEMO_PERSONAS, type DemoPersona } from "./demo-seed";
import { signFileUrl } from "./signing";
import { isOwnerAdminEmail } from "./config";

/**
 * demo = in-memory sample data, demo Ixis, demo adapter. NEVER in production: VERCEL_ENV=production
 * always means live. Live = Supabase (0006 migration) + Apixis Wallet + ElevenLabs (when keyed).
 */
export function voicesMode(): "demo" | "live" {
  if (process.env.VERCEL_ENV === "production") return "live";
  return process.env.VOICES_DATA_MODE === "live" ? "live" : "demo";
}

/** Production shows Voices only when VOICES_LIVE=true (after the migration is applied and Awad says go). */
export function voicesOpen(): boolean {
  return voicesMode() === "demo" || process.env.VOICES_LIVE === "true";
}

export function inviteOnly(): boolean {
  return process.env.VOICES_INVITE_ONLY !== "false";
}

type G = { __lyxVoicesDemo?: Promise<VoicesService> };
const g = globalThis as unknown as G;

export async function getVoices(): Promise<VoicesService> {
  if (voicesMode() === "demo") {
    if (!g.__lyxVoicesDemo) {
      g.__lyxVoicesDemo = (async () => {
        const repo = new MemoryRepo(signFileUrl);
        await seedDemo(repo);
        return new VoicesService({ repo, wallet: new DemoWallet(5000), providers: { demo: createDemoProvider() }, mode: "demo", inviteOnly: inviteOnly() });
      })();
    }
    return g.__lyxVoicesDemo;
  }
  const { createAdminClient } = await import("@/lib/supabase/admin");
  return new VoicesService({ repo: new SupabaseRepo(createAdminClient()), wallet: liveWallet(), providers: { elevenlabs: createElevenLabsProvider() }, mode: "live", inviteOnly: inviteOnly() });
}

export const DEMO_PERSONA_COOKIE = "lyxv_demo_as";

export async function getActor(): Promise<Actor | null> {
  if (voicesMode() === "demo") {
    const jar = await cookies();
    const key = (jar.get(DEMO_PERSONA_COOKIE)?.value ?? "customer") as DemoPersona;
    const p = DEMO_PERSONAS[key] ?? DEMO_PERSONAS.customer;
    return { userId: p.id, email: p.email, walletOwner: p.email, isAdmin: p.isAdmin };
  }
  const { getUser } = await import("@/lib/auth");
  const user = await getUser();
  if (!user) return null;
  const { apixisOwner } = await import("@/lib/apixis-login");
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { data } = await createAdminClient().from("users").select("role").eq("id", user.id).maybeSingle();
  return { userId: user.id, email: user.email, walletOwner: (await apixisOwner(user.email)) ?? user.email, isAdmin: data?.role === "admin" || isOwnerAdminEmail(user.email) };
}

export async function demoPersona(): Promise<DemoPersona | null> {
  if (voicesMode() !== "demo") return null;
  const jar = await cookies();
  const v = jar.get(DEMO_PERSONA_COOKIE)?.value as DemoPersona | undefined;
  return v && v in DEMO_PERSONAS ? v : "customer";
}
