// Change note (Claude, Sep 2026): New. Covers the paid path: upload validation → Wallet unlock → exports. See docs/LAUNCH_NOTES.md.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { validateUpload } from "@/lib/audio";
import { buildExport } from "@/services/exports";
import type { JsonExportPayload } from "@/types";

const wav = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WAVE"), Buffer.alloc(16)]);
const mp3 = Buffer.concat([Buffer.from("ID3"), Buffer.alloc(20)]);

describe("upload validation", () => {
  it("accepts real audio by its magic bytes", () => {
    expect(validateUpload({ filename: "a.wav", declaredMime: "audio/wav", bytes: wav })).toEqual({ mime: "audio/wav", extension: "wav" });
    expect(validateUpload({ filename: "a.mp3", declaredMime: "audio/mpeg", bytes: mp3 }).extension).toBe("mp3");
  });

  it("rejects empty files, non-audio renamed as audio, and unsupported types", () => {
    expect(() => validateUpload({ filename: "a.mp3", declaredMime: "audio/mpeg", bytes: Buffer.alloc(0) })).toThrow(/empty/);
    expect(() => validateUpload({ filename: "a.mp3", declaredMime: "audio/mpeg", bytes: Buffer.from("this is not audio at all") })).toThrow(/magic bytes/);
    expect(() => validateUpload({ filename: "a.exe", declaredMime: "application/x-msdownload", bytes: wav })).toThrow(/Unsupported/);
  });
});

describe("exports", () => {
  const payload: JsonExportPayload = {
    publicId: "trk_1",
    title: "Song",
    artist: "Artist",
    durationSeconds: 10,
    language: "en",
    dialect: null,
    confidenceBand: null,
    transcriptionConfidence: 0.9,
    lines: [
      { lineIndex: 0, text: "First line", startMs: 1500, endMs: 3000, confidence: 0.9, isLowConfidence: false, words: [] },
      { lineIndex: 1, text: "Second line", startMs: 61_250, endMs: 63_000, confidence: 0.8, isLowConfidence: false, words: [] },
    ],
  };

  it("TXT is one line per lyric", () => {
    const out = buildExport("txt", payload);
    expect(out.filename).toBe("trk_1.txt");
    expect(out.body).toBe("First line\nSecond line\n");
  });

  it("SRT has numbered cues with hh:mm:ss,mmm timing", () => {
    const out = buildExport("srt", payload);
    expect(out.filename).toBe("trk_1.srt");
    expect(out.body).toContain("1\n00:00:01,500 --> 00:00:03,000\nFirst line");
    expect(out.body).toContain("2\n00:01:01,250 --> 00:01:03,000\nSecond line");
  });

  it("LRC has the title/artist header and [mm:ss.xx] tags", () => {
    const out = buildExport("lrc", payload);
    expect(out.body).toMatch(/^\[ti:Song\]\n\[ar:Artist\]\n\[by:Lyrixis\]\n/);
    expect(out.body).toContain("[00:01.50]First line");
    expect(out.body).toContain("[01:01.25]Second line");
  });

  it("JSON round-trips the payload", () => {
    expect(JSON.parse(buildExport("json", payload).body)).toEqual(payload);
  });
});

describe("Wallet unlock (reserve → provision → capture)", () => {
  type Wallet = typeof import("@/lib/apixis-wallet");
  let wallet: Wallet;
  const calls: string[] = [];

  beforeAll(async () => {
    vi.stubEnv("WALLET_API_KEY", "apx_test_" + "x".repeat(32));
    vi.resetModules();
    wallet = await import("@/lib/apixis-wallet");
  });

  afterEach(() => {
    calls.length = 0;
    vi.unstubAllGlobals();
  });

  /** A fake Wallet: each path answers with the given status and body. */
  function fakeWallet(routes: Record<string, [number, unknown]>) {
    vi.stubGlobal("fetch", async (url: string) => {
      const path = new URL(url).pathname;
      calls.push(path);
      const [status, body] = routes[path] ?? [404, { error: "no route" }];
      return new Response(JSON.stringify(body), { status });
    });
  }
  const held = { reservationId: "r1", status: "held", productKey: "lyrixis.track.unlock", ixis: 300 };

  it("captures only after the unlock is recorded", async () => {
    fakeWallet({
      "/api/v1/reservations": [200, held],
      "/api/v1/reservations/r1/capture": [200, { reservationId: "r1", status: "captured", receiptId: "rcpt_1" }],
    });
    const provision = vi.fn(async () => ({ unlockId: "u1" }));
    const res = await wallet.redeem({ ownerEmail: "a@b.co", productKey: "lyrixis.track.unlock", idempotencyKey: "k1", provision });
    expect(res).toEqual({ ok: true, receiptId: "rcpt_1", result: { unlockId: "u1" } });
    expect(calls).toEqual(["/api/v1/reservations", "/api/v1/reservations/r1/capture"]);
  });

  it("releases the hold (no charge) when recording the unlock fails", async () => {
    fakeWallet({ "/api/v1/reservations": [200, held], "/api/v1/reservations/r1/release": [200, { status: "released" }] });
    await expect(
      wallet.redeem({ ownerEmail: "a@b.co", productKey: "lyrixis.track.unlock", idempotencyKey: "k2", provision: async () => { throw new Error("db down"); } })
    ).rejects.toThrow("db down");
    expect(calls).toEqual(["/api/v1/reservations", "/api/v1/reservations/r1/release"]);
  });

  it("takes the unlock back, then releases, when capture fails", async () => {
    fakeWallet({
      "/api/v1/reservations": [200, held],
      "/api/v1/reservations/r1/capture": [500, { error: "capture failed" }],
      "/api/v1/reservations/r1/release": [200, { status: "released" }],
    });
    const unprovision = vi.fn(async () => {});
    await expect(
      wallet.redeem({ ownerEmail: "a@b.co", productKey: "lyrixis.track.unlock", idempotencyKey: "k3", provision: async () => ({ unlockId: "u3" }), unprovision })
    ).rejects.toThrow("capture failed");
    expect(unprovision).toHaveBeenCalledWith(held, { unlockId: "u3" });
    expect(calls.at(-1)).toBe("/api/v1/reservations/r1/release");
  });

  it("reports insufficient Ixis without provisioning", async () => {
    fakeWallet({
      "/api/v1/reservations": [402, { error: "Not enough Ixis" }],
      "/api/v1/quotes": [200, { xp: 300 }],
    });
    const provision = vi.fn();
    const res = await wallet.redeem({ ownerEmail: "a@b.co", productKey: "lyrixis.track.unlock", idempotencyKey: "k4", provision });
    expect(res).toMatchObject({ ok: false, insufficient: true, needed: 300 });
    expect(provision).not.toHaveBeenCalled();
  });
});
