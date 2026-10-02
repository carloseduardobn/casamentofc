import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const guestId = body?.guestId;
  const name = (body?.name || "").trim();

  if (!guestId || !name) {
    return NextResponse.json(
      { error: "Informe o convidado titular e o nome da pessoa associada." },
      { status: 400 }
    );
  }

  const guestCheck = await query("SELECT id FROM guests WHERE id = $1", [
    guestId,
  ]);
  if (guestCheck.rowCount === 0) {
    return NextResponse.json(
      { error: "Convidado titular não encontrado." },
      { status: 404 }
    );
  }

  const result = await query(
    `INSERT INTO dependents (guest_id, name, status) VALUES ($1, $2, 'pendente')
     RETURNING id, guest_id, name, status, responded_at, created_at`,
    [guestId, name]
  );

  return NextResponse.json({ dependent: result.rows[0] }, { status: 201 });
}
