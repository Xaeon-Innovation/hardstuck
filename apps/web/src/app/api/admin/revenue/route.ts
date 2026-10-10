import { NextResponse } from "next/server";
import { requireSession } from "@/server/auth/session";
import { computeRevenueDashboard } from "@/server/admin/revenue";
import { computeSoftLaunchMetrics } from "@/server/metrics/soft-launch";

async function requireAdmin() {
  const session = await requireSession();
  if (!session?.user) return null;
  if ((session.user as { role?: string }).role !== "admin") return null;
  return session;
}

export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const days = Number(url.searchParams.get("days") ?? "30");
  const safeDays = [7, 30, 90].includes(days) ? days : 30;
  const [revenue, funnel] = await Promise.all([
    computeRevenueDashboard(safeDays),
    computeSoftLaunchMetrics(),
  ]);
  return NextResponse.json({ revenue, funnel });
}
