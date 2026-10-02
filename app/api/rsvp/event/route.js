import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await query(
    "SELECT event_name, event_date, deadline_date FROM event_settings WHERE id = 1"
  );
  const row = result.rows[0] || {};
  return NextResponse.json({
    eventName: row.event_name,
    eventDate: row.event_date,
    deadlineDate: row.deadline_date,
  });
}
