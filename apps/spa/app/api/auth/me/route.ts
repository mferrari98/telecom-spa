import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return Response.json({ authenticated: false });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return Response.json({ authenticated: false });
  }

  return Response.json({
    authenticated: true,
    user: { username: payload.sub, role: payload.role }
  });
}
