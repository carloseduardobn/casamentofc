import { NextResponse } from "next/server";
import { query } from "../../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUS = ["pendente", "confirmado", "nao_confirmado"];

export async function PUT(request, { params }) {
  const id = params.id;
  const body = await request.json().catch(() => null);
  const name = body?.name?.trim();
  const status = body?.status;

  if (!name) {
    return NextResponse.json(
      { error: "Informe o nome da pessoa associada." },
      { status: 400 }
    );
  }
  if (status && !VALID_STATUS.includes(status)) {
    return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  }

  const result = await query(
    `UPDATE dependents
     SET name = $1,
         status = COALESCE($2, status),
         responded_at = CASE WHEN $2 IS NOT NULL AND $2 <> 'pendente' THEN NOW() ELSE responded_at END
     WHERE id = $3
     RETURNING id, guest_id, name, status, responded_at, created_at`,
    [name, status || null, id]
  );

  if (result.rowCount === 0) {
    return NextResponse.json(
      { error: "Pessoa associada não encontrada." },
      { status: 404 }
    );
  }

  return NextResponse.json({ dependent: result.rows[0] });
}

export async function DELETE(request, { params }) {
  const id = params.id;
  const result = await query("DELETE FROM dependents WHERE id = $1", [id]);
  if (result.rowCount === 0) {
    return NextResponse.json(
      { error: "Pessoa associada não encontrada." },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true });
}
