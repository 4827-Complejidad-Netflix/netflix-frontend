// Tipos de respuesta de netflix-backend. Reflejan app/schemas.py: si cambia un modelo allí, actualízalo aquí.

export interface Movie {
  id: number;
  title: string;
  year: number | null;
  genres: string[];
  imdb_id: string | null;
  tmdb_id: number | null;
  positive_ratings: number;
}

export interface PaginatedMovies {
  total: number;
  items: Movie[];
}

export interface RatedMovie {
  movie: Movie;
  rating: number;
}

export interface User {
  id: number;
  positive_ratings: number;
  liked: RatedMovie[];
}

export interface Recommendation {
  movie: Movie;
  /** Nº de usuarios similares (distancia 2 en G_B) que la calificaron positivamente. */
  score: number;
}

export type NodeKind = "user" | "movie";

export interface GraphNode {
  /** Formato `"<kind>-<ref>"`, p. ej. `"user-1"` o `"movie-318"`. */
  id: string;
  kind: NodeKind;
  /** ID del usuario o película en el dataset. */
  ref: number;
  /** Nivel BFS; en comunidades, ID de la comunidad (-1 si está aislado). */
  level: number;
  label: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  /** Calificación usuario→película (aristas de G_B). */
  rating: number | null;
  /** Similitud de Jaccard (aristas de G_U). */
  weight: number | null;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Community {
  id: number;
  users: number[];
}

export interface Communities {
  theta: number;
  sample: number[];
  communities: Community[];
  isolated: number[];
  graph: Graph;
}

export interface KruskalCommunities {
  k: number;
  /** Suma de Jaccard de las aristas elegidas por Kruskal. */
  total_similarity: number;
  sample: number[];
  communities: Community[];
  isolated: number[];
  /** Solo las aristas del bosque de expansión máxima. */
  graph: Graph;
}

export interface GraphStats {
  users: number;
  movies: number;
  nodes: number;
  edges: number;
  density: number;
  avg_degree: number;
  total_ratings: number;
  min_rating: number;
}

// Parámetros de consulta

export type MovieSort = "popular" | "title" | "year";

export interface MovieListParams {
  q?: string;
  genre?: string;
  sort?: MovieSort;
  limit?: number;
  offset?: number;
}

export interface SampleParams {
  sample_size?: number;
  min_positive?: number;
  max_positive?: number;
  seed?: number;
}

export interface CommunitiesParams extends SampleParams {
  theta?: number;
}

export interface KruskalParams extends SampleParams {
  k?: number;
}
