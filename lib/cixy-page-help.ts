/**
 * Page-by-page directions from Cixy (ported from Socixis `CixyPageHelp`, PR #76; 2026-10-05, Grok).
 * Steps describe what the Lyrixis code on each page actually does. Keep them plain and short.
 * Cixy's picture is the shared family photo, never an SVG stand-in. No religious wording.
 */
export const CIXY_AVATAR_SRC = "/cixy/cixy-combo-a-avatar.webp";

export type CixyPageHelpEntry = {
  title: string;
  /** 3–6 plain-language steps for this page. */
  steps: string[];
  tips: string[];
  /** One-tap questions that open the Cixy chat with the question filled in. */
  suggestions: string[];
};

export const PAGE_HELP: Record<string, CixyPageHelpEntry> = {
  "/": {
    title: "Lyrixis home",
    steps: [
      "Type a song, artist, writer or ISRC in the search box and press Search the catalog, or tap one of the Examples.",
      "Scroll to the live demo to see how a track becomes synced lyrics with word timings, language and confidence.",
      "The pricing calculator further down shows the per-song rate in Ixis for any number of songs (100 Ixis = $1).",
      "To process your own song, sign in and use Upload. New accounts are created with Apixis ID.",
      "Buy Ixis in the top bar opens the Apixis Wallet. Lyrixis takes no card payments itself.",
    ],
    tips: ["The round ◈ button at the bottom right opens a full chat with me."],
    suggestions: ["What can Lyrixis do with my song?", "How much does one song cost?", "How do I upload a track?"],
  },
  "/catalog": {
    title: "Catalog search",
    steps: [
      "Search by title, artist, writer, year, ISRC or ISWC and press Search.",
      "Results are the public seed catalog (public-domain or original works). Commercial tracks stay licensed.",
      "Click a recording to open its page with metadata and lyrics on file.",
      "On a recording page, Redeem · 300 Ixis unlocks its TXT, LRC and JSON exports for your account.",
    ],
    tips: ["Searching is free. You only spend Ixis when you press Redeem."],
    suggestions: ["Which tracks are in the catalog right now?", "What is the difference between ISRC and ISWC?"],
  },
  "/catalog/": {
    title: "Recording page",
    steps: [
      "The top shows title, artist and IDs (ISRC, ISWC, UPC, writers) on file.",
      "Press Redeem · 300 Ixis to unlock this recording for your account. You need to be signed in.",
      "If your Wallet is short, you're sent to the Apixis Wallet to buy Ixis, then back here.",
      "Once unlocked, download the lyrics as .txt, .lrc or .json from the same card.",
    ],
    tips: ["Redeeming the same recording again doesn't charge you twice."],
    suggestions: ["What do I get when I redeem?", "What is an LRC file?"],
  },
  "/add": {
    title: "Add a recording",
    steps: [
      "Fill in Title and Artist. Album, year, ISRC, ISWC, UPC and writers are optional but make the record searchable.",
      "Pick the lyrics license: Original work I wrote, or Public domain. Commercial lyrics are not accepted.",
      "Paste the lyrics and save. You land on the new recording's page.",
      "For many songs, use Bulk ingest below: paste CSV with the header shown, one recording per row.",
      "Metadata-only CSV rows need an ISRC, ISWC or UPC.",
    ],
    tips: ["ISRC looks like CC-XXX-YY-NNNNN and ISWC like T-000.000.001-0."],
    suggestions: ["How do I format the CSV?", "Can I add lyrics I didn't write?"],
  },
  "/pricing": {
    title: "Pricing",
    steps: [
      "Move the slider to the number of songs you plan to process.",
      "The calculator shows the per-song rate and the total in Ixis (100 Ixis = $1). One song is 300 Ixis.",
      "Volume rates apply automatically as the count grows. 1,000,000+ songs is a custom enterprise price.",
      "Buy Ixis opens the Apixis Wallet. Ixis is the only way to pay on Lyrixis.",
    ],
    tips: ["New Apixis IDs get 1,000 free Ixis once, in the shared Apixis Wallet."],
    suggestions: ["How much would 500 songs cost?", "Where do I buy Ixis?"],
  },
  "/cixy": {
    title: "Chat with Cixy",
    steps: [
      "Type a question in the chat box, or tap a starter question.",
      "I can search the Lyrixis catalog live and cite records by title, ISRC and writers.",
      "Ask about mixing, mastering loudness, metadata, splits, distribution or royalties. I answer with real numbers.",
      "I can't see your account, charge Ixis or change anything for you.",
    ],
    tips: ["No legal or tax advice. I'll tell you what to ask a lawyer or accountant."],
    suggestions: ["What LUFS should I master for Spotify?", "Explain ISRC vs ISWC and splits."],
  },
  "/feed": {
    title: "Family feed",
    steps: [
      "This is the shared Socixis feed with posts from every Apixis company.",
      "Scroll to read. Sign in with your Apixis ID to post, follow, comment and tip in Ixis.",
      "Tips come from your Apixis Wallet balance.",
    ],
    tips: [],
    suggestions: ["What is the family feed?", "How do tips work?"],
  },
  "/companies": {
    title: "Apixis companies",
    steps: [
      "Each card is one company in the Apixis family, with a one-line description.",
      "Press Visit site on a card to open that company in a new tab.",
      "One Apixis ID and one Apixis Wallet work across all of them.",
    ],
    tips: [],
    suggestions: ["What is Apixis ID?", "Which company does what?"],
  },
  "/vision": {
    title: "Vision & FAQ",
    steps: [
      "The top explains why Lyrixis exists and where it's going.",
      "Open any question in the FAQ below to read the answer.",
      "Still stuck? Ask me, or email lyrixis@apixis.dev.",
    ],
    tips: [],
    suggestions: ["Is search free?", "What will Lyrixis do next?"],
  },
  "/updates": {
    title: "Updates",
    steps: ["This page lists what shipped on Lyrixis, newest first.", "The catalog itself is the best place to see what's new."],
    tips: [],
    suggestions: ["What's new on Lyrixis?"],
  },
  "/waitlist": {
    title: "Early access",
    steps: [
      "Enter your full name and work email. Company or artist name is optional.",
      "Submit to join the early-access list. The page shows how many people have joined.",
      "We'll email you from lyrixis@apixis.dev when your access opens.",
    ],
    tips: [],
    suggestions: ["What does early access include?"],
  },
  "/support": {
    title: "Support",
    steps: [
      "Enter your email so we can reply.",
      "Add a short subject and pick a category: General, Bug Report, Feature Request or Billing.",
      "Describe what happened, including the page and what you pressed, then send.",
      "Replies come from lyrixis@apixis.dev.",
    ],
    tips: ["For Ixis balance questions, the Apixis Wallet holds the record of every charge."],
    suggestions: ["I was charged but the track is still locked", "How do I report a bug?"],
  },
  "/login": {
    title: "Sign in",
    steps: [
      "Press Log in with Apixis ID. One Apixis ID works on every Apixis site.",
      "Existing email accounts can use Magic link (we email a sign-in link) or Password.",
      "Forgot your password? Choose Password, then Forgot password?, and open the reset link we email you.",
      "The sign-in help card on this page can answer questions about magic links and Apixis ID.",
    ],
    tips: ["Nobody from Lyrixis will ever ask for your password."],
    suggestions: ["I forgot my password", "What is Apixis ID?"],
  },
  "/signup": {
    title: "Create your account",
    steps: [
      "New accounts are created with Apixis ID: press Log in with Apixis ID.",
      "Sign up once on the Apixis ID page, then you come back here signed in.",
      "Every new Apixis ID gets 1,000 free Ixis once, in the shared Apixis Wallet.",
    ],
    tips: [],
    suggestions: ["What is Apixis ID?", "Is it free to start?"],
  },
  "/set-password": {
    title: "Choose a password",
    steps: [
      "Type a new password and confirm it.",
      "Save, and you're signed in with the new password.",
      "Reset links expire after an hour and work once. If yours expired, request a new one from Sign in.",
    ],
    tips: [],
    suggestions: ["My reset link expired"],
  },
  "/dashboard": {
    title: "Your dashboard",
    steps: [
      "Your tracks table lists every song you uploaded, with status, language, access and confidence.",
      "Click a title to open its synced lyrics. Status moves from Queued to Completed (or Needs review) on its own.",
      "Paid shows Preview until you unlock a track for 300 Ixis, then Unlocked.",
      "Upload a track (top right) adds a new song.",
      "The Ixis pill in the top bar is your Apixis Wallet balance. Buy Ixis tops it up.",
    ],
    tips: ["Confidence is how sure the transcription is. Low-confidence tracks are marked for review."],
    suggestions: ["How do I upload a song?", "What does Needs review mean?", "Where is my Ixis balance?"],
  },
  "/upload": {
    title: "Upload a song",
    steps: [
      "Choose an audio file: MP3, WAV, FLAC, M4A or OGG, up to 100 MB and 12 minutes.",
      "Title and Artist are optional. If you leave them empty, Lyrixis reads them from the file's tags.",
      "Tick the box confirming you have the rights to this recording. Lyrixis stores that confirmation.",
      "Press Upload and process. You go straight to the track page while the lyrics are made.",
    ],
    tips: ["Processing is free. You only pay 300 Ixis if you unlock the full lyrics."],
    suggestions: ["Which file format is best?", "How long does processing take?", "What does the rights box mean?"],
  },
  "/tracks/": {
    title: "Your track",
    steps: [
      "The status badge updates every few seconds until the lyrics are Completed (or Needs review).",
      "Press play. The current line highlights, and you can click any word to jump the audio there.",
      "Before unlocking you see the first 30 seconds. Press Unlock full lyrics · 300 Ixis to pay from your Apixis Wallet.",
      "After unlocking, use Correct to fix any line (it saves when you click away) and Exports for TXT, SRT, LRC or JSON.",
      "Amber marks show low-confidence lines and words worth checking.",
    ],
    tips: ["If your Wallet is short, you're sent to buy Ixis and brought back to this track."],
    suggestions: ["What do the amber marks mean?", "Which export do I need for Spotify or Apple Music?"],
  },
  "/voices": {
    title: "Lyrixis Voices",
    steps: [
      "Lyrixis Voices licenses Arabic and bilingual voices from creators who have agreed to it.",
      "It is opening soon and invite-only. Join the waitlist to hear when invites open.",
    ],
    tips: [],
    suggestions: ["What is Lyrixis Voices?"],
  },
};

