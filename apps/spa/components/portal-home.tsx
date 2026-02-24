"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  ConciergeBell,
  HandCoins,
  LayoutDashboard,
  Loader2,
  Map,
  Shield
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { PortalGrid, PortalHeader, PortalSection } from "@telecom/ui";
import { PortalLayout } from "./portal-layout";

type Service = {
  id: string;
  name: string;
  desc: string;
  url: string;
  icon: ReactNode;
  navigation: "spa" | "document";
};

const localServices: Service[] = [
  {
    id: "guardias",
    name: "Guardias",
    icon: <Shield className="t-service-card-icon" />,
    desc: "Cronograma de guardias rotativas",
    url: "/guardias/",
    navigation: "spa"
  },
  {
    id: "reportes",
    name: "Reportes de Agua",
    icon: <BarChart3 className="t-service-card-icon" />,
    desc: "Sistema de reporteria y analisis",
    url: "/reporte/",
    navigation: "document"
  },
  {
    id: "monitor",
    name: "Monitor",
    icon: <Activity className="t-service-card-icon" />,
    desc: "Monitoreo en tiempo real del servidor",
    url: "/monitor/",
    navigation: "spa"
  },
  {
    id: "empa",
    name: "Pedidos",
    icon: <ConciergeBell className="t-service-card-icon" />,
    desc: "Sistema de gestion",
    url: "/pedidos/",
    navigation: "spa"
  },
  {
    id: "deudores",
    name: "Deudores",
    icon: <HandCoins className="t-service-card-icon" />,
    desc: "Registro de deudas internas",
    url: "/deudores/",
    navigation: "spa"
  }
];

const externalServices: Service[] = [
  {
    id: "gis",
    name: "GIS",
    icon: <Map className="t-service-card-icon" />,
    desc: "Informacion geoespacial de socios",
    url: "http://gis.servicoop.com/",
    navigation: "document"
  },
  {
    id: "dash",
    name: "Dashboard Exemys",
    icon: <LayoutDashboard className="t-service-card-icon" />,
    desc: "Panel de control y monitoreo",
    url: "https://10.10.4.125/",
    navigation: "document"
  }
];

type ServiceTileProps = {
  service: Service;
  loading: boolean;
  onNavigate: () => void;
};

function ServiceTile({ service, loading, onNavigate }: ServiceTileProps) {
  const card = (
    <Card className="h-[72px] max-h-[72px] overflow-hidden border-border/80 bg-card/95 transition-all hover:border-primary/45 hover:shadow-md">
      <CardContent className="h-full p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span className="text-foreground">{service.icon}</span>
            )}
          </div>

          <div className="min-w-0 space-y-0.5">
            <CardTitle className="truncate text-base leading-tight">{service.name}</CardTitle>
            <CardDescription className="truncate text-sm leading-4">
              {loading ? "Cargando..." : service.desc}
            </CardDescription>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const className = "block h-full t-animate-fade-in-up";

  if (service.navigation === "spa") {
    return (
      <Link
        href={service.url}
        className={className}
        onClick={onNavigate}
        aria-label={`Abrir ${service.name}`}
        aria-busy={loading}
      >
        {card}
      </Link>
    );
  }

  return (
    <a
      href={service.url}
      className={className}
      onClick={onNavigate}
      aria-label={`Abrir ${service.name}`}
      aria-busy={loading}
    >
      {card}
    </a>
  );
}

export function PortalHome() {
  const [loadingService, setLoadingService] = useState<string | null>(null);

  return (
    <PortalLayout>
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
                <BreadcrumbPage>Inicio</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
        title="Portal de Servicios"
        subtitle="Centro de Control"
      />

      <PortalGrid>
        <PortalSection title="Apps locales" variant="wide">
          {localServices.map((service) => (
            <ServiceTile
              key={service.id}
              service={service}
              loading={loadingService === service.id}
              onNavigate={() => setLoadingService(service.id)}
            />
          ))}
        </PortalSection>

        <PortalSection title="Apps externas">
          {externalServices.map((service) => (
            <ServiceTile
              key={service.id}
              service={service}
              loading={loadingService === service.id}
              onNavigate={() => setLoadingService(service.id)}
            />
          ))}
        </PortalSection>
      </PortalGrid>
    </PortalLayout>
  );
}
