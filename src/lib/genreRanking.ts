import type { Candidate, Movie } from "@/lib/api";

// Segunda pasada sobre las candidatas del BFS: además de cuántos usuarios similares las valoraron, se premia
// que compartan género con las películas que te gustan.

/** Peso del score del BFS en el ranking final; el resto es afinidad de género. */
const BFS_WEIGHT = 0.6;

export interface GenreProfile {
  /** Nº de likes en los que aparece cada género. */
  counts: Map<string, number>;
  /** Géneros de tus likes, más frecuentes primero. */
  top: string[];
}

export interface RankedCandidate extends Candidate {
  /** Géneros de la candidata que también están en tus likes, más frecuentes primero. */
  sharedGenres: string[];
  /** Parte de tu perfil de géneros (0–1) que cubre la candidata. */
  genreAffinity: number;
  /** Score final (0–1) que mezcla el BFS y la afinidad de género. */
  rank: number;
}

export function genreProfile(liked: Movie[]): GenreProfile {
  const counts = new Map<string, number>();
  for (const movie of liked) {
    for (const genre of new Set(movie.genres)) counts.set(genre, (counts.get(genre) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([g]) => g);
  return { counts, top };
}

/**
 * Ordena las candidatas por `BFS_WEIGHT · score normalizado + (1 − BFS_WEIGHT) · afinidad de género`.
 * Las que no comparten ningún género con tus likes quedan al final.
 */
export function rankByGenre(candidates: Candidate[], profile: GenreProfile): RankedCandidate[] {
  const total = [...profile.counts.values()].reduce((a, b) => a + b, 0);
  const maxScore = Math.max(1, ...candidates.map((c) => c.score));

  return candidates
    .map((c) => {
      const sharedGenres = [...new Set(c.movie.genres)]
        .filter((g) => profile.counts.has(g))
        .sort((a, b) => profile.counts.get(b)! - profile.counts.get(a)!);
      const covered = sharedGenres.reduce((sum, g) => sum + profile.counts.get(g)!, 0);
      const genreAffinity = total > 0 ? covered / total : 0;
      const rank = BFS_WEIGHT * (c.score / maxScore) + (1 - BFS_WEIGHT) * genreAffinity;
      return { ...c, sharedGenres, genreAffinity, rank };
    })
    .sort(
      (a, b) =>
        Number(b.sharedGenres.length > 0) - Number(a.sharedGenres.length > 0) ||
        b.rank - a.rank ||
        b.score - a.score,
    );
}
