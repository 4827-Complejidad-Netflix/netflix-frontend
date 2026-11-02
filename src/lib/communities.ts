const COMMUNITY_COLORS = [
  "#4e9cf5", // azul
  "#f5a524", // ámbar
  "#3ccf91", // verde
  "#e865b8", // rosa
  "#9b7bf2", // violeta
  "#36c5d6", // cian
  "#f2734e", // coral
  "#c3d64a", // lima
];

export const ISOLATED_COLOR = "#5c5c5c";

/** Color de la comunidad `id` (el backend envía -1 para usuarios aislados). */
export function communityColor(id: number): string {
  return id < 0 ? ISOLATED_COLOR : COMMUNITY_COLORS[id % COMMUNITY_COLORS.length];
}

export type CommunityMethod = "ufds" | "kruskal";

export interface CommunityQuery {
  method: CommunityMethod;
  /** Umbral de Jaccard (solo UFDS). */
  theta: number;
  /** Comunidades deseadas (solo Kruskal). */
  k: number;
  sample: number;
  seed: number;
}

// Valores por defecto = experimento del TB1 (25 usuarios con 20–300 valoraciones positivas, θ = 0,10).
export const DEFAULT_QUERY: CommunityQuery = { method: "ufds", theta: 0.1, k: 3, sample: 25, seed: 42 };

// Mismos límites que valida el backend (app/api/graph.py).
export const LIMITS = {
  theta: { min: 0, max: 1 },
  k: { min: 1, max: 300 },
  sample: { min: 2, max: 300 },
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function num(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseCommunityQuery(params: Record<string, string | string[] | undefined>): CommunityQuery {
  const d = DEFAULT_QUERY;
  const theta = num(params.theta);
  const k = num(params.k);
  const sample = num(params.sample);
  const seed = num(params.seed);
  return {
    method: params.method === "kruskal" ? "kruskal" : "ufds",
    theta: theta === null ? d.theta : clamp(theta, LIMITS.theta.min, LIMITS.theta.max),
    k: k === null ? d.k : clamp(Math.round(k), LIMITS.k.min, LIMITS.k.max),
    sample: sample === null ? d.sample : clamp(Math.round(sample), LIMITS.sample.min, LIMITS.sample.max),
    seed: seed === null ? d.seed : Math.round(seed),
  };
}

/** Querystring de la vista; omite los valores por defecto para que la URL quede corta. */
export function communityHref(q: CommunityQuery): string {
  const d = DEFAULT_QUERY;
  const params = new URLSearchParams();
  if (q.method !== d.method) params.set("method", q.method);
  if (q.method === "ufds" && q.theta !== d.theta) params.set("theta", String(q.theta));
  if (q.method === "kruskal" && q.k !== d.k) params.set("k", String(q.k));
  if (q.sample !== d.sample) params.set("sample", String(q.sample));
  if (q.seed !== d.seed) params.set("seed", String(q.seed));
  const query = params.toString();
  return query ? `/graph/communities?${query}` : "/graph/communities";
}