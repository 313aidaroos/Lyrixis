import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { teamViewsFor } from "@/services/enterprise";
import { AppNav } from "@/components/AppNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ALL_ACCESS_FEATURES } from "@/lib/ixis-pricing";
import { inviteTeammateAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const user = await requireUser();
  const teams = await teamViewsFor(user);

  return (
    <div>
      <AppNav email={user.email} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Company</p>
        <h1 className="mt-2 font-display text-4xl font-bold sm:font-marquee sm:text-5xl">Team</h1>
        {teams.length === 0 ? (
          <div className="card mt-8">
            <p className="text-ink-2">
              You are not on a company plan. A label or company starts with Contact sales on the pricing page. After the
              company is approved, sign in with the work email on that request and open this page again.
            </p>
            <Link href="/pricing#contact-sales" className="btn-primary mt-6 inline-block px-5 py-2.5 text-sm">
              Contact sales
            </Link>
          </div>
        ) : (
          teams.map((team) => (
            <section key={team.organizationId} className="mt-8 space-y-6">
              <div className="card">
                <p className="font-mono text-[11px] uppercase tracking-widest text-cyan">Enterprise · All-Access</p>
                <h2 className="mt-2 font-display text-2xl font-bold">{team.name}</h2>
                <p className="mt-2 text-sm text-ink-2">You are the {team.role}.</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-ink-3">Songs processed</p>
                    <p className="mt-1 font-body text-3xl font-extrabold tabular-nums">{team.songsProcessed}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-ink-3">Members</p>
                    <p className="mt-1 font-body text-3xl font-extrabold tabular-nums">{team.members.length}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-ink-3">Seats</p>
                    <p className="mt-1 font-body text-3xl font-extrabold tabular-nums">
                      {team.members.length + team.pending.length}
                      {team.seatLimit !== null ? ` / ${team.seatLimit}` : ""}
                    </p>
                  </div>
                </div>
                <ul className="mt-6 space-y-1 text-sm text-ink-2">
                  {ALL_ACCESS_FEATURES.map((feature) => (
                    <li key={feature.name}>
                      {feature.name}
                      {feature.status === "coming_soon" ? " — Coming soon" : " — included for this company"}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card">
                <h3 className="font-display text-lg font-bold">People</h3>
                <ul className="mt-4 divide-y divide-line">
                  {team.members.map((member) => (
                    <li key={member.email} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <span>
                        <span className="text-ink">{member.name ?? member.email}</span>
                        {member.name && <span className="block text-ink-3">{member.email}</span>}
                      </span>
                      <span className="font-mono text-[11px] uppercase tracking-widest text-ink-3">{member.role}</span>
                    </li>
                  ))}
                  {team.pending.map((invite) => (
                    <li key={invite.email} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <span className="text-ink-2">{invite.email}</span>
                      <span className="font-mono text-[11px] uppercase tracking-widest text-gold">Invited</span>
                    </li>
                  ))}
                </ul>
                {team.role === "owner" ? (
                  <form action={inviteTeammateAction} className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <input type="hidden" name="organizationId" value={team.organizationId} />
                    <label className="sr-only" htmlFor={`invite-${team.organizationId}`}>
                      Email to invite
                    </label>
                    <input
                      id={`invite-${team.organizationId}`}
                      name="email"
                      type="email"
                      required
                      placeholder="teammate@company.com"
                      className="input flex-1"
                    />
                    <button type="submit" className="btn-primary px-5 py-2.5 text-sm">
                      Invite
                    </button>
                  </form>
                ) : (
                  <p className="mt-4 text-sm text-ink-3">The company owner invites people. You already have All-Access on this company&apos;s songs.</p>
                )}
              </div>
            </section>
          ))
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
