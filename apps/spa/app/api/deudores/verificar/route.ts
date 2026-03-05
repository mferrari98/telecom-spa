export const runtime = "nodejs";

export async function POST(request: Request) {
  if (request.headers.get("x-user-role") === "servicoop") {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  return new Response(null, { status: 204 });
}
