import os from "node:os";
import { readFile, statfs } from "node:fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MonitorStatsPayload = {
  timestamp: string;
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

type CpuSample = {
  idle: number;
  total: number;
};

function cpuSnapshot(): CpuSample {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;

  for (const cpu of cpus) {
    const times = cpu.times;
    idle += times.idle;
    total += times.user + times.nice + times.sys + times.idle + times.irq;
  }

  return { idle, total };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getCpuUsagePct() {
  const before = cpuSnapshot();
  await sleep(120);
  const after = cpuSnapshot();

  const totalDiff = after.total - before.total;
  const idleDiff = after.idle - before.idle;
  if (totalDiff <= 0) {
    return 0;
  }

  const usage = (1 - idleDiff / totalDiff) * 100;
  return Number.isFinite(usage) ? Math.max(0, Math.min(100, usage)) : 0;
}

async function readText(path: string) {
  try {
    return (await readFile(path, "utf8")).trim();
  } catch {
    return null;
  }
}

async function getMemoryInfo() {
  const maxV2 = await readText("/sys/fs/cgroup/memory.max");
  const currentV2 = await readText("/sys/fs/cgroup/memory.current");

  if (maxV2 && currentV2 && maxV2 !== "max") {
    const total = Number(maxV2);
    const used = Number(currentV2);
    if (Number.isFinite(total) && Number.isFinite(used) && total > 0) {
      return {
        total,
        used
      };
    }
  }

  const maxV1 = await readText("/sys/fs/cgroup/memory/memory.limit_in_bytes");
  const currentV1 = await readText("/sys/fs/cgroup/memory/memory.usage_in_bytes");
  if (maxV1 && currentV1) {
    const total = Number(maxV1);
    const used = Number(currentV1);
    if (Number.isFinite(total) && Number.isFinite(used) && total > 0 && total < 1e16) {
      return {
        total,
        used
      };
    }
  }

  const total = os.totalmem();
  const used = total - os.freemem();
  return { total, used };
}

async function getDiskInfo() {
  const data = await statfs("/");
  const blockSize = Number(data.bsize);
  const total = Number(data.blocks) * blockSize;
  const free = Number(data.bavail) * blockSize;
  const used = Math.max(0, total - free);

  return { total, used };
}

async function getNetworkTotals() {
  const raw = await readFile("/proc/net/dev", "utf8");
  const lines = raw.split("\n");

  let rxTotal = 0;
  let txTotal = 0;

  for (const line of lines) {
    if (!line.includes(":")) {
      continue;
    }

    const [ifaceRaw, valuesRaw] = line.split(":");
    const iface = ifaceRaw.trim();
    if (!iface || iface === "lo") {
      continue;
    }

    const values = valuesRaw.trim().split(/\s+/);
    const rx = Number(values[0] ?? "0");
    const tx = Number(values[8] ?? "0");

    if (Number.isFinite(rx)) {
      rxTotal += rx;
    }

    if (Number.isFinite(tx)) {
      txTotal += tx;
    }
  }

  return {
    rxTotal,
    txTotal
  };
}

export async function GET(request: Request) {
  if (request.headers.get("x-user-role") === "servicoop") {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const [cpuUsagePct, memory, disk, network] = await Promise.all([
      getCpuUsagePct(),
      getMemoryInfo(),
      getDiskInfo(),
      getNetworkTotals()
    ]);

    const memoryUsagePct = memory.total > 0 ? (memory.used / memory.total) * 100 : 0;
    const diskUsagePct = disk.total > 0 ? (disk.used / disk.total) * 100 : 0;
    const [loadAvg1, loadAvg5, loadAvg15] = os.loadavg();

    const payload: MonitorStatsPayload = {
      timestamp: new Date().toISOString(),
      cpuUsagePct,
      cpuCores: os.cpus().length,
      loadAvg1,
      loadAvg5,
      loadAvg15,
      memoryTotalBytes: memory.total,
      memoryUsedBytes: memory.used,
      memoryUsagePct,
      diskTotalBytes: disk.total,
      diskUsedBytes: disk.used,
      diskUsagePct,
      networkRxBytes: network.rxTotal,
      networkTxBytes: network.txTotal,
      uptimeSeconds: os.uptime(),
      processUptimeSeconds: process.uptime()
    };

    return Response.json(payload, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch {
    return Response.json({ error: "No se pudo obtener el estado del servidor" }, { status: 500 });
  }
}
