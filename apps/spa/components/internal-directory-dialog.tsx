"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Loader2, Phone, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut
} from "@/components/ui/command";

type DirectoryEntry = {
  id: string;
  name: string;
  role: string;
  area: string;
  internal: string;
};

type SearchableEntry = DirectoryEntry & {
  searchableName: string;
  searchableArea: string;
  searchableInternal: string;
  searchScore: number;
};

type ExtensionResult = {
  extension: string;
  department: string;
  people: SearchableEntry[];
  maxScore: number;
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[,\s-]+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim();
}

function normalizeInternalSearch(value: string): string {
  const digitsOnly = value.replace(/[^\d]/g, "");
  return digitsOnly || value.toLowerCase();
}

function normalizeSurname(name: string): string {
  if (!name) return "";
  const commaIndex = name.indexOf(",");
  const rawSurname = commaIndex >= 0 ? name.slice(0, commaIndex) : name.split(" ")[0];
  return normalizeText(rawSurname || name);
}

function computeSearchScore(
  entry: Pick<SearchableEntry, "name" | "searchableName">,
  normalizedQuery: string,
  searchTerms: string[]
): number {
  const surname = normalizeSurname(entry.name);
  if (surname && normalizedQuery === surname) return 3;

  const words = entry.searchableName.split(" ").filter(Boolean);
  const startsWithAll = searchTerms.every((term) =>
    words.some((word) => word.startsWith(term) || word === term)
  );
  if (startsWithAll) return 2;

  const includesAll = searchTerms.every((term) => entry.searchableName.includes(term));
  if (includesAll) return 1;

  return 0;
}

function readBootstrapEntries(): DirectoryEntry[] | null {
  const script = document.getElementById("internal-directory-bootstrap");
  if (!script || script.textContent === null) {
    return null;
  }

  try {
    const parsed = JSON.parse(script.textContent);
    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed as DirectoryEntry[];
  } catch {
    return null;
  }
}

