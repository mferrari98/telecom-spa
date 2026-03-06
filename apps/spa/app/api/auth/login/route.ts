import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, signToken, verifyPassword } from "@/lib/auth";
import { findUser } from "@/lib/users";

export const runtime = "nodejs";

const LOGIN_WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;
const MAX_TRACKED_IPS = 10_000;
const attempts = new Map<string, { count: number; resetAt: number }>();

function cleanupExpired() {
  const now = Date.now();
  for (const [key, record] of attempts) {
    if (now > record.resetAt) attempts.delete(key);
  }
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || now > record.resetAt) {
    if (attempts.size >= MAX_TRACKED_IPS) cleanupExpired();
    attempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return false;
  }

  record.count++;
  return record.count > MAX_ATTEMPTS;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (isRateLimited(`ip:${ip}`)) {
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

    if (isRateLimited(`user:${username}`)) {
      return Response.json(
        { error: "Demasiados intentos. Espere un minuto." },
        { status: 429 }
      );
    }

    const user = await findUser(username);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return Response.json({ error: "Credenciales incorrectas" }, { status: 401 });
    }

    attempts.delete(`ip:${ip}`);
    attempts.delete(`user:${username}`);

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
