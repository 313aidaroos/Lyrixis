import { jsonError, HttpError } from "@/lib/errors";
import { askCixy, logCixyExchange, normalizeMessages } from "@/services/cixy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SESSION_RE = /^[a-zA-Z0-9_-]{8,64}$/;

export async function GET() {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ cixy: "Lyrixis native AI", provider: "anthropic", ready: false, error: "API key not configured" }, { status: 503 });
    }

    // Real health check: ping Anthropic with minimal request
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      }),
    });

    const ready = response.ok;
    return Response.json({ 
      cixy: "Lyrixis native AI", 
      provider: "anthropic", 
      ready,
      status: response.status,
    }, { status: ready ? 200 : 503 });
  } catch (error) {
    return Response.json({ 
      cixy: "Lyrixis native AI", 
      provider: "anthropic", 
      ready: false, 
      error: error instanceof Error ? error.message : 'Health check failed',
    }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
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
