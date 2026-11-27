import type { RankedCandidate } from "@/lib/genreRanking";

// Criterios con los que se pueden ordenar las candidatas del BFS. Cada uno devuelve como máximo TOP_LIMIT
// películas para no saturar al usuario.

/** Máximo de películas que se muestran por criterio. */
export const TOP_LIMIT = 10;

export const CRITERIA = ["combinada", "usuarios", "generos", "populares", "similares"] as const;

export type CriterionId = (typeof CRITERIA)[number];

export const DEFAULT_CRITERION: CriterionId = "combinada";

export function parseCriterion(value: string | undefined): CriterionId {
  return CRITERIA.includes(value as CriterionId) ? (value as CriterionId) : DEFAULT_CRITERION;
}

export interface CriterionResult {
  candidate: RankedCandidate;
  /** Usuarios que valoraron la candidata y la película de referencia (solo en "similares"). */
  viaUsers?: number;
}

/**
 * Las `TOP_LIMIT` candidatas más relevantes según el criterio. `ranked` viene ya ordenado por la mezcla
 * BFS + género (`rankByGenre`); `likedId` es la película de referencia del criterio "similares".
 */
export function applyCriterion(
  criterion: CriterionId,
  ranked: RankedCandidate[],
  likedId?: number,
): CriterionResult[] {
  let results: CriterionResult[];

  switch (criterion) {
    case "combinada":
      results = ranked.map((candidate) => ({ candidate }));
      break;
    case "usuarios":
      // Filtrado colaborativo puro: cuantos más usuarios similares la valoraron, antes.
      results = [...ranked].sort((a, b) => b.score - a.score || b.rank - a.rank).map((candidate) => ({ candidate }));
      break;
    case "generos":
      // Solo las que comparten género, por la parte de tu perfil de géneros que cubren.
      results = ranked
        .filter((c) => c.sharedGenres.length > 0)
        .sort((a, b) => b.genreAffinity - a.genreAffinity || b.score - a.score)
        .map((candidate) => ({ candidate }));
      break;
    case "populares":
      // Valoraciones positivas en todo MovieLens, no solo entre los usuarios similares.
      results = [...ranked]
        .sort((a, b) => b.movie.positive_ratings - a.movie.positive_ratings || b.score - a.score)
        .map((candidate) => ({ candidate }));
      break;
    case "similares":
      // Las que se alcanzaron desde una película concreta de tus me gusta, por usuarios que comparten ambas.
      results = ranked
        .flatMap((candidate) => {
          const via = candidate.via.find((v) => v.movie.id === likedId);
          return via ? [{ candidate, viaUsers: via.users }] : [];
        })
        .sort((a, b) => b.viaUsers - a.viaUsers || b.candidate.rank - a.candidate.rank);
      break;
  }

  return results.slice(0, TOP_LIMIT);
}
