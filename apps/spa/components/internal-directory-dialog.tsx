"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Loader2, Phone, Pin, PinOff, RefreshCw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "./auth-provider";
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

type DirectoryPayload = {
  personnel: DirectoryEntry[];
  metadata?: {
    hasDocument?: boolean;
  };
  error?: string;
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

type PinnedEntry = {
  label: string;
  internal: string;
};

const PINNED_KEY = "internos-guardados";
const MAX_PINNED = 5;

function loadPinned(): PinnedEntry[] {
  try {
    const raw = localStorage.getItem(PINNED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PinnedEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePinned(entries: PinnedEntry[]): void {
  localStorage.setItem(PINNED_KEY, JSON.stringify(entries.slice(0, MAX_PINNED)));
}

function addPin(label: string, internal: string): PinnedEntry[] {
  const entries = loadPinned();
  if (entries.some((e) => e.label === label && e.internal === internal)) return entries;
  const updated = [...entries, { label, internal }].slice(0, MAX_PINNED);
  savePinned(updated);
  return updated;
}

function removePin(label: string, internal: string): PinnedEntry[] {
  const entries = loadPinned().filter(
    (e) => !(e.label === label && e.internal === internal)
  );
  savePinned(entries);
  return entries;
}

function isPinned(pinned: PinnedEntry[], label: string, internal: string): boolean {
  return pinned.some((e) => e.label === label && e.internal === internal);
}

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

export function InternalDirectoryDialog() {
  const { canUpload } = useAuth();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hasDocument, setHasDocument] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [pinned, setPinned] = useState<PinnedEntry[]>([]);

  const loadEntries = useCallback(
    async (force = false) => {
      if (loading) return;
      if (loaded && !force) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/internos/", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("No se pudo cargar el directorio.");
        }

        const payload = (await response.json()) as DirectoryPayload;
        if (!payload || !Array.isArray(payload.personnel)) {
          throw new Error("Respuesta invalida del directorio.");
        }

        setEntries(payload.personnel);
        setHasDocument(Boolean(payload.metadata?.hasDocument));
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
    void loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    setPinned(loadPinned());
  }, []);

  useEffect(() => {
    if (open && !loaded && !loading) {
      void loadEntries();
    }
  }, [loadEntries, loaded, loading, open]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setUploadStatus(null);
      return;
    }

    const focusId = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(focusId);
    };
  }, [open]);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".xlsx")) {
        setUploadStatus({ type: "error", message: "Seleccione un archivo .xlsx" });
        return;
      }

      try {
        setUploading(true);
        setUploadStatus(null);

        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/internos/", {
          method: "POST",
          body: formData
        });

        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (!response.ok) {
          throw new Error(payload?.error || "No se pudo subir internos.xlsx");
        }

        await loadEntries(true);
        setUploadStatus({ type: "success", message: "Documento cargado correctamente" });
      } catch (uploadError) {
        const message =
          uploadError instanceof Error && uploadError.message
            ? uploadError.message
            : "No se pudo subir internos.xlsx";
        setUploadStatus({ type: "error", message });
      } finally {
        setUploading(false);
      }
    },
    [loadEntries]
  );

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

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

  const handlePin = useCallback((label: string, internal: string) => {
    if (isPinned(pinned, label, internal)) {
      setPinned(removePin(label, internal));
    } else {
      setPinned(addPin(label, internal));
    }
  }, [pinned]);

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
        commandProps={{ shouldFilter: false, className: "relative" }}
      >
        {canUpload && hasDocument ? (
          <Button
            type="button"
            variant="ghost"
            className="absolute right-10 top-4 z-20 h-4 w-4 rounded-sm p-0 opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={openFilePicker}
            disabled={uploading}
            aria-label="Subir documento"
            title="Subir documento"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          </Button>
        ) : null}

        {canUpload ? (
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(event) => {
              const selectedFile = event.target.files?.[0];
              if (selectedFile) {
                void handleUpload(selectedFile);
              }
              event.target.value = "";
            }}
          />
        ) : null}
        <CommandInput
          ref={searchInputRef}
          autoFocus
          value={searchQuery}
          onValueChange={setSearchQuery}
          placeholder="Buscar por nombre, area o interno..."
        />
        <CommandList>
          {canUpload && hasDocument === false ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openFilePicker}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                )}
                Cargar documento
              </Button>

              {uploadStatus ? (
                <span
                  className={`text-xs ${
                    uploadStatus.type === "error" ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"
                  }`}
                >
                  {uploadStatus.message}
                </span>
              ) : null}
            </div>
          ) : null}

          {hasDocument && uploadStatus ? (
            <div className="border-b px-3 py-2 text-xs">
              <span
                className={
                  uploadStatus.type === "error" ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"
                }
              >
                {uploadStatus.message}
              </span>
            </div>
          ) : null}

          {loading && entries.length === 0 && hasDocument !== false ? (
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
            <div className="px-3 py-2">
              {pinned.length > 0 ? (
                <>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Guardados</p>
                  <div className="flex flex-col gap-1">
                    {pinned.map((entry) => (
                      <div
                        key={`${entry.label}-${entry.internal}`}
                        className="group flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5 text-sm"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <Pin className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span className="truncate">{entry.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="shrink-0 text-xs text-muted-foreground">
                            int. {entry.internal}
                          </span>
                          <button
                            type="button"
                            className="hidden rounded p-0.5 text-muted-foreground hover:text-destructive group-hover:inline-flex"
                            onClick={() => handlePin(entry.label, entry.internal)}
                            title="Quitar de guardados"
                          >
                            <PinOff className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Pase el mouse sobre un resultado y presione <Pin className="mb-0.5 inline h-3 w-3" /> para guardarlo.
                </p>
              )}
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
                      className="group"
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
                      <div className="ml-auto flex items-center gap-1">
                        <button
                          type="button"
                          className={`rounded p-0.5 transition-opacity ${
                            isPinned(pinned, entry.people[0]?.name || department, entry.extension)
                              ? "text-foreground opacity-100"
                              : "text-muted-foreground opacity-0 hover:opacity-100 group-hover:opacity-70"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePin(entry.people[0]?.name || department, entry.extension);
                          }}
                          title={
                            isPinned(pinned, entry.people[0]?.name || department, entry.extension)
                              ? "Quitar de guardados"
                              : "Guardar"
                          }
                        >
                          <Pin className="h-3.5 w-3.5" />
                        </button>
                        <CommandShortcut>Int. {entry.extension}</CommandShortcut>
                      </div>
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
