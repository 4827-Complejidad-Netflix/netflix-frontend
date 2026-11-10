"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toggleLike, useLikes } from "./useLikes";

interface Props {
  movieId: number;
  title: string;
  /** Vuelve a renderizar la página en el servidor (p. ej. /recommendations, que depende de los likes). */
  refreshOnChange?: boolean;
  /** En línea (listas) en lugar de flotando sobre la esquina del póster. */
  inline?: boolean;
}

export default function LikeButton({ movieId, title, refreshOnChange, inline }: Props) {
  const liked = useLikes().includes(movieId);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onClick() {
    toggleLike(movieId);
    if (refreshOnChange) startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={liked}
      aria-label={liked ? `Quitar me gusta de ${title}` : `Me gusta ${title}`}
      title={liked ? "Quitar me gusta" : "Me gusta"}
      className={`${inline ? "shrink-0" : "absolute right-2 top-2 z-10"} flex size-9 items-center justify-center rounded-full text-lg backdrop-blur transition ${
        liked
          ? "bg-danger text-white shadow-lg shadow-danger/30"
          : `bg-black/60 text-white/80 ring-1 ring-white/20 hover:bg-black/80 hover:text-white ${
              // En las tarjetas solo aparece al pasar el cursor (en móvil, siempre).
              inline ? "" : "sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            }`
      } ${isPending ? "animate-pulse" : ""}`}
    >
      <span aria-hidden="true">{liked ? "♥" : "♡"}</span>
    </button>
  );
}
