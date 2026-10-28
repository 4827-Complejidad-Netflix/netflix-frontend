import type {
  Communities,
  CommunitiesParams,
  Graph,
  GraphStats,
  KruskalCommunities,
  KruskalParams,
  Movie,
  MovieListParams,
  PaginatedMovies,
  Recommendation,
  User,
} from "./types";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api").replace(/\/+$/, "");

type QueryParams = Record<string, string | number | undefined | null>;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function buildUrl(path: string, params?: QueryParams): string {
  const url = new URL(`${API_URL}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

// FastAPI devuelve { detail: string } o, en errores de validación (422), { detail: [{ msg, ... }] }.
async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) return body.detail.map((d: { msg: string }) => d.msg).join("; ");
  } catch {
    // cuerpo vacío o no JSON
  }
  return `Error ${res.status} (${res.statusText})`;
}

async function request<T>(path: string, params?: QueryParams, init?: RequestInit): Promise<T> {
  const res = await fetch(buildUrl(path, params), {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
  });
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res));
  return res.json() as Promise<T>;
}

/** Cliente de netflix-backend. Funciona en Server y Client Components; `init` se pasa a `fetch` (p. ej. `signal`). */
export const api = {
  movies: {
    list: (params?: MovieListParams, init?: RequestInit) =>
      request<PaginatedMovies>("/movies", { ...params }, init),
    genres: (init?: RequestInit) => request<string[]>("/movies/genres", undefined, init),
    get: (id: number, init?: RequestInit) => request<Movie>(`/movies/${id}`, undefined, init),
  },

  users: {
    list: (init?: RequestInit) => request<number[]>("/users", undefined, init),
    get: (id: number, params?: { limit?: number }, init?: RequestInit) =>
      request<User>(`/users/${id}`, params, init),
    recommendations: (id: number, params?: { limit?: number }, init?: RequestInit) =>
      request<Recommendation[]>(`/users/${id}/recommendations`, params, init),
    bfs: (id: number, params?: { depth?: number; branching?: number }, init?: RequestInit) =>
      request<Graph>(`/users/${id}/bfs`, params, init),
  },

  graph: {
    stats: (init?: RequestInit) => request<GraphStats>("/graph/stats", undefined, init),
    communities: (params?: CommunitiesParams, init?: RequestInit) =>
      request<Communities>("/graph/communities", { ...params }, init),
    kruskal: (params?: KruskalParams, init?: RequestInit) =>
      request<KruskalCommunities>("/graph/communities/kruskal", { ...params }, init),
  },
};
