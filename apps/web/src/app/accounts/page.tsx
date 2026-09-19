import { Suspense } from "react";
import AccountsClient from "./accounts-client";

export default function AccountsPage() {
  return (
    <Suspense fallback={<p className="p-8 text-hs-mute">Loading…</p>}>
      <AccountsClient />
    </Suspense>
  );
}
