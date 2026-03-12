"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Moon,
  Phone,
  RadioTower,
  Shield,
  Sun,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type SelectedRole = "servicoop" | "operador" | "admin";
type ThemeMode = "light" | "dark";

const ROLE_CONFIG: Record<
  SelectedRole,
  { label: string; description: string; icon: typeof Users }
> = {
  servicoop: {
    label: "Servicoop",
    description: "Guardias, reportes e internos",
    icon: Users,
  },
  operador: {
    label: "Operador",
    description: "Acceso completo operativo",
    icon: RadioTower,
  },
  admin: {
    label: "Administrador",
    description: "Acceso total al sistema",
    icon: Shield,
  },
};

export function LoginClient() {
  const [selectedRole, setSelectedRole] = useState<SelectedRole | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved =
      (localStorage.getItem("theme") as ThemeMode | null) ||
      (localStorage.getItem("portal_theme") as ThemeMode | null) ||
      "dark";
    setTheme(saved);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
    localStorage.setItem("portal_theme", theme);
  }, [ready, theme]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.dispatchEvent(
      new CustomEvent("themeChanged", { detail: { theme: next } })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: selectedRole, password }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok) {
        setError(data.error || "Error al iniciar sesion");
        return;
      }

      window.location.href = "/";
    } catch {
      setError("Error de conexion");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedRole(null);
    setPassword("");
    setError("");
    setShowPassword(false);
    setShowForgot(false);
  };

  if (!ready) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-[420px]">
        {/* Card */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl dark:border-white/[0.08] dark:bg-white/[0.06] dark:shadow-2xl dark:shadow-black/40">
          {/* Header con patron decorativo */}
          <div className="relative bg-primary px-8 pb-6 pt-8 text-primary-foreground dark:bg-accent dark:text-accent-foreground">
            {/* Dot grid pattern */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  "radial-gradient(circle, currentColor 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />
            <div className="relative text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-foreground/15 backdrop-blur-sm">
                {selectedRole ? (
                  <SelectedIcon role={selectedRole} />
                ) : (
                  <RadioTower className="h-5 w-5" />
                )}
              </div>
              <h1 className="text-xl font-bold tracking-tight">
                Portal de Servicios
              </h1>
              <p className="mt-1 text-sm opacity-60">
                Telecomunicaciones
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-6">
            {selectedRole === null ? (
              /* ── Role selection ── */
              <div>
                <p className="mb-4 text-[13px] font-medium text-muted-foreground">
                  Seleccione su perfil para continuar
                </p>

                <div className="space-y-2.5">
                  <RoleButton role="servicoop" onSelect={setSelectedRole} />
                  <RoleButton role="operador" onSelect={setSelectedRole} />
                </div>

                <div className="mt-8">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-border dark:bg-white/[0.06]" />
                    <span className="text-[11px] text-muted-foreground/40">
                      o
                    </span>
                    <div className="h-px flex-1 bg-border dark:bg-white/[0.06]" />
                  </div>
                  <div className="mt-3 text-center">
                    <button
                      type="button"
                      className="text-[12px] text-muted-foreground/40 transition-colors hover:text-muted-foreground"
                      onClick={() => setSelectedRole("admin")}
                    >
                      Acceso administrador
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ── Password form ── */
              <div>
                <div className="mb-5 flex items-center justify-between">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={handleBack}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Volver
                  </button>
                  <Badge
                    variant="secondary"
                    className="border-0 bg-muted text-[11px] font-normal text-muted-foreground"
                  >
                    {ROLE_CONFIG[selectedRole].label}
                  </Badge>
                </div>

                <form onSubmit={handleSubmit}>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-[13px] font-medium text-foreground"
                  >
                    {`Contrase\u00f1a`}
                  </label>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      className="h-11 border-border bg-background pl-10 pr-10 text-foreground placeholder:text-muted-foreground/50 dark:border-white/[0.1] dark:bg-white/[0.06]"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      autoFocus
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors hover:text-foreground"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={
                        showPassword
                          ? `Ocultar contrase\u00f1a`
                          : `Mostrar contrase\u00f1a`
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {error ? (
                    <p className="mt-2.5 text-[13px] text-destructive">
                      {error}
                    </p>
                  ) : null}

                  {selectedRole !== "admin" ? (
                    <div className="mt-3 text-right">
                      <button
                        type="button"
                        className="text-[13px] text-muted-foreground/70 transition-colors hover:text-foreground"
                        onClick={() => setShowForgot((prev) => !prev)}
                      >
                        {`\u00bfOlvid\u00f3 su contrase\u00f1a?`}
                      </button>
                    </div>
                  ) : null}

                  {showForgot ? (
                    <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2.5 dark:bg-white/[0.04]">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <p className="text-[13px] text-muted-foreground">
                        Comunicarse al{" "}
                        <span className="font-semibold text-foreground">
                          interno 2234
                        </span>
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-6">
                    <Button
                      type="submit"
                      className="h-10 w-full font-medium"
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Ingresar
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-8 py-3 dark:border-white/[0.06]">
            <p className="text-center text-[11px] text-muted-foreground/40">
              Servicoop &mdash; Uso interno
            </p>
          </div>
        </div>

        {/* Theme toggle */}
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground/40 transition-colors hover:text-muted-foreground"
            aria-label="Cambiar entre tema claro y oscuro"
          >
            {theme === "dark" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function SelectedIcon({ role }: { role: SelectedRole }) {
  const Icon = ROLE_CONFIG[role].icon;
  return <Icon className="h-5 w-5" />;
}

type RoleButtonProps = {
  role: SelectedRole;
  onSelect: (role: SelectedRole) => void;
};

function RoleButton({ role, onSelect }: RoleButtonProps) {
  const config = ROLE_CONFIG[role];
  const Icon = config.icon;

  return (
    <button
      type="button"
      className="group flex w-full items-center gap-3.5 rounded-xl border border-border px-4 py-4 text-left transition-all hover:border-foreground/15 hover:bg-muted/60 dark:border-white/[0.08] dark:hover:border-white/[0.15] dark:hover:bg-white/[0.06]"
      onClick={() => onSelect(role)}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted dark:bg-white/[0.08]">
        <Icon className="h-[18px] w-[18px] text-foreground/70" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold text-foreground">
          {config.label}
        </div>
        <div className="mt-0.5 text-[12px] leading-tight text-muted-foreground">
          {config.description}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/25 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground/50" />
    </button>
  );
}
