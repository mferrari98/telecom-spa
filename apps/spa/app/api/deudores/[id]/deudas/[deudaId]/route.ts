import { removeDeuda, updateDeuda } from "@/lib/deudores-db";

export const runtime = "nodejs";

type RouteContext = {
  params: {
    id: string;
    deudaId: string;
  };
};

type DebtRequestPayload = {
  fecha?: string;
  descripcion?: string;
  comentario?: string;
  debe?: string;
  monto?: string;
};

export async function PUT(request: Request, context: RouteContext) {
  const deudorId = Number(context.params.id);
  const deudaId = Number(context.params.deudaId);
  if (!Number.isInteger(deudorId) || !Number.isInteger(deudaId)) {
    return Response.json({ error: "Parametros invalidos" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as DebtRequestPayload;
    const fecha = String(body?.fecha ?? "").trim();
    const descripcion = String(body?.descripcion ?? body?.comentario ?? "").trim();
    const debe = String(body?.debe ?? body?.monto ?? "").trim();

    if (!fecha || !descripcion || !debe) {
      return Response.json({ error: "Datos de deuda incompletos" }, { status: 400 });
    }

    const updated = await updateDeuda(deudorId, deudaId, { fecha, descripcion, debe });
    if (!updated) {
      return Response.json({ error: "Deuda no encontrada" }, { status: 404 });
    }

    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "No se pudo actualizar la deuda" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const deudorId = Number(context.params.id);
  const deudaId = Number(context.params.deudaId);
  if (!Number.isInteger(deudorId) || !Number.isInteger(deudaId)) {
    return Response.json({ error: "Parametros invalidos" }, { status: 400 });
  }

  try {
    const removed = await removeDeuda(deudorId, deudaId);
    if (!removed) {
      return Response.json({ error: "Deuda no encontrada" }, { status: 404 });
    }

    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "No se pudo eliminar la deuda" }, { status: 500 });
  }
}
