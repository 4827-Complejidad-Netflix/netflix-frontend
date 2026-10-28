import type { ReactNode } from "react";
import type { Movie } from "@/lib/api";
import MovieCard, { MovieCardSkeleton } from "./MovieCard";

const gridClass = "grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";

interface Props<T> {
  items: T[];
  movie: (item: T) => Movie;
  detail?: (item: T) => ReactNode;
}

// Genérico para pintar Movie[], RatedMovie[] o Recommendation[] con el mismo layout.
export default function MovieGrid<T>({ items, movie, detail }: Props<T>) {
  return (
    <div className={gridClass}>
      {items.map((item) => {
        const m = movie(item);
        return <MovieCard key={m.id} movie={m} detail={detail?.(item)} />;
      })}
    </div>
  );
}

export function MovieGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className={gridClass}>
      {Array.from({ length: count }, (_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </div>
  );
}
