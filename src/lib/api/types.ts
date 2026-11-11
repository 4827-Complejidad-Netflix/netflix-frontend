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

export interface CandidateVia {
  /** Película con "me gusta" desde la que se llegó a la candidata. */
  movie: Movie;
  /** Usuarios similares que valoraron positivamente ambas. */
  users: number;
}

export interface Candidate {
  movie: Movie;
  /** Nº de usuarios similares (nivel 2 del BFS) que la valoraron positivamente. */
  score: number;
  /** De qué likes viene, más usuarios primero (máx. 3). */
  via: CandidateVia[];
}

export interface LikesRecommendations {
  /** Likes reconocidos por el backend. */
  liked: Movie[];
  /** IDs que no existen en el catálogo. */
  ignored: number[];
  /** Usuarios alcanzados en el nivel 2 del BFS. */
  similar_users: number;
  /** Películas alcanzadas en el nivel 3, antes de aplicar `limit`. */
  total_candidates: number;
  candidates: Candidate[];
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
  rating: number | null;
  weight: number | null;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** Película que comparten varios miembros de una comunidad. */
export interface SharedMovie {
  movie: Movie;
  users: number[];
}

export interface GenreShare {
  genre: string;
  share: number;
  lift: number;
}

export interface Community {
  id: number;
  users: number[];
  /** Jaccard medio de las aristas de G_U dentro de la comunidad. */
  avg_similarity: number;
  internal_edges: number;
  shared_movies: SharedMovie[];
  genres: GenreShare[];
}

/** Por qué un usuario quedó aislado: su par más parecido no alcanza el umbral. */
export interface IsolatedUser {
  user: number;
  best_match: number | null;
  similarity: number;
}

/** Películas en común entre dos usuarios: el motivo de su arista en G_U. */
export interface Shared {
  u: number;
  v: number;
  similarity: number;
  shared_count: number;
  union_count: number;
  movies: Movie[];
}

export interface Communities {
  theta: number;
  sample: number[];
  communities: Community[];
  isolated: number[];
  isolated_details: IsolatedUser[];
  graph: Graph;
}

export interface KruskalCommunities {
  k: number;
  total_similarity: number;
  sample: number[];
  communities: Community[];
  isolated: number[];
  isolated_details: IsolatedUser[];   
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
