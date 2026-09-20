"use client";

import { useState } from "react";
import { LISTEN_SHELF } from "@/lib/listenShelf";

export function ListenDesk() {
  const [id, setId] = useState<string>(LISTEN_SHELF[0].id);
  const book = LISTEN_SHELF.find((b) => b.id === id) ?? LISTEN_SHELF[0];
  const [busy, setBusy] = useState(false);

  function speak() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(book.text);
    u.rate = 0.92;
    u.lang = "en-US";
    u.onstart = () => setBusy(true);
    u.onend = () => setBusy(false);
    window.speechSynthesis.speak(u);
  }

  return (
    <main style={{ minHeight: "100dvh", background: "#07080c", color: "#ece7dc", padding: "48px 20px" }}>
      <p style={{ letterSpacing: ".28em", fontSize: 11, color: "#c4a35a" }}>LYRIXIS / LISTEN</p>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: 42 }}>Read along</h1>
      <p style={{ maxWidth: 640, color: "#9a9588" }}>
        A book we have rights to, spoken by a floor voice. Amazon, Audible, and Kindle
        files are not imported. Those need a publisher deal. Gutenberg and author-cleared
        manuscripts are the shelf for now.
      </p>
      <label style={{ display: "block", marginTop: 28 }}>
        Title
        <select
          value={id}
          onChange={(e) => setId(e.target.value)}
          style={{ display: "block", marginTop: 8, padding: 10, width: "min(420px, 100%)" }}
        >
          {LISTEN_SHELF.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>
      </label>
      <p style={{ fontSize: 13, color: "#6f6a60" }}>
        {book.rights} · {book.source} · voice {book.voiceId}
      </p>
      <article
        style={{
          marginTop: 24,
          maxWidth: 720,
          lineHeight: 1.7,
          fontSize: 18,
          border: "1px solid #222",
          padding: 24,
          borderRadius: 16,
        }}
      >
        {book.text}
      </article>
      <button
        type="button"
        onClick={speak}
        style={{
          marginTop: 20,
          padding: "12px 20px",
          borderRadius: 999,
          border: 0,
          background: "#c8ff63",
          color: "#111",
        }}
      >
        {busy ? "Speaking…" : "Hear this page"}
      </button>
      <p style={{ marginTop: 16, fontSize: 13 }}>
        Full titles and marketplace voices redeem at{" "}
        <a href="https://apixis-wallet.vercel.app" style={{ color: "#c8ff63" }}>
          Apixis Wallet
        </a>
        . Listen hours will burn XP after Stripe is live.
      </p>
    </main>
  );
}
