import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, signToken, verifyPassword } from "@/lib/auth";
import { findUser } from "@/lib/users";

export const runtime = "nodejs";

const LOGIN_WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;
const attempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return false;
  }

  record.count++;
  return record.count > MAX_ATTEMPTS;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (isRateLimited(ip)) {
    return Response.json(
      { error: "Demasiados intentos. Espere un minuto." },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as { username?: string; password?: string };
    const { username, password } = body;

    if (!username || !password) {
      return Response.json({ error: "Usuario y contraseña son requeridos" }, { status: 400 });
    }

    const user = await findUser(username);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return Response.json({ error: "Credenciales incorrectas" }, { status: 401 });
    }

    attempts.delete(ip);

    const token = await signToken(user.username, user.role);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 86400
    });

    return Response.json({ ok: true, user: { username: user.username, role: user.role } });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
