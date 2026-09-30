import { z } from "zod";

/**
 * Release Tool v1 — shared validation (client + server).
 * No Node-only imports here: this module is imported by the wizard UI.
 */

export const releaseTypeSchema = z.enum(["single"]);

export const releaseMetadataSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(300),
  primaryArtist: z.string().trim().min(1, "Primary artist is required.").max(300),
  featuredArtists: z
    .array(z.string().trim().min(1).max(300))
    .max(20)
    .default([]),
  releaseType: releaseTypeSchema.default("single"),
  // Codes are optional (not everyone has them yet); when present they are
  // normalized/validated server-side with lib/music-ids.ts. Empty string = not provided.
  isrc: z.string().trim().max(30).optional().or(z.literal("")),
  iswc: z.string().trim().max(30).optional().or(z.literal("")),
  upc: z.string().trim().max(20).optional().or(z.literal("")),
});

export const splitCollaboratorSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  role: z.string().trim().min(1, "Role is required.").max(100),
  percentage: z.number().finite().gt(0, "Percentage must be positive.").lte(100),
  email: z.string().trim().email("Enter a valid email.").max(320).optional().or(z.literal("")),
});

/** Percentages must sum to exactly 100 (compared in basis points to dodge float error). */
export const splitsSchema = z
  .array(splitCollaboratorSchema)
  .min(1, "Add at least one collaborator.")
  .max(20)
  .refine(
    (splits) =>
      splits.reduce((sum, split) => sum + Math.round(split.percentage * 100), 0) === 10_000,
    { message: "Split percentages must add up to exactly 100%." }
  );

export const createReleaseSchema = z.object({
  trackPublicId: z.string().min(1),
  metadata: releaseMetadataSchema,
  splits: splitsSchema,
});

export type CreateReleaseInput = z.infer<typeof createReleaseSchema>;
export type ReleaseMetadata = z.infer<typeof releaseMetadataSchema>;
export type SplitCollaborator = z.infer<typeof splitCollaboratorSchema>;
