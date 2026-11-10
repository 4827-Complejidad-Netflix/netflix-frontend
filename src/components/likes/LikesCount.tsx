"use client";

import { useLikes } from "./useLikes";

/** Nº de likes junto al enlace "Para ti" de la barra de navegación. */
export default function LikesCount() {
  const count = useLikes().length;
  if (count === 0) return null;
  return (
    <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-semibold leading-5 text-white">
      {count}
    </span>
  );
}
