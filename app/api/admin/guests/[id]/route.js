import { NextResponse } from "next/server";
import { query } from "../../../../../lib/db";

export const runtime = "nodejs";

const VALID_STATUS = ["pendente", "confirmado", "nao_confirmado"];

export async function PUT(request, { params }) {
  const id = params.id;
  const body = await request.json().catch(() => null);
  const name = body?.name?.trim();
  const status = body?.status;
  const notes = body?.notes ?? null;

  if (!name) {
    return NextResponse.json(
      { error: "Informe o nome do convidado." },
      { status: 400 }
    );
  }
  if (status && !VALID_STATUS.includes(status)) {
    return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  }

  const result = await query(
    `UPDATE guests
     SET name = $1,
         status = COALESCE($2, status),
         notes = $3,
         responded_at = CASE WHEN $2 IS NOT NULL AND $2 <> 'pendente' THEN NOW() ELSE responded_at END
     WHERE id = $4
     RETURNING id, name, status, notes, responded_at, created_at`,
    [name, status || null, notes, id]
  );

  if (result.rowCount === 0) {
    return NextResponse.json(
      { error: "Convidado não encontrado." },
      { status: 404 }
    );
  }

  return NextResponse.json({ guest: result.rows[0] });
}

export async function DELETE(request, { params }) {
  const id = params.id;
  const result = await query("DELETE FROM guests WHERE id = $1", [id]);
  if (result.rowCount === 0) {
    return NextResponse.json(
      { error: "Convidado não encontrado." },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true });
}
