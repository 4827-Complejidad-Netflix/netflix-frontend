import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ErrorState from "@/components/ErrorState";
import BfsTree, { BfsTreeSkeleton } from "@/components/graph/BfsTree";
import MovieGrid, { MovieGridSkeleton } from "@/components/movies/MovieGrid";
import { api, type Graph, type Movie, type Recommendation, type User } from "@/lib/api";

const LIKED_LIMIT = 24;
/** Recomendaciones que se muestran: primero las candidatas del árbol BFS y luego el resto por score. */
const RECOMMENDATIONS_LIMIT = 10;
/** Recomendaciones que se piden al backend (su máximo) para conocer el score de las candidatas del árbol. */
const RECOMMENDATIONS_FETCH = 50;
// Hijos por nodo en el árbol BFS (el backend admite 1–5). Con 3 niveles salen 1 + 2 + 4 + 8 = 15 nodos:
// como mucho 8 candidatas, así que todas caben entre las RECOMMENDATIONS_LIMIT recomendaciones.
const BFS_BRANCHING = 2;

interface UserRecommendation {
  movie: Movie;
  /** Usuarios similares que la valoraron; null si no está entre las que devuelve el backend. */
  score: number | null;
  /** Aparece como candidata (nivel 3) en el árbol BFS. */
  inTree: boolean;
}

function bfsTree(id: number): Promise<Graph> {
  return api.users.bfs(id, { depth: 3, branching: BFS_BRANCHING });
}

/** Candidatas del árbol BFS (que deben salir sí o sí) seguidas del resto de recomendaciones, hasta el límite. */
async function userRecommendations(id: number): Promise<UserRecommendation[]> {
  const [recommendations, graph] = await Promise.all([
    api.users.recommendations(id, { limit: RECOMMENDATIONS_FETCH }),
    bfsTree(id).catch(() => null),
  ]);
  const byMovie = new Map(recommendations.map((r) => [r.movie.id, r]));
  const treeIds = [
    ...new Set((graph?.nodes ?? []).filter((n) => n.kind === "movie" && n.level === 3).map((n) => n.ref)),
  ];

  const fromTree = await Promise.all(
    treeIds.map(async (movieId): Promise<UserRecommendation | null> => {
      const rec = byMovie.get(movieId);
      if (rec) return { movie: rec.movie, score: rec.score, inTree: true };
      const movie = await api.movies.get(movieId).catch(() => null);
      return movie && { movie, score: null, inTree: true };
    }),
  );
  const tree = fromTree
    .filter((r): r is UserRecommendation => r !== null)
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  const inTree = new Set(treeIds);
  const rest = recommendations
    .filter((r: Recommendation) => !inTree.has(r.movie.id))
    .map((r) => ({ movie: r.movie, score: r.score, inTree: false }));

  return [...tree, ...rest].slice(0, RECOMMENDATIONS_LIMIT);
}

type Params = PageProps<"/users/[id]">["params"];

function parseId(raw: string): number | null {
  return /^\d+$/.test(raw) ? Number(raw) : null;
}

