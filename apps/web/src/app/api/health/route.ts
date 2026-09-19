import { NextResponse } from "next/server";
import { GameSlugs, OrderStatuses, ServiceTypes } from "@hardstuck/shared";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { isClosedBeta } from "@/server/env";

export async function GET() {
  let databaseOk = false;
  try {
    const db = getDb();
    await db.execute(sql`select 1`);
    databaseOk = true;
  } catch {
    databaseOk = false;
  }

  return NextResponse.json({
    ok: databaseOk,
    service: "hardstuck",
    phase: 7,
    closedBeta: isClosedBeta(),
    games: GameSlugs,
    services: ServiceTypes,
    orderStates: OrderStatuses,
    paymentProvider: process.env.PAYMENT_PROVIDER ?? "manual",
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    databaseOk,
  });
}
