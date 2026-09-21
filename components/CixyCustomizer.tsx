"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { CixySignature } from "@/components/CixySignature";
import {
  CIXY_LOOK_STORAGE_KEY,
  CIXY_MOODS,
  CIXY_OPTION_GROUPS,
  CIXY_WARDROBE_SLOTS,
  type CixyGroupId,
  type CixyLook,
  type CixyMoodId,
  type CixyOption,
  cixyOption,
  defaultCixyLook,
  readStoredCixyLook,
} from "@/lib/cixy-customizer";
import { WALLET_RETURN_URLS, walletBuyUrl } from "@/lib/wallet";

const BUY_HREF = walletBuyUrl(WALLET_RETURN_URLS.cixy);

function WalletActions() {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <a href={BUY_HREF} className="btn-secondary px-3 py-1.5 text-xs">
        Buy Ixis
      </a>
      <a href={BUY_HREF} className="text-xs text-cyan underline-offset-2 hover:underline">
        Unlock in Wallet
      </a>
    </div>
  );
}

function includedNames(look: CixyLook, groups: readonly CixyGroupId[]) {
  return groups
    .map((groupId) => cixyOption(groupId, look[groupId])?.name ?? "Signature")
    .join(" · ");
}

export function CixyCustomizer({ compact = false }: { compact?: boolean }) {
  const [look, setLook] = useState<CixyLook>(defaultCixyLook);
  const [mood, setMood] = useState<CixyMoodId>("smile");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLook(readStoredCixyLook(window.localStorage.getItem(CIXY_LOOK_STORAGE_KEY)));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(CIXY_LOOK_STORAGE_KEY, JSON.stringify(look));
  }, [look, ready]);

  function choose(groupId: CixyGroupId, option: CixyOption) {
    if (option.access !== "owned") return;
    setLook((current) => ({ ...current, [groupId]: option.id }));
  }

  function reset() {
    setLook(defaultCixyLook());
    setMood("smile");
  }

  return (
    <section
      aria-labelledby="cixy-customizer-heading"
      className={
        compact
          ? "min-h-0 flex-1 overflow-y-auto bg-[#0b0a20]/95 px-4 py-4"
          : "card"
      }
    >
      <div className="flex items-start gap-3">
        <Image
          src="/cixy/cixy.png"
          alt="Cixy, the signature Apixis assistant"
          width={56}
          height={56}
          className={`shrink-0 rounded-full object-cover object-[center_15%] ${compact ? "h-10 w-10" : "h-14 w-14"}`}
        />
        <div className="min-w-0 flex-1">
          <h2 id="cixy-customizer-heading" className="font-display text-lg font-semibold">
            Customize <span className="grad-text">Cixy</span>
          </h2>
          <p className="mt-1 text-xs text-ink-2">
            Same Apixis-family face, specialized for Lyrixis. Essentials are included. Paid layers stay
            locked until Apixis Wallet.
          </p>
        </div>
        <button type="button" onClick={reset} className="btn-secondary shrink-0 px-3 py-1.5 text-xs">
          Signature look
        </button>
      </div>

      <div className={`mt-5 grid gap-6 ${compact ? "" : "lg:grid-cols-[240px_1fr]"}`}>
        <div>
          <div className="overflow-hidden rounded-2xl border border-line bg-[#09081e]">
            <CixySignature mood={mood} className={compact ? "max-h-52" : ""} />
          </div>
          <p className="mt-2 text-[11px] text-ink-3">
            Signature sprite. Moods are included. Nothing is drawn over her.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Signature states">
            {CIXY_MOODS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={mood === item.id}
                onClick={() => setMood(item.id)}
                className={`rounded-full border px-2.5 py-1 text-[11px] ${
                  mood === item.id
                    ? "border-cyan bg-white/10 text-ink"
                    : "border-line text-ink-2 hover:border-violet hover:text-ink"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          {CIXY_OPTION_GROUPS.map((group) => (
            <fieldset key={group.id} className="min-w-0">
              <legend className="font-display text-sm font-semibold">{group.label}</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={group.label}>
                {group.options.map((option) => {
                  const selected = look[group.id] === option.id;
                  if (option.access === "owned") {
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => choose(group.id, option)}
                        className={`rounded-xl border px-3 py-2 text-left ${
                          selected ? "border-cyan bg-white/[0.06]" : "border-line bg-white/[0.03] hover:border-violet"
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm">{option.name}</span>
                          <span className="text-[10px] uppercase tracking-wide text-cyan">Owned</span>
                        </span>
                        <span className="mt-1 block text-[11px] text-ink-3">{option.description}</span>
                      </button>
                    );
                  }

                  return (
                    <div key={option.id} className="rounded-xl border border-line bg-black/20 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-ink-2">{option.name}</p>
                        <p className="text-[10px] uppercase tracking-wide text-gold">{option.priceLabel}</p>
                      </div>
                      <p className="mt-1 text-[11px] text-ink-3">{option.description}</p>
                      <WalletActions />
                    </div>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="font-display text-sm font-semibold">Wardrobe layers</h3>
        <p className="mt-1 text-[11px] text-ink-3">
          Empty until the layered pack arrives. Included essentials stay on the signature art.
        </p>
        <ul className={`mt-3 grid gap-3 ${compact ? "grid-cols-2" : "sm:grid-cols-3 lg:grid-cols-5"}`}>
          {CIXY_WARDROBE_SLOTS.map((slot) => (
            <li key={slot.id} className="rounded-xl border border-dashed border-line bg-white/[0.02] p-3">
              <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-line bg-black/30 text-center text-[11px] uppercase tracking-[0.14em] text-ink-3">
                art pending
              </div>
              <p className="mt-2 text-sm">{slot.label}</p>
              <p className="mt-1 text-[11px] text-ink-2">
                Included: {includedNames(look, slot.groups)}
              </p>
              <p className="mt-1 text-[11px] text-gold">Coming soon</p>
              <WalletActions />
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 text-[11px] text-ink-3">
        The look on screen is the free signature. Ixis are bought in Apixis Wallet for Lyrixis. Redeeming a
        layer here is still coming soon.
      </p>
    </section>
  );
}
