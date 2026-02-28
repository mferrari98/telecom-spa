type FeriadoTipo = "nacional" | "provincial";

export type FeriadoInfo = {
  nombre: string;
  tipo: FeriadoTipo;
};

export type GuardiasDayCell = {
  dateIso: string;
  dia: number;
  diaSemana: string;
  guardia: string;
  color: string;
  esFeriado: boolean;
  nombreFeriado: string | null;
  tipoFeriado: FeriadoTipo | null;
  esHoy: boolean;
};

export type GuardiasMonthRow = {
  mes: string;
  mesNumero: number;
  anio: number;
  fila: Array<GuardiasDayCell | null>;
};

export type GuardiaActualInfo = {
  nombre: string;
  inicioIso: string;
  finIso: string;
  diasRestantes: number;
};

export type GuardiasCalendarPayload = {
  anio: number;
  guardias: string[];
  colores: Record<string, string>;
  celular: string;
  mesesData: GuardiasMonthRow[];
  guardiaActual: GuardiaActualInfo | null;
  feriadosPorGuardia: Record<string, number>;
  hoyIso: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const CAL_CACHE_DURATION_MS = 60 * 60 * 1000;
const CAL_CACHE_MAX_ITEMS = 6;

const MESES_CORTOS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic"
] as const;

const DIAS_CORTOS = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"] as const;

const FERIADOS_FIJOS_NACIONALES: Array<[number, number, string, FeriadoTipo]> = [
  [1, 1, "Ano Nuevo", "nacional"],
  [3, 24, "Dia de la Memoria", "nacional"],
  [4, 2, "Dia del Veterano y de los Caidos en Malvinas", "nacional"],
  [5, 1, "Dia del Trabajador", "nacional"],
  [5, 25, "Dia de la Revolucion de Mayo", "nacional"],
  [6, 20, "Dia de Manuel Belgrano", "nacional"],
  [7, 9, "Dia de la Independencia", "nacional"],
  [8, 17, "Dia de Jose de San Martin", "nacional"],
  [10, 12, "Dia de la Diversidad Cultural", "nacional"],
  [11, 20, "Dia de la Soberania Nacional", "nacional"],
  [12, 8, "Inmaculada Concepcion", "nacional"],
  [12, 25, "Navidad", "nacional"]
];

const FERIADOS_CHUBUT: Array<[number, number, string, FeriadoTipo]> = [
  [4, 30, "Plebiscito 1902", "provincial"],
  [7, 28, "Gesta Galesa", "provincial"],
  [10, 28, "Fundacion del Chubut", "provincial"],
  [11, 3, "Lealtad a la bandera", "provincial"],
  [12, 13, "Dia del Petroleo", "provincial"]
];

const COLORES_BASE = [
  "#A5C9E8",
  "#A8E6B8",
  "#F5E5A0",
  "#F5C89B",
  "#FFB6C1",
  "#E6E6FA",
  "#98FB98",
  "#F0E68C"
] as const;

type GuardiasCalendarCacheEntry = {
  payload: GuardiasCalendarPayload;
  timestamp: number;
};

const calendarCache = new Map<number, GuardiasCalendarCacheEntry>();

function parseGuardias(): string[] {
  const raw = process.env.GUARDIAS || "FERRARI,ARCE,CARO,DONATO";
  const parsed = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : ["FERRARI", "ARCE", "CARO", "DONATO"];
}

function parseFechaReferencia(): Date {
  const raw = process.env.FECHA_REFERENCIA || "2025-01-07";
  const parsed = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return new Date("2025-01-07T00:00:00");
  }
  return parsed;
}

function parseGuardiaReferencia(guardias: string[]): string {
  const candidate = process.env.GUARDIA_REFERENCIA || "DONATO";
  if (guardias.includes(candidate)) {
    return candidate;
  }
  return guardias[0];
}

function getConfig() {
  const guardias = parseGuardias();
  const guardiaReferencia = parseGuardiaReferencia(guardias);
  const indiceReferencia = Math.max(0, guardias.indexOf(guardiaReferencia));

  const colores: Record<string, string> = {};
  for (let i = 0; i < guardias.length; i += 1) {
    colores[guardias[i]] = COLORES_BASE[i % COLORES_BASE.length];
  }

  return {
    celular: process.env.CELULAR_CORPORATIVO || "+54 280 123-4567",
    duracionGuardiaDias: 14,
    fechaReferencia: parseFechaReferencia(),
    guardias,
    indiceReferencia,
    colores
  };
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function diffDaysUtc(a: Date, b: Date): number {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utcA - utcB) / DAY_MS);
}

function calcularSemanaSanta(anio: number) {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;

  const domingoPascua = new Date(anio, mes - 1, dia);
  return {
    juevesSanto: addDays(domingoPascua, -3),
    viernesSanto: addDays(domingoPascua, -2)
  };
}

function calcularCarnaval(anio: number) {
  const semanaSanta = calcularSemanaSanta(anio);
  const domingoPascua = addDays(semanaSanta.viernesSanto, 2);
  return {
    lunes: addDays(domingoPascua, -48),
    martes: addDays(domingoPascua, -47)
  };
}

