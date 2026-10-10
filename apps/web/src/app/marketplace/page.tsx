import { Suspense } from "react";
import MarketplaceClient from "./marketplace-client";

export default function MarketplacePage() {
  return (
    <Suspense fallback={<div className="p-10 text-hs-mute">Loading…</div>}>
      <MarketplaceClient />
    </Suspense>
  );
}
