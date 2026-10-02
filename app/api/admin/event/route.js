import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";

export const runtime = "nodejs";

export async function PUT(request) {
  const body = await request.json().catch(() => null);
  const eventName = (body?.eventName || "").trim();
  const eventDate = body?.eventDate || null;
  const deadlineDate = body?.deadlineDate || null;

  if (!eventName) {
    return NextResponse.json(
      { error: "Informe o nome do evento." },
      { status: 400 }
    );
  }

  const result = await query(
    `UPDATE event_settings
     SET event_name = $1, event_date = $2, deadline_date = $3
     WHERE id = 1
     RETURNING event_name, event_date, deadline_date`,
    [eventName, eventDate, deadlineDate]
  );

  return NextResponse.json({
    eventName: result.rows[0].event_name,
    eventDate: result.rows[0].event_date,
    deadlineDate: result.rows[0].deadline_date,
  });
}
