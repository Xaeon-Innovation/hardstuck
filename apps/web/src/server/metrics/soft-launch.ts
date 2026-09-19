import { and, count, eq, inArray, isNotNull } from "drizzle-orm";
import { getDb } from "@/server/db";
import { orders } from "@/server/db/schema";

export type SoftLaunchMetrics = {
  ordersTotal: number;
  paidOrBeyond: number;
  completedOrBeyond: number;
  disputed: number;
  completionRate: number | null;
  disputeRate: number | null;
  medianAssignSec: number | null;
  sampleAssign: number;
};

const PAID_PLUS = [
  "paid",
  "offered",
  "assigned",
  "in_progress",
  "delivered",
  "completed",
  "released",
  "paid_out",
  "disputed",
  "expired_offer",
] as const;

const COMPLETED_PLUS = ["completed", "released", "paid_out"] as const;

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
  }
  return sorted[mid]!;
}

export async function computeSoftLaunchMetrics(): Promise<SoftLaunchMetrics> {
  const db = getDb();

  const [totals] = await db.select({ n: count() }).from(orders);

  const [paidRow] = await db
    .select({ n: count() })
    .from(orders)
    .where(inArray(orders.status, [...PAID_PLUS]));

  const [completedRow] = await db
    .select({ n: count() })
    .from(orders)
    .where(inArray(orders.status, [...COMPLETED_PLUS]));

  const [disputedRow] = await db
    .select({ n: count() })
    .from(orders)
    .where(eq(orders.status, "disputed"));

  const assignSamples = await db
    .select({
      paidAt: orders.paidAt,
      assignedAt: orders.assignedAt,
    })
    .from(orders)
    .where(and(isNotNull(orders.paidAt), isNotNull(orders.assignedAt)))
    .limit(500);

  const assignSecs = assignSamples
    .map((r) => {
      if (!r.paidAt || !r.assignedAt) return null;
      return Math.max(
        0,
        Math.round((r.assignedAt.getTime() - r.paidAt.getTime()) / 1000),
      );
    })
    .filter((n): n is number => n != null);

  const paidOrBeyond = Number(paidRow?.n ?? 0);
  const completedOrBeyond = Number(completedRow?.n ?? 0);
  const disputed = Number(disputedRow?.n ?? 0);

  return {
    ordersTotal: Number(totals?.n ?? 0),
    paidOrBeyond,
    completedOrBeyond,
    disputed,
    completionRate: paidOrBeyond > 0 ? completedOrBeyond / paidOrBeyond : null,
    disputeRate: paidOrBeyond > 0 ? disputed / paidOrBeyond : null,
    medianAssignSec: median(assignSecs),
    sampleAssign: assignSecs.length,
  };
}
