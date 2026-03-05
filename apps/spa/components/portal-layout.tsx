"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { LogOut, Moon, Shield } from "lucide-react";
import { Popover } from "@base-ui/react/popover";
import { PortalBrand, PortalShell } from "@telecom/ui";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useAuth } from "./auth-provider";
import { InternalDirectoryDialog } from "./internal-directory-dialog";

type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "theme";
const LEGACY_THEME_STORAGE_KEY = "portal_theme";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  operador: "Operador",
  servicoop: "Servicoop"
};

const ROLE_INITIALS: Record<string, string> = {
  admin: "A",
  operador: "O",
  servicoop: "S"
};

type PortalLayoutProps = {
  contentClassName?: string;
  children: ReactNode;
};

export function PortalLayout({ contentClassName, children }: PortalLayoutProps) {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [ready, setReady] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const savedTheme =
      (localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null) ||
      (localStorage.getItem(LEGACY_THEME_STORAGE_KEY) as ThemeMode | null) ||
      "dark";

    localStorage.setItem(THEME_STORAGE_KEY, savedTheme);
    localStorage.setItem(LEGACY_THEME_STORAGE_KEY, savedTheme);

    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    setTheme(savedTheme);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    localStorage.setItem(THEME_STORAGE_KEY, theme);
    localStorage.setItem(LEGACY_THEME_STORAGE_KEY, theme);
  }, [ready, theme]);

  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ theme: ThemeMode }>;
      const nextTheme = customEvent.detail?.theme;
      if (nextTheme === "light" || nextTheme === "dark") {
        setTheme(nextTheme);
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (
        (event.key === THEME_STORAGE_KEY || event.key === LEGACY_THEME_STORAGE_KEY) &&
        (event.newValue === "light" || event.newValue === "dark")
      ) {
        setTheme(event.newValue);
      }
    };

    window.addEventListener("themeChanged", handleThemeChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("themeChanged", handleThemeChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const setThemeMode = (nextTheme: ThemeMode) => {
    setTheme(nextTheme);
    window.dispatchEvent(new CustomEvent("themeChanged", { detail: { theme: nextTheme } }));
  };

  const handleLogoutClick = useCallback(() => {
    setConfirmOpen(true);
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <PortalShell
      containerClassName={contentClassName}
      brand={
        <PortalBrand
          href="/"
          label="Telecomunicaciones y Automatismos"
          icon={<Shield className="t-icon-sm" />}
        />
      }
      actions={
        <>
          <InternalDirectoryDialog />
          <div className="relative inline-flex h-8 w-8 items-center justify-center">
            <Moon
              className={`h-4 w-4 text-muted-foreground transition-opacity ${
                theme === "dark" ? "opacity-100" : "opacity-55"
              }`}
            />
            <Switch
              className="absolute inset-0 h-8 w-8 rounded-full border-0 bg-transparent shadow-none data-[checked]:bg-transparent data-[unchecked]:bg-transparent focus-visible:ring-1 [&>*]:hidden"
              checked={theme === "dark"}
              onCheckedChange={(checked) => setThemeMode(checked ? "dark" : "light")}
              aria-label="Cambiar entre tema claro y oscuro"
            />
          </div>
          {user ? (
            <Popover.Root>
              <Popover.Trigger
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-muted/50 text-xs font-semibold text-muted-foreground transition-colors hover:border-border hover:bg-muted"
                aria-label={`${ROLE_LABELS[user.role] ?? user.role} - Opciones de usuario`}
              >
                {ROLE_INITIALS[user.role] ?? "?"}
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner side="bottom" align="end" sideOffset={8}>
                  <Popover.Popup className="z-50 min-w-[160px] rounded-lg border border-border bg-popover p-1 shadow-md outline-none data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[ending-style]:scale-95">
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      Usuario {ROLE_LABELS[user.role] ?? user.role}
                    </div>
                    <div className="h-px bg-border" />
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                      onClick={handleLogoutClick}
                    >
                      <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
                      Cerrar sesion
                    </button>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
          ) : null}
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cerrar sesion</AlertDialogTitle>
                <AlertDialogDescription>
                  Vas a salir de la sesion actual. Tendras que volver a ingresar tu contraseña para acceder.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => void logout()}>
                  Cerrar sesion
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      }
    >
      {children}
    </PortalShell>
  );
}
