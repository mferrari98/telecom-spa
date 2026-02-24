"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { CloudSun, Download, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent
} from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import type { GuardiasCalendarPayload } from "@/lib/guardias-data";
import { PortalHeader, toast } from "@telecom/ui";

type ClimaInfo = {
  emoji: string;
  temp_max: number | null;
  temp_min: number | null;
};

type GuardiasClientProps = {
  payload: GuardiasCalendarPayload;
};

const dayNumbers = Array.from({ length: 31 }, (_, index) => index + 1);

export function GuardiasClient({ payload }: GuardiasClientProps) {
  const [selectedGuardia, setSelectedGuardia] = useState<string | null>(null);
  const [climaByFecha, setClimaByFecha] = useState<Record<string, ClimaInfo>>({});
  const [loadingClima, setLoadingClima] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const calendarCaptureRef = useRef<HTMLDivElement | null>(null);

  const guardiaActualText = useMemo(() => {
    if (!payload.guardiaActual) return null;
    return `${payload.guardiaActual.nombre} (${payload.guardiaActual.diasRestantes} dias restantes)`;
  }, [payload.guardiaActual]);

  const handleLoadClima = async () => {
    try {
      setLoadingClima(true);

      const response = await fetch("/api/guardias/clima", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("No se pudo obtener el pronostico");
      }

      const data = await response.json();
      if (!data?.success || !data?.clima) {
        throw new Error("Respuesta invalida de clima");
      }

      setClimaByFecha(data.clima as Record<string, ClimaInfo>);
      if (data?.fallback) {
        toast.warning("Pronostico estimado cargado");
      } else {
        toast.success("Pronostico actualizado");
      }
    } catch {
      toast.error("No se pudo cargar el pronostico");
    } finally {
      setLoadingClima(false);
    }
  };

  const handleDownloadCalendar = async () => {
    if (!calendarCaptureRef.current) {
      toast.error("No se encontro el calendario para descargar");
      return;
    }

    try {
      setDownloading(true);
      const source = calendarCaptureRef.current;
      const wrapper = document.createElement("div");
      const clone = source.cloneNode(true) as HTMLDivElement;

      wrapper.style.position = "fixed";
      wrapper.style.left = "-100000px";
      wrapper.style.top = "0";
      wrapper.style.padding = "12px";
      wrapper.style.background = getComputedStyle(source).backgroundColor || "#ffffff";

      clone.style.width = `${source.scrollWidth}px`;
      clone.style.maxWidth = "none";
      clone.style.overflow = "visible";

      clone.querySelectorAll<HTMLElement>(".sticky").forEach((node) => {
        node.style.position = "static";
      });

      const toolbar = clone.querySelector<HTMLElement>(".guardias-toolbar");
      if (toolbar) {
        const legendOnly = toolbar.querySelector<HTMLElement>(".guardias-legend")?.cloneNode(true) as HTMLElement | undefined;
        if (legendOnly) {
          toolbar.replaceChildren(legendOnly);
          toolbar.style.display = "flex";
          toolbar.style.justifyContent = "center";
          toolbar.style.alignItems = "center";
        } else {
          toolbar.remove();
        }
      }

      clone.querySelectorAll<HTMLElement>(".guardias-actions, .guardia-actual-text, .guardia-separator").forEach((node) => {
        node.remove();
      });

      clone.querySelectorAll<HTMLElement>(".clima-emoji, .clima-temp").forEach((node) => {
        node.remove();
      });

      clone.querySelectorAll<HTMLElement>("[data-es-hoy='true']").forEach((node) => {
        node.classList.remove("ring-2", "ring-red-500", "ring-inset");
      });

      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      let canvas: HTMLCanvasElement;
      try {
        canvas = await html2canvas(wrapper, {
          backgroundColor: getComputedStyle(source).backgroundColor || "#ffffff",
          scale: 2,
          useCORS: true,
          width: wrapper.scrollWidth,
          height: wrapper.scrollHeight,
          windowWidth: wrapper.scrollWidth,
          windowHeight: wrapper.scrollHeight,
          scrollX: 0,
          scrollY: 0
        });
      } finally {
        document.body.removeChild(wrapper);
      }

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((value) => resolve(value), "image/png");
      });

      if (!blob) {
        throw new Error("No se pudo crear el archivo");
      }

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `cronograma-guardias-${payload.anio}.png`;
      link.href = objectUrl;
      link.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 500);

      toast.success("Calendario descargado");
    } catch {
      toast.error("No se pudo descargar el calendario");
    } finally {
      setDownloading(false);
    }
  };

  const toggleGuardiaFilter = (guardia: string) => {
    setSelectedGuardia((current) => (current === guardia ? null : guardia));
  };

  return (
    <div className="mx-auto w-fit space-y-5">
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
                <BreadcrumbPage>Guardias</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
        title="Guardias"
        subtitle="Cronograma de guardias rotativas"
      />

      <Card className="w-fit">
        <CardContent className="space-y-4 px-2 pb-3 pt-3">
          <div className="space-y-3" ref={calendarCaptureRef}>
            <div className="guardias-toolbar grid items-center gap-3 lg:grid-cols-[1fr_auto_1fr]">
              <div className="guardias-contacto min-w-0 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground lg:justify-start">
                <span>Cel: {payload.celular}</span>
                {guardiaActualText ? <span className="guardia-separator">|</span> : null}
                {guardiaActualText ? <span className="guardia-actual-text">{guardiaActualText}</span> : null}
              </div>

              <div className="guardias-legend flex flex-wrap items-center justify-center gap-2">
                {payload.guardias.map((guardia) => (
                  <button
                    key={guardia}
                    type="button"
                    onClick={() => toggleGuardiaFilter(guardia)}
                    className={`rounded-full border px-3 py-1 text-sm font-semibold transition-transform hover:-translate-y-0.5 ${
                      selectedGuardia === guardia
                        ? "ring-1 ring-primary"
                        : selectedGuardia
                          ? "opacity-45"
                          : ""
                    }`}
                    style={{ backgroundColor: payload.colores[guardia], color: "#111" }}
                    title={`${payload.feriadosPorGuardia[guardia]} feriados en ${payload.anio}`}
                  >
                    {guardia}
                  </button>
                ))}
              </div>

              <div className="guardias-actions min-w-0 flex items-center justify-center gap-2 lg:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="h-8"
                  onClick={handleLoadClima}
                  disabled={loadingClima}
                >
                  {loadingClima ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CloudSun className="mr-1.5 h-4 w-4" />}
                  Solicitar pronostico
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8"
                  onClick={handleDownloadCalendar}
                  disabled={downloading}
                >
                  {downloading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
                  {downloading ? "Generando..." : "Descargar"}
                </Button>
              </div>
            </div>

            <div className="mx-auto w-fit rounded-md border bg-background">
              <table className="mx-auto w-auto border-collapse text-xs">
              <colgroup>
                <col className="w-14" />
                {dayNumbers.map((day) => (
                  <col key={`col-${day}`} className="w-9" />
                ))}
              </colgroup>
              <thead>
                <tr className="bg-muted/50">
                  <th className="sticky left-0 z-10 h-9 w-14 border-b border-r bg-muted/70 px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide">
                    Mes
                  </th>
                  {dayNumbers.map((day) => (
                    <th key={day} className="h-9 w-9 border-b border-r px-0 py-1 text-center text-[12px] font-semibold">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payload.mesesData.map((mes) => (
                  <tr key={`${mes.anio}-${mes.mesNumero}`}>
                    <td className="sticky left-0 z-10 h-9 w-14 border-b border-r bg-muted/70 px-2 py-1.5 text-left text-xs font-semibold uppercase">
                      {mes.mes}
                    </td>
                    {mes.fila.map((dia, index) => {
                      if (!dia) {
                        return <td key={`${mes.mesNumero}-empty-${index}`} className="h-9 w-9 border-b border-r bg-muted/20" />;
                      }

                      const clima = climaByFecha[dia.dateIso];
                      const maxTemp = clima?.temp_max !== null && clima?.temp_max !== undefined ? Math.round(clima.temp_max) : null;
                      const minTemp = clima?.temp_min !== null && clima?.temp_min !== undefined ? Math.round(clima.temp_min) : null;
                      const isDimmed = selectedGuardia ? dia.guardia !== selectedGuardia : false;

                      return (
                        <td
                          key={dia.dateIso}
                          className={`relative h-9 w-9 border-b border-r text-center align-middle ${
                            dia.esHoy ? "ring-2 ring-red-500 ring-inset" : ""
                          } ${dia.esFeriado ? "font-bold" : ""}`}
                          data-es-hoy={dia.esHoy ? "true" : undefined}
                          style={{
                            backgroundColor: dia.color,
                            color: "#111",
                            opacity: isDimmed ? 0.32 : 1,
                            filter: isDimmed ? "grayscale(80%)" : "none"
                          }}
                          title={
                            clima
                              ? `${dia.guardia} | ${clima.emoji} ${maxTemp ?? "-"}/${minTemp ?? "-"} C`
                              : dia.esFeriado
                                ? `${dia.guardia} | ${dia.nombreFeriado}`
                                : dia.guardia
                          }
                        >
                          <span className="text-[12px] font-semibold leading-none">{dia.diaSemana}</span>
                          {clima ? <span className="clima-emoji absolute right-0.5 top-0 text-[10px]">{clima.emoji}</span> : null}
                          {clima && (maxTemp !== null || minTemp !== null) ? (
                            <span className="clima-temp absolute inset-x-0 bottom-0.5 text-[7px] font-medium leading-none text-black/80">
                              {maxTemp ?? "-"}/{minTemp ?? "-"}
                            </span>
                          ) : null}
                          {dia.esFeriado ? (
                            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-800/55" />
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button asChild variant="outline" className="h-8">
              <Link href={`/guardias/?anio=${payload.anio - 1}`}>← {payload.anio - 1}</Link>
            </Button>

            <Badge variant="secondary" className="h-8 px-3 py-0 text-sm font-semibold leading-none">
              {payload.anio}
            </Badge>

            <Button asChild variant="outline" className="h-8">
              <Link href={`/guardias/?anio=${payload.anio + 1}`}>{payload.anio + 1} →</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
