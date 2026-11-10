import Image from "next/image";
import { Suspense, type ReactNode } from "react";
import LikeButton from "@/components/likes/LikeButton";
import type { Movie } from "@/lib/api";
import { posterUrl } from "@/lib/tmdb";

// Respaldo mientras carga el póster o si TMDB no tiene uno: un degradado estable derivado del id.
function posterGradient(id: number): string {
  const hue = (id * 47) % 360;
  return `linear-gradient(160deg, hsl(${hue} 30% 22%), hsl(${(hue + 40) % 360} 25% 5%))`;
}

// Ancho que ocupa la tarjeta según las columnas de MovieGrid (2 / 3 / 4 / 6).
const POSTER_SIZES = "(min-width: 1024px) 16vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw";

async function Poster({ movie }: { movie: Movie }) {
  const src = await posterUrl(movie.tmdb_id);
  if (!src) return null;
  return (
    <Image
      src={src}
      alt={`Póster de ${movie.title}`}
      fill
      sizes={POSTER_SIZES}
      // TMDB ya sirve la imagen al tamaño adecuado: no hace falta gastar la optimización de imágenes del hosting.
      unoptimized
      className="object-cover"
    />
  );
}

interface Props {
  movie: Movie;
  /** Sustituye la línea de valoraciones positivas (p. ej. score de recomendación o rating del usuario). */
  detail?: ReactNode;
  /** Muestra el botón ♥ sobre el póster. `"refresh"` además recarga la página al cambiar el like. */
  likeable?: boolean | "refresh";
}

export default function MovieCard({ movie, detail, likeable }: Props) {
  return (
    <article className="group flex flex-col gap-2">
      <div
        className="relative flex aspect-[2/3] flex-col justify-end overflow-hidden rounded-md p-3 shadow-lg ring-1 ring-white/10 transition duration-200 group-hover:-translate-y-1 group-hover:ring-white/40"
        style={{ background: posterGradient(movie.id) }}
      >
        <p className="line-clamp-4 text-base font-bold leading-tight text-white drop-shadow" aria-hidden="true">
          {movie.title}
        </p>
        {/* El póster tapa el degradado al llegar; si no hay, queda el título sobre el degradado. */}
        <Suspense fallback={null}>
          <Poster movie={movie} />
        </Suspense>
        {likeable && <LikeButton movieId={movie.id} title={movie.title} refreshOnChange={likeable === "refresh"} />}
      </div>
      <div className="flex flex-col gap-1 px-0.5">
        <h3 className="line-clamp-1 text-sm font-medium" title={movie.title}>
          {movie.title}
          {movie.year && <span className="font-normal text-muted"> · {movie.year}</span>}
        </h3>
        <p className="line-clamp-1 text-xs text-muted">{movie.genres.join(" · ") || "Sin género"}</p>
        <p className="text-xs text-foreground/70">
          {detail ?? (
            <>
              <span className="text-danger">♥</span> {movie.positive_ratings.toLocaleString("es")} valoraciones positivas
            </>
          )}
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
