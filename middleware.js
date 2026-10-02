import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./lib/auth";

export const config = {
  matcher: [
    "/admin/dashboard/:path*",
    "/api/admin/guests/:path*",
    "/api/admin/dependents/:path*",
    "/api/admin/event/:path*",
    "/api/admin/logout",
  ],
};

export async function middleware(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.SESSION_SECRET || "";
  const valid = await verifySessionToken(token, secret);

  if (!valid) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Não autorizado. Faça login novamente." },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
