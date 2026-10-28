import type { Metadata } from "next";
import { Suspense } from "react";
import ErrorState from "@/components/ErrorState";
import Pagination from "@/components/Pagination";
import CatalogFilters from "@/components/movies/CatalogFilters";
import MovieGrid, { MovieGridSkeleton } from "@/components/movies/MovieGrid";
import { api, type MovieSort } from "@/lib/api";

export const metadata: Metadata = { title: "Catálogo" };

const PAGE_SIZE = 24;
const SORTS: MovieSort[] = ["popular", "title", "year"];

interface Filters {
  q: string;
  genre: string;
  sort: MovieSort;
  page: number;
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function parseFilters(params: Record<string, string | string[] | undefined>): Filters {
  const sort = first(params.sort) as MovieSort;
  const page = Number.parseInt(first(params.page), 10);
  return {
    q: first(params.q).trim(),
    genre: first(params.genre),
    sort: SORTS.includes(sort) ? sort : "popular",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

function catalogHref({ q, genre, sort }: Filters, page: number): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (genre) params.set("genre", genre);
  if (sort !== "popular") params.set("sort", sort);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/movies?${query}` : "/movies";
}

async function MovieResults({ filters }: { filters: Filters }) {
  let data;
  try {
    data = await api.movies.list({
      q: filters.q,
      genre: filters.genre,
      sort: filters.sort,
      limit: PAGE_SIZE,
      offset: (filters.page - 1) * PAGE_SIZE,
    });
  } catch (error) {
    return <ErrorState error={error} />;
  }

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  if (data.items.length === 0) {
    return (
      <p className="py-16 text-center text-muted">
        {filters.page > totalPages
          ? `La página ${filters.page} no existe; solo hay ${totalPages}.`
          : "No hay películas que coincidan con la búsqueda."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-muted">
        {data.total.toLocaleString("es")} películas · página {filters.page} de {totalPages}
      </p>
      <MovieGrid movies={data.items} />
      <Pagination page={filters.page} totalPages={totalPages} hrefFor={(p) => catalogHref(filters, p)} />
    </div>
  );
}

async function Catalog({ searchParams }: Pick<PageProps<"/movies">, "searchParams">) {
  const filters = parseFilters(await searchParams);
  const genres = await api.movies.genres().catch(() => []);

  return (
    <>
      <CatalogFilters genres={genres} q={filters.q} genre={filters.genre} sort={filters.sort} />
      {/* La key reinicia el Suspense en cada cambio de filtro para mostrar el skeleton. */}
      <Suspense key={catalogHref(filters, filters.page)} fallback={<MovieGridSkeleton />}>
        <MovieResults filters={filters} />
      </Suspense>
    </>
  );
}

// Con Cache Components, todo lo que lee searchParams o llama a la API va dentro de <Suspense>;
// el resto (título) forma parte del shell estático.
export default function MoviesPage({ searchParams }: PageProps<"/movies">) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-8">
      <div>
        <h1 className="text-3xl font-bold">Catálogo</h1>
        <p className="mt-1 text-sm text-muted">Películas de MovieLens con valoraciones positivas (rating ≥ 4).</p>
      </div>
      <Suspense
        fallback={
          <>
            <div className="h-10 animate-pulse rounded-md bg-surface" />
            <MovieGridSkeleton />
          </>
        }
      >
        <Catalog searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
