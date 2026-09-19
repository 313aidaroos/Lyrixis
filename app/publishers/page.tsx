export const metadata = {
  title: "Lyrixis for publishers",
};

export default function PublishersPage() {
  return (
    <main style={{ minHeight: "100dvh", background: "#07080c", color: "#ece7dc", padding: "56px 20px" }}>
      <p style={{ letterSpacing: ".28em", fontSize: 11, color: "#c4a35a" }}>
        LYRIXIS / PUBLISHER DESK
      </p>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: 44, maxWidth: 720 }}>
        You hand us the library. We return the voices.
      </h1>
      <p style={{ maxWidth: 640, color: "#9a9588", fontSize: 18, lineHeight: 1.6 }}>
        Lyrixis is hired. Amazon, a house, or an author sends files they already have
        the rights to. We do not open Kindle. We do not scrape Audible. We produce
        timed audio with floor voices and deliver the package.
      </p>
      <ol style={{ maxWidth: 640, lineHeight: 1.8, color: "#cfc9bc" }}>
        <li>Rights letter.</li>
        <li>Drop the books.</li>
        <li>Pick voices on the floor — Cixy is not for sale.</li>
        <li>Get chapters + timings + QC.</li>
        <li>Pay by invoice or Apixis Wallet XP.</li>
      </ol>
      <p>
        <a href="/voices" style={{ color: "#c8ff63" }}>
          Voice floor
        </a>
        {" · "}
        <a href="/listen" style={{ color: "#c8ff63" }}>
          Hear a public-domain sample
        </a>
        {" · "}
        <a href="mailto:lyrixis@apixis.dev" style={{ color: "#c8ff63" }}>
          lyrixis@apixis.dev
        </a>
      </p>
    </main>
  );
}
