import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import ErrorState from "@/components/ErrorState";
import ClearLikesButton from "@/components/likes/ClearLikesButton";
import MovieGrid, { MovieGridSkeleton } from "@/components/movies/MovieGrid";
import { api, type LikesRecommendations, type Movie } from "@/lib/api";
import {
  applyCriterion,
  parseCriterion,
  TOP_LIMIT,
  type CriterionId,
  type CriterionResult,
} from "@/lib/criteria";
import { genreProfile, rankByGenre, type GenreProfile } from "@/lib/genreRanking";
import { LIKES_COOKIE, parseLikes } from "@/lib/likes";

export const metadata: Metadata = { title: "Para ti" };

/** Candidatas que se piden al backend (el máximo que acepta) para reordenarlas según cada criterio. */
const CANDIDATES_LIMIT = 200;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function plural(n: number, one: string, many: string): string {
  return `${n.toLocaleString("es")} ${n === 1 ? one : many}`;
}

function criterionHref(criterion: CriterionId, likedId?: number): string {
  const params = new URLSearchParams({ criterio: criterion });
  if (likedId !== undefined) params.set("pelicula", String(likedId));
  return `/recommendations?${params}`;
}

interface CriterionInfo {
  label: string;
  /** Qué mide el criterio, en una frase. */
  rule: string;
}

const CRITERIA_INFO: Record<CriterionId, CriterionInfo> = {
  combinada: {
    label: "Para ti",
    rule: "Mezcla los dos criterios principales: usuarios similares que la valoraron (60 %) y afinidad con tus géneros (40 %). Las que no comparten ningún género van al final.",
  },
  usuarios: {
    label: "Usuarios similares",
    rule: "Filtrado colaborativo: las que más valoraron (rating ≥ 4) los usuarios a los que también les gustan tus películas.",
  },
  generos: {
    label: "Tus géneros",
    rule: "Las que mejor cubren tu perfil de géneros, es decir, los géneros que más se repiten en tus me gusta.",
  },
  populares: {
    label: "Más populares",
    rule: "Entre las candidatas del BFS, las que tienen más valoraciones positivas en todo MovieLens.",
  },
  similares: {
    label: "Parecidas a…",
    rule: "Las que más valoraron los usuarios a quienes también les gustó la película que elijas.",
  },
};