const FALLBACK: CixyPageHelpEntry = {
  title: "Lyrixis",
  steps: [
    "Use the top menu to reach the catalog, pricing and your dashboard.",
    "Signed in? Dashboard lists your tracks and Upload adds a new song.",
    "Ask me anything about this page with Ask Cixy below.",
  ],
  tips: [],
  suggestions: ["What can you do?", "How do I upload a song?"],
};

/** Exact route first, then the longest prefix ending in "/" (e.g. "/tracks/" for /tracks/trx_…). */
export function helpForPath(pathname: string): { route: string; entry: CixyPageHelpEntry } {
  const path = (pathname || "/").split("?")[0].replace(/(.)\/$/, "$1") || "/";
  if (PAGE_HELP[path]) return { route: path, entry: PAGE_HELP[path] };
  const prefix = Object.keys(PAGE_HELP)
    .filter((route) => route.endsWith("/") && route !== "/" && path.startsWith(route))
    .sort((a, b) => b.length - a.length)[0];
  if (prefix) return { route: prefix, entry: PAGE_HELP[prefix] };
  const section = Object.keys(PAGE_HELP)
    .filter((route) => route !== "/" && !route.endsWith("/") && path.startsWith(`${route}/`))
    .sort((a, b) => b.length - a.length)[0];
  if (section) return { route: section, entry: PAGE_HELP[section] };
  return { route: path, entry: FALLBACK };
}

/** Window event the page help fires; CixyWidget opens and fills in the question. */
export const CIXY_ASK_EVENT = "lyrixis:cixy-ask";
export type CixyAskDetail = { question: string; handled: boolean };
