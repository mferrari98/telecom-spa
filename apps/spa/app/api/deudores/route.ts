import { insertDeudor, listDeudores } from "@/lib/deudores-db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const deudores = await listDeudores();
    return Response.json({ deudores });
  } catch {
    return Response.json({ error: "No se pudo cargar la lista de deudores" }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
