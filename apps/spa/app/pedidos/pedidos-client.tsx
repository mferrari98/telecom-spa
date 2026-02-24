"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Copy, QrCode, Send, Trash2 } from "lucide-react";
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { Button, PortalHeader, toast } from "@telecom/ui";

type OrderQuantities = Record<string, Record<string, number>>;

type Provider = {
  name: string;
  phone: string;
};

const PEOPLE = ["Antonio", "Hugo", "Javier", "Martin", "Matias", "Pablo", "Redondeo"];
const FIXED_FLAVORS = ["Carne", "Carne Pic.", "Pollo", "Pollo Pic.", "JyQ", "Caprese", "Fugazetta"];
const PROVIDERS: Provider[] = [
  { name: "Sabor Tucumano", phone: "+5492804841540" },
  { name: "Los de 100pre", phone: "+5492804681142" },
  { name: "Lo de Jacinto", phone: "+5492804003172" },
  { name: "Halloween", phone: "+5492804450909" }
];
const DEFAULT_SELECTIONS: OrderQuantities = {
  Antonio: { Pollo: 2, Caprese: 1 },
  Hugo: { Carne: 2, Pollo: 1 },
  Martin: { Pollo: 3 },
  Pablo: { "Pollo Pic.": 3 },
  Javier: { Carne: 2, JyQ: 1 },
  Matias: { Pollo: 2, Carne: 1 },
  Redondeo: {}
};

const MAX_CUSTOM_COLUMNS = 4;
const MAX_QUANTITY = 100;
const HOUR_OPTIONS = Array.from({ length: 8 }, (_, i) => (i + 7).toString().padStart(2, "0"));
const MINUTE_OPTIONS = ["00", "15", "30", "45"];

function createEmptyOrderQuantities(): OrderQuantities {
  const initial: OrderQuantities = {};
  for (const person of PEOPLE) {
    initial[person] = {};
  }
  return initial;
}

function formatFlavorName(flavor: string): string {
  const normalized = flavor.toLowerCase().replace("pic.", "picante");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function currency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2
  }).format(value);
}

