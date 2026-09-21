/**
 * Apixis Wallet is the only place cash becomes Ixis (Stripe webhook on Wallet).
 * Lyrixis links out to buy, then spends or redeems Ixis later. No Checkout here.
 *
 * Deep link follows ApixisWallet docs/WALLET_EMBED.md:
 *   /buy?product=lyrixis&return_url=<allowlisted https URL>
 * Callers should not build this URL themselves.
 */

export const WALLET_APP_URL = "https://apixis-wallet.vercel.app";

/** Product slug Wallet receives as `product`. Host form `lyrixis.vercel.app` is the return host. */
export const WALLET_PRODUCT = "lyrixis";

/** @deprecated Use WALLET_PRODUCT. Kept so existing imports still name the Lyrixis slug. */
export const WALLET_ORIGIN = WALLET_PRODUCT;

/**
 * Allowlisted post-purchase returns. Every entry is https://lyrixis.vercel.app.
 * Dashboard is the default: it is the logged-in app, where Ixis are spent.
 * Pricing stays a quote page, not the return landing.
 * Cixy returns to the customizer after a Wallet buy.
 */
export const WALLET_RETURN_URLS = {
  dashboard: "https://lyrixis.vercel.app/dashboard",
  pricing: "https://lyrixis.vercel.app/pricing",
  cixy: "https://lyrixis.vercel.app/cixy",
} as const;

export type WalletReturnUrl = (typeof WALLET_RETURN_URLS)[keyof typeof WALLET_RETURN_URLS];

export const DEFAULT_WALLET_RETURN_URL: WalletReturnUrl = WALLET_RETURN_URLS.dashboard;

const ALLOWED_RETURN_HOST = "lyrixis.vercel.app";
const ALLOWED_RETURN_URLS = new Set<string>(Object.values(WALLET_RETURN_URLS));

/** Buy deep link: Wallet /buy with product=lyrixis and an allowlisted return_url. */
export function walletBuyUrl(returnUrl: WalletReturnUrl = DEFAULT_WALLET_RETURN_URL): string {
  if (!ALLOWED_RETURN_URLS.has(returnUrl)) {
    throw new Error("return_url is not on the Lyrixis Wallet allowlist.");
  }

  const parsed = new URL(returnUrl);
  if (parsed.protocol !== "https:" || parsed.hostname !== ALLOWED_RETURN_HOST) {
    throw new Error("return_url host is not allowlisted for Lyrixis.");
  }

  const url = new URL("/buy", WALLET_APP_URL);
  url.searchParams.set("product", WALLET_PRODUCT);
  url.searchParams.set("return_url", returnUrl);
  return url.toString();
}

export const WALLET_BUY_URL = walletBuyUrl();
