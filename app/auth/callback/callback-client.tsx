"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export function CallbackClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createBrowserSupabaseClient();
      const next = safeNext(params.get("next"));
      try {
        const code = params.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
          const access_token = hash.get("access_token");
          const refresh_token = hash.get("refresh_token");
          if (!access_token || !refresh_token) {
            throw new Error(hash.get("error_description") || "This sign-in link is missing its token. Request a new one.");
          }
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
        // 2026-09-29 Grok (Lyrixis Lead): first sign-in → create this person's own Apixis world agent
        // (server-side, idempotent). Capped at 7s so a slow Apixis.dev never blocks sign-in.
        await Promise.race([
          fetch("/api/apixis/world-agent", { cache: "no-store", credentials: "same-origin" }).catch(() => null),
          new Promise((resolve) => setTimeout(resolve, 7000)),
        ]);
        if (!cancelled) {
          router.replace(next);
          router.refresh();
        }
      } catch (e) {
        if (!cancelled) {
          setMessage(e instanceof Error ? e.message : "Sign-in failed");
          setTimeout(() => router.replace(`/login?error=auth_callback&next=${encodeURIComponent(next)}`), 1500);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [params, router]);

  return <p style={{ padding: 32 }}>{message}</p>;
}