export function PedidosClient() {
  const [orderQuantities, setOrderQuantities] = useState<OrderQuantities>(() => createEmptyOrderQuantities());
  const [customColumns, setCustomColumns] = useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] = useState(PROVIDERS[0].name);
  const [selectedHour, setSelectedHour] = useState("");
  const [selectedMinute, setSelectedMinute] = useState("");

  const [orderSummary, setOrderSummary] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);

  const [showCostCalculator, setShowCostCalculator] = useState(false);
  const [totalCost, setTotalCost] = useState("");
  const [costPerPerson, setCostPerPerson] = useState<Record<string, number>>({});
  const [standardQuantity, setStandardQuantity] = useState(0);
  const selectSurfaceClass = "bg-background/90 border-border/70 shadow-sm";
  const selectContentClass = "border-border/70 bg-popover/95 backdrop-blur";

  const allFlavors = useMemo(() => [...FIXED_FLAVORS, ...customColumns], [customColumns]);
  const selectedTime = useMemo(() => {
    if (!selectedHour || !selectedMinute) {
      return "";
    }
    return `${selectedHour}:${selectedMinute}`;
  }, [selectedHour, selectedMinute]);

  const hasAnySelections = useMemo(
    () => PEOPLE.some((person) => Object.values(orderQuantities[person] || {}).some((quantity) => quantity > 0)),
    [orderQuantities]
  );

  const whatsappUrl = useMemo(() => {
    const trimmedSummary = orderSummary.trim();
    if (!trimmedSummary) {
      return "";
    }

    const provider = PROVIDERS.find((item) => item.name === selectedProvider);
    if (!provider) {
      return "";
    }

    const encodedMessage = encodeURIComponent(trimmedSummary);
    return `https://wa.me/${provider.phone.replace(/\D/g, "")}?text=${encodedMessage}`;
  }, [orderSummary, selectedProvider]);

  const qrImageUrl = useMemo(() => {
    if (!whatsappUrl) {
      return "";
    }
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(whatsappUrl)}`;
  }, [whatsappUrl]);

  const costSummary = useMemo(() => {
    if (Object.keys(costPerPerson).length === 0) {
      return { standard: null as null | { units: number; cost: number }, differences: [] as Array<{ person: string; units: number; cost: number }> };
    }

    let standard: { units: number; cost: number } | null = null;
    const differences: Array<{ person: string; units: number; cost: number }> = [];

    for (const [person, cost] of Object.entries(costPerPerson)) {
      const units = Object.values(orderQuantities[person] || {}).reduce((sum, qty) => sum + qty, 0);
      if (units === standardQuantity) {
        if (!standard) {
          standard = { units, cost };
        }
        continue;
      }
      differences.push({ person, units, cost });
    }

    return { standard, differences };
  }, [costPerPerson, orderQuantities, standardQuantity]);

  const resetDerivedState = () => {
    setShowSummary(false);
    setShowQr(false);
    setShowCostCalculator(false);
    setTotalCost("");
    setCostPerPerson({});
    setStandardQuantity(0);
  };

  const getFlavorTotals = () => {
    const totals: Record<string, number> = {};
    for (const flavor of allFlavors) {
      totals[flavor] = PEOPLE.reduce((sum, person) => sum + (orderQuantities[person][flavor] || 0), 0);
    }
    return totals;
  };

  const getPersonTotals = () => {
    const totals: Record<string, number> = {};
    for (const person of PEOPLE) {
      const total = allFlavors.reduce((sum, flavor) => sum + (orderQuantities[person][flavor] || 0), 0);
      if (total > 0) {
        totals[person] = total;
      }
    }
    return totals;
  };

  const buildOrderSummary = (time: string) => {
    const flavorTotals = getFlavorTotals();
    const orderItems: string[] = [];
    let totalEmpanadas = 0;

    for (const [flavor, count] of Object.entries(flavorTotals)) {
      if (count > 0) {
        totalEmpanadas += count;
        orderItems.push(`${count} ${formatFlavorName(flavor)}`);
      }
    }

    if (totalEmpanadas === 0) {
      return "";
    }

    const baseText = `Buenos dias, quiero hacer un pedido de ${totalEmpanadas} empanadas y serian: ${orderItems.join(", ")}`;
    return time ? `${baseText} para las ${time}hs` : baseText;
  };

  const syncSummaryIfNeeded = (nextHour: string, nextMinute: string) => {
    if (!showSummary || !orderSummary.trim() || !hasAnySelections) {
      return;
    }
    const time = nextHour && nextMinute ? `${nextHour}:${nextMinute}` : "";
    const nextSummary = buildOrderSummary(time);
    setOrderSummary(nextSummary);
  };

  const handleAddCustomColumn = () => {
    if (customColumns.length >= MAX_CUSTOM_COLUMNS) {
      toast.warning(`Maximo ${MAX_CUSTOM_COLUMNS} sabores personalizados`);
      return;
    }

    setCustomColumns((current) => [...current, `Sabor ${current.length + 1}`]);
    toast.success("Sabor agregado");
  };

  const updateCustomColumnName = (index: number, name: string) => {
    const oldName = customColumns[index];
    const nextName = name.trim() || `Sabor ${index + 1}`;

    setCustomColumns((current) => {
      const next = [...current];
      next[index] = nextName;
      return next;
    });

    if (!oldName || oldName === nextName) {
      return;
    }

    setOrderQuantities((current) => {
      const next: OrderQuantities = {};

      for (const person of PEOPLE) {
        const personOrders = { ...current[person] };
        if (Object.prototype.hasOwnProperty.call(personOrders, oldName)) {
          const oldValue = personOrders[oldName] || 0;
          const mergedValue = (personOrders[nextName] || 0) + oldValue;
          personOrders[nextName] = mergedValue;
          delete personOrders[oldName];
        }
        next[person] = personOrders;
      }

      return next;
    });

    resetDerivedState();
  };

  const handleQuantityChange = (person: string, flavor: string, rawValue: string) => {
    const quantity = Number.parseInt(rawValue, 10) || 0;
    if (quantity < 0 || quantity > MAX_QUANTITY) {
      return;
    }

    setOrderQuantities((current) => ({
      ...current,
      [person]: {
        ...current[person],
        [flavor]: quantity
      }
    }));
    resetDerivedState();
  };

  const handlePersonClick = (person: string) => {
    const defaults = DEFAULT_SELECTIONS[person];
    if (!defaults) {
      return;
    }

    setOrderQuantities((current) => ({
      ...current,
      [person]: {
        ...current[person],
        ...defaults
      }
    }));
    resetDerivedState();
  };

  const handleClearAll = () => {
    setOrderQuantities(createEmptyOrderQuantities());
    setCustomColumns([]);
    resetDerivedState();
  };

  const confirmClearAll = () => {
    handleClearAll();
    setShowClearDialog(false);
    toast.success("Pedido limpiado");
  };

  const generateOrder = () => {
    if (!hasAnySelections) {
      return;
    }

    const summary = buildOrderSummary(selectedTime);
    if (!summary) {
      setOrderSummary("");
      setShowSummary(false);
      return;
    }

    setOrderSummary(summary);
    setShowSummary(true);
    toast.success("Resumen generado");
  };

  const calculateCostPerPerson = () => {
    const cost = Number.parseFloat(totalCost);
    if (!Number.isFinite(cost) || cost <= 0) {
      setCostPerPerson({});
      setStandardQuantity(0);
      return;
    }

    const personTotals = getPersonTotals();
    const quantities = Object.values(personTotals);
    if (quantities.length === 0) {
      setCostPerPerson({});
      setStandardQuantity(0);
      return;
    }

    const quantityCount: Record<number, number> = {};
    let mostCommonQuantity = 0;
    let mostCommonCount = 0;

    for (const quantity of quantities) {
      const nextCount = (quantityCount[quantity] || 0) + 1;
      quantityCount[quantity] = nextCount;
      if (nextCount > mostCommonCount) {
        mostCommonCount = nextCount;
        mostCommonQuantity = quantity;
      }
    }

    const totalEmpanadas = quantities.reduce((sum, qty) => sum + qty, 0);
    if (totalEmpanadas === 0) {
      setCostPerPerson({});
      setStandardQuantity(0);
      return;
    }

    const costCents = Math.round(cost * 100);
    const perPerson = Object.entries(personTotals).map(([person, qty]) => {
      const exact = (costCents * qty) / totalEmpanadas;
      return {
        person,
        cents: Math.floor(exact),
        remainder: exact - Math.floor(exact)
      };
    });

    let remainingCents = costCents - perPerson.reduce((sum, item) => sum + item.cents, 0);
    remainingCents = Math.max(0, Math.round(remainingCents));

    if (remainingCents > 0 && perPerson.length > 0) {
      const sorted = [...perPerson].sort((a, b) => b.remainder - a.remainder);
      for (let i = 0; i < remainingCents; i += 1) {
        sorted[i % sorted.length].cents += 1;
      }
    }

    const nextCosts: Record<string, number> = {};
    for (const item of perPerson) {
      nextCosts[item.person] = Number((item.cents / 100).toFixed(2));
    }

    setStandardQuantity(mostCommonQuantity);
    setCostPerPerson(nextCosts);
    toast.success("Costos calculados");
  };

  const copyToClipboard = async () => {
    const value = orderSummary.trim();
    if (!value) {
      return;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = value;
        textArea.style.position = "fixed";
        textArea.style.left = "-99999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      setShowCostCalculator(true);
      toast.success("Resumen copiado al portapapeles");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const sendWhatsAppMessage = () => {
    if (!whatsappUrl) {
      return;
    }

    const popup = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    if (popup) {
      popup.opener = null;
      setShowCostCalculator(true);
      toast.success("Abriendo WhatsApp");
      return;
    }

    toast.error("No se pudo abrir WhatsApp");
  };

  return (
    <TooltipProvider delayDuration={180}>
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
                <BreadcrumbPage>Pedidos</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
        title="Pedidos"
        subtitle="Sistema de gestion"
      />

      <Card className="mx-auto max-w-5xl overflow-hidden rounded-lg bg-[#E8E8E8] shadow-lg dark:bg-[#1F1E1D]">
        <CardContent className="px-4 py-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="bg-[#E8E8E8] dark:bg-[#1F1E1D]">
                  <th className="w-24 border-b border-black/[0.28] px-3 py-3 text-left text-sm font-bold text-[#141413] dark:border-white/30 dark:text-[#E5E4E0]" />
                  {allFlavors.map((flavor, index) => {
                    const customIndex = index - FIXED_FLAVORS.length;
                    const isCustom = customIndex >= 0;

                    return (
                      <th
                        key={`${flavor}-${index}`}
                        className="min-w-[80px] border-b border-l border-black/[0.28] px-2 py-3 text-center text-sm font-bold leading-tight text-[#141413] dark:border-white/30 dark:text-[#E5E4E0]"
                      >
                        {isCustom ? (
                          <Input
                            defaultValue={flavor}
                            onBlur={(event) => updateCustomColumnName(customIndex, event.target.value)}
                            className="h-7 w-full rounded border-none bg-transparent px-1 text-center text-sm font-bold text-[#141413] shadow-none outline-none focus-visible:ring-1 dark:text-[#E5E4E0]"
                            aria-label={`Nombre del sabor ${customIndex + 1}`}
                          />
                        ) : (
                          <span className="block break-words">{flavor}</span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {PEOPLE.map((person, rowIndex) => {
                  const rowBg = rowIndex % 2 === 0 ? "bg-[#E8E8E8] dark:bg-[#1F1E1D]" : "bg-[#D6D6D6] dark:bg-[#1A1A19]";
                  const inputBg = rowIndex % 2 === 0 ? "bg-[#E8E8E8] dark:bg-[#1F1E1D]" : "bg-[#D6D6D6] dark:bg-[#1A1A19]";
                  const rowBottomBorder = rowIndex === PEOPLE.length - 1 ? "" : "border-b border-black/[0.28] dark:border-white/30";

                  return (
                    <tr key={person} className={rowBg}>
                      <td
                        className={`sticky left-0 z-10 w-24 cursor-pointer bg-inherit px-3 py-2 text-left text-sm font-medium text-[#141413] transition-opacity hover:opacity-80 dark:text-[#E5E4E0] ${rowBottomBorder}`}
                        onClick={() => handlePersonClick(person)}
                        title="Aplicar seleccion sugerida"
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block">{person}</span>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>Click para aplicar su seleccion sugerida</p>
                          </TooltipContent>
                        </Tooltip>
                      </td>

                      {allFlavors.map((flavor) => (
                        <td
                          key={`${person}-${flavor}`}
                          className={`min-w-[80px] ${rowBottomBorder} border-l border-black/[0.28] p-2 text-center align-middle dark:border-white/30`}
                        >
                          <Input
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={orderQuantities[person][flavor] || ""}
                            onChange={(event) => {
                              const nextRaw = event.target.value;
                              if (nextRaw === "" || /^[0-9]*$/.test(nextRaw)) {
                                handleQuantityChange(person, flavor, nextRaw);
                              }
                            }}
                            className={`h-8 w-full border-0 px-1 text-center font-mono text-[1.3rem] text-[#141413] shadow-none focus-visible:ring-1 dark:text-[#E5E4E0] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none ${inputBg}`}
                            aria-label={`Cantidad de ${flavor} para ${person}`}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </CardContent>
      </Card>

      <div className="mx-auto mt-3 flex max-w-5xl flex-wrap items-center justify-end gap-3">
        {hasAnySelections || customColumns.length > 0 ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowClearDialog(true)}
                    title="Limpiar"
                    aria-label="Limpiar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Vaciar tabla completa</p>
              </TooltipContent>
            </Tooltip>

            <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Limpiar pedido</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se van a borrar cantidades y sabores personalizados. Esta accion no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmClearAll}>Limpiar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : null}
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                type="button"
                variant="outline"
                className="h-8"
                onClick={handleAddCustomColumn}
                disabled={customColumns.length >= MAX_CUSTOM_COLUMNS}
              >
                Agregar sabores
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Maximo {MAX_CUSTOM_COLUMNS} sabores personalizados</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button type="button" className="h-8" onClick={generateOrder} disabled={!hasAnySelections}>
                Generar pedido
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Genera el mensaje para compartir</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {showSummary ? (
        <Card className="border-border/80 bg-card/95 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Resumen del pedido</CardTitle>
                <CardDescription>Selecciona proveedor, horario y envia por WhatsApp.</CardDescription>
              </div>
              <Button type="button" variant="outline" className="h-8" onClick={() => setShowSummary(false)}>
                Cerrar
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Proveedor</p>
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger className={selectSurfaceClass}>
                    <SelectValue placeholder="Seleccionar proveedor" />
                  </SelectTrigger>
                  <SelectContent className={selectContentClass}>
                    {PROVIDERS.map((provider) => (
                      <SelectItem key={provider.name} value={provider.name}>
                        {provider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Horario</p>
                <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                  <Select
                    value={selectedHour}
                    onValueChange={(hour) => {
                      setSelectedHour(hour);
                      syncSummaryIfNeeded(hour, selectedMinute);
                    }}
                  >
                    <SelectTrigger className={selectSurfaceClass}>
                      <SelectValue placeholder="hh" />
                    </SelectTrigger>
                    <SelectContent className={selectContentClass}>
                      {HOUR_OPTIONS.map((hour) => (
                        <SelectItem key={hour} value={hour}>
                          {hour}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <span className="text-center text-muted-foreground">:</span>

                  <Select
                    value={selectedMinute}
                    onValueChange={(minute) => {
                      setSelectedMinute(minute);
                      syncSummaryIfNeeded(selectedHour, minute);
                    }}
                  >
                    <SelectTrigger className={selectSurfaceClass}>
                      <SelectValue placeholder="mm" />
                    </SelectTrigger>
                    <SelectContent className={selectContentClass}>
                      {MINUTE_OPTIONS.map((minute) => (
                        <SelectItem key={minute} value={minute}>
                          {minute}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedHour("");
                      setSelectedMinute("");
                      syncSummaryIfNeeded("", "");
                    }}
                    className="h-9 px-3"
                  >
                    Limpiar
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-md border bg-muted/25 p-3">
              <p className="text-sm leading-relaxed">{orderSummary}</p>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" className="h-8" onClick={copyToClipboard}>
                <Copy className="mr-1.5 h-4 w-4" />
                Copiar
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-8"
                onClick={() => {
                  setShowQr((current) => !current);
                  setShowCostCalculator(true);
                }}
                disabled={!whatsappUrl}
              >
                <QrCode className="mr-1.5 h-4 w-4" />
                QR
              </Button>
              <Button type="button" className="h-8" onClick={sendWhatsAppMessage} disabled={!whatsappUrl}>
                <Send className="mr-1.5 h-4 w-4" />
                WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {showQr && qrImageUrl ? (
        <Card className="border-border/80 bg-card/95 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle>QR de WhatsApp</CardTitle>
            <CardDescription>Escanea para abrir el chat con el pedido listo.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center rounded-md border bg-muted/25 p-4">
              <img
                src={qrImageUrl}
                alt="QR para enviar pedido por WhatsApp"
                className="h-56 w-56"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {showCostCalculator ? (
        <Card className="border-border/80 bg-card/95 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Calcular costos</CardTitle>
                <CardDescription>Reparte el total de forma proporcional por cantidad.</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-8"
                onClick={() => {
                  setShowCostCalculator(false);
                  setTotalCost("");
                  setCostPerPerson({});
                  setStandardQuantity(0);
                }}
              >
                Cerrar
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[260px_1fr]">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total pedido</p>
                <Input
                  value={totalCost}
                  onChange={(event) => {
                    const value = event.target.value;
                    const parsed = Number.parseFloat(value);
                    if (value === "" || (Number.isFinite(parsed) && parsed <= 1_000_000)) {
                      setTotalCost(value);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      calculateCostPerPerson();
                    }
                  }}
                  placeholder="Ej: 38500"
                  type="number"
                  min="0"
                  max="1000000"
                  step="0.01"
                  className="bg-background/90 border-border/70 shadow-sm"
                />
                <Button
                  type="button"
                  className="h-8 w-full"
                  onClick={calculateCostPerPerson}
                  disabled={!totalCost || Number.parseFloat(totalCost) <= 0}
                >
                  Calcular
                </Button>
              </div>

              <div className="rounded-md border bg-muted/25 p-3">
                {Object.keys(costPerPerson).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Ingresa el total para ver la distribucion por persona.</p>
                ) : (
                  <div className="space-y-1 text-sm">
                    {costSummary.standard ? (
                      <p className="font-semibold">
                        Costo base ({costSummary.standard.units} unidades): {currency(costSummary.standard.cost)}
                      </p>
                    ) : null}

                    {costSummary.differences.map((row) => (
                      <p key={row.person}>
                        {row.person} ({row.units}): {currency(row.cost)}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
      </div>
    </TooltipProvider>
  );
}
