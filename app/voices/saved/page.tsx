import { SavedLists } from "@/components/voices/Lists";
export default function SavedPage() {
  return <div className="space-y-6"><h1 className="font-display text-3xl font-extrabold">Saved & recent</h1><p className="text-sm text-ink-3">Stored on this device only.</p><SavedLists /></div>;
}
