"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function TrackStatusPoller({ publicId }: { publicId: string }) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 2000);
    return () => clearInterval(interval);
  }, [router, publicId]);

  return null;
}
