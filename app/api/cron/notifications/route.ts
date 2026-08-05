import { NextRequest, NextResponse } from "next/server";
import { processAllSubscriptions, processScheduledCoachNotifications } from "@/lib/push";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const requestedSlot = Number(request.nextUrl.searchParams.get("slot"));
  const slot = [8, 11, 15, 19].includes(requestedSlot) ? requestedSlot : undefined;
  const requestedTest = request.nextUrl.searchParams.get("test")?.replace(/[^a-z0-9-]/gi, "").slice(0, 40);
  const [workouts, coach] = await Promise.all([processAllSubscriptions(), processScheduledCoachNotifications(new Date(), slot, requestedTest)]);
  return NextResponse.json({ ok: true, workouts, coach });
}