export function InternalDirectoryDialog() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = useCallback(
    async (force = false) => {
      if (loading) return;
      if (loaded && !force) return;

      if (!force) {
        const bootstrapEntries = readBootstrapEntries();
        if (bootstrapEntries && bootstrapEntries.length > 0) {
          setEntries(bootstrapEntries);
          setLoaded(true);
          setError(null);
          return;
        }
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/internos/", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("No se pudo cargar el directorio.");
        }

        const payload = await response.json();
        if (!payload || !Array.isArray(payload.personnel)) {
          throw new Error("Respuesta invalida del directorio.");
        }

        setEntries(payload.personnel as DirectoryEntry[]);
        setLoaded(true);
      } catch {
        setError("No se pudo cargar internos.xlsx");
      } finally {
        setLoading(false);
      }
    },
    [loaded, loading]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b";
      if (isShortcut) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const bootstrapEntries = readBootstrapEntries();
    if (bootstrapEntries && bootstrapEntries.length > 0) {
      setEntries(bootstrapEntries);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    if (open && !loaded && !loading) {
      void loadEntries();
    }
  }, [loadEntries, loaded, loading, open]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  const searchableEntries = useMemo<SearchableEntry[]>(
    () =>
      entries.map((entry) => ({
        ...entry,
        searchableName: normalizeText(entry.name),
        searchableArea: normalizeText(entry.area),
        searchableInternal: normalizeInternalSearch(entry.internal),
        searchScore: 0
      })),
    [entries]
  );

  const filteredEntries = useMemo<SearchableEntry[]>(() => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length < 2) return [];

    const normalizedQuery = normalizeText(trimmedQuery);
    const searchTerms = normalizedQuery.split(" ").filter((term) => term.length > 0);
    const numericQuery = normalizedQuery.replace(/\s+/g, "");
    const isNumericQuery = /^\d+$/.test(numericQuery);

    if (isNumericQuery) {
      return searchableEntries
        .filter((entry) => entry.searchableInternal.includes(numericQuery))
        .map((entry) => ({ ...entry, searchScore: 2 }))
        .sort((a, b) => {
          const scoreDiff = b.searchScore - a.searchScore;
          if (scoreDiff !== 0) return scoreDiff;
          return a.name.localeCompare(b.name);
        });
    }

    const departmentMatches = searchableEntries.filter((entry) =>
      entry.searchableArea.includes(normalizedQuery)
    );

    const exactMatches = searchableEntries.filter((entry) =>
      searchTerms.every((term) => {
        const words = entry.searchableName.split(" ");
        return words.some((word) => word.startsWith(term) || word === term);
      })
    );

    const merged: SearchableEntry[] = [];
    const seen = new Set<string>();

    const pushUnique = (items: SearchableEntry[]) => {
      for (const item of items) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        merged.push(item);
      }
    };

    if (exactMatches.length > 0) {
      const matchingInternals = new Set(exactMatches.map((entry) => entry.internal));
      pushUnique(searchableEntries.filter((entry) => matchingInternals.has(entry.internal)));
    } else {
      pushUnique(
        searchableEntries.filter((entry) =>
          searchTerms.every((term) => entry.searchableName.includes(term))
        )
      );
    }

    if (departmentMatches.length > 0 && searchTerms.length === 1) {
      pushUnique(departmentMatches);
    }

    return merged
      .map((entry) => ({
        ...entry,
        searchScore: computeSearchScore(entry, normalizedQuery, searchTerms)
      }))
      .sort((a, b) => {
        const scoreDiff = b.searchScore - a.searchScore;
        if (scoreDiff !== 0) return scoreDiff;
        const areaDiff = a.area.localeCompare(b.area);
        if (areaDiff !== 0) return areaDiff;
        return a.name.localeCompare(b.name);
      });
  }, [searchQuery, searchableEntries]);

  const extensionResults = useMemo<ExtensionResult[]>(() => {
    const grouped = new Map<string, SearchableEntry[]>();

    for (const entry of filteredEntries) {
      const previous = grouped.get(entry.internal) ?? [];
      grouped.set(entry.internal, [...previous, entry]);
    }

    return Array.from(grouped.entries())
      .map(([extension, people]) => {
        const maxScore = Math.max(...people.map((person) => person.searchScore));
        return {
          extension,
          department: people[0]?.area || "Sector sin identificar",
          people,
          maxScore
        };
      })
      .sort((a, b) => {
        const scoreDiff = b.maxScore - a.maxScore;
        if (scoreDiff !== 0) return scoreDiff;
        const deptDiff = a.department.localeCompare(b.department);
        if (deptDiff !== 0) return deptDiff;
        return a.extension.localeCompare(b.extension);
      });
  }, [filteredEntries]);

  const groups = useMemo(() => {
    const grouped = new Map<string, ExtensionResult[]>();

    for (const extensionResult of extensionResults) {
      const previous = grouped.get(extensionResult.department) ?? [];
      grouped.set(extensionResult.department, [...previous, extensionResult]);
    }

    return Array.from(grouped.entries());
  }, [extensionResults]);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8 border-2 font-semibold"
        aria-label="Busqueda internos"
        title="Busqueda internos"
        onClick={() => setOpen(true)}
      >
        <BookOpen className="t-icon-sm" />
        <span>Busqueda internos</span>
        <span className="ml-1 hidden rounded border bg-muted px-1.5 py-0.5 text-[11px] sm:inline-flex">
          Ctrl+B
        </span>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Busqueda de internos"
        description="Busque personal por nombre, area o numero de interno."
        commandProps={{ shouldFilter: false }}
      >
        <CommandInput
          value={searchQuery}
          onValueChange={setSearchQuery}
          placeholder="Buscar por nombre, area o interno..."
        />
        <CommandList>
          {loading && entries.length === 0 ? (
            <div className="flex items-center justify-center p-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : null}

          {!loading && error ? (
            <div className="space-y-2 p-3 text-sm">
              <p className="text-destructive">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void loadEntries(true)}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Reintentar
              </Button>
            </div>
          ) : null}

          {!loading && !error && searchQuery.trim().length < 2 ? (
            <div className="p-3 text-sm text-muted-foreground">
              Escriba al menos 2 caracteres para buscar.
            </div>
          ) : null}

          {!loading && !error && searchQuery.trim().length >= 2 ? (
            <>
              <CommandEmpty>Sin resultados para esa busqueda.</CommandEmpty>

              {groups.map(([department, extensionEntries]) => (
                <CommandGroup key={department} heading={department}>
                  {extensionEntries.map((entry) => (
                    <CommandItem
                      key={`${department}-${entry.extension}`}
                      value={`${department} ${entry.extension} ${entry.people
                        .map((person) => `${person.name} ${person.role}`)
                        .join(" ")}`}
                    >
                      <Phone className="h-4 w-4" />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">
                          {entry.people.length === 1
                            ? entry.people[0].name
                            : `${entry.people[0].name} +${entry.people.length - 1}`}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {entry.people.map((person) => person.name).join(" · ")}
                        </span>
                      </div>
                      <CommandShortcut>Int. {entry.extension}</CommandShortcut>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
}
