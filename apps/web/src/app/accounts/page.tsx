import { redirect } from "next/navigation";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const sp = await searchParams;
  const q = new URLSearchParams({ category: "account" });
  if (sp.game) q.set("game", sp.game);
  redirect(`/marketplace?${q.toString()}`);
}
