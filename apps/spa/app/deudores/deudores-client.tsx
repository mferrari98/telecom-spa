"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Calendar, Info, Plus, Trash2, UserRound } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PortalHeader, toast } from "@telecom/ui";

type Deuda = {
  id: number;
  fecha: string;
  comentario: string;
  debe: string;
};

type Deudor = {
  id: number;
  nombre: string;
  deudas: Deuda[];
};

type DeudaDraft = {
  fecha: string;
  comentario: string;
  debe: string;
};

const DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const SHORT_DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{2})$/;
const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function getTodayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  if (!value) {
    return "Sin fecha";
  }

  if (ISO_PATTERN.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year.slice(-2)}`;
  }

  const longMatch = value.match(DATE_PATTERN);
  if (longMatch) {
    const [, day, month, year] = longMatch;
    return `${day}/${month}/${year.slice(-2)}`;
  }

  if (SHORT_DATE_PATTERN.test(value)) {
    return value;
  }

  return value;
}

function normalizeDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (ISO_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const longMatch = trimmed.match(DATE_PATTERN);
  if (longMatch) {
    const [, day, month, year] = longMatch;
    return `${year}-${month}-${day}`;
  }

  const shortMatch = trimmed.match(SHORT_DATE_PATTERN);
  if (shortMatch) {
    const [, day, month, year] = shortMatch;
    return `20${year}-${month}-${day}`;
  }

  return null;
}

function emptyDraft(): DeudaDraft {
  return {
    fecha: formatDate(getTodayIso()),
    comentario: "",
    debe: ""
  };
}

function openNativeDatePicker(input: HTMLInputElement | null) {
  if (!input) {
    return;
  }

  const picker = input.showPicker;
  if (typeof picker === "function") {
    picker.call(input);
    return;
  }

  input.focus();
  input.click();
}

async function responseErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? fallback;
  } catch {
    return fallback;
  }
}

export function DeudoresClient() {
  const [deudores, setDeudores] = useState<Deudor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingDebtor, setSavingDebtor] = useState(false);
  const [savingDebtId, setSavingDebtId] = useState<number | null>(null);
  const [savingEditId, setSavingEditId] = useState<number | null>(null);
  const [selectedDeudorId, setSelectedDeudorId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoDialogOpen, setNuevoDialogOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<number, DeudaDraft>>({});
  const [deudaDialogId, setDeudaDialogId] = useState<number | null>(null);
  const [editDebt, setEditDebt] = useState<{ deudorId: number; deudaId: number } | null>(null);
  const [editDraft, setEditDraft] = useState<DeudaDraft>(emptyDraft());
  const newDateInputRef = useRef<HTMLInputElement>(null);
  const editDateInputRef = useRef<HTMLInputElement>(null);

  const loadDeudores = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/deudores/", { cache: "no-store" });
      if (!response.ok) {
        setError(await responseErrorMessage(response, "No se pudo cargar la lista de deudores"));
        return;
      }

      const payload = (await response.json()) as { deudores?: Deudor[] };
      setDeudores(Array.isArray(payload.deudores) ? payload.deudores : []);
    } catch {
      setError("No se pudo cargar la lista de deudores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDeudores();
  }, []);

  const filteredDeudores = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return deudores;
    }

    return deudores.filter((deudor) => deudor.nombre.toLowerCase().includes(normalized));
  }, [deudores, searchTerm]);

  const selectedDeudor =
    filteredDeudores.find((deudor) => deudor.id === selectedDeudorId) ?? filteredDeudores[0] ?? null;

  useEffect(() => {
    if (!selectedDeudor) {
      if (selectedDeudorId !== null) {
        setSelectedDeudorId(null);
      }
      return;
    }

    if (selectedDeudor.id !== selectedDeudorId) {
      setSelectedDeudorId(selectedDeudor.id);
    }
  }, [selectedDeudor, selectedDeudorId]);

  useEffect(() => {
    if (deudaDialogId !== null && deudaDialogId !== selectedDeudorId) {
      setDeudaDialogId(null);
    }
  }, [deudaDialogId, selectedDeudorId]);

  useEffect(() => {
    if (editDebt && editDebt.deudorId !== selectedDeudorId) {
      setEditDebt(null);
    }
  }, [editDebt, selectedDeudorId]);

  const selectedDraft = selectedDeudor ? drafts[selectedDeudor.id] ?? emptyDraft() : emptyDraft();
  const normalizedSelectedDate = normalizeDate(selectedDraft.fecha) ?? "";
  const normalizedEditDate = normalizeDate(editDraft.fecha) ?? "";
  const inputSurfaceClass =
    "bg-[#ECECEC] dark:bg-[#2A2928] border-transparent text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring";

  const handleNuevoDialogChange = (open: boolean) => {
    setNuevoDialogOpen(open);
    if (!open) {
      setNuevoNombre("");
    }
  };

  const handleCrearDeudor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nombre = nuevoNombre.trim();
    if (!nombre) {
      toast.error("Ingresa un nombre para crear el deudor");
      return;
    }

    const alreadyExists = deudores.some((deudor) => deudor.nombre.toLowerCase() === nombre.toLowerCase());
    if (alreadyExists) {
      toast.warning("Ese deudor ya existe en la lista");
      return;
    }

    try {
      setSavingDebtor(true);
      setError(null);

      const response = await fetch("/api/deudores/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre })
      });

      if (!response.ok) {
        const message = await responseErrorMessage(response, "No se pudo guardar el deudor");
        setError(message);
        toast.error(message);
        return;
      }

      const payload = (await response.json()) as { id?: number };
      await loadDeudores();
      if (typeof payload.id === "number") {
        setSelectedDeudorId(payload.id);
      }

      setDrafts((current) => ({
        ...current,
        ...(typeof payload.id === "number" ? { [payload.id]: emptyDraft() } : {})
      }));
      setNuevoNombre("");
      setNuevoDialogOpen(false);
      toast.success("Deudor agregado");
    } catch {
      setError("No se pudo guardar el deudor");
      toast.error("No se pudo guardar el deudor");
    } finally {
      setSavingDebtor(false);
    }
  };

  const handleDraftChange = (deudorId: number, field: keyof DeudaDraft, value: string) => {
    setDrafts((current) => ({
      ...current,
      [deudorId]: {
        ...(current[deudorId] ?? emptyDraft()),
        [field]: value
      }
    }));
  };

  const handleDebtDialogChange = (deudorId: number, open: boolean) => {
    if (open) {
      setDrafts((current) => ({
        ...current,
        [deudorId]: current[deudorId] ?? emptyDraft()
      }));
      setDeudaDialogId(deudorId);
      return;
    }

    if (deudaDialogId === deudorId) {
      setDeudaDialogId(null);
    }
  };

  const handleAgregarDeuda = async (event: FormEvent<HTMLFormElement>, deudorId: number) => {
    event.preventDefault();

    const draft = drafts[deudorId] ?? emptyDraft();
    const fechaNormalizada = normalizeDate(draft.fecha);
    const comentario = draft.comentario.trim();
    const debe = draft.debe.trim();

    if (!fechaNormalizada) {
      toast.error("Selecciona una fecha valida");
      return;
    }

    if (!comentario) {
      toast.error("Ingresa un comentario");
      return;
    }

    if (!debe) {
      toast.error("Ingresa el importe adeudado");
      return;
    }

    try {
      setSavingDebtId(deudorId);
      setError(null);

      const response = await fetch(`/api/deudores/${deudorId}/deudas/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: fechaNormalizada,
          descripcion: comentario,
          debe
        })
      });

      if (!response.ok) {
        const message = await responseErrorMessage(response, "No se pudo guardar la deuda");
        setError(message);
        toast.error(message);
        return;
      }

      await loadDeudores();
      setDrafts((current) => ({
        ...current,
        [deudorId]: emptyDraft()
      }));
      setDeudaDialogId(null);
      toast.success("Deuda agregada");
    } catch {
      setError("No se pudo guardar la deuda");
      toast.error("No se pudo guardar la deuda");
    } finally {
      setSavingDebtId(null);
    }
  };

  const handleEditDialogChange = (deudorId: number, deuda: Deuda, open: boolean) => {
    if (open) {
      setEditDebt({ deudorId, deudaId: deuda.id });
      setEditDraft({
        fecha: formatDate(deuda.fecha),
        comentario: deuda.comentario,
        debe: deuda.debe
      });
      return;
    }

    if (editDebt?.deudaId === deuda.id) {
      setEditDebt(null);
    }
  };

  const handleModificarDeuda = async (event: FormEvent<HTMLFormElement>, deudorId: number, deudaId: number) => {
    event.preventDefault();

    const fechaNormalizada = normalizeDate(editDraft.fecha);
    const comentario = editDraft.comentario.trim();
    const debe = editDraft.debe.trim();

    if (!fechaNormalizada) {
      toast.error("Selecciona una fecha valida");
      return;
    }

    if (!comentario) {
      toast.error("Ingresa un comentario");
      return;
    }

    if (!debe) {
      toast.error("Ingresa el importe adeudado");
      return;
    }

    try {
      setSavingEditId(deudaId);
      setError(null);

      const response = await fetch(`/api/deudores/${deudorId}/deudas/${deudaId}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: fechaNormalizada,
          descripcion: comentario,
          debe
        })
      });

      if (!response.ok) {
        const message = await responseErrorMessage(response, "No se pudo actualizar la deuda");
        setError(message);
        toast.error(message);
        return;
      }

      await loadDeudores();
      setEditDebt(null);
      toast.success("Deuda actualizada");
    } catch {
      setError("No se pudo actualizar la deuda");
      toast.error("No se pudo actualizar la deuda");
    } finally {
      setSavingEditId(null);
    }
  };

  const handleEliminarDeudor = async (deudor: Deudor) => {
    const confirmed = window.confirm(`Eliminar deudor ${deudor.nombre}?`);
    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/deudores/${deudor.id}/`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const message = await responseErrorMessage(response, "No se pudo eliminar el deudor");
        setError(message);
        toast.error(message);
        return;
      }

      await loadDeudores();
      setDrafts((current) => {
        const next = { ...current };
        delete next[deudor.id];
        return next;
      });
      toast.success("Deudor eliminado");
    } catch {
      setError("No se pudo eliminar el deudor");
      toast.error("No se pudo eliminar el deudor");
    }
  };

  const handleEliminarDeuda = async (deudorId: number, deuda: Deuda) => {
    const confirmed = window.confirm("Eliminar esta deuda?");
    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/deudores/${deudorId}/deudas/${deuda.id}/`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const message = await responseErrorMessage(response, "No se pudo eliminar la deuda");
        setError(message);
        toast.error(message);
        return;
      }

      await loadDeudores();
      toast.success("Deuda eliminada");
    } catch {
      setError("No se pudo eliminar la deuda");
      toast.error("No se pudo eliminar la deuda");
    }
  };

  return (
    <div className="space-y-5">
      <PortalHeader
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/">Portal</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Deudores</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
        title="Deudores"
        subtitle="Seguimiento de deudas internas por persona"
      />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Listado de deudores</CardTitle>
              <CardDescription>Selecciona una persona para cargar, modificar o eliminar deudas.</CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Info className="mr-1.5 h-4 w-4" />
                    Acuerdo interno
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Acuerdo interno de convivencia</DialogTitle>
                    <DialogDescription>
                      Referencia interna de convivencia y contraprestaciones para miembros del sector.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-2 text-sm leading-relaxed text-foreground">
                    <p className="font-semibold uppercase tracking-wide">
                      ACUERDO INTERNO DE CONVIVENCIA Y CONTRAPRESTACIONES ENTRE LOS MIEMBROS DEL SECTOR
                    </p>

                    <p>
                      En la ciudad de ____________________, a los ____ dias del mes de ____________________ del ano
                      ______, los miembros integrantes del sector ____________________, en adelante denominados
                      conjuntamente como "LOS MIEMBROS", acuerdan celebrar el presente Acuerdo Interno, el cual se
                      regira por las siguientes clausulas y condiciones:
                    </p>

                    <div className="space-y-3">
                      <p>
                        <strong>PRIMERA - Objeto.</strong> El presente acuerdo tiene por objeto establecer normas
                        internas de convivencia, cortesia y contraprestaciones simbolicas entre LOS MIEMBROS, con la
                        finalidad de promover un ambiente de cooperacion, respeto mutuo e integracion dentro del
                        sector.
                      </p>

                      <p>
                        <strong>SEGUNDA - Ausencias prolongadas durante la jornada.</strong> Todo MIEMBRO que,
                        durante el horario habitual de trabajo, se ausente del sector por un periodo continuo superior
                        a treinta (30) minutos, por motivos personales o no operativos, asumira el compromiso de
                        proporcionar, a su regreso o dentro de un plazo razonable, una atencion, obsequio o
                        consumible equivalente, destinada a ser compartida con el resto de LOS MIEMBROS presentes en
                        el sector.
                      </p>

                      <p>
                        <strong>TERCERA - Reintegro posterior a periodo vacacional.</strong> Todo MIEMBRO que se
                        reincorpore al sector luego de un periodo de vacaciones debera proporcionar, en concepto de
                        atencion de reintegro, una cantidad minima equivalente a tres (3) empanadas por cada uno de
                        LOS MIEMBROS que integren el sector al momento de su reincorporacion. La entrega debera
                        realizarse dentro de un plazo maximo razonable posterior a su regreso.
                      </p>

                      <p>
                        <strong>CUARTA - Ascensos o promociones.</strong> Todo MIEMBRO que obtenga un ascenso,
                        promocion o mejora de categoria dentro de la organizacion debera proporcionar, en concepto de
                        reconocimiento y celebracion, una cantidad minima equivalente a tres (3) empanadas por cada
                        uno de LOS MIEMBROS del sector. La entrega debera efectuarse dentro de un plazo razonable
                        posterior a la confirmacion formal del ascenso o promocion.
                      </p>

                      <p>
                        <strong>QUINTA - Naturaleza del acuerdo.</strong> El presente acuerdo tiene caracter interno,
                        simbolico y de buena fe, y su cumplimiento se basa en los principios de companerismo,
                        reciprocidad y convivencia armonica entre LOS MIEMBROS, no constituyendo obligacion legal
                        exigible por via judicial ni generando relacion contractual de caracter laboral, comercial o
                        civil adicional a las ya existentes.
                      </p>

                      <p>
                        <strong>SEXTA - Aceptacion.</strong> LOS MIEMBROS manifiestan su conformidad con las
                        disposiciones precedentes y se comprometen a respetarlas en su espiritu y en su forma,
                        contribuyendo al fortalecimiento de las relaciones interpersonales dentro del sector.
                      </p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={nuevoDialogOpen} onOpenChange={handleNuevoDialogChange}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Nuevo deudor
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nuevo deudor</DialogTitle>
                    <DialogDescription>Registra una persona para comenzar a cargar deudas.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCrearDeudor} className="space-y-4">
                    <Input
                      placeholder="Nombre y apellido"
                      value={nuevoNombre}
                      onChange={(event) => setNuevoNombre(event.target.value)}
                      aria-label="Nombre del deudor"
                      className={inputSurfaceClass}
                    />
                    <DialogFooter>
                      <Button type="submit" size="sm" disabled={savingDebtor}>
                        {savingDebtor ? "Guardando..." : "Agregar deudor"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {error ? (
            <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[290px_1fr]">
            <div className="space-y-3 rounded-md bg-[#E2E2E2]/75 p-3 dark:bg-[#1F1E1D]">
              <Input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar deudor"
                aria-label="Buscar deudor"
                className={inputSurfaceClass}
              />
              <p className="text-xs text-muted-foreground">
                Mostrando {filteredDeudores.length} de {deudores.length} personas
              </p>

              <div className="max-h-[60vh] space-y-2 overflow-y-auto rounded-md bg-[#E2E2E2] p-2 dark:bg-[#232221]">
                {loading ? (
                  <p className="px-2 py-3 text-sm text-muted-foreground">Cargando deudores...</p>
                ) : null}

                {!loading && filteredDeudores.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-muted-foreground">
                    Todavia no hay deudores para este filtro.
                  </p>
                ) : (
                  filteredDeudores.map((deudor) => {
                    const isSelected = selectedDeudor?.id === deudor.id;

                    return (
                      <button
                        key={deudor.id}
                        type="button"
                        onClick={() => {
                          setSelectedDeudorId(deudor.id);
                          setDeudaDialogId(null);
                        }}
                        className={`w-full rounded-md px-3 py-2 text-left transition ${
                          isSelected
                            ? "bg-[#D0D0D0] dark:bg-[#272524]"
                            : "bg-[#E5E5E5] hover:bg-[#DBDBDB] dark:bg-[#252423] dark:hover:bg-[#2A2928]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{deudor.nombre}</p>
                            <p className="text-xs text-muted-foreground">{deudor.deudas.length} deudas</p>
                          </div>
                          <Badge variant="outline">{deudor.deudas.length}</Badge>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="space-y-4 rounded-md bg-[#EFEFEF]/70 p-3 dark:bg-[#1B1A19]">
              {selectedDeudor ? (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-md bg-white/65 p-2 dark:bg-[#232221]">
                        <UserRound className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-lg font-semibold">{selectedDeudor.nombre}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedDeudor.deudas.length} deudas registradas
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {selectedDeudor.deudas.length} {selectedDeudor.deudas.length === 1 ? "item" : "items"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Dialog
                      open={deudaDialogId === selectedDeudor.id}
                      onOpenChange={(open) => handleDebtDialogChange(selectedDeudor.id, open)}
                    >
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="mr-1.5 h-4 w-4" />
                          Nueva deuda
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Nueva deuda</DialogTitle>
                          <DialogDescription>
                            Registra una deuda para {selectedDeudor.nombre}.
                          </DialogDescription>
                        </DialogHeader>
                        <form
                          onSubmit={(event) => handleAgregarDeuda(event, selectedDeudor.id)}
                          className="space-y-4"
                        >
                          <div className="relative">
                            <Input
                              type="text"
                              inputMode="numeric"
                              pattern="\d{2}/\d{2}/\d{2}"
                              maxLength={8}
                              value={selectedDraft.fecha}
                              onChange={(event) =>
                                handleDraftChange(selectedDeudor.id, "fecha", event.target.value)
                              }
                              placeholder="dd/mm/aa"
                              aria-label="Fecha de la deuda en formato dd/mm/aa"
                              className={`pr-10 ${inputSurfaceClass}`}
                            />
                            <button
                              type="button"
                              onClick={() => openNativeDatePicker(newDateInputRef.current)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted/70"
                              aria-label="Abrir calendario"
                            >
                              <Calendar className="h-4 w-4" />
                            </button>
                            <input
                              ref={newDateInputRef}
                              type="date"
                              value={normalizedSelectedDate}
                              onChange={(event) =>
                                handleDraftChange(selectedDeudor.id, "fecha", formatDate(event.target.value))
                              }
                              className="sr-only"
                              tabIndex={-1}
                            />
                          </div>

                          <Input
                            type="text"
                            value={selectedDraft.comentario}
                            onChange={(event) =>
                              handleDraftChange(selectedDeudor.id, "comentario", event.target.value)
                            }
                            placeholder="Comentario"
                            aria-label="Comentario de la deuda"
                            className={inputSurfaceClass}
                          />

                          <Input
                            type="text"
                            value={selectedDraft.debe}
                            onChange={(event) =>
                              handleDraftChange(selectedDeudor.id, "debe", event.target.value)
                            }
                            placeholder="Debe"
                            aria-label="Importe adeudado"
                            className={inputSurfaceClass}
                          />

                          <DialogFooter>
                            <Button type="submit" size="sm" disabled={savingDebtId === selectedDeudor.id}>
                              {savingDebtId === selectedDeudor.id ? "Guardando..." : "Agregar deuda"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEliminarDeudor(selectedDeudor)}
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      Eliminar deudor
                    </Button>
                  </div>

                  {selectedDeudor.deudas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Sin deudas registradas para esta persona.
                    </p>
                  ) : (
                    <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
                      {selectedDeudor.deudas.map((deuda) => (
                        <div className="rounded-md bg-white/85 px-3 py-2 dark:bg-[#21201F]" key={deuda.id}>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold">{deuda.comentario}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(deuda.fecha)}</p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Debe</p>
                                <p className="text-sm font-semibold">{deuda.debe}</p>
                              </div>

                              <Dialog
                                open={editDebt?.deudaId === deuda.id}
                                onOpenChange={(open) =>
                                  handleEditDialogChange(selectedDeudor.id, deuda, open)
                                }
                              >
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    Modificar
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Modificar deuda</DialogTitle>
                                    <DialogDescription>
                                      Actualiza la deuda de {selectedDeudor.nombre}.
                                    </DialogDescription>
                                  </DialogHeader>

                                  <form
                                    onSubmit={(event) =>
                                      handleModificarDeuda(event, selectedDeudor.id, deuda.id)
                                    }
                                    className="space-y-4"
                                  >
                                    <div className="relative">
                                      <Input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="\d{2}/\d{2}/\d{2}"
                                        maxLength={8}
                                        value={editDraft.fecha}
                                        onChange={(event) =>
                                          setEditDraft((current) => ({
                                            ...current,
                                            fecha: event.target.value
                                          }))
                                        }
                                        placeholder="dd/mm/aa"
                                        aria-label="Fecha de la deuda en formato dd/mm/aa"
                                        className={`pr-10 ${inputSurfaceClass}`}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => openNativeDatePicker(editDateInputRef.current)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted/70"
                                        aria-label="Abrir calendario"
                                      >
                                        <Calendar className="h-4 w-4" />
                                      </button>
                                      <input
                                        ref={editDateInputRef}
                                        type="date"
                                        value={normalizedEditDate}
                                        onChange={(event) =>
                                          setEditDraft((current) => ({
                                            ...current,
                                            fecha: formatDate(event.target.value)
                                          }))
                                        }
                                        className="sr-only"
                                        tabIndex={-1}
                                      />
                                    </div>

                                    <Input
                                      type="text"
                                      value={editDraft.comentario}
                                      onChange={(event) =>
                                        setEditDraft((current) => ({
                                          ...current,
                                          comentario: event.target.value
                                        }))
                                      }
                                      placeholder="Comentario"
                                      aria-label="Comentario de la deuda"
                                      className={inputSurfaceClass}
                                    />

                                    <Input
                                      type="text"
                                      value={editDraft.debe}
                                      onChange={(event) =>
                                        setEditDraft((current) => ({
                                          ...current,
                                          debe: event.target.value
                                        }))
                                      }
                                      placeholder="Debe"
                                      aria-label="Importe adeudado"
                                      className={inputSurfaceClass}
                                    />

                                    <DialogFooter>
                                      <Button type="submit" size="sm" disabled={savingEditId === deuda.id}>
                                        {savingEditId === deuda.id ? "Guardando..." : "Guardar cambios"}
                                      </Button>
                                    </DialogFooter>
                                  </form>
                                </DialogContent>
                              </Dialog>

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEliminarDeuda(selectedDeudor.id, deuda)}
                                aria-label="Eliminar deuda"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
                  Crea o selecciona un deudor para comenzar a cargar deudas.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
