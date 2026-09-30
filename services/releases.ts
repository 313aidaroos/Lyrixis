import { createAdminClient } from "@/lib/supabase/admin";
import { HttpError } from "@/lib/errors";
import { writeAudit } from "@/lib/audit";
import { getOwnedTrack } from "@/services/tracks";
import {
  formatIsrc,
  formatIswc,
  normalizeIsrc,
  normalizeIswc,
  normalizeUpc,
} from "@/lib/music-ids";
import {
  createReleaseSchema,
  type SplitCollaborator,
} from "@/lib/release-schema";
import type { AppUser } from "@/types";

/** Wallet product key for the Release Tool package. Must be registered in the
 *  Apixis Wallet product catalog (price in Ixis); the Wallet is the source of
 *  truth for the charged amount. */
export const RELEASE_PRODUCT_KEY = "lyrixis.release.package";

export type ReleaseStatus = "draft" | "paid" | "delivered";

export interface ReleaseRow {
  id: string;
  user_id: string;
  track_ids: string[];
  title: string;
  metadata: Record<string, unknown>;
  splits: SplitCollaborator[];
  status: ReleaseStatus;
  song_count: number;
  amount_cents: number | null;
  paid_via: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface NormalizedMetadata {
  title: string;
  primaryArtist: string;
  featuredArtists: string[];
  releaseType: "single";
  isrc: string | null;
  iswc: string | null;
  upc: string | null;
  isrcFormatted: string | null;
  iswcFormatted: string | null;
}

/** Load a track row by internal id, enforcing ownership. */
export async function getOwnedTrackById(
  user: AppUser,
  trackId: string
): Promise<{ id: string; publicId: string; title: string | null; artist: string | null; status: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tracks")
    .select("id, public_id, title, artist, status")
    .eq("id", trackId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    throw new HttpError(500, "track_lookup_failed", error.message);
  }
  if (!data) {
    throw new HttpError(404, "not_found", "Track not found.");
  }
  const row = data as { id: string; public_id: string; title: string | null; artist: string | null; status: string };
  return { id: row.id, publicId: row.public_id, title: row.title, artist: row.artist, status: row.status };
}

export async function hasHumanVerification(trackId: string): Promise<boolean> {  const admin = createAdminClient();
  const { data, error } = await admin
    .from("verification_records")
    .select("id")
    .eq("track_id", trackId)
    .eq("level", "human_verified")
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new HttpError(500, "verification_lookup_failed", error.message);
  }
  return data !== null;
}

export async function humanVerificationAt(trackId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("verification_records")
    .select("created_at")
    .eq("track_id", trackId)
    .eq("level", "human_verified")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new HttpError(500, "verification_lookup_failed", error.message);
  }
  return (data as { created_at: string } | null)?.created_at ?? null;
}

export async function recordHumanVerification(input: {
  user: AppUser;
  publicId: string;
  notes?: string;
}): Promise<{ already: boolean }> {
  const track = await getOwnedTrack(input.user, input.publicId);
  if (track.status !== "completed" && track.status !== "manual_review") {
    throw new HttpError(409, "not_ready", "Wait until processing finishes before verifying lyrics.");
  }
  const admin = createAdminClient();
  const { data: existing, error: lookupError } = await admin
    .from("verification_records")
    .select("id")
    .eq("track_id", track.id)
    .eq("level", "human_verified")
    .eq("verified_by", input.user.id)
    .maybeSingle();
  if (lookupError) {
    throw new HttpError(500, "verification_lookup_failed", lookupError.message);
  }
  if (existing) return { already: true };
  const { error } = await admin.from("verification_records").insert({
    track_id: track.id,
    level: "human_verified",
    verified_by: input.user.id,
    notes: input.notes ?? "Release Tool: artist explicitly verified the lyrics.",
  });
  if (error) {
    throw new HttpError(500, "verification_failed", error.message);
  }
  await writeAudit({
    actorUserId: input.user.id,
    action: "lyrics_verified",
    entityType: "track",
    entityId: track.id,
    metadata: { public_id: track.public_id },
  });
  return { already: false };
}

export async function getRelease(user: AppUser, id: string): Promise<ReleaseRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("releases")
    .select(
      "id, user_id, track_ids, title, metadata, splits, status, song_count, amount_cents, paid_via, paid_at, created_at"
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    throw new HttpError(500, "release_lookup_failed", error.message);
  }
  if (!data) {
    throw new HttpError(404, "not_found", "Release not found.");
  }
  return data as ReleaseRow;
}

