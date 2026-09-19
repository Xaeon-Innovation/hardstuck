import { NextResponse } from "next/server";
import { requireSession } from "@/server/auth/session";
import { computeSoftLaunchMetrics } from "@/server/metrics/soft-launch";

export async function GET() {
  const session = await requireSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const metrics = await computeSoftLaunchMetrics();
  return NextResponse.json({ metrics });
}
