import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import ErrorState from "@/components/ErrorState";
import ClearLikesButton from "@/components/likes/ClearLikesButton";
import LikeButton from "@/components/likes/LikeButton";
import MovieGrid, { MovieGridSkeleton } from "@/components/movies/MovieGrid";
import { api, type Candidate, type LikesRecommendations } from "@/lib/api";
import { LIKES_COOKIE, parseLikes } from "@/lib/likes";

export const metadata: Metadata = { title: "Para ti" };

/** Candidatas que se piden al backend y se listan en la tabla completa. */
const CANDIDATES_LIMIT = 100;
/** Las primeras se muestran además como tarjetas. */
const TOP_LIMIT = 12;

function Section({ title, subtitle, action, children }: {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function plural(n: number, one: string, many: string): string {
  return `${n.toLocaleString("es")} ${n === 1 ? one : many}`;
}

/** Los tres niveles del BFS con lo que se encontró en cada uno. */
function Pipeline({ data }: { data: LikesRecommendations }) {
  const steps = [
    { level: "Nivel 1", value: plural(data.liked.length, "película", "películas"), label: "con tu me gusta" },
    { level: "Nivel 2", value: plural(data.similar_users, "usuario", "usuarios"), label: "también las valoraron (rating ≥ 4)" },
    { level: "Nivel 3", value: plural(data.total_candidates, "candidata", "candidatas"), label: "valoradas por esos usuarios y que aún no tienes" },
  ];
  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {steps.map((step, i) => (
        <li key={step.level} className="relative rounded-lg border border-border bg-surface px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted">{step.level}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{step.value}</p>
          <p className="text-sm text-muted">{step.label}</p>
          {i < steps.length - 1 && (
            <span aria-hidden="true" className="absolute -right-2.5 top-1/2 z-10 hidden -translate-y-1/2 text-muted sm:block">
              →
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

function Via({ candidate }: { candidate: Candidate }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {candidate.via.map((v) => (
        <li
          key={v.movie.id}
          className="max-w-full truncate rounded-full border border-border px-2 py-0.5 text-xs text-foreground/80"
          title={`${plural(v.users, "usuario valoró", "usuarios valoraron")} ${v.movie.title} y esta película`}
        >
          <span className="text-danger">♥</span> {v.movie.title} <span className="text-muted">· {v.users}</span>
        </li>
      ))}
    </ul>
  );
}

/** Lista completa y ordenada de candidatas: lo que el algoritmo realmente devolvió. */
function CandidateList({ candidates }: { candidates: Candidate[] }) {
  const maxScore = candidates[0]?.score ?? 1;
  return (
    <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border">
      {candidates.map((c, i) => (
        <li key={c.movie.id} className="flex flex-col gap-2 bg-surface px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex min-w-0 flex-1 items-baseline gap-3">
            <span className="w-8 shrink-0 text-right text-sm tabular-nums text-muted">{i + 1}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium" title={c.movie.title}>
                {c.movie.title}
                {c.movie.year && <span className="font-normal text-muted"> · {c.movie.year}</span>}
              </p>
              <p className="truncate text-xs text-muted">{c.movie.genres.join(" · ") || "Sin género"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-11 sm:w-44 sm:pl-0">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border" aria-hidden="true">
              <div className="h-full rounded-full bg-foreground" style={{ width: `${(c.score / maxScore) * 100}%` }} />
            </div>
            <span className="w-24 text-right text-xs tabular-nums text-foreground/80">
              {plural(c.score, "usuario", "usuarios")}
            </span>
          </div>
          <div className="min-w-0 pl-11 sm:w-72 sm:pl-0">
            <Via candidate={c} />
          </div>
          <div className="self-end sm:self-center">
            <LikeButton movieId={c.movie.id} title={c.movie.title} refreshOnChange inline />
          </div>
        </li>
      ))}
    </ol>
  );
}

async function ForYou() {
  const liked = parseLikes((await cookies()).get(LIKES_COOKIE)?.value);

  if (liked.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-4 py-16 text-center">
        <p className="text-4xl text-danger" aria-hidden="true">♡</p>
        <p className="font-semibold">Aún no le diste me gusta a ninguna película</p>
        <p className="max-w-md text-sm text-muted">
          Pasa el cursor por un póster del catálogo y pulsa ♥. Con tus likes el BFS busca usuarios con gustos parecidos y
          te recomienda lo que ellos valoraron.
        </p>
        <Link href="/movies" className="mt-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90">
          Ir al catálogo
        </Link>
      </div>
    );
  }

  let data: LikesRecommendations;
  try {
    data = await api.recommendations.fromLikes(liked, { limit: CANDIDATES_LIMIT });
  } catch (error) {
    return <ErrorState error={error} title="No se pudieron calcular las recomendaciones" />;
  }

  // Más recientes primero, como los añadió el usuario.
  const likedMovies = [...data.liked].reverse();

  return (
    <>
      <Pipeline data={data} />

      <Section
        title="Recomendaciones"
        subtitle="Las candidatas con más usuarios similares. Dales ♥ para añadirlas a tu perfil y recalcular."
      >
        {data.candidates.length === 0 ? (
          <p className="text-sm text-muted">
            El BFS no encontró candidatas: nadie más valoró positivamente estas películas. Prueba con otras más populares.
          </p>
        ) : (
          <MovieGrid
            items={data.candidates.slice(0, TOP_LIMIT)}
            movie={(c) => c.movie}
            likeable="refresh"
            detail={(c) => (
              <>
                <span className="font-semibold text-foreground">{c.score}</span>{" "}
                {c.score === 1 ? "usuario similar" : "usuarios similares"}
                {c.via[0] && <span className="text-muted"> · por {c.via[0].movie.title}</span>}
              </>
            )}
          />
        )}
      </Section>

      {data.candidates.length > 0 && (
        <Section
          title="Todas las candidatas"
          subtitle={
            <>
              {data.total_candidates > data.candidates.length
                ? `Las ${data.candidates.length} primeras de ${data.total_candidates.toLocaleString("es")}, `
                : `Las ${data.candidates.length}, `}
              ordenadas por score (usuarios del nivel 2 que la valoraron). Las etiquetas ♥ indican desde qué likes se
              llegó y cuántos usuarios comparten ambas películas.
            </>
          }
        >
          <CandidateList candidates={data.candidates} />
        </Section>
      )}

      <Section
        title="Tus me gusta"
        subtitle="El punto de partida del BFS. Quita uno para ver cómo cambian las candidatas."
        action={<ClearLikesButton />}
      >
        <MovieGrid items={likedMovies} movie={(m) => m} likeable="refresh" />
      </Section>
    </>
  );
}

// Los likes salen de una cookie (dato de ejecución), así que todo lo que depende de ellos va en <Suspense>.
export default function RecommendationsPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-8 sm:px-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Para ti</h1>
        <p className="mt-1 text-sm text-muted">
          BFS de 3 niveles en G_B partiendo de tus me gusta: tus películas → usuarios que también las valoraron →
          películas candidatas.
        </p>
      </div>
      <Suspense
        fallback={
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg bg-surface" />
              ))}
            </div>
            <MovieGridSkeleton count={TOP_LIMIT} />
          </>
        }
      >
        <ForYou />
      </Suspense>
    </div>
  );
}
