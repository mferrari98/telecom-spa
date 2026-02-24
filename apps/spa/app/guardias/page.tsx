import { PortalLayout } from "@/components/portal-layout";
import { getGuardiasCalendar } from "@/lib/guardias-data";
import { GuardiasClient } from "./guardias-client";

type GuardiasPageProps = {
  searchParams?: {
    anio?: string | string[];
  };
};

function resolveAnio(rawAnio: string | string[] | undefined): number {
  const currentYear = new Date().getFullYear();
  const parsedValue = Array.isArray(rawAnio) ? rawAnio[0] : rawAnio;
  const parsedYear = Number.parseInt(parsedValue ?? "", 10);

  if (!Number.isFinite(parsedYear)) {
    return currentYear;
  }

  return Math.min(2100, Math.max(2000, parsedYear));
}

export default function GuardiasPage({ searchParams }: GuardiasPageProps) {
  const anio = resolveAnio(searchParams?.anio);
  const payload = getGuardiasCalendar(anio);

  return (
    <PortalLayout contentClassName="t-portal-container-wide t-portal-container-tight">
      <GuardiasClient payload={payload} />
    </PortalLayout>
  );
}
