import { access, mkdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";

type CellValue = string | number | boolean | Date | null | undefined;

export type InternalDirectoryEntry = {
  id: string;
  name: string;
  role: string;
  area: string;
  internal: string;
};

const HEADER_SCAN_ROWS = 20;
const MAX_ROWS = 1200;
const MAX_COLS = 12;

const STOP_TOKENS = ["telefonos internos reserva", "reserva 6000"];

const HEADER_TOKENS = {
  extension: ["interno", "internos", "extension", "ext", "anexo", "telefono", "telefonos", "int"],
  area: ["sector", "departamento", "area", "unidad", "seccion"],
  role: ["titulo", "cargo", "puesto", "funcion"],
  name: ["apellido y nombre", "apellidos y nombres", "apellido", "nombre", "responsable", "contacto"]
} as const;

const DEFAULT_INDICES = {
  extension: 1,
  area: 2,
  role: 3,
  name: 4
} as const;

type HeaderMap = {
  internalIndex: number;
  areaIndex: number;
  roleIndex: number;
  nameIndex: number;
};

type InternalDirectoryCache = {
  entries: InternalDirectoryEntry[];
  loadedAt: string;
  hasDocument: boolean;
};

let cache: InternalDirectoryCache | null = null;
let cachePromise: Promise<InternalDirectoryCache> | null = null;

const DEFAULT_INTERNALS_XLSX_PATH = path.join(process.cwd(), "public", "internos.xlsx");

function getPrimaryXlsxPath(): string {
  return process.env.INTERNALS_XLSX_PATH || DEFAULT_INTERNALS_XLSX_PATH;
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

function normalizeCell(value: CellValue): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeInternal(value: string): string {
  return value.replace(/\.0+$/, "");
}

function splitNames(value: string): string[] {
  return value
    .split(/\s*\/\s*|\s*;\s*|\s*\|\s*|\r?\n|\s+-\s+/g)
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

function isNumericInternal(value: string): boolean {
  const cleaned = value.replace(/\s+/g, "").replace(/\./g, "");
  return cleaned.length > 0 && /^\d+$/.test(cleaned);
}

function matchesToken(normalized: string, tokens: readonly string[]): boolean {
  return tokens.some((token) => normalized === token || normalized.includes(token));
}

function uniqueIndices(indices: number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];

  for (const idx of indices) {
    if (idx < 0 || Number.isNaN(idx) || seen.has(idx)) continue;
    seen.add(idx);
    out.push(idx);
  }

  return out;
}

function pickCell(row: CellValue[], indices: number[]): string {
  for (const idx of indices) {
    if (idx < 0 || idx >= row.length) continue;
    const value = normalizeCell(row[idx]);
    if (value) return value;
  }
  return "";
}

function shouldStop(values: string[], hasName: boolean, hasNumericInternal: boolean): boolean {
  if (hasName || hasNumericInternal) return false;

  return values.some((value) => {
    const normalized = normalizeText(value);
    return normalized.length > 0 && STOP_TOKENS.some((token) => normalized.includes(token));
  });
}

function detectHeaderMap(rawData: CellValue[][]): { headerRowIndex: number; map: HeaderMap } {
  const maxRows = Math.min(rawData.length, HEADER_SCAN_ROWS);

  for (let i = 0; i < maxRows; i++) {
    const row = rawData[i] || [];
    const map: HeaderMap = {
      internalIndex: -1,
      areaIndex: -1,
      roleIndex: -1,
      nameIndex: -1
    };

    let foundInternal = false;
    let foundArea = false;
    let foundRole = false;
    let foundName = false;

    row.forEach((cell, idx) => {
      const normalized = normalizeText(normalizeCell(cell));
      if (!normalized) return;

      if (!foundInternal && matchesToken(normalized, HEADER_TOKENS.extension)) {
        map.internalIndex = idx;
        foundInternal = true;
      }
      if (!foundArea && matchesToken(normalized, HEADER_TOKENS.area)) {
        map.areaIndex = idx;
        foundArea = true;
      }
      if (!foundRole && matchesToken(normalized, HEADER_TOKENS.role)) {
        map.roleIndex = idx;
        foundRole = true;
      }
      if (!foundName && matchesToken(normalized, HEADER_TOKENS.name)) {
        map.nameIndex = idx;
        foundName = true;
      }
    });

    if (foundName && (foundInternal || foundArea)) {
      return { headerRowIndex: i, map };
    }
  }

  return {
    headerRowIndex: -1,
    map: {
      internalIndex: DEFAULT_INDICES.extension,
      areaIndex: DEFAULT_INDICES.area,
      roleIndex: DEFAULT_INDICES.role,
      nameIndex: DEFAULT_INDICES.name
    }
  };
}

function processRows(rawRows: CellValue[][]): InternalDirectoryEntry[] {
  const rawData = rawRows.slice(0, MAX_ROWS).map((row) => row.slice(0, MAX_COLS));
  const { headerRowIndex, map } = detectHeaderMap(rawData);
  const startIndex = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;

  const entries: InternalDirectoryEntry[] = [];
  let id = 1;

  for (let i = startIndex; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.every((cell) => !normalizeCell(cell))) continue;

    const rowValues = row.map((cell) => normalizeCell(cell));

    const internalRaw = pickCell(
      row,
      uniqueIndices([map.internalIndex, DEFAULT_INDICES.extension, 0])
    );

    const nameRaw = pickCell(
      row,
      uniqueIndices([map.nameIndex, DEFAULT_INDICES.name, DEFAULT_INDICES.role])
    );

    const areaRaw = pickCell(
      row,
      uniqueIndices([map.areaIndex, DEFAULT_INDICES.area, DEFAULT_INDICES.role])
    );

    const roleRaw = pickCell(
      row,
      uniqueIndices([map.roleIndex, DEFAULT_INDICES.role])
    );

    const internal = internalRaw ? normalizeInternal(internalRaw) : "";
    const hasName = nameRaw.length > 0;
    const hasNumeric = internalRaw ? isNumericInternal(internalRaw) : false;

    if (shouldStop(rowValues, hasName, hasNumeric)) {
      break;
    }

    if (!hasName && !internal) continue;

    const names = hasName ? splitNames(nameRaw) : ["Sin Nombre"];
    const area = areaRaw || "Sector sin identificar";
    const role = roleRaw || "Sin cargo";

    for (const rawName of names) {
      const name = rawName.trim();
      if (!name) continue;
      if (name.toLowerCase().includes("acalandra@servicoop.com")) continue;
      if (name.toLowerCase().includes("sector comunicaciones al interno")) continue;

      entries.push({
        id: String(id++),
        name,
        role,
        area,
        internal: internal || "N/A"
      });
    }
  }

  return entries.sort((a, b) => {
    if (a.area !== b.area) return a.area.localeCompare(b.area);
    return a.name.localeCompare(b.name);
  });
}

async function resolveXlsxPath(): Promise<string | null> {
  const candidates = [
    getPrimaryXlsxPath(),
    path.join(os.homedir(), "internos.xlsx"),
    path.join(process.cwd(), "public", "internos.xlsx")
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  return null;
}

export async function resolveTargetInternalsXlsxPath(): Promise<string> {
  const targetPath = getPrimaryXlsxPath();
  await mkdir(path.dirname(targetPath), { recursive: true });
  return targetPath;
}

export function invalidateInternalDirectoryCache(): void {
  cache = null;
  cachePromise = null;
}

export async function reloadInternalDirectoryCache(): Promise<InternalDirectoryCache> {
  invalidateInternalDirectoryCache();
  return primeInternalDirectoryCache();
}

async function loadCacheFromFile(): Promise<InternalDirectoryCache> {
  const sourcePath = await resolveXlsxPath();
  if (!sourcePath) {
    return {
      entries: [],
      loadedAt: new Date().toISOString(),
      hasDocument: false
    };
  }

  const workbookBuffer = await readFile(sourcePath);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(workbookBuffer as unknown as never);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return {
      entries: [],
      loadedAt: new Date().toISOString(),
      hasDocument: true
    };
  }

  const rows: CellValue[][] = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber > MAX_ROWS) {
      return;
    }

    const current: CellValue[] = [];
    for (let col = 1; col <= MAX_COLS; col += 1) {
      const value = row.getCell(col).value;
      if (value && typeof value === "object" && "text" in value && typeof value.text === "string") {
        current.push(value.text);
        continue;
      }

      if (value && typeof value === "object" && "result" in value) {
        const result = value.result;
        current.push(typeof result === "undefined" ? "" : String(result));
        continue;
      }

      if (Array.isArray(value)) {
        current.push(value.map((part) => (typeof part === "object" && part && "text" in part ? String(part.text) : "")).join(""));
        continue;
      }

      current.push(typeof value === "undefined" || value === null ? "" : String(value));
    }

    rows.push(current);
  });

  return {
    entries: processRows(rows),
    loadedAt: new Date().toISOString(),
    hasDocument: true
  };
}

export async function primeInternalDirectoryCache(): Promise<InternalDirectoryCache> {
  if (cache) return cache;
  if (cachePromise) return cachePromise;

  cachePromise = loadCacheFromFile()
    .then((loaded) => {
      cache = loaded;
      return loaded;
    })
    .finally(() => {
      cachePromise = null;
    });

  return cachePromise;
}

export async function getInternalDirectoryCache(): Promise<InternalDirectoryCache> {
  return primeInternalDirectoryCache();
}
