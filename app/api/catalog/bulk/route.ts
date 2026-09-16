import { jsonError, HttpError } from "@/lib/errors";
import { assertCatalogIngestRateLimit } from "@/lib/rate-limit";
import { parseCsvRecords } from "@/lib/catalog-csv";
import { toIngestInput } from "@/lib/catalog-ingest";
import { ingestCatalogBatch, type CatalogIngestInput } from "@/services/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

function asRecordings(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const body = payload as { recordings?: unknown; csv?: unknown; text?: unknown };
    if (Array.isArray(body.recordings)) return body.recordings;
    const csv = typeof body.csv === "string" ? body.csv : typeof body.text === "string" ? body.text : null;
    if (csv) return parseCsvRecords(csv);
  }
  throw new HttpError(400, "invalid_body", "Send { recordings: [...] } or { csv: \"...\" }.");
}

export async function POST(request: Request) {
  try {
    await assertCatalogIngestRateLimit(clientIp(request));

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      throw new HttpError(400, "invalid_json", "Request body must be JSON.");
    }

    const rows = asRecordings(json);
    const inputs: CatalogIngestInput[] = [];
    const parseErrors: { index: number; title: string | null; message: string }[] = [];

    rows.forEach((row, index) => {
      try {
        inputs.push(toIngestInput(row));
      } catch (error) {
        parseErrors.push({
          index,
          title: row && typeof row === "object" && "title" in row ? String((row as { title?: string }).title ?? "") : null,
          message: error instanceof HttpError ? error.message : "Invalid row.",
        });
      }
    });

    if (inputs.length === 0 && parseErrors.length > 0) {
      return Response.json({ ok: false, created: [], errors: parseErrors }, { status: 400 });
    }

    const result = await ingestCatalogBatch(inputs);
    const errors = [...parseErrors, ...result.errors];
    const status = result.created.length > 0 ? 201 : 400;
    return Response.json(
      {
        ok: result.created.length > 0,
        created: result.created.map((recording) => ({
          publicId: recording.publicId,
          title: recording.title,
          isrc: recording.isrc,
          iswc: recording.iswc,
          upc: recording.upc,
        })),
        errors,
      },
      { status }
    );
  } catch (error) {
    return jsonError(error);
  }
}
