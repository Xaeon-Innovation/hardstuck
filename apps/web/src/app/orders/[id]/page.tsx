"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

/** Legacy ticket URLs → notifications workspace. */
export default function OrderLegacyRedirectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const next = new URLSearchParams();
    next.set("order", id);
    for (const key of ["paid", "chat", "checkout_id"] as const) {
      const v = searchParams.get(key);
      if (v) next.set(key, v);
    }
    router.replace(`/notifications?${next.toString()}`);
  }, [id, router, searchParams]);

  return (
    <p className="mx-auto max-w-lg px-5 py-16 text-center text-sm text-hs-mute">
      Opening notifications…
    </p>
  );
}
