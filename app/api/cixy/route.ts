import { jsonError, HttpError } from "@/lib/errors";
import { assertRateLimit } from "@/lib/rate-limit";
import { askCixy, logCixyExchange, normalizeMessages } from "@/services/cixy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SESSION_RE = /^[a-zA-Z0-9_-]{8,64}$/;

// Health = configuration only. Pinging Anthropic here let anyone spend credits by reloading.
export async function GET() {
  const ready = Boolean(process.env.ANTHROPIC_API_KEY);
  return Response.json(
    { cixy: "Lyrixis native AI", provider: "anthropic", ready, ...(ready ? {} : { error: "API key not configured" }) },
    { status: ready ? 200 : 503 },
  );
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    await assertRateLimit("cixy", ip, 20, 10 * 60);
    let json: unknown;
    try {
      json = await request.json();
    } catch {
      throw new HttpError(400, "invalid_json", "Request body must be JSON.");
    }
    const body = json as { messages?: unknown; sessionId?: unknown };
    const messages = normalizeMessages(body.messages);
    if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
      throw new HttpError(400, "message_required", "Send at least one user message.");
    }
    const sessionId =
      typeof body.sessionId === "string" && SESSION_RE.test(body.sessionId) ? body.sessionId : "anon";

    const { reply, model, usedCatalog } = await askCixy(messages);
    await logCixyExchange(sessionId, messages[messages.length - 1].content, reply, model, usedCatalog);

    return Response.json({ reply, provider: "anthropic", model, usedCatalog });
  } catch (error) {
    return jsonError(error);
  }
}
