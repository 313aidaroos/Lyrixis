import { jsonError, HttpError } from "@/lib/errors";
import { assertCatalogIngestRateLimit } from "@/lib/rate-limit";
import { ingestCatalogRecording, searchCatalog } from "@/services/catalog";
import { toIngestInput } from "@/lib/catalog-ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";
    const results = await searchCatalog(q);
    return Response.json({ query: q, count: results.length, results });
  } catch (error) {
    return jsonError(error);
  }
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

    const recording = await ingestCatalogRecording(toIngestInput(json));
    return Response.json({ ok: true, recording }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
