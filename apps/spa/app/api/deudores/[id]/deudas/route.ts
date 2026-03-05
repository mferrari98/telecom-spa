import { insertDeuda } from "@/lib/deudores-db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type DebtRequestPayload = {
  fecha?: string;
  descripcion?: string;
  comentario?: string;
  debe?: string;
  monto?: string;
};

export async function POST(request: Request, context: RouteContext) {
  if (request.headers.get("x-user-role") === "servicoop") {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await context.params;
  const deudorId = Number(id);
  if (!Number.isInteger(deudorId)) {
    return Response.json({ error: "Deudor invalido" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as DebtRequestPayload;
    const fecha = String(body?.fecha ?? "").trim();
    const descripcion = String(body?.descripcion ?? body?.comentario ?? "").trim();
    const debe = String(body?.debe ?? body?.monto ?? "").trim();

    if (!fecha || !descripcion || !debe) {
      return Response.json({ error: "Datos de deuda incompletos" }, { status: 400 });
    }

    const id = await insertDeuda(deudorId, { fecha, descripcion, debe });
    if (id === null) {
      return Response.json({ error: "Deudor no encontrado" }, { status: 404 });
    }

    return Response.json({ id }, { status: 201 });
  } catch {
    return Response.json({ error: "No se pudo guardar la deuda" }, { status: 500 });
  }
}
