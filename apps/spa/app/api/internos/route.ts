import { getInternalDirectoryCache } from "@/lib/internal-directory-cache";

export const runtime = "nodejs";

export async function GET() {
  try {
    const cache = await getInternalDirectoryCache();
    return Response.json({
      personnel: cache.entries,
      metadata: {
        loadedAt: cache.loadedAt,
        sourcePath: cache.sourcePath
      }
    });
  } catch {
    return Response.json(
      { error: "No se pudo cargar internos.xlsx" },
      { status: 500 }
    );
  }
}
