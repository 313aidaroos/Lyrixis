import { describe, it, expect, vi, afterEach } from "vitest";
import { createElevenLabsProvider } from "../providers/elevenlabs";
import { providerFor } from "../providers";

afterEach(() => { vi.unstubAllGlobals(); delete process.env.ELEVENLABS_API_KEY; });

describe("ElevenLabs adapter (mocked HTTP)", () => {
  it("is off without ELEVENLABS_API_KEY and never falls back", async () => {
    const p = createElevenLabsProvider();
    expect(p.configured()).toBe(false);
    await expect(p.synthesize({ providerVoiceRef: "abc123", text: "hi", language: "ar" })).rejects.toMatchObject({ code: "not_configured" });
    expect(providerFor("unknown", { elevenlabs: p })).toBeNull();
  });
  it("synthesizes with the key header, records cost, and maps errors without leaking bodies", async () => {
    process.env.ELEVENLABS_API_KEY = "test-key-0123456789abcdef";
    const calls: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      if (url.includes("/v1/text-to-speech/bad")) return new Response("script echo: SECRET", { status: 422 });
      return new Response(new Uint8Array([0x49, 0x44, 0x33, 1, 2, 3]), { status: 200, headers: { "content-type": "audio/mpeg" } });
    }));
    const p = createElevenLabsProvider();
    expect(p.configured()).toBe(true);
    const r = await p.synthesize({ providerVoiceRef: "voice123", text: "مرحبا بكم ".repeat(100), language: "ar" });
    expect(calls[0].url).toMatch(/\/v1\/text-to-speech\/voice123/);
    expect((calls[0].init.headers as Record<string, string>)["xi-api-key"]).toBe("test-key-0123456789abcdef");
    expect(r.isDemo).toBe(false);
    expect(r.costUsdMicros).toBe(Math.ceil((r.chars / 1000) * 0.1 * 1_000_000));
    const err = await p.synthesize({ providerVoiceRef: "bad", text: "x", language: "ar" }).catch((e) => e);
    expect(err.code).toBe("http_422");
    expect(String(err.message)).not.toMatch(/SECRET/);
  });
});
