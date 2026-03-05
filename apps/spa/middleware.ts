import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, isPublicRoute, canAccess } from "@/lib/auth";

async function verifyTokenInMiddleware(token: string): Promise<{ sub: string; role: string } | null> {
  try {
    const secret = process.env.SESSION_SECRET;
    if (!secret) {
      console.log("[middleware] SESSION_SECRET is not set!");
      return null;
    }

    const [payloadB64, sigB64] = token.split(".");
    if (!payloadB64 || !sigB64) return null;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Decode signature
    const sigPadded = sigB64.replace(/-/g, "+").replace(/_/g, "/");
    const sigBinary = atob(sigPadded);
    const sigBytes = new Uint8Array(sigBinary.length);
    for (let i = 0; i < sigBinary.length; i++) sigBytes[i] = sigBinary.charCodeAt(i);

    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(payloadB64));
    if (!valid) {
      console.log("[middleware] HMAC verify returned false");
      return null;
    }

    // Decode payload
    const payloadPadded = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const payloadBinary = atob(payloadPadded);
    const payloadBytes = new Uint8Array(payloadBinary.length);
    for (let i = 0; i < payloadBinary.length; i++) payloadBytes[i] = payloadBinary.charCodeAt(i);

    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as {
      sub: string;
      role: string;
      exp: number;
    };

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      console.log("[middleware] token expired");
      return null;
    }

    return { sub: payload.sub, role: payload.role };
  } catch (err) {
    console.log("[middleware] verifyToken error:", err);
    return null;
  }
}

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

  const payload = await verifyTokenInMiddleware(token);
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
