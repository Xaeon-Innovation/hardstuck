import { Suspense } from "react";
import { SiteShell } from "@/components/site-shell";
import { BoostCalculator } from "@/components/boost-calculator";

export default function BoostPage() {
  return (
    <SiteShell wide>
      <Suspense
        fallback={
          <p className="text-sm text-hs-mute">Loading calculator…</p>
        }
      >
        <BoostCalculator />
      </Suspense>
    </SiteShell>
  );
}
