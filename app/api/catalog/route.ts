import { jsonError } from "@/lib/errors";
import { searchCatalog } from "@/services/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q");
    const results = await searchCatalog(q);
    return Response.json({ query: q ?? "", results });
  } catch (error) {
    return jsonError(error);
  }
}
