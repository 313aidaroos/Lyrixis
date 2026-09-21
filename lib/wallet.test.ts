import { describe, expect, it } from "vitest";
import {
  DEFAULT_WALLET_RETURN_URL,
  WALLET_APP_URL,
  WALLET_BUY_URL,
  WALLET_ORIGIN,
  WALLET_PRODUCT,
  WALLET_RETURN_URLS,
  walletBuyUrl,
} from "@/lib/wallet";

describe("walletBuyUrl", () => {
  it("builds the Wallet buy link with product and the dashboard return", () => {
    const url = new URL(walletBuyUrl());

    expect(url.origin).toBe(WALLET_APP_URL);
    expect(url.pathname).toBe("/buy");
    expect(url.searchParams.get("product")).toBe(WALLET_PRODUCT);
    expect(url.searchParams.get("product")).toBe("lyrixis");
    expect(url.searchParams.get("product")).toBe(WALLET_ORIGIN);
    expect(url.searchParams.get("origin")).toBeNull();
    expect(url.searchParams.get("return_url")).toBe(WALLET_RETURN_URLS.dashboard);
    expect(url.searchParams.get("return_url")).toBe(DEFAULT_WALLET_RETURN_URL);
    expect(WALLET_BUY_URL).toBe(url.toString());
  });

  it("accepts pricing and cixy returns and rejects anything else", () => {
    const pricing = new URL(walletBuyUrl(WALLET_RETURN_URLS.pricing));
    expect(pricing.searchParams.get("return_url")).toBe("https://lyrixis.vercel.app/pricing");

    const cixy = walletBuyUrl(WALLET_RETURN_URLS.cixy);
    expect(cixy).toBe(
      "https://apixis-wallet.vercel.app/buy?product=lyrixis&return_url=" +
        encodeURIComponent("https://lyrixis.vercel.app/cixy")
    );

    expect(() => walletBuyUrl("https://evil.example/steal" as never)).toThrow(/allowlist/);
  });

  it("keeps every return URL on https://lyrixis.vercel.app", () => {
    for (const value of Object.values(WALLET_RETURN_URLS)) {
      const url = new URL(value);
      expect(url.protocol).toBe("https:");
      expect(url.hostname).toBe("lyrixis.vercel.app");
      const buy = new URL(walletBuyUrl(value));
      expect(buy.searchParams.get("return_url")).toBe(value);
    }
  });
});
