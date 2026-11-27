import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ErrorState from "@/components/ErrorState";
import BfsTree, { BfsTreeSkeleton } from "@/components/graph/BfsTree";
import MovieGrid, { MovieGridSkeleton } from "@/components/movies/MovieGrid";
import { api, type CommunityRecommendations, type Graph, type Movie, type Recommendation, type User } from "@/lib/api";

const LIKED_LIMIT = 24;
const RECOMMENDATIONS_LIMIT = 10;
// Hijos por nodo en el árbol BFS (el backend admite 1–5). Con 3 niveles salen 1 + 3 + 9 + 27 = 40 nodos.
const BFS_BRANCHING = 3;
/** Miembros de la comunidad que se enlazan sobre las recomendaciones. */
const MEMBERS_SHOWN = 12;

interface UserRecommendation {
  movie: Movie;
  score: number;
  /** Aparece como candidata (nivel 3) en el árbol BFS de abajo. */
  inTree: boolean;
}

type Params = PageProps<"/users/[id]">["params"];

function bfsTree(id: number): Promise<Graph> {
  return api.users.bfs(id, { depth: 3, branching: BFS_BRANCHING });
}

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

/** Quiénes forman la comunidad UFDS del usuario, o por qué se cae al BFS si queda aislado. */
function CommunitySummary({ data, userId }: { data: CommunityRecommendations; userId: number }) {
  const members = data.community.filter((u) => u !== userId);
  const neighbours = data.pool.length - 1;
  const theta = data.theta.toLocaleString("es");

  if (members.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted">
        Con θ = {theta} ninguno de sus {neighbours} vecinos más cercanos tiene un Jaccard suficiente para unirse a
        él: queda aislado en G_U. Se muestran las recomendaciones del BFS.
      </p>
    );
  }

  return (
    <div className="rounded-r-xl border-l-2 border-accent bg-surface px-4 py-3 text-sm">
      <p>
        <span className="font-semibold">Comunidad UFDS de {members.length.toLocaleString("es")} usuarios</span>{" "}
        <span className="text-muted">
          entre sus {neighbours} vecinos más cercanos del BFS (θ = {theta}).
        </span>
      </p>
      <p className="mt-2 flex flex-wrap gap-1.5">
        {members.slice(0, MEMBERS_SHOWN).map((u) => (
          <Link
            key={u}
            href={`/users/${u}`}
            className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted hover:border-accent/60 hover:text-foreground"
          >
            U{u}
          </Link>
        ))}
        {members.length > MEMBERS_SHOWN && (
          <span className="px-1 text-xs text-muted">y {members.length - MEMBERS_SHOWN} más</span>
        )}
      </p>
    </div>
  );
}

async function Recommendations({ params }: { params: Params }) {
  const id = parseId((await params).id);
  if (id === null) return null;

  let data: CommunityRecommendations;
  let bfsRecommendations: Recommendation[] = [];
  let graph: Graph | null;
  try {
    [data, graph] = await Promise.all([
      api.users.communityRecommendations(id, { limit: RECOMMENDATIONS_LIMIT }),
      bfsTree(id).catch(() => null),
    ]);
    // Aislado en G_U (o su comunidad no aporta nada nuevo): se vuelve al BFS.
    if (data.recommendations.length === 0) {
      bfsRecommendations = await api.users.recommendations(id, { limit: RECOMMENDATIONS_LIMIT });
    }
  } catch (error) {
    return <ErrorState error={error} title="No se pudieron cargar las recomendaciones" />;
  }

  const fromCommunity = data.recommendations.length > 0;
  const treeIds = new Set(
    (graph?.nodes ?? []).filter((n) => n.kind === "movie" && n.level === 3).map((n) => n.ref),
  );
  const items: UserRecommendation[] = (fromCommunity ? data.recommendations : bfsRecommendations).map((r) => ({
    movie: r.movie,
    score: r.score,
    inTree: treeIds.has(r.movie.id),
  }));

  return (
    <div className="flex flex-col gap-4">
      <CommunitySummary data={data} userId={id} />
      {items.length === 0 ? (
        <p className="text-sm text-muted">El BFS no encontró películas candidatas para este usuario.</p>
      ) : (
        <MovieGrid
          items={items}
          movie={(r) => r.movie}
          detail={(r) => (
            <>
              <span className="font-semibold text-foreground">{r.score}</span>{" "}
              {fromCommunity
                ? r.score === 1
                  ? "miembro de su comunidad la valoró"
                  : "miembros de su comunidad la valoraron"
                : r.score === 1
                  ? "usuario similar la valoró"
                  : "usuarios similares la valoraron"}
              {r.inTree && <span className="text-accent-soft"> · en el árbol BFS</span>}
            </>
          )}
        />
      )}
    </div>
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
        subtitle="Su comunidad UFDS: se toman los vecinos más cercanos del BFS (nivel 2), se proyecta G_U por Jaccard y Union-Find une a los que superan el umbral θ. Se recomienda lo que más valoraron los miembros de la comunidad del usuario y que él aún no tiene."
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
