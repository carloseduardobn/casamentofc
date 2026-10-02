import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isDeadlinePassed() {
  const settings = await query(
    "SELECT deadline_date FROM event_settings WHERE id = 1"
  );
  const deadline = settings.rows[0]?.deadline_date;
  return deadline ? new Date(deadline) < new Date() : false;
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const id = body?.id;
  const status = body?.status;
  const target = body?.target === "dependent" ? "dependent" : "guest";

  if (!id || !["confirmado", "nao_confirmado"].includes(status)) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  if (await isDeadlinePassed()) {
    return NextResponse.json(
      { error: "O prazo para confirmação já encerrou." },
      { status: 403 }
    );
  }

  const table = target === "dependent" ? "dependents" : "guests";
  const result = await query(
    `UPDATE ${table} SET status = $1, responded_at = NOW()
     WHERE id = $2
     RETURNING id, name, status, responded_at`,
    [status, id]
  );

  if (result.rowCount === 0) {
    return NextResponse.json(
      { error: "Pessoa não encontrada." },
      { status: 404 }
    );
  }

  return NextResponse.json({ person: { ...result.rows[0], target } });
}
