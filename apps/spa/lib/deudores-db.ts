import fs from "node:fs/promises";
import path from "node:path";
import sqlite3 from "sqlite3";

type SqlRunResult = {
  lastID: number;
  changes: number;
};

type DeudaRow = {
  id: number;
  deudorId: number;
  fecha: string;
  descripcion: string;
  monto: string;
};

type DeudorRow = {
  id: number;
  nombre: string;
};

export type DeudaPayload = {
  id: number;
  fecha: string;
  comentario: string;
  debe: string;
};

export type DeudorPayload = {
  id: number;
  nombre: string;
  deudas: DeudaPayload[];
};

const DB_PATH = process.env.DEUDORES_DB_PATH ?? path.join(process.cwd(), "data", "deudores.sqlite");

let databasePromise: Promise<sqlite3.Database> | null = null;

function run(db: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<SqlRunResult>((resolve, reject) => {
    db.run(sql, params, function onResult(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve({
        lastID: this.lastID,
        changes: this.changes
      });
    });
  });
}

function all<T>(db: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<T[]>((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows as T[]);
    });
  });
}

function get<T>(db: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<T | undefined>((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(row as T | undefined);
    });
  });
}

async function initDatabase() {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });

  const db = await new Promise<sqlite3.Database>((resolve, reject) => {
    const instance = new sqlite3.Database(DB_PATH, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(instance);
    });
  });

  await run(db, "PRAGMA foreign_keys = ON");

  await run(
    db,
    `
      CREATE TABLE IF NOT EXISTS deudores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        creado_en TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `
  );

  await run(
    db,
    `
      CREATE TABLE IF NOT EXISTS deudas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deudor_id INTEGER NOT NULL,
        fecha TEXT NOT NULL,
        descripcion TEXT NOT NULL,
        monto TEXT NOT NULL,
        creado_en TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (deudor_id) REFERENCES deudores(id) ON DELETE CASCADE
      )
    `
  );

  return db;
}

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = initDatabase();
  }

  return databasePromise;
}

export async function listDeudores() {
  const db = await getDatabase();
  const deudores = await all<DeudorRow>(db, "SELECT id, nombre FROM deudores ORDER BY nombre COLLATE NOCASE");
  const deudas = await all<DeudaRow>(
    db,
    "SELECT id, deudor_id as deudorId, fecha, descripcion, monto FROM deudas ORDER BY fecha DESC, id DESC"
  );

  const debtMap = new Map<number, DeudaPayload[]>();
  for (const deuda of deudas) {
    const existing = debtMap.get(deuda.deudorId) ?? [];
    existing.push({
      id: deuda.id,
      fecha: deuda.fecha,
      comentario: deuda.descripcion,
      debe: String(deuda.monto ?? "")
    });
    debtMap.set(deuda.deudorId, existing);
  }

  return deudores.map<DeudorPayload>((deudor) => ({
    id: deudor.id,
    nombre: deudor.nombre,
    deudas: debtMap.get(deudor.id) ?? []
  }));
}

export async function insertDeudor(nombre: string) {
  const db = await getDatabase();
  const result = await run(db, "INSERT INTO deudores (nombre) VALUES (?)", [nombre]);
  return result.lastID;
}

export async function insertDeuda(deudorId: number, payload: { fecha: string; descripcion: string; debe: string }) {
  const db = await getDatabase();
  const deudor = await get<{ id: number }>(db, "SELECT id FROM deudores WHERE id = ?", [deudorId]);
  if (!deudor) {
    return null;
  }

  const result = await run(
    db,
    "INSERT INTO deudas (deudor_id, fecha, descripcion, monto) VALUES (?, ?, ?, ?)",
    [deudorId, payload.fecha, payload.descripcion, payload.debe]
  );

  return result.lastID;
}

export async function updateDeuda(
  deudorId: number,
  deudaId: number,
  payload: { fecha: string; descripcion: string; debe: string }
) {
  const db = await getDatabase();
  const result = await run(
    db,
    "UPDATE deudas SET fecha = ?, descripcion = ?, monto = ? WHERE id = ? AND deudor_id = ?",
    [payload.fecha, payload.descripcion, payload.debe, deudaId, deudorId]
  );

  return result.changes > 0;
}

export async function removeDeudor(deudorId: number) {
  const db = await getDatabase();
  const result = await run(db, "DELETE FROM deudores WHERE id = ?", [deudorId]);
  return result.changes > 0;
}

export async function removeDeuda(deudorId: number, deudaId: number) {
  const db = await getDatabase();
  const result = await run(db, "DELETE FROM deudas WHERE id = ? AND deudor_id = ?", [deudaId, deudorId]);
  return result.changes > 0;
}
