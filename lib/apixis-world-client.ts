"use client";
// One shared GET /api/apixis/world-agent per page load (the first call may create the person's agent),
// used by the dashboard welcome card and the AppNav world link. Grok (Lyrixis Lead), 2026-09-29.

export type WorldAgentState = {
  ok: boolean;
  status: "ready" | "invite";
  agentName: string | null;
  showWelcome: boolean;
  enterUrl: string;
};

let pending: Promise<WorldAgentState | null> | null = null;

export function fetchWorldAgent(): Promise<WorldAgentState | null> {
  if (!pending) {
    pending = fetch("/api/apixis/world-agent", { cache: "no-store", credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((v) => (v?.ok ? (v as WorldAgentState) : null))
      .catch(() => null);
  }
  return pending;
}
