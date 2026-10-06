import { z } from "zod";
import { isOwnerEmail } from "@/lib/owners";

/** Awad's master admin emails, the same allowlist as lib/owners.ts. */
export function isEnterpriseAdminEmail(email: string | null | undefined): boolean {
  return isOwnerEmail(email);
}

export type OrgRole = "owner" | "member";
export type OrgPlan = "standard" | "enterprise";

export interface Membership {
  organizationId: string;
  role: OrgRole;
  plan: OrgPlan;
}

export interface TrackAccess {
  userId: string;
  organizationId: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const inquirySchema = z.object({
  companyName: z.string().trim().min(2, "Enter the company name.").max(200),
  contactName: z.string().trim().min(2, "Enter your name.").max(200),
  workEmail: z.string().trim().max(320).refine((value) => EMAIL_RE.test(value), "Enter a work email."),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((value) => (value ? value : null)),
  songsPerMonth: z.string().trim().min(1, "Say about how many songs per month.").max(80),
  teamSeats: z.coerce.number().int().min(1, "Enter at least 1 seat.").max(10000),
  message: z.string().trim().min(8, "Add a short message.").max(4000),
});

export type InquiryInput = z.infer<typeof inquirySchema>;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function companySlug(name: string, taken: Iterable<string>): string {
  const used = new Set([...taken].map((slug) => slug.toLowerCase()));
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "company";
  if (!used.has(base)) return base;
  for (let n = 2; n < 1000; n += 1) {
    const next = `${base}-${n}`.slice(0, 48);
    if (!used.has(next)) return next;
  }
  return `${base}-${Date.now()}`;
}

export function enterpriseOrgIds(memberships: Membership[]): string[] {
  return memberships.filter((row) => row.plan === "enterprise").map((row) => row.organizationId);
}

/** Own songs, plus songs that belong to an Enterprise company this person is on. Never another company. */
export function canAccessTrack(input: {
  userId: string;
  memberships: Membership[];
  trackUserId: string;
  trackOrganizationId: string | null;
}): boolean {
  if (input.trackUserId === input.userId) return true;
  if (!input.trackOrganizationId) return false;
  return enterpriseOrgIds(input.memberships).includes(input.trackOrganizationId);
}

/** Full lyrics without the $3 unlock: the song is on an Enterprise company this person belongs to. */
export function enterpriseCoversTrack(memberships: Membership[], trackOrganizationId: string | null): boolean {
  if (!trackOrganizationId) return false;
  return enterpriseOrgIds(memberships).includes(trackOrganizationId);
}

export function canInviteToOrg(memberships: Membership[], organizationId: string): boolean {
  return memberships.some(
    (row) => row.organizationId === organizationId && row.role === "owner" && row.plan === "enterprise"
  );
}

/** Members plus pending invites must stay under the seat limit. Null means no limit was stored. */
export function seatsOpen(members: number, pendingInvites: number, seatLimit: number | null): boolean {
  if (seatLimit === null) return true;
  return members + pendingInvites < seatLimit;
}

export function visibleTrackIds(
  tracks: { id: string; userId: string; organizationId: string | null }[],
  userId: string,
  memberships: Membership[]
): string[] {
  return tracks
    .filter((track) =>
      canAccessTrack({
        userId,
        memberships,
        trackUserId: track.userId,
        trackOrganizationId: track.organizationId,
      })
    )
    .map((track) => track.id);
}
