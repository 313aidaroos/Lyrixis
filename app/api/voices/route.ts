import { NextResponse } from "next/server";
import { rotatingVoices } from "@/lib/voiceMarket";

export async function GET() {
  return NextResponse.json({
    unitXp: 1000,
    wallet: "https://apixis-wallet.vercel.app",
    note: "Cixy native voice is not for sale.",
    voices: rotatingVoices(),
  });
}
