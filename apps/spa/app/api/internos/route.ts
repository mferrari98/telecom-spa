import { writeFile } from "node:fs/promises";
import {
  getInternalDirectoryCache,
  reloadInternalDirectoryCache,
  resolveTargetInternalsXlsxPath
} from "@/lib/internal-directory-cache";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function GET() {
  try {
    const cache = await getInternalDirectoryCache();
    return Response.json({
      personnel: cache.entries,
      metadata: {
        loadedAt: cache.loadedAt,
        hasDocument: cache.hasDocument
      }
    });
  } catch {
    return Response.json(
      { error: "No se pudo cargar internos.xlsx" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (request.headers.get("x-user-role") !== "admin") {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "Debe seleccionar un archivo .xlsx" }, { status: 400 });
    }

    if (file.size === 0) {
      return Response.json({ error: "El archivo esta vacio" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return Response.json({ error: "Solo se permiten archivos .xlsx" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return Response.json({ error: "El archivo supera el limite de 10 MB" }, { status: 413 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Validate ZIP magic bytes (xlsx is a ZIP archive)
    if (fileBuffer.length < 4 || fileBuffer[0] !== 0x50 || fileBuffer[1] !== 0x4b) {
      return Response.json({ error: "El archivo no es un xlsx valido" }, { status: 400 });
    }

    const targetPath = await resolveTargetInternalsXlsxPath();
    await writeFile(targetPath, fileBuffer);

    const cache = await reloadInternalDirectoryCache();

    return Response.json({
      ok: true,
      metadata: {
        loadedAt: cache.loadedAt,
        hasDocument: cache.hasDocument,
        filename: file.name
      }
    });
  } catch {
    return Response.json(
      { error: "No se pudo cargar internos.xlsx" },
      { status: 500 }
    );
  }
}
