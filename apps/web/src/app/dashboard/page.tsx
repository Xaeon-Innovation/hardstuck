"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { hasPlatformWideAccess } from "@/lib/roles";

/** Order list lives on /notifications; keep /dashboard as a stable entry point. */
export default function DashboardRedirectPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      router.replace("/login");
      return;
    }
    if (role === "booster") {
      router.replace("/notifications");
      return;
    }
    if (hasPlatformWideAccess(role)) {
      router.replace("/notifications");
      return;
    }
    router.replace("/notifications");
  }, [isPending, session?.user, role, router]);

  return (
    <p className="mx-auto max-w-lg px-5 py-16 text-center text-sm text-hs-mute">
      Opening notifications…
    </p>
  );
}
