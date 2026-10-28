"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { MovieSort } from "@/lib/api";

const SEARCH_DEBOUNCE_MS = 350;

const sortOptions: { value: MovieSort; label: string }[] = [
  { value: "popular", label: "Más populares" },
  { value: "year", label: "Más recientes" },
  { value: "title", label: "Título (A-Z)" },
];

interface Props {
  genres: string[];
  q: string;
  genre: string;
  sort: MovieSort;
}

export default function CatalogFilters({ genres, q, genre, sort }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(q);
  const [syncedQ, setSyncedQ] = useState(q);

  // Si la URL cambia desde fuera (atrás/adelante, un enlace), el input la sigue.
  if (q !== syncedQ) {
    setSyncedQ(q);
    setSearch(q);
  }

  // Cualquier cambio de filtro vuelve a la página 1.
  function navigate(next: { q?: string; genre?: string; sort?: MovieSort }) {
    const values = { q, genre, sort, ...next };
    const params = new URLSearchParams();
    if (values.q.trim()) params.set("q", values.q.trim());
    if (values.genre) params.set("genre", values.genre);
    if (values.sort !== "popular") params.set("sort", values.sort);
    const query = params.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  useEffect(() => {
    if (search.trim() === q.trim()) return;
    const timeout = setTimeout(() => navigate({ q: search }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar a lo que se escribe
  }, [search]);

  const fieldClass =
    "h-10 rounded-md border border-white/10 bg-surface px-3 text-sm text-foreground outline-none transition-colors focus:border-white/40";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título…"
          aria-label="Buscar por título"
          className={`${fieldClass} w-full`}
        />
        {isPending && (
          <span className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-white/20 border-t-brand" />
        )}
      </div>
      <select
        value={genre}
        onChange={(e) => navigate({ genre: e.target.value })}
        aria-label="Género"
        className={fieldClass}
      >
        <option value="">Todos los géneros</option>
        {genres.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>
      <select
        value={sort}
        onChange={(e) => navigate({ sort: e.target.value as MovieSort })}
        aria-label="Ordenar por"
        className={fieldClass}
      >
        {sortOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
