import { CIXY_SYSTEM_PROMPT } from "@/lib/cixy-prompt";
import { HttpError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchCatalog } from "@/services/catalog";

export interface CixyMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY = 10;
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const CATALOG_TOOL = {
  name: "search_catalog",
  description:
    "Search the Lyrixis public catalog (read-only). Matches title, artist, writers, year, ISRC, ISWC, UPC. Returns up to 8 records with title, artist, year, isrc, iswc, upc, writers, source, publicId. Use it whenever the user asks about a specific song, artist, identifier, or what is in the catalog.",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Free-text search: title, artist, writer, year, ISRC, ISWC, or UPC." },
    },
    required: ["query"],
  },
};

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: { query?: string } };

interface AnthropicResponse {
  content?: ContentBlock[];
  stop_reason?: string;
  model?: string;
  error?: { message?: string };
}

export function normalizeMessages(raw: unknown): CixyMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(-MAX_HISTORY)
    .map((item) => {
      const message = item as { role?: string; content?: unknown };
      return {
        role: message.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: String(message.content ?? "").slice(0, MAX_MESSAGE_LENGTH).trim(),
      };
    })
    .filter((message) => message.content.length > 0);
}

export function resolveModel(): string {
  const provider = (process.env.AI_PROVIDER ?? "anthropic").toLowerCase();
  const configured = process.env.AI_MODEL ?? process.env.ANTHROPIC_MODEL;
  if (provider === "anthropic" && configured && configured.startsWith("claude")) return configured;
  return DEFAULT_MODEL;
}

async function runCatalogSearch(query: string): Promise<string> {
  try {
    const rows = await searchCatalog(query);
    if (rows.length === 0) return JSON.stringify({ query, results: [], note: "No catalog matches." });
    return JSON.stringify({
      query,
      results: rows.slice(0, 8).map((row) => ({
        publicId: row.publicId,
        title: row.title,
        artist: row.artist,
        year: row.year,
        isrc: row.isrc,
        iswc: row.iswc,
        upc: row.upc,
        writers: row.writers,
        source: row.source,
        url: `/catalog/${row.publicId}`,
      })),
    });
  } catch {
    return JSON.stringify({ query, results: [], note: "Catalog unavailable right now." });
  }
}

async function callAnthropic(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: unknown }>
): Promise<AnthropicResponse> {
  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      system: CIXY_SYSTEM_PROMPT,
      max_tokens: 1100,
      tools: [CATALOG_TOOL],
      messages,
    }),
  });
  const data = (await response.json().catch(() => ({}))) as AnthropicResponse;
  if (!response.ok) {
    throw new HttpError(502, "cixy_upstream", data.error?.message ?? `Anthropic request failed (${response.status})`);
  }
  return data;
}

export async function askCixy(
  history: CixyMessage[]
): Promise<{ reply: string; model: string; usedCatalog: boolean }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new HttpError(503, "cixy_unconfigured", "Cixy is offline: ANTHROPIC_API_KEY is not configured.");
  }
  const model = resolveModel();
  const messages: Array<{ role: string; content: unknown }> = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let usedCatalog = false;
  for (let round = 0; round < 3; round += 1) {
    const data = await callAnthropic(apiKey, model, messages);
    const blocks = data.content ?? [];
    const toolUses = blocks.filter((b): b is Extract<ContentBlock, { type: "tool_use" }> => b.type === "tool_use");

    if (data.stop_reason !== "tool_use" || toolUses.length === 0) {
      const text = blocks
        .filter((b): b is Extract<ContentBlock, { type: "text" }> => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      if (!text) throw new HttpError(502, "cixy_empty", "Cixy returned no answer.");
      return { reply: text, model: data.model ?? model, usedCatalog };
    }

    usedCatalog = true;
    messages.push({ role: "assistant", content: blocks });
    const results = await Promise.all(
      toolUses.map(async (tool) => ({
        type: "tool_result",
        tool_use_id: tool.id,
        content: await runCatalogSearch(String(tool.input?.query ?? "").slice(0, 120)),
      }))
    );
    messages.push({ role: "user", content: results });
  }
  throw new HttpError(502, "cixy_loop", "Cixy could not finish that answer.");
}

export async function logCixyExchange(
  sessionId: string,
  userText: string,
  reply: string,
  model: string,
  usedCatalog: boolean
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("cixy_messages").insert([
      { session_id: sessionId, role: "user", content: userText.slice(0, 4000), model: null, used_catalog: false },
      { session_id: sessionId, role: "assistant", content: reply.slice(0, 8000), model, used_catalog: usedCatalog },
    ]);
  } catch {
    // Logging must never break the answer.
  }
}
