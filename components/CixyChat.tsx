"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const STARTERS = [
  "What LUFS should I master to for Spotify vs Apple Music?",
  "Explain ISRC vs ISWC and when I need each.",
  "What's in the Lyrixis catalog by Stephen Foster?",
  "Release timeline for a single with editorial pitching?",
];

function sessionId(): string {
  if (typeof window === "undefined") return "anon";
  const key = "cixy_session";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = `s_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    window.localStorage.setItem(key, id);
  }
  return id;
}

export function CixyChat({ tall = false }: { tall?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || pending) return;
    setError(null);
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setPending(true);
    try {
      const response = await fetch("/api/cixy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-10), sessionId: sessionId() }),
      });
      const json = (await response.json()) as { reply?: string; error?: { message?: string } };
      if (!response.ok || !json.reply) {
        throw new Error(
          response.status === 503
            ? "Cixy is offline right now (AI key not configured)."
            : json.error?.message ?? "Cixy could not answer."
        );
      }
      setMessages([...next, { role: "assistant", content: json.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cixy could not answer.");
    } finally {
      setPending(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(input);
  }

  return (
    <div className="flex h-full flex-col">
      <div className={`flex-1 space-y-3 overflow-y-auto px-4 py-4 ${tall ? "min-h-[460px]" : "min-h-[280px]"}`}>
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-ink-2">
              Hi, I&apos;m Cixy — Lyrixis&apos;s native AI. Mixing, mastering, beats, songwriting, metadata,
              distribution, royalties. I can also search the catalog. Ask me anything.
            </p>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => void send(starter)}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-left text-xs text-ink-2 transition hover:border-cyan/50 hover:text-white"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              message.role === "user"
                ? "ml-auto bg-gradient-to-r from-violet to-cyan text-white"
                : "border border-white/10 bg-white/5 text-ink"
            }`}
          >
            {message.content}
          </div>
        ))}
        {pending && (
          <div className="flex items-center gap-1 px-2 text-cyan" aria-label="Cixy is thinking">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="inline-block h-4 w-1 animate-pulse rounded bg-cyan"
                style={{ animationDelay: `${i * 120}ms` }}
              />
            ))}
          </div>
        )}
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <div ref={endRef} />
      </div>
      <form onSubmit={onSubmit} className="flex gap-2 border-t border-white/10 p-3">
        <input
          className="input py-2 text-sm"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask Cixy…"
          aria-label="Message Cixy"
          maxLength={2000}
        />
        <button className="btn-primary px-4 py-2 text-sm" type="submit" disabled={pending || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