export async function generateMetadata({ params }: PageProps<"/users/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Usuario ${id}` };
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

async function ProfileHeader({ params }: { params: Params }) {
  const id = parseId((await params).id);
  let user: User | null = null;
  if (id !== null) user = await api.users.get(id, { limit: 1 }).catch(() => null);

  return (
    <div>
      <p className="text-sm text-muted">
        <Link href="/users" className="hover:text-foreground">
          Usuarios
        </Link>{" "}
        / perfil
      </p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Usuario {id ?? "—"}</h1>
      {user && (
        <p className="mt-1 text-sm text-muted">
          {user.positive_ratings.toLocaleString("es")} películas valoradas positivamente
        </p>
      )}
    </div>
  );
}

async function Recommendations({ params }: { params: Params }) {
  const id = parseId((await params).id);
  if (id === null) return null;

  let recommendations: UserRecommendation[];
  try {
    recommendations = await userRecommendations(id);
  } catch (error) {
    return <ErrorState error={error} title="No se pudieron cargar las recomendaciones" />;
  }

  if (recommendations.length === 0) {
    return <p className="text-sm text-muted">El BFS no encontró películas candidatas para este usuario.</p>;
  }

  return (
    <MovieGrid
      items={recommendations}
      movie={(r) => r.movie}
      detail={(r) => (
        <>
          {r.score !== null && (
            <>
              <span className="font-semibold text-foreground">{r.score}</span>{" "}
              {r.score === 1 ? "usuario similar la valoró" : "usuarios similares la valoraron"}
            </>
          )}
          {r.inTree && (
            <span className="text-accent-soft">
              {r.score !== null && " · "}en el árbol BFS
            </span>
          )}
        </>
      )}
    />
  );
}

async function BfsTreeSection({ params }: { params: Params }) {
  const id = parseId((await params).id);
  if (id === null) return null;

  let graph: Graph;
  try {
    graph = await bfsTree(id);
  } catch (error) {
    return <ErrorState error={error} title="No se pudo cargar el árbol BFS" />;
  }

  if (graph.nodes.length <= 1) {
    return <p className="text-sm text-muted">Este usuario no tiene valoraciones positivas desde las que recorrer el grafo.</p>;
  }

  return <BfsTree graph={graph} />;
}

async function LikedMovies({ params }: { params: Params }) {
  const id = parseId((await params).id);
  if (id === null) return <p className="text-sm text-muted">El ID de usuario debe ser un número.</p>;

  let user: User;
  try {
    user = await api.users.get(id, { limit: LIKED_LIMIT });
  } catch (error) {
    return <ErrorState error={error} title="No se pudo cargar el usuario" />;
  }

  return (
    <div className="flex flex-col gap-3">
      {user.positive_ratings > user.liked.length && (
        <p className="text-sm text-muted">
          Mostrando {user.liked.length} de {user.positive_ratings.toLocaleString("es")}, mejor valoradas primero.
        </p>
      )}
      <MovieGrid
        items={user.liked}
        movie={(r) => r.movie}
        detail={(r) => (
          <>
            <span className="text-gold">★</span> {r.rating.toFixed(1)}
          </>
        )}
      />
    </div>
  );
}

// Sin generateStaticParams el id es dato de ejecución: cada parte que lo lee va en su propio <Suspense>
// para que el perfil, las recomendaciones, el árbol BFS y las favoritas se carguen en paralelo.
export default function UserPage({ params }: PageProps<"/users/[id]">) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-8 sm:px-8">
      <Suspense fallback={<div className="h-16 w-48 animate-pulse rounded-md bg-surface" />}>
        <ProfileHeader params={params} />
      </Suspense>

      <Section
        title="Recomendaciones"
        subtitle={`BFS de 3 niveles en G_B: usuario → sus películas → usuarios similares → películas candidatas. Primero las candidatas del árbol BFS de abajo y luego el resto, hasta ${RECOMMENDATIONS_LIMIT}. El score es cuántos usuarios similares la valoraron positivamente.`}
      >
        <Suspense fallback={<MovieGridSkeleton count={RECOMMENDATIONS_LIMIT} />}>
          <Recommendations params={params} />
        </Suspense>
      </Section>

      <Section
        title="Árbol BFS"
        subtitle={`Recorrido que genera las recomendaciones, limitado a ${BFS_BRANCHING} ramas por nodo para que se pueda leer.`}
      >
        <Suspense fallback={<BfsTreeSkeleton />}>
          <BfsTreeSection params={params} />
        </Suspense>
      </Section>

      <Section title="Le gustaron" subtitle="Películas con rating ≥ 4.">
        <Suspense fallback={<MovieGridSkeleton count={12} />}>
          <LikedMovies params={params} />
        </Suspense>
      </Section>
    </div>
  );
}
