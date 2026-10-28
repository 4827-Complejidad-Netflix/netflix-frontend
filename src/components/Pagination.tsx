import Link from "next/link";

interface Props {
  page: number;
  totalPages: number;
  /** Devuelve el href de una página conservando el resto de filtros. */
  hrefFor: (page: number) => string;
}

// Primera, última y las páginas vecinas de la actual; null marca un salto ("…").
function pageWindow(page: number, totalPages: number): (number | null)[] {
  const pages = new Set([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages));
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? [null, p] : [p]));
}

export default function Pagination({ page, totalPages, hrefFor }: Props) {
  if (totalPages <= 1) return null;

  const base = "flex h-9 min-w-9 items-center justify-center rounded-md px-3 text-sm transition-colors";
  const idle = `${base} bg-surface hover:bg-white/10`;
  const disabled = `${base} bg-surface text-muted opacity-50`;

  return (
    <nav aria-label="Paginación" className="flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={idle}>
          Anterior
        </Link>
      ) : (
        <span className={disabled}>Anterior</span>
      )}
      {pageWindow(page, totalPages).map((p, i) =>
        p === null ? (
          <span key={`gap-${i}`} className="px-1 text-muted">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            aria-current={p === page ? "page" : undefined}
            className={p === page ? `${base} bg-brand font-semibold text-white` : idle}
          >
            {p}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={idle}>
          Siguiente
        </Link>
      ) : (
        <span className={disabled}>Siguiente</span>
      )}
    </nav>
  );
}
