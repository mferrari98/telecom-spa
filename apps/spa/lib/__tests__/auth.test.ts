import { describe, it, expect, beforeAll, vi } from "vitest";
import {
  isPublicRoute,
  canAccess,
  signToken,
  verifyToken,
  hashPassword,
  verifyPassword,
  SESSION_COOKIE_NAME,
  isSecureSessionCookieEnabled,
} from "../auth";

beforeAll(() => {
  vi.stubEnv("SESSION_SECRET", "test-secret-key-for-unit-tests-only-32chars!");
});

describe("SESSION_COOKIE_NAME", () => {
  it("is __session", () => {
    expect(SESSION_COOKIE_NAME).toBe("__session");
  });
});

describe("isSecureSessionCookieEnabled", () => {
  it("returns true by default in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_COOKIE_SECURE", "");
    expect(isSecureSessionCookieEnabled()).toBe(true);
  });

  it("returns false by default outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SESSION_COOKIE_SECURE", "");
    expect(isSecureSessionCookieEnabled()).toBe(false);
  });

  it("returns true when SESSION_COOKIE_SECURE is enabled", () => {
    vi.stubEnv("SESSION_COOKIE_SECURE", "true");
    expect(isSecureSessionCookieEnabled()).toBe(true);
  });

  it("returns false when SESSION_COOKIE_SECURE is explicitly disabled", () => {
    vi.stubEnv("SESSION_COOKIE_SECURE", "0");
    expect(isSecureSessionCookieEnabled()).toBe(false);
  });
});

describe("isPublicRoute", () => {
  it("returns true for /login/", () => {
    expect(isPublicRoute("/login/")).toBe(true);
  });

  it("returns true for /api/auth/login", () => {
    expect(isPublicRoute("/api/auth/login")).toBe(true);
  });

  it("returns true for /_next/static/chunk.js", () => {
    expect(isPublicRoute("/_next/static/chunk.js")).toBe(true);
  });

  it("returns true for /favicon.ico", () => {
    expect(isPublicRoute("/favicon.ico")).toBe(true);
  });

  it("returns true for /healthz", () => {
    expect(isPublicRoute("/healthz")).toBe(true);
  });

  it("returns false for /", () => {
    expect(isPublicRoute("/")).toBe(false);
  });

  it("returns false for /deudores/", () => {
    expect(isPublicRoute("/deudores/")).toBe(false);
  });

  it("returns false for /guardias/", () => {
    expect(isPublicRoute("/guardias/")).toBe(false);
  });
});

describe("canAccess", () => {
  describe("admin role", () => {
    it("can access any route", () => {
      expect(canAccess("admin", "/")).toBe(true);
      expect(canAccess("admin", "/deudores/")).toBe(true);
      expect(canAccess("admin", "/monitor/")).toBe(true);
      expect(canAccess("admin", "/pedidos/")).toBe(true);
      expect(canAccess("admin", "/guardias/")).toBe(true);
    });
  });

  describe("operador role", () => {
    it("can access any route", () => {
      expect(canAccess("operador", "/")).toBe(true);
      expect(canAccess("operador", "/deudores/")).toBe(true);
      expect(canAccess("operador", "/monitor/")).toBe(true);
    });
  });

  describe("servicoop role", () => {
    it("can access public routes", () => {
      expect(canAccess("servicoop", "/login/")).toBe(true);
      expect(canAccess("servicoop", "/_next/static/x.js")).toBe(true);
    });

    it("can access root", () => {
      expect(canAccess("servicoop", "/")).toBe(true);
    });

    it("can access guardias", () => {
      expect(canAccess("servicoop", "/guardias/")).toBe(true);
      expect(canAccess("servicoop", "/api/guardias/clima")).toBe(true);
    });

    it("can access internos", () => {
      expect(canAccess("servicoop", "/api/internos/")).toBe(true);
    });

    it("can access reportes", () => {
      expect(canAccess("servicoop", "/reporte/")).toBe(true);
    });

    it("cannot access deudores", () => {
      expect(canAccess("servicoop", "/deudores/")).toBe(false);
      expect(canAccess("servicoop", "/api/deudores/")).toBe(false);
    });

    it("cannot access monitor", () => {
      expect(canAccess("servicoop", "/monitor/")).toBe(false);
      expect(canAccess("servicoop", "/api/monitor/")).toBe(false);
    });

    it("cannot access pedidos", () => {
      expect(canAccess("servicoop", "/pedidos/")).toBe(false);
      expect(canAccess("servicoop", "/api/pedidos/")).toBe(false);
    });
  });

  describe("unknown role", () => {
    it("cannot access anything", () => {
      expect(canAccess("viewer", "/")).toBe(false);
      expect(canAccess("viewer", "/guardias/")).toBe(false);
      expect(canAccess("", "/")).toBe(false);
    });
  });
});

describe("signToken / verifyToken", () => {
  it("signs and verifies a valid token", async () => {
    const token = await signToken("testuser", "admin");
    const payload = await verifyToken(token);

    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe("testuser");
    expect(payload!.role).toBe("admin");
    expect(payload!.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("respects custom TTL", async () => {
    const token = await signToken("user", "operador", 60);
    const payload = await verifyToken(token);

    expect(payload).not.toBeNull();
    const now = Math.floor(Date.now() / 1000);
    expect(payload!.exp).toBeLessThanOrEqual(now + 60);
    expect(payload!.exp).toBeGreaterThan(now + 50);
  });

  it("rejects expired token", async () => {
    const token = await signToken("user", "admin", -10);
    const payload = await verifyToken(token);
    expect(payload).toBeNull();
  });

  it("rejects tampered token", async () => {
    const token = await signToken("user", "admin");
    const tampered = token.slice(0, -3) + "abc";
    const payload = await verifyToken(tampered);
    expect(payload).toBeNull();
  });

  it("rejects malformed token (no dot)", async () => {
    const payload = await verifyToken("nodothere");
    expect(payload).toBeNull();
  });

  it("rejects empty string", async () => {
    const payload = await verifyToken("");
    expect(payload).toBeNull();
  });
});

describe("hashPassword / verifyPassword", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("mypassword123");
    const valid = await verifyPassword("mypassword123", hash);
    expect(valid).toBe(true);
  });

  it("rejects wrong password", async () => {
    const hash = await hashPassword("correct");
    const valid = await verifyPassword("wrong", hash);
    expect(valid).toBe(false);
  });

  it("produces different hashes for same password (random salt)", async () => {
    const hash1 = await hashPassword("samepassword");
    const hash2 = await hashPassword("samepassword");
    expect(hash1).not.toBe(hash2);
  });

  it("hash format is iterations:salt:hash", async () => {
    const hash = await hashPassword("test");
    const parts = hash.split(":");
    expect(parts).toHaveLength(3);
    expect(parseInt(parts[0], 10)).toBe(100_000);
    expect(parts[1].length).toBeGreaterThan(0);
    expect(parts[2].length).toBeGreaterThan(0);
  });

  it("rejects malformed stored hash", async () => {
    expect(await verifyPassword("pass", "invalid")).toBe(false);
    expect(await verifyPassword("pass", "")).toBe(false);
    expect(await verifyPassword("pass", "100000:abc")).toBe(false);
  });
});
