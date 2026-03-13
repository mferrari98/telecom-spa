import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, isPublicRoute, canAccess, verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  if (pathname.match(/\.(?:ico|png|jpg|jpeg|svg|css|js|woff2?)$/)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login/", request.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    const response = NextResponse.redirect(new URL("/login/", request.url));
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  if (!canAccess(payload.role, pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const headers = new Headers(request.headers);
  headers.set("x-user-name", payload.sub);
  headers.set("x-user-role", payload.role);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"]
};
