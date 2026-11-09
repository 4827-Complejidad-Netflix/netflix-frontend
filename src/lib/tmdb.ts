import { cacheLife } from "next/cache";

// Solo para el servidor: TMDB_API_KEY no lleva prefijo NEXT_PUBLIC_, así que no llega al navegador.

const API_BASE = "https://api.themoviedb.org/3";
/** w342 basta para las tarjetas del grid (≈ 200 px de ancho, 2x en pantallas retina). */
const IMAGE_BASE = "https://image.tmdb.org/t/p/w342";

/** Acepta tanto el "API Read Access Token" (v4, un JWT) como la "API Key" (v3) de TMDB. */
function authorize(url: URL, key: string): HeadersInit {
  if (key.startsWith("eyJ")) return { Authorization: `Bearer ${key}`, accept: "application/json" };
  url.searchParams.set("api_key", key);
  return { accept: "application/json" };
}

/**
 * Ruta del póster en TMDB, cacheada para no repetir la petición en cada visita.
 * Los errores transitorios (429, 5xx, red) se lanzan para que no queden cacheados.
 */
async function fetchPosterPath(tmdbId: number): Promise<string | null> {
  "use cache";
  cacheLife("weeks");

  const key = process.env.TMDB_API_KEY;
  if (!key) return null;

  const url = new URL(`${API_BASE}/movie/${tmdbId}`);
  const res = await fetch(url, { headers: authorize(url, key) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`TMDB respondió ${res.status} para la película ${tmdbId}`);

  const data: { poster_path?: string | null } = await res.json();
  return data.poster_path ?? null;
}

/** URL del póster o null si no hay clave, la película no está en TMDB o la petición falla. */
export async function posterUrl(tmdbId: number | null): Promise<string | null> {
  if (tmdbId === null || !process.env.TMDB_API_KEY) return null;
  try {
    const path = await fetchPosterPath(tmdbId);
    return path ? `${IMAGE_BASE}${path}` : null;
  } catch {
    return null;
  }
}
