"use client";

import { useEffect, useState } from "react";

type Voice = {
  id: string;
  name: string;
  owner: string;
  vibe: string;
  xp: number;
  featured: boolean;
};

export function VoiceFloor() {
  const [voices, setVoices] = useState<Voice[]>([]);
  useEffect(() => {
    fetch("/api/voices")
      .then((r) => r.json())
      .then((d) => setVoices(d.voices ?? []))
      .catch(() => setVoices([]));
  }, []);
  return (
    <main style={{ minHeight: "100dvh", background: "#07080c", color: "#ece7dc", padding: "48px 20px" }}>
      <p style={{ letterSpacing: ".28em", fontSize: 11, color: "#c4a35a" }}>LYRIXIS / VOICE FLOOR</p>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: 42, margin: "12px 0" }}>Voices for sale</h1>
      <p style={{ maxWidth: 560, color: "#9a9588" }}>
        Creators list a licensed voice. Featured slot rotates every six hours.
        Buy in Apixis Wallet — 1,000 XP ($10). Cixy’s own voice is never listed.
      </p>
      <p style={{ marginTop: 16, fontSize: 13, color: "#7d786c" }}>
        You must own the voice or have written consent. Clones without consent are rejected.
      </p>
      <div style={{ display: "grid", gap: 16, marginTop: 36, maxWidth: 720 }}>
        {voices.map((v) => (
          <article
            key={v.id}
            style={{
              border: v.featured ? "1px solid #c4a35a" : "1px solid #222",
              padding: 20,
              borderRadius: 16,
              background: "#101218",
            }}
          >
            {v.featured && (
              <small style={{ color: "#c4a35a", letterSpacing: ".2em" }}>NOW ROTATING</small>
            )}
            <h2 style={{ margin: "8px 0 4px" }}>{v.name}</h2>
            <p style={{ color: "#9a9588", margin: 0 }}>{v.vibe}</p>
            <p style={{ fontSize: 13, color: "#6f6a60" }}>{v.owner} · {v.xp.toLocaleString()} XP</p>
            <a href="https://apixis-wallet.vercel.app" style={{ color: "#c8ff63" }}>
              Redeem in Wallet →
            </a>
          </article>
        ))}
      </div>
    </main>
  );
}
