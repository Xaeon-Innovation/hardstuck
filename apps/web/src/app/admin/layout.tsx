import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) {
    redirect("/login");
  }
  if (role !== "admin") {
    redirect("/");
  }
  return children;
}
