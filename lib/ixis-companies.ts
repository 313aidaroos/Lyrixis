/**
 * Other Ixis companies shown in the site footer.
 * Single source of truth: swap URLs here when custom domains arrive.
 * Lyrixis itself is intentionally left out, as are Launchixis, PersonalContentBot, AwadBot
 * and COMMAND. Ominix (formerly Nexxis/Omnixis) is listed at its live host
 * ominix-app.vercel.app (the retired nexxis-tau host must not be used).
 * (The /companies page has its own full directory; this list is only the footer's.)
 */
export type IxisCompany = { name: string; url: string };

export const OTHER_IXIS_COMPANIES: readonly IxisCompany[] = [
  { name: "Apixis", url: "https://www.apixis.dev" },
  { name: "Apixis Wallet", url: "https://apixis-wallet.vercel.app" },
  { name: "Socixis", url: "https://socixis.dev" },
  { name: "Renoxis", url: "https://renoxis.dev" },
  { name: "Rawixis", url: "https://rawixis.vercel.app" },
  { name: "Contraxis", url: "https://contraxis-dev.vercel.app" },
  { name: "Halaxis", url: "https://halaxis.vercel.app" },
  { name: "Recovra", url: "https://recovra-three.vercel.app" },
  { name: "Deduxis", url: "https://deduxis.vercel.app" },
  { name: "Geoxis", url: "https://spatial-dashboard-xi.vercel.app" },
  { name: "Ominix", url: "https://ominix-app.vercel.app" },
  { name: "Wattixis", url: "https://wattixis.vercel.app" },
];
