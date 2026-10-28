import type { Movie } from "@/lib/api";

// Sin API de pósters todavía: cada película recibe un degradado estable derivado de su id.
function posterGradient(id: number): string {
  const hue = (id * 47) % 360;
  return `linear-gradient(160deg, hsl(${hue} 45% 30%), hsl(${(hue + 40) % 360} 50% 9%))`;
}

export default function MovieCard({ movie }: { movie: Movie }) {
  return (
    <article className="group flex flex-col gap-2">
      <div
        className="relative flex aspect-[2/3] flex-col justify-end overflow-hidden rounded-md p-3 shadow-lg ring-1 ring-white/5 transition-transform duration-200 group-hover:scale-[1.03]"
        style={{ background: posterGradient(movie.id) }}
      >
        <h3 className="line-clamp-4 text-base font-bold leading-tight text-white drop-shadow">{movie.title}</h3>
        {movie.year && <p className="mt-1 text-xs text-white/70">{movie.year}</p>}
      </div>
      <div className="flex flex-col gap-1 px-0.5">
        <p className="line-clamp-1 text-xs text-muted">{movie.genres.join(" · ") || "Sin género"}</p>
        <p className="text-xs text-foreground/70">
          <span className="text-brand">♥</span> {movie.positive_ratings.toLocaleString("es")} valoraciones positivas
        </p>
      </div>
    </article>
  );
}

export function MovieCardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-2">
      <div className="aspect-[2/3] rounded-md bg-surface" />
      <div className="h-3 w-3/4 rounded bg-surface" />
      <div className="h-3 w-1/2 rounded bg-surface" />
    </div>
  );
}