/**
 * Create a draft release. Server re-validates everything: splits sum to 100,
 * codes normalized with lib/music-ids (invalid → 400), track owned + processed,
 * and lyrics explicitly human-verified (the product's trust anchor).
 */
export async function createRelease(
  user: AppUser,
  input: unknown
): Promise<{ id: string; trackId: string }> {
  const parsed = createReleaseSchema.safeParse(input);
  if (!parsed.success) {
    throw new HttpError(
      400,
      "invalid_body",
      parsed.error.issues[0]?.message ?? "Invalid release payload."
    );
  }
  const { trackPublicId, metadata, splits } = parsed.data;

  const track = await getOwnedTrack(user, trackPublicId);
  if (track.status !== "completed" && track.status !== "manual_review") {
    throw new HttpError(409, "track_not_ready", "Wait until processing finishes before creating the release.");
  }
  if (!(await hasHumanVerification(track.id))) {
    throw new HttpError(409, "lyrics_not_verified", "Confirm “Lyrics verified” before creating the release.");
  }

  // normalizeIsrc/Iswc/Upc throw HttpError(400) on invalid input — surfaced as-is.
  const rawIsrc = metadata.isrc?.trim() ? metadata.isrc : null;
  const rawIswc = metadata.iswc?.trim() ? metadata.iswc : null;
  const rawUpc = metadata.upc?.trim() ? metadata.upc : null;
  const isrc = normalizeIsrc(rawIsrc);
  const iswc = normalizeIswc(rawIswc);
  const upc = normalizeUpc(rawUpc);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("releases")
    .insert({
      user_id: user.id,
      track_ids: [track.id],
      title: metadata.title,
      metadata: {
        primary_artist: metadata.primaryArtist,
        featured_artists: metadata.featuredArtists,
        release_type: metadata.releaseType,
        isrc,
        iswc,
        upc,
      },
      splits,
      song_count: 1, // v1: single only
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new HttpError(500, "create_failed", error?.message ?? "Could not create release.");
  }

  await writeAudit({
    actorUserId: user.id,
    action: "release_created",
    entityType: "release",
    entityId: data.id,
    metadata: { track_id: track.id, title: metadata.title },
  });

  return { id: data.id as string, trackId: track.id };
}

/** Called inside the Wallet redeem provision(): the charge is being captured. */
export async function markReleasePaid(input: {
  user: AppUser;
  releaseId: string;
  amountCents: number;
  reservationId: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("releases")
    .update({
      status: "paid",
      amount_cents: input.amountCents,
      paid_via: "ixis",
      paid_at: new Date().toISOString(),
    })
    .eq("id", input.releaseId)
    .eq("user_id", input.user.id)
    .eq("status", "draft");
  if (error) {
    throw new HttpError(500, "provision_failed", `Could not mark release paid: ${error.message}`);
  }
  await writeAudit({
    actorUserId: input.user.id,
    action: "release_paid",
    entityType: "release",
    entityId: input.releaseId,
    metadata: { amount_cents: input.amountCents, paid_via: "ixis", reservation_id: input.reservationId },
  });
}

/** Called when the Wallet confirms the customer was NOT charged. */
export async function revertReleaseToDraft(input: {
  user: AppUser;
  releaseId: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("releases")
    .update({ status: "draft", amount_cents: null, paid_via: null, paid_at: null })
    .eq("id", input.releaseId)
    .eq("user_id", input.user.id)
    .eq("status", "paid");
  if (error) {
    console.error("[release] unprovision failed", { releaseId: input.releaseId, error });
  }
}

export async function markReleaseDelivered(input: {
  user: AppUser;
  releaseId: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("releases")
    .update({ status: "delivered" })
    .eq("id", input.releaseId)
    .eq("user_id", input.user.id)
    .eq("status", "paid");
  if (error) {
    console.error("[release] mark delivered failed", { releaseId: input.releaseId, error });
  }
}

export function normalizedMetadataView(row: ReleaseRow): NormalizedMetadata {
  const metadata = (row.metadata ?? {}) as Record<string, unknown>;
  const isrc = typeof metadata.isrc === "string" ? metadata.isrc : null;
  const iswc = typeof metadata.iswc === "string" ? metadata.iswc : null;
  const upc = typeof metadata.upc === "string" ? metadata.upc : null;
  return {
    title: row.title,
    primaryArtist: typeof metadata.primary_artist === "string" ? metadata.primary_artist : "",
    featuredArtists: Array.isArray(metadata.featured_artists)
      ? (metadata.featured_artists as string[])
      : [],
    releaseType: "single",
    isrc,
    iswc,
    upc,
    isrcFormatted: formatIsrc(isrc),
    iswcFormatted: formatIswc(iswc),
  };
}
