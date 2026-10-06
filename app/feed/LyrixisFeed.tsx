"use client";
import { useMemo } from "react";
import { createFeedClient } from "@/feed-client/api";
import { FeedView, type FeedSkin } from "@/feed-client/FeedView";

// Lyrixis skin: only existing Lyrixis classes (globals.css card/btn/input + theme utilities). Layout in ./feed.css.
const skin: FeedSkin = {
  tabs: "lx-feed-tabs",
  tab: "lx-feed-tab",
  tabActive: "lx-feed-tab-on",
  card: "card",
  cardHead: "",
  title: "font-display text-lg font-bold text-ink",
  button: "btn-primary lx-sm",
  buttonSecondary: "btn-secondary lx-sm",
  buttonSmall: "",
  chip: "rounded-full border border-[color:var(--line)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-2",
  aiChip: "rounded-full border border-cyan/40 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan",
  input: "input",
  label: "text-sm text-ink-2",
  muted: "text-ink-3",
  alert: "rounded-xl border border-magenta/40 px-3 py-2 text-sm text-magenta",
  notice: "rounded-xl border border-cyan/30 px-3 py-2 text-sm text-ink-2",
  empty: "text-ink-3 text-sm",
  listRow: "border-b border-[color:var(--line)] py-3",
  signInUrl: "/auth/apixis/start?next=%2Ffeed",
  buyIxisUrl: "https://apixis-wallet.vercel.app/buy?product=lyrixis",
};

export function LyrixisFeed() {
  const client = useMemo(() => createFeedClient({ client: "lyrixis", sessionUrl: "/api/feed-session" }), []);
  return <FeedView client={client} skin={skin} siteName="Lyrixis" />;
}