/** Los tres niveles del BFS con lo que se encontró en cada uno, más el filtro de género. */
function Pipeline({ data, profile, sameGenre }: { data: LikesRecommendations; profile: GenreProfile; sameGenre: number }) {
  const steps = [
    { level: "Nivel 1", value: plural(data.liked.length, "película", "películas"), label: "con tu me gusta" },
    { level: "Nivel 2", value: plural(data.similar_users, "usuario", "usuarios"), label: "también las valoraron (rating ≥ 4)" },
    { level: "Nivel 3", value: plural(data.total_candidates, "candidata", "candidatas"), label: "valoradas por esos usuarios y que aún no tienes" },
    {
      level: "Género",
      value: plural(sameGenre, "candidata", "candidatas"),
      label: profile.top.length
        ? `de tus géneros (${profile.top.slice(0, 3).join(", ")}${profile.top.length > 3 ? "…" : ""})`
        : "tus likes no tienen género",
    },
  ];
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((step, i) => (
        <li key={step.level} className="relative rounded-xl border border-border bg-surface px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-accent-soft">{step.level}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{step.value}</p>
          <p className="text-sm text-muted">{step.label}</p>
          {i < steps.length - 1 && (
            <span aria-hidden="true" className="absolute -right-2.5 top-1/2 z-10 hidden -translate-y-1/2 text-accent-soft lg:block">
              →
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

/** Pestañas para elegir el criterio de la recomendación. */
function CriterionTabs({ active, likedId }: { active: CriterionId; likedId?: number }) {
  return (
    <nav aria-label="Criterio de recomendación" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2 rounded-full border border-border bg-surface p-1">
        {(Object.keys(CRITERIA_INFO) as CriterionId[]).map((id) => {
          const isActive = id === active;
          return (
            <li key={id}>
              <Link
                href={criterionHref(id, id === "similares" ? likedId : undefined)}
                scroll={false}
                aria-current={isActive ? "page" : undefined}
                className={`block whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                {CRITERIA_INFO[id].label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Elige la película de referencia del criterio "Parecidas a…". */
function LikedPicker({ liked, active }: { liked: Movie[]; active: number }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted">Película de referencia:</span>
      {liked.map((movie) => {
        const isActive = movie.id === active;
        return (
          <Link
            key={movie.id}
            href={criterionHref("similares", movie.id)}
            scroll={false}
            aria-current={isActive ? "true" : undefined}
            className={`max-w-56 truncate rounded-full border px-3 py-1 text-xs transition-colors ${
              isActive
                ? "border-accent bg-accent/15 font-medium text-foreground"
                : "border-border text-muted hover:border-accent/60 hover:text-foreground"
            }`}
            title={movie.title}
          >
            {movie.title}
          </Link>
        );
      })}
    </div>
  );
}

/** Por qué aparece la película según el criterio elegido. */
function Reason({ criterion, result }: { criterion: CriterionId; result: CriterionResult }) {
  const c = result.candidate;
  switch (criterion) {
    case "combinada":
      return (
        <>
          <span className="font-semibold text-foreground">{c.score}</span> {c.score === 1 ? "usuario similar" : "usuarios similares"}
          {c.sharedGenres.length > 0 && <span className="text-muted"> · {c.sharedGenres.slice(0, 2).join(", ")}</span>}
        </>
      );
    case "usuarios":
      return (
        <>
          <span className="font-semibold text-foreground">{c.score}</span>{" "}
          {c.score === 1 ? "usuario similar la valoró" : "usuarios similares la valoraron"}
        </>
      );
    case "generos":
      return (
        <>
          <span className="font-semibold text-foreground">{Math.round(c.genreAffinity * 100)} %</span> de tus géneros
          <span className="text-muted"> · {c.sharedGenres.slice(0, 2).join(", ")}</span>
        </>
      );
    case "populares":
      return (
        <>
          <span className="text-gold">★</span>{" "}
          <span className="font-semibold text-foreground">{c.movie.positive_ratings.toLocaleString("es")}</span> valoraciones
          positivas
        </>
      );
    case "similares":
      return (
        <>
          <span className="font-semibold text-foreground">{result.viaUsers}</span>{" "}
          {result.viaUsers === 1 ? "usuario valoró ambas" : "usuarios valoraron ambas"}
        </>
      );
  }
}

async function ForYou({ searchParams }: Pick<PageProps<"/recommendations">, "searchParams">) {
  const params = await searchParams;
  const criterion = parseCriterion(first(params.criterio));
  const liked = parseLikes((await cookies()).get(LIKES_COOKIE)?.value);

  if (liked.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface/50 px-4 py-16 text-center">
        <p className="text-4xl text-danger" aria-hidden="true">♡</p>
        <p className="font-semibold">Aún no le diste me gusta a ninguna película</p>
        <p className="max-w-md text-sm text-muted">
          Pasa el cursor por un póster del catálogo y pulsa ♥. Con tus likes el BFS busca usuarios con gustos parecidos y
          te recomienda lo que ellos valoraron.
        </p>
        <Link
          href="/movies"
          className="mt-2 rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
        >
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
  const profile = genreProfile(data.liked);
  const ranked = rankByGenre(data.candidates, profile);
  const sameGenre = ranked.filter((c) => c.sharedGenres.length > 0).length;

  // Película de referencia para "Parecidas a…": la pedida en la URL o, si no es un like, el más reciente.
  const requested = Number(first(params.pelicula));
  const likedId = likedMovies.some((m) => m.id === requested) ? requested : likedMovies[0]?.id;
  const reference = likedMovies.find((m) => m.id === likedId);

  const results = applyCriterion(criterion, ranked, likedId);
  const info = CRITERIA_INFO[criterion];

  return (
    <>
      <Pipeline data={data} profile={profile} sameGenre={sameGenre} />

      <section className="flex flex-col gap-5" aria-labelledby="recs-title">
        <CriterionTabs active={criterion} likedId={likedId} />

        <div className="rounded-r-xl border-l-2 border-accent bg-surface px-4 py-3">
          <h2 id="recs-title" className="text-xl font-bold">
            {criterion === "similares" && reference ? `Parecidas a ${reference.title}` : info.label}
          </h2>
          <p className="mt-1 text-sm text-foreground/80">
            <span className="font-medium text-accent-soft">Criterio:</span> {info.rule} Se muestran las {TOP_LIMIT} más
            relevantes.
          </p>
        </div>

        {criterion === "similares" && likedId !== undefined && likedMovies.length > 1 && (
          <LikedPicker liked={likedMovies} active={likedId} />
        )}

        {results.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
            {data.candidates.length === 0
              ? "El BFS no encontró candidatas: nadie más valoró positivamente estas películas. Prueba con otras más populares."
              : criterion === "generos"
                ? "Ninguna candidata comparte género con tus me gusta."
                : "No hay candidatas que se alcancen desde esta película. Prueba con otra."}
          </p>
        ) : (
          <MovieGrid
            items={results}
            movie={(r) => r.candidate.movie}
            likeable="refresh"
            columns={5}
            detail={(r) => <Reason criterion={criterion} result={r} />}
          />
        )}
        <p className="text-xs text-muted">Dale ♥ a una recomendación para añadirla a tus me gusta y recalcular.</p>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Tus me gusta</h2>
            <p className="mt-1 text-sm text-muted">El punto de partida del BFS. Quita uno para ver cómo cambian las recomendaciones.</p>
          </div>
          <ClearLikesButton />
        </div>
        <MovieGrid items={likedMovies} movie={(m) => m} likeable="refresh" />
      </section>
    </>
  );
}

// Los likes salen de una cookie y el criterio de la URL (datos de ejecución): todo lo que depende de ellos va en <Suspense>.
export default function RecommendationsPage({ searchParams }: PageProps<"/recommendations">) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-8 sm:px-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Para ti</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          BFS de 3 niveles en G_B partiendo de tus me gusta: tus películas → usuarios que también las valoraron →
          películas candidatas. Elige un criterio para ver las {TOP_LIMIT} candidatas más relevantes según él.
        </p>
      </div>
      <Suspense
        fallback={
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-surface" />
              ))}
            </div>
            <MovieGridSkeleton count={TOP_LIMIT} columns={5} />
          </>
        }
      >
        <ForYou searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
