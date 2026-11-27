import type { ReactNode } from "react";
import type { Movie } from "@/lib/api";
import MovieCard, { MovieCardSkeleton } from "./MovieCard";

const gridClass = {
  6: "grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
  // Para listas de 10 (recomendaciones): dos filas completas en escritorio.
  5: "grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
};

type Columns = keyof typeof gridClass;

interface Props<T> {
  items: T[];
  movie: (item: T) => Movie;
  detail?: (item: T) => ReactNode;
  likeable?: boolean | "refresh";
  /** Columnas en escritorio. */
  columns?: Columns;
}

// Genérico para pintar Movie[], RatedMovie[] o Recommendation[] con el mismo layout.
export default function MovieGrid<T>({ items, movie, detail, likeable, columns = 6 }: Props<T>) {
  return (
    <div className={gridClass[columns]}>
      {items.map((item) => {
        const m = movie(item);
        return <MovieCard key={m.id} movie={m} detail={detail?.(item)} likeable={likeable} />;
      })}
    </div>
  );
}

export function MovieGridSkeleton({ count = 12, columns = 6 }: { count?: number; columns?: Columns }) {
  return (
    <div className={gridClass[columns]}>
      {Array.from({ length: count }, (_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </div>
  );
}
