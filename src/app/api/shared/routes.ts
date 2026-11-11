import { api, ApiError } from "@/lib/api";

// Puente para el navegador: `API_URL` solo existe en el servidor, así que el grafo de comunidades
// (componente cliente) pide aquí las películas en común de una arista seleccionada.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const u = Number(params.get("u"));
  const v = Number(params.get("v"));
  if (!Number.isInteger(u) || !Number.isInteger(v) || u <= 0 || v <= 0) {
    return Response.json({ detail: "Parámetros u y v inválidos" }, { status: 400 });
  }

  try {
    return Response.json(await api.graph.shared(u, v, { limit: 10 }));
  } catch (error) {
    // Si el backend ni siquiera responde, fetch lanza un TypeError (no un ApiError): se devuelve 502.
    const status = error instanceof ApiError ? error.status : 502;
    return Response.json({ detail: "No se pudieron cargar las películas en común" }, { status });
  }
}