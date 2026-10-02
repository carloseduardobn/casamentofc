import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const guestsResult = await query(
    "SELECT id, name, status, notes, responded_at, created_at FROM guests ORDER BY name ASC"
  );
  const depResult = await query(
    "SELECT id, guest_id, name, status, responded_at, created_at FROM dependents ORDER BY name ASC"
  );

  const depByGuest = {};
  for (const dep of depResult.rows) {
    if (!depByGuest[dep.guest_id]) depByGuest[dep.guest_id] = [];
    depByGuest[dep.guest_id].push(dep);
  }

  const guests = guestsResult.rows.map((g) => ({
    ...g,
    dependents: depByGuest[g.id] || [],
  }));

  return NextResponse.json({ guests });
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const name = (body?.name || "").trim();

  if (!name) {
    return NextResponse.json(
      { error: "Informe o nome do convidado." },
      { status: 400 }
    );
  }

  const result = await query(
    `INSERT INTO guests (name, status) VALUES ($1, 'pendente')
     RETURNING id, name, status, notes, responded_at, created_at`,
    [name]
  );

  return NextResponse.json(
    { guest: { ...result.rows[0], dependents: [] } },
    { status: 201 }
  );
}
