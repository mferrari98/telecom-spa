import { insertDeudor, listDeudores } from "@/lib/deudores-db";

export const runtime = "nodejs";

function requireNotServicecoop(request: Request) {
  return request.headers.get("x-user-role") === "servicoop"
    ? Response.json({ error: "No autorizado" }, { status: 403 })
    : null;
}

export async function GET(request: Request) {
  const denied = requireNotServicecoop(request);
  if (denied) return denied;
  try {
    const deudores = await listDeudores();
    return Response.json({ deudores });
  } catch {
    return Response.json({ error: "No se pudo cargar la lista de deudores" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = requireNotServicecoop(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as { nombre?: string };
    const nombre = String(body?.nombre ?? "").trim();

    if (!nombre) {
      return Response.json({ error: "Nombre requerido" }, { status: 400 });
    }

    const id = await insertDeudor(nombre);
    return Response.json({ id }, { status: 201 });
  } catch {
    return Response.json({ error: "No se pudo guardar el deudor" }, { status: 500 });
  }
}
