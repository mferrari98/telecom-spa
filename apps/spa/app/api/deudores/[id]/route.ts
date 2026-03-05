import { removeDeudor } from "@/lib/deudores-db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  if (request.headers.get("x-user-role") === "servicoop") {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await context.params;
  const deudorId = Number(id);
  if (!Number.isInteger(deudorId)) {
    return Response.json({ error: "Deudor invalido" }, { status: 400 });
  }

  try {
    const removed = await removeDeudor(deudorId);
    if (!removed) {
      return Response.json({ error: "Deudor no encontrado" }, { status: 404 });
    }

    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "No se pudo eliminar el deudor" }, { status: 500 });
  }
}
