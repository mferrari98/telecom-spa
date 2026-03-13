import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, isSecureSessionCookieEnabled } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureSessionCookieEnabled(),
    maxAge: 0
  });

  return Response.json({ ok: true });
}
