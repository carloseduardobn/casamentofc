import { NextResponse } from "next/server";
import { SESSION_COOKIE, createSessionToken } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const password = body?.password || "";
  const adminPassword = process.env.ADMIN_PASSWORD;
  const secret = process.env.SESSION_SECRET;

  if (!adminPassword || !secret) {
    return NextResponse.json(
      {
        error:
          "Servidor mal configurado: defina ADMIN_PASSWORD e SESSION_SECRET nas variáveis de ambiente.",
      },
      { status: 500 }
    );
  }

  if (password !== adminPassword) {
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }

  const token = await createSessionToken(secret);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}
