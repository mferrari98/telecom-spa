import { removeDeudor } from "@/lib/deudores-db";

export const runtime = "nodejs";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function DELETE(_request: Request, context: RouteContext) {
  const deudorId = Number(context.params.id);
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
