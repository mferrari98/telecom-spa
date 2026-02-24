"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Activity, ArrowDown, ArrowUp, Clock3, Cpu, HardDrive, MemoryStick, RefreshCw, Server } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { PortalHeader, Button, toast } from "@telecom/ui";

type MonitorStats = {
  timestamp: string;
  hostname: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  cpuUsagePct: number;
  cpuCores: number;
  loadAvg1: number;
  loadAvg5: number;
  loadAvg15: number;
  memoryTotalBytes: number;
  memoryUsedBytes: number;
  memoryUsagePct: number;
  diskTotalBytes: number;
  diskUsedBytes: number;
  diskUsagePct: number;
  networkRxBytes: number;
  networkTxBytes: number;
  uptimeSeconds: number;
  processUptimeSeconds: number;
};

type NetSnapshot = {
  at: number;
  rx: number;
  tx: number;
};

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }

  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatUptime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "-";
  }

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const chunks = [];
  if (days > 0) {
    chunks.push(`${days}d`);
  }
  if (hours > 0 || days > 0) {
    chunks.push(`${hours}h`);
  }
  chunks.push(`${minutes}m`);

  return chunks.join(" ");
}

function Meter({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const tone = clamped >= 90 ? "bg-red-500" : clamped >= 75 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="h-2 w-full rounded-full bg-muted">
      <div className={`h-2 rounded-full transition-all ${tone}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function MonitorClient() {
  const [stats, setStats] = useState<MonitorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rxRate, setRxRate] = useState(0);
  const [txRate, setTxRate] = useState(0);
  const lastNetwork = useRef<NetSnapshot | null>(null);

  const fetchStats = async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch("/api/monitor/stats/", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Error de estado");
      }

      const data = (await response.json()) as MonitorStats;
      const now = Date.now();

      if (lastNetwork.current) {
        const seconds = Math.max((now - lastNetwork.current.at) / 1000, 1);
        setRxRate(Math.max(0, (data.networkRxBytes - lastNetwork.current.rx) / seconds));
        setTxRate(Math.max(0, (data.networkTxBytes - lastNetwork.current.tx) / seconds));
      }

      lastNetwork.current = {
        at: now,
        rx: data.networkRxBytes,
        tx: data.networkTxBytes
      };

      setStats(data);
      setError(null);
    } catch {
      const message = "No se pudo actualizar el monitor";
      setError(message);
      if (silent) {
        toast.error(message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchStats();
    const timer = window.setInterval(() => {
      void fetchStats(true);
    }, 15000);

    return () => window.clearInterval(timer);
  }, []);

  const lastUpdateText = useMemo(() => {
    if (!stats) {
      return "-";
    }

    return new Date(stats.timestamp).toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }, [stats]);

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
                <BreadcrumbPage>Monitor</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
        title="Monitor"
        subtitle="Estado operativo del servidor de la aplicacion"
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock3 className="h-4 w-4" />
          <span>Actualizado: {lastUpdateText}</span>
          {refreshing ? <Badge variant="outline">Actualizando...</Badge> : null}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void fetchStats(true);
          }}
          disabled={refreshing}
        >
          <RefreshCw className={`mr-1.5 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refrescar
        </Button>
      </div>

      {error ? (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><Cpu className="h-4 w-4" />CPU</CardDescription>
            <CardTitle>{stats ? `${stats.cpuUsagePct.toFixed(1)}%` : "-"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Meter value={stats?.cpuUsagePct ?? 0} />
            <p className="text-xs text-muted-foreground">Cores: {stats?.cpuCores ?? "-"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><MemoryStick className="h-4 w-4" />RAM</CardDescription>
            <CardTitle>{stats ? `${stats.memoryUsagePct.toFixed(1)}%` : "-"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Meter value={stats?.memoryUsagePct ?? 0} />
            <p className="text-xs text-muted-foreground">
              {stats ? `${formatBytes(stats.memoryUsedBytes)} / ${formatBytes(stats.memoryTotalBytes)}` : "-"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><HardDrive className="h-4 w-4" />Disco</CardDescription>
            <CardTitle>{stats ? `${stats.diskUsagePct.toFixed(1)}%` : "-"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Meter value={stats?.diskUsagePct ?? 0} />
            <p className="text-xs text-muted-foreground">
              {stats ? `${formatBytes(stats.diskUsedBytes)} / ${formatBytes(stats.diskTotalBytes)}` : "-"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><Activity className="h-4 w-4" />Uptime</CardDescription>
            <CardTitle>{stats ? formatUptime(stats.uptimeSeconds) : "-"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-muted-foreground">
            <p>Proceso: {stats ? formatUptime(stats.processUptimeSeconds) : "-"}</p>
            <p>
              Load: {stats ? `${stats.loadAvg1.toFixed(2)} / ${stats.loadAvg5.toFixed(2)} / ${stats.loadAvg15.toFixed(2)}` : "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Red (trafico)</CardTitle>
            <CardDescription>Velocidad estimada entre muestreos de 15s.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2"><ArrowDown className="h-4 w-4 text-emerald-600" />RX: {formatBytes(rxRate)}/s</div>
            <div className="flex items-center gap-2"><ArrowUp className="h-4 w-4 text-sky-600" />TX: {formatBytes(txRate)}/s</div>
            <p className="text-xs text-muted-foreground">
              Total RX/TX: {stats ? `${formatBytes(stats.networkRxBytes)} / ${formatBytes(stats.networkTxBytes)}` : "-"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Servidor</CardTitle>
            <CardDescription>Informacion base del runtime.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="flex items-center gap-2"><Server className="h-4 w-4" />Host: {stats?.hostname ?? "-"}</p>
            <p>Plataforma: {stats ? `${stats.platform}/${stats.arch}` : "-"}</p>
            <p>Node: {stats?.nodeVersion ?? "-"}</p>
            {loading ? <p className="text-xs text-muted-foreground">Cargando datos...</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
