import type { Movie } from "@/lib/api";
import MovieCard, { MovieCardSkeleton } from "./MovieCard";

const gridClass = "grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";

export default function MovieGrid({ movies }: { movies: Movie[] }) {
  return (
    <div className={gridClass}>
      {movies.map((movie) => (
        <MovieCard key={movie.id} movie={movie} />
      ))}
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
