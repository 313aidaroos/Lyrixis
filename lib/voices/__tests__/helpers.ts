import { MemoryRepo } from "../memory-repo";
import { DemoWallet } from "../wallet-port";
import { createDemoProvider, demoWav } from "../providers/demo";
import { VoicesService, type Actor, type LicenseRequest } from "../service";
import { seedDemo, DEMO_PERSONAS } from "../demo-seed";

export async function setup(opts: { failTimes?: number; balance?: number; inviteOnly?: boolean; now?: () => Date } = {}) {
  const repo = new MemoryRepo();
  await seedDemo(repo);
  const wallet = new DemoWallet(opts.balance ?? 5000);
  const svc = new VoicesService({ repo, wallet, providers: { demo: createDemoProvider({ failTimes: opts.failTimes ?? 0 }) }, mode: "demo", inviteOnly: opts.inviteOnly ?? false, now: opts.now });
  const p = DEMO_PERSONAS;
  const customer: Actor = { userId: p.customer.id, email: p.customer.email, walletOwner: p.customer.email, isAdmin: false };
  const creator: Actor = { userId: p.creator.id, email: p.creator.email, walletOwner: p.creator.email, isAdmin: false };
  const admin: Actor = { userId: p.admin.id, email: p.admin.email, walletOwner: p.admin.email, isAdmin: true };
  const wsA = (await repo.one("voice_workspaces", { owner_user_id: customer.userId }))!;
  const voice = async (slug: string) => (await repo.one("voices", { slug }))!;
  return { repo, wallet, svc, customer, creator, admin, wsA, voice };
}

export async function newUser(repo: MemoryRepo, n: string): Promise<Actor> {
  const id = `00000000-0000-4000-9000-${n.padStart(12, "0")}`;
  const email = `user-${n}@example.test`;
  await repo.insert("users", { id, email, full_name: null, role: "user" });
  return { userId: id, email, walletOwner: email, isAdmin: false };
}

export const req = (script = "Welcome to Demo Co. أهلاً وسهلاً بكم.", extra: Partial<LicenseRequest> = {}): LicenseRequest => ({
  script, declared_use: "explainer", channels: ["web"], publication: true, territory: "gcc", term_months: 12, ...extra,
});

export const wav = (seconds = 40) => demoWav("training", seconds);