function obtenerFeriados(anio: number): Map<string, FeriadoInfo> {
  const map = new Map<string, FeriadoInfo>();

  for (const [mes, dia, nombre, tipo] of FERIADOS_FIJOS_NACIONALES) {
    const fecha = new Date(anio, mes - 1, dia);
    map.set(toDateKey(fecha), { nombre, tipo });
  }

  for (const [mes, dia, nombre, tipo] of FERIADOS_CHUBUT) {
    const fecha = new Date(anio, mes - 1, dia);
    map.set(toDateKey(fecha), { nombre, tipo });
  }

  const carnaval = calcularCarnaval(anio);
  map.set(toDateKey(carnaval.lunes), { nombre: "Lunes de Carnaval", tipo: "nacional" });
  map.set(toDateKey(carnaval.martes), { nombre: "Martes de Carnaval", tipo: "nacional" });

  const semanaSanta = calcularSemanaSanta(anio);
  map.set(toDateKey(semanaSanta.juevesSanto), { nombre: "Jueves Santo", tipo: "nacional" });
  map.set(toDateKey(semanaSanta.viernesSanto), { nombre: "Viernes Santo", tipo: "nacional" });

  return map;
}

function calcularGuardia(fecha: Date, config: ReturnType<typeof getConfig>) {
  const dias = diffDaysUtc(fecha, config.fechaReferencia);
  const periodos = Math.floor(dias / config.duracionGuardiaDias);
  const idx =
    ((config.indiceReferencia + periodos) % config.guardias.length + config.guardias.length) %
    config.guardias.length;

  return config.guardias[idx];
}

function obtenerGuardiaActual(config: ReturnType<typeof getConfig>, anio: number): GuardiaActualInfo | null {
  const hoy = new Date();
  if (hoy.getFullYear() !== anio) {
    return null;
  }

  const diasDesdeRef = diffDaysUtc(hoy, config.fechaReferencia);
  const periodoActual = Math.floor(diasDesdeRef / config.duracionGuardiaDias);
  const inicio = addDays(config.fechaReferencia, periodoActual * config.duracionGuardiaDias);
  const fin = addDays(inicio, config.duracionGuardiaDias - 1);
  const nombre = calcularGuardia(hoy, config);

  return {
    nombre,
    inicioIso: toDateKey(inicio),
    finIso: toDateKey(fin),
    diasRestantes: diffDaysUtc(fin, hoy) + 1
  };
}

function generarFilaMes(
  anio: number,
  mesNumero: number,
  config: ReturnType<typeof getConfig>,
  feriados: Map<string, FeriadoInfo>
): GuardiasMonthRow {
  const fila: Array<GuardiasDayCell | null> = [];
  const diasDelMes = new Date(anio, mesNumero, 0).getDate();
  const hoyIso = toDateKey(new Date());

  for (let diaColumna = 1; diaColumna <= 31; diaColumna += 1) {
    if (diaColumna > diasDelMes) {
      fila.push(null);
      continue;
    }

    const fecha = new Date(anio, mesNumero - 1, diaColumna);
    const dateIso = toDateKey(fecha);
    const guardia = calcularGuardia(fecha, config);
    const feriado = feriados.get(dateIso) || null;

    fila.push({
      dateIso,
      dia: diaColumna,
      diaSemana: DIAS_CORTOS[fecha.getDay()],
      guardia,
      color: config.colores[guardia],
      esFeriado: Boolean(feriado),
      nombreFeriado: feriado?.nombre || null,
      tipoFeriado: feriado?.tipo || null,
      esHoy: dateIso === hoyIso
    });
  }

  return {
    mes: MESES_CORTOS[mesNumero - 1],
    mesNumero,
    anio,
    fila
  };
}

function contarFeriadosPorGuardia(
  config: ReturnType<typeof getConfig>,
  feriados: Map<string, FeriadoInfo>
) {
  const conteo: Record<string, number> = {};
  for (const guardia of config.guardias) {
    conteo[guardia] = 0;
  }

  for (const key of feriados.keys()) {
    const fecha = new Date(`${key}T00:00:00`);
    const guardia = calcularGuardia(fecha, config);
    conteo[guardia] += 1;
  }

  return conteo;
}

function buildPayload(anio: number): GuardiasCalendarPayload {
  const config = getConfig();
  const feriados = obtenerFeriados(anio);

  const mesesData: GuardiasMonthRow[] = [];
  for (let mesNumero = 1; mesNumero <= 12; mesNumero += 1) {
    mesesData.push(generarFilaMes(anio, mesNumero, config, feriados));
  }

  return {
    anio,
    guardias: config.guardias,
    colores: config.colores,
    celular: config.celular,
    mesesData,
    guardiaActual: obtenerGuardiaActual(config, anio),
    feriadosPorGuardia: contarFeriadosPorGuardia(config, feriados),
    hoyIso: toDateKey(new Date())
  };
}

export function getGuardiasCalendar(anio: number): GuardiasCalendarPayload {
  const now = Date.now();
  const cached = calendarCache.get(anio);

  if (cached && now - cached.timestamp < CAL_CACHE_DURATION_MS) {
    return cached.payload;
  }

  const payload = buildPayload(anio);
  calendarCache.set(anio, { payload, timestamp: now });

  if (calendarCache.size > CAL_CACHE_MAX_ITEMS) {
    const entries = Array.from(calendarCache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
    const oldest = entries[0]?.[0];
    if (typeof oldest === "number") {
      calendarCache.delete(oldest);
    }
  }

  return payload;
}
