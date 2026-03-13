export const SESSION_COOKIE_NAME = "__session";

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_MAX_ITERATIONS = 2_000_000;
const PBKDF2_SALT_BYTES = 16;
const PBKDF2_HASH_BYTES = 32;

type TokenPayload = {
  sub: string;
  role: string;
  exp: number;
};

export type SessionInfo = {
  username: string;
  role: string;
};

const PUBLIC_ROUTES = ["/login/", "/api/auth/", "/_next/", "/favicon.ico", "/healthz"];
const SERVICOOP_ALLOWED_ROUTES = [
  "/",
  "/guardias/",
  "/api/guardias/",
  "/api/internos/",
  "/reporte/"
];

export function isSecureSessionCookieEnabled(): boolean {
  const value = process.env.SESSION_COOKIE_SECURE?.trim().toLowerCase();
  if (!value) return process.env.NODE_ENV === "production";
  return value === "1" || value === "true";
}

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

export function canAccess(role: string, pathname: string): boolean {
  if (role === "admin" || role === "operador") return true;
  if (role === "servicoop") {
    if (isPublicRoute(pathname)) return true;
    if (pathname === "/") return true;
    return SERVICOOP_ALLOWED_ROUTES.some((route) => route !== "/" && pathname.startsWith(route));
  }
  return false;
}

let cachedSecretKey: CryptoKey | null = null;
let cachedSecretRaw: string | null = null;

async function getSecretKey(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  if (cachedSecretKey && cachedSecretRaw === secret) return cachedSecretKey;
  const enc = new TextEncoder();
  cachedSecretKey = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify"
  ]);
  cachedSecretRaw = secret;
  return cachedSecretKey;
}

function base64urlEncode(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function signToken(sub: string, role: string, ttlSeconds = 86400): Promise<string> {
  const payload: TokenPayload = { sub, role, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const enc = new TextEncoder();
  const payloadB64 = base64urlEncode(enc.encode(JSON.stringify(payload)));
  const key = await getSecretKey();
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payloadB64));
  return `${payloadB64}.${base64urlEncode(sig)}`;
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const [payloadB64, sigB64] = token.split(".");
    if (!payloadB64 || !sigB64) return null;

    const key = await getSecretKey();
    const enc = new TextEncoder();
    const sigBytes = base64urlDecode(sigB64);
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes.buffer as ArrayBuffer, enc.encode(payloadB64));
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(payloadB64))) as TokenPayload;
    if (typeof payload.sub !== "string" || !payload.sub) return null;
    if (typeof payload.role !== "string" || !payload.role) return null;
    if (typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_BYTES));
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits"
  ]);
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    PBKDF2_HASH_BYTES * 8
  );
  return `${PBKDF2_ITERATIONS}:${base64urlEncode(salt)}:${base64urlEncode(derived)}`;
}

export async function getSessionFromCookie(): Promise<SessionInfo | null> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    const payload = await verifyToken(token);
    if (!payload) return null;
    return { username: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [iterStr, saltB64, hashB64] = stored.split(":");
    if (!iterStr || !saltB64 || !hashB64) return false;

    const iterations = parseInt(iterStr, 10);
    if (!Number.isFinite(iterations) || iterations < 1 || iterations > PBKDF2_MAX_ITERATIONS) return false;
    const salt = base64urlDecode(saltB64);
    const expectedHash = base64urlDecode(hashB64);

    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
      "deriveBits"
    ]);
    const derived = new Uint8Array(
      await crypto.subtle.deriveBits(
        { name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations, hash: "SHA-256" },
        keyMaterial,
        expectedHash.length * 8
      )
    );

    if (derived.length !== expectedHash.length) return false;
    let diff = 0;
    for (let i = 0; i < derived.length; i++) diff |= derived[i] ^ expectedHash[i];
    return diff === 0;
  } catch {
    return false;
  }
}
