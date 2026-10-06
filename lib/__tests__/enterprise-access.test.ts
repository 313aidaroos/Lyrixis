import { describe, expect, it } from "vitest";
import {
  canAccessTrack,
  canInviteToOrg,
  companySlug,
  enterpriseCoversTrack,
  inquirySchema,
  isEnterpriseAdminEmail,
  seatsOpen,
  visibleTrackIds,
  type Membership,
} from "../enterprise-access";

const owner: Membership = { organizationId: "org-a", role: "owner", plan: "enterprise" };
const member: Membership = { organizationId: "org-a", role: "member", plan: "enterprise" };
const other: Membership = { organizationId: "org-b", role: "owner", plan: "enterprise" };

describe("enterprise admins", () => {
  it("allows only Awad's master admin emails", () => {
    expect(isEnterpriseAdminEmail("awad@apixis.dev")).toBe(true);
    expect(isEnterpriseAdminEmail("Alaidaroosawad@gmail.com")).toBe(true);
    expect(isEnterpriseAdminEmail("owner@label.test")).toBe(false);
  });
});

describe("company song access", () => {
  const tracks = [
    { id: "mine", userId: "u1", organizationId: "org-a" },
    { id: "teammate", userId: "u2", organizationId: "org-a" },
    { id: "personal", userId: "u2", organizationId: null },
    { id: "other-company", userId: "u3", organizationId: "org-b" },
  ];

  it("lets a member see their company's songs and not another company's", () => {
    expect(visibleTrackIds(tracks, "u1", [member]).sort()).toEqual(["mine", "teammate"]);
    expect(canAccessTrack({ userId: "u1", memberships: [member], trackUserId: "u3", trackOrganizationId: "org-b" })).toBe(false);
    expect(canAccessTrack({ userId: "u1", memberships: [member], trackUserId: "u2", trackOrganizationId: null })).toBe(false);
  });

  it("still lets someone open a song they uploaded themselves", () => {
    expect(canAccessTrack({ userId: "u2", memberships: [], trackUserId: "u2", trackOrganizationId: null })).toBe(true);
  });

  it("covers full lyrics only for the company the person belongs to", () => {
    expect(enterpriseCoversTrack([member], "org-a")).toBe(true);
    expect(enterpriseCoversTrack([member], "org-b")).toBe(false);
    expect(enterpriseCoversTrack([member], null)).toBe(false);
    expect(enterpriseCoversTrack([{ ...member, plan: "standard" }], "org-a")).toBe(false);
  });

  it("does not let company B's owner see company A's songs", () => {
    expect(visibleTrackIds(tracks, "u9", [other])).toEqual(["other-company"]);
  });
});

describe("team invites", () => {
  it("lets only the enterprise owner invite, and stops at the seat limit", () => {
    expect(canInviteToOrg([owner], "org-a")).toBe(true);
    expect(canInviteToOrg([member], "org-a")).toBe(false);
    expect(canInviteToOrg([owner], "org-b")).toBe(false);
    expect(seatsOpen(2, 1, 4)).toBe(true);
    expect(seatsOpen(2, 2, 4)).toBe(false);
    expect(seatsOpen(1, 0, 1)).toBe(false);
    expect(seatsOpen(9, 0, null)).toBe(true);
  });
});

describe("contact sales input", () => {
  it("accepts a full request and makes a unique company slug", () => {
    const parsed = inquirySchema.parse({
      companyName: "North Records",
      contactName: "Mina Cole",
      workEmail: "mina@north.test",
      phone: "",
      songsPerMonth: "About 200",
      teamSeats: "8",
      message: "We need lyrics for the whole catalog.",
    });
    expect(parsed.phone).toBeNull();
    expect(parsed.teamSeats).toBe(8);
    expect(companySlug("North Records", [])).toBe("north-records");
    expect(companySlug("North Records", ["north-records"])).toBe("north-records-2");
  });

  it("rejects a request with no company or message", () => {
    expect(inquirySchema.safeParse({
      companyName: "A",
      contactName: "Mina Cole",
      workEmail: "not-an-email",
      songsPerMonth: "",
      teamSeats: 0,
      message: "short",
    }).success).toBe(false);
  });
});
