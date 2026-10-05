import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { LyrixisFeed } from "./LyrixisFeed";
import "./feed.css";

export const metadata = { title: "Feed · Lyrixis", description: "Posts from every Apixis company, in one feed." };

export default function FeedPage() {
  return (
    <div>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan">Socixis Social · Every Apixis company</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">
          The family <span className="grad-text">feed.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-2">
          What everyone across the Apixis family is sharing. Sign in with your Apixis ID to post, follow, comment and tip in Ixis.
        </p>
        <div className="mt-10">
          <LyrixisFeed />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
