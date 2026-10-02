import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalize(str) {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const term = normalize(searchParams.get("name") || "");

  if (!term) {
    return NextResponse.json(
      { error: "Digite um nome para buscar." },
      { status: 400 }
    );
  }

  const guestsResult = await query(
    "SELECT id, name, status, responded_at FROM guests ORDER BY name ASC"
  );
  const matchedGuests = guestsResult.rows.filter((g) =>
    normalize(g.name).includes(term)
  );

  let dependentsByGuest = {};
  if (matchedGuests.length > 0) {
    const ids = matchedGuests.map((g) => g.id);
    const depResult = await query(
      `SELECT id, guest_id, name, status, responded_at
       FROM dependents WHERE guest_id = ANY($1::int[]) ORDER BY name ASC`,
      [ids]
    );
    for (const dep of depResult.rows) {
      if (!dependentsByGuest[dep.guest_id]) dependentsByGuest[dep.guest_id] = [];
      dependentsByGuest[dep.guest_id].push({
        id: dep.id,
        name: dep.name,
        status: dep.status,
        respondedAt: dep.responded_at,
      });
    }
  }

  return NextResponse.json({
    matches: matchedGuests.map((g) => ({
      id: g.id,
      name: g.name,
      status: g.status,
      respondedAt: g.responded_at,
      dependents: dependentsByGuest[g.id] || [],
    })),
  });
}
