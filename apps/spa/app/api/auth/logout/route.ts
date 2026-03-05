import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0
  });

  return Response.json({ ok: true });
}
