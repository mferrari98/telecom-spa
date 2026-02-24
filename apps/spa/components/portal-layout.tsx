"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Moon, Shield } from "lucide-react";
import { PortalBrand, PortalShell } from "@telecom/ui";
import { Switch } from "@/components/ui/switch";
import { InternalDirectoryDialog } from "./internal-directory-dialog";

type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "theme";
const LEGACY_THEME_STORAGE_KEY = "portal_theme";

type PortalLayoutProps = {
  contentClassName?: string;
  children: ReactNode;
};

export function PortalLayout({ contentClassName, children }: PortalLayoutProps) {
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [ready, setReady] = useState(false);

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
        </>
      }
    >
      {children}
    </PortalShell>
  );
}
