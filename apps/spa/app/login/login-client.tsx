"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, KeyRound, Loader2, Moon, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

type SelectedRole = "servicoop" | "operador" | "admin";
type ThemeMode = "light" | "dark";

const ROLE_LABELS: Record<SelectedRole, string> = {
  servicoop: "Servicoop",
  operador: "Operador",
  admin: "Administrador"
};

const ROLE_DESCRIPTIONS: Record<SelectedRole, string> = {
  servicoop: "Guardias, reportes e internos",
  operador: "Acceso completo operativo",
  admin: "Acceso total al sistema"
};

export function LoginClient() {
  const [selectedRole, setSelectedRole] = useState<SelectedRole | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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
    window.dispatchEvent(new CustomEvent("themeChanged", { detail: { theme: next } }));
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
        body: JSON.stringify({ username: selectedRole, password })
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
  };

  if (!ready) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-[360px] space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card">
            <Shield className="h-4 w-4 text-foreground" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">
            Telecomunicaciones
          </h1>
          <p className="text-sm text-muted-foreground">
            {selectedRole
              ? `Ingresando como ${ROLE_LABELS[selectedRole]}`
              : "Seleccione su perfil para continuar"}
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {selectedRole === null ? (
              <div className="space-y-2">
                <RoleButton role="servicoop" onSelect={setSelectedRole} />
                <RoleButton role="operador" onSelect={setSelectedRole} />
                <Separator className="my-3" />
                <button
                  type="button"
                  className="w-full text-center text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground"
                  onClick={() => setSelectedRole("admin")}
                >
                  Ingresar como administrador
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Contraseña"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    autoFocus
                    required
                    disabled={loading}
                  />
                </div>

                {error ? <p className="text-sm text-destructive">{error}</p> : null}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Ingresar
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    onClick={handleBack}
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Volver
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <div className="relative inline-flex h-8 w-8 items-center justify-center">
            <Moon
              className={`h-4 w-4 text-muted-foreground transition-opacity ${
                theme === "dark" ? "opacity-100" : "opacity-55"
              }`}
            />
            <Switch
              className="absolute inset-0 h-8 w-8 rounded-full border-0 bg-transparent shadow-none data-[checked]:bg-transparent data-[unchecked]:bg-transparent focus-visible:ring-1 [&>*]:hidden"
              checked={theme === "dark"}
              onCheckedChange={toggleTheme}
              aria-label="Cambiar entre tema claro y oscuro"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

type RoleButtonProps = {
  role: SelectedRole;
  onSelect: (role: SelectedRole) => void;
};

function RoleButton({ role, onSelect }: RoleButtonProps) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-3 text-left transition-colors hover:bg-muted/50"
      onClick={() => onSelect(role)}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <Users className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{ROLE_LABELS[role]}</div>
        <div className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</div>
      </div>
    </button>
  );
}
