"use client";

import { useEffect, useState } from "react";

type State = { available: number | null; buy: string | null };

/**
 * The shared Apixis Wallet inside this site: the person's one Ixis balance and a "Buy Ixis" link
 * (goes to Apixis Wallet, comes back here with the Ixis). Style it with `className`.
 */
export function ApixisWalletChip({ className }: { className?: string }) {
  const [state, setState] = useState<State>({ available: null, buy: null });
  useEffect(() => {
    let cancelled = false;
    fetch("/api/wallet/balance", { cache: "no-store", credentials: "same-origin" })
      .then((response) => response.json().catch(() => null))
      .then((data) => {
        if (!cancelled && data) setState({ available: typeof data.available === "number" ? data.available : null, buy: data.buy ?? null });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <span className={className} style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <span>{state.available === null ? "Apixis Wallet" : `${state.available.toLocaleString()} Ixis`}</span>
      {state.buy && (
        <a href={state.buy} style={{ textDecoration: "underline" }}>
          Buy Ixis
        </a>
      )}
    </span>
  );
}
