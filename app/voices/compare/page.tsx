import { CompareTable } from "@/components/voices/Lists";
export default function ComparePage() {
  return <div className="space-y-6"><h1 className="font-display text-3xl font-extrabold">Compare voices</h1><p className="text-sm text-ink-3">Shortlist is stored on this device only.</p><CompareTable /></div>;
}
