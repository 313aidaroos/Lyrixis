import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: vi.fn() }));

import { isOwner, isOwnerEmail } from "./owners";

const jwt = (amr: unknown) => `x.${Buffer.from(JSON.stringify({ amr })).toString("base64url")}.y`;
const owner = { email: "awad@apixis.dev", email_confirmed_at: "2026-10-04T00:00:00Z" };

describe("owner allowlist", () => {
  it("matches owner emails case-insensitively", () => {
    expect(isOwnerEmail(" Alaidaroosawad@Gmail.com ")).toBe(true);
    expect(isOwnerEmail("x@example.com")).toBe(false);
  });

  it("needs a confirmed owner email and an email-proving sign-in", () => {
    expect(isOwner(owner, jwt([{ method: "otp" }]))).toBe(true);
    expect(isOwner(owner, jwt([{ method: "password" }]))).toBe(false);
    expect(isOwner({ ...owner, email_confirmed_at: null }, jwt([{ method: "magiclink" }]))).toBe(false);
    expect(isOwner(null, jwt([{ method: "otp" }]))).toBe(false);
  });
});
