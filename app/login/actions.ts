"use server";

import { redirect } from "next/navigation";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

async function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase public env is missing");
  const jar = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list: Array<{ name: string; value: string; options: CookieOptions }>) => {
        for (const cookie of list) {
          jar.set(cookie.name, cookie.value, cookie.options);
        }
      },
    },
  });
}

/** Password sign-in (secondary option) */
export async function login(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const supabase = await client();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { message: error.message };
  redirect("/");
}

/** Magic link: the default way in. `next` is where the user was headed */
export async function magicLink(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const rawNext = String(form.get("next") ?? "/");
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  if (!email.includes("@")) return { message: "Enter your email." };
  const supabase = await client();
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://lyrixis.vercel.app";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${base}/auth/callback?next=${encodeURIComponent(`/set-password?next=${encodeURIComponent(next)}`)}`,
    },
  });
  if (error) return { message: error.message };
  return { message: `Check ${email} — the sign-in link is on its way. First time? You will choose a password after it opens.` };
}

/** Called from /set-password after a magic-link sign-in */
export async function setPassword(form: FormData) {
  const password = String(form.get("password") ?? "");
  const rawNext = String(form.get("next") ?? "/");
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  if (password.length < 8) return { message: "Password must be at least 8 characters." };
  const supabase = await client();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { message: "Your sign-in link expired. Request a new one." };
  const { error } = await supabase.auth.updateUser({ password, data: { password_set: true } });
  if (error) return { message: error.message };
  redirect(next);
}
