import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ErrorState from "@/components/ErrorState";
import MovieGrid, { MovieGridSkeleton } from "@/components/movies/MovieGrid";
import { api, type Recommendation, type User } from "@/lib/api";

const LIKED_LIMIT = 24;
const RECOMMENDATIONS_LIMIT = 12;

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
      <h1 className="mt-1 text-3xl font-bold">Usuario {id ?? "—"}</h1>
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

  let recommendations: Recommendation[];
  try {
    recommendations = await api.users.recommendations(id, { limit: RECOMMENDATIONS_LIMIT });
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
          <span className="font-semibold text-brand">{r.score}</span>{" "}
          {r.score === 1 ? "usuario similar la valoró" : "usuarios similares la valoraron"}
        </>
      )}
    />
  );
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
            <span className="text-yellow-400">★</span> {r.rating.toFixed(1)}
          </>
        )}
      />
    </div>
  );
}

// Sin generateStaticParams el id es dato de ejecución: cada parte que lo lee va en su propio <Suspense>
// para que el perfil, las recomendaciones y las favoritas se carguen en paralelo.
export default function UserPage({ params }: PageProps<"/users/[id]">) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-8 sm:px-8">
      <Suspense fallback={<div className="h-16 w-48 animate-pulse rounded-md bg-surface" />}>
        <ProfileHeader params={params} />
      </Suspense>

      <Section
        title="Recomendaciones"
        subtitle="BFS de 3 niveles en G_B: usuario → sus películas → usuarios similares → películas candidatas. El score es cuántos usuarios similares la valoraron positivamente."
      >
        <Suspense fallback={<MovieGridSkeleton count={RECOMMENDATIONS_LIMIT} />}>
          <Recommendations params={params} />
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
